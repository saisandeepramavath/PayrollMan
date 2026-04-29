"""
Employee Onboarding Service
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from src.app.models.user import User
from src.app.models.project_assignment import ProjectAssignment, AssignmentStatus
from src.app.schemas.employee_onboarding import (
    EmployeeOnboardingRequest,
    ProjectAssignmentInput
)
from src.app.services.auth_service import AuthService
from src.app.repositories.user_repository import UserRepository


class EmployeeOnboardingService:
    """Service for employee onboarding workflow"""

    @staticmethod
    def onboard_employee(
        db: Session,
        onboarding_data: EmployeeOnboardingRequest,
        created_by_id: int
    ) -> tuple[User, List[ProjectAssignment]]:
        """
        Onboard a new employee with project assignments

        Args:
            db: Database session
            onboarding_data: Onboarding request data
            created_by_id: ID of the manager/HR creating the employee

        Returns:
            Tuple of (created_user, list_of_assignments)
        """

        # ── Step 1: Create the user ──────────────────────────────────────
        from src.app.schemas.user import UserCreate

        # Create full name from first and last name
        full_name = f"{onboarding_data.first_name} {onboarding_data.last_name}"

        user_create = UserCreate(
            email=onboarding_data.email,
            full_name=full_name,
            password=onboarding_data.password
        )

        try:
            user = AuthService.register_user(db, user_create)
        except Exception as e:
            raise ValueError(f"Failed to create user: {str(e)}")

        # Add detailed information
        user.first_name = onboarding_data.first_name
        user.last_name = onboarding_data.last_name
        user.personal_email = onboarding_data.personal_email
        user.office_phone = onboarding_data.office_phone
        user.personal_phone = onboarding_data.personal_phone
        user.date_of_birth = onboarding_data.date_of_birth
        user.additional_details = onboarding_data.additional_details
        user.onboarded_by_id = created_by_id  # Track who onboarded this employee

        # Assign role if provided
        if onboarding_data.role_id:
            user.role_id = onboarding_data.role_id

        db.commit()

        # ── Step 2: Create project assignments ───────────────────────────
        assignments: List[ProjectAssignment] = []

        for project_assign in onboarding_data.projects:
            try:
                assignment = ProjectAssignment(
                    project_id=project_assign.project_id,
                    user_id=user.id,
                    assigner_id=created_by_id,
                    role=project_assign.role,
                    notes=project_assign.notes,
                    status=AssignmentStatus.APPROVED if onboarding_data.auto_approve_assignments else AssignmentStatus.PENDING
                )

                # If auto-approving, set approver
                if onboarding_data.auto_approve_assignments:
                    assignment.approved_by_id = created_by_id
                    from datetime import datetime, timezone
                    assignment.approved_at = datetime.now(timezone.utc)

                db.add(assignment)
                assignments.append(assignment)

            except Exception as e:
                print(f"Failed to create assignment for project {project_assign.project_id}: {str(e)}")

        db.commit()

        return user, assignments

    @staticmethod
    def get_onboarded_employees(
        db: Session,
        manager_id: int,
        include_inactive: bool = False
    ) -> List[User]:
        """Get employees onboarded by a specific manager"""
        query = db.query(User).filter(
            User.onboarded_by_id == manager_id
        )

        if not include_inactive:
            query = query.filter(User.is_active == True)

        return query.all()

    @staticmethod
    def get_employee_onboarding_status(
        db: Session,
        employee_id: int
    ) -> dict:
        """Get onboarding status of an employee"""
        employee = UserRepository.get_by_id(db, employee_id)

        if not employee:
            raise ValueError(f"Employee {employee_id} not found")

        assignments = db.query(ProjectAssignment).filter(
            ProjectAssignment.user_id == employee_id
        ).all()

        approved = [a for a in assignments if a.status == AssignmentStatus.APPROVED]
        pending = [a for a in assignments if a.status == AssignmentStatus.PENDING]
        rejected = [a for a in assignments if a.status == AssignmentStatus.REJECTED]

        return {
            "employee_id": employee_id,
            "email": employee.email,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "full_name": employee.full_name,
            "personal_email": employee.personal_email,
            "office_phone": employee.office_phone,
            "personal_phone": employee.personal_phone,
            "date_of_birth": employee.date_of_birth,
            "created_at": employee.created_at,
            "total_assignments": len(assignments),
            "approved_assignments": len(approved),
            "pending_assignments": len(pending),
            "rejected_assignments": len(rejected),
            "is_active": employee.is_active,
            "assignments": {
                "approved": [self._format_assignment(a) for a in approved],
                "pending": [self._format_assignment(a) for a in pending],
                "rejected": [self._format_assignment(a) for a in rejected]
            }
        }

    @staticmethod
    def complete_onboarding(
        db: Session,
        employee_id: int,
        completed_by_id: int
    ) -> dict:
        """Mark onboarding as complete and activate employee"""
        employee = UserRepository.get_by_id(db, employee_id)

        if not employee:
            raise ValueError(f"Employee {employee_id} not found")

        # Ensure all pending assignments are approved
        pending = db.query(ProjectAssignment).filter(
            and_(
                ProjectAssignment.user_id == employee_id,
                ProjectAssignment.status == AssignmentStatus.PENDING
            )
        ).all()

        if pending:
            raise ValueError(f"Cannot complete onboarding with {len(pending)} pending assignments")

        # Activate employee
        employee.is_active = True
        db.commit()

        return {
            "employee_id": employee_id,
            "status": "onboarding_complete",
            "activated": True
        }

    @staticmethod
    def _format_assignment(assignment: ProjectAssignment) -> dict:
        """Format assignment data for response"""
        return {
            "id": assignment.id,
            "project_id": assignment.project_id,
            "project_name": assignment.project_name,
            "role": assignment.role,
            "status": assignment.status.value,
            "created_at": assignment.created_at,
            "approved_at": assignment.approved_at
        }

