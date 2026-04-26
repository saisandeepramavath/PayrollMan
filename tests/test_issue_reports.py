"""Issue report visibility tests."""

from fastapi.testclient import TestClient

from src.app.core.security import hash_password
from src.app.models.issue_report import IssueReport
from src.app.models.user import User


def register_and_login(client: TestClient, email: str, password: str, full_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": full_name,
        },
    )
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )
    return response.json()["access_token"]


def test_regular_user_sees_alerts_raised_about_them(client: TestClient, db):
    token = register_and_login(client, "worker@example.com", "workerpass123", "Worker User")
    other_token = register_and_login(client, "other@example.com", "otherpass123", "Other User")
    assert other_token

    worker = db.query(User).filter(User.email == "worker@example.com").first()
    other = db.query(User).filter(User.email == "other@example.com").first()
    manager = User(
        email="manager-alerts@example.com",
        hashed_password=hash_password("managerpass123"),
        full_name="Manager Alerts",
        is_active=True,
        is_superuser=True,
    )
    db.add(manager)
    db.commit()
    db.refresh(manager)

    db.add_all(
        [
            IssueReport(
                user_id=worker.id,
                reporter_id=manager.id,
                issue_type="timecard",
                status="open",
                priority="high",
                title="Worker issue",
                description="Needs correction",
            ),
            IssueReport(
                user_id=other.id,
                reporter_id=manager.id,
                issue_type="timecard",
                status="open",
                priority="medium",
                title="Other user issue",
                description="Should stay hidden",
            ),
        ]
    )
    db.commit()

    response = client.get(
        "/api/v1/issues/",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["title"] == "Worker issue"
