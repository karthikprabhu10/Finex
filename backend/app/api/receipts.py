from fastapi import APIRouter, File, UploadFile, HTTPException, Query, Header, Depends
from typing import List, Optional
import os
from datetime import datetime
from pathlib import Path
import uuid
from PIL import Image
from ..config import settings
from ..services.receipt import ReceiptService
from ..services.ocr import OCRService
from ..models.receipt import ReceiptCreate, ReceiptUpdate
from ..utils.auth import extract_token_from_header, verify_supabase_token, extract_user_id_from_token

router = APIRouter()

# Dependency for extracting user from token
async def get_current_user(authorization: str = Header(None)):
    """Extract user from JWT token"""
    print(f"[AUTH] Authorization header: {authorization[:50] if authorization else 'None'}...")
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    token = extract_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    
    # Verify token and get user ID
    user_id = extract_user_id_from_token(token)
    print(f"[AUTH] Extracted user_id: {user_id}")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user_id

def _save_uploaded_file(file: UploadFile) -> str:
    """Save uploaded file and return the file path"""
    try:
        # Ensure upload directory exists
        os.makedirs(settings.uploads_path, exist_ok=True)
        
        # Create unique filename
        file_ext = Path(file.filename).suffix.lower()
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        
        # Save file
        file_path = os.path.join(settings.uploads_path, unique_filename)
        with open(file_path, "wb") as buffer:
            buffer.write(file.file.read())
        
        return f"/uploads/{unique_filename}"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File save failed: {str(e)}")

def _create_thumbnail(file_path: str) -> str:
    """Create a thumbnail for image files"""
    try:
        full_path = file_path.lstrip("/")
        
        if not os.path.exists(full_path):
            return ""
        
        # Only create thumbnails for images
        if not file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
            return ""
        
        # Ensure thumbnail directory exists
        os.makedirs(settings.thumbnails_path, exist_ok=True)
        
        # Open image and create thumbnail
        img = Image.open(full_path)
        img.thumbnail((200, 200))
        
        # Save thumbnail
        thumb_filename = f"thumb_{Path(file_path).stem}.jpg"
        thumb_path = os.path.join(settings.thumbnails_path, thumb_filename)
        img.save(thumb_path, "JPEG", quality=85)
        
        return f"/thumbnails/{thumb_filename}"
    except Exception as e:
        print(f"Thumbnail creation failed: {e}")
        return ""

