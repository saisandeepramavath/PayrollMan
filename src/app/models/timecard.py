"""
Timecard database model
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.app.db.base import Base


class Timecard(Base):
    """Timecard model"""
    
    __tablename__ = "timecards"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False)
    hours_worked = Column(Float, nullable=False)
    description = Column(String)
    cost_center = Column(String, index=True)
    work_location = Column(String)
    entry_type = Column(String)
    labor_category = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="timecards")
    project = relationship("Project", back_populates="timecards")
    issue_reports = relationship("IssueReport", back_populates="timecard")
