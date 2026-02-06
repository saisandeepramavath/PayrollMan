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
]
