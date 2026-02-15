"""
Database Initialization Module
Handles MongoDB collection creation, indexes, and seeding
"""

from .database import mongodb, ensure_mongo_connected
from .models.receipt import ReceiptCategory
from datetime import datetime


def init_database():
    """Initialize MongoDB collections and indexes"""
    db = ensure_mongo_connected()
    
    print("[DB] Initializing MongoDB collections and indexes...")
    
    # Create collections if they don't exist
    create_collections()
    
    # Create indexes
    create_indexes()
    
    # Seed initial data
    seed_initial_data()
    
    print("[DB] Database initialization complete!")


def create_collections():
    """Create collections in MongoDB"""
    db = ensure_mongo_connected()
    
    # Get existing collections
    existing_collections = db.list_collection_names()
    
    # Create receipts collection
    if "receipts" not in existing_collections:
        db.create_collection("receipts")
        print("[DB] Created 'receipts' collection")
    
    # Create categories collection
    if "categories" not in existing_collections:
        db.create_collection("categories")
        print("[DB] Created 'categories' collection")
    
    # Create users collection
    if "users" not in existing_collections:
        db.create_collection("users")
        print("[DB] Created 'users' collection")
    
    # Create settings collection
    if "settings" not in existing_collections:
        db.create_collection("settings")
        print("[DB] Created 'settings' collection")


def create_indexes():
    """Create indexes for better query performance"""
    db = ensure_mongo_connected()
    
    # Receipt indexes
    receipts = db["receipts"]
    receipts.create_index("date")
    receipts.create_index("category")
    receipts.create_index("storeName")
    receipts.create_index([("createdAt", -1)])  # Descending for recent first
    receipts.create_index([("totalAmount", 1)])
    print("[DB] Created indexes for 'receipts' collection")
    
    # Category indexes
    categories = db["categories"]
    categories.create_index("name", unique=True)
    print("[DB] Created indexes for 'categories' collection")
    
    # User indexes
    users = db["users"]
    users.create_index("email", unique=True)
    users.create_index("username", unique=True)
    print("[DB] Created indexes for 'users' collection")


def seed_initial_data():
    """Seed initial data into MongoDB"""
    db = ensure_mongo_connected()
    categories = db["categories"]
    
    # Check if categories already seeded
    existing_count = categories.count_documents({})
    if existing_count > 0:
        print("[DB] Categories already seeded, skipping...")
        return
    
    # Insert default categories
    default_categories = [
        {"name": "Food & Dining", "icon": "🍽️", "color": "#FF6B6B"},
        {"name": "Groceries", "icon": "🛒", "color": "#4ECDC4"},
        {"name": "Transportation", "icon": "🚗", "color": "#45B7D1"},
        {"name": "Shopping", "icon": "🛍️", "color": "#FFA07A"},
        {"name": "Entertainment", "icon": "🎬", "color": "#98D8C8"},
        {"name": "Utilities", "icon": "💡", "color": "#F7DC6F"},
        {"name": "Healthcare", "icon": "⚕️", "color": "#BB8FCE"},
        {"name": "Travel", "icon": "✈️", "color": "#85C1E2"},
        {"name": "Education", "icon": "📚", "color": "#5DADE2"},
        {"name": "Office Supplies", "icon": "📎", "color": "#52BE80"},
        {"name": "Other", "icon": "📝", "color": "#95A5A6"},
    ]
    
    categories.insert_many(default_categories)
    print(f"[DB] Seeded {len(default_categories)} categories")
    
    # Insert a sample receipt for testing
    sample_receipt = {
        "storeName": "Sample Store",
        "date": datetime.utcnow().isoformat(),
        "totalAmount": 50.00,
        "category": "Food & Dining",
        "items": [
            {
                "name": "Item 1",
                "quantity": 2,
                "price": 15.00,
                "total": 30.00
            },
            {
                "name": "Item 2",
                "quantity": 1,
                "price": 20.00,
                "total": 20.00
            }
        ],
        "description": "Sample receipt for testing",
        "fileUrl": None,
        "imageUrl": None,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
        "status": "completed"
    }
    
    receipts = db["receipts"]
    result = receipts.insert_one(sample_receipt)
    print(f"[DB] Created sample receipt with ID: {result.inserted_id}")


def reset_database():
    """Drop all collections and reset database"""
    db = ensure_mongo_connected()
    collections = db.list_collection_names()
    
    for collection in collections:
        if collection not in ["admin", "config", "local"]:  # Don't drop system collections
            db.drop_collection(collection)
            print(f"[DB] Dropped collection: {collection}")
    
    print("[DB] Database reset complete!")


def get_db_stats():
    """Get database statistics"""
    db = ensure_mongo_connected()
    
    stats = {
        "databases": mongodb.client.list_database_names() if mongodb.client else [],
        "collections": db.list_collection_names(),
        "receipts_count": db["receipts"].count_documents({}) if "receipts" in db.list_collection_names() else 0,
        "categories_count": db["categories"].count_documents({}) if "categories" in db.list_collection_names() else 0,
    }
    
    return stats
