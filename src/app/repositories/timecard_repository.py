"""
Timecard Repository - Data access layer for Timecard model
"""

from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from src.app.models.timecard import Timecard


class TimecardRepository:
    """Timecard data access repository"""
    
    @staticmethod
    def get_by_id(db: Session, timecard_id: int) -> Optional[Timecard]:
        """Get timecard by ID"""
        return db.query(Timecard).filter(Timecard.id == timecard_id).first()
    
    @staticmethod
    def get_by_id_and_user(db: Session, timecard_id: int, user_id: int) -> Optional[Timecard]:
        """Get timecard by ID for specific user"""
        return db.query(Timecard).filter(
            Timecard.id == timecard_id,
            Timecard.user_id == user_id
        ).first()
    
    @staticmethod
    def get_all_by_user(db: Session, user_id: int) -> List[Timecard]:
        """Get all timecards for a user"""
        return db.query(Timecard).filter(Timecard.user_id == user_id).all()
    
    @staticmethod
    def create(
        db: Session,
        user_id: int,
        date: datetime,
        hours_worked: float,
        description: Optional[str] = None,
        project: Optional[str] = None
    ) -> Timecard:
        """Create a new timecard"""
        timecard = Timecard(
            user_id=user_id,
            date=date,
            hours_worked=hours_worked,
            description=description,
            project=project,
        )
        db.add(timecard)
        db.commit()
        db.refresh(timecard)
        return timecard
    
    @staticmethod
    def update(db: Session, timecard: Timecard) -> Timecard:
        """Update timecard"""
        db.commit()
        db.refresh(timecard)
        return timecard
    
    @staticmethod
    def delete(db: Session, timecard: Timecard) -> None:
        """Delete timecard"""
        db.delete(timecard)
        db.commit()
