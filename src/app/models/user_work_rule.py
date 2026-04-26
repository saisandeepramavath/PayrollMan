"""
User work rules model.
"""

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.app.db.base import Base


class UserWorkRule(Base):
    """Admin-defined work rules for a specific user."""

    __tablename__ = "user_work_rules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    target_weekly_hours = Column(Float, nullable=True)
    max_weekly_hours = Column(Float, nullable=True)
    max_daily_hours = Column(Float, nullable=True)
    effective_from = Column(Date, nullable=False, index=True)
    priority = Column(Integer, nullable=False, default=0, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="work_rules")