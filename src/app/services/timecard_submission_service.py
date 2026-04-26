"""Weekly timecard submission workflow service."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.app.models.issue_report import IssueReport
from src.app.models.timecard_submission import TimecardSubmission
from src.app.models.user import User
from src.app.repositories.punch_entry_repository import PunchEntryRepository
from src.app.repositories.timecard_repository import TimecardRepository
from src.app.repositories.timecard_submission_repository import TimecardSubmissionRepository
from src.app.schemas.timecard_submission import TimecardSubmissionResponse
from src.app.services.user_work_rule_service import UserWorkRuleService


class TimecardSubmissionService:
    """Business logic for weekly timecard submissions and approvals."""

    AUTO_APPROVE_DELAY = timedelta(days=1)

    @staticmethod
    def _normalize_week_start(value: datetime | date) -> datetime:
        if isinstance(value, datetime):
            current = value.date()
        else:
            current = value
        monday = current - timedelta(days=current.weekday())
        return datetime.combine(monday, time.min, tzinfo=timezone.utc)

    @staticmethod
    def _week_end(week_start: datetime) -> datetime:
        return week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)

    @staticmethod
    def _coerce_utc(value: Optional[datetime]) -> Optional[datetime]:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def _require_review_permission(current_user: User) -> None:
        if current_user.is_superuser:
            return
        if getattr(current_user.role, "can_view_all_timecards", False):
            return
        if getattr(current_user.role, "can_manage_users", False):
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

    @staticmethod
    def _unresolved_issue_count(db: Session, user_id: int, week_start: datetime) -> int:
        return db.query(IssueReport).filter(
            IssueReport.user_id == user_id,
            IssueReport.week_start == week_start,
            IssueReport.status.in_(["open", "in_review"]),
        ).count()

    @staticmethod
    def _find_existing_issue(
        db: Session,
        *,
        user_id: int,
        week_start: datetime,
        title: str,
        timecard_id: Optional[int],
    ) -> Optional[IssueReport]:
        return db.query(IssueReport).filter(
            IssueReport.user_id == user_id,
            IssueReport.week_start == week_start,
            IssueReport.title == title,
            IssueReport.timecard_id == timecard_id,
            IssueReport.status.in_(["open", "in_review"]),
        ).first()

    @staticmethod
    def _create_issue_if_missing(
        db: Session,
        *,
        user_id: int,
        reporter_id: int,
        week_start: datetime,
        issue_type: str,
        priority: str,
        title: str,
        description: str,
        timecard_id: Optional[int] = None,
    ) -> None:
        existing = TimecardSubmissionService._find_existing_issue(
            db,
            user_id=user_id,
            week_start=week_start,
            title=title,
            timecard_id=timecard_id,
        )
        if existing is not None:
            return
        db.add(
            IssueReport(
                user_id=user_id,
                reporter_id=reporter_id,
                timecard_id=timecard_id,
                issue_type=issue_type,
                status="open",
                priority=priority,
                title=title,
                description=description,
                week_start=week_start,
            )
        )

    @staticmethod
    def _evaluate_submission_issues(
        db: Session,
        *,
        user_id: int,
        week_start: datetime,
        reporter_id: int,
        persist: bool,
    ) -> list[str]:
        week_end = TimecardSubmissionService._week_end(week_start)
        timecards = TimecardRepository.get_by_user_and_date_range(db, user_id, week_start, week_end)
        punches = PunchEntryRepository.get_by_date_range(db, user_id, week_start.date(), week_end.date())

        issues: list[str] = []
        timecards_by_day: dict[date, list] = defaultdict(list)
        punches_by_day: dict[date, list] = defaultdict(list)

        for timecard in timecards:
            timecards_by_day[timecard.date.date()].append(timecard)
        for punch in punches:
            punches_by_day[punch.date].append(punch)

        if not timecards:
            message = "No timecard entries were submitted for this week."
            issues.append(message)
            if persist:
                TimecardSubmissionService._create_issue_if_missing(
                    db,
                    user_id=user_id,
                    reporter_id=reporter_id,
                    week_start=week_start,
                    issue_type="timecard",
                    priority="high",
                    title="No timecard entries submitted",
                    description=message,
                )

        for offset in range(7):
            work_day = (week_start + timedelta(days=offset)).date()
            day_timecards = timecards_by_day.get(work_day, [])
            day_punches = punches_by_day.get(work_day, [])
            punch_hours = round(
                sum(
                    ((entry.punch_out - entry.punch_in).total_seconds() / 3600)
                    for entry in day_punches
                    if entry.punch_out is not None
                ),
                2,
            )
            timecard_hours = round(sum(entry.hours_worked for entry in day_timecards), 2)

            if any(entry.punch_out is None and entry.date < date.today() for entry in day_punches):
                message = f"Incomplete punch record detected for {work_day.isoformat()}."
                issues.append(message)
                if persist:
                    TimecardSubmissionService._create_issue_if_missing(
                        db,
                        user_id=user_id,
                        reporter_id=reporter_id,
                        week_start=week_start,
                        issue_type="attendance",
                        priority="high",
                        title=f"Incomplete punch record on {work_day.isoformat()}",
                        description=message,
                    )

            if punch_hours > 0 and timecard_hours == 0:
                message = f"Punches exist for {work_day.isoformat()} but no timecard hours were submitted."
                issues.append(message)
                if persist:
                    TimecardSubmissionService._create_issue_if_missing(
                        db,
                        user_id=user_id,
                        reporter_id=reporter_id,
                        week_start=week_start,
                        issue_type="timecard",
                        priority="high",
                        title=f"Missing timecard for {work_day.isoformat()}",
                        description=message,
                    )
            elif punch_hours > 0 and abs(punch_hours - timecard_hours) > 0.5:
                message = (
                    f"Submitted hours for {work_day.isoformat()} do not match punches: "
                    f"{timecard_hours:.2f}h logged vs {punch_hours:.2f}h punched."
                )
                issues.append(message)
                if persist:
                    anchor_timecard = day_timecards[0] if day_timecards else None
                    TimecardSubmissionService._create_issue_if_missing(
                        db,
                        user_id=user_id,
                        reporter_id=reporter_id,
                        week_start=week_start,
                        issue_type="attendance",
                        priority="medium",
                        title=f"Punch mismatch on {work_day.isoformat()}",
                        description=message,
                        timecard_id=anchor_timecard.id if anchor_timecard else None,
                    )

            if day_timecards:
                effective_rule = UserWorkRuleService.get_effective_rule(db, user_id, work_day)
                if (
                    effective_rule.max_daily_hours is not None
                    and timecard_hours > effective_rule.max_daily_hours
                ):
                    message = (
                        f"Submitted hours for {work_day.isoformat()} exceed the daily limit of "
                        f"{effective_rule.max_daily_hours:.2f}h."
                    )
                    issues.append(message)
                    if persist:
                        anchor_timecard = day_timecards[0]
                        TimecardSubmissionService._create_issue_if_missing(
                            db,
                            user_id=user_id,
                            reporter_id=reporter_id,
                            week_start=week_start,
                            issue_type="attendance",
                            priority="high",
                            title=f"Daily limit exceeded on {work_day.isoformat()}",
                            description=message,
                            timecard_id=anchor_timecard.id,
                        )

        effective_rule = UserWorkRuleService.get_effective_rule(db, user_id, week_start.date())
        week_total = round(sum(item.hours_worked for item in timecards), 2)
        if effective_rule.max_weekly_hours is not None and week_total > effective_rule.max_weekly_hours:
            message = (
                f"Submitted weekly total of {week_total:.2f}h exceeds the weekly limit of "
                f"{effective_rule.max_weekly_hours:.2f}h."
            )
            issues.append(message)
            if persist:
                anchor_timecard = timecards[-1] if timecards else None
                TimecardSubmissionService._create_issue_if_missing(
                    db,
                    user_id=user_id,
                    reporter_id=reporter_id,
                    week_start=week_start,
                    issue_type="timecard",
                    priority="high",
                    title="Weekly hour limit exceeded",
                    description=message,
                    timecard_id=anchor_timecard.id if anchor_timecard else None,
                )

        return issues

    @staticmethod
    def _sync_auto_approval(db: Session, submission: TimecardSubmission) -> TimecardSubmission:
        if submission.status != "submitted" or submission.auto_approve_at is None:
            return submission
        now = datetime.now(timezone.utc)
        auto_approve_at = TimecardSubmissionService._coerce_utc(submission.auto_approve_at)
        if auto_approve_at is not None and auto_approve_at > now:
            return submission

        generated_issues = TimecardSubmissionService._evaluate_submission_issues(
            db,
            user_id=submission.user_id,
            week_start=submission.week_start,
            reporter_id=submission.user_id,
            persist=True,
        )
        unresolved = TimecardSubmissionService._unresolved_issue_count(db, submission.user_id, submission.week_start)
        if unresolved == 0 and not generated_issues:
            submission.status = "approved"
            submission.approved_at = now
            if not submission.review_notes:
                submission.review_notes = "Auto-approved after one day with no outstanding issues."
        else:
            submission.status = "on_hold"
            submission.auto_approve_at = None
            if not submission.review_notes:
                submission.review_notes = "Auto-approval paused because review issues were detected."
        return TimecardSubmissionRepository.save(db, submission)

    @staticmethod
    def _to_response(
        submission: Optional[TimecardSubmission],
        *,
        user_id: int,
        week_start: datetime,
        unresolved_issue_count: int,
    ) -> TimecardSubmissionResponse:
        if submission is None:
            return TimecardSubmissionResponse(
                user_id=user_id,
                week_start=week_start,
                week_end=TimecardSubmissionService._week_end(week_start),
                status="draft",
                unresolved_issue_count=unresolved_issue_count,
            )
        response = TimecardSubmissionResponse.model_validate(submission)
        response.unresolved_issue_count = unresolved_issue_count
        return response

    @staticmethod
    def get_week_submission(db: Session, user_id: int, week_start: datetime) -> TimecardSubmissionResponse:
        normalized_week_start = TimecardSubmissionService._normalize_week_start(week_start)
        submission = TimecardSubmissionRepository.get_by_user_and_week(db, user_id, normalized_week_start)
        if submission is not None:
            submission = TimecardSubmissionService._sync_auto_approval(db, submission)
        unresolved = TimecardSubmissionService._unresolved_issue_count(db, user_id, normalized_week_start)
        return TimecardSubmissionService._to_response(
            submission,
            user_id=user_id,
            week_start=normalized_week_start,
            unresolved_issue_count=unresolved,
        )

    @staticmethod
    def submit_week(db: Session, week_start: datetime, current_user: User) -> TimecardSubmissionResponse:
        normalized_week_start = TimecardSubmissionService._normalize_week_start(week_start)
        existing = TimecardSubmissionRepository.get_by_user_and_week(db, current_user.id, normalized_week_start)
        now = datetime.now(timezone.utc)

        TimecardSubmissionService._evaluate_submission_issues(
            db,
            user_id=current_user.id,
            week_start=normalized_week_start,
            reporter_id=current_user.id,
            persist=True,
        )
        unresolved = TimecardSubmissionService._unresolved_issue_count(db, current_user.id, normalized_week_start)

        submission = existing or TimecardSubmission(
            user_id=current_user.id,
            week_start=normalized_week_start,
            week_end=TimecardSubmissionService._week_end(normalized_week_start),
        )
        submission.week_end = TimecardSubmissionService._week_end(normalized_week_start)
        submission.submitted_at = now
        submission.approved_at = None
        submission.reviewer_id = None

        if unresolved > 0:
            submission.status = "on_hold"
            submission.auto_approve_at = None
            submission.review_notes = "Submission is on hold until the linked issues are resolved."
        else:
            submission.status = "submitted"
            submission.auto_approve_at = now + TimecardSubmissionService.AUTO_APPROVE_DELAY
            submission.review_notes = None

        saved = TimecardSubmissionRepository.save(db, submission)
        return TimecardSubmissionService._to_response(
            saved,
            user_id=current_user.id,
            week_start=normalized_week_start,
            unresolved_issue_count=unresolved,
        )

    @staticmethod
    def list_submissions(
        db: Session,
        current_user: User,
        status_filter: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> list[TimecardSubmissionResponse]:
        TimecardSubmissionService._require_review_permission(current_user)
        submissions = TimecardSubmissionRepository.list_submissions(db, status=status_filter, user_id=user_id)
        responses: list[TimecardSubmissionResponse] = []
        for submission in submissions:
            synced = TimecardSubmissionService._sync_auto_approval(db, submission)
            unresolved = TimecardSubmissionService._unresolved_issue_count(db, synced.user_id, synced.week_start)
            responses.append(TimecardSubmissionService._to_response(
                synced,
                user_id=synced.user_id,
                week_start=synced.week_start,
                unresolved_issue_count=unresolved,
            ))
        return responses

    @staticmethod
    def review_submission(
        db: Session,
        submission_id: int,
        action: str,
        review_notes: Optional[str],
        current_user: User,
    ) -> TimecardSubmissionResponse:
        TimecardSubmissionService._require_review_permission(current_user)
        submission = TimecardSubmissionRepository.get_by_id(db, submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

        unresolved = TimecardSubmissionService._unresolved_issue_count(db, submission.user_id, submission.week_start)
        if action == "approve" and unresolved > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resolve the outstanding issues before approving this submission",
            )

        submission.reviewer_id = current_user.id
        submission.review_notes = review_notes
        submission.auto_approve_at = None
        if action == "approve":
            submission.status = "approved"
            submission.approved_at = datetime.now(timezone.utc)
        else:
            submission.status = "on_hold"
            submission.approved_at = None
        saved = TimecardSubmissionRepository.save(db, submission)
        return TimecardSubmissionService._to_response(
            saved,
            user_id=saved.user_id,
            week_start=saved.week_start,
            unresolved_issue_count=unresolved,
        )

    @staticmethod
    def reset_submission_for_date(db: Session, user_id: int, target_date: datetime) -> None:
        week_start = TimecardSubmissionService._normalize_week_start(target_date)
        submission = TimecardSubmissionRepository.get_by_user_and_week(db, user_id, week_start)
        if submission is None:
            return
        submission.status = "draft"
        submission.submitted_at = None
        submission.auto_approve_at = None
        submission.approved_at = None
        submission.reviewer_id = None
        submission.review_notes = None
        TimecardSubmissionRepository.save(db, submission)