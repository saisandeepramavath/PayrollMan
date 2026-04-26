"""Issue report business logic."""

from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.app.models.user import User
from src.app.repositories.issue_report_repository import IssueReportRepository
from src.app.repositories.timecard_repository import TimecardRepository
from src.app.repositories.user_repository import UserRepository
from src.app.schemas.issue_report import IssueReportCreate, IssueReportNotice, IssueReportUpdate


class IssueReportService:
    @staticmethod
    def create_issue(db: Session, issue_data: IssueReportCreate, reporter: User):
        target_user_id = issue_data.user_id or reporter.id
        target_user = UserRepository.get_by_id(db, target_user_id)
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")

        if target_user_id != reporter.id and not reporter.is_superuser and not getattr(reporter.role, "can_view_all_timecards", False):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

        if issue_data.timecard_id is not None:
            timecard = TimecardRepository.get_by_id(db, issue_data.timecard_id)
            if not timecard:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timecard not found")
            if timecard.user_id != target_user_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Timecard does not belong to target user")

        return IssueReportRepository.create(
            db=db,
            user_id=target_user_id,
            reporter_id=reporter.id,
            timecard_id=issue_data.timecard_id,
            issue_type=issue_data.issue_type,
            priority=issue_data.priority,
            title=issue_data.title,
            description=issue_data.description,
            week_start=issue_data.week_start,
            status="open",
        )

    @staticmethod
    def list_issues(db: Session, current_user: User, status_filter: Optional[str] = None, issue_type: Optional[str] = None):
        if current_user.is_superuser or getattr(current_user.role, "can_manage_users", False) or getattr(current_user.role, "can_view_all_timecards", False):
            return IssueReportRepository.list_issues(db, status=status_filter, issue_type=issue_type)
        return IssueReportRepository.list_issues(db, status=status_filter, issue_type=issue_type, user_id=current_user.id)

    @staticmethod
    def update_issue(db: Session, issue_id: int, issue_data: IssueReportUpdate, current_user: User):
        if not current_user.is_superuser and not getattr(current_user.role, "can_manage_users", False) and not getattr(current_user.role, "can_view_all_timecards", False):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

        issue = IssueReportRepository.get_by_id(db, issue_id)
        if not issue:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

        if issue_data.status is not None:
            issue.status = issue_data.status
            if issue_data.status == "resolved":
                issue.resolved_by_id = current_user.id
                issue.resolved_at = datetime.utcnow()
        if issue_data.resolution_notes is not None:
            issue.resolution_notes = issue_data.resolution_notes
        return IssueReportRepository.update(db, issue)

    @staticmethod
    def send_notice(db: Session, issue_id: int, notice_data: IssueReportNotice, current_user: User):
        if not current_user.is_superuser and not getattr(current_user.role, "can_manage_users", False) and not getattr(current_user.role, "can_view_all_timecards", False):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

        issue = IssueReportRepository.get_by_id(db, issue_id)
        if not issue:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

        issue.notice_subject = notice_data.notice_subject
        issue.notice_message = notice_data.notice_message
        if issue.status == "open":
            issue.status = "in_review"
        return IssueReportRepository.update(db, issue)