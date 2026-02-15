import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class OTPService:
    """Service for managing OTP operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.otp_collection = db.otp_codes
        self.otp_length = 6
        self.otp_expiry_minutes = 15  # Extended from 10 to 15 minutes for better UX
        self.max_attempts = 5
        
        # Email configuration
        self.smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.sender_email = os.getenv('SENDER_EMAIL', '')
        self.sender_password = os.getenv('SENDER_PASSWORD', '')
        self.sender_name = os.getenv('SENDER_NAME', 'Finex')
    
    async def generate_otp(self, email: str, purpose: str = "signup") -> Dict[str, Any]:
        """
        Generate and store OTP for email
        
        Args:
            email: User email address
            purpose: Purpose of OTP (signup, password_reset, etc)
        
        Returns:
            Dictionary with OTP details
        """
        email_lower = email.lower()
        # Use timezone-aware UTC datetime to avoid MongoDB timezone issues
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        print(f"[OTP] 📅 Generation timestamp: {now.isoformat()}")
        
        # FIRST: Delete ALL old OTP records for this email (cleanup)
        delete_result = await self.otp_collection.delete_many({
            "email": email_lower,
            "purpose": purpose
        })
        if delete_result.deleted_count > 0:
            print(f"[OTP] 🧹 Cleaned up {delete_result.deleted_count} old OTP record(s)")
        
        # Now generate fresh OTP (all old ones are deleted)
        
        # Generate 6-digit OTP
        otp_code = ''.join(random.choices(string.digits, k=self.otp_length))
        print(f"[OTP] 🔐 Generated code: {otp_code}")
        
        expires_at = now + timedelta(minutes=self.otp_expiry_minutes)
        
        otp_data = {
            "email": email_lower,
            "otp_code": otp_code,
            "created_at": now,
            "expires_at": expires_at,
            "verified": False,
            "verified_at": None,
            "attempts": 0,
            "purpose": purpose,
            "user_id": None
        }
        
        print(f"[OTP] 📧 Storing OTP in MongoDB for {email_lower}")
        print(f"[OTP]    Created at: {now}")
        print(f"[OTP]    Expires at: {expires_at}")
        print(f"[OTP]    Expiry duration: {self.otp_expiry_minutes} minutes")
        
        result = await self.otp_collection.insert_one(otp_data)
        otp_id = str(result.inserted_id)
        print(f"[OTP] ✅ OTP ID: {otp_id}")
        
        # Send OTP via email
        print(f"[OTP] 📮 Attempting to send email to {email}...")
        email_sent = await self.send_otp_email(email, otp_code)
        
        return {
            "success": True,
            "message": "OTP sent to email" if email_sent else "OTP generated but email sending failed",
            "otp_id": otp_id,
            "expires_in_seconds": self.otp_expiry_minutes * 60,
            "masked_otp": f"****{otp_code[-2:]}"  # Show last 2 digits for debugging
        }
    
    async def verify_otp(self, email: str, otp_code: str, purpose: str = "signup") -> Dict[str, Any]:
        """
        Verify OTP code
        
        Args:
            email: User email address
            otp_code: 6-digit code from user
            purpose: Purpose of OTP verification
        
        Returns:
            Dictionary with verification result
        """
        email = email.lower()
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        
        print(f"[OTP] ===== VERIFY OTP START =====")
        print(f"[OTP] Email: {email}")
        print(f"[OTP] Code: {otp_code}")
        print(f"[OTP] 📅 Verification timestamp: {now.isoformat()}")
        
        # Find OTP record - should be only ONE per email (old ones are deleted on each request)
        otp_record = await self.otp_collection.find_one({
            "email": email,
            "purpose": purpose
        })
        
        if not otp_record:
            print(f"[OTP] ❌ No OTP found for {email}")
            print(f"[OTP] ===== VERIFY OTP END =====")
            return {
                "success": False,
                "message": "No valid OTP found for this email. Please request a new one."
            }
        
        print(f"[OTP] OTP Record found in MongoDB:")
        created_at = otp_record.get('created_at')
        expires_at = otp_record.get('expires_at')
        print(f"[OTP]   Created: {created_at} (type: {type(created_at).__name__})")
        print(f"[OTP]   Expires: {expires_at} (type: {type(expires_at).__name__})")
        print(f"[OTP]   Verified: {otp_record.get('verified')}")
        print(f"[OTP]   Attempts: {otp_record.get('attempts')}")
        
        # Check if already verified
        if otp_record.get('verified'):
            print(f"[OTP] ⚠️  OTP already verified")
            print(f"[OTP] ===== VERIFY OTP END =====")
            return {
                "success": False,
                "message": "This OTP has already been verified. Please sign in to your account."
            }
        
        # Parse expires_at - handle both string and datetime objects from MongoDB
        expires_at = otp_record.get('expires_at')
        if expires_at is None:
            print(f"[OTP] ❌ expires_at is None in database!")
            print(f"[OTP] ===== VERIFY OTP END =====")
            return {
                "success": False,
                "message": "OTP data corrupted. Please request a new one."
            }
        
        # Normalize expires_at to naive UTC datetime
        if isinstance(expires_at, str):
            try:
                # Handle ISO format strings with or without Z suffix
                if expires_at.endswith('Z'):
                    expires_at = datetime.fromisoformat(expires_at[:-1] + '+00:00')
                else:
                    expires_at = datetime.fromisoformat(expires_at)
            except Exception as parse_error:
                print(f"[OTP] ❌ Failed to parse expires_at string: {parse_error}")
                print(f"[OTP] ===== VERIFY OTP END =====")
                return {
                    "success": False,
                    "message": "OTP data corrupted. Please request a new one."
                }
        
        # If expires_at has timezone info (from MongoDB), strip it to make it naive UTC
        if isinstance(expires_at, datetime) and expires_at.tzinfo is not None:
            expires_at = expires_at.replace(tzinfo=None)
            print(f"[OTP]   Stripped timezone from expires_at: {expires_at}")
        
        print(f"[OTP] TIMEZONE DEBUG:")
        print(f"[OTP]   Now type: {type(now).__name__}, tzinfo: {now.tzinfo}")
        print(f"[OTP]   Expires type: {type(expires_at).__name__}, tzinfo: {expires_at.tzinfo if isinstance(expires_at, datetime) else 'N/A'}")
        
        # Now compare timestamps (both are naive UTC)
        print(f"[OTP] TIME COMPARISON:")
        print(f"[OTP]   Now: {now.isoformat()}")
        print(f"[OTP]   Expires: {expires_at.isoformat() if isinstance(expires_at, datetime) else expires_at}")
        
        # Check expiry
        if isinstance(expires_at, datetime):
            time_diff = (expires_at - now).total_seconds()
            is_expired = now > expires_at
            print(f"[OTP]   Diff: {time_diff:.1f} seconds")
            
            if is_expired:
                print(f"[OTP] ❌ OTP EXPIRED")
                print(f"[OTP]    Expired by: {abs(time_diff):.0f} seconds")
                print(f"[OTP] ===== VERIFY OTP END =====")
                return {
                    "success": False,
                    "message": f"OTP has expired. Please request a new one."
                }
            
            print(f"[OTP] ✅ OTP not expired (valid for {time_diff:.0f} more seconds)")
        else:
            print(f"[OTP] ❌ expires_at is not a datetime object: {type(expires_at)}")
            print(f"[OTP] ===== VERIFY OTP END =====")
            return {
                "success": False,
                "message": "OTP data corrupted. Please request a new one."
            }
        
        # Check attempts
        attempts = otp_record.get('attempts', 0)
        if attempts >= self.max_attempts:
            print(f"[OTP] ❌ Too many attempts: {attempts}/{self.max_attempts}")
            print(f"[OTP] ===== VERIFY OTP END =====")
            return {
                "success": False,
                "message": "Too many failed attempts. Please request a new OTP"
            }
        
        # Verify code
        stored_code = otp_record.get('otp_code', '')
        if stored_code != otp_code:
            print(f"[OTP] ❌ INVALID CODE")
            print(f"[OTP]    User provided: {otp_code}")
            print(f"[OTP]    Stored code: {stored_code}")
            # Increment attempts
            new_attempts = attempts + 1
            await self.otp_collection.update_one(
                {"_id": otp_record['_id']},
                {"$set": {"attempts": new_attempts}}
            )
            
            remaining_attempts = self.max_attempts - new_attempts
            print(f"[OTP] ===== VERIFY OTP END =====")
            return {
                "success": False,
                "message": f"Invalid OTP code. {remaining_attempts} attempts remaining",
                "attempts_remaining": remaining_attempts
            }
        
        # Code is correct - mark as verified
        print(f"[OTP] ✅ CODE MATCHES!")
        print(f"[OTP] ✅ OTP verified successfully")
        await self.otp_collection.update_one(
            {"_id": otp_record['_id']},
            {
                "$set": {
                    "verified": True,
                    "verified_at": now
                }
            }
        )
        
        print(f"[OTP] ===== VERIFY OTP END =====")
        return {
            "success": True,
            "message": "OTP verified successfully",
            "otp_id": str(otp_record['_id'])
        }
    
    async def get_otp_status(self, email: str, purpose: str = "signup") -> Dict[str, Any]:
        """Get OTP status for email"""
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        otp_record = await self.otp_collection.find_one({
            "email": email.lower(),
            "purpose": purpose,
            "verified": False,
            "expires_at": {"$gt": now}
        })
        
        if not otp_record:
            return {"has_valid_otp": False}
        
        return {
            "has_valid_otp": True,
            "expires_at": otp_record['expires_at'],
            "attempts_remaining": max(0, self.max_attempts - otp_record['attempts']),
            "created_at": otp_record['created_at']
        }
    
    async def send_otp_email(self, email: str, otp_code: str) -> bool:
        """
        Send OTP via email
        
        Args:
            email: Recipient email
            otp_code: OTP code to send
        
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            if not self.sender_email or not self.sender_password:
                print(f"[OTP] ⚠️  Email credentials not configured")
                print(f"[OTP]    SENDER_EMAIL: {self.sender_email}")
                print(f"[OTP]    SENDER_PASSWORD: {'*' * 8 if self.sender_password else 'NOT SET'}")
                print(f"[OTP]    OTP would have been sent to: {email}")
                print(f"[OTP]    OTP Code: {otp_code}")
                return False
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = "Your Finex Verification Code"
            message["From"] = f"{self.sender_name} <{self.sender_email}>"
            message["To"] = email
            
            # Plain text version
            text = f"""\
Hi,

Your Finex account verification code is:

{otp_code}

This code will expire in 10 minutes.

Do not share this code with anyone.

Best regards,
The Finex Team
"""
            
            # HTML version
            html = f"""\
<html>
  <body style="font-family: Arial, sans-serif; color: #333;">
    <div style="max-width: 500px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Verify Your Finex Account</h2>
      <p>Hi,</p>
      <p>Your Finex account verification code is:</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <h1 style="letter-spacing: 10px; color: #2563eb; margin: 0;">{otp_code}</h1>
      </div>
      <p style="color: #666;">This code will expire in 10 minutes.</p>
      <p style="color: #666;">Do not share this code with anyone.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="font-size: 12px; color: #999;">
        Best regards,<br>
        The Finex Team
      </p>
    </div>
  </body>
</html>
"""
            
            part1 = MIMEText(text, "plain")
            part2 = MIMEText(html, "html")
            message.attach(part1)
            message.attach(part2)
            
            # Send email
            print(f"[OTP] 📧 Connecting to SMTP ({self.smtp_host}:{self.smtp_port})...")
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as server:
                server.starttls()
                print(f"[OTP] 🔐 TLS connection established")
                server.login(self.sender_email, self.sender_password)
                print(f"[OTP] ✓ Authenticated with SMTP")
                server.sendmail(self.sender_email, email, message.as_string())
            
            print(f"[OTP] ✅ Email sent successfully to {email}")
            return True
        
        except smtplib.SMTPAuthenticationError as e:
            print(f"[OTP] ❌ SMTP Authentication failed: {e}")
            print(f"[OTP]    Check SENDER_EMAIL and SENDER_PASSWORD in .env")
            return False
        except smtplib.SMTPException as e:
            print(f"[OTP] ❌ SMTP error: {e}")
            return False
        except Exception as e:
            print(f"[OTP] ❌ Failed to send email: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def cleanup_expired_otps(self) -> int:
        """Delete expired OTP records"""
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        result = await self.otp_collection.delete_many({
            "expires_at": {"$lt": now}
        })
        return result.deleted_count
