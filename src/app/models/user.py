"""
User database model
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.app.db.base import Base


class User(Base):
    """User model"""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    timecards = relationship("Timecard", back_populates="user", cascade="all, delete-orphan")
    punch_entries = relationship("PunchEntry", back_populates="user", cascade="all, delete-orphan")
    created_projects = relationship("Project", foreign_keys="Project.creator_id", back_populates="creator")
    supervised_projects = relationship("Project", foreign_keys="Project.supervisor_id", back_populates="supervisor")
    project_assignments = relationship("ProjectAssignment", foreign_keys="ProjectAssignment.user_id", back_populates="user")
    assigned_projects = relationship("ProjectAssignment", foreign_keys="ProjectAssignment.assigner_id", back_populates="assigner")
    approved_assignments = relationship("ProjectAssignment", foreign_keys="ProjectAssignment.approved_by_id", back_populates="approver")
    time_allocations = relationship("TimeAllocation", back_populates="user", cascade="all, delete-orphan")
