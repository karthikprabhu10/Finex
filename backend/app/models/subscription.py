from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

class SubscriptionCreate(BaseModel):
    """Subscription creation schema"""
    userId: Optional[str] = None  # Set by backend from JWT
    name: str
    amount: float
    frequency: Literal['Weekly', 'Monthly', 'Quarterly', 'Yearly'] = 'Monthly'
    nextBilling: str  # ISO date string
    category: str
    color: str = '#007AFF'
    description: Optional[str] = None

class SubscriptionUpdate(BaseModel):
    """Subscription update schema"""
    name: Optional[str] = None
    amount: Optional[float] = None
    frequency: Optional[Literal['Weekly', 'Monthly', 'Quarterly', 'Yearly']] = None
    nextBilling: Optional[str] = None
    category: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None

class Subscription(BaseModel):
    """Subscription document model for MongoDB"""
    id: Optional[str] = Field(None, alias="_id")
    userId: str
    name: str
    amount: float
    frequency: Literal['Weekly', 'Monthly', 'Quarterly', 'Yearly'] = 'Monthly'
    nextBilling: str
    category: str
    color: str = '#007AFF'
    description: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
