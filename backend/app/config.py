import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional
from dotenv import load_dotenv

# Get the backend directory (parent of app directory)
BACKEND_DIR = Path(__file__).parent.parent
ENV_FILE = BACKEND_DIR / ".env"

# Load .env file explicitly
load_dotenv(ENV_FILE)

class Settings(BaseSettings):
    """Application settings"""
    model_config = ConfigDict(env_file=str(ENV_FILE), case_sensitive=False, extra='allow')
    
    # API Configuration
    api_title: str = "Finex API"
    api_version: str = "1.0.0"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    
    # CORS
    frontend_url: str = "http://localhost:5173"
    
    # MongoDB Configuration (REQUIRED - set in .env file)
    mongodb_url: str = ""  # Required: Set MONGODB_URL in .env
    db_name: str = "finex"
    
    # Storage
    storage_path: str = "storage"
    uploads_path: str = "storage/uploads"
    upload_dir: str = "storage/uploads"
    thumbnails_path: str = "storage/thumbnails"
    thumbnail_dir: str = "storage/thumbnails"
    processed_path: str = "storage/processed"
    processed_dir: str = "storage/processed"
    
    # File Upload
    max_file_size: int = 10485760  # 10MB
    allowed_extensions: str = "jpg,jpeg,png,pdf"
    
    # OCR
    ocr_languages: str = "en,hi"
    ocr_gpu: bool = False
    
    # Gemini API
    gemini_api_key: Optional[str] = None
    
    # OTP Configuration
    otp_length: int = 6
    otp_expiry_minutes: int = 10
    otp_max_attempts: int = 5
    
    # Email Configuration
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    sender_email: Optional[str] = None
    sender_password: Optional[str] = None
    sender_name: str = "Finex"
    
    # Supabase Configuration
    supabase_url: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    supabase_jwt_secret: Optional[str] = None

settings = Settings()

