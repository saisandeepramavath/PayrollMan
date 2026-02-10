"""
User Repository - Data access layer for User model
"""

from typing import Optional
from sqlalchemy.orm import Session

from src.app.models.user import User


class UserRepository:
    """User data access repository"""
    
    @staticmethod
    def get_by_id(db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def create(db: Session, email: str, hashed_password: str, full_name: str) -> User:
        """Create a new user"""
        user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def update(db: Session, user: User) -> User:
        """Update user"""
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def delete(db: Session, user: User) -> None:
        """Delete user"""
        db.delete(user)
        db.commit()
