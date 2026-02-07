"""
Timecard Pydantic schemas
"""

from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class TimecardBase(BaseModel):
    """Base timecard schema"""
    date: datetime
    hours_worked: float
    description: Optional[str] = None
    project: Optional[str] = None


class TimecardCreate(TimecardBase):
    """Timecard creation schema"""
    pass


class TimecardUpdate(BaseModel):
    """Timecard update schema"""
    date: Optional[datetime] = None
    hours_worked: Optional[float] = None
    description: Optional[str] = None
    project: Optional[str] = None


class TimecardResponse(TimecardBase):
    """Timecard response schema"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