@router.post("/upload")
async def upload_receipt(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    """Upload a single receipt image"""
    try:
        # Validate file type
        allowed_types = ['.jpg', '.jpeg', '.png', '.pdf']
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_types:
            raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(allowed_types)}")
        
        # Check file size
        file_content = await file.read()
        file_size = len(file_content)
        if file_size > settings.max_file_size:
            raise HTTPException(status_code=400, detail=f"File too large. Max size: {settings.max_file_size} bytes")
        
        # Seek back to beginning for saving
        await file.seek(0)
        
        # Save file
        image_url = _save_uploaded_file(file)
        
        # Create thumbnail
        thumbnail_url = ""
        if file_ext in ['.jpg', '.jpeg', '.png']:
            thumbnail_url = _create_thumbnail(image_url)
        
        # Return file info (receipt creation will be done by frontend or separate request)
        return {
            "status": "success",
            "userId": user_id,
            "imageUrl": image_url,
            "thumbnailUrl": thumbnail_url,
            "filename": file.filename,
            "size": file_size
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload-batch")
async def upload_batch(
    files: List[UploadFile] = File(...),
    user_id: str = Depends(get_current_user)
):
    """Upload multiple receipt images with OCR processing"""
    print(f"[UPLOAD-BATCH] Received {len(files) if files else 0} files for user {user_id}")
    try:
        uploaded_files = []
        errors = []
        
        for file in files:
            try:
                # Validate file type
                allowed_types = ['.jpg', '.jpeg', '.png', '.pdf']
                file_ext = Path(file.filename).suffix.lower()
                
                if file_ext not in allowed_types:
                    errors.append({"file": file.filename, "error": "File type not allowed"})
                    continue
                
                # Check file size
                file_content = await file.read()
                file_size = len(file_content)
                if file_size > settings.max_file_size:
                    errors.append({"file": file.filename, "error": "File too large"})
                    continue
                
                # Seek back to beginning for saving
                await file.seek(0)
                
                # Read again for saving (alternative: rewind and read from file object)
                file.file.seek(0)
                
                # Save file
                image_url = _save_uploaded_file(file)
                
                # Create thumbnail
                thumbnail_url = ""
                if file_ext in ['.jpg', '.jpeg', '.png']:
                    thumbnail_url = _create_thumbnail(image_url)
                
                # Process OCR to extract receipt data
                # Convert URL path to actual file path
                full_image_path = os.path.join(settings.uploads_path, Path(image_url).name)
                ocr_result = OCRService.process_receipt_image(full_image_path)
                
                # Don't create receipt here - let the /verify endpoint handle it after user confirmation
                # This prevents double counting when user verifies the OCR data
                uploaded_files.append({
                    "status": "success",
                    "userId": user_id,
                    "imageUrl": image_url,
                    "thumbnailUrl": thumbnail_url,
                    "filename": file.filename,
                    "size": file_size,
                    "ocrData": {
                        "storeName": ocr_result.get("storeName", ""),
                        "totalAmount": ocr_result.get("totalAmount", 0.0),
                        "taxAmount": ocr_result.get("taxAmount", 0.0),
                        "items": ocr_result.get("items", []),
                        "date": ocr_result.get("date", ""),
                        "ocrStatus": ocr_result.get("status", "unknown"),
                        "ocrMessage": ocr_result.get("message", "")  # Include error message for debugging
                    }
                })
            except Exception as e:
                errors.append({"file": file.filename, "error": str(e)})
        
        return {
            "status": "success",
            "uploaded": uploaded_files,
            "errors": errors,
            "total": len(uploaded_files) + len(errors),
            "succeeded": len(uploaded_files)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify")
async def verify_ocr_receipt(
    receipt_data: dict,
    user_id: str = Depends(get_current_user)
):
    """Verify OCR extracted data and save receipt to MongoDB"""
    print(f"[VERIFY] Received verification request for user {user_id}")
    print(f"[VERIFY] Raw receipt_data: {receipt_data}")
    
    try:
        # Process items
        items = receipt_data.get("items", [])
        print(f"[VERIFY] Items received from frontend: {len(items)} items")
        
        # Convert items to plain dicts if needed and check for missing categories
        items_to_categorize = []
        items_indices = []
        
        for idx, item in enumerate(items):
            # Ensure item is a dict
            if not isinstance(item, dict):
                item = item.dict() if hasattr(item, 'dict') else dict(item)
                items[idx] = item
            
            print(f"[VERIFY]   Item {idx}: {item}")
            print(f"[VERIFY]   - Has category: {'category' in item}")
            print(f"[VERIFY]   - Has total: {'total' in item}")
            
            # If item doesn't have a category, add it to categorization list
            if 'category' not in item or not item.get('category'):
                items_to_categorize.append(item)
                items_indices.append(idx)
        
        # Categorize items that need it
        if items_to_categorize:
            print(f"[VERIFY] Auto-categorizing {len(items_to_categorize)} items without categories")
            categorized_items = OCRService.categorize_items(items_to_categorize)
            
            # Update original items with categorized versions
            for list_idx, orig_idx in enumerate(items_indices):
                items[orig_idx]['category'] = categorized_items[list_idx].get('category', 'Other')
                print(f"[VERIFY] Assigned category to item {orig_idx}: {items[orig_idx]['category']}")
        
        print(f"[VERIFY] All items now have categories")
        for idx, item in enumerate(items):
            print(f"[VERIFY]   Item {idx}: {item.get('name')} -> {item.get('category')}")
        
        # Infer receipt category from the most common item category
        item_categories = [item.get('category', 'Other') for item in items]
        from collections import Counter
        category_counts = Counter(item_categories)
        receipt_category = category_counts.most_common(1)[0][0] if category_counts else 'Other'
        
        # Create receipt with verified data
        receipt = ReceiptCreate(
            userId=user_id,
            storeName=receipt_data.get("storeName", ""),
            date=receipt_data.get("date", datetime.now().strftime("%Y-%m-%d")),
            totalAmount=float(receipt_data.get("totalAmount", 0.0)),
            taxAmount=float(receipt_data.get("taxAmount", 0.0)),
            category=receipt_category,  # Set receipt category from items
            items=items,  # Use items with categories now
            imageUrl=receipt_data.get("imageUrl", ""),
            tags=["verified", "ocr-extracted"],
            notes=receipt_data.get("notes", "Verified and saved from OCR popup")
        )
        
        print(f"[VERIFY] ReceiptCreate object created successfully")
        print(f"[VERIFY] Items in ReceiptCreate: {[item.dict() for item in receipt.items]}")
        
        result = await ReceiptService.create_receipt(receipt)
        print(f"[VERIFY] Receipt saved successfully. ID: {result.get('insertedId')}")
        return {
            "status": "success",
            "message": "Receipt verified and saved successfully",
            "data": result
        }
    except Exception as e:
        print(f"[VERIFY] Error: {str(e)}")
        import traceback
        print(f"[VERIFY] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/create")
async def create_receipt(
    receipt: ReceiptCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new receipt in MongoDB"""
    try:
        receipt.userId = user_id
        result = await ReceiptService.create_receipt(receipt)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
async def get_receipts(
    category: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(1000),
    user_id: str = Depends(get_current_user)
):
    """Get all receipts for authenticated user with optional filters"""
    try:
        if category:
            receipts = await ReceiptService.get_receipts_by_category(category, limit, user_id)
        else:
            receipts = await ReceiptService.get_all_receipts(limit, skip, user_id)
        
        return {
            "status": "success",
            "total": len(receipts),
            "skip": skip,
            "limit": limit,
            "receipts": receipts
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/stats")
async def get_stats(user_id: str = Depends(get_current_user)):
    """Get receipt statistics for authenticated user"""
    try:
        stats = await ReceiptService.get_receipt_stats(user_id)
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{receipt_id}")
async def get_receipt(
    receipt_id: str,
    user_id: str = Depends(get_current_user)
):
    """Get a specific receipt - only if owned by authenticated user"""
    try:
        receipt = await ReceiptService.get_receipt(receipt_id)
        if not receipt:
            raise HTTPException(status_code=404, detail="Receipt not found")
        
        if receipt.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return {
            "status": "success",
            "receipt": receipt
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{receipt_id}")
async def update_receipt(
    receipt_id: str,
    updates: ReceiptUpdate,
    user_id: str = Depends(get_current_user)
):
    """Update a receipt - only if owned by authenticated user"""
    try:
        receipt = await ReceiptService.get_receipt(receipt_id)
        if not receipt:
            raise HTTPException(status_code=404, detail="Receipt not found")
        
        if receipt.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        updated = await ReceiptService.update_receipt(receipt_id, updates)
        
        return {
            "status": "success",
            "receipt": updated
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{receipt_id}")
async def delete_receipt(
    receipt_id: str,
    user_id: str = Depends(get_current_user)
):
    """Delete a receipt - only if owned by authenticated user"""
    try:
        receipt = await ReceiptService.get_receipt(receipt_id)
        if not receipt:
            raise HTTPException(status_code=404, detail="Receipt not found")
        
        if receipt.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        deleted = await ReceiptService.delete_receipt(receipt_id)
        
        return {
            "status": "success",
            "message": f"Receipt {receipt_id} deleted"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
