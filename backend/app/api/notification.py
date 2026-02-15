from fastapi import APIRouter, HTTPException, Header, Depends
from ..services.notification import NotificationService
from ..utils.auth import extract_token_from_header, verify_supabase_token, extract_user_id_from_token

router = APIRouter()

# Dependency for extracting user from token
async def get_current_user(authorization: str = Header(None)):
    """Extract user from JWT token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header")
    
    token = extract_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    is_valid = await verify_supabase_token(token)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = extract_user_id_from_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not extract user ID from token")
    
    return user_id

@router.get("/")
async def get_notifications(user_id: str = Depends(get_current_user)):
    """Get all notifications for the current user"""
    try:
        notifications = await NotificationService.get_notifications(user_id)
        return {
            "status": "success",
            "data": notifications
        }
    except Exception as e:
        print(f"[NOTIFICATION_API] Error fetching notifications: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    user_id: str = Depends(get_current_user)
):
    """Mark a notification as read"""
    try:
        result = await NotificationService.mark_as_read(user_id, notification_id)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        print(f"[NOTIFICATION_API] Error marking notification as read: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a notification"""
    try:
        result = await NotificationService.delete_notification(user_id, notification_id)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        print(f"[NOTIFICATION_API] Error deleting notification: {e}")
        raise HTTPException(status_code=400, detail=str(e))
