# API Reference

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication

All protected endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2026-03-25T10:00:00Z"
}
```

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### Get Current User
```http
GET /auth/me
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2026-03-25T10:00:00Z"
}
```

---

## Timecard Endpoints

### Create Timecard
```http
POST /timecards/
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "date": "2026-03-25T09:00:00Z",
  "hours_worked": 8.0,
  "description": "Working on API development",
  "project": "Backend API"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "user_id": 1,
  "date": "2026-03-25T09:00:00Z",
  "hours_worked": 8.0,
  "description": "Working on API development",
  "project": "Backend API",
  "created_at": "2026-03-25T10:00:00Z",
  "updated_at": null
}
```

### Get All Timecards
```http
GET /timecards/
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "user_id": 1,
    "date": "2026-03-25T09:00:00Z",
    "hours_worked": 8.0,
    "description": "Working on API development",
    "project": "Backend API",
    "created_at": "2026-03-25T10:00:00Z",
    "updated_at": null
  }
]
```

### Get Specific Timecard
```http
GET /timecards/{timecard_id}
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK` or `404 Not Found`

### Update Timecard
```http
PUT /timecards/{timecard_id}
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "hours_worked": 9.0,
  "description": "Updated description"
}
```

**Response:** `200 OK`

### Delete Timecard
```http
DELETE /timecards/{timecard_id}
```

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Error message"
}
```

### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

### 403 Forbidden
```json
{
  "detail": "User account is inactive"
}
```

### 404 Not Found
```json
{
  "detail": "Timecard not found"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

---

## Interactive Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc
