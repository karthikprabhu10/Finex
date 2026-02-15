from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime

class CategorySpending(BaseModel):
    category: str
    amount: float
    percentage: float
    itemCount: int

class MonthlyComparison(BaseModel):
    currentMonth: float
    lastMonth: float
    percentageChange: float
    trend: str  # "up", "down", "stable"

class DailySpending(BaseModel):
    date: str
    amount: float

class TopMerchant(BaseModel):
    storeName: str
    totalSpent: float
    receiptCount: int

class SpendingTrend(BaseModel):
    month: str  # "Jan 2026"
    amount: float

class AnalyticsResponse(BaseModel):
    # Month comparison
    monthlyComparison: MonthlyComparison
    
    # Category breakdown
    categoryBreakdown: List[CategorySpending]
    
    # Spending trends (last 6 months)
    spendingTrends: List[SpendingTrend]
    
    # Daily spending (current month)
    dailySpending: List[DailySpending]
    
    # Top Spendings
    topMerchants: List[TopMerchant]
    
    # Overall statistics
    totalReceipts: int
    averageReceiptAmount: float
    highestTransaction: float
    lowestTransaction: float
    
    # Bills statistics
    totalBillsDue: float
    pendingBillsCount: int
    upcomingBillsCount: int
    
    # Budget statistics
    totalBudget: float
    budgetUtilization: float  # percentage
    
    # Time-based insights
    averageDailySpending: float
    projectedMonthEnd: float
