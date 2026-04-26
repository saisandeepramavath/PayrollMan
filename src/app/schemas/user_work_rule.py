"""
User work rule schemas.
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserWorkRuleBase(BaseModel):
    name: str
    target_weekly_hours: Optional[float] = None
    max_weekly_hours: Optional[float] = None
    max_daily_hours: Optional[float] = None
    effective_from: date
    priority: int = 0
    is_active: bool = True
    notes: Optional[str] = None


class UserWorkRuleCreate(UserWorkRuleBase):
    user_id: int


class UserWorkRuleUpdate(BaseModel):
    name: Optional[str] = None
    target_weekly_hours: Optional[float] = None
    max_weekly_hours: Optional[float] = None
    max_daily_hours: Optional[float] = None
    effective_from: Optional[date] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class UserWorkRuleResponse(UserWorkRuleBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserWorkRuleReorderItem(BaseModel):
    id: int
    priority: int


class UserWorkRuleReorderRequest(BaseModel):
    items: list[UserWorkRuleReorderItem]


class UserEffectiveWorkRule(BaseModel):
    user_id: int
    as_of_date: date
    target_weekly_hours: Optional[float] = None
    max_weekly_hours: Optional[float] = None
    max_daily_hours: Optional[float] = None
    applied_rule_names: list[str] = []