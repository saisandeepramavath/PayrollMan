# 🔐 RBAC & Access Control Reference

Complete reference for roles, permissions, test accounts, and authorization rules in the Timecard Management API.

---

## 👥 User Roles

The system has two system-level roles controlled by the `is_superuser` flag on the `User` model.

| Role | `is_superuser` | Description |
|------|---------------|-------------|
| **Manager / Superuser** | `true` | Full system access. Can manage all projects, approve assignments, view all team data. |
| **Employee** | `false` | Scoped access. Can manage own timecards/punch entries, request project assignments, and log time only on assigned projects. |

In addition, **project-level roles** determine what a user can do within a specific project:

| Project Role | How it's granted | Capabilities |
|---|---|---|
| **Project Creator** | User who calls `POST /projects/` | Update project, delete project, approve/reject assignments |
| **Project Supervisor** | Set via `supervisor_id` on the project | Update project, approve/reject assignments |
| **Project Member** | Assignment with `status = approved` | Log time allocations to the project |

---

## 🔑 Test Accounts

> These credentials are for the **seeded development database only**.

### Manager

| Field | Value |
|---|---|
| Name | Sunil Kumar |
| Email | `sunil@techcorp.com` |
| Password | `sunil123` |
| `is_superuser` | `true` |

### Employees

| Name | Email | Password | Projects | Project Role |
|---|---|---|---|---|
| Sai Sandeep Ramavath | `sandeep@techcorp.com` | `sandeep123` | TMS, DBOPT | Lead Developer / Database Engineer |
| Nithikesh Reddy | `nithikesh@techcorp.com` | `nithikesh123` | TMS, MOBILE | Backend Developer / Mobile Developer |
| Sumeeth Goud | `sumeeth@techcorp.com` | `sumeeth123` | MOBILE, PORTAL | Frontend Developer / UI Developer |
| Jatin Sharma | `jatin@techcorp.com` | `jatin123` | SEC, TMS | Security Engineer / DevOps Engineer |
| Aditya Verma | `aditya@techcorp.com` | `aditya123` | PORTAL, DBOPT | Full Stack Developer / Database Developer |
| Priya Sharma *(DataFlow)* | `priya@dataflow.com` | `priya123` | — | Manager (`is_superuser=true`) |
| Rahul Mehta | `rahul@dataflow.com` | `rahul123` | ANALYTICS, MLPIPE | Data Engineer / Pipeline Engineer |
| Neha Joshi | `neha@dataflow.com` | `neha123` | MLPIPE, DASH | ML Engineer / BI Developer |
| Arjun Patel | `arjun@dataflow.com` | `arjun123` | ANALYTICS, DASH | Backend Engineer / Visualisation Developer |
| Kavya Reddy | `kavya@dataflow.com` | `kavya123` | ANALYTICS, MLPIPE | Data Analyst / Data Scientist |

