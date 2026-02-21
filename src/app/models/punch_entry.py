"""
PunchEntry database model - tracks daily punch in/out entries
"""

from sqlalchemy import Column, Integer, DateTime, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.app.db.base import Base


class PunchEntry(Base):
    """Punch Entry model - tracks when user punches in/out during the day"""
    
    __tablename__ = "punch_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    punch_in = Column(DateTime(timezone=True), nullable=False)
    punch_out = Column(DateTime(timezone=True))
    notes = Column(Text)  # Optional notes for this punch entry (e.g., "lunch break", "meeting")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="punch_entries")
