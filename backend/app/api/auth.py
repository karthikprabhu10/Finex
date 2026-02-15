from fastapi import APIRouter, HTTPException, Header, Depends
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
from datetime import datetime
from ..models.otp import OTPRequest, OTPVerification, OTPResponse
from ..services.otp_service import OTPService
from ..database import get_db
from ..config import settings
from motor.motor_asyncio import AsyncIOMotorDatabase
import os
from supabase import create_client

router = APIRouter(tags=["Authentication"])

# Get OTP service
async def get_otp_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> OTPService:
    """Dependency to get OTP service"""
    return OTPService(db)

# NOTE: Debug endpoint removed for security - OTP codes should never be exposed via API
# If you need to debug OTP issues, check MongoDB directly or use server logs

@router.get("/auth/debug/otp-info/{email}")
async def debug_otp_info(
    email: str,
    otp_service: OTPService = Depends(get_otp_service)
):
    """
    DEBUG ENDPOINT: Get OTP debug information (protected - only in debug mode)
    SECURITY: OTP code is NOT returned in response
    """
    # Security check - only allow in debug mode
    if not settings.debug:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        email = email.lower()
        otp_record = await otp_service.otp_collection.find_one({
            "email": email,
            "purpose": "signup"
        })
        
        if not otp_record:
            return {
                "success": False,
                "message": "No OTP found for this email",
                "current_server_time": datetime.utcnow().isoformat()
            }
        
        now = datetime.utcnow()
        created_at = otp_record.get('created_at')
        expires_at = otp_record.get('expires_at')
        
        # Try to parse if string
        if isinstance(expires_at, str):
            expires_at_obj = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        else:
            expires_at_obj = expires_at
        
        # Calculate time remaining
        if isinstance(expires_at_obj, datetime):
            time_remaining = (expires_at_obj - now).total_seconds()
            is_expired = time_remaining < 0
        else:
            time_remaining = None
            is_expired = None
        
        return {
            "success": True,
            "email": email,
            "created_at": str(created_at),
            "created_at_type": type(created_at).__name__,
            "expires_at": str(expires_at),
            "expires_at_type": type(expires_at).__name__,
            "current_server_time": str(now),
            "current_server_time_type": type(now).__name__,
            "is_expired": is_expired,
            "time_remaining_seconds": time_remaining,
            "verified": otp_record.get('verified'),
            "attempts": otp_record.get('attempts'),
            "last_request_time": str(otp_record.get('last_request_time')),
            # SECURITY: OTP code not exposed - use masked version only
            "otp_hint": f"****{otp_record.get('otp_code', '')[-2:]}" if otp_record.get('otp_code') else None
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error: {str(e)}",
            "current_server_time": datetime.utcnow().isoformat()
        }

