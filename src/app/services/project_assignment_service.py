"""
ProjectAssignment Service - Business logic for project assignments
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime

from src.app.models.project_assignment import ProjectAssignment, AssignmentStatus
from src.app.schemas.project_assignment import (
    ProjectAssignmentCreate,
    ProjectAssignmentUpdate,
    AssignmentStatusEnum
)
from src.app.repositories.project_assignment_repository import ProjectAssignmentRepository
from src.app.repositories.project_repository import ProjectRepository


class ProjectAssignmentService:
    """Project Assignment business logic"""
    
    @staticmethod
    def create_assignment(
        db: Session,
        assigner_id: int,
        assignment_data: ProjectAssignmentCreate
    ) -> ProjectAssignment:
        """
        Create a new project assignment request
        
        Args:
            db: Database session
            assigner_id: User creating the assignment (can be self-assignment)
            assignment_data: Assignment creation data
            
        Returns:
            Created assignment with PENDING status
            
        Raises:
            HTTPException: If project not found or user already assigned
        """
        # Verify project exists
        project = ProjectRepository.get_by_id(db=db, project_id=assignment_data.project_id)
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Check if project is active
        from src.app.models.project import ProjectStatus
        if project.status != ProjectStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign users to non-active projects"
            )
        
        # Verify user exists
        from src.app.repositories.user_repository import UserRepository
        user = UserRepository.get_by_id(db=db, user_id=assignment_data.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if user is already assigned to this project
        existing_assignment = ProjectAssignmentRepository.get_by_user_and_project(
            db=db,
            user_id=assignment_data.user_id,
            project_id=assignment_data.project_id
        )
        
        if existing_assignment:
            if existing_assignment.status == AssignmentStatus.APPROVED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User is already assigned to this project"
                )
            elif existing_assignment.status == AssignmentStatus.PENDING:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assignment request is already pending approval"
                )
        
        # Create assignment
        assignment = ProjectAssignmentRepository.create(
            db=db,
            project_id=assignment_data.project_id,
            user_id=assignment_data.user_id,
            assigner_id=assigner_id,
            role=assignment_data.role,
            notes=assignment_data.notes
        )
        
        return assignment
    
    @staticmethod
    def get_user_assignments(
        db: Session,
        user_id: int,
        status: Optional[AssignmentStatus] = None
    ) -> List[ProjectAssignment]:
        """
        Get all assignments for a user
        
        Args:
            db: Database session
            user_id: User ID
            status: Optional status filter
            
        Returns:
            List of assignments
        """
        return ProjectAssignmentRepository.get_user_assignments(
            db=db,
            user_id=user_id,
            status=status
        )
    
    @staticmethod
    def get_project_assignments(
        db: Session,
        project_id: int,
        status: Optional[AssignmentStatus] = None
    ) -> List[ProjectAssignment]:
        """
        Get all assignments for a project
        
        Args:
            db: Database session
            project_id: Project ID
            status: Optional status filter
            
        Returns:
            List of assignments
        """
        # Verify project exists
        project = ProjectRepository.get_by_id(db=db, project_id=project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        return ProjectAssignmentRepository.get_project_assignments(
            db=db,
            project_id=project_id,
            status=status
        )
    
    @staticmethod
    def get_pending_approvals(db: Session, user_id: int) -> List[ProjectAssignment]:
        """
        Get assignments pending approval for projects user manages
        
        Args:
            db: Database session
            user_id: User ID (supervisor or creator)
            
        Returns:
            List of pending assignments
        """
        return ProjectAssignmentRepository.get_pending_approvals(db=db, approver_id=user_id)
    
    @staticmethod
    def get_assignment(db: Session, assignment_id: int) -> ProjectAssignment:
        """
        Get specific assignment
        
        Args:
            db: Database session
            assignment_id: Assignment ID
            
        Returns:
            Assignment with details
            
        Raises:
            HTTPException: If assignment not found
        """
        assignment = ProjectAssignmentRepository.get_by_id_with_details(
            db=db,
            assignment_id=assignment_id
        )
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        return assignment
    
    @staticmethod
    def approve_assignment(
        db: Session,
        assignment_id: int,
        approver_id: int,
        notes: Optional[str] = None
    ) -> ProjectAssignment:
        """
        Approve an assignment (only project creator or supervisor can approve)
        
        Args:
            db: Database session
            assignment_id: Assignment ID
            approver_id: User approving the assignment
            notes: Optional approval notes
            
        Returns:
            Approved assignment
            
        Raises:
            HTTPException: If assignment not found, unauthorized, or not pending
        """
        # Get assignment
        assignment = ProjectAssignmentRepository.get_by_id_with_details(
            db=db,
            assignment_id=assignment_id
        )
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # Check if assignment is pending
        if assignment.status != AssignmentStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve assignment with status: {assignment.status}"
            )
        
        # Check permissions (creator or supervisor)
        project = assignment.project
        if project.creator_id != approver_id and project.supervisor_id != approver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project creator or supervisor can approve assignments"
            )
        
        # Approve assignment
        approved_assignment = ProjectAssignmentRepository.approve(
            db=db,
            assignment=assignment,
            approver_id=approver_id,
            notes=notes
        )
        
        return approved_assignment
    
    @staticmethod
    def reject_assignment(
        db: Session,
        assignment_id: int,
        approver_id: int,
        notes: Optional[str] = None
    ) -> ProjectAssignment:
        """
        Reject an assignment (only project creator or supervisor can reject)
        
        Args:
            db: Database session
            assignment_id: Assignment ID
            approver_id: User rejecting the assignment
            notes: Optional rejection reason
            
        Returns:
            Rejected assignment
            
        Raises:
            HTTPException: If assignment not found, unauthorized, or not pending
        """
        # Get assignment
        assignment = ProjectAssignmentRepository.get_by_id_with_details(
            db=db,
            assignment_id=assignment_id
        )
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # Check if assignment is pending
        if assignment.status != AssignmentStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reject assignment with status: {assignment.status}"
            )
        
        # Check permissions (creator or supervisor)
        project = assignment.project
        if project.creator_id != approver_id and project.supervisor_id != approver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project creator or supervisor can reject assignments"
            )
        
        # Reject assignment
        rejected_assignment = ProjectAssignmentRepository.reject(
            db=db,
            assignment=assignment,
            approver_id=approver_id,
            notes=notes
        )
        
        return rejected_assignment
    
    @staticmethod
    def revoke_assignment(
        db: Session,
        assignment_id: int,
        user_id: int
    ) -> ProjectAssignment:
        """
        Revoke an approved assignment (by assigner or project manager)
        
        Args:
            db: Database session
            assignment_id: Assignment ID
            user_id: User revoking the assignment
            
        Returns:
            Revoked assignment
            
        Raises:
            HTTPException: If assignment not found or unauthorized
        """
        # Get assignment
        assignment = ProjectAssignmentRepository.get_by_id_with_details(
            db=db,
            assignment_id=assignment_id
        )
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # Check if assignment can be revoked
        if assignment.status not in [AssignmentStatus.APPROVED, AssignmentStatus.PENDING]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot revoke assignment with status: {assignment.status}"
            )
        
        # Check permissions (assigner, creator, or supervisor)
        project = assignment.project
        if (assignment.assigner_id != user_id and 
            project.creator_id != user_id and 
            project.supervisor_id != user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only assigner, project creator, or supervisor can revoke assignments"
            )
        
        # Revoke assignment
        revoked_assignment = ProjectAssignmentRepository.revoke(db=db, assignment=assignment)
        
        return revoked_assignment
    
    @staticmethod
    def update_assignment(
        db: Session,
        assignment_id: int,
        user_id: int,
        assignment_data: ProjectAssignmentUpdate
    ) -> ProjectAssignment:
        """
        Update assignment details (only assigner or project manager)
        
        Args:
            db: Database session
            assignment_id: Assignment ID
            user_id: User updating the assignment
            assignment_data: Update data
            
        Returns:
            Updated assignment
            
        Raises:
            HTTPException: If assignment not found or unauthorized
        """
        # Get assignment
        assignment = ProjectAssignmentRepository.get_by_id_with_details(
            db=db,
            assignment_id=assignment_id
        )
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # Check permissions
        project = assignment.project
        if (assignment.assigner_id != user_id and 
            project.creator_id != user_id and 
            project.supervisor_id != user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only assigner, project creator, or supervisor can update assignments"
            )
        
        # Update assignment
        update_data = assignment_data.model_dump(exclude_unset=True)
        updated_assignment = ProjectAssignmentRepository.update(
            db=db,
            assignment=assignment,
            **update_data
        )
        
        return updated_assignment
    
    @staticmethod
    def delete_assignment(
        db: Session,
        assignment_id: int,
        user_id: int
    ) -> None:
        """
        Delete assignment (only if pending or by project manager)
        
        Args:
            db: Database session
            assignment_id: Assignment ID
            user_id: User deleting the assignment
            
        Raises:
            HTTPException: If assignment not found or unauthorized
        """
        # Get assignment
        assignment = ProjectAssignmentRepository.get_by_id_with_details(
            db=db,
            assignment_id=assignment_id
        )
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assignment not found"
            )
        
        # Check permissions
        project = assignment.project
        if (assignment.assigner_id != user_id and 
            project.creator_id != user_id and 
            project.supervisor_id != user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only assigner, project creator, or supervisor can delete assignments"
            )
        
        ProjectAssignmentRepository.delete(db=db, assignment=assignment)
    
    @staticmethod
    def is_user_assigned_to_project(
        db: Session,
        user_id: int,
        project_id: int
    ) -> bool:
        """
        Check if user has approved assignment to project
        
        Args:
            db: Database session
            user_id: User ID
            project_id: Project ID
            
        Returns:
            True if user has approved assignment
        """
        assignment = ProjectAssignmentRepository.get_by_user_and_project(
            db=db,
            user_id=user_id,
            project_id=project_id
        )
        
        return assignment is not None and assignment.status == AssignmentStatus.APPROVED
