# Clean Architecture Flow Documentation

## Architecture Layers

This project follows **Clean Architecture** principles with clear separation of concerns:

```
User/Client
    ↓
API Layer (Presentation)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Data Access)
    ↓
Model Layer (Database/ORM)
    ↓
Database
```

## Layer Responsibilities

### 1. **API Layer** (`src/app/api/`)
- **Purpose**: HTTP request/response handling
- **Responsibilities**:
  - Route definitions
  - Request validation (via Pydantic schemas)
  - Response serialization
  - Dependency injection
- **Rules**:
  - ✅ Imports: Schemas, Services, Dependencies
  - ❌ Does NOT import: Models (except in `deps.py` for type hints)
  - ❌ Does NOT do: Database queries, business logic

**Example Flow** ([auth.py](../src/app/api/v1/endpoints/auth.py)):
```python
@router.post("/login")
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    # ✅ Validates request with Schema
    # ✅ Delegates to Service layer
    token = AuthService.authenticate_user(db, credentials)
    return {"access_token": token}
```

### 2. **Dependency Layer** (`src/app/api/deps.py`)
- **Purpose**: Reusable dependencies for FastAPI
- **Responsibilities**:
  - Authentication/authorization
  - Dependency injection setup
  - Token validation
- **Rules**:
  - ✅ Can import: Models (for return types), Services, Core utilities
  - ✅ Delegates business logic to Services
  - ❌ Does NOT do: Complex business logic

**Example** ([deps.py](../src/app/api/deps.py)):
```python
def get_current_user(token: str, db: Session):
    # ✅ Decodes token (core utility)
    payload = decode_access_token(token)
    
    # ✅ Delegates user retrieval to Service
    user = AuthService.get_current_user(db, int(payload["sub"]))
    return user
```

### 3. **Service Layer** (`src/app/services/`)
- **Purpose**: Business logic implementation
- **Responsibilities**:
  - Business rules and validation
  - Complex operations
  - Orchestrating multiple repository calls
  - Error handling
- **Rules**:
  - ✅ Imports: Repositories, Schemas, Models, Core utilities
  - ✅ Uses Repositories for all data access
  - ❌ Does NOT do: Direct database queries (`db.query()`)
  - ❌ Does NOT import: API/endpoint code

**Example** ([auth_service.py](../src/app/services/auth_service.py)):
```python
class AuthService:
    @staticmethod
    def register_user(db: Session, user_data: UserCreate) -> User:
        # ✅ Business logic: Check if user exists
        existing_user = UserRepository.get_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(...)
        
        # ✅ Business logic: Hash password
        hashed_pw = hash_password(user_data.password)
        
        # ✅ Delegates data access to Repository
        user = UserRepository.create(db, user_data.email, hashed_pw, user_data.full_name)
        return user
```

### 4. **Repository Layer** (`src/app/repositories/`)
- **Purpose**: Data access abstraction
- **Responsibilities**:
  - Database queries
  - CRUD operations
  - Data persistence
  - Query optimization
- **Rules**:
  - ✅ Imports: Models only
  - ✅ Does: All `db.query()`, `db.add()`, `db.commit()` operations
  - ❌ Does NOT do: Business logic, validation
  - ❌ Does NOT import: Services, Schemas

**Example** ([user_repository.py](../src/app/repositories/user_repository.py)):
```python
class UserRepository:
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        # ✅ Pure data access - no business logic
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def create(db: Session, email: str, hashed_password: str, full_name: str) -> User:
        # ✅ Database operations only
        user = User(email=email, hashed_password=hashed_password, full_name=full_name, is_active=True)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
```

### 5. **Model Layer** (`src/app/models/`)
- **Purpose**: Database schema definition
- **Responsibilities**:
  - ORM model definitions
  - Table structure
  - Relationships
- **Rules**:
  - ✅ Imports: SQLAlchemy, Base class
  - ❌ Does NOT import: Anything from app logic

**Example** ([user.py](../src/app/models/user.py)):
```python
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # ✅ Relationships defined here
    timecards = relationship("Timecard", back_populates="user")
```

### 6. **Schema Layer** (`src/app/schemas/`)
- **Purpose**: Data validation and serialization
- **Responsibilities**:
  - Request validation
  - Response serialization
  - Type safety
