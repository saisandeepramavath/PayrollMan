"""
Project Service - Business logic for projects
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from src.app.models.project import Project, ProjectStatus
from src.app.schemas.project import ProjectCreate, ProjectUpdate
from src.app.repositories.project_repository import ProjectRepository


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
        
        # Check permissions (only creator or supervisor can update)
        if project.creator_id != user_id and project.supervisor_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project creator or supervisor can update the project"
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
        Delete project (only creator can delete)
        
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
        
        # Only creator can delete
        if project.creator_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project creator can delete the project"
            )
        
        ProjectRepository.delete(db=db, project=project)
    
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
