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
    ProjectStatusEnum
)
from src.app.services.project_service import ProjectService
from src.app.api.deps import get_current_user
from src.app.models.project import ProjectStatus

router = APIRouter()


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new project"""
    return ProjectService.create_project(
        db=db,
        creator_id=current_user.id,
        project_data=project_data
    )


@router.get("/", response_model=List[ProjectResponse])
def get_projects(
    status_filter: Optional[ProjectStatusEnum] = Query(None, alias="status", description="Filter by project status"),
    department: Optional[str] = Query(None, description="Filter by department"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all projects with optional status and department filters"""
    status_enum = ProjectStatus(status_filter.value) if status_filter else None
    return ProjectService.get_all_projects(
        db=db,
        status=status_enum,
        department=department,
        skip=skip,
        limit=limit
    )


@router.get("/my-created", response_model=List[ProjectResponse])
def get_my_created_projects(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get projects created by current user"""
    return ProjectService.get_created_projects(db=db, user_id=current_user.id)


@router.get("/my-supervised", response_model=List[ProjectResponse])
def get_my_supervised_projects(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get projects supervised by current user"""
    return ProjectService.get_supervised_projects(db=db, user_id=current_user.id)


@router.get("/search", response_model=List[ProjectResponse])
def search_projects(
    q: str = Query(..., min_length=2, description="Search query"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Search projects by name, code, or description"""
    return ProjectService.search_projects(db=db, query=q)


@router.get("/code/{code}", response_model=ProjectResponse)
def get_project_by_code(
    code: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get project by unique code"""
    return ProjectService.get_project_by_code(db=db, code=code)


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
    """Delete project (only creator)"""
    ProjectService.delete_project(
        db=db,
        project_id=project_id,
        user_id=current_user.id
    )
