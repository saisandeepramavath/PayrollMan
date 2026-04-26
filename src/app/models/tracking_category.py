"""Tracking category model."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.app.db.base import Base


class TrackingCategory(Base):
    """Parent grouping for tracking codes shown on timecards."""

    __tablename__ = "tracking_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    company = Column(String(255), index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    project = relationship("Project", back_populates="tracking_categories")
    creator = relationship("User", back_populates="tracking_categories")
    codes = relationship("TrackingCode", back_populates="category", cascade="all, delete-orphan")
    rules = relationship("TrackingRule", back_populates="category", cascade="all, delete-orphan")