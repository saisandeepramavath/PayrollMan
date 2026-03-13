# Quick Start Guide - New Timecard System

## ✅ Implementation Complete!

Your new timecard architecture is fully implemented with:
- ✅ **4 New Models** (PunchEntry, Project, ProjectAssignment, TimeAllocation)
- ✅ **Complete Schemas** (with validation)
- ✅ **Repositories** (data access layer)
- ✅ **Services** (business logic)
- ✅ **API Endpoints** (REST API)

---

## 🚀 Next Steps

### 1. Generate Database Migration

```bash
# Navigate to project root
cd /Volumes/T7Shield/timecard_backend_full

# Activate virtual environment
source venv/bin/activate

# Generate migration
alembic revision --autogenerate -m "Add punch entries, projects, assignments, and time allocations"

# Review the generated migration file in alembic/versions/

# Apply migration
alembic upgrade head
```

### 2. Test the API

Start your FastAPI server:

```bash
# From project root with venv activated
uvicorn src.app.main:app --reload --host 0.0.0.0 --port 8000
```

Access API documentation:
- **Swagger UI**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc

---

## 📚 API Endpoints Available

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Register new user

### Punch Entries
- `POST /api/v1/punch/in` - Quick punch in
- `POST /api/v1/punch/out` - Quick punch out
- `GET /api/v1/punch/active` - Get active punch
- `GET /api/v1/punch/` - List punch entries
- `POST /api/v1/punch/` - Create punch entry
- `GET /api/v1/punch/{id}` - Get punch entry
- `PUT /api/v1/punch/{id}` - Update punch entry
- `DELETE /api/v1/punch/{id}` - Delete punch entry
- `GET /api/v1/punch/hours/{date}` - Get daily hours

### Projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects` - List projects
- `GET /api/v1/projects/my-created` - My created projects
- `GET /api/v1/projects/my-supervised` - My supervised projects
- `GET /api/v1/projects/search?q=query` - Search projects
- `GET /api/v1/projects/{id}` - Get project
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

### Project Assignments
- `POST /api/v1/project-assignments` - Request assignment
- `GET /api/v1/project-assignments` - My assignments
- `GET /api/v1/project-assignments/pending` - Pending approvals
- `GET /api/v1/project-assignments/project/{id}` - Project assignments
- `PUT /api/v1/project-assignments/{id}/approve` - Approve
- `PUT /api/v1/project-assignments/{id}/reject` - Reject
- `PUT /api/v1/project-assignments/{id}/revoke` - Revoke
- `PUT /api/v1/project-assignments/{id}` - Update
- `DELETE /api/v1/project-assignments/{id}` - Delete

### Time Allocations
- `POST /api/v1/time-allocations` - Create allocation
- `POST /api/v1/time-allocations/bulk` - Bulk create for a day
- `GET /api/v1/time-allocations` - List allocations
- `GET /api/v1/time-allocations/summary/daily/{date}` - Daily summary
- `GET /api/v1/time-allocations/summary/projects` - Project summary
- `GET /api/v1/time-allocations/project/{id}` - By project
- `GET /api/v1/time-allocations/{id}` - Get allocation
- `PUT /api/v1/time-allocations/{id}` - Update allocation
- `DELETE /api/v1/time-allocations/{id}` - Delete allocation

---

## 💡 Example Usage Flow

### 1. Register & Login
```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","full_name":"John Doe"}'

# Login (save the token)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### 2. Punch In (Start Day)
```bash
curl -X POST http://localhost:8000/api/v1/punch/in \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Start of day"}'
```

### 3. Create Project
```bash
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Website Redesign",
    "code":"WEB-2026",
    "description":"Complete site overhaul",
    "department":"Engineering",
    "company":"Tech Corp",
    "status":"active"
  }'
```

### 4. Request Project Assignment
```bash
curl -X POST http://localhost:8000/api/v1/project-assignments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id":1,
    "user_id":1,
    "role":"Full Stack Developer",
    "notes":"I have relevant experience"
  }'
```

### 5. Approve Assignment (as supervisor)
```bash
curl -X PUT http://localhost:8000/api/v1/project-assignments/1/approve \
  -H "Authorization: Bearer SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved","notes":"Approved!"}'
```

### 6. Punch Out (End Day)
```bash
curl -X POST http://localhost:8000/api/v1/punch/out \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes":"End of day"}'
```

### 7. Allocate Time to Projects
```bash
curl -X POST http://localhost:8000/api/v1/time-allocations/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date":"2026-03-25",
    "allocations":[
      {"project_id":1,"hours":5.5,"description":"Frontend development"},
      {"project_id":2,"hours":2.5,"description":"Bug fixes"}
    ]
  }'
```

### 8. Get Daily Summary
```bash
curl -X GET http://localhost:8000/api/v1/time-allocations/summary/daily/2026-03-25 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚙️ Configuration

Ensure your `.env` file or environment variables are set:

```env
APP_NAME="Timecard API"
APP_VERSION="2.0.0"
ENVIRONMENT="development"
DEBUG=True

# Database
DATABASE_URL="sqlite:///./timecard.db"  # Or PostgreSQL URL

# Security
SECRET_KEY="your-secret-key-here"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:8080"]
```

---

## 🧪 Testing

### Manual Testing
1. Start server: `uvicorn src.app.main:app --reload`
2. Open Swagger UI: http://localhost:8000/api/v1/docs
3. Click "Authorize" and enter your JWT token
4. Test each endpoint interactively

### Automated Testing
```bash
# Run existing tests
pytest

# Run with coverage
pytest --cov=src

# Run specific test file
pytest tests/test_timecards.py -v
```

---

## 📊 Database Schema Overview

```
users
├── punch_entries (multiple per day)
├── created_projects (as creator)
├── supervised_projects (as supervisor)
├── project_assignments (approved projects)
└── time_allocations (hours split)

projects
├── creator (user)
├── supervisor (user)
├── assignments (users assigned)
└── time_allocations (hours tracked)

project_assignments
├── user (assignee)
├── assigner (requester)
├── approver (who approved)
└── project

time_allocations
├── user
└── project
```

---

## 🎯 Key Features

### ✅ Flexible Punch Tracking
- Multiple punch in/out per day
- Track breaks, lunch, meetings
- Calculate total hours automatically

### ✅ Rich Project Management
- Full organizational context
- Creator and supervisor roles
- Department and company tracking
- Project lifecycle management

### ✅ Approval Workflow
- Request project access
- Supervisor approval required
- Can't allocate time without approval
- Complete audit trail

### ✅ Smart Time Allocation
- Split hours across projects
- Validates against punched hours
- Prevents over-allocation
- Daily and project summaries

---

## 🐛 Troubleshooting

### Migration Issues
```bash
# Check current migration
alembic current

# View migration history
alembic history

# Rollback one version
alembic downgrade -1

# Upgrade to head
alembic upgrade head
```

### Database Issues
```bash
# Reset database (WARNING: deletes all data)
rm timecard.db
alembic upgrade head
python scripts/seed_data.py
```

### API Issues
- Check logs for errors
- Verify JWT token is valid
- Ensure migrations are applied
- Check CORS settings for frontend

---

## 📞 Support

For issues or questions:
1. Check [docs/NEW_ARCHITECTURE.md](NEW_ARCHITECTURE.md)
2. Review API docs at `/api/v1/docs`
3. Check error messages in server logs

---

## 🎉 You're All Set!

Your timecard system is ready to use. Start the server and begin testing!

```bash
uvicorn src.app.main:app --reload
```

Then visit: http://localhost:8000/api/v1/docs
