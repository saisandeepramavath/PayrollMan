# Timecard Management Backend API

[![CI](https://github.com/YOUR_USERNAME/timecard_backend_full/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/timecard_backend_full/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/timecard_backend_full/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/timecard_backend_full)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)

Production-ready FastAPI backend with clean architecture.

## 🏗️ Architecture

This project follows **Clean Architecture** principles with clear separation of concerns:

```
├── src/app/              # Application code
│   ├── api/             # API layer (routes, endpoints)
│   ├── core/            # Core business logic
│   ├── db/              # Database layer
│   ├── models/          # Data models (ORM)
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business services
│   └── utils/           # Utilities
├── tests/               # Test suite
├── alembic/             # Database migrations
├── scripts/             # Utility scripts
```

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- PostgreSQL (or SQLite for dev)

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
alembic upgrade head

# Start development server
uvicorn src.app.main:app --reload
```

Visit: http://localhost:8000/docs

## 📚 Documentation

- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **API Reference**: [docs/API.md](docs/API.md)

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src/app tests/

# Run specific test
pytest tests/test_auth.py
```

## 🛠️ Development

```bash
# Format code
black src/ tests/

# Lint
flake8 src/ tests/

# Type check
mypy src/

# Run all checks
./scripts/check.sh
```

## 📦 Project Structure

```
timecard_backend/
│
├── src/app/                    # Application source code
│   ├── __init__.py
│   ├── main.py                # FastAPI application
│   │
│   ├── api/                   # API layer
│   │   ├── __init__.py
│   │   ├── deps.py            # Dependencies
│   │   └── v1/                # API version 1
│   │       ├── __init__.py
│   │       ├── router.py      # Main router
│   │       └── endpoints/     # Endpoint modules
│   │           ├── auth.py
│   │           ├── users.py
│   │           └── timecards.py
│   │
│   ├── core/                  # Core functionality
│   │   ├── __init__.py
│   │   ├── config.py          # Configuration
│   │   ├── security.py        # Security utilities
│   │   └── logging.py         # Logging setup
│   │
│   ├── db/                    # Database
│   │   ├── __init__.py
│   │   ├── base.py            # Base class
│   │   ├── session.py         # DB session
│   │   └── init_db.py         # DB initialization
│   │
│   ├── models/                # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── timecard.py
│   │
│   ├── schemas/               # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── auth.py
│   │   └── timecard.py
│   │
│   ├── services/              # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   └── timecard_service.py
│   │
│   └── utils/                 # Utilities
│       ├── __init__.py
│       └── helpers.py
│
├── tests/                     # Test suite
│   ├── __init__.py
│   ├── conftest.py           # Pytest fixtures
│   ├── test_auth.py
│   └── test_timecards.py
│
├── alembic/                   # Database migrations
│   ├── versions/
│   └── env.py
│
├── scripts/                   # Utility scripts
│   ├── init_db.py
│   └── seed_data.py
│
├── .env.example              # Environment template
├── .gitignore
├── alembic.ini               # Alembic config
├── pytest.ini                # Pytest config
├── requirements.txt          # Dependencies
└── README.md                 # This file
```

## 🔐 Security

- JWT authentication
- Password hashing with bcrypt
- CORS configured
- Input validation
- SQL injection protection

## 📝 Environment Variables

See [.env.example](.env.example) for all configuration options.

Required:
- `SECRET_KEY` - JWT secret key
- `DATABASE_URL` - Database connection string

## 🚢 Deployment

```bash
# Build Docker image
docker build -t timecard-api .

# Run with Docker
docker run -p 8000:8000 timecard-api
```

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request
