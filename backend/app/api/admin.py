"""
Database Admin API Endpoints
Administrative endpoints for database management
"""

from fastapi import APIRouter, HTTPException
from ..db_init import get_db_stats, reset_database, init_database
from ..database import mongodb, ensure_mongo_connected

router = APIRouter()


@router.post("/init")
async def initialize_database():
    """Initialize database collections and seed data"""
    try:
        init_database()
        return {
            "status": "success",
            "message": "Database initialized successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/reset")
async def reset_db():
    """Reset database (drop all collections except system ones)"""
    try:
        reset_database()
        # Re-initialize after reset
        init_database()
        return {
            "status": "success",
            "message": "Database reset and re-initialized successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_database_stats():
    """Get database statistics"""
    try:
        stats = get_db_stats()
        return {
            "status": "success",
            "data": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/info")
async def get_database_info():
    """Get basic database information"""
    try:
        db = ensure_mongo_connected()
        
        return {
            "status": "connected",
            "database": db.name,
            "collections": db.list_collection_names(),            "client": str(mongodb.client.address) if mongodb.client else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))