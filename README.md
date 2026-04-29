# PayrollMan - Timecard Management System

Production-ready employee time tracking and payroll management platform with FastAPI backend and React frontend.

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.2+-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0+-3178c6.svg)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- JWT Authentication with role-based access control
- Dark/Light mode theme switching with Tailwind CSS
- Clock in/out attendance tracking with timestamps
- Daily timecards with project time allocation
- Project management and tracking
- Team assignments with role management
- Employee onboarding workflow
- Clean Architecture design pattern
- Modern React UI with React Query
- Full type safety (Python and TypeScript)
- Interactive API documentation (Swagger UI and ReDoc)

---

## System Architecture

### Overall Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend Layer - React"]
        UI["React Components<br/>TypeScript"]
        Theme["Theme Context<br/>Dark/Light Mode"]
        Auth["Auth Context<br/>Permission Management"]
        API_Client["API Client<br/>Axios"]
    end
    
    subgraph Backend["Backend Layer - FastAPI"]
        Routes["API Routes<br/>Endpoints"]
        Security["JWT Security<br/>Authentication"]
        Services["Business Logic<br/>Services"]
        Repos["Data Access<br/>Repositories"]
        Models["ORM Models<br/>SQLAlchemy"]
    end
    
    subgraph Database["Data Layer"]
        DB[(SQLite/PostgreSQL)]
    end
    
    UI -->|HTTP/REST| Routes
    Auth --> API_Client
    Theme --> UI
    API_Client -->|Bearer Token| Security
    Routes --> Security
    Security --> Services
    Services --> Repos
    Repos --> Models
    Models --> DB
    
    style Frontend fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    style Backend fill:#fff4e1,stroke:#ff6f00,stroke-width:2px
    style Database fill:#e1ffe1,stroke:#1b5e20,stroke-width:2px
```

### Frontend Architecture

```mermaid
graph LR
    subgraph Core["Core"]
        App["App.tsx<br/>Router & Providers"]
        Auth_Ctx["AuthContext<br/>User State"]
        Theme_Ctx["ThemeContext<br/>Theme Management"]
    end
    
    subgraph Pages["Pages"]
        Login["LoginPage"]
        Dashboard["DashboardPage"]
        Onboarding["EmployeeOnboardingPage"]
        Projects["ProjectsPage"]
        Admin["AdminPage"]
    end
    
    subgraph Components["Components"]
        Layout["AppLayout"]
        Sidebar["Sidebar"]
        Cards["UI Cards"]
        Inputs["Form Inputs"]
    end
    
    App --> Auth_Ctx
    App --> Theme_Ctx
    Auth_Ctx --> Pages
    Theme_Ctx --> Pages
    Pages --> Layout
    Layout --> Sidebar
    Layout --> Components
    
    style Core fill:#e1f5ff
    style Pages fill:#fff4e1
    style Components fill:#e1ffe1
```

### Backend Architecture

```mermaid
graph TB
    subgraph API["API Layer"]
        Routes["v1/router.py<br/>Route Management"]
        Endpoints["endpoints/<br/>HTTP Handlers"]
        Deps["deps.py<br/>Dependencies & Auth"]
        Schemas["schemas/<br/>Pydantic DTOs"]
    end
    
    subgraph Business["Business Logic"]
        Services["services/<br/>Business Rules"]
    end
    
    subgraph Data["Data Access"]
        Repos["repositories/<br/>DB Operations"]
        Models["models/<br/>ORM"]
    end
    
    subgraph Core["Core"]
        Security["security.py<br/>JWT & Hashing"]
        Config["config.py<br/>Settings"]
    end
    
    Endpoints --> Deps
    Deps --> Schemas
    Schemas --> Services
    Services --> Repos
    Repos --> Models
    Deps --> Security
    Security --> Config
    
    style API fill:#e1f5ff
    style Business fill:#fff4e1
    style Data fill:#e1ffe1
    style Core fill:#f3e5f5
