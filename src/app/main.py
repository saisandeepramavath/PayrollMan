"""
FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.app.core.config import settings
from src.app.api.v1.router import api_router
from src.app.db.init_db import init_db

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-ready timecard management API",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
async def startup_event():
    """Application startup"""
    init_db()
    print(f"✓ {settings.APP_NAME} v{settings.APP_VERSION} started")
    print(f"✓ Environment: {settings.ENVIRONMENT}")
    print(f"✓ Debug: {settings.DEBUG}")
    print(f"✓ API Docs: http://localhost:8000{settings.API_V1_PREFIX}/docs")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": f"{settings.API_V1_PREFIX}/docs",
        "status": "operational"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }
