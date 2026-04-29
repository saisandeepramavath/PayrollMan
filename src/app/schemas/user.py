"""
User Pydantic schemas
"""

from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime, date
from typing import Optional


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    """User creation schema"""
    password: str


class UserUpdate(BaseModel):
    """User update schema"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None


class UserInDB(UserBase):
    """User in database schema"""
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserRoleInfo(BaseModel):
    """Embedded role summary inside UserResponse"""
    id: int
    name: str
    display_name: str
    can_create_projects: bool
    can_manage_assignments: bool
    can_view_all_timecards: bool
    can_manage_users: bool

    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    """User response schema"""
    id: int
    email: str
    full_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    personal_email: Optional[str] = None
    office_phone: Optional[str] = None
    personal_phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    additional_details: Optional[str] = None
    is_active: bool
    is_superuser: bool
    role_id: Optional[int] = None
    role: Optional[UserRoleInfo] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


