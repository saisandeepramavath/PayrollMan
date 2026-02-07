"""
Project Pydantic schemas
"""

from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from typing import Optional
from enum import Enum


class ProjectStatusEnum(str, Enum):
    """Project status enum"""
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ProjectBase(BaseModel):
    """Base project schema"""
    name: str
    code: str
    description: Optional[str] = None
    department: Optional[str] = None
    company: Optional[str] = None
    supervisor_id: Optional[int] = None
    status: ProjectStatusEnum = ProjectStatusEnum.ACTIVE
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ProjectCreate(ProjectBase):
    """Project creation schema"""
    
    @field_validator('code')
    @classmethod
    def validate_code(cls, v):
        if not v or len(v) < 2:
            raise ValueError('Project code must be at least 2 characters')
        return v.upper()


class ProjectUpdate(BaseModel):
    """Project update schema"""
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    company: Optional[str] = None
    supervisor_id: Optional[int] = None
    status: Optional[ProjectStatusEnum] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ProjectResponse(ProjectBase):
    """Project response schema"""
    id: int
    creator_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class ProjectWithDetails(ProjectResponse):
    """Project response with additional details"""
    creator_name: Optional[str] = None
    supervisor_name: Optional[str] = None
    assigned_users_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)
