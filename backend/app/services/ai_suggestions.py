import os
import json
import google.generativeai as genai
from typing import List, Dict, Any
from datetime import datetime, timedelta
from app.database import get_db
import logging

logger = logging.getLogger(__name__)

class AISuggestionsService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
    
    async def generate_suggestions(self, user_id: str) -> List[Dict[str, Any]]:
        """Generate 3-10 AI suggestions based on user's financial data"""
        try:
            # Get user's financial data
            financial_data = await self._get_user_financial_data(user_id)
            
            # Check if dismissed suggestions exist
            dismissed = await self._get_dismissed_suggestions(user_id)
            
            # Create prompt for Gemini
            prompt = self._create_prompt(financial_data)
            
            # Generate suggestions using Gemini
            response = self.model.generate_content(prompt)
            suggestions_text = response.text
            
            # Parse the response
            suggestions = self._parse_suggestions(suggestions_text, dismissed)
            
            # Ensure we have between 3-10 suggestions
            if len(suggestions) < 3:
                # Add generic suggestions if needed
                suggestions.extend(self._get_fallback_suggestions(3 - len(suggestions)))
            elif len(suggestions) > 10:
                suggestions = suggestions[:10]
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Error generating suggestions: {str(e)}")
            # Return fallback suggestions on error
            return self._get_fallback_suggestions(3)
    
    async def _get_user_financial_data(self, user_id: str) -> Dict[str, Any]:
        """Fetch user's receipts, bills, and subscriptions"""
        db = await get_db()
        
        # Get all receipts (overall data)
        receipts_cursor = db.receipts.find({
            "userId": user_id
        })
        receipts = await receipts_cursor.to_list(length=None)
        
        # Get receipts from last 30 days for recent spending analysis
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        recent_receipts_cursor = db.receipts.find({
            "userId": user_id,
            "date": {"$gte": thirty_days_ago}
        })
        recent_receipts = await recent_receipts_cursor.to_list(length=None)
        
        # Get active bills
        bills_cursor = db.bills.find({
            "userId": user_id,
            "status": {"$ne": "paid"}
        })
        bills = await bills_cursor.to_list(length=None)
        
        # Get subscriptions from localStorage (we'll pass this from frontend)
        # For now, we'll work with receipts and bills
        
        return {
            "receipts": receipts,
            "recent_receipts": recent_receipts,
            "bills": bills,
            "total_receipts": len(receipts),
            "total_spending": sum(r.get("total", 0) for r in receipts),
            "recent_spending": sum(r.get("total", 0) for r in recent_receipts),
        }
    
    def _create_prompt(self, financial_data: Dict[str, Any]) -> str:
        """Create a prompt for Gemini to generate suggestions"""
        receipts = financial_data.get("receipts", [])
        recent_receipts = financial_data.get("recent_receipts", [])
        bills = financial_data.get("bills", [])
        total_spending = financial_data.get("total_spending", 0)
        recent_spending = financial_data.get("recent_spending", 0)
        
        # Categorize overall spending
        category_spending = {}
        for receipt in receipts:
            category = receipt.get("category", "Other")
            amount = receipt.get("total", 0)
            category_spending[category] = category_spending.get(category, 0) + amount
        
        # Categorize recent spending (last 30 days)
        recent_category_spending = {}
        for receipt in recent_receipts:
            category = receipt.get("category", "Other")
            amount = receipt.get("total", 0)
            recent_category_spending[category] = recent_category_spending.get(category, 0) + amount
        
        prompt = f"""You are a friendly personal finance advisor helping an everyday user manage their money better. Analyze their spending data and provide 3-10 practical, easy-to-understand money-saving suggestions.

OVERALL SPENDING DATA:
- Total spending (all time): ₹{total_spending:,.0f}
- Total transactions: {len(receipts)}
- Overall category breakdown: {json.dumps(category_spending, indent=2)}

RECENT TRENDS (Last 30 Days):
- Recent spending: ₹{recent_spending:,.0f}
- Recent transactions: {len(recent_receipts)}
- Recent category breakdown: {json.dumps(recent_category_spending, indent=2)}

OTHER DATA:
- Pending bills: {len(bills)}

INSTRUCTIONS FOR GENERATING SUGGESTIONS:
1. Generate between 3 and 10 actionable suggestions that a regular person can understand and implement
2. Focus on real-world personal finance advice, NOT technical or developer terms
3. Speak directly to the user as their financial advisor
4. Each suggestion must include:
   - type: one of [savings, alert, optimization, subscription, budget]
   - title: Simple, clear title that makes sense to anyone (max 50 characters)
   - description: Friendly explanation with specific numbers and practical advice. Use "You" to address the user directly. Include concrete examples and calculations.
   - impact: Either "High Impact" or "Medium Impact"
   - category: The spending category this relates to
   - potential_savings: Estimated monthly savings in rupees

5. SUGGESTION TYPES & EXAMPLES:
   - **savings**: Help them reduce spending (e.g., "You're spending ₹8,500 on food delivery. Cooking at home twice a week could save ₹3,000/month")
   - **alert**: Warn about unusual patterns (e.g., "Your grocery spending jumped 40% this month. Check if you can switch to local markets")
   - **optimization**: Better alternatives (e.g., "Switch to XYZ credit card for 5% cashback on groceries - save ₹600/month")
   - **subscription**: Unused services (e.g., "You haven't used your gym membership in 2 months. Cancel to save ₹2,000/month")
   - **budget**: Budget planning (e.g., "Set a ₹15,000 monthly limit for dining out to control your biggest expense")

6. MAKE IT PERSONAL AND ACTIONABLE:
   - Use their actual spending numbers
   - Calculate realistic savings
   - Give specific category names from their data
   - Suggest practical alternatives they can actually do
   - Be encouraging and positive in tone

7. AVOID:
   - Generic advice without numbers
   - Technical jargon or developer terms
   - Suggestions about "improving code" or "optimizing systems"
   - Vague statements without specific actions

RESPOND ONLY WITH A VALID JSON ARRAY in this exact format:
[
  {{
    "type": "savings",
    "title": "Cut Down on Food Delivery",
    "description": "You spent ₹8,450 on food delivery this month. Try cooking at home 3 times a week - you could save around ₹3,000 monthly. That's ₹36,000 a year!",
    "impact": "High Impact",
    "category": "Food & Dining",
    "potential_savings": 3000
  }},
  {{
    "type": "alert",
    "title": "High Shopping Expenses",
    "description": "Your shopping spending increased by 35% compared to your usual pattern. Review recent purchases and return items you don't need to recover some money.",
    "impact": "Medium Impact",
    "category": "Shopping",
    "potential_savings": 2500
  }}
]

DO NOT include any markdown formatting, code blocks, or explanatory text. ONLY return the JSON array."""
        
        return prompt
    
    def _parse_suggestions(self, response_text: str, dismissed: List[str]) -> List[Dict[str, Any]]:
        """Parse Gemini's response into structured suggestions"""
        try:
            # Remove any markdown code blocks if present
            response_text = response_text.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            response_text = response_text.strip()
            
            # Parse JSON
            suggestions = json.loads(response_text)
            
            # Map types to icons and colors
            type_config = {
                "savings": {"icon": "TrendingDown", "color": "#34C759"},
                "alert": {"icon": "AlertCircle", "color": "#FF9500"},
                "optimization": {"icon": "Sparkles", "color": "#007AFF"},
                "subscription": {"icon": "CreditCard", "color": "#FF3B30"},
                "budget": {"icon": "PieChart", "color": "#5856D6"},
            }
            
            # Add IDs and icon/color info
            processed = []
            for idx, suggestion in enumerate(suggestions):
                suggestion_id = f"suggestion_{datetime.now().timestamp()}_{idx}"
                
                # Skip dismissed suggestions
                if suggestion_id in dismissed:
                    continue
                
                suggestion_type = suggestion.get("type", "optimization")
                config = type_config.get(suggestion_type, type_config["optimization"])
                
                processed.append({
                    "id": suggestion_id,
                    "type": suggestion_type,
                    "icon": config["icon"],
                    "title": suggestion.get("title", ""),
                    "description": suggestion.get("description", ""),
                    "impact": suggestion.get("impact", "Medium Impact"),
                    "color": config["color"],
                    "category": suggestion.get("category", "General"),
                    "potential_savings": suggestion.get("potential_savings", 0),
                })
            
            return processed
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {str(e)}")
            logger.error(f"Response text: {response_text}")
            return []
        except Exception as e:
            logger.error(f"Error parsing suggestions: {str(e)}")
            return []
    
    def _get_fallback_suggestions(self, count: int = 3) -> List[Dict[str, Any]]:
        """Return generic fallback suggestions if AI fails"""
        fallback = [
            {
                "id": "fallback_1",
                "type": "savings",
                "icon": "TrendingDown",
                "title": "Track Your Daily Expenses",
                "description": "Upload more receipts to get personalized insights. Consistent tracking helps identify spending patterns and saving opportunities.",
                "impact": "High Impact",
                "color": "#34C759",
                "category": "General",
                "potential_savings": 0,
            },
            {
                "id": "fallback_2",
                "type": "budget",
                "icon": "PieChart",
                "title": "Set Monthly Budgets",
                "description": "Create category-wise budgets to control spending. Studies show budgeting can reduce unnecessary expenses by up to 20%.",
                "impact": "High Impact",
                "color": "#5856D6",
                "category": "General",
                "potential_savings": 0,
            },
            {
                "id": "fallback_3",
                "type": "alert",
                "icon": "AlertCircle",
                "title": "Review Subscriptions",
                "description": "Check your subscription calendar for services you no longer use. Canceling unused subscriptions can save thousands annually.",
                "impact": "Medium Impact",
                "color": "#FF9500",
                "category": "Subscriptions",
                "potential_savings": 0,
            },
        ]
        
        return fallback[:count]
    
    async def _get_dismissed_suggestions(self, user_id: str) -> List[str]:
        """Get list of dismissed suggestion IDs"""
        db = await get_db()
        result = await db.dismissed_suggestions.find_one({"userId": user_id})
        return result.get("suggestions", []) if result else []
    
    async def dismiss_suggestion(self, user_id: str, suggestion_id: str):
        """Mark a suggestion as dismissed"""
        db = await get_db()
        await db.dismissed_suggestions.update_one(
            {"userId": user_id},
            {"$addToSet": {"suggestions": suggestion_id}},
            upsert=True
        )
