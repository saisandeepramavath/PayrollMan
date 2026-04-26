"""Issue report schemas."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


IssueStatus = Literal["open", "in_review", "resolved"]
IssuePriority = Literal["low", "medium", "high"]
IssueType = Literal["timecard", "attendance", "project", "other"]


class IssueReportCreate(BaseModel):
    user_id: Optional[int] = None
    timecard_id: Optional[int] = None
    issue_type: IssueType = "timecard"
    priority: IssuePriority = "medium"
    title: str
    description: str
    week_start: Optional[datetime] = None


class IssueReportUpdate(BaseModel):
    status: Optional[IssueStatus] = None
    resolution_notes: Optional[str] = None


class IssueReportNotice(BaseModel):
    notice_subject: str
    notice_message: str


class IssueReportResponse(BaseModel):
    id: int
    user_id: int
    reporter_id: int
    timecard_id: Optional[int] = None
    issue_type: str
    status: str
    priority: str
    title: str
    description: str
    week_start: Optional[datetime] = None
    notice_subject: Optional[str] = None
    notice_message: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_by_id: Optional[int] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None

    @classmethod
    def model_validate(cls, obj, **kwargs):
        instance = super().model_validate(obj, **kwargs)
        if getattr(obj, "user", None) is not None:
            instance.user_name = obj.user.full_name
            instance.user_email = obj.user.email
        if getattr(obj, "reporter", None) is not None:
            instance.reporter_name = obj.reporter.full_name
            instance.reporter_email = obj.reporter.email
        if getattr(obj, "timecard", None) is not None and getattr(obj.timecard, "project", None) is not None:
            instance.project_name = obj.timecard.project.name
            instance.project_code = obj.timecard.project.code
        return instance

    model_config = ConfigDict(from_attributes=True)