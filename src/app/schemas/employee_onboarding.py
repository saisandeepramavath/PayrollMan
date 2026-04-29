"""
Employee Onboarding Schemas
"""

from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, date


class ProjectAssignmentInput(BaseModel):
    """Project assignment input during onboarding"""
    project_id: int
    role: str  # e.g., "Developer", "Designer", "Manager"
    notes: Optional[str] = None


class EmployeeOnboardingRequest(BaseModel):
    """Employee onboarding request from HR/Manager with detailed information"""
    # Basic Info
    email: EmailStr
    first_name: str
    last_name: str
    password: str
    
    # Contact Information
    personal_email: Optional[EmailStr] = None
    office_phone: Optional[str] = None
    personal_phone: Optional[str] = None
    
    # Personal Info
    date_of_birth: Optional[date] = None
    additional_details: Optional[str] = None
    
    # Assignment Info
    role_id: Optional[int] = None  # Optional role assignment
    projects: List[ProjectAssignmentInput] = []  # Projects to assign immediately
    auto_approve_assignments: bool = False  # Auto-approve or wait for approval


class EmployeeOnboardingResponse(BaseModel):
    """Response after employee onboarding"""
    id: int
    email: str
    first_name: str
    last_name: str
    full_name: str
    is_active: bool
    role_id: Optional[int] = None
    created_at: datetime
    assignments_created: int
    assignment_ids: List[int] = []

    model_config = ConfigDict(from_attributes=True)


class EmployeeWithAssignments(BaseModel):
    """Employee details with their project assignments"""
    id: int
    email: str
    first_name: str
    last_name: str
    full_name: str
    personal_email: Optional[str] = None
    office_phone: Optional[str] = None
    personal_phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    is_active: bool
    role_id: Optional[int] = None
    created_at: datetime
    total_projects: int
    approved_projects: int
    pending_projects: int

    model_config = ConfigDict(from_attributes=True)


class OnboardingBulkRequest(BaseModel):
    """Bulk onboarding request"""
    employees: List[EmployeeOnboardingRequest]
    send_notifications: bool = True


class OnboardingBulkResponse(BaseModel):
    """Bulk onboarding response"""
    total_created: int
    successful: int
    failed: int
    errors: List[dict] = []

