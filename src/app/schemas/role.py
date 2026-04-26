"""
Role Pydantic schemas
"""

from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class RoleBase(BaseModel):
    name: str
    display_name: str
    can_create_projects: bool = False
    can_manage_assignments: bool = False
    can_view_all_timecards: bool = False
    can_manage_users: bool = False


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    display_name: Optional[str] = None
    can_create_projects: Optional[bool] = None
    can_manage_assignments: Optional[bool] = None
    can_view_all_timecards: Optional[bool] = None
    can_manage_users: Optional[bool] = None


class RoleResponse(RoleBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
