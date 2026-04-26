"""Weekly timecard submission model."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.app.db.base import Base


class TimecardSubmission(Base):
    """Tracks weekly timecard submission and approval state for a user."""

    __tablename__ = "timecard_submissions"
    __table_args__ = (
        UniqueConstraint("user_id", "week_start", name="uq_timecard_submission_user_week"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    week_start = Column(DateTime(timezone=True), nullable=False, index=True)
    week_end = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(32), nullable=False, default="draft", index=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    auto_approve_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    review_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id], back_populates="timecard_submissions")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviewed_timecard_submissions")