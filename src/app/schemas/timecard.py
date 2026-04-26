"""Timecard Pydantic schemas"""

from pydantic import BaseModel, ConfigDict, model_validator
from datetime import datetime
from typing import Optional


class TimecardBase(BaseModel):
    """Base timecard schema"""
    date: datetime
    hours_worked: float
    description: Optional[str] = None
    project_id: Optional[int] = None
    cost_center: Optional[str] = None
    work_location: Optional[str] = None
    entry_type: Optional[str] = None
    labor_category: Optional[str] = None

    @model_validator(mode="after")
    def validate_reference_target(self):
        if self.project_id is None and not self.cost_center:
            raise ValueError("Either project_id or cost_center is required")
        return self


class TimecardCreate(TimecardBase):
    """Timecard creation schema"""
    pass


class TimecardUpdate(BaseModel):
    """Timecard update schema"""
    date: Optional[datetime] = None
    hours_worked: Optional[float] = None
    description: Optional[str] = None
    project_id: Optional[int] = None
    cost_center: Optional[str] = None
    work_location: Optional[str] = None
    entry_type: Optional[str] = None
    labor_category: Optional[str] = None


class TimecardResponse(TimecardBase):
    """Timecard response schema"""
    id: int
    user_id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @classmethod
    def model_validate(cls, obj, **kwargs):
        instance = super().model_validate(obj, **kwargs)
        if hasattr(obj, 'project') and obj.project is not None:
            instance.project_name = obj.project.name
            instance.project_code = obj.project.code
        return instance
    
    model_config = ConfigDict(from_attributes=True)
