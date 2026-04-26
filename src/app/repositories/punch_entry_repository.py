"""
PunchEntry Repository - Data access layer for PunchEntry model
"""

from typing import List, Optional
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.app.models.punch_entry import PunchEntry


class PunchEntryRepository:
    """Punch Entry data access repository"""
    
    @staticmethod
    def get_by_id(db: Session, entry_id: int) -> Optional[PunchEntry]:
        """Get punch entry by ID"""
        return db.query(PunchEntry).filter(PunchEntry.id == entry_id).first()
    
    @staticmethod
    def get_by_id_and_user(db: Session, entry_id: int, user_id: int) -> Optional[PunchEntry]:
        """Get punch entry by ID for specific user"""
        return db.query(PunchEntry).filter(
            PunchEntry.id == entry_id,
            PunchEntry.user_id == user_id
        ).first()
    
    @staticmethod
    def get_active_entry(db: Session, user_id: int) -> Optional[PunchEntry]:
        """Get currently active punch entry (punch_out is null)"""
        return db.query(PunchEntry).filter(
            PunchEntry.user_id == user_id,
            PunchEntry.punch_out == None
        ).order_by(PunchEntry.punch_in.desc()).first()
    
    @staticmethod
    def get_by_date(db: Session, user_id: int, date_value: date) -> List[PunchEntry]:
        """Get all punch entries for a specific date"""
        return db.query(PunchEntry).filter(
            PunchEntry.user_id == user_id,
            PunchEntry.date == date_value
        ).order_by(PunchEntry.punch_in).all()
    
    @staticmethod
    def get_by_date_range(
        db: Session,
        user_id: int,
        start_date: date,
        end_date: date
    ) -> List[PunchEntry]:
        """Get punch entries within date range"""
        return db.query(PunchEntry).filter(
            PunchEntry.user_id == user_id,
            PunchEntry.date >= start_date,
            PunchEntry.date <= end_date
        ).order_by(PunchEntry.date.desc(), PunchEntry.punch_in.desc()).all()

    @staticmethod
    def get_by_user(db: Session, user_id: int) -> List[PunchEntry]:
        """Get all punch entries for a user."""
        return db.query(PunchEntry).filter(
            PunchEntry.user_id == user_id
        ).order_by(PunchEntry.date.desc(), PunchEntry.punch_in.desc()).all()
    
    @staticmethod
    def create(
        db: Session,
        user_id: int,
        date_value: date,
        punch_in: datetime,
        punch_out: Optional[datetime] = None,
        notes: Optional[str] = None
    ) -> PunchEntry:
        """Create a new punch entry"""
        entry = PunchEntry(
            user_id=user_id,
            date=date_value,
            punch_in=punch_in,
            punch_out=punch_out,
            notes=notes,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry
    
    @staticmethod
    def update(
        db: Session,
        entry: PunchEntry,
        date_value: Optional[date] = None,
        punch_in: Optional[datetime] = None,
        punch_out: Optional[datetime] = None,
        notes: Optional[str] = None
    ) -> PunchEntry:
        """Update punch entry"""
        if date_value is not None:
            entry.date = date_value
        if punch_in is not None:
            entry.punch_in = punch_in
        if punch_out is not None:
            entry.punch_out = punch_out
        if notes is not None:
            entry.notes = notes
        
        db.commit()
        db.refresh(entry)
        return entry
    
    @staticmethod
    def punch_out(db: Session, entry: PunchEntry, punch_out: datetime) -> PunchEntry:
        """Punch out from active entry"""
        entry.punch_out = punch_out
        db.commit()
        db.refresh(entry)
        return entry
    
    @staticmethod
    def delete(db: Session, entry: PunchEntry) -> None:
        """Delete punch entry"""
        db.delete(entry)
        db.commit()
    
    @staticmethod
    def get_total_hours_by_date(db: Session, user_id: int, date_value: date) -> float:
        """Calculate total punched hours for a specific date"""
        entries = PunchEntryRepository.get_by_date(db, user_id, date_value)
        total_hours = 0.0
        
        for entry in entries:
            if entry.punch_out:
                time_diff = entry.punch_out - entry.punch_in
                total_hours += time_diff.total_seconds() / 3600
        
        return round(total_hours, 2)
