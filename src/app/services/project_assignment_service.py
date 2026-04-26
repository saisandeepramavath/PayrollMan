"""
ProjectAssignment Service - Business logic for project assignments
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime

from src.app.models.project_assignment import ProjectAssignment, AssignmentStatus
from src.app.models.user import User
from src.app.schemas.project_assignment import (
    ProjectAssignmentCreate,
    ProjectAssignmentUpdate,
    AssignmentStatusEnum
)
from src.app.repositories.project_assignment_repository import ProjectAssignmentRepository
from src.app.repositories.project_repository import ProjectRepository
from src.app.repositories.timecard_repository import TimecardRepository


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
        
        # Check if project exists and is assignable (active or on_hold)
        from src.app.models.project import ProjectStatus
        if project.status == ProjectStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign users to a cancelled project"
            )

        # Permission check: self-assignment (request to join) is allowed for
        # all authenticated users.  Assigning *another* user requires either
        # can_manage_assignments, being the project creator, or supervisor.
        if assignment_data.user_id != assigner_id:
            assigner = db.query(User).filter(User.id == assigner_id).first()
            is_project_lead = (
                project.creator_id == assigner_id
                or project.supervisor_id == assigner_id
            )
            has_role_permission = assigner and (
                assigner.is_superuser
                or (assigner.role and assigner.role.can_manage_assignments)
            )
            if not is_project_lead and not has_role_permission:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to assign other users to projects"
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
            else:
                # REJECTED or REVOKED — reopen as a fresh pending request
                existing_assignment.status = AssignmentStatus.PENDING
                existing_assignment.assigner_id = assigner_id
                existing_assignment.approved_by_id = None
                existing_assignment.approved_at = None
                if assignment_data.role is not None:
                    existing_assignment.role = assignment_data.role
                if assignment_data.notes is not None:
                    existing_assignment.notes = assignment_data.notes
                # Auto-approve if project doesn't require approval
                if not project.requires_approval:
                    existing_assignment.status = AssignmentStatus.APPROVED
                    existing_assignment.approved_by_id = assigner_id
                    existing_assignment.approved_at = datetime.utcnow()
                db.commit()
                db.refresh(existing_assignment)
                return existing_assignment

        # Create assignment
        assignment = ProjectAssignmentRepository.create(
            db=db,
            project_id=assignment_data.project_id,
            user_id=assignment_data.user_id,
            assigner_id=assigner_id,
            role=assignment_data.role,
            notes=assignment_data.notes
        )

        # Auto-approve if project doesn't require approval
        if not project.requires_approval:
            ProjectAssignmentRepository.approve(
                db=db,
                assignment=assignment,
                approver_id=assigner_id
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
        
        assignments = ProjectAssignmentRepository.get_project_assignments(
            db=db,
            project_id=project_id,
            status=status
        )
        for assignment in assignments:
            assignment.assigned_since = assignment.created_at
            assignment.total_project_hours_since_assigned = TimecardRepository.get_total_project_hours_since(
                db=db,
                user_id=assignment.user_id,
                project_id=project_id,
                start_date=assignment.created_at,
            )
        return assignments
    
    @staticmethod
    def get_pending_approvals(db: Session, user_id: int) -> List[ProjectAssignment]:
        """
        Get assignments pending approval for projects user manages.
        Managers with can_manage_assignments see ALL pending requests.
        """
        user = db.query(User).filter(User.id == user_id).first()
        all_projects = user is not None and (
            user.is_superuser or
            (user.role and user.role.can_manage_assignments)
        )
        return ProjectAssignmentRepository.get_pending_approvals(
            db=db, approver_id=user_id, all_projects=all_projects
        )
    
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
        
        # Check permissions (creator, supervisor, or manager with can_manage_assignments)
        project = assignment.project
        is_project_lead = project.creator_id == approver_id or project.supervisor_id == approver_id
        approver = db.query(User).filter(User.id == approver_id).first()
        is_manager = approver and (
            approver.is_superuser or
            (approver.role and approver.role.can_manage_assignments)
        )
        if not is_project_lead and not is_manager:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project creator, supervisor, or a manager can approve assignments"
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
        
        # Check permissions (creator, supervisor, or manager with can_manage_assignments)
        project = assignment.project
        is_project_lead = project.creator_id == approver_id or project.supervisor_id == approver_id
        approver = db.query(User).filter(User.id == approver_id).first()
        is_manager = approver and (
            approver.is_superuser or
            (approver.role and approver.role.can_manage_assignments)
        )
        if not is_project_lead and not is_manager:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project creator, supervisor, or a manager can reject assignments"
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
        
        # Check permissions (assigner, creator, supervisor, or manager)
        project = assignment.project
        is_project_lead = (
            assignment.assigner_id == user_id or
            project.creator_id == user_id or
            project.supervisor_id == user_id
        )
        revoker = db.query(User).filter(User.id == user_id).first()
        is_manager = revoker and (
            revoker.is_superuser or
            (revoker.role and revoker.role.can_manage_assignments)
        )
        if not is_project_lead and not is_manager:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only assigner, project creator, supervisor, or a manager can revoke assignments"
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
        
        # Check permissions (assigner, creator, supervisor, or role with can_manage_assignments)
        project = assignment.project
        is_authorized = (
            assignment.assigner_id == user_id
            or project.creator_id == user_id
            or project.supervisor_id == user_id
        )
        if not is_authorized:
            updater = db.query(User).filter(User.id == user_id).first()
            is_manager = updater and (
                updater.is_superuser
                or (updater.role and updater.role.can_manage_assignments)
            )
            if not is_manager:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only assigner, project creator, supervisor, or a manager can update assignments"
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
        is_project_lead = (
            assignment.assigner_id == user_id or
            project.creator_id == user_id or
            project.supervisor_id == user_id
        )
        deleter = db.query(User).filter(User.id == user_id).first()
        is_manager = deleter and (
            deleter.is_superuser or
            (deleter.role and deleter.role.can_manage_assignments)
        )
        if not is_project_lead and not is_manager:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only assigner, project creator, supervisor, or a manager can delete assignments"
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
