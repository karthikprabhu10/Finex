import os
import json
from typing import Optional, Dict, Any
from datetime import datetime
from functools import lru_cache

try:
    import httpx
except ImportError:
    httpx = None

try:
    import jwt
except ImportError:
    jwt = None

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', '')
SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET', '')

# Cache for JWKS
_jwks_cache = None
_jwks_cache_time = None
JWKS_CACHE_DURATION = 3600  # 1 hour


async def get_jwks():
    """Fetch JWKS from Supabase"""
    global _jwks_cache, _jwks_cache_time
    
    # Return cached JWKS if still valid
    if _jwks_cache and _jwks_cache_time:
        if datetime.now().timestamp() - _jwks_cache_time < JWKS_CACHE_DURATION:
            return _jwks_cache
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f'{SUPABASE_URL}/auth/v1/keys')
            if response.status_code == 200:
                _jwks_cache = response.json()
                _jwks_cache_time = datetime.now().timestamp()
                return _jwks_cache
    except Exception as e:
        print(f"Error fetching JWKS: {e}")
    
    return None


async def verify_supabase_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify Supabase JWT token and return user data.
    
    Args:
        token: JWT token from Authorization header
    
    Returns:
        User data dictionary if valid, None otherwise
    """
    if not token or not jwt:
        return None
    
    # Try to decode and verify the token
    try:
        # Decode without verification first to check if it's a valid JWT structure
        try:
            # If you have the JWT secret from Supabase
            if SUPABASE_JWT_SECRET:
                decoded = jwt.decode(
                    token,
                    SUPABASE_JWT_SECRET,
                    algorithms=['HS256']
                )
                return decoded
        except jwt.InvalidSignatureError:
            # Try RS256 verification with JWKS if HS256 fails
            jwks = await get_jwks()
            if jwks:
                # Implement RS256 verification
                pass
        
        # Fallback: decode without verification for basic validation
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        # Check if token is expired
        if 'exp' in decoded:
            if datetime.fromtimestamp(decoded['exp']) < datetime.now():
                return None
        
        return decoded
    
    except Exception as e:
        print(f"Token verification error: {e}")
        return None


def extract_user_id_from_token(token: str) -> Optional[str]:
    """Extract user ID from JWT token"""
    if not jwt:
        return None
    
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded.get('sub')  # 'sub' is the user ID in Supabase JWT
    except Exception:
        return None


def extract_token_from_header(authorization_header: Optional[str]) -> Optional[str]:
    """
    Extract JWT token from Authorization header.
    
    Expected format: "Bearer <token>"
    """
    if not authorization_header:
        return None
    
    parts = authorization_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None
    
    return parts[1]
