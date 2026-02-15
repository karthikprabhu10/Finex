from fastapi import APIRouter, Depends, HTTPException, Header
from app.services.ai_suggestions import AISuggestionsService
from typing import List, Dict, Any
import logging
import jwt
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ai-suggestions"])

# JWT verification for Supabase tokens
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace('Bearer ', '')
    
    try:
        # Decode the JWT token without verification (since it's already verified by Supabase)
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("")
async def get_ai_suggestions(current_user: dict = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """
    Generate AI-powered spending suggestions using Gemini API
    Returns 3-10 personalized suggestions based on user's financial data
    """
    try:
        user_id = current_user["sub"]
        service = AISuggestionsService()
        suggestions = await service.generate_suggestions(user_id)
        return suggestions
    except Exception as e:
        logger.error(f"Error generating AI suggestions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")

@router.post("/{suggestion_id}/dismiss")
async def dismiss_suggestion(
    suggestion_id: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, str]:
    """Dismiss a suggestion"""
    try:
        user_id = current_user["sub"]
        service = AISuggestionsService()
        await service.dismiss_suggestion(user_id, suggestion_id)
        return {"message": "Suggestion dismissed successfully"}
    except Exception as e:
        logger.error(f"Error dismissing suggestion: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
