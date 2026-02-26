"""
Time Allocation Endpoints
"""

from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from src.app.db.session import get_db
from src.app.schemas.time_allocation import (
    TimeAllocationCreate,
    TimeAllocationUpdate,
    TimeAllocationResponse,
    TimeAllocationWithProject,
    BulkTimeAllocationCreate,
    DailySummary
)
from src.app.services.time_allocation_service import TimeAllocationService
from src.app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=TimeAllocationResponse, status_code=status.HTTP_201_CREATED)
def create_allocation(
    allocation_data: TimeAllocationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new time allocation"""
    return TimeAllocationService.create_allocation(
        db=db,
        user_id=current_user.id,
        allocation_data=allocation_data
    )


@router.post("/bulk", response_model=List[TimeAllocationResponse], status_code=status.HTTP_201_CREATED)
def bulk_create_allocations(
    bulk_data: BulkTimeAllocationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create multiple time allocations for a single day.
    This will replace any existing allocations for that day.
    """
    return TimeAllocationService.bulk_create_allocations(
        db=db,
        user_id=current_user.id,
        bulk_data=bulk_data
    )


@router.get("/", response_model=List[TimeAllocationWithProject])
def get_allocations(
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get time allocations for current user"""
    return TimeAllocationService.get_user_allocations(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit
    )


@router.get("/summary/daily/{date}", response_model=DailySummary)
def get_daily_summary(
    date: date,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get daily summary of punched hours vs allocated hours"""
    return TimeAllocationService.get_daily_summary(
        db=db,
        user_id=current_user.id,
        date_value=date
    )


@router.get("/summary/projects", response_model=List[dict])
def get_project_summary(
    start_date: date = Query(..., description="Start date"),
    end_date: date = Query(..., description="End date"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get summary of hours by project within date range"""
    return TimeAllocationService.get_project_summary(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date
    )


@router.get("/project/{project_id}", response_model=List[TimeAllocationWithProject])
def get_allocations_by_project(
    project_id: int,
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get time allocations for a specific project"""
    return TimeAllocationService.get_allocations_by_project(
        db=db,
        user_id=current_user.id,
        project_id=project_id,
        start_date=start_date,
        end_date=end_date
    )


@router.get("/{allocation_id}", response_model=TimeAllocationWithProject)
def get_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get specific time allocation"""
    return TimeAllocationService.get_allocation(
        db=db,
        allocation_id=allocation_id,
        user_id=current_user.id
    )


@router.put("/{allocation_id}", response_model=TimeAllocationResponse)
def update_allocation(
    allocation_id: int,
    allocation_data: TimeAllocationUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update time allocation"""
    return TimeAllocationService.update_allocation(
        db=db,
        allocation_id=allocation_id,
        user_id=current_user.id,
        allocation_data=allocation_data
    )


@router.delete("/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete time allocation"""
    TimeAllocationService.delete_allocation(
        db=db,
        allocation_id=allocation_id,
        user_id=current_user.id
    )
    return None
