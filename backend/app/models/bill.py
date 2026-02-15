from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

class BillCreate(BaseModel):
    """Bill creation schema"""
    userId: Optional[str] = None  # Set by backend from JWT
    name: str
    amount: float
    dueDate: str  # ISO date string
    category: str
    recurring: bool = False
    status: Literal['pending', 'upcoming', 'paid'] = 'pending'

class BillUpdate(BaseModel):
    """Bill update schema"""
    name: Optional[str] = None
    amount: Optional[float] = None
    dueDate: Optional[str] = None
    category: Optional[str] = None
    recurring: Optional[bool] = None
    status: Optional[Literal['pending', 'upcoming', 'paid']] = None

class Bill(BaseModel):
    """Bill document model for MongoDB"""
    id: Optional[str] = Field(None, alias="_id")
    userId: str
    name: str
    amount: float
    dueDate: str
    category: str
    recurring: bool = False
    status: Literal['pending', 'upcoming', 'paid'] = 'pending'
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
