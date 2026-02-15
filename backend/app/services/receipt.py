"""
Receipt Service Layer
Handles all MongoDB operations for receipts
"""

from typing import List, Optional
from datetime import datetime
from bson.objectid import ObjectId
from ..database import mongodb, ensure_mongo_connected
from ..models.receipt import Receipt, ReceiptCreate, ReceiptUpdate


class ReceiptService:
    """Service for managing receipts in MongoDB"""
    
    @staticmethod
    def get_collection():
        """Get the receipts collection"""
        # Ensure MongoDB is connected (lazy connection)
        db = ensure_mongo_connected()
        return db["receipts"]
    
    @staticmethod
    async def create_receipt(receipt: ReceiptCreate) -> dict:
        """Create a new receipt in MongoDB"""
        collection = ReceiptService.get_collection()
        
        receipt_dict = receipt.dict()
        print(f"[CREATE_RECEIPT] Receipt dict before save: {receipt_dict}")
        print(f"[CREATE_RECEIPT] Items in dict: {len(receipt_dict.get('items', []))} items")
        for idx, item in enumerate(receipt_dict.get('items', [])):
            print(f"[CREATE_RECEIPT]   Item {idx}: {item}")
            print(f"[CREATE_RECEIPT]   - Has category: {'category' in item}")
        
        receipt_dict["createdAt"] = datetime.utcnow()
        receipt_dict["updatedAt"] = datetime.utcnow()
        
        result = collection.insert_one(receipt_dict)
        print(f"[CREATE_RECEIPT] Receipt inserted with ID: {result.inserted_id}")
        
        return {
            "id": str(result.inserted_id),
            "message": "Receipt created successfully",
            "insertedId": str(result.inserted_id)
        }
    
    @staticmethod
    async def get_receipt(receipt_id: str) -> Optional[dict]:
        """Get a specific receipt by ID"""
        collection = ReceiptService.get_collection()
        
        try:
            receipt = collection.find_one({"_id": ObjectId(receipt_id)})
            if receipt:
                receipt["id"] = str(receipt["_id"])
                del receipt["_id"]
            return receipt
        except Exception as e:
            print(f"Error fetching receipt: {e}")
            return None
    
    @staticmethod
    async def get_all_receipts(limit: int = 100, skip: int = 0, user_id: str = None) -> List[dict]:
        """Get all receipts with pagination, optionally filtered by user_id"""
        collection = ReceiptService.get_collection()
        
        receipts = []
        # Filter by user_id if provided
        query = {"userId": user_id} if user_id else {}
        for receipt in collection.find(query).limit(limit).skip(skip):
            receipt["id"] = str(receipt["_id"])
            del receipt["_id"]
            receipts.append(receipt)
        
        return receipts
    
    @staticmethod
    async def get_receipts_by_category(category: str, limit: int = 100, user_id: str = None) -> List[dict]:
        """Get receipts filtered by category and optionally by user_id"""
        collection = ReceiptService.get_collection()
        
        receipts = []
        # Filter by category and user_id if provided
        query = {"category": category}
        if user_id:
            query["userId"] = user_id
        
        for receipt in collection.find(query).limit(limit):
            receipt["id"] = str(receipt["_id"])
            del receipt["_id"]
            receipts.append(receipt)
        
        return receipts
    
    @staticmethod
    async def get_receipts_by_date_range(start_date: str, end_date: str) -> List[dict]:
        """Get receipts within a date range"""
        collection = ReceiptService.get_collection()
        
        receipts = []
        for receipt in collection.find({
            "date": {
                "$gte": start_date,
                "$lte": end_date
            }
        }):
            receipt["id"] = str(receipt["_id"])
            del receipt["_id"]
            receipts.append(receipt)
        
        return receipts
    
    @staticmethod
    async def update_receipt(receipt_id: str, receipt_update: ReceiptUpdate) -> Optional[dict]:
        """Update a receipt"""
        collection = ReceiptService.get_collection()
        
        try:
            update_data = receipt_update.dict(exclude_unset=True)
            update_data["updatedAt"] = datetime.utcnow()
            
            result = collection.update_one(
                {"_id": ObjectId(receipt_id)},
                {"$set": update_data}
            )
            
            if result.matched_count:
                updated_receipt = collection.find_one({"_id": ObjectId(receipt_id)})
                updated_receipt["id"] = str(updated_receipt["_id"])
                del updated_receipt["_id"]
                return updated_receipt
            
            return None
        except Exception as e:
            print(f"Error updating receipt: {e}")
            return None
    
    @staticmethod
    async def delete_receipt(receipt_id: str) -> bool:
        """Delete a receipt"""
        collection = ReceiptService.get_collection()
        
        try:
            result = collection.delete_one({"_id": ObjectId(receipt_id)})
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting receipt: {e}")
            return False
            return False
    
    @staticmethod
    async def get_receipt_stats(user_id: str) -> dict:
        """Get receipt statistics for authenticated user including trends and categories"""
        collection = ReceiptService.get_collection()
        
        try:
            # Filter by user_id to get only their receipts
            total_count = collection.count_documents({"userId": user_id})
            
            # Calculate total amount spent and monthly breakdown
            pipeline = [
                {
                    "$match": {"userId": user_id}
                },
                {
                    "$group": {
                        "_id": None,
                        "totalAmount": {"$sum": "$totalAmount"},
                        "avgAmount": {"$avg": "$totalAmount"}
                    }
                }
            ]
            
            result = list(collection.aggregate(pipeline))
            
            # Get monthly spending trends (last 6 months)
            monthly_pipeline = [
                {
                    "$match": {"userId": user_id}
                },
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {
                                "format": "%B",
                                "date": {"$toDate": {"$multiply": [{"$toDate": "$date"}, 1]}} if isinstance(collection.find_one({"userId": user_id}), dict) else {"$dateFromString": {"dateString": "$date"}}
                            }
                        },
                        "amount": {"$sum": "$totalAmount"}
                    }
                },
                {
                    "$sort": {"_id": 1}
                }
            ]
            
            # Simpler approach: group by month from date field
            try:
                monthly_data = []
                receipts = list(collection.find({"userId": user_id}, {"date": 1, "totalAmount": 1}))
                
                # Group by month
                from collections import defaultdict
                from datetime import datetime
                
                monthly_totals = defaultdict(float)
                for receipt in receipts:
                    try:
                        # Parse date - handle both string and datetime formats
                        date_val = receipt.get("date", "")
                        if isinstance(date_val, str):
                            date_obj = datetime.strptime(date_val, "%Y-%m-%d")
                        else:
                            date_obj = date_val
                        
                        month_key = date_obj.strftime("%b")
                        monthly_totals[month_key] += receipt.get("totalAmount", 0)
                    except Exception as e:
                        print(f"Error parsing date: {e}")
                        continue
                
                # Convert to list format for frontend - show last 6 months dynamically
                # Get current month and generate last 6 months
                current_date = datetime.now()
                last_6_months = []
                
                for i in range(5, -1, -1):  # 5, 4, 3, 2, 1, 0 (6 months back to current)
                    # Calculate the month offset
                    target_month = current_date.month - i
                    target_year = current_date.year
                    
                    # Handle year rollover
                    while target_month <= 0:
                        target_month += 12
                        target_year -= 1
                    
                    # Create a date object for this month
                    month_date = datetime(target_year, target_month, 1)
                    month_abbr = month_date.strftime("%b")
                    last_6_months.append(month_abbr)
                
                # Build monthly data for these 6 months
                monthly_data = [
                    {"month": month, "amount": monthly_totals.get(month, 0)}
                    for month in last_6_months
                ]
            except Exception as e:
                print(f"Error getting monthly data: {e}")
                monthly_data = []
            
            # Get category breakdown by aggregating items from all receipts
            # Items have individual categories that need to be summed
            category_pipeline = [
                {
                    "$match": {"userId": user_id}
                },
                {
                    "$unwind": "$items"  # Expand items array to separate documents
                },
                {
                    "$group": {
                        "_id": "$items.category",  # Group by item category
                        "amount": {"$sum": "$items.price"},  # Sum item prices
                        "count": {"$sum": 1}  # Count items
                    }
                },
                {
                    "$sort": {"amount": -1}
                },
                {
                    "$limit": 15  # Include all categories up to 15
                }
            ]
            
            category_results = list(collection.aggregate(category_pipeline))
            category_breakdown = [
                {
                    "category": item.get("_id", "Uncategorized"),
                    "amount": item.get("amount", 0),
                    "count": item.get("count", 0)
                }
                for item in category_results
                if item.get("_id")  # Filter out items with None/empty category
            ]
            
            if result:
                return {
                    "totalReceipts": total_count,
                    "totalAmount": result[0].get("totalAmount", 0),
                    "averageAmount": result[0].get("avgAmount", 0),
                    "monthlyTrends": monthly_data,
                    "categoryBreakdown": category_breakdown
                }
            
            return {
                "totalReceipts": total_count,
                "totalAmount": 0,
                "averageAmount": 0,
                "monthlyTrends": monthly_data,
                "categoryBreakdown": category_breakdown
            }
        except Exception as e:
            print(f"Error getting stats: {e}")
            return {
                "totalReceipts": 0,
                "totalAmount": 0,
                "averageAmount": 0,
                "monthlyTrends": [],
                "categoryBreakdown": []
            }
