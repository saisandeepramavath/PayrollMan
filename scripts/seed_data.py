#!/usr/bin/env python3
"""
Seed database with sample data
"""

from sqlalchemy.orm import Session
from src.app.db.session import SessionLocal
from src.app.models.user import User
from src.app.core.security import hash_password

def seed_data():
    """Seed database with sample data"""
    db: Session = SessionLocal()
    
    try:
        # Check if data already exists
        existing_user = db.query(User).first()
        if existing_user:
            print("Database already has data. Skipping seed.")
            return
        
        # Create sample users
        users = [
            User(
                email="admin@example.com",
                hashed_password=hash_password("admin123"),
                full_name="Admin User",
                is_active=True,
                is_superuser=True,
            ),
            User(
                email="user@example.com",
                hashed_password=hash_password("user123"),
                full_name="Regular User",
                is_active=True,
                is_superuser=False,
            ),
        ]
        
        for user in users:
            db.add(user)
        
        db.commit()
        print("✓ Database seeded successfully!")
        print("\nSample accounts:")
        print("  Admin: admin@example.com / admin123")
        print("  User: user@example.com / user123")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding database...")
    seed_data()
