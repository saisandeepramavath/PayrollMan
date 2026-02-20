"""
PunchEntry Pydantic schemas
"""

from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime, date
from typing import Optional


class PunchEntryBase(BaseModel):
    """Base punch entry schema"""
    date: date
    punch_in: datetime
    punch_out: Optional[datetime] = None
    notes: Optional[str] = None


class PunchEntryCreate(PunchEntryBase):
    """Punch entry creation schema"""
    
    @field_validator('punch_out')
    @classmethod
    def validate_punch_out(cls, v, info):
        if v and 'punch_in' in info.data and v <= info.data['punch_in']:
            raise ValueError('Punch out must be after punch in')
        return v


class PunchEntryUpdate(BaseModel):
    """Punch entry update schema"""
    date: Optional["date"] = None
    punch_in: Optional[datetime] = None
    punch_out: Optional[datetime] = None
    notes: Optional[str] = None


class PunchEntryResponse(PunchEntryBase):
    """Punch entry response schema"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class PunchInRequest(BaseModel):
    """Quick punch in request"""
    punch_in: datetime = None  # If None, use current time
    notes: Optional[str] = None


class PunchOutRequest(BaseModel):
    """Quick punch out request"""
    punch_out: datetime = None  # If None, use current time
    notes: Optional[str] = None