### Login Command (any user)

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "sunil@techcorp.com", "password": "sunil123"}'
```

The response contains an `access_token`. Pass it as a Bearer token on all subsequent requests:

```
Authorization: Bearer <access_token>
```

---

## 🗂️ Seeded Projects

| Code | Name | Status |
|---|---|---|
| `TMS` | Timecard Management System | Active |
| `MOBILE` | Mobile App Development | Active |
| `DBOPT` | Database Optimization | Active |
| `SEC` | Security Audit | Active |
| `PORTAL` | Customer Portal | Active |

---

## 📋 Permission Matrix

### Authentication Endpoints (`/api/v1/auth/`)

| Endpoint | Method | Auth Required | Who |
|---|---|---|---|
| `/register` | POST | No | Anyone |
| `/login` | POST | No | Anyone |
| `/me` | GET | Yes | Current user |

### Projects (`/api/v1/projects/`)

| Endpoint | Method | Auth Required | Who |
|---|---|---|---|
| `/` | POST | Yes | Any authenticated user |
| `/` | GET | Yes | Any authenticated user |
| `/{id}` | GET | Yes | Any authenticated user |
| `/{id}` | PUT | Yes | **Creator or Supervisor only** |
| `/{id}/status` | PATCH | Yes | **Creator or Supervisor only** |
| `/{id}` | DELETE | Yes | **Creator only** |

### Project Assignments (`/api/v1/assignments/`)

| Endpoint | Method | Auth Required | Who |
|---|---|---|---|
| `/` | POST | Yes | Any authenticated user (self-assign or assign others) |
| `/` | GET | Yes | Current user (own assignments) |
| `/pending` | GET | Yes | Users who are creator/supervisor of a project |
| `/project/{id}` | GET | Yes | Any authenticated user |
| `/{id}` | GET | Yes | Any authenticated user |
| `/{id}/approve` | PUT | Yes | **Project creator or supervisor only** |
| `/{id}/reject` | PUT | Yes | **Project creator or supervisor only** |
| `/{id}/revoke` | PUT | Yes | **Project creator or supervisor only** |

### Timecards (`/api/v1/timecards/`)

| Endpoint | Method | Auth Required | Who |
|---|---|---|---|
| `/` | POST | Yes | Current user (own timecard) |
| `/` | GET | Yes | Current user (own timecards only) |
| `/{id}` | GET | Yes | Current user (own timecard only) |
| `/{id}` | PUT | Yes | Current user (own timecard only) |
| `/{id}` | DELETE | Yes | Current user (own timecard only) |

### Punch Entries (`/api/v1/punch-entries/`)

| Endpoint | Method | Auth Required | Who |
|---|---|---|---|
| `/in` | POST | Yes | Current user |
| `/out` | POST | Yes | Current user |
| `/active` | GET | Yes | Current user |
| `/` | POST | Yes | Current user |
| `/` | GET | Yes | Current user (own entries only) |
| `/{id}` | GET | Yes | Current user (own entry only) |
| `/{id}` | PUT | Yes | Current user (own entry only) |
| `/{id}` | DELETE | Yes | Current user (own entry only) |

### Time Allocations (`/api/v1/time-allocations/`)

| Endpoint | Method | Auth Required | Who |
|---|---|---|---|
| `/` | POST | Yes | **Must have APPROVED assignment to the project** |
| `/bulk` | POST | Yes | **Must have APPROVED assignment for each project** |
| `/` | GET | Yes | Current user (own allocations only) |
| `/{id}` | GET | Yes | Current user (own allocation only) |
| `/{id}` | PUT | Yes | **Must have APPROVED assignment to the project** |
| `/{id}` | DELETE | Yes | Current user (own allocation only) |

---

## 🔄 Assignment Approval Workflow

```
[Any User] POST /assignments/
        |
        v
  status = PENDING
        |
        v (Project Creator or Supervisor)
   PUT /assignments/{id}/approve   →   status = APPROVED  →  User can now log time
   PUT /assignments/{id}/reject    →   status = REJECTED
        |
        v (any time after approval)
   PUT /assignments/{id}/revoke    →   status = REVOKED   →  User loses time-log access
```

---

## 🚫 Authorization Errors

| HTTP Status | Scenario |
|---|---|
| `401 Unauthorized` | Missing or invalid Bearer token |
| `403 Forbidden` | Valid token but insufficient permissions (e.g., non-creator trying to delete a project, or employee logging time to an unassigned project) |
| `404 Not Found` | Resource not found or intentionally hidden from caller |

---

## 🛠️ Quick Auth Flow (curl)

```bash
# 1. Login and capture token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "sunil@techcorp.com", "password": "sunil123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Use the token
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/auth/me

# 3. View all projects
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/projects/

# 4. Approve a pending assignment (manager/supervisor action)
curl -X PUT http://localhost:8000/api/v1/assignments/1/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Approved"}'
```

---

## 🔍 Swagger UI

Interactive API docs with built-in auth support:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

Click **Authorize** in Swagger UI and enter `Bearer <token>` to authenticate all requests in the browser.
