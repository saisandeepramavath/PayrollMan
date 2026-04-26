"""
Timecard Tests
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, timezone

from src.app.core.security import hash_password
from src.app.models.punch_entry import PunchEntry
from src.app.models.timecard_submission import TimecardSubmission
from src.app.models.user import User


def get_auth_token(client: TestClient) -> str:
    """Helper to get auth token"""
    return register_and_login(client, "test@example.com", "testpassword123", "Test User")


def register_and_login(client: TestClient, email: str, password: str, full_name: str) -> str:
    """Register and log in a user."""
    # Register user
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": full_name,
        }
    )
    
    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
        }
    )
    return response.json()["access_token"]


def get_manager_token(client: TestClient, db) -> str:
    """Create a superuser directly and log in."""
    manager = User(
        email="manager@example.com",
        hashed_password=hash_password("managerpass123"),
        full_name="Manager User",
        is_active=True,
        is_superuser=True,
    )
    db.add(manager)
    db.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "manager@example.com",
            "password": "managerpass123",
        },
    )
    return response.json()["access_token"]


def get_current_week_start() -> datetime:
    now = datetime.now(timezone.utc)
    monday = now - timedelta(days=now.weekday())
    return datetime(monday.year, monday.month, monday.day, tzinfo=timezone.utc)


def test_create_timecard(client: TestClient):
    """Test creating a timecard"""
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/timecards/",
        json={
            "date": datetime.now().isoformat(),
            "hours_worked": 8.0,
            "description": "Test work",
            "cost_center": "General Business",
            "entry_type": "work",
            "work_location": "on_site",
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["hours_worked"] == 8.0
    assert data["description"] == "Test work"
    assert data["cost_center"] == "General Business"
    assert data["entry_type"] == "work"
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


def test_create_timecard_requires_project_or_cost_center(client: TestClient):
    """Test creating a timecard without a project or cost center"""
    token = get_auth_token(client)

    response = client.post(
        "/api/v1/timecards/",
        json={
            "date": datetime.now().isoformat(),
            "hours_worked": 4.0,
            "description": "Missing reference",
        },
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 422


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


def test_submit_clean_week_auto_approves_after_delay(client: TestClient, db):
    token = get_auth_token(client)
    week_start = get_current_week_start()

    create_response = client.post(
        "/api/v1/timecards/",
        json={
            "date": week_start.isoformat(),
            "hours_worked": 8.0,
            "description": "Weekly work",
            "cost_center": "GENERAL",
            "entry_type": "work",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 201

    submit_response = client.post(
        "/api/v1/timecards/submissions/submit",
        json={"week_start": week_start.isoformat()},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert submit_response.status_code == 200
    assert submit_response.json()["status"] == "submitted"

    submission = db.query(TimecardSubmission).first()
    submission.auto_approve_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    db.commit()

    get_response = client.get(
        "/api/v1/timecards/submissions/week",
        params={"week_start": week_start.isoformat()},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_response.status_code == 200
    assert get_response.json()["status"] == "approved"


def test_submit_week_with_punch_mismatch_goes_on_hold(client: TestClient, db):
    token = get_auth_token(client)
    week_start = get_current_week_start()
    current_user = db.query(User).filter(User.email == "test@example.com").first()

    create_response = client.post(
        "/api/v1/timecards/",
        json={
            "date": week_start.isoformat(),
            "hours_worked": 8.0,
            "description": "Mismatch work",
            "cost_center": "GENERAL",
            "entry_type": "work",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 201

    db.add(
        PunchEntry(
            user_id=current_user.id,
            date=week_start.date(),
            punch_in=week_start.replace(hour=9),
            punch_out=week_start.replace(hour=15),
            notes="Office",
        )
    )
    db.commit()

    submit_response = client.post(
        "/api/v1/timecards/submissions/submit",
        json={"week_start": week_start.isoformat()},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert submit_response.status_code == 200
    assert submit_response.json()["status"] == "on_hold"
    assert submit_response.json()["unresolved_issue_count"] >= 1


def test_manager_can_approve_submitted_week(client: TestClient, db):
    token = get_auth_token(client)
    manager_token = get_manager_token(client, db)
    week_start = get_current_week_start()

    create_response = client.post(
        "/api/v1/timecards/",
        json={
            "date": week_start.isoformat(),
            "hours_worked": 8.0,
            "description": "Approval work",
            "cost_center": "GENERAL",
            "entry_type": "work",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 201

    submit_response = client.post(
        "/api/v1/timecards/submissions/submit",
        json={"week_start": week_start.isoformat()},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert submit_response.status_code == 200
    submission_id = submit_response.json()["id"]

    review_response = client.post(
        f"/api/v1/timecards/submissions/{submission_id}/review",
        json={"action": "approve", "review_notes": "Looks good."},
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert review_response.status_code == 200
    assert review_response.json()["status"] == "approved"
    assert review_response.json()["review_notes"] == "Looks good."
