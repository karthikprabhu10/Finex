from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from ..database import get_db
from ..models.subscription import SubscriptionCreate, SubscriptionUpdate

class SubscriptionService:
    """Service for subscription operations"""
    
    @staticmethod
    async def get_collection():
        """Get subscriptions collection"""
        db = await get_db()
        return db["subscriptions"]
    
    @staticmethod
    async def create_subscription(subscription: SubscriptionCreate) -> dict:
        """Create a new subscription in MongoDB"""
        collection = await SubscriptionService.get_collection()
        
        print(f"[SUBSCRIPTION_CREATE] Creating subscription for user: {subscription.userId}, name: {subscription.name}")
        
        sub_dict = subscription.dict()
        sub_dict["createdAt"] = datetime.utcnow()
        sub_dict["updatedAt"] = datetime.utcnow()
        
        result = await collection.insert_one(sub_dict)
        print(f"[SUBSCRIPTION_CREATE] Subscription created with ID: {result.inserted_id}")
        
        # Return the full subscription object
        created = await collection.find_one({"_id": result.inserted_id})
        created["id"] = str(created["_id"])
        del created["_id"]
        return created
    
    @staticmethod
    async def get_subscriptions(user_id: str) -> List[dict]:
        """Get all subscriptions for a user"""
        collection = await SubscriptionService.get_collection()
        
        cursor = collection.find({"userId": user_id}).sort("nextBilling", 1)
        subscriptions = []
        async for sub in cursor:
            sub["id"] = str(sub["_id"])
            del sub["_id"]
            subscriptions.append(sub)
        
        print(f"[SUBSCRIPTION_GET] Retrieved {len(subscriptions)} subscriptions for user: {user_id}")
        return subscriptions
    
    @staticmethod
    async def get_subscription_by_id(user_id: str, sub_id: str) -> Optional[dict]:
        """Get a specific subscription by ID"""
        collection = await SubscriptionService.get_collection()
        
        try:
            sub = await collection.find_one({
                "_id": ObjectId(sub_id),
                "userId": user_id
            })
            if sub:
                sub["id"] = str(sub["_id"])
                del sub["_id"]
            return sub
        except Exception as e:
            print(f"[SUBSCRIPTION_GET] Error fetching subscription: {e}")
            return None
    
    @staticmethod
    async def update_subscription(user_id: str, sub_id: str, update: SubscriptionUpdate) -> Optional[dict]:
        """Update a subscription"""
        collection = await SubscriptionService.get_collection()
        
        update_dict = {k: v for k, v in update.dict().items() if v is not None}
        update_dict["updatedAt"] = datetime.utcnow()
        
        print(f"[SUBSCRIPTION_UPDATE] Updating subscription {sub_id} for user {user_id}")
        
        result = await collection.update_one(
            {"_id": ObjectId(sub_id), "userId": user_id},
            {"$set": update_dict}
        )
        
        if result.modified_count > 0:
            print(f"[SUBSCRIPTION_UPDATE] Subscription updated successfully")
            # Return updated subscription
            updated = await collection.find_one({"_id": ObjectId(sub_id)})
            if updated:
                updated["id"] = str(updated["_id"])
                del updated["_id"]
                return updated
        return None
    
    @staticmethod
    async def delete_subscription(user_id: str, sub_id: str) -> dict:
        """Delete a subscription"""
        collection = await SubscriptionService.get_collection()
        
        print(f"[SUBSCRIPTION_DELETE] Deleting subscription {sub_id} for user {user_id}")
        
        result = await collection.delete_one({
            "_id": ObjectId(sub_id),
            "userId": user_id
        })
        
        if result.deleted_count > 0:
            print(f"[SUBSCRIPTION_DELETE] Subscription deleted successfully")
            return {"message": "Subscription deleted successfully"}
        else:
            print(f"[SUBSCRIPTION_DELETE] Subscription not found")
            return {"message": "Subscription not found"}
    
    @staticmethod
    async def get_subscriptions_total(user_id: str) -> dict:
        """Get total monthly subscription cost"""
        collection = await SubscriptionService.get_collection()
        
        subscriptions = await SubscriptionService.get_subscriptions(user_id)
        
        monthly_total = 0.0
        for sub in subscriptions:
            amount = sub.get("amount", 0)
            frequency = sub.get("frequency", "Monthly")
            
            # Convert to monthly equivalent
            if frequency == "Weekly":
                monthly_total += amount * 4.33
            elif frequency == "Monthly":
                monthly_total += amount
            elif frequency == "Quarterly":
                monthly_total += amount / 3
            elif frequency == "Yearly":
                monthly_total += amount / 12
        
        return {
            "count": len(subscriptions),
            "monthlyTotal": round(monthly_total, 2)
        }
