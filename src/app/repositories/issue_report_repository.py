"""Issue report repository."""

from typing import Optional

from sqlalchemy.orm import Session, joinedload

from src.app.models.issue_report import IssueReport
from src.app.models.timecard import Timecard


class IssueReportRepository:
    @staticmethod
    def create(db: Session, **kwargs) -> IssueReport:
        issue = IssueReport(**kwargs)
        db.add(issue)
        db.commit()
        db.refresh(issue)
        return issue

    @staticmethod
    def get_by_id(db: Session, issue_id: int) -> Optional[IssueReport]:
        return db.query(IssueReport).options(
            joinedload(IssueReport.user),
            joinedload(IssueReport.reporter),
            joinedload(IssueReport.timecard).joinedload(Timecard.project),
        ).filter(IssueReport.id == issue_id).first()

    @staticmethod
    def list_issues(
        db: Session,
        status: Optional[str] = None,
        issue_type: Optional[str] = None,
        user_id: Optional[int] = None,
        reporter_id: Optional[int] = None,
    ) -> list[IssueReport]:
        query = db.query(IssueReport).options(
            joinedload(IssueReport.user),
            joinedload(IssueReport.reporter),
            joinedload(IssueReport.timecard).joinedload(Timecard.project),
        )
        if status:
            query = query.filter(IssueReport.status == status)
        if issue_type:
            query = query.filter(IssueReport.issue_type == issue_type)
        if user_id is not None:
            query = query.filter(IssueReport.user_id == user_id)
        if reporter_id is not None:
            query = query.filter(IssueReport.reporter_id == reporter_id)
        return query.order_by(IssueReport.created_at.desc()).all()

    @staticmethod
    def update(db: Session, issue: IssueReport) -> IssueReport:
        db.commit()
        db.refresh(issue)
        return issue