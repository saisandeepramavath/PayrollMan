"""
Timecard Endpoints
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session

from src.app.db.session import get_db
from src.app.schemas.timecard import TimecardCreate, TimecardUpdate, TimecardResponse
from src.app.services.timecard_service import TimecardService
from src.app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=TimecardResponse, status_code=status.HTTP_201_CREATED)
def create_timecard(
    timecard_data: TimecardCreate,
    user_id: Optional[int] = Query(None, description="Target user when allowed by role"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new timecard"""
    target_user_id = TimecardService.resolve_target_user_id(current_user, user_id)
    return TimecardService.create_timecard(db, target_user_id, timecard_data)


@router.get("/", response_model=List[TimecardResponse])
def get_timecards(
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    user_id: Optional[int] = Query(None, description="Target user when allowed by role"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get timecards for current user or another user if permitted."""
    target_user_id = current_user.id
    if user_id is not None and user_id != current_user.id:
        if not current_user.is_superuser and not getattr(current_user.role, "can_view_all_timecards", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: your role does not have 'can_view_all_timecards'"
            )
        target_user_id = user_id
    return TimecardService.get_user_timecards(db, target_user_id, start_date, end_date)


@router.get("/{timecard_id}", response_model=TimecardResponse)
def get_timecard(
    timecard_id: int,
    user_id: Optional[int] = Query(None, description="Target user when allowed by role"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get specific timecard"""
    target_user_id = TimecardService.resolve_target_user_id(current_user, user_id)
    return TimecardService.get_timecard(db, timecard_id, target_user_id)


@router.put("/{timecard_id}", response_model=TimecardResponse)
def update_timecard(
    timecard_id: int,
    timecard_data: TimecardUpdate,
    user_id: Optional[int] = Query(None, description="Target user when allowed by role"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update timecard"""
    target_user_id = TimecardService.resolve_target_user_id(current_user, user_id)
    return TimecardService.update_timecard(db, timecard_id, target_user_id, timecard_data)


@router.delete("/{timecard_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timecard(
    timecard_id: int,
    user_id: Optional[int] = Query(None, description="Target user when allowed by role"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete timecard"""
    target_user_id = TimecardService.resolve_target_user_id(current_user, user_id)
    TimecardService.delete_timecard(db, timecard_id, target_user_id)
    return None
