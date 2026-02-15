from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class BudgetAllocation(BaseModel):
    """Budget allocation for a category"""
    category: str
    percentage: float
    amount: float

class Budget(BaseModel):
    """Budget document model for MongoDB"""
    id: Optional[str] = Field(None, alias="_id")
    userId: str
    monthlyIncome: float
    allocations: List[BudgetAllocation] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class BudgetCreate(BaseModel):
    """Budget creation schema"""
    userId: Optional[str] = None  # Set by backend from JWT
    monthlyIncome: float
    allocations: List[BudgetAllocation] = []

class BudgetUpdate(BaseModel):
    """Budget update schema"""
    monthlyIncome: Optional[float] = None
    allocations: Optional[List[BudgetAllocation]] = None