```

---

## Project Structure

```
PayrollMan/
│
├── frontend/                        # React Frontend (TypeScript)
│   ├── src/
│   │   ├── pages/                  # Page components
│   │   │   ├── auth/              # Authentication pages
│   │   │   ├── admin/             # Admin and onboarding
│   │   │   ├── projects/          # Project management
│   │   │   ├── timecards/         # Timecard tracking
│   │   │   └── dashboard/         # Dashboard views
│   │   │
│   │   ├── components/            # Reusable components
│   │   │   ├── layout/            # Layout components
│   │   │   └── ui/                # UI components
│   │   │
│   │   ├── contexts/              # React Context
│   │   │   ├── AuthContext.tsx    # User & permissions
│   │   │   └── ThemeContext.tsx   # Theme management
│   │   │
│   │   ├── api/                   # API client
│   │   │   └── client.ts          # Axios configuration
│   │   │
│   │   └── index.css              # Tailwind styles
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── src/app/                        # Backend Source
│   ├── main.py                    # FastAPI application
│   │
│   ├── api/                       # API Layer
│   │   ├── deps.py               # Authentication dependencies
│   │   └── v1/
│   │       ├── router.py         # Route aggregation
│   │       └── endpoints/        # Endpoint handlers
│   │           ├── auth.py
│   │           ├── employee_onboarding.py
│   │           ├── punch_entries.py
│   │           ├── timecards.py
│   │           ├── projects.py
│   │           └── project_assignments.py
│   │
│   ├── services/                 # Business Logic
│   │   ├── auth_service.py
│   │   ├── employee_onboarding_service.py
│   │   └── ...
│   │
│   ├── repositories/             # Data Access
│   │   ├── user_repository.py
│   │   ├── punch_entry_repository.py
│   │   └── ...
│   │
│   ├── models/                   # Database Models
│   │   ├── user.py
│   │   ├── role.py
│   │   ├── punch_entry.py
│   │   ├── project.py
│   │   └── ...
│   │
│   ├── schemas/                  # Pydantic DTOs
│   │   ├── user.py
│   │   ├── auth.py
│   │   └── ...
│   │
│   ├── core/                     # Core Utilities
│   │   ├── config.py            # Configuration
│   │   └── security.py          # Security utilities
│   │
│   └── db/                       # Database
│       ├── base.py              # Base class
│       ├── session.py           # Session factory
│       └── init_db.py           # Initialization
│
├── scripts/                       # Utility Scripts
│   └── seed_data.py             # Database seeding
│
├── tests/                         # Test Suite
│   └── test_*.py
│
├── requirements.txt              # Python dependencies
├── package.json                  # JavaScript dependencies
└── README.md                     # This file
```

---

## Quick Start Guide

### Backend Setup

#### Prerequisites
- Python 3.9 or later
- Virtual environment
- SQLite (default) or PostgreSQL

#### Installation

```bash
# Clone repository
git clone https://github.com/saisandeepramavath/PayrollMan.git
cd PayrollMan

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Mac/Linux
# OR
venv\Scripts\activate     # On Windows

# Install dependencies
pip install -r requirements.txt

# Initialize database
PYTHONPATH=. python src/app/db/init_db.py

# Seed test data
PYTHONPATH=. python scripts/seed_data.py

# Start backend server
python -m uvicorn src.app.main:app --reload --port 8000
```

Backend is available at: http://localhost:8000

---

### Frontend Setup

#### Prerequisites
- Node.js 18 or later
- npm or yarn

#### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend is available at: http://localhost:5173

The vite proxy configuration automatically forwards `/api/v1` requests to http://localhost:8000

---

## Test Credentials

### Admin Users (Full system access)

**TechCorp Solutions**
- Email: sunil@techcorp.com
- Password: sunil123

**DataFlow Inc**
- Email: priya@dataflow.com
- Password: priya123

### Regular Employees

| Name | Email | Password | Assigned Projects |
|------|-------|----------|-------------------|
| Sai Sandeep Ramavath | sandeep@techcorp.com | sandeep123 | TMS, DBOPT |
| Nithikesh Reddy | nithikesh@techcorp.com | nithikesh123 | TMS, MOBILE |
| Sumeeth Goud | sumeeth@techcorp.com | sumeeth123 | MOBILE, PORTAL |
| Jatin Sharma | jatin@techcorp.com | jatin123 | SEC, TMS |
| Aditya Verma | aditya@techcorp.com | aditya123 | PORTAL, DBOPT |

---

## API Overview

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant API
    participant DB
    
    User->>App: Enter credentials
    App->>API: POST /auth/login
    API->>DB: Verify credentials
    DB-->>API: Valid user
    API->>API: Generate JWT
    API-->>App: JWT Token
    App->>App: Store in localStorage
    App->>API: GET /admin/onboarding<br/>Authorization: Bearer token
    API->>API: Validate token
    API->>DB: Check permissions
    DB-->>API: User has can_manage_users
    API-->>App: Onboarded employees
    App->>User: Display dashboard
```

### Core API Endpoints

```mermaid
graph TB
    API["API v1"]
    
    API --> Auth["Authentication"]
    API --> Punch["Punch/Clock In/Out"]
    API --> Timecard["Timecards"]
    API --> Project["Projects"]
    API --> Assign["Assignments"]
    API --> Onboard["Onboarding"]
    
    Auth --> |"POST /auth/register"| a1["  "]
    Auth --> |"POST /auth/login"| a2["  "]
    Auth --> |"GET /auth/me"| a3["  "]
    
    Punch --> |"POST /punch/in"| b1["  "]
    Punch --> |"POST /punch/out"| b2["  "]
    Punch --> |"GET /punch/active"| b3["  "]
    
    Timecard --> |"POST /timecards"| c1["  "]
    Timecard --> |"GET /timecards"| c2["  "]
    Timecard --> |"GET /timecards/{id}"| c3["  "]
    
    Project --> |"POST /projects"| d1["  "]
    Project --> |"GET /projects"| d2["  "]
    Project --> |"PUT /projects/{id}"| d3["  "]
    
    Assign --> |"POST /assignments"| e1["  "]
    Assign --> |"GET /assignments"| e2["  "]
    Assign --> |"PATCH /assignments/{id}/approve"| e3["  "]
    
    Onboard --> |"POST /onboarding/onboard"| f1["  "]
    Onboard --> |"GET /onboarding/onboarded"| f2["  "]
    Onboard --> |"GET /onboarding/status/{id}"| f3["  "]
    
    style API fill:#e1f5ff,stroke:#01579b,stroke-width:2px
```

