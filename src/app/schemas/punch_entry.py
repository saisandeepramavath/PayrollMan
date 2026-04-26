"""
PunchEntry Pydantic schemas
"""

from pydantic import BaseModel, ConfigDict, field_validator, computed_field, field_serializer
from datetime import datetime, date as date_type, timezone
from typing import Optional


class PunchEntryBase(BaseModel):
    """Base punch entry schema"""
    date: date_type
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
    date: Optional[date_type] = None
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

    @field_serializer('punch_in', 'punch_out', 'created_at', 'updated_at')
    def serialize_dt(self, v: Optional[datetime]) -> Optional[str]:
        """Always emit UTC datetimes with Z suffix so the frontend can parse correctly."""
        if v is None:
            return None
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat().replace('+00:00', 'Z')

    @computed_field
    @property
    def duration_minutes(self) -> Optional[int]:
        if self.punch_in and self.punch_out:
            delta = self.punch_out - self.punch_in
            return int(delta.total_seconds() / 60)
        return None

    @computed_field
    @property
    def duration_display(self) -> Optional[str]:
        mins = self.duration_minutes
        if mins is None:
            return None
        h = mins // 60
        m = mins % 60
        if h > 0:
            return f"{h}h {m:02d}m"
        return f"{m}m"


class PunchInRequest(BaseModel):
    """Quick punch in request"""
    punch_in: datetime = None  # If None, use current time
    notes: Optional[str] = None


class PunchOutRequest(BaseModel):
    """Quick punch out request"""
    punch_out: datetime = None  # If None, use current time
    notes: Optional[str] = None
