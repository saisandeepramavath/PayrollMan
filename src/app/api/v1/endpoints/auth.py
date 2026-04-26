"""
Authentication Endpoints
"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.app.db.session import get_db
from src.app.schemas.user import UserCreate, UserResponse
from src.app.schemas.auth import LoginRequest, TokenResponse
from src.app.services.auth_service import AuthService
from src.app.api.deps import get_current_user, require_any_permission
from src.app.repositories.user_repository import UserRepository

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    user = AuthService.register_user(db, user_data)
    return user


@router.post("/login", response_model=TokenResponse)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login user and return access token"""
    access_token = AuthService.authenticate_user(db, credentials)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user = Depends(get_current_user)
):
    """Get current user information"""
    return current_user


@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user = Depends(require_any_permission("can_manage_assignments", "can_create_projects", "can_manage_users"))
):
    """List all active users (requires assignment, project, or user management permission)"""
    return UserRepository.get_all_active(db)
