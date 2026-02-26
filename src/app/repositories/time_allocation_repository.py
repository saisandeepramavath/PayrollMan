"""
TimeAllocation Repository - Data access layer for TimeAllocation model
"""

from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from src.app.models.time_allocation import TimeAllocation


class TimeAllocationRepository:
    """Time Allocation data access repository"""
    
    @staticmethod
    def get_by_id(db: Session, allocation_id: int) -> Optional[TimeAllocation]:
        """Get time allocation by ID"""
        return db.query(TimeAllocation).filter(
            TimeAllocation.id == allocation_id
        ).first()
    
    @staticmethod
    def get_by_id_and_user(db: Session, allocation_id: int, user_id: int) -> Optional[TimeAllocation]:
        """Get time allocation by ID for specific user"""
        return db.query(TimeAllocation).filter(
            TimeAllocation.id == allocation_id,
            TimeAllocation.user_id == user_id
        ).first()
    
    @staticmethod
    def get_by_id_with_project(db: Session, allocation_id: int, user_id: int) -> Optional[TimeAllocation]:
        """Get time allocation with project details"""
        return db.query(TimeAllocation).options(
            joinedload(TimeAllocation.project)
        ).filter(
            TimeAllocation.id == allocation_id,
            TimeAllocation.user_id == user_id
        ).first()
    
    @staticmethod
    def get_by_date(db: Session, user_id: int, date_value: date) -> List[TimeAllocation]:
        """Get all time allocations for a specific date"""
        return db.query(TimeAllocation).options(
            joinedload(TimeAllocation.project)
        ).filter(
            TimeAllocation.user_id == user_id,
            TimeAllocation.date == date_value
        ).order_by(TimeAllocation.created_at).all()
    
    @staticmethod
    def get_by_date_range(
        db: Session,
        user_id: int,
        start_date: date,
        end_date: date
    ) -> List[TimeAllocation]:
        """Get time allocations within date range"""
        return db.query(TimeAllocation).options(
            joinedload(TimeAllocation.project)
        ).filter(
            TimeAllocation.user_id == user_id,
            TimeAllocation.date >= start_date,
            TimeAllocation.date <= end_date
        ).order_by(TimeAllocation.date.desc(), TimeAllocation.created_at).all()
    
    @staticmethod
    def get_by_project(
        db: Session,
        user_id: int,
        project_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[TimeAllocation]:
        """Get time allocations for a specific project"""
        query = db.query(TimeAllocation).filter(
            TimeAllocation.user_id == user_id,
            TimeAllocation.project_id == project_id
        )
        
        if start_date:
            query = query.filter(TimeAllocation.date >= start_date)
        if end_date:
            query = query.filter(TimeAllocation.date <= end_date)
        
        return query.order_by(TimeAllocation.date.desc()).all()
    
    @staticmethod
    def get_user_allocations(
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[TimeAllocation]:
        """Get all time allocations for a user"""
        return db.query(TimeAllocation).options(
            joinedload(TimeAllocation.project)
        ).filter(
            TimeAllocation.user_id == user_id
        ).order_by(
            TimeAllocation.date.desc()
        ).offset(skip).limit(limit).all()
    
    @staticmethod
    def create(
        db: Session,
        user_id: int,
        project_id: int,
        date_value: date,
        hours: float,
        description: Optional[str] = None
    ) -> TimeAllocation:
        """Create a new time allocation"""
        allocation = TimeAllocation(
            user_id=user_id,
            project_id=project_id,
            date=date_value,
            hours=hours,
            description=description,
        )
        db.add(allocation)
        db.commit()
        db.refresh(allocation)
        return allocation
    
    @staticmethod
    def bulk_create(
        db: Session,
        user_id: int,
        date_value: date,
        allocations: List[dict]
    ) -> List[TimeAllocation]:
        """Create multiple time allocations for a day"""
        created_allocations = []
        
        for alloc in allocations:
            allocation = TimeAllocation(
                user_id=user_id,
                project_id=alloc['project_id'],
                date=date_value,
                hours=alloc['hours'],
                description=alloc.get('description'),
            )
            db.add(allocation)
            created_allocations.append(allocation)
        
        db.commit()
        
        for allocation in created_allocations:
            db.refresh(allocation)
        
        return created_allocations
    
    @staticmethod
    def update(
        db: Session,
        allocation: TimeAllocation,
        **kwargs
    ) -> TimeAllocation:
        """Update time allocation"""
        for key, value in kwargs.items():
            if value is not None and hasattr(allocation, key):
                setattr(allocation, key, value)
        
        db.commit()
        db.refresh(allocation)
        return allocation
    
    @staticmethod
    def delete(db: Session, allocation: TimeAllocation) -> None:
        """Delete time allocation"""
        db.delete(allocation)
        db.commit()
    
    @staticmethod
    def delete_by_date(db: Session, user_id: int, date_value: date) -> int:
        """Delete all allocations for a specific date"""
        count = db.query(TimeAllocation).filter(
            TimeAllocation.user_id == user_id,
            TimeAllocation.date == date_value
        ).delete()
        db.commit()
        return count
    
    @staticmethod
    def get_total_hours_by_date(db: Session, user_id: int, date_value: date) -> float:
        """Get total allocated hours for a specific date"""
        result = db.query(func.sum(TimeAllocation.hours)).filter(
            TimeAllocation.user_id == user_id,
            TimeAllocation.date == date_value
        ).scalar()
        
        return float(result or 0)
    
    @staticmethod
    def get_total_hours_by_project(
        db: Session,
        user_id: int,
        project_id: int,
        start_date: date,
        end_date: date
    ) -> float:
        """Get total hours allocated to a project within date range"""
        result = db.query(func.sum(TimeAllocation.hours)).filter(
            TimeAllocation.user_id == user_id,
            TimeAllocation.project_id == project_id,
            TimeAllocation.date >= start_date,
            TimeAllocation.date <= end_date
        ).scalar()
        
        return float(result or 0)
    
    @staticmethod
    def get_project_summary(
        db: Session,
        user_id: int,
        start_date: date,
        end_date: date
    ) -> List[dict]:
        """Get summary of hours by project within date range"""
        from src.app.models.project import Project
        
        results = db.query(
            Project.id,
            Project.name,
            Project.code,
            func.sum(TimeAllocation.hours).label('total_hours')
        ).join(
            TimeAllocation, Project.id == TimeAllocation.project_id
        ).filter(
            TimeAllocation.user_id == user_id,
            TimeAllocation.date >= start_date,
            TimeAllocation.date <= end_date
        ).group_by(
            Project.id, Project.name, Project.code
        ).all()
        
        return [
            {
                "project_id": r.id,
                "project_name": r.name,
                "project_code": r.code,
                "total_hours": float(r.total_hours or 0)
            }
            for r in results
        ]
