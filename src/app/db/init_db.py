"""
Database initialization
"""

from src.app.db.base import Base
from src.app.db.session import engine


def init_db() -> None:
    """
    Initialize database - create all tables
    """
    Base.metadata.create_all(bind=engine)
