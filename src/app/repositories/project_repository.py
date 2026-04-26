"""
Project Repository - Data access layer for Project model
"""

from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func

from src.app.models.project import Project, ProjectStatus
from src.app.models.project_assignment import ProjectAssignment, AssignmentStatus


class ProjectRepository:
    """Project data access repository"""
    
    @staticmethod
    def get_by_id(db: Session, project_id: int) -> Optional[Project]:
        """Get project by ID"""
        return db.query(Project).filter(Project.id == project_id).first()
    
    @staticmethod
    def get_by_id_with_details(db: Session, project_id: int) -> Optional[Project]:
        """Get project by ID with creator and supervisor details"""
        return db.query(Project).options(
            joinedload(Project.creator),
            joinedload(Project.supervisor)
        ).filter(Project.id == project_id).first()
    
    @staticmethod
    def get_by_code(db: Session, code: str) -> Optional[Project]:
        """Get project by code"""
        return db.query(Project).filter(Project.code == code.upper()).first()
    
    @staticmethod
    def get_all(
        db: Session,
        status: Optional[ProjectStatus] = None,
        department: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Project]:
        """Get all projects with optional status and department filters"""
        query = db.query(Project)
        
        if status:
            query = query.filter(Project.status == status)
        
        if department:
            query = query.filter(Project.department == department)
        
        return query.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_created_by_user(db: Session, user_id: int) -> List[Project]:
        """Get projects created by a specific user"""
        return db.query(Project).filter(
            Project.creator_id == user_id
        ).order_by(Project.created_at.desc()).all()
    
    @staticmethod
    def get_supervised_by_user(db: Session, user_id: int) -> List[Project]:
        """Get projects supervised by a specific user"""
        return db.query(Project).filter(
            Project.supervisor_id == user_id
        ).order_by(Project.created_at.desc()).all()
    
    @staticmethod
    def get_by_department(db: Session, department: str) -> List[Project]:
        """Get projects by department"""
        return db.query(Project).filter(
            Project.department == department
        ).order_by(Project.name).all()
    
    @staticmethod
    def get_by_company(db: Session, company: str) -> List[Project]:
        """Get projects by company"""
        return db.query(Project).filter(
            Project.company == company
        ).order_by(Project.name).all()
    
    @staticmethod
    def get_all_with_details(
        db: Session,
        status: Optional[ProjectStatus] = None,
        department: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Project]:
        """Get all projects with creator/supervisor eagerly loaded"""
        query = db.query(Project).options(
            joinedload(Project.creator),
            joinedload(Project.supervisor),
        )

        if status:
            query = query.filter(Project.status == status)

        if department:
            query = query.filter(Project.department == department)

        return query.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_assignment_counts(db: Session, project_ids: List[int]) -> dict[int, int]:
        """Get approved assignment counts for a list of projects"""
        rows = (
            db.query(ProjectAssignment.project_id, func.count(ProjectAssignment.id))
            .filter(
                ProjectAssignment.project_id.in_(project_ids),
                ProjectAssignment.status == AssignmentStatus.APPROVED,
            )
            .group_by(ProjectAssignment.project_id)
            .all()
        )
        return {pid: cnt for pid, cnt in rows}

    @staticmethod
    def search(db: Session, query: str) -> List[Project]:
        """Search projects by name, code, or description"""
        search_term = f"%{query}%"
        return db.query(Project).filter(
            or_(
                Project.name.ilike(search_term),
                Project.code.ilike(search_term),
                Project.description.ilike(search_term)
            )
        ).order_by(Project.name).all()
    
    @staticmethod
    def create(
        db: Session,
        creator_id: int,
        name: str,
        code: str,
        description: Optional[str] = None,
        department: Optional[str] = None,
        company: Optional[str] = None,
        supervisor_id: Optional[int] = None,
        status: ProjectStatus = ProjectStatus.ACTIVE,
        **kwargs
    ) -> Project:
        """Create a new project"""
        project = Project(
            creator_id=creator_id,
            name=name,
            code=code.upper(),
            description=description,
            department=department,
            company=company,
            supervisor_id=supervisor_id,
            status=status,
            **kwargs
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return project
    
    @staticmethod
    def update(db: Session, project: Project, **kwargs) -> Project:
        """Update project"""
        for key, value in kwargs.items():
            if value is not None and hasattr(project, key):
                if key == 'code':
                    value = value.upper()
                setattr(project, key, value)
        
        db.commit()
        db.refresh(project)
        return project
    
    @staticmethod
    def delete(db: Session, project: Project) -> None:
        """Delete project"""
        db.delete(project)
        db.commit()
