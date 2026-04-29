"""
Project database model
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from src.app.db.base import Base


class ProjectStatus(str, enum.Enum):
    """Project status enum"""
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Project(Base):
    """Project model with rich metadata"""
    
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)  # Unique project code
    sub_code = Column(String(100))  # Sub-category (e.g., "technical-development", "reporting", "infrastructure")
    description = Column(Text)
    
    # Organizational details
    department = Column(String(255))
    company = Column(String(255))
    
    # People involved
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who created the project
    supervisor_id = Column(Integer, ForeignKey("users.id"))  # Project supervisor
    
    # Status
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.ACTIVE, nullable=False)
    
    # Assignment workflow
    requires_approval = Column(Boolean, default=True, nullable=False)  # Whether joining needs approval
    
    # Timestamps
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", foreign_keys=[creator_id], back_populates="created_projects")
    supervisor = relationship("User", foreign_keys=[supervisor_id], back_populates="supervised_projects")
    assignments = relationship("ProjectAssignment", back_populates="project", cascade="all, delete-orphan")
    time_allocations = relationship("TimeAllocation", back_populates="project", cascade="all, delete-orphan")
    timecards = relationship("Timecard", back_populates="project")
    tracking_categories = relationship("TrackingCategory", back_populates="project")
