from fastapi import APIRouter, Depends, Header, HTTPException, Query
from typing import Optional
from datetime import datetime
from ..services.analytics import AnalyticsService
from ..models.analytics import AnalyticsResponse
from ..utils.auth import extract_token_from_header, verify_supabase_token, extract_user_id_from_token

router = APIRouter()

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

@router.get("/", response_model=AnalyticsResponse)
async def get_analytics(
    startDate: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    endDate: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    user_id: str = Depends(get_current_user)
):
    """
    Get comprehensive analytics for the current user with optional date filtering
    """
    print(f"[Analytics API] Fetching analytics for user: {user_id}")
    print(f"[Analytics API] Date range: {startDate} to {endDate}")
    
    # Parse dates if provided
    start_dt = None
    end_dt = None
    if startDate:
        try:
            start_dt = datetime.strptime(startDate, "%Y-%m-%d")
        except ValueError:
            pass
    if endDate:
        try:
            end_dt = datetime.strptime(endDate, "%Y-%m-%d")
            # Set to end of day
            end_dt = end_dt.replace(hour=23, minute=59, second=59)
        except ValueError:
            pass
    
    analytics = await AnalyticsService.get_analytics(user_id, start_dt, end_dt)
    print(f"[Analytics API] Analytics generated successfully")
    return analytics
