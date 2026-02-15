from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class ReceiptCategory(str, Enum):
    """Receipt expense categories"""
    FOOD_DINING = "Food & Dining"
    GROCERIES = "Groceries"
    FUEL_TRANSPORT = "Fuel & Transport"
    MEDICAL = "Medical"
    ENTERTAINMENT = "Entertainment"
    SHOPPING = "Shopping"
    UTILITIES = "Utilities"
    EDUCATION = "Education"
    HOME = "Home & Garden"
    MAINTENANCE = "Maintenance"
    OTHER = "Other"

class ReceiptItem(BaseModel):
    """Individual item in a receipt"""
    name: str
    quantity: float = 1.0
    price: float
    total: float
    category: str = "Other"  # Category assigned by fuzzy matching during OCR

class Receipt(BaseModel):
    """Receipt document model for MongoDB"""
    id: Optional[str] = Field(None, alias="_id")
    userId: str  # Supabase user ID - REQUIRED
    storeName: str
    date: str
    totalAmount: float
    taxAmount: float = 0.0
    category: ReceiptCategory = ReceiptCategory.OTHER
    items: List[ReceiptItem] = []
    imageUrl: str
    thumbnailUrl: Optional[str] = None
    tags: List[str] = []
    notes: Optional[str] = ""
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        use_enum_values = True

class ReceiptCreate(BaseModel):
    """Receipt creation schema"""
    userId: str  # Supabase user ID - REQUIRED
    storeName: str
    date: str
    totalAmount: float
    taxAmount: float = 0.0
    category: str = "Other"
    items: List[ReceiptItem] = []
    imageUrl: str
    tags: List[str] = []
    notes: str = ""

class ReceiptUpdate(BaseModel):
    """Receipt update schema"""
    storeName: Optional[str] = None
    date: Optional[str] = None
    totalAmount: Optional[float] = None
    taxAmount: Optional[float] = None
    category: Optional[str] = None
    items: Optional[List[ReceiptItem]] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
