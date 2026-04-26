"""
Role Service
"""

from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.app.models.role import Role
from src.app.models.user import User
from src.app.repositories.role_repository import RoleRepository
from src.app.schemas.role import RoleCreate, RoleUpdate


class RoleService:

    @staticmethod
    def get_all(db: Session) -> List[Role]:
        return RoleRepository.get_all(db)

    @staticmethod
    def get_or_404(db: Session, role_id: int) -> Role:
        role = RoleRepository.get_by_id(db, role_id)
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
        return role

    @staticmethod
    def create(db: Session, data: RoleCreate) -> Role:
        if RoleRepository.get_by_name(db, data.name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Role with name '{data.name}' already exists"
            )
        return RoleRepository.create(db, data)

    @staticmethod
    def update(db: Session, role_id: int, data: RoleUpdate) -> Role:
        role = RoleService.get_or_404(db, role_id)
        return RoleRepository.update(db, role, data)

    @staticmethod
    def delete(db: Session, role_id: int) -> None:
        role = RoleService.get_or_404(db, role_id)
        # Unassign users from this role before deleting
        for user in role.users:
            user.role_id = None
        db.commit()
        RoleRepository.delete(db, role)

    @staticmethod
    def assign_to_user(db: Session, user_id: int, role_id: int | None) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if role_id is not None:
            role = RoleRepository.get_by_id(db, role_id)
            if not role:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
        user.role_id = role_id
        db.commit()
        db.refresh(user)
        return user
