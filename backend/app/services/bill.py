from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from ..database import get_db
from ..models.bill import BillCreate, BillUpdate

class BillService:
    """Service for bill reminder operations"""
    
    @staticmethod
    async def get_collection():
        """Get bills collection"""
        db = await get_db()
        return db["bills"]
    
    @staticmethod
    async def create_bill(bill: BillCreate) -> dict:
        """Create a new bill reminder in MongoDB"""
        collection = await BillService.get_collection()
        
        print(f"[BILL_CREATE] Creating bill for user: {bill.userId}, name: {bill.name}, amount: {bill.amount}")
        
        bill_dict = bill.dict()
        bill_dict["createdAt"] = datetime.utcnow()
        bill_dict["updatedAt"] = datetime.utcnow()
        
        result = await collection.insert_one(bill_dict)
        print(f"[BILL_CREATE] Bill created with ID: {result.inserted_id}")
        
        return {
            "id": str(result.inserted_id),
            "message": "Bill created successfully"
        }
    
    @staticmethod
    async def get_bills(user_id: str) -> List[dict]:
        """Get all bills for a user"""
        collection = await BillService.get_collection()
        
        cursor = collection.find({"userId": user_id}).sort("dueDate", 1)
        bills = []
        async for bill in cursor:
            bill["id"] = str(bill["_id"])
            del bill["_id"]
            bills.append(bill)
        
        print(f"[BILL_GET] Retrieved {len(bills)} bills for user: {user_id}")
        return bills
    
    @staticmethod
    async def get_bill_by_id(user_id: str, bill_id: str) -> Optional[dict]:
        """Get a specific bill by ID"""
        collection = await BillService.get_collection()
        
        try:
            bill = await collection.find_one({
                "_id": ObjectId(bill_id),
                "userId": user_id
            })
            if bill:
                bill["id"] = str(bill["_id"])
                del bill["_id"]
            return bill
        except Exception as e:
            print(f"[BILL_GET] Error fetching bill: {e}")
            return None
    
    @staticmethod
    async def update_bill(user_id: str, bill_id: str, update: BillUpdate) -> dict:
        """Update a bill"""
        collection = await BillService.get_collection()
        
        update_dict = {k: v for k, v in update.dict().items() if v is not None}
        update_dict["updatedAt"] = datetime.utcnow()
        
        print(f"[BILL_UPDATE] Updating bill {bill_id} for user {user_id}")
        
        result = await collection.update_one(
            {"_id": ObjectId(bill_id), "userId": user_id},
            {"$set": update_dict}
        )
        
        if result.modified_count > 0:
            print(f"[BILL_UPDATE] Bill updated successfully")
            return {"message": "Bill updated successfully"}
        else:
            print(f"[BILL_UPDATE] No changes made or bill not found")
            return {"message": "No changes made or bill not found"}
    
    @staticmethod
    async def delete_bill(user_id: str, bill_id: str) -> dict:
        """Delete a bill"""
        collection = await BillService.get_collection()
        
        print(f"[BILL_DELETE] Deleting bill {bill_id} for user {user_id}")
        
        result = await collection.delete_one({
            "_id": ObjectId(bill_id),
            "userId": user_id
        })
        
        if result.deleted_count > 0:
            print(f"[BILL_DELETE] Bill deleted successfully")
            return {"message": "Bill deleted successfully"}
        else:
            print(f"[BILL_DELETE] Bill not found")
            return {"message": "Bill not found"}
    
    @staticmethod
    async def get_bills_total(user_id: str, status: Optional[str] = None) -> dict:
        """Calculate total amount for bills, optionally filtered by status"""
        collection = await BillService.get_collection()
        
        # Build query
        query = {"userId": user_id}
        if status:
            query["status"] = status
        
        # Get all matching bills
        cursor = collection.find(query)
        bills = []
        async for bill in cursor:
            bills.append(bill)
        
        # Calculate totals
        total_amount = sum(bill.get("amount", 0) for bill in bills)
        bill_count = len(bills)
        
        # Calculate by status
        pending_bills = [b for b in bills if b.get("status") == "pending"]
        upcoming_bills = [b for b in bills if b.get("status") == "upcoming"]
        paid_bills = [b for b in bills if b.get("status") == "paid"]
        
        pending_total = sum(b.get("amount", 0) for b in pending_bills)
        upcoming_total = sum(b.get("amount", 0) for b in upcoming_bills)
        paid_total = sum(b.get("amount", 0) for b in paid_bills)
        
        print(f"[BILL_TOTAL] User {user_id}: {bill_count} bills, Total: {total_amount}")
        
        return {
            "totalAmount": total_amount,
            "totalCount": bill_count,
            "pending": {
                "count": len(pending_bills),
                "total": pending_total
            },
            "upcoming": {
                "count": len(upcoming_bills),
                "total": upcoming_total
            },
            "paid": {
                "count": len(paid_bills),
                "total": paid_total
            }
        }
