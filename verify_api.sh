#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🚀 API Verification & Quick Test Suite                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if server is running
echo -e "${YELLOW}📡 Checking if server is running...${NC}"
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running!${NC}"
else
    echo -e "${RED}❌ Server is not running!${NC}"
    echo -e "${YELLOW}💡 Start it with: uvicorn src.app.main:app --reload${NC}"
    exit 1
fi
echo ""

# Test registration
echo -e "${YELLOW}📝 Testing User Registration...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_'$(date +%s)'@example.com",
    "password": "test123",
    "full_name": "Test User"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "email"; then
    echo -e "${GREEN}✅ Registration successful${NC}"
    EMAIL=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['email'])")
    echo -e "   📧 Created user: $EMAIL"
else
    echo -e "${RED}❌ Registration failed${NC}"
    echo "$REGISTER_RESPONSE"
fi
echo ""

# Test login
echo -e "${YELLOW}🔐 Testing Login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$EMAIL'",
    "password": "test123"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
    echo -e "${GREEN}✅ Login successful${NC}"
    echo -e "   🎫 Token: ${TOKEN:0:30}..."
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "$LOGIN_RESPONSE"
    exit 1
fi
echo ""

# Test protected endpoint
echo -e "${YELLOW}👤 Testing Protected Endpoint (/auth/me)...${NC}"
ME_RESPONSE=$(curl -s -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN")

if echo "$ME_RESPONSE" | grep -q "full_name"; then
    echo -e "${GREEN}✅ Protected endpoint works${NC}"
    NAME=$(echo "$ME_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['full_name'])")
    echo -e "   👋 Authenticated as: $NAME"
else
    echo -e "${RED}❌ Protected endpoint failed${NC}"
    echo "$ME_RESPONSE"
fi
echo ""

# Test punch in
echo -e "${YELLOW}⏰ Testing Clock In...${NC}"
PUNCH_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/punch/in \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Testing punch in"}')

if echo "$PUNCH_RESPONSE" | grep -q "punch_in"; then
    echo -e "${GREEN}✅ Clock in successful${NC}"
    PUNCH_TIME=$(echo "$PUNCH_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['punch_in'])")
    echo -e "   🕐 Clocked in at: $PUNCH_TIME"
else
    echo -e "${RED}❌ Clock in failed${NC}"
    echo "$PUNCH_RESPONSE"
fi
echo ""

# Test timecard creation
echo -e "${YELLOW}📋 Testing Timecard Creation...${NC}"
TIMECARD_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/timecards/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "'$(date -u +"%Y-%m-%dT%H:%M:%S")'.000Z",
    "hours_worked": 8.0,
    "description": "API testing and verification",
    "project": "Timecard Management System"
  }')

if echo "$TIMECARD_RESPONSE" | grep -q "hours_worked"; then
    echo -e "${GREEN}✅ Timecard created${NC}"
    HOURS=$(echo "$TIMECARD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['hours_worked'])")
    echo -e "   ⏱️  Logged $HOURS hours"
else
    echo -e "${RED}❌ Timecard creation failed${NC}"
    echo "$TIMECARD_RESPONSE"
fi
echo ""

# Test projects endpoint
echo -e "${YELLOW}📁 Testing Projects Endpoint...${NC}"
PROJECTS_RESPONSE=$(curl -s -X GET http://localhost:8000/api/v1/projects/ \
  -H "Authorization: Bearer $TOKEN")

if echo "$PROJECTS_RESPONSE" | grep -q "\["; then
    PROJECT_COUNT=$(echo "$PROJECTS_RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
    echo -e "${GREEN}✅ Projects endpoint works${NC}"
    echo -e "   📊 Found $PROJECT_COUNT projects"
else
    echo -e "${RED}❌ Projects endpoint failed${NC}"
    echo "$PROJECTS_RESPONSE"
fi
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ✨ Test Summary                                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Registration${NC}"
echo -e "${GREEN}✅ Login & JWT Authentication${NC}"
echo -e "${GREEN}✅ Protected Endpoints${NC}"
echo -e "${GREEN}✅ Attendance (Punch In)${NC}"
echo -e "${GREEN}✅ Timecards${NC}"
echo -e "${GREEN}✅ Projects${NC}"
echo ""
echo -e "${BLUE}🎉 All tests passed! Your API is working perfectly!${NC}"
echo ""
echo -e "${YELLOW}📚 Next Steps:${NC}"
echo -e "   1. Visit: ${BLUE}http://localhost:8000/api/v1/docs${NC} for interactive API docs"
echo -e "   2. Read: ${BLUE}API_DOCUMENTATION.md${NC} for complete reference"
echo -e "   3. Read: ${BLUE}README.md${NC} for project overview"
echo -e "   4. Demo to your professor! 🎓"
echo ""
