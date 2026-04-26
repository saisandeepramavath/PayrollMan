"""Tracking rule model."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.app.db.base import Base


class TrackingRule(Base):
    """Configurable automation and visibility rule for a tracking category."""

    __tablename__ = "tracking_rules"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("tracking_categories.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    scope_type = Column(String(50), nullable=False, default="all_users")
    scope_value = Column(String(255))
    condition_type = Column(String(100), nullable=False)
    condition_value = Column(Text)
    action_type = Column(String(100), nullable=False)
    action_value = Column(Text)
    priority = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("TrackingCategory", back_populates="rules")