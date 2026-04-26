"""Tracking category, code, and rule schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


class TrackingCodeBase(BaseModel):
    label: str
    code: str
    description: Optional[str] = None
    entry_type: str = "work"
    labor_category: Optional[str] = None
    extra_fields: dict[str, str] = {}
    default_work_location: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().upper()


class TrackingCodeCreate(TrackingCodeBase):
    pass


class TrackingCodeResponse(TrackingCodeBase):
    id: int
    category_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TrackingRuleBase(BaseModel):
    name: str
    scope_type: str = "all_users"
    scope_value: Optional[str] = None
    condition_type: str
    condition_value: str
    action_type: str
    action_value: str
    priority: int = 0
    is_active: bool = True


class TrackingRuleCreate(TrackingRuleBase):
    pass


class TrackingRuleResponse(TrackingRuleBase):
    id: int
    category_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TrackingCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    company: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0
    project_id: Optional[int] = None


class TrackingCategoryCreate(TrackingCategoryBase):
    codes: list[TrackingCodeCreate] = []
    rules: list[TrackingRuleCreate] = []


class TrackingCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    company: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    project_id: Optional[int] = None
    codes: Optional[list[TrackingCodeCreate]] = None
    rules: Optional[list[TrackingRuleCreate]] = None


class TrackingCategoryResponse(TrackingCategoryBase):
    id: int
    creator_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    codes: list[TrackingCodeResponse] = []
    rules: list[TrackingRuleResponse] = []

    model_config = ConfigDict(from_attributes=True)