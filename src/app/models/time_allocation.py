"""
TimeAllocation database model - split daily hours across projects
"""

from sqlalchemy import Column, Integer, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.app.db.base import Base


class TimeAllocation(Base):
    """Time Allocation model - how user split their daily hours across projects"""
    
    __tablename__ = "time_allocations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    hours = Column(Float, nullable=False)  # Hours allocated to this project on this day
    description = Column(Text)  # What work was done
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="time_allocations")
    project = relationship("Project", back_populates="time_allocations")
    
    @property
    def project_name(self) -> str:
        """Get project name from relationship"""
        return self.project.name if self.project else ""
    
    @property
    def project_code(self) -> str:
        """Get project code from relationship"""
        return self.project.code if self.project else ""
