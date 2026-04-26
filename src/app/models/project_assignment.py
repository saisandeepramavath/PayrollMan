"""
ProjectAssignment database model - manages project access with approval
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from src.app.db.base import Base


class AssignmentStatus(str, enum.Enum):
    """Assignment status enum"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVOKED = "revoked"


class ProjectAssignment(Base):
    """Project Assignment model - links users to projects with approval workflow"""
    
    __tablename__ = "project_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Employee assigned
    assigner_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who assigned/requested
    
    # Approval workflow
    status = Column(SQLEnum(AssignmentStatus), default=AssignmentStatus.PENDING, nullable=False, index=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"))  # Who approved/rejected
    approved_at = Column(DateTime(timezone=True))
    
    # Details
    role = Column(String(100))  # Role in the project (e.g., "Developer", "Designer")
    notes = Column(Text)  # Additional notes about the assignment
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="assignments")
    user = relationship("User", foreign_keys=[user_id], back_populates="project_assignments")
    assigner = relationship("User", foreign_keys=[assigner_id], back_populates="assigned_projects")
    approver = relationship("User", foreign_keys=[approved_by_id], back_populates="approved_assignments")

    # ── Computed properties for Pydantic serialisation ──
    @property
    def user_name(self) -> str | None:
        return self.user.full_name if self.user else None

    @property
    def user_email(self) -> str | None:
        return self.user.email if self.user else None

    @property
    def assigner_name(self) -> str | None:
        return self.assigner.full_name if self.assigner else None

    @property
    def approver_name(self) -> str | None:
        return self.approver.full_name if self.approver else None

    @property
    def project_name(self) -> str | None:
        return self.project.name if self.project else None

    @property
    def project_code(self) -> str | None:
        return self.project.code if self.project else None
