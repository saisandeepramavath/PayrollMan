"""
Timecard Repository - Data access layer for Timecard model
"""

from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

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
        return db.query(Timecard).options(
            joinedload(Timecard.project)
        ).filter(
            Timecard.id == timecard_id,
            Timecard.user_id == user_id
        ).first()
    
    @staticmethod
    def get_all_by_user(db: Session, user_id: int) -> List[Timecard]:
        """Get all timecards for a user"""
        return db.query(Timecard).options(
            joinedload(Timecard.project)
        ).filter(Timecard.user_id == user_id).all()

    @staticmethod
    def get_by_user_and_date_range(
        db: Session,
        user_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> List[Timecard]:
        """Get all timecards for a user within a date range."""
        return db.query(Timecard).options(
            joinedload(Timecard.project)
        ).filter(
            Timecard.user_id == user_id,
            Timecard.date >= start_date,
            Timecard.date <= end_date
        ).all()

    @staticmethod
    def get_total_hours_in_range(
        db: Session,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
        exclude_timecard_id: Optional[int] = None,
    ) -> float:
        query = db.query(func.sum(Timecard.hours_worked)).filter(
            Timecard.user_id == user_id,
            Timecard.date >= start_date,
            Timecard.date <= end_date,
        )
        if exclude_timecard_id is not None:
            query = query.filter(Timecard.id != exclude_timecard_id)
        return float(query.scalar() or 0)

    @staticmethod
    def get_total_project_hours_since(
        db: Session,
        user_id: int,
        project_id: int,
        start_date: datetime,
    ) -> float:
        query = db.query(func.sum(Timecard.hours_worked)).filter(
            Timecard.user_id == user_id,
            Timecard.project_id == project_id,
            Timecard.date >= start_date,
        )
        return float(query.scalar() or 0)
    
    @staticmethod
    def create(
        db: Session,
        user_id: int,
        date: datetime,
        hours_worked: float,
        description: Optional[str] = None,
        project_id: Optional[int] = None,
        cost_center: Optional[str] = None,
        work_location: Optional[str] = None,
        entry_type: Optional[str] = None,
        labor_category: Optional[str] = None,
    ) -> Timecard:
        """Create a new timecard"""
        timecard = Timecard(
            user_id=user_id,
            project_id=project_id,
            date=date,
            hours_worked=hours_worked,
            description=description,
            cost_center=cost_center,
            work_location=work_location,
            entry_type=entry_type,
            labor_category=labor_category,
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
