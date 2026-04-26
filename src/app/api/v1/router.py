"""
API V1 Router

Streamlined API with clear separation of concerns:
- Auth: User authentication and profile management
- Punch Entries: Clock in/out for attendance tracking
- Timecards: Daily work logs with project time tracking
- Projects: Project management and information
- Assignments: User-to-project assignments and roles
"""

from fastapi import APIRouter

from src.app.api.v1.endpoints import (
    auth,
    issue_reports,
    timecard_submissions,
    timecards,
    punch_entries,
    projects,
    project_assignments,
    roles,
    tracking,
    user_work_rules,
)

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["🔐 Authentication"],
    responses={401: {"description": "Unauthorized"}}
)

api_router.include_router(
    issue_reports.router,
    prefix="/issues",
    tags=["⚠️ Issues"],
    responses={401: {"description": "Unauthorized"}}
)

api_router.include_router(
    punch_entries.router,
    prefix="/punch",
    tags=["⏰ Attendance"],
    responses={401: {"description": "Unauthorized"}}
)

api_router.include_router(
    timecard_submissions.router,
    prefix="/timecards/submissions",
    tags=["📋 Timecard Workflow"],
    responses={401: {"description": "Unauthorized"}}
)

api_router.include_router(
    timecards.router,
    prefix="/timecards",
    tags=["📋 Work Logs"],
    responses={401: {"description": "Unauthorized"}}
)

api_router.include_router(
    projects.router,
    prefix="/projects",
    tags=["📁 Projects"],
    responses={401: {"description": "Unauthorized"}}
)

api_router.include_router(
    project_assignments.router,
    prefix="/assignments",
    tags=["👥 Team Assignments"],
    responses={401: {"description": "Unauthorized"}}
)

api_router.include_router(
    roles.router,
    prefix="/roles",
    tags=["🎭 Roles & Permissions"],
    responses={401: {"description": "Unauthorized"}}
)

api_router.include_router(
    tracking.router,
    prefix="/tracking",
    tags=["🧭 Tracking Setup"],
    responses={401: {"description": "Unauthorized"}}
)

api_router.include_router(
    user_work_rules.router,
    prefix="/work-rules",
    tags=["📏 Work Rules"],
    responses={401: {"description": "Unauthorized"}}
)
