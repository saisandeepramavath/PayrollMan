"""
Timecard Service - Business logic for timecards
"""

from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from src.app.models.timecard import Timecard
from src.app.models.user import User
from src.app.schemas.timecard import TimecardCreate, TimecardUpdate
from src.app.repositories.timecard_repository import TimecardRepository
from src.app.services.timecard_submission_service import TimecardSubmissionService
from src.app.services.user_work_rule_service import UserWorkRuleService


class TimecardService:
    """Timecard business logic"""

    @staticmethod
    def resolve_target_user_id(current_user: User, requested_user_id: Optional[int]) -> int:
        target_user_id = current_user.id
        if requested_user_id is not None and requested_user_id != current_user.id:
            if not current_user.is_superuser and not getattr(current_user.role, "can_view_all_timecards", False):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Permission denied: your role does not have 'can_view_all_timecards'"
                )
            target_user_id = requested_user_id
        return target_user_id

    @staticmethod
    def _validate_reference_target(project_id: Optional[int], cost_center: Optional[str]) -> None:
        if project_id is None and not cost_center:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either project_id or cost_center is required"
            )

    @staticmethod
    def _week_bounds(target_date: datetime) -> tuple[datetime, datetime]:
        week_start = datetime(target_date.year, target_date.month, target_date.day)
        weekday = week_start.weekday()
        week_start = week_start - timedelta(days=weekday)
        week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
        return week_start, week_end

    @staticmethod
    def _validate_against_rules(
        db: Session,
        user_id: int,
        target_date: datetime,
        hours_worked: float,
        exclude_timecard_id: Optional[int] = None,
    ) -> None:
        effective_rule = UserWorkRuleService.get_effective_rule(db, user_id, target_date.date())

        if effective_rule.max_daily_hours is not None and hours_worked > effective_rule.max_daily_hours:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Daily limit exceeded: max {effective_rule.max_daily_hours}h per day"
            )

        if effective_rule.max_weekly_hours is not None:
            week_start, week_end = TimecardService._week_bounds(target_date)
            existing_week_hours = TimecardRepository.get_total_hours_in_range(
                db=db,
                user_id=user_id,
                start_date=week_start,
                end_date=week_end,
                exclude_timecard_id=exclude_timecard_id,
            )
            if existing_week_hours + hours_worked > effective_rule.max_weekly_hours:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Weekly limit exceeded: {existing_week_hours + hours_worked:.2f}h would exceed "
                        f"the allowed {effective_rule.max_weekly_hours}h"
                    )
                )
    
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
        TimecardService._validate_against_rules(
            db=db,
            user_id=user_id,
            target_date=timecard_data.date,
            hours_worked=timecard_data.hours_worked,
        )
        TimecardService._validate_reference_target(
            project_id=timecard_data.project_id,
            cost_center=timecard_data.cost_center,
        )

        # Create timecard using repository
        timecard = TimecardRepository.create(
            db=db,
            user_id=user_id,
            date=timecard_data.date,
            hours_worked=timecard_data.hours_worked,
            description=timecard_data.description,
            project_id=timecard_data.project_id,
            cost_center=timecard_data.cost_center,
            work_location=timecard_data.work_location,
            entry_type=timecard_data.entry_type,
            labor_category=timecard_data.labor_category,
        )
        TimecardSubmissionService.reset_submission_for_date(db, user_id, timecard_data.date)
        
        return timecard
    
    @staticmethod
    def get_user_timecards(
        db: Session,
        user_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Timecard]:
        """
        Get all timecards for a user
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            List of timecards
        """
        if start_date and end_date:
            return TimecardRepository.get_by_user_and_date_range(db, user_id, start_date, end_date)
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

        next_date = timecard_data.date if timecard_data.date is not None else timecard.date
        next_hours = timecard_data.hours_worked if timecard_data.hours_worked is not None else timecard.hours_worked
        next_project_id = timecard_data.project_id if timecard_data.project_id is not None else timecard.project_id
        next_cost_center = timecard_data.cost_center if timecard_data.cost_center is not None else timecard.cost_center

        TimecardService._validate_against_rules(
            db=db,
            user_id=user_id,
            target_date=next_date,
            hours_worked=next_hours,
            exclude_timecard_id=timecard.id,
        )
        TimecardService._validate_reference_target(
            project_id=next_project_id,
            cost_center=next_cost_center,
        )
        
        # Update fields
        if timecard_data.date is not None:
            timecard.date = timecard_data.date
        if timecard_data.hours_worked is not None:
            timecard.hours_worked = timecard_data.hours_worked
        if timecard_data.description is not None:
            timecard.description = timecard_data.description
        if timecard_data.project_id is not None:
            timecard.project_id = timecard_data.project_id
        if timecard_data.cost_center is not None:
            timecard.cost_center = timecard_data.cost_center
        if timecard_data.work_location is not None:
            timecard.work_location = timecard_data.work_location
        if timecard_data.entry_type is not None:
            timecard.entry_type = timecard_data.entry_type
        if timecard_data.labor_category is not None:
            timecard.labor_category = timecard_data.labor_category

        updated = TimecardRepository.update(db, timecard)
        TimecardSubmissionService.reset_submission_for_date(db, user_id, next_date)
        return updated
    
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
        target_date = timecard.date
        TimecardRepository.delete(db, timecard)
        TimecardSubmissionService.reset_submission_for_date(db, user_id, target_date)
