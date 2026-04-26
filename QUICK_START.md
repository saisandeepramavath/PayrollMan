# 🚀 Quick Start Guide

Get your Timecard API running in 5 minutes!

## Prerequisites Check

```bash
# Check Python version (need 3.9+)
python --version

# Check if you have pip
pip --version
```

## Installation Steps

### 1. Setup Environment

```bash
# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate # Mac/Linux
venv\Scripts\activate     # Windows
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
# Generate secret key
python -c "import secrets; print(secrets.token_urlsafe(50))"

# Create .env file
cat > .env << 'EOF'
SECRET_KEY=<paste-your-generated-key-here>
DATABASE_URL=sqlite:///./timecard.db
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
EOF
```

### 4. Initialize Database

```bash
# Run migrations
alembic upgrade head

# Seed test data (optional)
PYTHONPATH=. python scripts/seed_data.py
```

### 5. Start Server

```bash
uvicorn src.app.main:app --reload
```

## ✅ Verify Installation

### Health Check
```bash
curl http://localhost:8000/health
```

### Try API Docs
Open in browser: http://localhost:8000/api/v1/docs

### Test API

```bash
# Register a user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "full_name": "Test User"
  }'

# Login and get token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

## 🎓 Use Seeded Test Data

If you ran the seed script, you can login with:

**Manager:**
- Email: `sunil@company.com`
- Password: `sunil123`

**Employees:**
- `sandeep@company.com` / `sandeep123`
- `nithikesh@company.com` / `nithikesh123`
- `sumeeth@company.com` / `sumeeth123`
- `jatin@company.com` / `jatin123`
- `aditya@company.com` / `aditya123`

See [TEAM_CREDENTIALS.md](TEAM_CREDENTIALS.md) for full details.

## 📚 Next Steps

1. **Read API Docs:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
2. **Explore Swagger:** http://localhost:8000/api/v1/docs
3. **Run Tests:** `pytest`
4. **Read Architecture:** [PROFESSOR_README.md](PROFESSOR_README.md)

## 🆘 Troubleshooting

### "ModuleNotFoundError"
```bash
# Make sure you're in virtual environment
which python  # Should show venv path
pip install -r requirements.txt
```

### "Database errors"
```bash
# Reset database
rm timecard.db
alembic upgrade head
```

### "Port already in use"
```bash
# Use different port
uvicorn src.app.main:app --reload --port 8001
```

### "Import errors"
```bash
# Set PYTHONPATH
export PYTHONPATH=.  # Mac/Linux
set PYTHONPATH=.     # Windows CMD
$env:PYTHONPATH="."  # Windows PowerShell
```

## 🎯 Happy Coding!

You're all set! Start building amazing time tracking features! 🚀