### Example API Usage

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "sandeep@techcorp.com", "password": "sandeep123"}'

# Response
# {"access_token": "eyJ...", "token_type": "bearer"}

# Store token
TOKEN="eyJ..."

# Clock In
curl -X POST http://localhost:8000/api/v1/punch/in \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Get Active Status
curl -X GET http://localhost:8000/api/v1/punch/active \
  -H "Authorization: Bearer $TOKEN"

# Log Work
curl -X POST http://localhost:8000/api/v1/timecards/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-28",
    "project_id": 1,
    "hours_worked": 8.0,
    "description": "Implementation work"
  }'

# Clock Out
curl -X POST http://localhost:8000/api/v1/punch/out \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Role-Based Access Control

### User Roles

| Role | Permissions |
|------|-----------|
| Manager/Superuser | Full system access: manage users, projects, approve assignments, view all timecards |
| Employee | Limited access: manage own timecards, clock in/out, request assignments |

### Permission Flags

- can_create_projects - Create new projects
- can_manage_assignments - Assign users to projects
- can_view_all_timecards - View all team timecards
- can_manage_users - Create/manage users and onboarding

### Onboarding Access Control

Only users with can_manage_users permission can access /admin/onboarding:
- Create new employee accounts
- Assign projects to employees
- Track onboarding status

---

## Testing

### Backend Tests

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=src/app tests/

# Run specific test file
pytest tests/test_auth.py -v

# Run with print output
pytest -s
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Development

### Backend Development

```bash
# Format code
black src/ tests/
isort src/ tests/

# Type checking
mypy src/

# Linting
flake8 src/ tests/

# Database migrations
alembic revision --autogenerate -m "Description"
alembic upgrade head
alembic downgrade -1
```

### Frontend Development

```bash
cd frontend

# Format code
npm run lint

# Type checking
npm run tsc

# Production build
npm run build
```

---

## Environment Variables

### Backend (.env file)

```bash
# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database
DATABASE_URL=sqlite:///./timecard.db
# For PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost/timecard

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

Generate SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

### Frontend (.env file)

```bash
VITE_API_URL=http://localhost:8000/api/v1
```

---

## API Documentation

### Interactive Documentation

- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc
- Health Check: http://localhost:8000/health

### Authenticating in Swagger UI

1. Click "Authorize" button
2. Enter JWT token from /auth/login response
3. All protected endpoints now require authentication

---

## Use Cases

### Admin: Employee Onboarding

```
1. Navigate to Admin > Onboard Employee
2. Enter employee details (name, email, password)
3. Assign to projects (optional)
4. Submit to create account
5. New employee can login immediately
```

### Employee: Time Tracking

```
1. Login with credentials
2. Clock in (9:00 AM)
3. Create timecard entries for projects
4. Clock out (5:30 PM)
5. Timecard ready for review
```

### Manager: Team Overview

```
1. Login with manager credentials
2. View Projects dashboard
3. See all team assignments
4. Check timecards for payroll
5. Approve pending assignments
```

---

## Security Features

- Password hashing with Bcrypt
- JWT token authentication
- Pydantic input validation
- SQLAlchemy ORM protection against SQL injection
- 24-hour token expiration
- CORS protection
- Role-based access control

---

## Troubleshooting

### Backend Issues

```bash
# Check Python version
python --version  # Requires 3.9+

# Reinstall dependencies
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Reset database
rm timecard.db
PYTHONPATH=. python src/app/db/init_db.py
PYTHONPATH=. python scripts/seed_data.py
```

### Frontend Issues

```bash
# Check Node version
node --version  # Requires 18+

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check backend connection
curl http://localhost:8000/health

# Restart dev server
npm run dev
```

### Port Conflicts

```bash
# Backend on different port
python -m uvicorn src.app.main:app --reload --port 8001

# Frontend on different port
npm run dev -- --port 5174
```

---

## Technology Stack

### Backend
- FastAPI (web framework)
- SQLAlchemy (ORM)
- Pydantic (validation)
- JWT (authentication)
- Bcrypt (password hashing)
- SQLite/PostgreSQL (database)

### Frontend
- React 19 (UI library)
- TypeScript (type safety)
- Vite (build tool)
- Tailwind CSS (styling)
- React Query (data fetching)
- React Router (navigation)
- Axios (HTTP client)

---

## Contributing

1. Fork the repository
2. Create feature branch: git checkout -b feature/your-feature
3. Commit changes: git commit -m 'Add feature'
4. Push to branch: git push origin feature/your-feature
5. Open Pull Request

---

## License

MIT License - See LICENSE file

---

## Support

- API Documentation: http://localhost:8000/api/v1/docs
- Health Check: http://localhost:8000/health
- Report Issues: Open GitHub issue

Built with FastAPI, React, and Clean Architecture principles.
