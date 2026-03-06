"""
Project Tests
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime


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


def test_create_project(client: TestClient):
    """Test creating a project"""
    token = get_auth_token(client)
    
    response = client.post(
        "/api/v1/projects/",
        json={
            "name": "Test Project",
            "code": "TEST001",
            "description": "Test project description",
            "department": "Engineering",
            "company": "Test Company",
            "status": "active"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["code"] == "TEST001"
    assert data["department"] == "Engineering"
    assert data["status"] == "active"
    assert "id" in data


def test_create_project_duplicate_code(client: TestClient):
    """Test creating project with duplicate code"""
    token = get_auth_token(client)
    
    # First project
    client.post(
        "/api/v1/projects/",
        json={
            "name": "Test Project 1",
            "code": "TEST001",
            "status": "active"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Duplicate code
    response = client.post(
        "/api/v1/projects/",
        json={
            "name": "Test Project 2",
            "code": "TEST001",
            "status": "active"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_create_project_with_supervisor(client: TestClient):
    """Test creating project with supervisor"""
    token = get_auth_token(client)
    supervisor_token = get_auth_token(client, "supervisor@example.com")
    
    # Get supervisor ID
    supervisor_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "supervisor@example.com",
            "password": "testpassword123"
        }
    )
    supervisor_data = supervisor_response.json()
    
    # Get the current user endpoint to fetch the supervisor's user ID
    supervisor_info = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {supervisor_token}"}
    )
    supervisor_id = supervisor_info.json()["id"]
    
    # Create project with supervisor
    response = client.post(
        "/api/v1/projects/",
        json={
            "name": "Supervised Project",
            "code": "SUP001",
            "status": "active",
            "supervisor_id": supervisor_id
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["supervisor_id"] == supervisor_id


def test_get_projects(client: TestClient):
    """Test getting all projects"""
    token = get_auth_token(client)
    
    # Create multiple projects
    client.post(
        "/api/v1/projects/",
        json={"name": "Project 1", "code": "PRJ001", "status": "active"},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    client.post(
        "/api/v1/projects/",
        json={"name": "Project 2", "code": "PRJ002", "status": "active"},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Get projects
    response = client.get(
        "/api/v1/projects/",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2


def test_get_project_by_id(client: TestClient):
    """Test getting project by ID"""
    token = get_auth_token(client)
    
    # Create project
    create_response = client.post(
        "/api/v1/projects/",
        json={"name": "Test Project", "code": "TEST001", "status": "active"},
        headers={"Authorization": f"Bearer {token}"}
    )
    project_id = create_response.json()["id"]
    
    # Get project
    response = client.get(
        f"/api/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == project_id
    assert data["name"] == "Test Project"


def test_get_project_by_code(client: TestClient):
    """Test getting project by code"""
    token = get_auth_token(client)
    
    # Create project
    client.post(
        "/api/v1/projects/",
        json={"name": "Test Project", "code": "TEST001", "status": "active"},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Get by code
    response = client.get(
        "/api/v1/projects/code/TEST001",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "TEST001"


def test_filter_projects_by_status(client: TestClient):
    """Test filtering projects by status"""
    token = get_auth_token(client)
    
    # Create projects with different statuses
    client.post(
        "/api/v1/projects/",
        json={"name": "Active Project", "code": "ACT001", "status": "active"},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    client.post(
        "/api/v1/projects/",
        json={"name": "Completed Project", "code": "COM001", "status": "completed"},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Filter by active status
    response = client.get(
        "/api/v1/projects/?status=active",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert all(p["status"] == "active" for p in data)


def test_filter_projects_by_department(client: TestClient):
    """Test filtering projects by department"""
    token = get_auth_token(client)
    
    # Create projects in different departments
    client.post(
        "/api/v1/projects/",
        json={
            "name": "Engineering Project",
            "code": "ENG001",
            "status": "active",
            "department": "Engineering"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    client.post(
        "/api/v1/projects/",
        json={
            "name": "Marketing Project",
            "code": "MKT001",
            "status": "active",
            "department": "Marketing"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Filter by department
    response = client.get(
        "/api/v1/projects/?department=Engineering",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert all(p["department"] == "Engineering" for p in data)


def test_update_project(client: TestClient):
    """Test updating a project"""
    token = get_auth_token(client)
    
    # Create project
    create_response = client.post(
        "/api/v1/projects/",
        json={"name": "Original Name", "code": "UPD001", "status": "active"},
        headers={"Authorization": f"Bearer {token}"}
    )
    project_id = create_response.json()["id"]
    
    # Update project
    response = client.put(
        f"/api/v1/projects/{project_id}",
        json={
            "name": "Updated Name",
            "description": "Updated description",
            "status": "on_hold"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["description"] == "Updated description"
    assert data["status"] == "on_hold"


def test_update_project_status(client: TestClient):
    """Test updating project status"""
    token = get_auth_token(client)
    
    # Create project
    create_response = client.post(
        "/api/v1/projects/",
        json={"name": "Test Project", "code": "STS001", "status": "active"},
        headers={"Authorization": f"Bearer {token}"}
    )
    project_id = create_response.json()["id"]
    
    # Update status
    response = client.patch(
        f"/api/v1/projects/{project_id}/status",
        json={"status": "completed"},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"


def test_delete_project(client: TestClient):
    """Test deleting a project"""
    token = get_auth_token(client)
    
    # Create project
    create_response = client.post(
        "/api/v1/projects/",
        json={"name": "Delete Me", "code": "DEL001", "status": "active"},
        headers={"Authorization": f"Bearer {token}"}
    )
    project_id = create_response.json()["id"]
    
    # Delete project
    response = client.delete(
        f"/api/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 204
    
    # Verify deletion
    get_response = client.get(
        f"/api/v1/projects/{project_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert get_response.status_code == 404


def test_get_user_projects(client: TestClient):
    """Test getting projects created by user"""
    token = get_auth_token(client)
    
    # Create projects
    client.post(
        "/api/v1/projects/",
        json={"name": "My Project", "code": "MY001", "status": "active"},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Get user's projects
    response = client.get(
        "/api/v1/projects/my-created",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_project_unauthorized(client: TestClient):
    """Test accessing projects without authentication"""
    response = client.get("/api/v1/projects/")
    assert response.status_code == 401
