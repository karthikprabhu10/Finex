from datetime import datetime, timedelta
from typing import List, Dict, Optional
from bson import ObjectId
from ..database import mongodb, ensure_mongo_connected
from ..models.analytics import (
    AnalyticsResponse, MonthlyComparison, CategorySpending,
    DailySpending, TopMerchant, SpendingTrend
)
import calendar

class AnalyticsService:
    @staticmethod
    def get_database():
        """Get database connection"""
        return ensure_mongo_connected()
    
    @staticmethod
    async def get_analytics(user_id: str, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> AnalyticsResponse:
        """
        Generate comprehensive analytics for a user with optional date filtering
        """
        db = AnalyticsService.get_database()
        
        # Get current date info
        now = datetime.now()
        
        # Use provided dates or default to current month
        if start_date and end_date:
            filter_start = start_date
            filter_end = end_date
            print(f"[Analytics] Using custom date range: {filter_start} to {filter_end}")
        else:
            filter_start = datetime(now.year, now.month, 1)
            filter_end = now
            print(f"[Analytics] Using current month: {filter_start} to {filter_end}")
        
        current_month_start = datetime(now.year, now.month, 1)
        
        # Calculate last month
        if now.month == 1:
            last_month_start = datetime(now.year - 1, 12, 1)
            last_month_end = datetime(now.year, 1, 1) - timedelta(days=1)
        else:
            last_month_start = datetime(now.year, now.month - 1, 1)
            last_month_end = current_month_start - timedelta(days=1)
        
        current_month_end = now
        
        print(f"[Analytics] Generating analytics for user: {user_id}")
        print(f"[Analytics] Current month: {current_month_start} to {current_month_end}")
        print(f"[Analytics] Last month: {last_month_start} to {last_month_end}")
        
        # Fetch all receipts
        receipts = list(db.receipts.find({"userId": user_id}))
        print(f"[Analytics] Found {len(receipts)} total receipts")
        
        # Filter receipts by date range if provided
        filtered_receipts = [r for r in receipts if filter_start <= r.get('createdAt', datetime.min) <= filter_end]
        print(f"[Analytics] Filtered to {len(filtered_receipts)} receipts in date range")
        
        # Fetch bills
        bills = list(db.bills.find({"userId": user_id}))
        print(f"[Analytics] Found {len(bills)} bills")
        
        # Fetch budgets
        budgets = list(db.budgets.find({"userId": user_id}))
        print(f"[Analytics] Found {len(budgets)} budgets")
        
        # === MONTHLY COMPARISON ===
        current_month_receipts = [r for r in receipts if current_month_start <= r.get('createdAt', datetime.min) <= current_month_end]
        last_month_receipts = [r for r in receipts if last_month_start <= r.get('createdAt', datetime.min) <= last_month_end]
        
        current_month_total = sum(r.get('totalAmount', 0) for r in current_month_receipts)
        last_month_total = sum(r.get('totalAmount', 0) for r in last_month_receipts)
        
        if last_month_total > 0:
            percentage_change = ((current_month_total - last_month_total) / last_month_total) * 100
        else:
            percentage_change = 100.0 if current_month_total > 0 else 0.0
        
        if abs(percentage_change) < 5:
            trend = "stable"
        elif percentage_change > 0:
            trend = "up"
        else:
            trend = "down"
        
        monthly_comparison = MonthlyComparison(
            currentMonth=round(current_month_total, 2),
            lastMonth=round(last_month_total, 2),
            percentageChange=round(percentage_change, 2),
            trend=trend
        )
        
        print(f"[Analytics] Monthly comparison: Current={current_month_total}, Last={last_month_total}, Change={percentage_change}%")
        
        # === CATEGORY BREAKDOWN ===
        # Use filtered receipts if custom date range, otherwise current month receipts
        if start_date and end_date:
            receipts_for_analysis = filtered_receipts
        else:
            receipts_for_analysis = current_month_receipts if current_month_receipts else receipts
        print(f"[Analytics] Using {len(receipts_for_analysis)} receipts for category analysis")
        
        category_totals: Dict[str, Dict] = {}
        total_spent = 0
        
        for receipt in receipts_for_analysis:
            # Check if category is at receipt level or item level
            receipt_category = receipt.get('category')
            receipt_amount = receipt.get('totalAmount', 0)
            items = receipt.get('items', [])
            
            # If receipt has a category, use it for the total amount
            if receipt_category:
                if receipt_category not in category_totals:
                    category_totals[receipt_category] = {'amount': 0, 'count': 0}
                category_totals[receipt_category]['amount'] += receipt_amount
                category_totals[receipt_category]['count'] += len(items)
                total_spent += receipt_amount
            else:
                # Otherwise check items for categories
                for item in items:
                    category = item.get('category', 'Other')
                    amount = item.get('price', 0)
                    
                    if category not in category_totals:
                        category_totals[category] = {'amount': 0, 'count': 0}
                    
                    category_totals[category]['amount'] += amount
                    category_totals[category]['count'] += 1
                    total_spent += amount
        
        print(f"[Analytics] Total spent for categories: {total_spent}")
        print(f"[Analytics] Categories found: {list(category_totals.keys())}")
        
        category_breakdown = []
        for category, data in category_totals.items():
            percentage = (data['amount'] / total_spent * 100) if total_spent > 0 else 0
            category_breakdown.append(CategorySpending(
                category=category,
                amount=round(data['amount'], 2),
                percentage=round(percentage, 2),
                itemCount=data['count']
            ))
        
        category_breakdown.sort(key=lambda x: x.amount, reverse=True)
        print(f"[Analytics] Category breakdown: {len(category_breakdown)} categories")
        
        # === SPENDING TRENDS (based on date range) ===
        spending_trends = []
        
        if start_date and end_date:
            # Calculate the time span
            days_diff = (end_date - start_date).days
            
            if days_diff <= 7:
                # For 1 week or less: show daily breakdown
                current_date = start_date
                while current_date <= end_date:
                    day_receipts = [r for r in filtered_receipts 
                                   if r.get('createdAt', datetime.min).date() == current_date.date()]
                    day_total = sum(r.get('totalAmount', 0) for r in day_receipts)
                    
                    day_name = current_date.strftime("%b %d")
                    spending_trends.append(SpendingTrend(
                        month=day_name,
                        amount=round(day_total, 2)
                    ))
                    current_date += timedelta(days=1)
            elif days_diff <= 31:
                # For 1 month or less: show weekly breakdown
                week_start = start_date
                while week_start <= end_date:
                    week_end = min(week_start + timedelta(days=6), end_date)
                    week_receipts = [r for r in filtered_receipts 
                                    if week_start <= r.get('createdAt', datetime.min) <= week_end]
                    week_total = sum(r.get('totalAmount', 0) for r in week_receipts)
                    
                    week_name = f"{week_start.strftime('%b %d')}"
                    spending_trends.append(SpendingTrend(
                        month=week_name,
                        amount=round(week_total, 2)
                    ))
                    week_start += timedelta(days=7)
            else:
                # For longer periods: show monthly breakdown
                # Determine how many months to show
                current_month = datetime(start_date.year, start_date.month, 1)
                end_month = datetime(end_date.year, end_date.month, 1)
                
                while current_month <= end_month:
                    # Get next month start
                    if current_month.month == 12:
                        next_month = datetime(current_month.year + 1, 1, 1)
                    else:
                        next_month = datetime(current_month.year, current_month.month + 1, 1)
                    
                    month_receipts = [r for r in filtered_receipts 
                                     if current_month <= r.get('createdAt', datetime.min) < next_month]
                    month_total = sum(r.get('totalAmount', 0) for r in month_receipts)
                    
                    month_name = current_month.strftime("%b %Y")
                    spending_trends.append(SpendingTrend(
                        month=month_name,
                        amount=round(month_total, 2)
                    ))
                    current_month = next_month
        else:
            # Default: Last 6 months
            for i in range(5, -1, -1):
                if now.month - i <= 0:
                    month_date = datetime(now.year - 1, 12 + (now.month - i), 1)
                else:
                    month_date = datetime(now.year, now.month - i, 1)
                
                # Get next month start
                if month_date.month == 12:
                    next_month = datetime(month_date.year + 1, 1, 1)
                else:
                    next_month = datetime(month_date.year, month_date.month + 1, 1)
                
                month_receipts = [r for r in receipts if month_date <= r.get('createdAt', datetime.min) < next_month]
                month_total = sum(r.get('totalAmount', 0) for r in month_receipts)
                
                month_name = month_date.strftime("%b %Y")
                spending_trends.append(SpendingTrend(
                    month=month_name,
                    amount=round(month_total, 2)
                ))
        
        print(f"[Analytics] Spending trends: {len(spending_trends)} data points")
        
        # === DAILY SPENDING (use receipts_for_analysis for consistency with date filter) ===
        daily_totals: Dict[str, float] = {}
        for receipt in receipts_for_analysis:
            created_at = receipt.get('createdAt', now)
            if isinstance(created_at, datetime):
                date_str = created_at.strftime("%Y-%m-%d")
            else:
                date_str = now.strftime("%Y-%m-%d")
            
            if date_str not in daily_totals:
                daily_totals[date_str] = 0
            daily_totals[date_str] += receipt.get('totalAmount', 0)
        
        daily_spending = [
            DailySpending(date=date, amount=round(amount, 2))
            for date, amount in sorted(daily_totals.items())
        ]
        
        print(f"[Analytics] Daily spending: {len(daily_spending)} days with data")
        
        # === Top Spendings ===
        # Use receipts_for_analysis (same as categories) for consistency
        merchant_totals: Dict[str, Dict] = {}
        for receipt in receipts_for_analysis:
            store = receipt.get('storeName', 'Unknown')
            if not store or store == '':
                store = 'Unknown'
            amount = receipt.get('totalAmount', 0)
            
            if store not in merchant_totals:
                merchant_totals[store] = {'total': 0, 'count': 0}
            
            merchant_totals[store]['total'] += amount
            merchant_totals[store]['count'] += 1
        
        print(f"[Analytics] Merchant totals dict: {merchant_totals}")
        
        top_merchants = [
            TopMerchant(
                storeName=store,
                totalSpent=round(data['total'], 2),
                receiptCount=data['count']
            )
            for store, data in merchant_totals.items()
        ]
        top_merchants.sort(key=lambda x: x.totalSpent, reverse=True)
        top_merchants = top_merchants[:10]  # Top 10
        
        print(f"[Analytics] Top Spendings: {len(top_merchants)}")
        if top_merchants:
            print(f"[Analytics] Top merchant: {top_merchants[0].storeName} - {top_merchants[0].totalSpent}")
        if top_merchants:
            print(f"[Analytics] Top merchant: {top_merchants[0].storeName} - {top_merchants[0].totalSpent}")
        
        # === RECEIPT STATISTICS ===
        # Use receipts_for_analysis for consistency
        receipt_amounts = [r.get('totalAmount', 0) for r in receipts_for_analysis]
        total_receipts = len(receipts_for_analysis)
        average_receipt = sum(receipt_amounts) / len(receipt_amounts) if receipt_amounts else 0
        highest_transaction = max(receipt_amounts) if receipt_amounts else 0
        lowest_transaction = min(receipt_amounts) if receipt_amounts else 0
        
        # === BILLS STATISTICS ===
        pending_bills = [b for b in bills if b.get('status') == 'pending']
        upcoming_bills = [b for b in bills if b.get('status') == 'upcoming']
        
        total_bills_due = sum(b.get('amount', 0) for b in pending_bills + upcoming_bills)
        
        # === BUDGET STATISTICS ===
        total_budget = sum(b.get('totalBudget', 0) for b in budgets)
        # Use filtered total if custom date range, otherwise current month total
        filtered_total = sum(r.get('totalAmount', 0) for r in receipts_for_analysis)
        budget_utilization = (filtered_total / total_budget * 100) if total_budget > 0 else 0
        
        # === TIME-BASED INSIGHTS ===
        # Calculate based on selected date range
        if start_date and end_date:
            days_in_range = (end_date - start_date).days + 1
            average_daily_spending = filtered_total / days_in_range if days_in_range > 0 else 0
            projected_month_end = average_daily_spending * 30  # Project to 30 days
        else:
            days_in_month = calendar.monthrange(now.year, now.month)[1]
            days_passed = now.day
            average_daily_spending = current_month_total / days_passed if days_passed > 0 else 0
            projected_month_end = average_daily_spending * days_in_month
        
        print(f"[Analytics] Average daily: {average_daily_spending}, Projected: {projected_month_end}")
        
        return AnalyticsResponse(
            monthlyComparison=monthly_comparison,
            categoryBreakdown=category_breakdown,
            spendingTrends=spending_trends,
            dailySpending=daily_spending,
            topMerchants=top_merchants,
            totalReceipts=total_receipts,
            averageReceiptAmount=round(average_receipt, 2),
            highestTransaction=round(highest_transaction, 2),
            lowestTransaction=round(lowest_transaction, 2),
            totalBillsDue=round(total_bills_due, 2),
            pendingBillsCount=len(pending_bills),
            upcomingBillsCount=len(upcoming_bills),
            totalBudget=round(total_budget, 2),
            budgetUtilization=round(budget_utilization, 2),
            averageDailySpending=round(average_daily_spending, 2),
            projectedMonthEnd=round(projected_month_end, 2)
        )
