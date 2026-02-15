from fastapi import APIRouter, HTTPException, Header, Depends
from ..services.profile import ProfileService
from ..models.profile import ProfileUpdate
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
async def get_profile(user_id: str = Depends(get_current_user)):
    """Get the current user's profile"""
    try:
        profile = await ProfileService.get_or_create_profile(user_id)
        return {
            "status": "success",
            "data": profile
        }
    except Exception as e:
        print(f"[PROFILE_API] Error fetching profile: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/")
async def update_profile(
    update: ProfileUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update the current user's profile"""
    try:
        print(f"[PROFILE_API] PUT request - User ID: {user_id}")
        result = await ProfileService.update_profile(user_id, update)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        print(f"[PROFILE_API] Error updating profile: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/avatar")
async def update_avatar(
    update: ProfileUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update just the avatar (for convenience)"""
    try:
        if not update.avatar_url:
            raise HTTPException(status_code=400, detail="avatar_url is required")
        
        print(f"[PROFILE_API] Avatar update for user: {user_id}")
        result = await ProfileService.update_profile(user_id, ProfileUpdate(avatar_url=update.avatar_url))
        return {
            "status": "success",
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[PROFILE_API] Error updating avatar: {e}")
        raise HTTPException(status_code=400, detail=str(e))
