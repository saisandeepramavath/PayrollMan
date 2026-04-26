"""
Project Service - Business logic for projects
"""

from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from src.app.models.project import Project, ProjectStatus
from src.app.models.user import User
from src.app.schemas.project import ProjectCreate, ProjectUpdate, ProjectWithDetails
from src.app.repositories.project_repository import ProjectRepository
from src.app.services.tracking_service import TrackingService


class ProjectService:
    """Project business logic"""
    
    @staticmethod
    def create_project(
        db: Session,
        creator_id: int,
        project_data: ProjectCreate
    ) -> Project:
        """
        Create a new project
        
        Args:
            db: Database session
            creator_id: User ID creating the project
            project_data: Project creation data
            
        Returns:
            Created project
            
        Raises:
            HTTPException: If project code already exists
        """
        # Check if project code already exists
        existing_project = ProjectRepository.get_by_code(db=db, code=project_data.code)
        
        if existing_project:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Project with code '{project_data.code}' already exists"
            )
        
        # Validate supervisor exists if provided
        if project_data.supervisor_id:
            from src.app.repositories.user_repository import UserRepository
            supervisor = UserRepository.get_by_id(db=db, user_id=project_data.supervisor_id)
            if not supervisor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Supervisor not found"
                )
        
        # Create project
        project = ProjectRepository.create(
            db=db,
            creator_id=creator_id,
            name=project_data.name,
            code=project_data.code,
            description=project_data.description,
            department=project_data.department,
            company=project_data.company,
            supervisor_id=project_data.supervisor_id,
            status=project_data.status,
            start_date=project_data.start_date,
            end_date=project_data.end_date
        )

        if project_data.tracking_setup is not None:
            TrackingService.create_category(
                db=db,
                creator_id=creator_id,
                category_data=project_data.tracking_setup,
                project_id=project.id,
            )
            db.refresh(project)
        
        return project
    
    @staticmethod
    def get_all_projects(
        db: Session,
        status: Optional[ProjectStatus] = None,
        department: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Project]:
        """
        Get all projects with optional filters
        
        Args:
            db: Database session
            status: Optional status filter
            department: Optional department filter
            skip: Number of records to skip
            limit: Maximum records to return
            
        Returns:
            List of projects
        """
        return ProjectRepository.get_all(db=db, status=status, department=department, skip=skip, limit=limit)

    @staticmethod
    def get_all_projects_enriched(
        db: Session,
        status: Optional[ProjectStatus] = None,
        department: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[ProjectWithDetails]:
        """Get all projects with creator/supervisor names and assignment counts"""
        projects = ProjectRepository.get_all_with_details(
            db=db, status=status, department=department, skip=skip, limit=limit
        )
        project_ids = [p.id for p in projects]
        counts = ProjectRepository.get_assignment_counts(db, project_ids) if project_ids else {}

        result = []
        for p in projects:
            detail = ProjectWithDetails.model_validate(p)
            detail.creator_name = p.creator.full_name if p.creator else None
            detail.supervisor_name = p.supervisor.full_name if p.supervisor else None
            detail.assigned_users_count = counts.get(p.id, 0)
            result.append(detail)
        return result
    
    @staticmethod
    def get_project(db: Session, project_id: int) -> Project:
        """
        Get specific project
        
        Args:
            db: Database session
            project_id: Project ID
            
        Returns:
            Project
            
        Raises:
            HTTPException: If project not found
        """
        project = ProjectRepository.get_by_id_with_details(db=db, project_id=project_id)
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        return project
    
    @staticmethod
    def get_project_by_code(db: Session, code: str) -> Project:
        """
        Get project by unique code
        
        Args:
            db: Database session
            code: Project code
            
        Returns:
            Project
            
        Raises:
            HTTPException: If project not found
        """
        project = ProjectRepository.get_by_code(db=db, code=code)
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with code '{code}' not found"
            )
        
        return project
    
    @staticmethod
    def get_created_projects(db: Session, user_id: int) -> List[Project]:
        """
        Get projects created by a user
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            List of projects
        """
        return ProjectRepository.get_created_by_user(db=db, user_id=user_id)
    
    @staticmethod
    def get_supervised_projects(db: Session, user_id: int) -> List[Project]:
        """
        Get projects supervised by a user
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            List of projects
        """
        return ProjectRepository.get_supervised_by_user(db=db, user_id=user_id)
    
    @staticmethod
    def search_projects(db: Session, query: str) -> List[Project]:
        """
        Search projects by name, code, or description
        
        Args:
            db: Database session
            query: Search query
            
        Returns:
            List of matching projects
        """
        return ProjectRepository.search(db=db, query=query)
    
    @staticmethod
    def update_project(
        db: Session,
        project_id: int,
        user_id: int,
        project_data: ProjectUpdate
    ) -> Project:
        """
        Update project (only creator or supervisor can update)
        
        Args:
            db: Database session
            project_id: Project ID
            user_id: User requesting update
            project_data: Update data
            
        Returns:
            Updated project
            
        Raises:
            HTTPException: If project not found, unauthorized, or validation fails
        """
        # Get existing project
        project = ProjectRepository.get_by_id(db=db, project_id=project_id)
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Check permissions (creator, supervisor, or role with can_create_projects)
        is_project_lead = (
            project.creator_id == user_id or project.supervisor_id == user_id
        )
        if not is_project_lead:
            user = db.query(User).filter(User.id == user_id).first()
            has_role = user and (
                user.is_superuser
                or (user.role and user.role.can_create_projects)
            )
            if not has_role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only project creator, supervisor, or a manager can update the project"
                )
        
        # Check code conflict if code is being changed
        if project_data.code and project_data.code != project.code:
            existing_project = ProjectRepository.get_by_code(db=db, code=project_data.code)
            if existing_project:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Project with code '{project_data.code}' already exists"
                )
        
        # Validate supervisor if being changed
        if project_data.supervisor_id and project_data.supervisor_id != project.supervisor_id:
            from src.app.repositories.user_repository import UserRepository
            supervisor = UserRepository.get_by_id(db=db, user_id=project_data.supervisor_id)
            if not supervisor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Supervisor not found"
                )
        
        # Update project
        update_data = project_data.model_dump(exclude_unset=True)
        updated_project = ProjectRepository.update(db=db, project=project, **update_data)
        
        return updated_project
    
    @staticmethod
    def delete_project(db: Session, project_id: int, user_id: int) -> None:
        """
        Archive project (only creator can delete).

        Historical timecards and time allocations must remain intact, so this
        operation marks the project as cancelled instead of physically deleting it.
        
        Args:
            db: Database session
            project_id: Project ID
            user_id: User requesting deletion
            
        Raises:
            HTTPException: If project not found or unauthorized
        """
        project = ProjectRepository.get_by_id(db=db, project_id=project_id)
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Only creator or manager can delete
        is_creator = project.creator_id == user_id
        user = db.query(User).filter(User.id == user_id).first()
        is_manager = user and (
            user.is_superuser or
            (user.role and user.role.can_create_projects)
        )
        if not is_creator and not is_manager:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project creator or a manager can delete the project"
            )

        if project.status == ProjectStatus.CANCELLED:
            return

        archive_end_date = project.end_date or datetime.now(timezone.utc).replace(tzinfo=None)
        ProjectRepository.update(
            db=db,
            project=project,
            status=ProjectStatus.CANCELLED,
            end_date=archive_end_date,
        )
    
    @staticmethod
    def can_user_manage_project(db: Session, project_id: int, user_id: int) -> bool:
        """
        Check if user can manage project (creator or supervisor)
        
        Args:
            db: Database session
            project_id: Project ID
            user_id: User ID
            
        Returns:
            True if user can manage project
        """
        project = ProjectRepository.get_by_id(db=db, project_id=project_id)
        
        if not project:
            return False
        
        return project.creator_id == user_id or project.supervisor_id == user_id
