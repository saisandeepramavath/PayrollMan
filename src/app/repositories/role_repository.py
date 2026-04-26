"""
Role Repository
"""

from typing import List, Optional
from sqlalchemy.orm import Session

from src.app.models.role import Role
from src.app.schemas.role import RoleCreate, RoleUpdate


class RoleRepository:

    @staticmethod
    def get_all(db: Session) -> List[Role]:
        return db.query(Role).order_by(Role.display_name).all()

    @staticmethod
    def get_by_id(db: Session, role_id: int) -> Optional[Role]:
        return db.query(Role).filter(Role.id == role_id).first()

    @staticmethod
    def get_by_name(db: Session, name: str) -> Optional[Role]:
        return db.query(Role).filter(Role.name == name).first()

    @staticmethod
    def create(db: Session, data: RoleCreate) -> Role:
        role = Role(**data.model_dump())
        db.add(role)
        db.commit()
        db.refresh(role)
        return role

    @staticmethod
    def update(db: Session, role: Role, data: RoleUpdate) -> Role:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(role, field, value)
        db.commit()
        db.refresh(role)
        return role

    @staticmethod
    def delete(db: Session, role: Role) -> None:
        db.delete(role)
        db.commit()
