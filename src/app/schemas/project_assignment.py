"""
ProjectAssignment Pydantic schemas
"""

from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from enum import Enum


class AssignmentStatusEnum(str, Enum):
    """Assignment status enum"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVOKED = "revoked"


class ProjectAssignmentBase(BaseModel):
    """Base project assignment schema"""
    project_id: int
    user_id: int
    role: Optional[str] = None
    notes: Optional[str] = None


class ProjectAssignmentCreate(ProjectAssignmentBase):
    """Project assignment creation schema"""
    pass


class ProjectAssignmentUpdate(BaseModel):
    """Project assignment update schema"""
    role: Optional[str] = None
    notes: Optional[str] = None


class ProjectAssignmentResponse(ProjectAssignmentBase):
    """Project assignment response schema"""
    id: int
    assigner_id: int
    status: AssignmentStatusEnum
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class ProjectAssignmentWithDetails(ProjectAssignmentResponse):
    """Project assignment with user and project details"""
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    assigner_name: Optional[str] = None
    approver_name: Optional[str] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    total_project_hours_since_assigned: Optional[float] = None
    assigned_since: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class AssignmentApprovalRequest(BaseModel):
    """Assignment approval/rejection request"""
    status: Optional[AssignmentStatusEnum] = None
    notes: Optional[str] = None
