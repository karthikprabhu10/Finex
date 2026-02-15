from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class OTPRequest(BaseModel):
    """Request to generate and send OTP"""
    email: str = Field(..., description="User email address")
    purpose: str = Field(default="signup", description="Purpose of OTP: signup, password_reset, etc")

class OTPVerification(BaseModel):
    """Request to verify OTP"""
    email: str = Field(..., description="User email address")
    otp: str = Field(..., description="6-digit OTP code")
    purpose: str = Field(default="signup", description="Purpose of OTP verification")

class OTPResponse(BaseModel):
    """Response for OTP operations"""
    success: bool
    message: str
    otp_id: Optional[str] = None
    expires_in_seconds: Optional[int] = None
    masked_otp: Optional[str] = None  # For debugging: show partial OTP like ****56

class OTPData(BaseModel):
    """MongoDB OTP data model"""
    email: str
    otp_code: str
    created_at: datetime
    expires_at: datetime
    verified: bool = False
    verified_at: Optional[datetime] = None
    attempts: int = 0
    purpose: str = "signup"
    user_id: Optional[str] = None
