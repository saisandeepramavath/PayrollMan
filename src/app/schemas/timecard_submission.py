"""Schemas for weekly timecard submissions."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


SubmissionStatus = Literal["draft", "submitted", "on_hold", "approved"]
ReviewAction = Literal["approve", "hold"]


class TimecardSubmissionSubmitRequest(BaseModel):
    week_start: datetime


class TimecardSubmissionReviewRequest(BaseModel):
    action: ReviewAction
    review_notes: Optional[str] = None


class TimecardSubmissionResponse(BaseModel):
    id: Optional[int] = None
    user_id: int
    week_start: datetime
    week_end: datetime
    status: SubmissionStatus
    submitted_at: Optional[datetime] = None
    auto_approve_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    reviewer_id: Optional[int] = None
    review_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    reviewer_name: Optional[str] = None
    unresolved_issue_count: int = 0

    @classmethod
    def model_validate(cls, obj, **kwargs):
        instance = super().model_validate(obj, **kwargs)
        if getattr(obj, "user", None) is not None:
            instance.user_name = obj.user.full_name
            instance.user_email = obj.user.email
        if getattr(obj, "reviewer", None) is not None:
            instance.reviewer_name = obj.reviewer.full_name
        return instance

    model_config = ConfigDict(from_attributes=True)