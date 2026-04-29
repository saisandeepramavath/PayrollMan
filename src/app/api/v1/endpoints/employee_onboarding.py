"""
Employee Onboarding Endpoints
"""

from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from src.app.db.session import get_db
from src.app.schemas.employee_onboarding import (
    EmployeeOnboardingRequest,
    EmployeeOnboardingResponse,
    EmployeeWithAssignments,
    OnboardingBulkRequest,
    OnboardingBulkResponse
)
from src.app.services.employee_onboarding_service import EmployeeOnboardingService
from src.app.api.deps import get_current_user, require_any_permission
from src.app.models.user import User

router = APIRouter()


@router.post("/onboard", response_model=EmployeeOnboardingResponse, status_code=status.HTTP_201_CREATED)
def onboard_employee(
    onboarding_data: EmployeeOnboardingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission("can_manage_users", "can_manage_assignments")
    )
):
    """
    Onboard a new employee with optional project assignments

    Requires: Manager or HR role with user/assignment management permissions
    """
    try:
        user, assignments = EmployeeOnboardingService.onboard_employee(
            db=db,
            onboarding_data=onboarding_data,
            created_by_id=current_user.id
        )

        return EmployeeOnboardingResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            role_id=user.role_id,
            created_at=user.created_at,
            assignments_created=len(assignments),
            assignment_ids=[a.id for a in assignments]
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during onboarding: {str(e)}")


@router.post("/onboard-bulk", response_model=OnboardingBulkResponse, status_code=status.HTTP_201_CREATED)
def bulk_onboard_employees(
    bulk_data: OnboardingBulkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission("can_manage_users", "can_manage_assignments")
    )
):
    """
    Bulk onboard multiple employees at once

    Requires: Manager or HR role with user/assignment management permissions
    """
    response = OnboardingBulkResponse(
        total_created=len(bulk_data.employees),
        successful=0,
        failed=0,
        errors=[]
    )

    for idx, employee_data in enumerate(bulk_data.employees):
        try:
            EmployeeOnboardingService.onboard_employee(
                db=db,
                onboarding_data=employee_data,
                created_by_id=current_user.id
            )
            response.successful += 1

        except Exception as e:
            response.failed += 1
            response.errors.append({
                "index": idx,
                "email": employee_data.email,
                "error": str(e)
            })

    return response


@router.get("/onboarded", response_model=List[EmployeeWithAssignments])
def get_onboarded_employees(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission("can_manage_users", "can_manage_assignments")
    )
):
    """
    Get list of employees onboarded by the current manager

    Requires: Manager or HR role
    """
    employees = EmployeeOnboardingService.get_onboarded_employees(
        db=db,
        manager_id=current_user.id,
        include_inactive=include_inactive
    )

    response = []
    for emp in employees:
        from sqlalchemy import and_
        from src.app.models.project_assignment import ProjectAssignment, AssignmentStatus

        assignments = db.query(ProjectAssignment).filter(
            ProjectAssignment.user_id == emp.id
        ).all()

        approved = len([a for a in assignments if a.status == AssignmentStatus.APPROVED])
        pending = len([a for a in assignments if a.status == AssignmentStatus.PENDING])

        response.append(EmployeeWithAssignments(
            id=emp.id,
            email=emp.email,
            full_name=emp.full_name,
            is_active=emp.is_active,
            role_id=emp.role_id,
            created_at=emp.created_at,
            total_projects=len(assignments),
            approved_projects=approved,
            pending_projects=pending
        ))

    return response


@router.get("/onboarding-status/{employee_id}")
def get_onboarding_status(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission("can_manage_users", "can_manage_assignments")
    )
):
    """
    Get onboarding status of a specific employee

    Returns: Assignment status, pending approvals, etc.
    """
    try:
        status = EmployeeOnboardingService.get_employee_onboarding_status(
            db=db,
            employee_id=employee_id
        )
        return status

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/complete-onboarding/{employee_id}")
def complete_employee_onboarding(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_any_permission("can_manage_users")
    )
):
    """
    Complete employee onboarding and activate account

    Requires: HR/Admin role with user management permissions
    """
    try:
        result = EmployeeOnboardingService.complete_onboarding(
            db=db,
            employee_id=employee_id,
            completed_by_id=current_user.id
        )
        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
