"""
ProjectAssignment Repository - Data access layer for ProjectAssignment model
"""

from typing import List, Optional
from sqlalchemy.orm import Session, joinedload

from src.app.models.project_assignment import ProjectAssignment, AssignmentStatus
from src.app.models.project import Project


class ProjectAssignmentRepository:
    """Project Assignment data access repository"""
    
    @staticmethod
    def get_by_id(db: Session, assignment_id: int) -> Optional[ProjectAssignment]:
        """Get assignment by ID"""
        return db.query(ProjectAssignment).filter(
            ProjectAssignment.id == assignment_id
        ).first()
    
    @staticmethod
    def get_by_id_with_details(db: Session, assignment_id: int) -> Optional[ProjectAssignment]:
        """Get assignment with user and project details"""
        return db.query(ProjectAssignment).options(
            joinedload(ProjectAssignment.user),
            joinedload(ProjectAssignment.project),
            joinedload(ProjectAssignment.assigner),
            joinedload(ProjectAssignment.approver)
        ).filter(ProjectAssignment.id == assignment_id).first()
    
    @staticmethod
    def get_by_user_and_project(
        db: Session,
        user_id: int,
        project_id: int
    ) -> Optional[ProjectAssignment]:
        """Get assignment by user and project"""
        return db.query(ProjectAssignment).filter(
            ProjectAssignment.user_id == user_id,
            ProjectAssignment.project_id == project_id
        ).first()
    
    @staticmethod
    def get_user_assignments(
        db: Session,
        user_id: int,
        status: Optional[AssignmentStatus] = None
    ) -> List[ProjectAssignment]:
        """Get all assignments for a user"""
        query = db.query(ProjectAssignment).options(
            joinedload(ProjectAssignment.project)
        ).filter(ProjectAssignment.user_id == user_id)
        
        if status:
            query = query.filter(ProjectAssignment.status == status)
        
        return query.order_by(ProjectAssignment.created_at.desc()).all()
    
    @staticmethod
    def get_project_assignments(
        db: Session,
        project_id: int,
        status: Optional[AssignmentStatus] = None
    ) -> List[ProjectAssignment]:
        """Get all assignments for a project"""
        query = db.query(ProjectAssignment).options(
            joinedload(ProjectAssignment.user)
        ).filter(ProjectAssignment.project_id == project_id)
        
        if status:
            query = query.filter(ProjectAssignment.status == status)
        
        return query.order_by(ProjectAssignment.created_at.desc()).all()
    
    @staticmethod
    def get_pending_approvals(db: Session, approver_id: int, all_projects: bool = False) -> List[ProjectAssignment]:
        """Get pending assignments for approval (project supervisor/creator, or all for managers)"""
        query = db.query(ProjectAssignment).options(
            joinedload(ProjectAssignment.user),
            joinedload(ProjectAssignment.project),
            joinedload(ProjectAssignment.assigner)
        ).filter(
            ProjectAssignment.status == AssignmentStatus.PENDING
        )
        if not all_projects:
            query = query.join(
                ProjectAssignment.project
            ).filter(
                (Project.supervisor_id == approver_id) | (Project.creator_id == approver_id)
            )
        return query.order_by(ProjectAssignment.created_at).all()
    
    @staticmethod
    def get_assigned_by_user(db: Session, assigner_id: int) -> List[ProjectAssignment]:
        """Get assignments created by a user"""
        return db.query(ProjectAssignment).options(
            joinedload(ProjectAssignment.user),
            joinedload(ProjectAssignment.project)
        ).filter(
            ProjectAssignment.assigner_id == assigner_id
        ).order_by(ProjectAssignment.created_at.desc()).all()
    
    @staticmethod
    def create(
        db: Session,
        project_id: int,
        user_id: int,
        assigner_id: int,
        role: Optional[str] = None,
        notes: Optional[str] = None
    ) -> ProjectAssignment:
        """Create a new project assignment"""
        assignment = ProjectAssignment(
            project_id=project_id,
            user_id=user_id,
            assigner_id=assigner_id,
            role=role,
            notes=notes,
            status=AssignmentStatus.PENDING
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return assignment
    
    @staticmethod
    def update(
        db: Session,
        assignment: ProjectAssignment,
        **kwargs
    ) -> ProjectAssignment:
        """Update assignment"""
        for key, value in kwargs.items():
            if value is not None and hasattr(assignment, key):
                setattr(assignment, key, value)
        
        db.commit()
        db.refresh(assignment)
        return assignment
    
    @staticmethod
    def approve(
        db: Session,
        assignment: ProjectAssignment,
        approver_id: int,
        notes: Optional[str] = None
    ) -> ProjectAssignment:
        """Approve assignment"""
        from datetime import datetime
        
        assignment.status = AssignmentStatus.APPROVED
        assignment.approved_by_id = approver_id
        assignment.approved_at = datetime.utcnow()
        
        if notes:
            assignment.notes = notes if not assignment.notes else f"{assignment.notes}\n{notes}"
        
        db.commit()
        db.refresh(assignment)
        return assignment
    
    @staticmethod
    def reject(
        db: Session,
        assignment: ProjectAssignment,
        approver_id: int,
        notes: Optional[str] = None
    ) -> ProjectAssignment:
        """Reject assignment"""
        from datetime import datetime
        
        assignment.status = AssignmentStatus.REJECTED
        assignment.approved_by_id = approver_id
        assignment.approved_at = datetime.utcnow()
        
        if notes:
            assignment.notes = notes if not assignment.notes else f"{assignment.notes}\n{notes}"
        
        db.commit()
        db.refresh(assignment)
        return assignment
    
    @staticmethod
    def revoke(db: Session, assignment: ProjectAssignment) -> ProjectAssignment:
        """Revoke assignment"""
        assignment.status = AssignmentStatus.REVOKED
        db.commit()
        db.refresh(assignment)
        return assignment
    
    @staticmethod
    def delete(db: Session, assignment: ProjectAssignment) -> None:
        """Delete assignment"""
        db.delete(assignment)
        db.commit()
