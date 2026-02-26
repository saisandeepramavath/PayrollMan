"""
TimeAllocation Pydantic schemas
"""

from pydantic import BaseModel, ConfigDict, field_validator
from datetime import date, datetime
from typing import Optional, List


class TimeAllocationBase(BaseModel):
    """Base time allocation schema"""
    project_id: int
    date: date
    hours: float
    description: Optional[str] = None
    
    @field_validator('hours')
    @classmethod
    def validate_hours(cls, v):
        if v <= 0:
            raise ValueError('Hours must be greater than 0')
        if v > 24:
            raise ValueError('Hours cannot exceed 24 per day')
        return v


class TimeAllocationCreate(TimeAllocationBase):
    """Time allocation creation schema"""
    pass


class TimeAllocationUpdate(BaseModel):
    """Time allocation update schema"""
    project_id: Optional[int] = None
    date: Optional["date"] = None
    hours: Optional[float] = None
    description: Optional[str] = None
    
    @field_validator('hours')
    @classmethod
    def validate_hours(cls, v):
        if v is not None:
            if v <= 0:
                raise ValueError('Hours must be greater than 0')
            if v > 24:
                raise ValueError('Hours cannot exceed 24 per day')
        return v


class TimeAllocationResponse(TimeAllocationBase):
    """Time allocation response schema"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class TimeAllocationWithProject(TimeAllocationResponse):
    """Time allocation with project details"""
    project_name: str
    project_code: str
    
    model_config = ConfigDict(from_attributes=True)


class BulkTimeAllocationCreate(BaseModel):
    """Bulk time allocation for a single day across multiple projects"""
    date: date
    allocations: List[dict]  # [{"project_id": 1, "hours": 4.5, "description": "..."}, ...]
    
    @field_validator('allocations')
    @classmethod
    def validate_allocations(cls, v):
        if not v:
            raise ValueError('At least one allocation is required')
        
        total_hours = sum(alloc.get('hours', 0) for alloc in v)
        if total_hours > 24:
            raise ValueError(f'Total hours ({total_hours}) cannot exceed 24 per day')
        
        return v


class DailySummary(BaseModel):
    """Daily time summary"""
    date: date
    total_punched_hours: float
    total_allocated_hours: float
    unallocated_hours: float
    allocations: List[TimeAllocationWithProject]
    
    model_config = ConfigDict(from_attributes=True)
