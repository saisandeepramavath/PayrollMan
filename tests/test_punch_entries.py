"""
Punch Entry Tests
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, date, time


def get_auth_token(client: TestClient, email: str = "test@example.com") -> str:
    """Helper to get auth token"""
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "testpassword123",
            "full_name": "Test User"
        }
    )
    
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "testpassword123"
        }
    )
    return response.json()["access_token"]


def test_punch_in_success(client: TestClient):
    """Test successful punch in"""
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/punch/in",
        json={
            "notes": "Starting work"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["punch_in"] is not None
    assert data["punch_out"] is None
    assert data["notes"] == "Starting work"


def test_punch_in_already_active(client: TestClient):
    """Test punch in when already punched in"""
    token = get_auth_token(client)
    
    # First punch in
    client.post(
        "/api/v1/punch/in",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Try to punch in again
    response = client.post(
        "/api/v1/punch/in",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 400
    assert "already have an active punch entry" in response.json()["detail"]


def test_punch_out_success(client: TestClient):
    """Test successful punch out"""
    token = get_auth_token(client)
    
    # Punch in first
    client.post(
        "/api/v1/punch/in",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Punch out
    response = client.post(
        "/api/v1/punch/out",
        json={
            "notes": "Ending work"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["punch_in"] is not None
    assert data["punch_out"] is not None
    assert data["notes"] == "Ending work"


def test_punch_out_no_active_entry(client: TestClient):
    """Test punch out without active entry"""
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/punch/out",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 404
    assert "No active punch entry" in response.json()["detail"]


def test_get_active_punch_entry(client: TestClient):
    """Test getting active punch entry"""
    token = get_auth_token(client)
    
    # Punch in
    client.post(
        "/api/v1/punch/in",
        json={"notes": "Working"},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Get active entry
    response = client.get(
        "/api/v1/punch/active",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["punch_in"] is not None
    assert data["punch_out"] is None


def test_get_active_punch_entry_none(client: TestClient):
    """Test getting active punch entry when none exists"""
    token = get_auth_token(client)
    
    response = client.get(
        "/api/v1/punch/active",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    assert response.json() is None


def test_create_punch_entry_manual(client: TestClient):
    """Test creating a punch entry manually"""
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/punch/",
        json={
            "date": str(date.today()),
            "punch_in": f"{date.today()}T09:00:00",
            "punch_out": f"{date.today()}T17:00:00",
            "notes": "Full day work"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert "09:00:00" in data["punch_in"]
    assert "17:00:00" in data["punch_out"]
    assert data["notes"] == "Full day work"


def test_get_punch_entries(client: TestClient):
    """Test getting user punch entries"""
    token = get_auth_token(client)
    
    # Create multiple entries
    client.post(
        "/api/v1/punch/",
        json={
            "date": str(date.today()),
            "punch_in": f"{date.today()}T09:00:00",
            "punch_out": f"{date.today()}T12:00:00",
            "notes": "Morning"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    client.post(
        "/api/v1/punch/",
        json={
            "date": str(date.today()),
            "punch_in": f"{date.today()}T13:00:00",
            "punch_out": f"{date.today()}T17:00:00",
            "notes": "Afternoon"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Get entries
    response = client.get(
        "/api/v1/punch/",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_get_punch_entries_by_date(client: TestClient):
    """Test getting punch entries by date"""
    token = get_auth_token(client)
    
    # Create entry
    client.post(
        "/api/v1/punch/",
        json={
            "date": str(date.today()),
            "punch_in": f"{date.today()}T09:00:00",
            "punch_out": f"{date.today()}T17:00:00"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Get entries by date
    response = client.get(
        f"/api/v1/punch/?start_date={date.today()}&end_date={date.today()}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


def test_get_daily_hours(client: TestClient):
    """Test getting daily hours calculation"""
    token = get_auth_token(client)
    
    # Create multiple entries for the day
    client.post(
        "/api/v1/punch/",
        json={
            "date": str(date.today()),
            "punch_in": f"{date.today()}T09:00:00",
            "punch_out": f"{date.today()}T12:00:00"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    client.post(
        "/api/v1/punch/",
        json={
            "date": str(date.today()),
            "punch_in": f"{date.today()}T13:00:00",
            "punch_out": f"{date.today()}T17:00:00"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Get daily hours (3 + 4 = 7 hours)
    response = client.get(
        f"/api/v1/punch/hours/{date.today()}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == str(date.today())
    assert data["total_hours"] == 7.0


def test_update_punch_entry(client: TestClient):
    """Test updating a punch entry"""
    token = get_auth_token(client)
    
    # Create entry
    create_response = client.post(
        "/api/v1/punch/",
        json={
            "date": str(date.today()),
            "punch_in": f"{date.today()}T09:00:00",
            "punch_out": f"{date.today()}T17:00:00"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    entry_id = create_response.json()["id"]
    
    # Update entry
    response = client.put(
        f"/api/v1/punch/{entry_id}",
        json={
            "notes": "Updated notes"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["notes"] == "Updated notes"


def test_delete_punch_entry(client: TestClient):
    """Test deleting a punch entry"""
    token = get_auth_token(client)
    
    # Create entry
    create_response = client.post(
        "/api/v1/punch/",
        json={
            "date": str(date.today()),
            "punch_in": f"{date.today()}T09:00:00",
            "punch_out": f"{date.today()}T17:00:00"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    entry_id = create_response.json()["id"]
    
    # Delete entry
    response = client.delete(
        f"/api/v1/punch/{entry_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 204
    
    # Verify deletion
    get_response = client.get(
        f"/api/v1/punch/{entry_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert get_response.status_code == 404


def test_punch_entry_unauthorized(client: TestClient):
    """Test accessing punch entries without authentication"""
    response = client.get("/api/v1/punch/")
    assert response.status_code == 401
