"""
Database initialization
"""

# Import all models to register them with Base metadata
from src.app.models import (
    Role,
    User,
    Timecard,
    Project,
    ProjectAssignment,
    PunchEntry,
    TimeAllocation,
    UserWorkRule,
    TrackingCategory,
    TrackingCode,
    TrackingRule,
    IssueReport,
    TimecardSubmission,
)

from src.app.db.base import Base
from src.app.db.session import engine


def init_db() -> None:
    """
    Initialize database - create all tables
    """
    Base.metadata.create_all(bind=engine)
