"""
Timecard Tests
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime


def get_auth_token(client: TestClient) -> str:
    """Helper to get auth token"""
    # Register user
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpassword123",
            "full_name": "Test User"
        }
    )
    
    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "test@example.com",
            "password": "testpassword123"
        }
    )
    return response.json()["access_token"]


def test_create_timecard(client: TestClient):
    """Test creating a timecard"""
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/timecards/",
        json={
            "date": datetime.now().isoformat(),
            "hours_worked": 8.0,
            "description": "Test work",
            "project": "Test Project"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["hours_worked"] == 8.0
    assert data["description"] == "Test work"
    assert "id" in data


def test_get_timecards(client: TestClient):
    """Test getting user timecards"""
    token = get_auth_token(client)
    
    # Create timecard
    client.post(
        "/api/v1/timecards/",
        json={
            "date": datetime.now().isoformat(),
            "hours_worked": 8.0,
            "description": "Test work"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Get timecards
    response = client.get(
        "/api/v1/timecards/",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["hours_worked"] == 8.0


def test_create_timecard_unauthorized(client: TestClient):
    """Test creating timecard without auth"""
    response = client.post(
        "/api/v1/timecards/",
        json={
            "date": datetime.now().isoformat(),
            "hours_worked": 8.0,
            "description": "Test work"
        }
    )
    assert response.status_code == 401
