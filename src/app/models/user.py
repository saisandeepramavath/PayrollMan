"""
User database model
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Date, Text
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
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    personal_email = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    office_phone = Column(String, nullable=True)
    personal_phone = Column(String, nullable=True)
    additional_details = Column(Text, nullable=True)
    
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True, index=True)
    onboarded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    role = relationship("Role", back_populates="users")
    timecards = relationship("Timecard", back_populates="user", cascade="all, delete-orphan")
    punch_entries = relationship("PunchEntry", back_populates="user", cascade="all, delete-orphan")
    created_projects = relationship("Project", foreign_keys="Project.creator_id", back_populates="creator")
    supervised_projects = relationship("Project", foreign_keys="Project.supervisor_id", back_populates="supervisor")
    project_assignments = relationship("ProjectAssignment", foreign_keys="ProjectAssignment.user_id", back_populates="user")
    assigned_projects = relationship("ProjectAssignment", foreign_keys="ProjectAssignment.assigner_id", back_populates="assigner")
    approved_assignments = relationship("ProjectAssignment", foreign_keys="ProjectAssignment.approved_by_id", back_populates="approver")
    time_allocations = relationship("TimeAllocation", back_populates="user", cascade="all, delete-orphan")
    work_rules = relationship("UserWorkRule", back_populates="user", cascade="all, delete-orphan")
    tracking_categories = relationship("TrackingCategory", back_populates="creator")
    issue_reports = relationship("IssueReport", foreign_keys="IssueReport.user_id", back_populates="user")
    submitted_issue_reports = relationship("IssueReport", foreign_keys="IssueReport.reporter_id", back_populates="reporter")
    resolved_issue_reports = relationship("IssueReport", foreign_keys="IssueReport.resolved_by_id", back_populates="resolver")
    timecard_submissions = relationship("TimecardSubmission", foreign_keys="TimecardSubmission.user_id", back_populates="user")
    reviewed_timecard_submissions = relationship("TimecardSubmission", foreign_keys="TimecardSubmission.reviewer_id", back_populates="reviewer")
    onboarded_by_user = relationship("User", remote_side=[id], back_populates="onboarded_employees")
    onboarded_employees = relationship("User", back_populates="onboarded_by_user", foreign_keys=[onboarded_by_id])

