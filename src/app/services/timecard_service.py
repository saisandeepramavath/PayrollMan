"""
Timecard Service - Business logic for timecards
"""

from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from src.app.models.timecard import Timecard
from src.app.schemas.timecard import TimecardCreate, TimecardUpdate
from src.app.repositories.timecard_repository import TimecardRepository


class TimecardService:
    """Timecard business logic"""
    
    @staticmethod
    def create_timecard(db: Session, user_id: int, timecard_data: TimecardCreate) -> Timecard:
        """
        Create a new timecard
        
        Args:
            db: Database session
            user_id: User ID
            timecard_data: Timecard creation data
            
        Returns:
            Created timecard
        """
        # Create timecard using repository
        timecard = TimecardRepository.create(
            db=db,
            user_id=user_id,
            date=timecard_data.date,
            hours_worked=timecard_data.hours_worked,
            description=timecard_data.description,
            project=timecard_data.project
        )
        
        return timecard
    
    @staticmethod
    def get_user_timecards(db: Session, user_id: int) -> List[Timecard]:
        """
        Get all timecards for a user
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            List of timecards
        """
        return TimecardRepository.get_all_by_user(db, user_id)
    
    @staticmethod
    def get_timecard(db: Session, timecard_id: int, user_id: int) -> Timecard:
        """
        Get a specific timecard
        
        Args:
            db: Database session
            timecard_id: Timecard ID
            user_id: User ID
            
        Returns:
            Timecard
            
        Raises:
            HTTPException: If timecard not found or unauthorized
        """
        timecard = TimecardRepository.get_by_id_and_user(db, timecard_id, user_id)
        
        if not timecard:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Timecard not found"
            )
        
        return timecard
    
    @staticmethod
    def update_timecard(
        db: Session,
        timecard_id: int,
        user_id: int,
        timecard_data: TimecardUpdate
    ) -> Timecard:
        """
        Update a timecard
        
        Args:
            db: Database session
            timecard_id: Timecard ID
            user_id: User ID
            timecard_data: Update data
            
        Returns:
            Updated timecard
        """
        timecard = TimecardService.get_timecard(db, timecard_id, user_id)
        
        # Update fields
        if timecard_data.date is not None:
            timecard.date = timecard_data.date
        if timecard_data.hours_worked is not None:
            timecard.hours_worked = timecard_data.hours_worked
        if timecard_data.description is not None:
            timecard.description = timecard_data.description
        if timecard_data.project is not None:
            timecard.project = timecard_data.project
        
        return TimecardRepository.update(db, timecard)
    
    @staticmethod
    def delete_timecard(db: Session, timecard_id: int, user_id: int) -> None:
        """
        Delete a timecard
        
        Args:
            db: Database session
            timecard_id: Timecard ID
            user_id: User ID
        """
        timecard = TimecardService.get_timecard(db, timecard_id, user_id)
        TimecardRepository.delete(db, timecard)
