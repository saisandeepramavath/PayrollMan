# 🔐 How to Use Authentication in Swagger UI

## ✅ Fix Applied

Changed from `OAuth2PasswordBearer` to `HTTPBearer` for better Swagger UI compatibility.

---

## 📖 Step-by-Step Instructions

### 1️⃣ **Access Swagger UI**
Open your browser and go to:
```
http://localhost:8000/api/v1/docs
```

### 2️⃣ **Register a User** (if needed)
- Scroll to **Authentication** section
- Click on `POST /api/v1/auth/register`
- Click **"Try it out"**
- Enter:
```json
{
  "email": "test@example.com",
  "password": "test123",
  "full_name": "Test User"
}
```
- Click **Execute**
- Should get `201 Created`

### 3️⃣ **Login to Get Token**
- Click on `POST /api/v1/auth/login`
- Click **"Try it out"**
- Enter:
```json
{
  "email": "test@example.com",
  "password": "test123"
}
```
- Click **Execute**
- **COPY** the `access_token` from the response (everything between the quotes)

Example token:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwiZXhwIjoxNzc1MjI1MDI4fQ.S1qwbI_WqrRU33NW9oieDy7qxUqHUnBXBx7RIOVcJcA
```

### 4️⃣ **Authorize in Swagger UI**

Look for the **🔓 Authorize** button at the top right of the page.

- Click the **Authorize** button
- A dialog will appear with "HTTPBearer (http, Bearer)"
- In the **Value** field, paste your token (just the token, no "Bearer" prefix)
- Click **Authorize**
- Click **Close**

The 🔓 icon should change to 🔒 (locked), indicating you're authenticated!

### 5️⃣ **Test Protected Endpoints**

Now try any endpoint with a 🔒 lock icon:

#### Test: Get Current User
- Click `GET /api/v1/auth/me` (has 🔒 icon)
- Click **"Try it out"**
- Click **Execute**
- Should return your user information!

#### Test: Create Timecard
- Click `POST /api/v1/timecards/` (has 🔒 icon)
- Click **"Try it out"**
- Enter:
```json
{
  "date": "2026-04-02T09:00:00Z",
  "hours_worked": 8.0,
  "description": "Testing Swagger UI",
  "project": "API Development"
}
```
- Click **Execute**
- Should return `201 Created` with the timecard data!

### 6️⃣ **Test All Other Endpoints**

All these endpoints are now accessible with your token:
- ✅ `GET /api/v1/timecards/` - Get all your timecards
- ✅ `GET /api/v1/timecards/{id}` - Get specific timecard
- ✅ `PUT /api/v1/timecards/{id}` - Update timecard
- ✅ `DELETE /api/v1/timecards/{id}` - Delete timecard
- ✅ `POST /api/v1/punch/clock-in` - Clock in
- ✅ `POST /api/v1/punch/clock-out` - Clock out
- ✅ And all other protected endpoints...

---

## 🚫 Common Issues & Solutions

### Issue: "Not authenticated" error
**Cause:** Token not set or expired  
**Solution:** 
1. Login again to get a fresh token
2. Click Authorize button again
3. Paste the new token

### Issue: Token expired
**Cause:** Tokens expire after 24 hours (1440 minutes)  
**Solution:** Simply login again to get a new token

### Issue: Authorize button not showing
**Cause:** Server not restarted after code changes  
**Solution:** 
```bash
# Kill the server (Ctrl+C) and restart:
uvicorn src.app.main:app --reload
```

### Issue: 401 Unauthorized even with valid token
**Cause:** Token might be malformed or have extra spaces  
**Solution:** 
- Make sure you copied the entire token
- No extra spaces before/after
- Don't include "Bearer" when pasting in Swagger UI

---

## 🧪 Quick Test Commands (cURL)

If Swagger UI still has issues, use cURL to verify authentication works:

```bash
# 1. Login
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'

# 2. Copy the token from response, then use it:
TOKEN="your_token_here"

# 3. Test protected endpoint
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✨ What Changed?

**Before:** Used `OAuth2PasswordBearer` which required special OAuth2 flow  
**After:** Using `HTTPBearer` which shows a simple Bearer token authentication in Swagger UI

Both methods are secure and work the same - HTTPBearer just has better Swagger UI integration!

---

## 📚 Alternative Testing Methods

If you prefer not to use Swagger UI:

1. **Postman**: Import `Timecard_API.postman_collection.json`
2. **VS Code REST Client**: Use `api-tests.http`
3. **Python Script**: Run `python test_auth_flow.py`
4. **cURL**: See commands above

All methods work perfectly! ✅