- **Rules**:
  - ✅ Imports: Pydantic only
  - ✅ Used by: API and Service layers
  - ❌ Does NOT import: Models, Services

### 7. **Core Layer** (`src/app/core/`)
- **Purpose**: Shared utilities and configuration
- **Responsibilities**:
  - Configuration management
  - Security utilities (JWT, hashing)
  - Common utilities
- **Rules**:
  - ✅ Can be imported by any layer
  - ❌ Does NOT import: App logic (Services, Repositories, Models)

## Complete Request Flow Example

### User Login Flow:

```
1. Client: POST /api/v1/auth/login
   ↓
2. API Layer (auth.py):
   - Validates LoginRequest schema
   - Calls AuthService.authenticate_user()
   ↓
3. Service Layer (auth_service.py):
   - Calls UserRepository.get_by_email()
   - Verifies password (core utility)
   - Checks business rules (is_active)
   - Generates JWT token (core utility)
   ↓
4. Repository Layer (user_repository.py):
   - Executes db.query(User).filter(...)
   - Returns User model
   ↓
5. API Layer:
   - Returns TokenResponse schema
   ↓
6. Client: Receives JWT token
```

### Protected Endpoint Flow:

```
1. Client: GET /api/v1/timecards/ (with Bearer token)
   ↓
2. Dependency (deps.py):
   - Extracts token
   - Decodes token (core utility)
   - Calls AuthService.get_current_user()
   ↓
3. Service Layer (auth_service.py):
   - Calls UserRepository.get_by_id()
   - Validates business rules (is_active)
   - Returns User model
   ↓
4. API Layer (timecards.py):
   - Receives authenticated user
   - Calls TimecardService.get_user_timecards()
   ↓
5. Service Layer (timecard_service.py):
   - Calls TimecardRepository.get_all_by_user()
   ↓
6. Repository Layer (timecard_repository.py):
   - Executes db.query(Timecard).filter(...)
   - Returns List[Timecard]
   ↓
7. API Layer:
   - Serializes to List[TimecardResponse]
   ↓
8. Client: Receives timecard data
```

## Benefits of This Architecture

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Testability**: Easy to mock repositories and services
3. **Maintainability**: Changes in one layer don't affect others
4. **Flexibility**: Can swap database/ORM without changing business logic
5. **Scalability**: Clear structure for adding features
6. **Type Safety**: Proper use of schemas and models

## Anti-Patterns to Avoid

❌ **Direct database queries in Services**:
```python
# BAD
def get_user(db, user_id):
    return db.query(User).filter(User.id == user_id).first()
```

✅ **Use Repository**:
```python
# GOOD
def get_user(db, user_id):
    return UserRepository.get_by_id(db, user_id)
```

❌ **Business logic in API endpoints**:
```python
# BAD
@router.post("/register")
def register(user_data, db):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(...)
    user = User(...)
    db.add(user)
    ...
```

✅ **Delegate to Service**:
```python
# GOOD
@router.post("/register")
def register(user_data, db):
    return AuthService.register_user(db, user_data)
```

❌ **Importing Models in API endpoints**:
```python
# BAD
from src.app.models.user import User

@router.get("/users")
def get_users(current_user: User = Depends(...)):
    ...
```

✅ **Use duck typing or remove type hint**:
```python
# GOOD
@router.get("/users")
def get_users(current_user = Depends(get_current_user)):
    # FastAPI handles serialization via response_model
    ...
```

## Dependency Flow

```
API Layer
  ├─> Schemas (for validation)
  ├─> Services (for business logic)
  └─> Dependencies (for auth)

Service Layer
  ├─> Repositories (for data access)
  ├─> Schemas (for type hints)
  ├─> Models (for return types)
  └─> Core (for utilities)

Repository Layer
  └─> Models (only)

Dependencies
  ├─> Services (for business logic)
  ├─> Models (for return types)
  └─> Core (for token validation)

Core Layer
  └─> (No app dependencies)
```

## Verification Checklist

- [x] API endpoints only import Schemas and Services
- [x] Services use Repositories for all data access
- [x] Repositories only handle database queries
- [x] No circular dependencies
- [x] Dependencies delegate to Services
- [x] Models are only imported where necessary
- [x] Core utilities are stateless and reusable
- [x] Each layer has a single responsibility
