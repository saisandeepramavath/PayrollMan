"""
PunchEntry Service - Business logic for punch entries
"""

from typing import List, Optional
from datetime import datetime, date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from src.app.models.punch_entry import PunchEntry
from src.app.schemas.punch_entry import PunchEntryCreate, PunchEntryUpdate
from src.app.repositories.punch_entry_repository import PunchEntryRepository


class PunchEntryService:
    """Punch Entry business logic"""
    
    @staticmethod
    def punch_in(
        db: Session,
        user_id: int,
        punch_in_time: Optional[datetime] = None,
        notes: Optional[str] = None
    ) -> PunchEntry:
        """
        Quick punch in - creates new active punch entry
        
        Args:
            db: Database session
            user_id: User ID
            punch_in_time: Punch in time (default: current time)
            notes: Optional notes
            
        Returns:
            Created punch entry
            
        Raises:
            HTTPException: If user already has active punch entry
        """
        # Check if user already has active punch entry
        active_entry = PunchEntryRepository.get_active_entry(db=db, user_id=user_id)
        
        if active_entry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have an active punch entry. Please punch out first."
            )
        
        # Use current time if not provided
        if not punch_in_time:
            punch_in_time = datetime.utcnow()
        
        # Create punch entry
        entry = PunchEntryRepository.create(
            db=db,
            user_id=user_id,
            date_value=punch_in_time.date(),
            punch_in=punch_in_time,
            notes=notes
        )
        
        return entry
    
    @staticmethod
    def punch_out(
        db: Session,
        user_id: int,
        punch_out_time: Optional[datetime] = None,
        notes: Optional[str] = None
    ) -> PunchEntry:
        """
        Quick punch out - closes active punch entry
        
        Args:
            db: Database session
            user_id: User ID
            punch_out_time: Punch out time (default: current time)
            notes: Optional notes to append
            
        Returns:
            Updated punch entry
            
        Raises:
            HTTPException: If no active punch entry found
        """
        # Get active entry
        active_entry = PunchEntryRepository.get_active_entry(db=db, user_id=user_id)
        
        if not active_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active punch entry found. Please punch in first."
            )
        
        # Use current time if not provided
        if not punch_out_time:
            punch_out_time = datetime.utcnow()
        
        # Validate punch_out is after punch_in
        if punch_out_time <= active_entry.punch_in:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Punch out time must be after punch in time"
            )
        
        # Append notes if provided
        if notes:
            active_entry.notes = notes if not active_entry.notes else f"{active_entry.notes}\n{notes}"
        
        # Punch out
        updated_entry = PunchEntryRepository.punch_out(
            db=db,
            entry=active_entry,
            punch_out=punch_out_time
        )
        
        return updated_entry
    
    @staticmethod
    def get_active_entry(db: Session, user_id: int) -> Optional[PunchEntry]:
        """
        Get currently active punch entry
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            Active punch entry or None
        """
        return PunchEntryRepository.get_active_entry(db=db, user_id=user_id)
    
    @staticmethod
    def create_punch_entry(
        db: Session,
        user_id: int,
        entry_data: PunchEntryCreate
    ) -> PunchEntry:
        """
        Create a complete punch entry (with both punch in and out)
        
        Args:
            db: Database session
            user_id: User ID
            entry_data: Punch entry creation data
            
        Returns:
            Created punch entry
            
        Raises:
            HTTPException: If validation fails
        """
        # Validate punch_out is after punch_in if provided
        if entry_data.punch_out and entry_data.punch_out <= entry_data.punch_in:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Punch out time must be after punch in time"
            )
        
        # Create entry
        entry = PunchEntryRepository.create(
            db=db,
            user_id=user_id,
            date_value=entry_data.date,
            punch_in=entry_data.punch_in,
            punch_out=entry_data.punch_out,
            notes=entry_data.notes
        )
        
        return entry
    
    @staticmethod
    def get_user_punch_entries(
        db: Session,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[PunchEntry]:
        """
        Get punch entries for a user
        
        Args:
            db: Database session
            user_id: User ID
            start_date: Optional start date filter
            end_date: Optional end date filter
            
        Returns:
            List of punch entries
        """
        if start_date and end_date:
            return PunchEntryRepository.get_by_date_range(
                db=db,
                user_id=user_id,
                start_date=start_date,
                end_date=end_date
            )
        elif start_date:
            return PunchEntryRepository.get_by_date(db=db, user_id=user_id, date_value=start_date)
        else:
            # Get last 30 days by default
            from datetime import timedelta
            end = date.today()
            start = end - timedelta(days=30)
            return PunchEntryRepository.get_by_date_range(
                db=db,
                user_id=user_id,
                start_date=start,
                end_date=end
            )
    
    @staticmethod
    def get_punch_entry(db: Session, entry_id: int, user_id: int) -> PunchEntry:
        """
        Get specific punch entry
        
        Args:
            db: Database session
            entry_id: Entry ID
            user_id: User ID
            
        Returns:
            Punch entry
            
        Raises:
            HTTPException: If entry not found
        """
        entry = PunchEntryRepository.get_by_id_and_user(
            db=db,
            entry_id=entry_id,
            user_id=user_id
        )
        
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Punch entry not found"
            )
        
        return entry
    
    @staticmethod
    def update_punch_entry(
        db: Session,
        entry_id: int,
        user_id: int,
        entry_data: PunchEntryUpdate
    ) -> PunchEntry:
        """
        Update punch entry
        
        Args:
            db: Database session
            entry_id: Entry ID
            user_id: User ID
            entry_data: Update data
            
        Returns:
            Updated punch entry
            
        Raises:
            HTTPException: If entry not found or validation fails
        """
        # Get existing entry
        entry = PunchEntryRepository.get_by_id_and_user(
            db=db,
            entry_id=entry_id,
            user_id=user_id
        )
        
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Punch entry not found"
            )
        
        # Validate punch times
        punch_in = entry_data.punch_in or entry.punch_in
        punch_out = entry_data.punch_out if entry_data.punch_out is not None else entry.punch_out
        
        if punch_out and punch_out <= punch_in:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Punch out time must be after punch in time"
            )
        
        # Update entry
        updated_entry = PunchEntryRepository.update(
            db=db,
            entry=entry,
            date_value=entry_data.date,
            punch_in=entry_data.punch_in,
            punch_out=entry_data.punch_out,
            notes=entry_data.notes
        )
        
        return updated_entry
    
    @staticmethod
    def delete_punch_entry(db: Session, entry_id: int, user_id: int) -> None:
        """
        Delete punch entry
        
        Args:
            db: Database session
            entry_id: Entry ID
            user_id: User ID
            
        Raises:
            HTTPException: If entry not found
        """
        entry = PunchEntryRepository.get_by_id_and_user(
            db=db,
            entry_id=entry_id,
            user_id=user_id
        )
        
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Punch entry not found"
            )
        
        PunchEntryRepository.delete(db=db, entry=entry)
    
    @staticmethod
    def get_daily_hours(db: Session, user_id: int, date_value: date) -> float:
        """
        Get total punched hours for a specific date
        
        Args:
            db: Database session
            user_id: User ID
            date_value: Date to calculate hours for
            
        Returns:
            Total hours worked
        """
        return PunchEntryRepository.get_total_hours_by_date(
            db=db,
            user_id=user_id,
            date_value=date_value
        )