@router.post("/auth/request-otp", response_model=OTPResponse)
async def request_otp(
    request: OTPRequest,
    otp_service: OTPService = Depends(get_otp_service)
):
    """
    Request OTP code for signup or password reset
    
    Args:
        request: OTPRequest with email and purpose
    
    Returns:
        OTPResponse with OTP generation status
    """
    try:
        # Validate email format
        if not request.email or "@" not in request.email:
            raise HTTPException(status_code=400, detail="Invalid email address")
        
        # Generate and send OTP
        result = await otp_service.generate_otp(request.email, request.purpose)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=429,
                detail=result.get("message", "Failed to generate OTP")
            )
        
        return OTPResponse(
            success=True,
            message=result.get("message", "OTP sent successfully"),
            otp_id=result.get("otp_id"),
            expires_in_seconds=result.get("expires_in_seconds"),
            masked_otp=result.get("masked_otp")
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[OTP] Error requesting OTP: {e}")
        raise HTTPException(status_code=500, detail="Failed to request OTP")

@router.post("/auth/verify-otp", response_model=OTPResponse)
async def verify_otp(
    request: OTPVerification,
    otp_service: OTPService = Depends(get_otp_service)
):
    """
    Verify OTP code and mark email as verified in Supabase
    
    Args:
        request: OTPVerification with email and OTP code
    
    Returns:
        OTPResponse with verification status
    """
    try:
        # Validate inputs
        if not request.email or "@" not in request.email:
            raise HTTPException(status_code=400, detail="Invalid email address")
        
        if not request.otp or len(request.otp) != 6 or not request.otp.isdigit():
            raise HTTPException(status_code=400, detail="OTP must be a 6-digit code")
        
        # Verify OTP
        result = await otp_service.verify_otp(request.email, request.otp, request.purpose)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("message", "OTP verification failed")
            )
        
        # Mark email as verified in Supabase for this email
        # This ensures users won't get "email not confirmed" errors
        try:
            if settings.supabase_url and settings.supabase_anon_key:
                supabase = create_client(settings.supabase_url, settings.supabase_anon_key)
                
                # Check if user exists in Supabase
                auth_response = supabase.auth.admin.list_users()
                user_exists = any(u.email == request.email for u in auth_response.data)
                
                if user_exists:
                    # User exists, update email_confirmed_at
                    user = next((u for u in auth_response.data if u.email == request.email), None)
                    if user:
                        supabase.auth.admin.update_user_by_id(
                            user.id,
                            {"email_confirmed_at": datetime.utcnow().isoformat()}
                        )
                        print(f"[OTP] ✅ Marked email as confirmed in Supabase for {request.email}")
                else:
                    print(f"[OTP] ℹ️  User not yet created in Supabase - will be marked as confirmed during signup")
        except Exception as supabase_error:
            print(f"[OTP] ⚠️  Could not update Supabase: {supabase_error}")
            # Don't fail the OTP verification if Supabase update fails
        
        return OTPResponse(
            success=True,
            message="OTP verified successfully",
            otp_id=result.get("otp_id")
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[OTP] Error verifying OTP: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify OTP")

@router.get("/auth/otp-status")
async def get_otp_status(
    email: str,
    purpose: str = "signup",
    otp_service: OTPService = Depends(get_otp_service)
):
    """
    Check if there's a valid OTP for given email
    
    Args:
        email: User email
        purpose: OTP purpose
    
    Returns:
        OTP status information
    """
    try:
        if not email or "@" not in email:
            raise HTTPException(status_code=400, detail="Invalid email address")
        
        status = await otp_service.get_otp_status(email, purpose)
        return status
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[OTP] Error getting OTP status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get OTP status")

@router.post("/auth/signup-with-otp")
async def signup_with_otp(
    email: str,
    password: str,
    full_name: str,
    otp_verified: bool,
    otp_service: OTPService = Depends(get_otp_service),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Complete signup after OTP verification and mark email as confirmed in Supabase
    
    Args:
        email: User email
        password: User password
        full_name: User full name
        otp_verified: Whether OTP was verified on frontend
    
    Returns:
        Confirmation message with instruction to mark email as confirmed
    """
    try:
        # Validate OTP was verified
        if not otp_verified:
            raise HTTPException(status_code=400, detail="OTP verification required")
        
        # Get the verified OTP record
        otp_record = await db.otp_codes.find_one({
            "email": email.lower(),
            "purpose": "signup",
            "verified": True
        })
        
        if not otp_record:
            raise HTTPException(status_code=400, detail="OTP verification not found")
        
        # Check if not already used
        if otp_record.get("used_for_signup"):
            raise HTTPException(status_code=400, detail="OTP already used for signup")
        
        # Mark OTP as used
        await db.otp_codes.update_one(
            {"_id": otp_record["_id"]},
            {"$set": {"used_for_signup": True, "signup_completed_at": datetime.utcnow()}}
        )
        
        # Mark email as confirmed in Supabase
        try:
            if settings.supabase_url and settings.supabase_anon_key:
                supabase = create_client(settings.supabase_url, settings.supabase_anon_key)
                
                # Find user by email (after they've signed up on frontend)
                auth_response = supabase.auth.admin.list_users()
                user = next((u for u in auth_response.data if u.email == email), None)
                
                if user:
                    # Update user to mark email as confirmed
                    supabase.auth.admin.update_user_by_id(
                        user.id,
                        {"email_confirmed_at": datetime.utcnow().isoformat()}
                    )
                    print(f"[OTP] ✅ Marked email as confirmed in Supabase for {email}")
                else:
                    print(f"[OTP] ℹ️  User will be marked as confirmed during signup")
        except Exception as supabase_error:
            print(f"[OTP] ⚠️  Could not update Supabase: {supabase_error}")
            # Don't fail if Supabase update fails - user can still sign up
        
        # Note: Actual user creation happens in Supabase frontend
        # This endpoint just confirms OTP verification and marks email as confirmed
        
        return {
            "success": True,
            "message": "OTP verified and email marked as confirmed"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[OTP] Error completing signup: {e}")
        raise HTTPException(status_code=500, detail="Failed to complete signup")
