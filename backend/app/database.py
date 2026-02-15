from pymongo import MongoClient
from pymongo.database import Database
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from .config import settings
from typing import Optional
from urllib.parse import quote_plus

class MongoDB:
    """MongoDB connection manager"""
    client: Optional[MongoClient] = None
    db: Optional[Database] = None
    async_client: Optional[AsyncIOMotorClient] = None
    async_db: Optional[AsyncIOMotorDatabase] = None

mongodb = MongoDB()

def _get_escaped_mongodb_url(url: str) -> str:
    """Escape special characters in MongoDB URL according to RFC 3986"""
    if '@' in url and '://' in url:
        # Check if credentials are already escaped (contains %)
        if '%' not in url.split('@')[0]:
            # Extract connection string parts: mongodb+srv://username:password@cluster...
            scheme_and_creds = url.split('@')[0]  # mongodb+srv://username:password
            rest = '@' + '@'.join(url.split('@')[1:])  # @cluster.mongodb.net/...
            
            scheme = scheme_and_creds.split('://')[0]  # mongodb+srv
            creds = scheme_and_creds.split('://')[1]  # username:password
            
            if ':' in creds:
                username, password = creds.split(':', 1)
                # Escape both username and password using RFC 3986
                username_escaped = quote_plus(username)
                password_escaped = quote_plus(password)
                return f"{scheme}://{username_escaped}:{password_escaped}{rest}"
    return url

async def connect_to_mongo():
    """Connect to MongoDB on app startup (async connection)"""
    try:
        # Properly escape the MongoDB URL credentials
        escaped_url = _get_escaped_mongodb_url(settings.mongodb_url)
        
        # Create async client
        mongodb.async_client = AsyncIOMotorClient(
            escaped_url, 
            serverSelectionTimeoutMS=30000, 
            connectTimeoutMS=30000
        )
        
        # Verify connection
        try:
            await mongodb.async_client.admin.command('ping')
        except Exception as ping_error:
            print(f"[WARN] Ping failed but continuing: {ping_error}")
        
        mongodb.async_db = mongodb.async_client[settings.db_name]
        print("[OK] Connected to MongoDB Atlas (async)")
    except Exception as e:
        print(f"[ERROR] Failed to connect to MongoDB: {e}")
        # Don't raise - allow app to start even if DB isn't ready

async def close_mongo_connection():
    """Close MongoDB connection on app shutdown"""
    if mongodb.async_client:
        mongodb.async_client.close()
        print("[OK] Disconnected from MongoDB")

def ensure_mongo_connected():
    """Ensure MongoDB is connected - connects lazily if not already connected (sync version)"""
    if mongodb.db is None:
        print("[DB] Connecting to MongoDB (lazy connection - sync)...")
        try:
            escaped_url = _get_escaped_mongodb_url(settings.mongodb_url)
            mongodb.client = MongoClient(escaped_url, serverSelectionTimeoutMS=30000, connectTimeoutMS=30000)
            
            # Verify connection
            try:
                mongodb.client.admin.command('ping')
            except Exception as ping_error:
                print(f"[WARN] Ping failed but continuing: {ping_error}")
            
            mongodb.db = mongodb.client[settings.db_name]
            print("[OK] Connected to MongoDB Atlas (lazy)")
        except Exception as e:
            print(f"[ERROR] Failed to connect to MongoDB: {e}")
            raise RuntimeError(f"Cannot connect to MongoDB: {e}")
    return mongodb.db

async def get_db() -> AsyncIOMotorDatabase:
    """Dependency injection for async MongoDB database"""
    if mongodb.async_db is None:
        print("[DB] Async database not connected. Attempting to connect...")
        await connect_to_mongo()
    
    if mongodb.async_db is None:
        raise RuntimeError("Cannot connect to MongoDB")
    
    return mongodb.async_db