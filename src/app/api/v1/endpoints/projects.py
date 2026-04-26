"""
Project Endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from src.app.db.session import get_db
from src.app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectWithDetails,
    ProjectStatusEnum
)
from src.app.services.project_service import ProjectService
from src.app.api.deps import get_current_user, require_permission
from src.app.models.project import ProjectStatus

router = APIRouter()


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("can_create_projects"))
):
    """Create a new project (requires can_create_projects permission)"""
    return ProjectService.create_project(
        db=db,
        creator_id=current_user.id,
        project_data=project_data
    )


@router.get("/", response_model=List[ProjectWithDetails])
def get_projects(
    status: Optional[ProjectStatusEnum] = Query(None, description="Filter by status (active/completed/on_hold/cancelled)"),
    department: Optional[str] = Query(None, description="Filter by department"),
    code: Optional[str] = Query(None, description="Get project by code"),
    created_by_me: bool = Query(False, description="Show only projects I created"),
    supervised_by_me: bool = Query(False, description="Show only projects I supervise"),
    search: Optional[str] = Query(None, min_length=2, description="Search by name, code, or description"),
    skip: int = Query(0, ge=0, description="Skip N records (pagination)"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get projects with flexible filtering options.
    
    **Examples:**
    - All projects: `GET /projects/`
    - Active projects: `GET /projects/?status=active`
    - My created projects: `GET /projects/?created_by_me=true`
    - Search: `GET /projects/?search=timecard`
    - By code: `GET /projects/?code=TMS`
    - My supervised active: `GET /projects/?supervised_by_me=true&status=active`
    """
    # Handle code lookup first (most specific)
    if code:
        project = ProjectService.get_project_by_code(db=db, code=code)
        return [project] if project else []
    
    # Handle search
    if search:
        return ProjectService.search_projects(db=db, query=search)
    
    # Handle role filters
    if created_by_me:
        return ProjectService.get_created_projects(db=db, user_id=current_user.id)
    
    if supervised_by_me:
        return ProjectService.get_supervised_projects(db=db, user_id=current_user.id)
    
    # Default: all projects with optional filters
    status_enum = ProjectStatus(status.value) if status else None
    return ProjectService.get_all_projects_enriched(
        db=db,
        status=status_enum,
        department=department,
        skip=skip,
        limit=limit
    )


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get specific project details"""
    return ProjectService.get_project(db=db, project_id=project_id)


@router.patch("/{project_id}/status", response_model=ProjectResponse)
def update_project_status(
    project_id: int,
    status_data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update project status"""
    new_status = ProjectStatus(status_data["status"])
    project_update = ProjectUpdate(status=ProjectStatusEnum(new_status.value))
    return ProjectService.update_project(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        project_data=project_update
    )


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update project (only creator or supervisor)"""
    return ProjectService.update_project(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        project_data=project_data
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Archive project (only creator). Historical time tracking is preserved."""
    ProjectService.delete_project(
        db=db,
        project_id=project_id,
        user_id=current_user.id
    )
