"""
API V1 Router
"""

from fastapi import APIRouter

from src.app.api.v1.endpoints import (
    auth,
    timecards,
    punch_entries,
    projects,
    project_assignments,
    time_allocations
)

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(timecards.router, prefix="/timecards", tags=["Timecards"])
api_router.include_router(punch_entries.router, prefix="/punch", tags=["Punch Entries"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(project_assignments.router, prefix="/project-assignments", tags=["Project Assignments"])
api_router.include_router(time_allocations.router, prefix="/time-allocations", tags=["Time Allocations"])
