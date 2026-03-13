# New Timecard Architecture - Implementation Guide

## Overview

Your timecard system now follows this workflow:

1. **Punch Tracking** - Users punch in/out multiple times per day (breaks, lunch, etc.)
2. **Project Management** - Rich project metadata with organizational structure
3. **Project Assignment** - Approval-based assignment workflow  
4. **Time Allocation** - Split daily hours across assigned projects

---

## Database Models

### 1. PunchEntry
Tracks actual punch in/out times throughout the day.

**Fields:**
- `id`: Primary key
- `user_id`: Who punched in
- `date`: Date of punch
- `punch_in`: Timestamp when punched in
- `punch_out`: Timestamp when punched out (nullable)
- `notes`: Optional notes (e.g., "lunch break")
- `created_at`, `updated_at`: Timestamps

**Use Case:** Employee punches in at 9 AM, out for lunch at 12 PM, back in at 1 PM, out at 5 PM.

---

### 2. Project
Enhanced project with full organizational metadata.

**Fields:**
- `id`: Primary key
- `name`: Project name
- `code`: Unique project code (e.g., "PROJ-001")
- `description`: Project description
- `department`: Department name (e.g., "Engineering")
- `company`: Company name (e.g., "Acme Corp")
- `creator_id`: User who created the project
- `supervisor_id`: Project supervisor/manager
- `status`: Enum (ACTIVE, ON_HOLD, COMPLETED, CANCELLED)
- `start_date`, `end_date`: Project timeline
- `created_at`, `updated_at`: Timestamps

**Relationships:**
- `creator`: User who created
- `supervisor`: User who supervises
- `assignments`: ProjectAssignment records
- `time_allocations`: TimeAllocation records

---

### 3. ProjectAssignment
Manages who can work on which projects with approval workflow.

**Fields:**
- `id`: Primary key
- `project_id`: Project reference
- `user_id`: Employee assigned to project
- `assigner_id`: Who requested/assigned (could be self, manager, etc.)
- `status`: Enum (PENDING, APPROVED, REJECTED, REVOKED)
- `approved_by_id`: Who approved/rejected
- `approved_at`: When approved/rejected
- `role`: Role in project (e.g., "Developer", "Designer")
- `notes`: Assignment notes/reasons
- `created_at`, `updated_at`: Timestamps

**Workflow:**
1. User/Manager creates assignment → Status: PENDING
2. Project supervisor/creator reviews → Status: APPROVED or REJECTED
3. Can be REVOKED later if needed

---

### 4. TimeAllocation
How users split their daily hours across assigned projects.

**Fields:**
- `id`: Primary key
- `user_id`: User allocating time
- `project_id`: Project hours allocated to
- `date`: Date of work
- `hours`: Hours allocated (float)
- `description`: What work was done
- `created_at`, `updated_at`: Timestamps

**Example:**
User worked 8 hours total on March 25th:
- 4.5 hours → Project A (Backend development)
- 3.5 hours → Project B (Bug fixes)

---

## Typical User Workflow

### Morning - Punch In
```
POST /api/v1/punch/in
{
  "punch_in": "2026-03-25T09:00:00Z",
  "notes": "Start of day"
}
```

### Throughout Day - Multiple Punch In/Out
```
# Lunch break
POST /api/v1/punch/out
{
  "punch_out": "2026-03-25T12:00:00Z",
  "notes": "Lunch"
}

# Back from lunch
POST /api/v1/punch/in
{
  "punch_in": "2026-03-25T13:00:00Z"
}

# End of day
POST /api/v1/punch/out
{
  "punch_out": "2026-03-25T17:00:00Z"
}
```

### End of Day - Allocate Time
```
POST /api/v1/time-allocations/bulk
{
  "date": "2026-03-25",
  "allocations": [
    {
      "project_id": 1,
      "hours": 4.5,
      "description": "Implemented user authentication feature"
    },
    {
      "project_id": 2,
      "hours": 3.0,
      "description": "Fixed database migration issues"
    }
  ]
}
```

---

## Project Assignment Workflow

### Step 1: Create Project
```
POST /api/v1/projects
{
  "name": "Mobile App Redesign",
  "code": "MAR-2026",
  "description": "Complete UI/UX overhaul",
  "department": "Engineering",
  "company": "Tech Corp",
  "supervisor_id": 5,
  "status": "active"
}
```

### Step 2: Request Project Assignment
```
POST /api/v1/project-assignments
{
  "project_id": 1,
  "user_id": 3,  # Employee to be assigned
  "role": "Frontend Developer",
  "notes": "Needed for React Native expertise"
}
```
→ Status: PENDING

