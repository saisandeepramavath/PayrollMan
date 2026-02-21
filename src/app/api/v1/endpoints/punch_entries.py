"""
Punch Entry Endpoints
"""

from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from src.app.db.session import get_db
from src.app.schemas.punch_entry import (
    PunchEntryCreate,
    PunchEntryUpdate,
    PunchEntryResponse,
    PunchInRequest,
    PunchOutRequest
)
from src.app.services.punch_entry_service import PunchEntryService
from src.app.api.deps import get_current_user

router = APIRouter()


@router.post("/in", response_model=PunchEntryResponse, status_code=status.HTTP_201_CREATED)
def punch_in(
    request: PunchInRequest = PunchInRequest(),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Quick punch in - creates new active punch entry"""
    return PunchEntryService.punch_in(
        db=db,
        user_id=current_user.id,
        punch_in_time=request.punch_in,
        notes=request.notes
    )


@router.post("/out", response_model=PunchEntryResponse)
def punch_out(
    request: PunchOutRequest = PunchOutRequest(),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Quick punch out - closes active punch entry"""
    return PunchEntryService.punch_out(
        db=db,
        user_id=current_user.id,
        punch_out_time=request.punch_out,
        notes=request.notes
    )


@router.get("/active", response_model=Optional[PunchEntryResponse])
def get_active_punch(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get currently active punch entry"""
    return PunchEntryService.get_active_entry(db=db, user_id=current_user.id)


@router.post("/", response_model=PunchEntryResponse, status_code=status.HTTP_201_CREATED)
def create_punch_entry(
    entry_data: PunchEntryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a complete punch entry (with both punch in and out)"""
    return PunchEntryService.create_punch_entry(
        db=db,
        user_id=current_user.id,
        entry_data=entry_data
    )


@router.get("/", response_model=List[PunchEntryResponse])
def get_punch_entries(
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get punch entries for current user"""
    return PunchEntryService.get_user_punch_entries(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date
    )


@router.get("/{entry_id}", response_model=PunchEntryResponse)
def get_punch_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get specific punch entry"""
    return PunchEntryService.get_punch_entry(
        db=db,
        entry_id=entry_id,
        user_id=current_user.id
    )


@router.put("/{entry_id}", response_model=PunchEntryResponse)
def update_punch_entry(
    entry_id: int,
    entry_data: PunchEntryUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update punch entry"""
    return PunchEntryService.update_punch_entry(
        db=db,
        entry_id=entry_id,
        user_id=current_user.id,
        entry_data=entry_data
    )


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_punch_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete punch entry"""
    PunchEntryService.delete_punch_entry(
        db=db,
        entry_id=entry_id,
        user_id=current_user.id
    )
    return None


@router.get("/hours/{date}", response_model=dict)
def get_daily_hours(
    date: date,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get total punched hours for a specific date"""
    total_hours = PunchEntryService.get_daily_hours(
        db=db,
        user_id=current_user.id,
        date_value=date
    )
    return {"date": date, "total_hours": total_hours}
