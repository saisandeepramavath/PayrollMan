"""Tracking code model."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.app.db.base import Base


class TrackingCode(Base):
    """Child code inside a tracking category."""

    __tablename__ = "tracking_codes"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("tracking_categories.id"), nullable=False, index=True)
    label = Column(String(255), nullable=False)
    code = Column(String(100), nullable=False, index=True)
    description = Column(Text)
    entry_type = Column(String(50), nullable=False, default="work")
    labor_category = Column(String(100))
    extra_fields = Column(JSON)
    default_work_location = Column(String(50))
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("TrackingCategory", back_populates="codes")