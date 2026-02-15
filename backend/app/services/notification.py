from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from ..database import get_db

class NotificationService:
    @staticmethod
    async def create_notification(notification_data: dict) -> dict:
        """Create a new notification"""
        try:
            db = await get_db()
            notifications_collection = db['notifications']
            
            notification = {
                **notification_data,
                "createdAt": datetime.utcnow(),
                "read": False
            }
            
            result = await notifications_collection.insert_one(notification)
            notification['id'] = str(result.inserted_id)
            notification['_id'] = str(result.inserted_id)
            
            print(f"[NOTIFICATION_SERVICE] Created notification: {notification['id']}")
            return notification
            
        except Exception as e:
            print(f"[NOTIFICATION_SERVICE] Error creating notification: {e}")
            raise e

    @staticmethod
    async def get_notifications(user_id: str) -> List[dict]:
        """Get all notifications for a user"""
        try:
            db = await get_db()
            notifications_collection = db['notifications']
            
            cursor = notifications_collection.find(
                {"userId": user_id}
            ).sort("createdAt", -1)
            
            notifications = []
            async for notification in cursor:
                notification['id'] = str(notification['_id'])
                del notification['_id']  # Remove _id to avoid serialization issues
                # Convert any other ObjectId fields
                if 'billId' in notification and isinstance(notification['billId'], ObjectId):
                    notification['billId'] = str(notification['billId'])
                notifications.append(notification)
            
            print(f"[NOTIFICATION_SERVICE] Retrieved {len(notifications)} notifications for user {user_id}")
            return notifications
            
        except Exception as e:
            print(f"[NOTIFICATION_SERVICE] Error fetching notifications: {e}")
            raise e

    @staticmethod
    async def mark_as_read(user_id: str, notification_id: str) -> dict:
        """Mark a notification as read"""
        try:
            db = await get_db()
            notifications_collection = db['notifications']
            
            result = await notifications_collection.update_one(
                {"_id": ObjectId(notification_id), "userId": user_id},
                {"$set": {"read": True}}
            )
            
            if result.matched_count == 0:
                raise Exception("Notification not found")
            
            print(f"[NOTIFICATION_SERVICE] Marked notification {notification_id} as read")
            return {"id": notification_id, "read": True}
            
        except Exception as e:
            print(f"[NOTIFICATION_SERVICE] Error marking notification as read: {e}")
            raise e

    @staticmethod
    async def delete_notification(user_id: str, notification_id: str) -> dict:
        """Delete a notification"""
        try:
            db = await get_db()
            notifications_collection = db['notifications']
            
            result = await notifications_collection.delete_one(
                {"_id": ObjectId(notification_id), "userId": user_id}
            )
            
            if result.deleted_count == 0:
                raise Exception("Notification not found")
            
            print(f"[NOTIFICATION_SERVICE] Deleted notification {notification_id}")
            return {"id": notification_id, "deleted": True}
            
        except Exception as e:
            print(f"[NOTIFICATION_SERVICE] Error deleting notification: {e}")
            raise e
