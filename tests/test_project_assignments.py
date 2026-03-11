"""
Project Assignment Tests
"""

import pytest
from fastapi.testclient import TestClient


def setup_users_and_project(client: TestClient):
    """Helper to set up users and project for testing"""
    # Create manager/creator
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "manager@example.com",
            "password": "testpassword123",
            "full_name": "Manager User"
        }
    )
    manager_login = client.post(
        "/api/v1/auth/login",
        json={"email": "manager@example.com", "password": "testpassword123"}
    )
    manager_token = manager_login.json()["access_token"]
    manager_info = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    manager_id = manager_info.json()["id"]
    
    # Create employee
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "employee@example.com",
            "password": "testpassword123",
            "full_name": "Employee User"
        }
    )
    employee_login = client.post(
        "/api/v1/auth/login",
        json={"email": "employee@example.com", "password": "testpassword123"}
    )
    employee_token = employee_login.json()["access_token"]
    employee_info = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    employee_id = employee_info.json()["id"]
    
    # Create project
    project_response = client.post(
        "/api/v1/projects/",
        json={
            "name": "Test Project",
            "code": "TEST001",
            "status": "active",
            "supervisor_id": manager_id
        },
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    project_id = project_response.json()["id"]
    
    return {
        "manager_token": manager_token,
        "manager_id": manager_id,
        "employee_token": employee_token,
        "employee_id": employee_id,
        "project_id": project_id
    }


def test_create_assignment(client: TestClient):
    """Test creating a project assignment"""
    setup = setup_users_and_project(client)
    
    response = client.post(
        "/api/v1/project-assignments/",
        json={
            "project_id": setup["project_id"],
            "user_id": setup["employee_id"],
            "role": "Developer",
            "notes": "New team member"
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["project_id"] == setup["project_id"]
    assert data["user_id"] == setup["employee_id"]
    assert data["status"] == "pending"
    assert data["role"] == "Developer"


def test_create_assignment_duplicate(client: TestClient):
    """Test creating duplicate assignment"""
    setup = setup_users_and_project(client)
    
    # First assignment
    client.post(
        "/api/v1/project-assignments/",
        json={
            "project_id": setup["project_id"],
            "user_id": setup["employee_id"]
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    # Duplicate assignment
    response = client.post(
        "/api/v1/project-assignments/",
        json={
            "project_id": setup["project_id"],
            "user_id": setup["employee_id"]
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    assert response.status_code == 400
    assert "already" in response.json()["detail"].lower()


def test_get_assignments(client: TestClient):
    """Test getting all assignments for current user"""
    setup = setup_users_and_project(client)
    
    # Create assignment from manager to employee
    client.post(
        "/api/v1/project-assignments/",
        json={
            "project_id": setup["project_id"],
            "user_id": setup["employee_id"]
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    # Get assignments for employee (the assigned user)
    response = client.get(
        "/api/v1/project-assignments/",
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_get_assignment_by_id(client: TestClient):
    """Test getting assignment by ID"""
    setup = setup_users_and_project(client)
    
    # Create assignment
    create_response = client.post(
        "/api/v1/project-assignments/",
        json={
            "project_id": setup["project_id"],
            "user_id": setup["employee_id"]
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    assignment_id = create_response.json()["id"]
    
    # Get assignment
    response = client.get(
        f"/api/v1/project-assignments/{assignment_id}",
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == assignment_id


def test_get_pending_assignments(client: TestClient):
    """Test getting pending assignments"""
    setup = setup_users_and_project(client)
    
    # Create pending assignment
    client.post(
        "/api/v1/project-assignments/",
        json={
            "project_id": setup["project_id"],
            "user_id": setup["employee_id"]
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    # Get pending assignments
    response = client.get(
        "/api/v1/project-assignments/pending",
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert all(a["status"] == "pending" for a in data)


def test_approve_assignment(client: TestClient):
    """Test approving an assignment"""
    setup = setup_users_and_project(client)
    
    # Create assignment
    create_response = client.post(
        "/api/v1/project-assignments/",
        json={
            "project_id": setup["project_id"],
            "user_id": setup["employee_id"]
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    assignment_id = create_response.json()["id"]
    
    # Approve assignment
    response = client.put(
        f"/api/v1/project-assignments/{assignment_id}/approve",
        json={"status": "approved"},
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"
    assert data["approved_by_id"] == setup["manager_id"]
    assert data["approved_at"] is not None


def test_approve_assignment_not_authorized(client: TestClient):
    """Test approving assignment without permission"""
    setup = setup_users_and_project(client)
    
    # Create assignment
    create_response = client.post(
        "/api/v1/project-assignments/",
        json={
            "project_id": setup["project_id"],
            "user_id": setup["employee_id"]
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    assignment_id = create_response.json()["id"]
    
    # Try to approve as employee (not authorized)
    response = client.put(
        f"/api/v1/project-assignments/{assignment_id}/approve",
        json={"status": "approved"},
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    assert response.status_code == 403


def test_reject_assignment(client: TestClient):
    """Test rejecting an assignment"""
    setup = setup_users_and_project(client)
    
    # Create assignment
    create_response = client.post(
        "/api/v1/project-assignments/",
        json={
            "project_id": setup["project_id"],
            "user_id": setup["employee_id"]
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    assignment_id = create_response.json()["id"]
    
    # Reject assignment
    response = client.put(
        f"/api/v1/project-assignments/{assignment_id}/reject",
        json={"status": "rejected"},
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "rejected"


def test_revoke_assignment(client: TestClient):
    """Test revoking an approved assignment"""
    setup = setup_users_and_project(client)
    
    # Create and approve assignment
    create_response = client.post(
        "/api/v1/project-assignments/",
        json={
            "project_id": setup["project_id"],
            "user_id": setup["employee_id"]
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    assignment_id = create_response.json()["id"]
    
    client.put(
        f"/api/v1/project-assignments/{assignment_id}/approve",
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    # Revoke assignment
    response = client.put(
        f"/api/v1/project-assignments/{assignment_id}/revoke",
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "revoked"


def test_get_user_assignments(client: TestClient):
    """Test getting user's assignments"""
    setup = setup_users_and_project(client)
    
    # Create and approve assignment
    create_response = client.post(
        "/api/v1/project-assignments/",
        json={
            "project_id": setup["project_id"],
            "user_id": setup["employee_id"]
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    assignment_id = create_response.json()["id"]
    
    client.put(
        f"/api/v1/project-assignments/{assignment_id}/approve",
        json={"status": "approved"},
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    # Get employee's assignments
    response = client.get(
        "/api/v1/project-assignments/",
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_get_project_assignments(client: TestClient):
    """Test getting assignments for a project"""
    setup = setup_users_and_project(client)
    
    # Create assignment
    client.post(
        "/api/v1/project-assignments/",
        json={
            "project_id": setup["project_id"],
            "user_id": setup["employee_id"]
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    # Get project assignments
    response = client.get(
        f"/api/v1/project-assignments/project/{setup['project_id']}",
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_delete_assignment(client: TestClient):
    """Test deleting an assignment"""
    setup = setup_users_and_project(client)
    
    # Create assignment
    create_response = client.post(
        "/api/v1/project-assignments/",
        json={
            "project_id": setup["project_id"],
            "user_id": setup["employee_id"]
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    assignment_id = create_response.json()["id"]
    
    # Delete assignment
    response = client.delete(
        f"/api/v1/project-assignments/{assignment_id}",
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    assert response.status_code == 204


def test_assignment_unauthorized(client: TestClient):
    """Test accessing assignments without authentication"""
    response = client.get("/api/v1/project-assignments/")
    assert response.status_code == 401
