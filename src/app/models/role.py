"""
Role database model
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.app.db.base import Base


class Role(Base):
    """Custom role with feature permission toggles"""

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)         # e.g. "project_manager"
    display_name = Column(String, nullable=False)                           # e.g. "Project Manager"

    # ── Feature toggles ──────────────────────────────────────────────────
    can_create_projects = Column(Boolean, default=False, nullable=False)
    can_manage_assignments = Column(Boolean, default=False, nullable=False)
    can_view_all_timecards = Column(Boolean, default=False, nullable=False)
    can_manage_users = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    users = relationship("User", back_populates="role")
