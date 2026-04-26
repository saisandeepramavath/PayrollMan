"""Tracking configuration endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.app.api.deps import get_current_user, require_permission
from src.app.db.session import get_db
from src.app.schemas.tracking import TrackingCategoryCreate, TrackingCategoryResponse, TrackingCategoryUpdate
from src.app.services.tracking_service import TrackingService

router = APIRouter()


@router.post("/categories", response_model=TrackingCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_tracking_category(
    category_data: TrackingCategoryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("can_create_projects")),
):
    return TrackingService.create_category(db=db, creator_id=current_user.id, category_data=category_data)


@router.get("/categories", response_model=list[TrackingCategoryResponse])
def list_tracking_categories(
    project_id: Optional[int] = Query(None),
    company: Optional[str] = Query(None),
    assigned_only: bool = Query(False),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # When filtering by assignment, use the provided user_id (for managers)
    # or fall back to the current user
    target_user_id = user_id if user_id is not None else current_user.id
    return TrackingService.list_categories(
        db=db, project_id=project_id, company=company,
        assigned_only=assigned_only, user_id=target_user_id,
    )


@router.get("/categories/{category_id}", response_model=TrackingCategoryResponse)
def get_tracking_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return TrackingService.get_category(db=db, category_id=category_id)


@router.put("/categories/{category_id}", response_model=TrackingCategoryResponse)
def update_tracking_category(
    category_id: int,
    category_data: TrackingCategoryUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("can_create_projects")),
):
    return TrackingService.update_category(db=db, category_id=category_id, category_data=category_data)