from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Import database functions
from .database import connect_to_mongo, close_mongo_connection
from .db_init import init_database

# Import routers
from .api import receipts, health, admin, auth, budget, bill, analytics, notification, ai_suggestions, subscription, profile
from .config import settings

app = FastAPI(
    title=settings.api_title,
    description="Receipt Management & Expense Tracking API",
    version=settings.api_version
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(receipts.router, prefix="/api/receipts", tags=["Receipts"])
app.include_router(budget.router, prefix="/api/budget", tags=["Budget"])
app.include_router(bill.router, prefix="/api/bills", tags=["Bills"])
app.include_router(notification.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(ai_suggestions.router, prefix="/api/ai-suggestions", tags=["AI Suggestions"])
app.include_router(subscription.router, prefix="/api/subscriptions", tags=["Subscriptions"])
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Finex API",
        "version": settings.api_version,
        "docs": "/docs",
        "status": "running",
        "database": "MongoDB Atlas",
        "debug": settings.debug
    }

# Disable startup/shutdown events for now - they were causing crashes
# @app.on_event("startup")
# async def startup_event():
#     """Create necessary directories on startup"""
#     os.makedirs(settings.upload_dir, exist_ok=True)
#     os.makedirs(settings.thumbnail_dir, exist_ok=True)
#     os.makedirs(settings.processed_dir, exist_ok=True)
#     print(f"[OK] Directories created: {settings.upload_dir}, {settings.thumbnail_dir}, {settings.processed_dir}")
#     # Don't connect to MongoDB here - let routes handle it lazily

# Disable shutdown event for now - it was causing crashes
# @app.on_event("shutdown")
# async def shutdown_event():
#     """Close MongoDB connection on shutdown"""
#     await close_mongo_connection()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
