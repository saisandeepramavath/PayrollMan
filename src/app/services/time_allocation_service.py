"""
TimeAllocation Service - Business logic for time allocations
"""

from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from src.app.models.time_allocation import TimeAllocation
from src.app.schemas.time_allocation import (
    TimeAllocationCreate,
    TimeAllocationUpdate,
    BulkTimeAllocationCreate
)
from src.app.repositories.time_allocation_repository import TimeAllocationRepository
from src.app.repositories.project_assignment_repository import ProjectAssignmentRepository
from src.app.repositories.punch_entry_repository import PunchEntryRepository
from src.app.models.project_assignment import AssignmentStatus


class TimeAllocationService:
    """Time Allocation business logic"""
    
    @staticmethod
    def create_allocation(
        db: Session,
        user_id: int,
        allocation_data: TimeAllocationCreate
    ) -> TimeAllocation:
        """
        Create a new time allocation
        
        Args:
            db: Database session
            user_id: User ID
            allocation_data: Time allocation creation data
            
        Returns:
            Created time allocation
            
        Raises:
            HTTPException: If project not assigned or validation fails
        """
        # Verify user has approved assignment to this project
        assignment = ProjectAssignmentRepository.get_by_user_and_project(
            db=db,
            user_id=user_id,
            project_id=allocation_data.project_id
        )
        
        if not assignment or assignment.status != AssignmentStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this project. Please request assignment first."
            )
        
        # Get total hours already allocated for this date
        existing_total = TimeAllocationRepository.get_total_hours_by_date(
            db=db,
            user_id=user_id,
            date_value=allocation_data.date
        )
        
        # Check if new allocation would exceed 24 hours
        if existing_total + allocation_data.hours > 24:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total allocated hours for {allocation_data.date} would exceed 24 hours. "
                      f"Currently allocated: {existing_total} hours"
            )
        
        # Create allocation
        allocation = TimeAllocationRepository.create(
            db=db,
            user_id=user_id,
            project_id=allocation_data.project_id,
            date_value=allocation_data.date,
            hours=allocation_data.hours,
            description=allocation_data.description
        )
        
        return allocation
    
    @staticmethod
    def bulk_create_allocations(
        db: Session,
        user_id: int,
        bulk_data: BulkTimeAllocationCreate
    ) -> List[TimeAllocation]:
        """
        Create multiple time allocations for a single day
        
        Args:
            db: Database session
            user_id: User ID
            bulk_data: Bulk creation data with date and allocations
            
        Returns:
            List of created allocations
            
        Raises:
            HTTPException: If any validation fails
        """
        # Verify all projects are assigned to user
        for alloc in bulk_data.allocations:
            assignment = ProjectAssignmentRepository.get_by_user_and_project(
                db=db,
                user_id=user_id,
                project_id=alloc['project_id']
            )
            
            if not assignment or assignment.status != AssignmentStatus.APPROVED:
                from src.app.repositories.project_repository import ProjectRepository
                project = ProjectRepository.get_by_id(db=db, project_id=alloc['project_id'])
                project_name = project.name if project else f"ID {alloc['project_id']}"
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"You are not assigned to project: {project_name}"
                )
        
        # Delete existing allocations for this date
        TimeAllocationRepository.delete_by_date(
            db=db,
            user_id=user_id,
            date_value=bulk_data.date
        )
        
        # Create new allocations
        allocations = TimeAllocationRepository.bulk_create(
            db=db,
            user_id=user_id,
            date_value=bulk_data.date,
            allocations=bulk_data.allocations
        )
        
        return allocations
    
    @staticmethod
    def get_user_allocations(
        db: Session,
        user_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[TimeAllocation]:
        """
        Get time allocations for a user
        
        Args:
            db: Database session
            user_id: User ID
            start_date: Optional start date filter
            end_date: Optional end date filter
            skip: Number of records to skip
            limit: Maximum records to return
            
        Returns:
            List of time allocations
        """
        if start_date and end_date:
            return TimeAllocationRepository.get_by_date_range(
                db=db,
                user_id=user_id,
                start_date=start_date,
                end_date=end_date
            )
        elif start_date:
            return TimeAllocationRepository.get_by_date(
                db=db,
                user_id=user_id,
                date_value=start_date
            )
        else:
            return TimeAllocationRepository.get_user_allocations(
                db=db,
                user_id=user_id,
                skip=skip,
                limit=limit
            )
    
    @staticmethod
    def get_allocation(db: Session, allocation_id: int, user_id: int) -> TimeAllocation:
        """
        Get specific time allocation
        
        Args:
            db: Database session
            allocation_id: Allocation ID
            user_id: User ID
            
        Returns:
            Time allocation with project details
            
        Raises:
            HTTPException: If allocation not found
        """
        allocation = TimeAllocationRepository.get_by_id_with_project(
            db=db,
            allocation_id=allocation_id,
            user_id=user_id
        )
        
        if not allocation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time allocation not found"
            )
        
        return allocation
    
    @staticmethod
    def get_allocations_by_project(
        db: Session,
        user_id: int,
        project_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[TimeAllocation]:
        """
        Get time allocations for a specific project
        
        Args:
            db: Database session
            user_id: User ID
            project_id: Project ID
            start_date: Optional start date
            end_date: Optional end date
            
        Returns:
            List of time allocations
        """
        return TimeAllocationRepository.get_by_project(
            db=db,
            user_id=user_id,
            project_id=project_id,
            start_date=start_date,
            end_date=end_date
        )
    
    @staticmethod
    def update_allocation(
        db: Session,
        allocation_id: int,
        user_id: int,
        allocation_data: TimeAllocationUpdate
    ) -> TimeAllocation:
        """
        Update time allocation
        
        Args:
            db: Database session
            allocation_id: Allocation ID
            user_id: User ID
            allocation_data: Update data
            
        Returns:
            Updated time allocation
            
        Raises:
            HTTPException: If allocation not found or validation fails
        """
        # Get existing allocation
        allocation = TimeAllocationRepository.get_by_id_and_user(
            db=db,
            allocation_id=allocation_id,
            user_id=user_id
        )
        
        if not allocation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time allocation not found"
            )
        
        # Verify project assignment if project is being changed
        if allocation_data.project_id and allocation_data.project_id != allocation.project_id:
            assignment = ProjectAssignmentRepository.get_by_user_and_project(
                db=db,
                user_id=user_id,
                project_id=allocation_data.project_id
            )
            
            if not assignment or assignment.status != AssignmentStatus.APPROVED:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not assigned to the new project"
                )
        
        # Check total hours if hours or date is being changed
        if allocation_data.hours or allocation_data.date:
            new_date = allocation_data.date or allocation.date
            new_hours = allocation_data.hours or allocation.hours
            
            # Get total excluding this allocation
            existing_total = TimeAllocationRepository.get_total_hours_by_date(
                db=db,
                user_id=user_id,
                date_value=new_date
            )
            existing_total -= allocation.hours  # Subtract current allocation
            
            if existing_total + new_hours > 24:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Total allocated hours for {new_date} would exceed 24 hours"
                )
        
        # Update allocation
        update_data = allocation_data.model_dump(exclude_unset=True)
        updated_allocation = TimeAllocationRepository.update(
            db=db,
            allocation=allocation,
            **update_data
        )
        
        return updated_allocation
    
    @staticmethod
    def delete_allocation(db: Session, allocation_id: int, user_id: int) -> None:
        """
        Delete time allocation
        
        Args:
            db: Database session
            allocation_id: Allocation ID
            user_id: User ID
            
        Raises:
            HTTPException: If allocation not found
        """
        allocation = TimeAllocationRepository.get_by_id_and_user(
            db=db,
            allocation_id=allocation_id,
            user_id=user_id
        )
        
        if not allocation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Time allocation not found"
            )
        
        TimeAllocationRepository.delete(db=db, allocation=allocation)
    
    @staticmethod
    def get_daily_summary(db: Session, user_id: int, date_value: date) -> dict:
        """
        Get daily summary of punched hours vs allocated hours
        
        Args:
            db: Database session
            user_id: User ID
            date_value: Date to summarize
            
        Returns:
            Summary dict with totals and allocations
        """
        # Get total punched hours
        total_punched = PunchEntryRepository.get_total_hours_by_date(
            db=db,
            user_id=user_id,
            date_value=date_value
        )
        
        # Get total allocated hours
        total_allocated = TimeAllocationRepository.get_total_hours_by_date(
            db=db,
            user_id=user_id,
            date_value=date_value
        )
        
        # Get all allocations for the day
        allocations = TimeAllocationRepository.get_by_date(
            db=db,
            user_id=user_id,
            date_value=date_value
        )
        
        # Convert allocations to schema format
        from src.app.schemas.time_allocation import TimeAllocationWithProject
        allocation_responses = [
            TimeAllocationWithProject.model_validate(alloc) for alloc in allocations
        ]
        
        return {
            "date": date_value,
            "total_punched_hours": total_punched,
            "total_allocated_hours": total_allocated,
            "unallocated_hours": total_punched - total_allocated,
            "allocations": allocation_responses
        }
    
    @staticmethod
    def get_project_summary(
        db: Session,
        user_id: int,
        start_date: date,
        end_date: date
    ) -> List[dict]:
        """
        Get summary of hours by project within date range
        
        Args:
            db: Database session
            user_id: User ID
            start_date: Start date
            end_date: End date
            
        Returns:
            List of project summaries with total hours
        """
        return TimeAllocationRepository.get_project_summary(
            db=db,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date
        )
