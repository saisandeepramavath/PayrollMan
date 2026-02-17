"""
Timecard Endpoints
"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.app.db.session import get_db
from src.app.schemas.timecard import TimecardCreate, TimecardUpdate, TimecardResponse
from src.app.services.timecard_service import TimecardService
from src.app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=TimecardResponse, status_code=status.HTTP_201_CREATED)
def create_timecard(
    timecard_data: TimecardCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new timecard"""
    return TimecardService.create_timecard(db, current_user.id, timecard_data)


@router.get("/", response_model=List[TimecardResponse])
def get_timecards(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all timecards for current user"""
    return TimecardService.get_user_timecards(db, current_user.id)


@router.get("/{timecard_id}", response_model=TimecardResponse)
def get_timecard(
    timecard_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get specific timecard"""
    return TimecardService.get_timecard(db, timecard_id, current_user.id)


@router.put("/{timecard_id}", response_model=TimecardResponse)
def update_timecard(
    timecard_id: int,
    timecard_data: TimecardUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update timecard"""
    return TimecardService.update_timecard(db, timecard_id, current_user.id, timecard_data)


@router.delete("/{timecard_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timecard(
    timecard_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete timecard"""
    TimecardService.delete_timecard(db, timecard_id, current_user.id)
    return None
