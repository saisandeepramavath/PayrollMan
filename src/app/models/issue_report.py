"""Issue report model for admin review workflows."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.app.db.base import Base


class IssueReport(Base):
    """Admin-manageable issue or warning reported by a user."""

    __tablename__ = "issue_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    timecard_id = Column(Integer, ForeignKey("timecards.id"), nullable=True, index=True)
    issue_type = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="open", index=True)
    priority = Column(String, nullable=False, default="medium", index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    week_start = Column(DateTime(timezone=True), nullable=True, index=True)
    notice_subject = Column(String, nullable=True)
    notice_message = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id], back_populates="issue_reports")
    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="submitted_issue_reports")
    resolver = relationship("User", foreign_keys=[resolved_by_id], back_populates="resolved_issue_reports")
    timecard = relationship("Timecard", back_populates="issue_reports")