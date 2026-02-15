from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ProfileCreate(BaseModel):
    """Profile creation/update schema"""
    userId: Optional[str] = None  # Set by backend from JWT
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class ProfileUpdate(BaseModel):
    """Profile update schema"""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class Profile(BaseModel):
    """Profile document model for MongoDB"""
    id: Optional[str] = Field(None, alias="_id")
    userId: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
