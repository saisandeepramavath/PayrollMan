#!/usr/bin/env python3
"""
Initialize database with tables
"""

from src.app.db.init_db import init_db

if __name__ == "__main__":
    print("Creating database tables...")
    init_db()
    print("✓ Database initialized successfully!")
