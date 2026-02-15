from fastapi import APIRouter, HTTPException, Header, Depends
from ..services.budget import BudgetService
from ..models.budget import BudgetCreate, BudgetUpdate
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
async def create_or_update_budget(
    budget: BudgetCreate,
    user_id: str = Depends(get_current_user)
):
    """Create or update user budget"""
    try:
        print(f"[BUDGET_API] POST request received - User ID: {user_id}")
        print(f"[BUDGET_API] Budget data: {budget}")
        budget.userId = user_id
        result = await BudgetService.create_budget(budget)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        print(f"[BUDGET_API] Error creating budget: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
async def get_budget(user_id: str = Depends(get_current_user)):
    """Get user's budget"""
    try:
        budget = await BudgetService.get_budget(user_id)
        if not budget:
            return {
                "status": "success",
                "data": None,
                "message": "No budget found"
            }
        return {
            "status": "success",
            "data": budget
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/")
async def update_budget(
    update: BudgetUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update user's budget"""
    try:
        result = await BudgetService.update_budget(user_id, update)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/")
async def delete_budget(user_id: str = Depends(get_current_user)):
    """Delete user's budget"""
    try:
        result = await BudgetService.delete_budget(user_id)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
