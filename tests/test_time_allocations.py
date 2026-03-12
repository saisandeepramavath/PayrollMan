"""
Time Allocation Tests
"""

import pytest
from fastapi.testclient import TestClient
from datetime import date


def setup_complete_environment(client: TestClient):
    """Helper to set up users, project, assignment, and punch entries"""
    # Create manager
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
    
    # Create and approve assignment
    assignment_response = client.post(
        "/api/v1/project-assignments/",
        json={
            "project_id": project_id,
            "user_id": employee_id
        },
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assignment_id = assignment_response.json()["id"]
    
    client.put(
        f"/api/v1/project-assignments/{assignment_id}/approve",
        json={"status": "approved"},
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    
    # Create punch entries for today (8 hours total)
    client.post(
        "/api/v1/punch/",
        json={
            "date": str(date.today()),
            "punch_in": f"{date.today()}T09:00:00",
            "punch_out": f"{date.today()}T17:00:00"
        },
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    
    return {
        "manager_token": manager_token,
        "manager_id": manager_id,
        "employee_token": employee_token,
        "employee_id": employee_id,
        "project_id": project_id,
        "assignment_id": assignment_id
    }


def test_create_time_allocation(client: TestClient):
    """Test creating a time allocation"""
    setup = setup_complete_environment(client)
    
    response = client.post(
        "/api/v1/time-allocations/",
        json={
            "project_id": setup["project_id"],
            "date": str(date.today()),
            "hours": 4.0,
            "description": "Working on feature X"
        },
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["project_id"] == setup["project_id"]
    assert data["hours"] == 4.0
    assert data["description"] == "Working on feature X"


def test_create_allocation_without_assignment(client: TestClient):
    """Test creating allocation without approved assignment"""
    setup = setup_complete_environment(client)
    
    # Create another project without assignment
    new_project = client.post(
        "/api/v1/projects/",
        json={
            "name": "Unassigned Project",
            "code": "UNASSIGNED",
            "status": "active"
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    new_project_id = new_project.json()["id"]
    
    # Try to allocate time to unassigned project
    response = client.post(
        "/api/v1/time-allocations/",
        json={
            "project_id": new_project_id,
            "date": str(date.today()),
            "hours": 4.0
        },
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    assert response.status_code == 403
    assert "not assigned" in response.json()["detail"]


def test_create_allocation_exceeding_daily_hours(client: TestClient):
    """Test creating allocation exceeding 24 hours per day"""
    setup = setup_complete_environment(client)
    
    # Try to allocate 25 hours
    response = client.post(
        "/api/v1/time-allocations/",
        json={
            "project_id": setup["project_id"],
            "date": str(date.today()),
            "hours": 25.0
        },
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    assert response.status_code == 422
    assert "cannot exceed 24" in response.json()["detail"][0]["msg"].lower()


def test_bulk_create_allocations(client: TestClient):
    """Test bulk creating allocations for a day"""
    setup = setup_complete_environment(client)
    
    # Create another project and approve assignment
    project2 = client.post(
        "/api/v1/projects/",
        json={
            "name": "Project 2",
            "code": "PRJ002",
            "status": "active"
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    project2_id = project2.json()["id"]
    
    assignment2 = client.post(
        "/api/v1/project-assignments/",
        json={
            "project_id": project2_id,
            "user_id": setup["employee_id"]
        },
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    assignment2_id = assignment2.json()["id"]
    
    client.put(
        f"/api/v1/project-assignments/{assignment2_id}/approve",
        json={"status": "approved"},
        headers={"Authorization": f"Bearer {setup['manager_token']}"}
    )
    
    # Bulk create allocations
    response = client.post(
        "/api/v1/time-allocations/bulk",
        json={
            "date": str(date.today()),
            "allocations": [
                {
                    "project_id": setup["project_id"],
                    "hours": 5.0,
                    "description": "Feature development"
                },
                {
                    "project_id": project2_id,
                    "hours": 3.0,
                    "description": "Bug fixes"
                }
            ]
        },
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert len(data) == 2
    assert sum(a["hours"] for a in data) == 8.0


def test_bulk_create_exceeding_hours(client: TestClient):
    """Test bulk create exceeding total hours"""
    setup = setup_complete_environment(client)
    
    response = client.post(
        "/api/v1/time-allocations/bulk",
        json={
            "date": str(date.today()),
            "allocations": [
                {
                    "project_id": setup["project_id"],
                    "hours": 20.0
                },
                {
                    "project_id": setup["project_id"],
                    "hours": 10.0
                }
            ]
        },
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    assert response.status_code == 422
    assert "exceed 24" in str(response.json()["detail"]).lower()


def test_get_time_allocations(client: TestClient):
    """Test getting time allocations"""
    setup = setup_complete_environment(client)
    
    # Create allocation
    client.post(
        "/api/v1/time-allocations/",
        json={
            "project_id": setup["project_id"],
            "date": str(date.today()),
            "hours": 4.0
        },
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    # Get allocations
    response = client.get(
        "/api/v1/time-allocations/",
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_get_allocations_by_date(client: TestClient):
    """Test getting allocations by date"""
    setup = setup_complete_environment(client)
    
    # Create allocation
    client.post(
        "/api/v1/time-allocations/",
        json={
            "project_id": setup["project_id"],
            "date": str(date.today()),
            "hours": 4.0
        },
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    # Get allocations by date
    response = client.get(
        f"/api/v1/time-allocations/?start_date={date.today()}&end_date={date.today()}",
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_get_daily_summary(client: TestClient):
    """Test getting daily summary"""
    setup = setup_complete_environment(client)
    
    # Create allocations
    client.post(
        "/api/v1/time-allocations/",
        json={
            "project_id": setup["project_id"],
            "date": str(date.today()),
            "hours": 5.0
        },
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    # Get daily summary
    response = client.get(
        f"/api/v1/time-allocations/summary/daily/{date.today()}",
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == str(date.today())
    assert data["total_punched_hours"] == 8.0
    assert data["total_allocated_hours"] == 5.0
    assert data["unallocated_hours"] == 3.0
    assert len(data["allocations"]) == 1


def test_get_project_summary(client: TestClient):
    """Test getting project time summary"""
    setup = setup_complete_environment(client)
    
    # Create allocation
    client.post(
        "/api/v1/time-allocations/",
        json={
            "project_id": setup["project_id"],
            "date": str(date.today()),
            "hours": 5.0
        },
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    # Get project summary
    response = client.get(
        f"/api/v1/time-allocations/summary/projects?start_date={date.today()}&end_date={date.today()}",
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["project_id"] == setup["project_id"]
    assert data[0]["total_hours"] == 5.0


def test_update_time_allocation(client: TestClient):
    """Test updating a time allocation"""
    setup = setup_complete_environment(client)
    
    # Create allocation
    create_response = client.post(
        "/api/v1/time-allocations/",
        json={
            "project_id": setup["project_id"],
            "date": str(date.today()),
            "hours": 4.0
        },
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    allocation_id = create_response.json()["id"]
    
    # Update allocation
    response = client.put(
        f"/api/v1/time-allocations/{allocation_id}",
        json={
            "hours": 6.0,
            "description": "Updated description"
        },
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["hours"] == 6.0
    assert data["description"] == "Updated description"


def test_delete_time_allocation(client: TestClient):
    """Test deleting a time allocation"""
    setup = setup_complete_environment(client)
    
    # Create allocation
    create_response = client.post(
        "/api/v1/time-allocations/",
        json={
            "project_id": setup["project_id"],
            "date": str(date.today()),
            "hours": 4.0
        },
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    allocation_id = create_response.json()["id"]
    
    # Delete allocation
    response = client.delete(
        f"/api/v1/time-allocations/{allocation_id}",
        headers={"Authorization": f"Bearer {setup['employee_token']}"}
    )
    
    assert response.status_code == 204


def test_allocation_unauthorized(client: TestClient):
    """Test accessing allocations without authentication"""
    response = client.get("/api/v1/time-allocations/")
    assert response.status_code == 401
