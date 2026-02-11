"""
Authentication Service - Business logic for authentication
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from src.app.models.user import User
from src.app.schemas.user import UserCreate
from src.app.schemas.auth import LoginRequest
from src.app.core.security import hash_password, verify_password, create_access_token
from src.app.repositories.user_repository import UserRepository


class AuthService:
    """Authentication business logic"""
    
    @staticmethod
    def register_user(db: Session, user_data: UserCreate) -> User:
        """
        Register a new user
        
        Args:
            db: Database session
            user_data: User registration data
            
        Returns:
            Created user
            
        Raises:
            HTTPException: If email already exists
        """
        # Check if user exists
        existing_user = UserRepository.get_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user using repository
        user = UserRepository.create(
            db=db,
            email=user_data.email,
            hashed_password=hash_password(user_data.password),
            full_name=user_data.full_name
        )
        
        return user
    
    @staticmethod
    def authenticate_user(db: Session, credentials: LoginRequest) -> str:
        """
        Authenticate user and return token
        
        Args:
            db: Database session
            credentials: Login credentials
            
        Returns:
            JWT access token
            
        Raises:
            HTTPException: If authentication fails
        """
        # Find user using repository
        user = UserRepository.get_by_email(db, credentials.email)
        
        if not user or not verify_password(credentials.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return access_token
    
    @staticmethod
    def get_current_user(db: Session, user_id: int) -> User:
        """
        Get current user by ID
        
        Args:
            db: Database session
            user_id: User ID from token
            
        Returns:
            User object
            
        Raises:
            HTTPException: If user not found or inactive
        """
        user = UserRepository.get_by_id(db, user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        return user
