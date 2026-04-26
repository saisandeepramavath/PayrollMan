"""
Schemas package exports
"""

from src.app.schemas.user import (
    UserBase,
    UserCreate,
    UserUpdate,
    UserInDB,
    UserResponse,
)
from src.app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    TokenData,
)
from src.app.schemas.timecard import (
    TimecardBase,
    TimecardCreate,
    TimecardUpdate,
    TimecardResponse,
)
from src.app.schemas.punch_entry import (
    PunchEntryBase,
    PunchEntryCreate,
    PunchEntryUpdate,
    PunchEntryResponse,
    PunchInRequest,
    PunchOutRequest,
)
from src.app.schemas.project import (
    ProjectStatusEnum,
    ProjectBase,
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectWithDetails,
)
from src.app.schemas.project_assignment import (
    AssignmentStatusEnum,
    ProjectAssignmentBase,
    ProjectAssignmentCreate,
    ProjectAssignmentUpdate,
    ProjectAssignmentResponse,
    ProjectAssignmentWithDetails,
    AssignmentApprovalRequest,
)
from src.app.schemas.time_allocation import (
    TimeAllocationBase,
    TimeAllocationCreate,
    TimeAllocationUpdate,
    TimeAllocationResponse,
    TimeAllocationWithProject,
    BulkTimeAllocationCreate,
    DailySummary,
)
from src.app.schemas.user_work_rule import (
    UserEffectiveWorkRule,
    UserWorkRuleCreate,
    UserWorkRuleReorderRequest,
    UserWorkRuleResponse,
    UserWorkRuleUpdate,
)
from src.app.schemas.tracking import (
    TrackingCategoryCreate,
    TrackingCategoryResponse,
    TrackingCategoryUpdate,
    TrackingCodeCreate,
    TrackingCodeResponse,
    TrackingRuleCreate,
    TrackingRuleResponse,
)
from src.app.schemas.issue_report import (
    IssueReportCreate,
    IssueReportNotice,
    IssueReportResponse,
    IssueReportUpdate,
)
from src.app.schemas.timecard_submission import (
    TimecardSubmissionResponse,
    TimecardSubmissionReviewRequest,
    TimecardSubmissionSubmitRequest,
)

__all__ = [
    # User
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserInDB",
    "UserResponse",
    # Auth
    "LoginRequest",
    "TokenResponse",
    "TokenData",
    # Timecard
    "TimecardBase",
    "TimecardCreate",
    "TimecardUpdate",
    "TimecardResponse",
    # Punch Entry
    "PunchEntryBase",
    "PunchEntryCreate",
    "PunchEntryUpdate",
    "PunchEntryResponse",
    "PunchInRequest",
    "PunchOutRequest",
    # Project
    "ProjectStatusEnum",
    "ProjectBase",
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectResponse",
    "ProjectWithDetails",
    # Project Assignment
    "AssignmentStatusEnum",
    "ProjectAssignmentBase",
    "ProjectAssignmentCreate",
    "ProjectAssignmentUpdate",
    "ProjectAssignmentResponse",
    "ProjectAssignmentWithDetails",
    "AssignmentApprovalRequest",
    # Time Allocation
    "TimeAllocationBase",
    "TimeAllocationCreate",
    "TimeAllocationUpdate",
    "TimeAllocationResponse",
    "TimeAllocationWithProject",
    "BulkTimeAllocationCreate",
    "DailySummary",
    # User work rules
    "UserWorkRuleCreate",
    "UserWorkRuleUpdate",
    "UserWorkRuleResponse",
    "UserWorkRuleReorderRequest",
    "UserEffectiveWorkRule",
    # Tracking
    "TrackingCategoryCreate",
    "TrackingCategoryResponse",
    "TrackingCategoryUpdate",
    "TrackingCodeCreate",
    "TrackingCodeResponse",
    "TrackingRuleCreate",
    "TrackingRuleResponse",
    # Issue reports
    "IssueReportCreate",
    "IssueReportNotice",
    "IssueReportResponse",
    "IssueReportUpdate",
    "TimecardSubmissionResponse",
    "TimecardSubmissionReviewRequest",
    "TimecardSubmissionSubmitRequest",
]
