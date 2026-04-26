"""Issue report endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.app.api.deps import get_current_user
from src.app.db.session import get_db
from src.app.schemas.issue_report import IssueReportCreate, IssueReportNotice, IssueReportResponse, IssueReportUpdate
from src.app.services.issue_report_service import IssueReportService

router = APIRouter()


@router.post("/", response_model=IssueReportResponse, status_code=status.HTTP_201_CREATED)
def create_issue_report(
    issue_data: IssueReportCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return IssueReportService.create_issue(db=db, issue_data=issue_data, reporter=current_user)


@router.get("/", response_model=list[IssueReportResponse])
def list_issue_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    issue_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return IssueReportService.list_issues(db=db, current_user=current_user, status_filter=status_filter, issue_type=issue_type)


@router.put("/{issue_id}", response_model=IssueReportResponse)
def update_issue_report(
    issue_id: int,
    issue_data: IssueReportUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return IssueReportService.update_issue(db=db, issue_id=issue_id, issue_data=issue_data, current_user=current_user)


@router.post("/{issue_id}/notice", response_model=IssueReportResponse)
def send_issue_notice(
    issue_id: int,
    notice_data: IssueReportNotice,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return IssueReportService.send_notice(db=db, issue_id=issue_id, notice_data=notice_data, current_user=current_user)