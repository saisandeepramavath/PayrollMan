"""Weekly timecard submission endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.app.api.deps import get_current_user, require_permission
from src.app.db.session import get_db
from src.app.schemas.timecard_submission import (
    TimecardSubmissionResponse,
    TimecardSubmissionReviewRequest,
    TimecardSubmissionSubmitRequest,
)
from src.app.services.timecard_submission_service import TimecardSubmissionService
from src.app.services.timecard_service import TimecardService

router = APIRouter()


@router.get("/week", response_model=TimecardSubmissionResponse)
def get_week_submission(
    week_start: datetime = Query(..., description="Any date within the target week"),
    user_id: Optional[int] = Query(None, description="Target user when allowed by role"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    target_user_id = TimecardService.resolve_target_user_id(current_user, user_id)
    return TimecardSubmissionService.get_week_submission(db, target_user_id, week_start)


@router.post("/submit", response_model=TimecardSubmissionResponse)
def submit_week(
    payload: TimecardSubmissionSubmitRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return TimecardSubmissionService.submit_week(db, payload.week_start, current_user)


@router.get("/", response_model=list[TimecardSubmissionResponse])
def list_submissions(
    status_filter: Optional[str] = Query(None, alias="status"),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return TimecardSubmissionService.list_submissions(db, current_user, status_filter=status_filter, user_id=user_id)


@router.post("/{submission_id}/review", response_model=TimecardSubmissionResponse)
def review_submission(
    submission_id: int,
    payload: TimecardSubmissionReviewRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("can_view_all_timecards")),
):
    return TimecardSubmissionService.review_submission(
        db,
        submission_id=submission_id,
        action=payload.action,
        review_notes=payload.review_notes,
        current_user=current_user,
    )