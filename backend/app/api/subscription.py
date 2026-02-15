from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional
from ..services.subscription import SubscriptionService
from ..models.subscription import SubscriptionCreate, SubscriptionUpdate
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

@router.post("/")
async def create_subscription(
    subscription: SubscriptionCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new subscription"""
    try:
        print(f"[SUBSCRIPTION_API] POST request - User ID: {user_id}, Name: {subscription.name}")
        subscription.userId = user_id
        result = await SubscriptionService.create_subscription(subscription)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        print(f"[SUBSCRIPTION_API] Error creating subscription: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
async def get_subscriptions(user_id: str = Depends(get_current_user)):
    """Get all subscriptions for the current user"""
    try:
        subscriptions = await SubscriptionService.get_subscriptions(user_id)
        return {
            "status": "success",
            "data": subscriptions
        }
    except Exception as e:
        print(f"[SUBSCRIPTION_API] Error fetching subscriptions: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/total")
async def get_subscriptions_total(user_id: str = Depends(get_current_user)):
    """Get total monthly subscription cost"""
    try:
        total = await SubscriptionService.get_subscriptions_total(user_id)
        return {
            "status": "success",
            "data": total
        }
    except Exception as e:
        print(f"[SUBSCRIPTION_API] Error calculating total: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{sub_id}")
async def get_subscription(
    sub_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get a specific subscription by ID"""
    try:
        subscription = await SubscriptionService.get_subscription_by_id(user_id, sub_id)
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        return {
            "status": "success",
            "data": subscription
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[SUBSCRIPTION_API] Error fetching subscription: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{sub_id}")
async def update_subscription(
    sub_id: str,
    update: SubscriptionUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a subscription"""
    try:
        result = await SubscriptionService.update_subscription(user_id, sub_id, update)
        if not result:
            raise HTTPException(status_code=404, detail="Subscription not found or no changes made")
        return {
            "status": "success",
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[SUBSCRIPTION_API] Error updating subscription: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{sub_id}")
async def delete_subscription(
    sub_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a subscription"""
    try:
        result = await SubscriptionService.delete_subscription(user_id, sub_id)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        print(f"[SUBSCRIPTION_API] Error deleting subscription: {e}")
        raise HTTPException(status_code=400, detail=str(e))
