"""Timecard submission repository."""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from src.app.models.timecard_submission import TimecardSubmission


class TimecardSubmissionRepository:
    """Data access for weekly timecard submissions."""

    @staticmethod
    def get_by_id(db: Session, submission_id: int) -> Optional[TimecardSubmission]:
        return db.query(TimecardSubmission).options(
            joinedload(TimecardSubmission.user),
            joinedload(TimecardSubmission.reviewer),
        ).filter(TimecardSubmission.id == submission_id).first()

    @staticmethod
    def get_by_user_and_week(db: Session, user_id: int, week_start: datetime) -> Optional[TimecardSubmission]:
        return db.query(TimecardSubmission).options(
            joinedload(TimecardSubmission.user),
            joinedload(TimecardSubmission.reviewer),
        ).filter(
            TimecardSubmission.user_id == user_id,
            TimecardSubmission.week_start == week_start,
        ).first()

    @staticmethod
    def list_submissions(
        db: Session,
        status: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> list[TimecardSubmission]:
        query = db.query(TimecardSubmission).options(
            joinedload(TimecardSubmission.user),
            joinedload(TimecardSubmission.reviewer),
        )
        if status:
            query = query.filter(TimecardSubmission.status == status)
        if user_id is not None:
            query = query.filter(TimecardSubmission.user_id == user_id)
        return query.order_by(TimecardSubmission.week_start.desc(), TimecardSubmission.created_at.desc()).all()

    @staticmethod
    def save(db: Session, submission: TimecardSubmission) -> TimecardSubmission:
        db.add(submission)
        db.commit()
        db.refresh(submission)
        return submission