### Step 3: Supervisor Approves
```
PUT /api/v1/project-assignments/{id}/approve
{
  "status": "approved",
  "notes": "Approved. Welcome to the project!"
}
```
→ Status: APPROVED (user can now allocate time to this project)

### Step 4: User Allocates Time
```
POST /api/v1/time-allocations
{
  "project_id": 1,
  "date": "2026-03-25",
  "hours": 6.5,
  "description": "Built component library"
}
```

---

## Key Features

### ✅ Multiple Punch Entries Per Day
- Users can punch in/out as many times as needed
- System calculates total hours worked from all punches

### ✅ Rich Project Metadata
- Full organizational context (department, company)
- Clear ownership (creator, supervisor)
- Project lifecycle tracking (status, dates)

### ✅ Approval Workflow
- Can't allocate time to projects without approval
- Supervisor/Creator can approve/reject assignments
- Transparent status tracking (pending, approved, rejected)

### ✅ Flexible Time Splitting
- Allocate hours after the work is done
- Split time across multiple projects
- Add descriptions for each allocation

### ✅ Comprehensive Tracking
- Who created the project?
- Who supervises it?
- Who assigned users?
- Who approved assignments?
- Complete audit trail

---

## API Endpoints (Recommended Structure)

### Punch Entries
- `POST /api/v1/punch/in` - Quick punch in
- `POST /api/v1/punch/out` - Quick punch out from active entry
- `GET /api/v1/punch/active` - Get current active punch
- `GET /api/v1/punch/entries` - Get all punch entries
- `GET /api/v1/punch/entries/{date}` - Get punches for specific date
- `PUT /api/v1/punch/entries/{id}` - Update punch entry
- `DELETE /api/v1/punch/entries/{id}` - Delete punch entry

### Projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects` - List all projects
- `GET /api/v1/projects/{id}` - Get project details
- `GET /api/v1/projects/my-created` - Projects I created
- `GET /api/v1/projects/my-supervised` - Projects I supervise
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

### Project Assignments
- `POST /api/v1/project-assignments` - Request assignment
- `GET /api/v1/project-assignments` - My assignments
- `GET /api/v1/project-assignments/pending` - Pending approvals (for supervisors)
- `GET /api/v1/project-assignments/project/{id}` - Assignments for a project
- `PUT /api/v1/project-assignments/{id}/approve` - Approve assignment
- `PUT /api/v1/project-assignments/{id}/reject` - Reject assignment
- `PUT /api/v1/project-assignments/{id}/revoke` - Revoke assignment
- `DELETE /api/v1/project-assignments/{id}` - Delete assignment

### Time Allocations
- `POST /api/v1/time-allocations` - Create single allocation
- `POST /api/v1/time-allocations/bulk` - Create multiple allocations for a day
- `GET /api/v1/time-allocations` - List my allocations
- `GET /api/v1/time-allocations/{date}` - Allocations for specific date
- `GET /api/v1/time-allocations/project/{id}` - Allocations for a project
- `GET /api/v1/time-allocations/summary` - Summary by project (date range)
- `PUT /api/v1/time-allocations/{id}` - Update allocation
- `DELETE /api/v1/time-allocations/{id}` - Delete allocation

---

## Database Migration

To create the database tables, you need to generate an Alembic migration:

```bash
# Generate migration
alembic revision --autogenerate -m "Add punch entries, projects, assignments, and time allocations"

# Apply migration
alembic upgrade head
```

---

## Benefits of This Architecture

### 1. **Realistic Time Tracking**
- Captures actual work hours through punches
- Allows breaks, lunch, meetings (multiple punches)

### 2. **Flexible Allocation**
- Allocate time after the fact (end of day/week)
- Split hours across projects as needed
- Not tied to real-time tracking

### 3. **Organizational Clarity**
- Clear project ownership and supervision
- Department and company tracking
- Full audit trail

### 4. **Access Control**
- Can't allocate time to unapproved projects
- Supervisor approval workflow
- Prevents unauthorized time tracking

### 5. **Reporting Ready**
- Total punched hours vs allocated hours
- Hours by project, department, company
- Employee productivity metrics
- Project cost tracking

---

## Next Steps

1. **Create Services** - Business logic layer (I can help with this)
2. **Create API Endpoints** - FastAPI routes (I can help with this)
3. **Database Migration** - Run Alembic migration
4. **Testing** - Write tests for the new features
5. **Frontend Integration** - Connect your frontend to new API

Let me know if you want me to create the services and API endpoints!
