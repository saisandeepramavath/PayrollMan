"""
Roles Endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from src.app.db.session import get_db
from src.app.schemas.role import RoleCreate, RoleUpdate, RoleResponse
from src.app.schemas.user import UserResponse
from src.app.services.role_service import RoleService
from src.app.api.deps import get_current_user, require_superuser

router = APIRouter()


class AssignRoleRequest(BaseModel):
    role_id: Optional[int] = None


@router.get("/", response_model=List[RoleResponse])
def list_roles(
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    """List all roles (any authenticated user can view)"""
    return RoleService.get_all(db)


@router.post("/", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    data: RoleCreate,
    db: Session = Depends(get_db),
    _=Depends(require_superuser)
):
    """Create a custom role (superuser only)"""
    return RoleService.create(db, data)


@router.put("/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_superuser)
):
    """Update a role's name or feature toggles (superuser only)"""
    return RoleService.update(db, role_id, data)


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_superuser)
):
    """Delete a role and unassign all users (superuser only)"""
    RoleService.delete(db, role_id)


@router.put("/users/{user_id}/role", response_model=UserResponse)
def assign_user_role(
    user_id: int,
    body: AssignRoleRequest,
    db: Session = Depends(get_db),
    _=Depends(require_superuser)
):
    """Assign or remove a role from a user (superuser only). Set role_id to null to remove."""
    return RoleService.assign_to_user(db, user_id, body.role_id)
