"""
Project Assignment Endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from src.app.db.session import get_db
from src.app.schemas.project_assignment import (
    ProjectAssignmentCreate,
    ProjectAssignmentUpdate,
    ProjectAssignmentResponse,
    ProjectAssignmentWithDetails,
    AssignmentApprovalRequest,
    AssignmentStatusEnum
)
from src.app.services.project_assignment_service import ProjectAssignmentService
from src.app.api.deps import get_current_user
from src.app.models.project_assignment import AssignmentStatus

router = APIRouter()


@router.post("/", response_model=ProjectAssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(
    assignment_data: ProjectAssignmentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new project assignment request"""
    return ProjectAssignmentService.create_assignment(
        db=db,
        assigner_id=current_user.id,
        assignment_data=assignment_data
    )


@router.get("/", response_model=List[ProjectAssignmentResponse])
def get_my_assignments(
    status_filter: Optional[AssignmentStatusEnum] = Query(None, alias="status", description="Filter by assignment status"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all assignments for current user"""
    status_enum = AssignmentStatus(status_filter.value) if status_filter else None
    return ProjectAssignmentService.get_user_assignments(
        db=db,
        user_id=current_user.id,
        status=status_enum
    )


@router.get("/pending", response_model=List[ProjectAssignmentWithDetails])
def get_pending_approvals(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get assignments pending approval for projects I manage"""
    return ProjectAssignmentService.get_pending_approvals(
        db=db,
        user_id=current_user.id
    )


@router.get("/project/{project_id}", response_model=List[ProjectAssignmentResponse])
def get_project_assignments(
    project_id: int,
    status_filter: Optional[AssignmentStatusEnum] = Query(None, alias="status", description="Filter by assignment status"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all assignments for a specific project"""
    status_enum = AssignmentStatus(status_filter.value) if status_filter else None
    return ProjectAssignmentService.get_project_assignments(
        db=db,
        project_id=project_id,
        status=status_enum
    )


@router.get("/{assignment_id}", response_model=ProjectAssignmentWithDetails)
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get specific assignment details"""
    return ProjectAssignmentService.get_assignment(
        db=db,
        assignment_id=assignment_id
    )


@router.put("/{assignment_id}/approve", response_model=ProjectAssignmentResponse)
def approve_assignment(
    assignment_id: int,
    request: AssignmentApprovalRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Approve an assignment (only project creator or supervisor)"""
    return ProjectAssignmentService.approve_assignment(
        db=db,
        assignment_id=assignment_id,
        approver_id=current_user.id,
        notes=request.notes
    )


@router.put("/{assignment_id}/reject", response_model=ProjectAssignmentResponse)
def reject_assignment(
    assignment_id: int,
    request: AssignmentApprovalRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Reject an assignment (only project creator or supervisor)"""
    return ProjectAssignmentService.reject_assignment(
        db=db,
        assignment_id=assignment_id,
        approver_id=current_user.id,
        notes=request.notes
    )


@router.put("/{assignment_id}/revoke", response_model=ProjectAssignmentResponse)
def revoke_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Revoke an approved assignment"""
    return ProjectAssignmentService.revoke_assignment(
        db=db,
        assignment_id=assignment_id,
        user_id=current_user.id
    )


@router.put("/{assignment_id}", response_model=ProjectAssignmentResponse)
def update_assignment(
    assignment_id: int,
    assignment_data: ProjectAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update assignment details"""
    return ProjectAssignmentService.update_assignment(
        db=db,
        assignment_id=assignment_id,
        user_id=current_user.id,
        assignment_data=assignment_data
    )


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete assignment"""
    ProjectAssignmentService.delete_assignment(
        db=db,
        assignment_id=assignment_id,
        user_id=current_user.id
    )
    return None
