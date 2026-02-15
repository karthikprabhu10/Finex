from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional
from ..services.bill import BillService
from ..models.bill import BillCreate, BillUpdate
from ..utils.auth import extract_token_from_header, verify_supabase_token, extract_user_id_from_token

router = APIRouter()

# Dependency for extracting user from token
async def get_current_user(authorization: str = Header(None)):
    """Extract user from JWT token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header")
    
    token = extract_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    is_valid = await verify_supabase_token(token)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = extract_user_id_from_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not extract user ID from token")
    
    return user_id

@router.post("/")
async def create_bill(
    bill: BillCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new bill reminder"""
    try:
        print(f"[BILL_API] POST request - User ID: {user_id}, Bill: {bill.name}")
        bill.userId = user_id
        result = await BillService.create_bill(bill)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        print(f"[BILL_API] Error creating bill: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
async def get_bills(user_id: str = Depends(get_current_user)):
    """Get all bills for the current user"""
    try:
        bills = await BillService.get_bills(user_id)
        return {
            "status": "success",
            "data": bills
        }
    except Exception as e:
        print(f"[BILL_API] Error fetching bills: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/total")
async def get_bills_total(
    status: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """Get total amount for bills, optionally filtered by status"""
    try:
        total = await BillService.get_bills_total(user_id, status)
        return {
            "status": "success",
            "data": total
        }
    except Exception as e:
        print(f"[BILL_API] Error calculating total: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{bill_id}")
async def get_bill(
    bill_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get a specific bill by ID"""
    try:
        bill = await BillService.get_bill_by_id(user_id, bill_id)
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        return {
            "status": "success",
            "data": bill
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BILL_API] Error fetching bill: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{bill_id}")
async def update_bill(
    bill_id: str,
    update: BillUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a bill"""
    try:
        print(f"[BILL_API] PUT request - Bill ID: {bill_id}, User ID: {user_id}")
        result = await BillService.update_bill(user_id, bill_id, update)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        print(f"[BILL_API] Error updating bill: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{bill_id}")
async def delete_bill(
    bill_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a bill"""
    try:
        print(f"[BILL_API] DELETE request - Bill ID: {bill_id}, User ID: {user_id}")
        result = await BillService.delete_bill(user_id, bill_id)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        print(f"[BILL_API] Error deleting bill: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{bill_id}/reminder")
async def set_bill_reminder(
    bill_id: str,
    reminder_data: dict,
    user_id: str = Depends(get_current_user)
):
    """Set a reminder for a bill"""
    try:
        from ..services.notification import NotificationService
        from datetime import datetime
        
        # Get the bill
        bill = await BillService.get_bill_by_id(user_id, bill_id)
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        
        # Create notification
        notification = {
            "userId": user_id,
            "type": "bill_reminder",
            "title": f"Bill Reminder: {bill['name']}",
            "message": reminder_data.get("message", f"Bill {bill['name']} is due soon"),
            "billId": bill_id,
            "read": False,
            "createdAt": datetime.utcnow().isoformat()
        }
        
        result = await NotificationService.create_notification(notification)
        
        return {
            "status": "success",
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BILL_API] Error setting reminder: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{bill_id}/mark-paid")
async def mark_bill_as_paid(
    bill_id: str,
    user_id: str = Depends(get_current_user)
):
    """Mark a bill as paid and create a receipt"""
    try:
        from ..services.receipt import ReceiptService
        from ..models.receipt import ReceiptCreate, ReceiptItem
        from datetime import datetime
        
        # Get the bill
        bill = await BillService.get_bill_by_id(user_id, bill_id)
        if not bill:
            raise HTTPException(status_code=404, detail="Bill not found")
        
        # Create receipt from bill
        receipt_data = ReceiptCreate(
            userId=user_id,
            storeName=bill['name'],
            totalAmount=bill['amount'],
            date=datetime.utcnow().isoformat(),
            category=bill['category'],
            items=[ReceiptItem(
                name=bill['name'],
                quantity=1,
                price=bill['amount'],
                total=bill['amount'],
                category=bill['category']
            )],
            taxAmount=0,
            imageUrl="",  # No image for bill payments
            tags=["bill_payment"],
            notes=f"Bill payment for {bill['name']}"
        )
        
        # Create receipt
        receipt = await ReceiptService.create_receipt(receipt_data)
        
        # Update bill status to paid
        from ..models.bill import BillUpdate
        update_data = BillUpdate(status="paid")
        await BillService.update_bill(user_id, bill_id, update_data)
        
        return {
            "status": "success",
            "data": {
                "bill": bill,
                "receipt": receipt
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BILL_API] Error marking bill as paid: {e}")
        raise HTTPException(status_code=400, detail=str(e))
