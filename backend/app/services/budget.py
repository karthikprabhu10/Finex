from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from ..database import mongodb, ensure_mongo_connected
from ..models.budget import BudgetCreate, BudgetUpdate

class BudgetService:
    """Service for budget operations"""
    
    @staticmethod
    def get_collection():
        """Get budgets collection"""
        db = ensure_mongo_connected()
        return db["budgets"]
    
    @staticmethod
    async def create_budget(budget: BudgetCreate) -> dict:
        """Create or update user budget in MongoDB"""
        collection = BudgetService.get_collection()
        
        print(f"[BUDGET_CREATE] Received budget data: userId={budget.userId}, income={budget.monthlyIncome}, allocations={len(budget.allocations)}")
        
        # Check if user already has a budget
        existing = collection.find_one({"userId": budget.userId})
        
        budget_dict = budget.dict()
        budget_dict["updatedAt"] = datetime.utcnow()
        
        print(f"[BUDGET_CREATE] Budget dict: {budget_dict}")
        
        if existing:
            # Update existing budget
            print(f"[BUDGET_CREATE] Updating existing budget with ID: {existing['_id']}")
            budget_dict["createdAt"] = existing.get("createdAt", datetime.utcnow())
            collection.update_one(
                {"userId": budget.userId},
                {"$set": budget_dict}
            )
            return {
                "id": str(existing["_id"]),
                "message": "Budget updated successfully"
            }
        else:
            # Create new budget
            print(f"[BUDGET_CREATE] Creating new budget for user: {budget.userId}")
            budget_dict["createdAt"] = datetime.utcnow()
            result = collection.insert_one(budget_dict)
            print(f"[BUDGET_CREATE] Budget created with ID: {result.inserted_id}")
            return {
                "id": str(result.inserted_id),
                "message": "Budget created successfully"
            }
    
    @staticmethod
    async def get_budget(user_id: str) -> Optional[dict]:
        """Get user's budget"""
        collection = BudgetService.get_collection()
        
        budget = collection.find_one({"userId": user_id})
        if budget:
            budget["id"] = str(budget["_id"])
            del budget["_id"]
        return budget
    
    @staticmethod
    async def update_budget(user_id: str, update: BudgetUpdate) -> dict:
        """Update user's budget"""
        collection = BudgetService.get_collection()
        
        update_dict = {k: v for k, v in update.dict().items() if v is not None}
        update_dict["updatedAt"] = datetime.utcnow()
        
        result = collection.update_one(
            {"userId": user_id},
            {"$set": update_dict}
        )
        
        if result.modified_count > 0:
            return {"message": "Budget updated successfully"}
        else:
            return {"message": "No changes made"}
    
    @staticmethod
    async def delete_budget(user_id: str) -> dict:
        """Delete user's budget"""
        collection = BudgetService.get_collection()
        
        result = collection.delete_one({"userId": user_id})
        
        if result.deleted_count > 0:
            return {"message": "Budget deleted successfully"}
        else:
            return {"message": "Budget not found"}
