import os
from typing import Optional, Dict, Any

try:
    from supabase import create_client
except ImportError:
    create_client = None

# Initialize Supabase client
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY', '')

_supabase_client: Optional[Any] = None


def get_supabase_client() -> Optional[Any]:
    """Get or create Supabase client"""
    global _supabase_client
    
    if _supabase_client is None and SUPABASE_URL and SUPABASE_KEY and create_client:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    return _supabase_client


async def create_user_in_mongodb(user_id: str, email: str, full_name: str = '', db=None) -> bool:
    """
    Create user record in MongoDB when Supabase user is created.
    
    Args:
        user_id: User ID from Supabase
        email: User email
        full_name: User's full name
        db: MongoDB database instance
    
    Returns:
        True if user created successfully, False otherwise
    """
    if not db:
        return False
    
    try:
        users_collection = db['users']
        
        # Check if user already exists
        existing = await users_collection.find_one({'user_id': user_id})
        if existing:
            return True
        
        # Create new user document
        user_doc = {
            'user_id': user_id,
            'email': email,
            'full_name': full_name,
            'created_at': __import__('datetime').datetime.utcnow(),
            'updated_at': __import__('datetime').datetime.utcnow(),
            'preferences': {
                'currency': 'USD',
                'notifications': True,
            },
            'subscription': {
                'plan': 'free',
                'status': 'active',
            }
        }
        
        result = await users_collection.insert_one(user_doc)
        return result.inserted_id is not None
    
    except Exception as e:
        print(f"Error creating user in MongoDB: {e}")
        return False


async def get_user_from_mongodb(user_id: str, db=None) -> Optional[Dict[str, Any]]:
    """Get user from MongoDB"""
    if not db:
        return None
    
    try:
        users_collection = db['users']
        user = await users_collection.find_one({'user_id': user_id})
        return user
    except Exception as e:
        print(f"Error fetching user from MongoDB: {e}")
        return None
