"""
API Dependencies
"""

from typing import Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from src.app.db.session import get_db
from src.app.models.user import User
from src.app.core.security import decode_access_token
from src.app.services.auth_service import AuthService

# Bearer token scheme for Swagger UI
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from Bearer token
    
    Args:
        credentials: HTTP Authorization credentials
        db: Database session
        
    Returns:
        Current user
        
    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Delegate to service layer
    user = AuthService.get_current_user(db, int(user_id))
    return user


def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that requires the current user to be a superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required"
        )
    return current_user


def require_permission(permission: str) -> Callable:
    """
    Factory that returns a FastAPI dependency checking a role permission.

    Superusers always pass. Regular users need a role with the given flag set to True.

    Usage::

        @router.post("/", dependencies=[Depends(require_permission("can_create_projects"))])
    """
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_superuser:
            return current_user
        role = current_user.role
        if role is None or not getattr(role, permission, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: your role does not have '{permission}'"
            )
        return current_user
    return checker


def require_any_permission(*permissions: str) -> Callable:
    """
    Factory that returns a FastAPI dependency requiring at least ONE of the
    listed role permissions.

    Superusers always pass.

    Usage::

        @router.get("/users", dependencies=[Depends(require_any_permission("can_manage_assignments", "can_create_projects"))])
    """
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_superuser:
            return current_user
        role = current_user.role
        if role is None or not any(getattr(role, p, False) for p in permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: insufficient role permissions"
            )
        return current_user
    return checker

