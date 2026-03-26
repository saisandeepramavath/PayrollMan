"""
Pytest Configuration and Fixtures
"""

import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.app.main import app
from src.app.db.base import Base
from src.app.db.session import get_db

# Test database URL - use in-memory SQLite for faster tests
TEST_DATABASE_URL = "sqlite:///:memory:"

# Test engine and session - use StaticPool to reuse same connection
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)

# Create all tables once
Base.metadata.create_all(bind=test_engine)

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db() -> Generator:
    """Create test database session"""
    connection = test_engine.connect()
    transaction = connection.begin()
    db = TestSessionLocal(bind=connection)
    
    try:
        yield db
    finally:
        db.close()
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def client(db) -> Generator:
    """Create test client"""
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
