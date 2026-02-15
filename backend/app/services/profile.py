from typing import Optional
from datetime import datetime
from ..database import get_db
from ..models.profile import ProfileCreate, ProfileUpdate

class ProfileService:
    """Service for user profile operations"""
    
    @staticmethod
    async def get_collection():
        """Get profiles collection"""
        db = await get_db()
        return db["profiles"]
    
    @staticmethod
    async def get_or_create_profile(user_id: str, email: str = None) -> dict:
        """Get profile for a user, create if doesn't exist"""
        collection = await ProfileService.get_collection()
        
        profile = await collection.find_one({"userId": user_id})
        
        if profile:
            profile["id"] = str(profile["_id"])
            del profile["_id"]
            return profile
        
        # Create new profile
        new_profile = {
            "userId": user_id,
            "full_name": None,
            "phone": None,
            "location": None,
            "bio": None,
            "avatar_url": None,
            "email": email,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await collection.insert_one(new_profile)
        new_profile["id"] = str(result.inserted_id)
        if "_id" in new_profile:
            del new_profile["_id"]
        
        print(f"[PROFILE_CREATE] Created new profile for user: {user_id}")
        return new_profile
    
    @staticmethod
    async def get_profile(user_id: str) -> Optional[dict]:
        """Get profile for a user"""
        collection = await ProfileService.get_collection()
        
        profile = await collection.find_one({"userId": user_id})
        
        if profile:
            profile["id"] = str(profile["_id"])
            del profile["_id"]
            return profile
        
        return None
    
    @staticmethod
    async def update_profile(user_id: str, update: ProfileUpdate) -> dict:
        """Update or create a user profile"""
        collection = await ProfileService.get_collection()
        
        update_dict = {k: v for k, v in update.dict().items() if v is not None}
        update_dict["updatedAt"] = datetime.utcnow()
        
        print(f"[PROFILE_UPDATE] Updating profile for user {user_id}")
        
        # Upsert - create if doesn't exist
        result = await collection.update_one(
            {"userId": user_id},
            {
                "$set": update_dict,
                "$setOnInsert": {
                    "userId": user_id,
                    "createdAt": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        # Return updated profile
        updated = await collection.find_one({"userId": user_id})
        if updated:
            updated["id"] = str(updated["_id"])
            del updated["_id"]
            print(f"[PROFILE_UPDATE] Profile updated successfully")
            return updated
        
        return {"message": "Profile updated"}
    
    @staticmethod
    async def delete_old_avatar(user_id: str, new_avatar_url: str) -> None:
        """
        Note: Since we're storing avatars as base64 data URLs in the database,
        there's no file to delete. This function is here for future compatibility
        if we switch to file storage (Supabase Storage, S3, etc.)
        """
        pass
