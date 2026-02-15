"""
OCR Service for Receipt Processing
Uses PaddleOCR for accurate receipt data extraction
"""

import os
# Disable model source check if not already disabled
if not os.getenv('DISABLE_MODEL_SOURCE_CHECK'):
    os.environ['DISABLE_MODEL_SOURCE_CHECK'] = 'True'

import re
from typing import Dict, List, Optional
from datetime import datetime
import json
from difflib import SequenceMatcher

# Try to import Gemini API, but make it optional
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("[WARNING] google-generative-ai not installed. Install with: pip install google-generative-ai")

# Lazy import PaddleOCR only when needed
PaddleOCR = None

def get_paddle_ocr():
    """Lazy load PaddleOCR to avoid blocking startup"""
    global PaddleOCR
    if PaddleOCR is None:
        from paddleocr import PaddleOCR as _PaddleOCR
        PaddleOCR = _PaddleOCR
    return PaddleOCR

class OCRService:
    """Service for OCR processing of receipts using PaddleOCR-VL"""
    
    _ocr_model = None
    
    @classmethod
    def get_ocr_model(cls):
        """Get or create PaddleOCR-VL model instance"""
        if cls._ocr_model is None:
            print("[OCR] Initializing PaddleOCR-VL model...")
            try:
                _PaddleOCR = get_paddle_ocr()
                cls._ocr_model = _PaddleOCR(lang='en')
                print("[OK] PaddleOCR-VL model initialized successfully")
            except Exception as e:
                print(f"[ERROR] Failed to initialize PaddleOCR: {e}")
                raise RuntimeError(f"Failed to initialize OCR model: {e}")
        return cls._ocr_model
    
    @staticmethod
    def extract_text_from_image(image_path: str) -> Dict:
        """Extract receipt data from image using PaddleOCR-VL"""
        try:
            print(f"[OCR] Starting extraction for: {image_path}")
            
            # Convert to absolute path
            if not os.path.isabs(image_path):
                image_path = os.path.abspath(image_path)
            
            # Check if file exists
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")
            
            print(f"[OCR] Loading image from: {image_path}")
            
            # Get OCR model
            ocr = OCRService.get_ocr_model()
            
            # Run OCR on image
            print("[OCR] Running PaddleOCR recognition...")
            result = ocr.ocr(image_path, cls=True)
            
            if not result or not result[0]:
                print("[WARNING] No text detected in image")
                return {
                    "storeName": "Unknown Store",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "totalAmount": 0.0,
                    "taxAmount": 0.0,
                    "subtotal": 0.0,
                    "paymentMethod": "Unknown",
                    "items": [],
                    "notes": "No text detected in image"
                }
            
            # Extract text from PaddleOCR result
            # result[0] is the first page/image
            # Each item is [bbox, (text, confidence)]
            ocr_result = result[0]
            texts = [line[1][0] for line in ocr_result if line and len(line) > 1]
            
            if not texts:
                print("[WARNING] No recognized text in OCR result")
                return {
                    "storeName": "Unknown Store",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "totalAmount": 0.0,
                    "taxAmount": 0.0,
                    "subtotal": 0.0,
                    "paymentMethod": "Unknown",
                    "items": [],
                    "notes": "OCR model could not recognize text"
                }
            
            print(f"[OCR] Extracted {len(texts)} text lines from image")
            print(f"[OCR] Sample text: {texts[:3]}")
            
            # Parse receipt data from extracted text
            extracted_text = "\n".join(texts)
            receipt_data = OCRService.parse_receipt_text(extracted_text)
            
            return receipt_data
            
        except Exception as e:
            print(f"[ERROR] Exception in extract_text_from_image: {type(e).__name__}: {str(e)}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            raise
    
    @staticmethod
    def parse_receipt_text(text: str) -> Dict:
        """Parse receipt data from extracted text using Gemini AI"""
        try:
            print("[OCR] Parsing receipt text...")
            
            # Initialize receipt data
            receipt_data = {
                "storeName": "Unknown Store",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "totalAmount": 0.0,
                "taxAmount": 0.0,
                "subtotal": 0.0,
                "paymentMethod": "Unknown",
                "items": [],
                "notes": ""
            }
            
            # Get Gemini API key
            api_key = os.getenv('GEMINI_API_KEY')
            
            # Try Gemini API first if available and configured
            if GEMINI_AVAILABLE and api_key:
                try:
                    print("[OCR] Using Gemini AI for intelligent receipt parsing...")
                    return OCRService._parse_with_gemini(text)
                except Exception as e:
                    print(f"[WARNING] Gemini API call failed: {e}, using fallback parsing")
                    return OCRService._fallback_parse_receipt_text(text)
            else:
                if not GEMINI_AVAILABLE:
                    print("[WARNING] google-generative-ai not installed. Install with: pip install google-generative-ai")
                else:
                    print("[WARNING] GEMINI_API_KEY not set in environment")
                return OCRService._fallback_parse_receipt_text(text)
            
        except Exception as e:
            print(f"[ERROR] Error parsing receipt text: {e}")
            return {
                "storeName": "Unknown Store",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "totalAmount": 0.0,
                "taxAmount": 0.0,
                "subtotal": 0.0,
                "paymentMethod": "Unknown",
                "items": []
            }
    
    @staticmethod
    def _parse_with_gemini(text: str) -> Dict:
        """Parse receipt using Gemini API"""
        receipt_data = {
            "storeName": "Unknown Store",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "totalAmount": 0.0,
            "taxAmount": 0.0,
            "subtotal": 0.0,
            "paymentMethod": "Unknown",
            "items": [],
        }
        
        api_key = os.getenv('GEMINI_API_KEY')
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        
        prompt = f"""You are a receipt data extraction expert. Analyze the following OCR text from a receipt and extract structured data.

Receipt OCR text:
{text}

Extract and return ONLY a JSON object with exactly this structure (no markdown, no extra text):
{{
  "storeName": "Store name from receipt",
  "date": "Date in YYYY-MM-DD format, or today's date if not found",
  "time": "Time if found, empty string if not",
  "totalAmount": total amount as number (NOT string),
  "taxAmount": tax amount as number or 0,
  "subtotal": subtotal as number or calculate as total - tax,
  "paymentMethod": "Payment method if found",
  "items": [
    {{
      "name": "Item name",
      "quantity": 1.0,
      "price": unit price as number,
      "total": total price as number
    }}
  ]
}}

Rules:
1. Extract ONLY actual receipt items, NOT addresses, headers, or metadata
2. Parse prices carefully - they should be reasonable amounts
3. If tax line exists (TAX, GST, VAT), extract that value
4. Items should have both a name and a price
5. Return valid JSON only, nothing else"""
        
        print("[OCR] Sending text to Gemini API...")
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Clean up the response (remove markdown code blocks if present)
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        print(f"[OCR] Gemini response received: {response_text[:200]}...")
        
        # Parse JSON response
        parsed = json.loads(response_text)
        
        # Validate and clean the response
        receipt_data["storeName"] = str(parsed.get("storeName", "Unknown Store")).strip()
        receipt_data["date"] = str(parsed.get("date", datetime.now().strftime("%Y-%m-%d")))
        receipt_data["totalAmount"] = float(parsed.get("totalAmount", 0.0))
        receipt_data["taxAmount"] = float(parsed.get("taxAmount", 0.0))
        receipt_data["subtotal"] = float(parsed.get("subtotal", 0.0))
        receipt_data["paymentMethod"] = str(parsed.get("paymentMethod", "Unknown")).strip()
        
        # Process items
        items = parsed.get("items", [])
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict) and item.get("name") and item.get("price"):
                    receipt_data["items"].append({
                        "name": str(item["name"]).strip()[:100],
                        "quantity": float(item.get("quantity", 1.0)),
                        "price": float(item["price"]),
                        "total": float(item.get("total", float(item.get("price", 0.0))))
                    })
        
        # Validate amounts
        if receipt_data["subtotal"] <= 0 and receipt_data["totalAmount"] > 0:
            receipt_data["subtotal"] = max(0, receipt_data["totalAmount"] - receipt_data["taxAmount"])
        
        # Limit items
        receipt_data["items"] = receipt_data["items"][:50]
        
        print(f"[OCR] Gemini parsing: {receipt_data['storeName']}, Total: ${receipt_data['totalAmount']:.2f}, Items: {len(receipt_data['items'])}, Tax: ${receipt_data['taxAmount']:.2f}")
        
        return receipt_data
    
    @staticmethod
    def _fallback_parse_receipt_text(text: str) -> Dict:
        """Fallback regex-based parsing for when Gemini API is not available"""
        print("[OCR] Using fallback regex-based parsing...")
        
        receipt_data = {
            "storeName": "Unknown Store",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "totalAmount": 0.0,
            "taxAmount": 0.0,
            "subtotal": 0.0,
            "paymentMethod": "Unknown",
            "items": [],
        }
        
        lines = text.split('\n')
        
        # Extract store name (first valid line that's not metadata/address/time)
        for line in lines[:12]:  # Check first 12 lines only
            line_stripped = line.strip()
            line_lower = line_stripped.lower()
            
            # Skip empty lines or very short lines
            if not line_stripped or len(line_stripped) < 2:
                continue
            
            # Skip address lines (contain address keywords)
            if any(x in line_lower for x in ['street', 'avenue', 'avenue', 'road', 'drive', 'blvd', 'suite', 'apt', 'floor']):
                continue
            
            # Skip state abbreviations (2 letters followed by zip code)
            if re.match(r'^[a-z]{2}\s+\d{5}', line_lower):
                continue
            
            # Skip time lines (HH:MM AM/PM format)
            if re.match(r'^\d{1,2}:\d{2}\s*(a\.?m\.?|p\.?m\.?)', line_lower, re.IGNORECASE):
                continue
            
            # Skip date lines
            if re.match(r'^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', line_stripped):
                continue
            
            # Skip zip code only lines
            if re.match(r'^\d{5}(-\d{4})?$', line_stripped):
                continue
            
            # Skip lines that are payment methods or metadata labels
            if any(x in line_lower for x in ['total', 'subtotal', 'tax', 'gst', 'vat', 'balance', 'change', 'tip', 'host', 'server', 'tab', 'amex', 'visa', 'mastercard', 'discover', 'diners', 'payment', 'card', 'account', 'receipt']):
                continue
            
            # Skip lines that look like prices ($X.XX) or QTY numbers
            if re.match(r'^\$\s*\d+\.\d{2}$', line_stripped) or re.match(r'^\d+\s*x\s*\d+', line_stripped):
                continue
            
            # Skip pure numbers (could be codes, PINs, etc)
            if re.match(r'^\d+$', line_stripped):
                continue
            
            # This line looks like a store name!
            receipt_data["storeName"] = line_stripped
            print(f"[OCR] Extracted store name: {receipt_data['storeName']}")
            break
        
        # Extract date
        date_patterns = [
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})',
        ]
        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                date_str = match.group(1)
                try:
                    parsed_date = datetime.strptime(date_str.replace('-', '/'), '%d/%m/%Y')
                    receipt_data["date"] = parsed_date.strftime("%Y-%m-%d")
                    break
                except:
                    try:
                        parsed_date = datetime.strptime(date_str.replace('-', '/'), '%Y/%m/%d')
                        receipt_data["date"] = parsed_date.strftime("%Y-%m-%d")
                        break
                    except:
                        pass
        
        # Find receipt boundaries to identify item section
        items_start_idx = -1
        items_end_idx = len(lines)
        
        skip_keywords = ['total', 'tax', 'gst', 'vat', 'subtotal', 'amt', 'balance', 'change', 'payment', 'card', 'host', 'tab', 'date', 'time', 'desc', 'ty', 'receipt']
        
        for i, line in enumerate(lines):
            line_lower = line.lower().strip()
            # Start of items section (after headers)
            if any(x in line_lower for x in ['desc', 'item']):
                items_start_idx = i + 1
            # End of items section (before totals)
            if any(x in line_lower for x in ['subtotal', 'total', 'tax', 'balance']):
                items_end_idx = i
                break
        
        # If we didn't find clear markers, scan for items automatically
        if items_start_idx == -1:
            # Look for first line with a price (likely first item)
            for i, line in enumerate(lines):
                if re.search(r'\$\s*(\d+\.\d{2})', line):
                    # Found first price, items likely start around here
                    items_start_idx = max(0, i - 5)  # Go back 5 lines to catch any items without visible prices
                    break
            
            # If still not found, assume items are after first 10 lines
            if items_start_idx == -1:
                items_start_idx = 10
        
        # Ensure valid range
        if items_end_idx == len(lines) and items_start_idx >= 0:
            items_end_idx = max(items_start_idx, len(lines) - 5)
        
        if items_end_idx <= items_start_idx:
            items_end_idx = items_start_idx + 1
        
        # Extract items from identified section
        i = items_start_idx
        while i < items_end_idx and i < len(lines):
            line = lines[i].strip()
            
            # Skip empty lines
            if not line:
                i += 1
                continue
            
            # Skip metadata lines
            if any(kw in line.lower() for kw in skip_keywords):
                i += 1
                continue
            
            # Skip address/location lines
            if re.search(r'\d{5}(?:\s*[-,]|$)', line) or any(x in line.lower() for x in ['street', 'avenue', 'road', 'drive', 'blvd', 'suite']):
                i += 1
                continue
            
            # Skip time patterns (HH:MM AM/PM)
            if re.match(r'^\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?$', line):
                i += 1
                continue
            
            # Check if current line is an item name and next line is a price
            is_price_next = False
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                if re.match(r'^\$?\s*(\d+\.?\d*|\d*\.\d+)$', next_line):
                    is_price_next = True
            
            # Check if line contains a price
            has_price_inline = bool(re.search(r'\$\s*(\d+\.?\d*|\d*\.\d+)', line))
            
            if has_price_inline or is_price_next:
                item_name = line
                item_price = 0.0
                
                if has_price_inline:
                    # Price is on the same line
                    match = re.search(r'\$\s*(\d+\.?\d*|\d*\.\d+)', line)
                    if match:
                        item_name = re.sub(r'\s*\$\s*\d+\.?\d*|\d*\.\d+$', '', line).strip()
                        item_price = float(match.group(1))
                elif is_price_next:
                    # Price is on next line
                    i += 1
                    price_line = lines[i].strip()
                    price_match = re.match(r'^\$?\s*(\d+\.?\d*|\d*\.\d+)$', price_line)
                    if price_match:
                        item_price = float(price_match.group(1))
                
                # Validate item
                if item_price > 0 and len(item_name) > 1 and not any(x in item_name.lower() for x in skip_keywords):
                    receipt_data["items"].append({
                        "name": item_name[:100],
                        "quantity": 1.0,
                        "price": item_price,
                        "total": item_price
                    })
            
            i += 1
        
        # Extract tax and total amounts from the footer section
        footer_start = max(0, items_end_idx - 1)
        for i in range(footer_start, len(lines)):
            line = lines[i].strip()
            line_lower = line.lower()
            
            if 'tax' in line_lower or 'gst' in line_lower or 'vat' in line_lower:
                # Look for amount - search for $ followed by digits
                match = re.search(r'\$\s*(\d+\.?\d*|\d*\.\d+)', line)
                if match:
                    try:
                        receipt_data["taxAmount"] = float(match.group(1))
                        print(f"[OCR] Extracted tax amount: ${receipt_data['taxAmount']}")
                    except ValueError:
                        pass
                else:
                    # Try next line if no $ on current line
                    if i + 1 < len(lines):
                        next_line = lines[i + 1].strip()
                        next_match = re.search(r'\$?\s*(\d+\.?\d*|\d*\.\d+)', next_line)
                        if next_match:
                            try:
                                receipt_data["taxAmount"] = float(next_match.group(1))
                                print(f"[OCR] Extracted tax amount from next line: ${receipt_data['taxAmount']}")
                            except ValueError:
                                pass
            
            if 'total' in line_lower and 'subtotal' not in line_lower:
                # Look for $ followed by digits
                match = re.search(r'\$\s*(\d+\.?\d*|\d*\.\d+)', line)
                if match:
                    try:
                        receipt_data["totalAmount"] = float(match.group(1))
                        print(f"[OCR] Extracted total amount: ${receipt_data['totalAmount']}")
                    except ValueError:
                        pass
                else:
                    # Try next line
                    if i + 1 < len(lines):
                        next_line = lines[i + 1].strip()
                        next_match = re.search(r'\$?\s*(\d+\.?\d*|\d*\.\d+)', next_line)
                        if next_match:
                            try:
                                receipt_data["totalAmount"] = float(next_match.group(1))
                                print(f"[OCR] Extracted total amount from next line: ${receipt_data['totalAmount']}")
                            except ValueError:
                                pass
            
            if 'subtotal' in line_lower:
                # Look for $ followed by digits
                match = re.search(r'\$\s*(\d+\.?\d*|\d*\.\d+)', line)
                if match:
                    try:
                        receipt_data["subtotal"] = float(match.group(1))
                        print(f"[OCR] Extracted subtotal: ${receipt_data['subtotal']}")
                    except ValueError:
                        pass
                else:
                    # Try next line
                    if i + 1 < len(lines):
                        next_line = lines[i + 1].strip()
                        next_match = re.search(r'\$?\s*(\d+\.?\d*|\d*\.\d+)', next_line)
                        if next_match:
                            try:
                                receipt_data["subtotal"] = float(next_match.group(1))
                                print(f"[OCR] Extracted subtotal from next line: ${receipt_data['subtotal']}")
                            except ValueError:
                                pass
        
        # Calculate missing values
        if receipt_data["subtotal"] <= 0 and receipt_data["totalAmount"] > 0:
            receipt_data["subtotal"] = max(0, receipt_data["totalAmount"] - receipt_data["taxAmount"])
        if receipt_data["totalAmount"] <= 0 and receipt_data["subtotal"] > 0:
            receipt_data["totalAmount"] = receipt_data["subtotal"] + receipt_data["taxAmount"]
        
        # If still no total, try to sum items
        if receipt_data["totalAmount"] <= 0 and receipt_data["items"]:
            receipt_data["totalAmount"] = sum(item["total"] for item in receipt_data["items"]) + receipt_data["taxAmount"]
        
        # Limit items
        receipt_data["items"] = receipt_data["items"][:50]
        
        print(f"[OCR] Fallback parsing: {receipt_data['storeName']}, Total: ${receipt_data['totalAmount']:.2f}, Items: {len(receipt_data['items'])}, Tax: ${receipt_data['taxAmount']:.2f}")
        
        return receipt_data
    
    @staticmethod
    def parse_receipt_data(ocr_response: Dict) -> Dict:
        """Normalize and validate OCR response data"""
        try:
            # Ensure all required fields exist with proper types
            data = {
                "storeName": str(ocr_response.get("storeName", "")).strip() or "Unknown Store",
                "date": str(ocr_response.get("date", datetime.now().strftime("%Y-%m-%d"))),
                "totalAmount": float(ocr_response.get("totalAmount", 0.0)),
                "taxAmount": float(ocr_response.get("taxAmount", 0.0)),
                "subtotal": float(ocr_response.get("subtotal", 0.0)),
                "paymentMethod": str(ocr_response.get("paymentMethod", "")).strip() or "Unknown",
                "items": [],
            }
            
            # Parse items
            raw_items = ocr_response.get("items", [])
            if isinstance(raw_items, list):
                for idx, item in enumerate(raw_items):
                    if isinstance(item, dict):
                        parsed_item = {
                            "name": str(item.get("name", f"Item {idx+1}")).strip()[:100],
                            "quantity": float(item.get("quantity", 1.0)),
                            "price": float(item.get("price", 0.0)),
                            "total": float(item.get("total", 0.0))
                        }
                        # Only add items with valid names and prices
                        if parsed_item["name"] and parsed_item["price"] > 0:
                            data["items"].append(parsed_item)
            
            # Limit to 50 items max
            data["items"] = data["items"][:50]
            
            # Validate date format
            try:
                datetime.strptime(data["date"], "%Y-%m-%d")
            except ValueError:
                data["date"] = datetime.now().strftime("%Y-%m-%d")
            
            # Ensure total amount is reasonable
            if data["totalAmount"] <= 0 and len(data["items"]) > 0:
                data["totalAmount"] = sum(item["total"] for item in data["items"])
            
            # Calculate subtotal if not provided
            if data["subtotal"] <= 0:
                data["subtotal"] = max(0, data["totalAmount"] - data["taxAmount"])
            
            return data
        
        except Exception as e:
            print(f"Error parsing receipt data: {e}")
            return {
                "storeName": "Unknown Store",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "totalAmount": 0.0,
                "taxAmount": 0.0,
                "subtotal": 0.0,
                "paymentMethod": "Unknown",
                "items": []
            }
    
    @staticmethod
    def categorize_items(items: List[Dict]) -> List[Dict]:
        """Categorize items using fuzzy matching with comprehensive item database"""
        if not items:
            return items
        
        # Use fuzzy matching with item database
        return OCRService._categorize_with_fuzzy_matching(items)
    
    @staticmethod
    def _get_item_database() -> Dict[str, List[str]]:
        """Comprehensive database of items categorized by expense type"""
        return {
            'Food & Dining': [
                'coffee', 'espresso', 'latte', 'cappuccino', 'americano', 'macchiato', 'mocha', 'flat white',
                'tea', 'iced tea', 'matcha', 'chai', 'smoothie', 'milkshake', 'juice', 'soda', 'cola',
                'water', 'beer', 'wine', 'cocktail', 'liquor',
                'burger', 'pizza', 'pasta', 'sandwich', 'wrap', 'taco', 'burrito', 'salad', 'soup', 'stew',
                'steak', 'chicken', 'fish', 'shrimp', 'rice', 'noodles', 'ramen', 'pho', 'sushi', 'sashimi',
                'dumpling', 'dim sum', 'spring roll', 'pad thai', 'curry', 'tacos', 'enchilada',
                'pancake', 'waffle', 'omelette', 'bacon', 'sausage', 'ham', 'toast', 'bagel', 'croissant',
                'donut', 'cake', 'pie', 'cookie', 'brownie', 'candy', 'chocolate', 'ice cream', 'dessert',
                'scone', 'muffin', 'bread', 'roll', 'biscuit',
                'restaurant', 'cafe', 'coffee shop', 'diner', 'bistro', 'bar', 'pub', 'tavern', 'grill', 'steakhouse',
                'pizzeria', 'bakery', 'meal', 'fast food', 'takeout', 'delivery', 'lunch', 'dinner', 'breakfast'
            ],
            'Groceries': [
                'apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'strawberry', 'blueberry', 'raspberry',
                'cherry', 'peach', 'pear', 'pineapple', 'mango', 'papaya', 'kiwi', 'watermelon', 'avocado',
                'tomato', 'onion', 'garlic', 'carrot', 'celery', 'pepper', 'cucumber', 'lettuce', 'spinach',
                'broccoli', 'cabbage', 'cauliflower', 'corn', 'peas', 'beans', 'potato', 'sweet potato',
                'mushroom', 'zucchini', 'squash', 'eggplant', 'asparagus',
                'milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage cheese',
                'mozzarella', 'cheddar', 'parmesan', 'eggs', 'egg',
                'beef', 'pork', 'turkey', 'lamb', 'salmon', 'tuna', 'cod', 'crab', 'lobster',
                'bread', 'rice', 'pasta', 'cereal', 'oats', 'flour', 'sugar', 'salt', 'spice',
                'oil', 'olive oil', 'vegetable oil', 'vinegar', 'soy sauce', 'sauce', 'condiment',
                'ketchup', 'mustard', 'mayonnaise', 'jam', 'jelly', 'honey', 'peanut butter', 'almond butter',
                'nuts', 'almonds', 'walnuts', 'cashews', 'peanuts', 'seeds', 'dried fruit', 'raisins',
                'canned', 'frozen', 'lentils', 'chickpeas', 'soup', 'broth', 'stock',
                'grocery', 'supermarket', 'market', 'whole foods', 'trader joes', 'safeway', 'kroger', 'walmart'
            ],
            'Fuel & Transport': [
                'gas', 'gasoline', 'fuel', 'petrol', 'diesel', 'pump', 'shell', 'exxon', 'chevron',
                'uber', 'lyft', 'taxi', 'cab', 'transit', 'bus', 'train', 'metro', 'subway', 'railway',
                'parking', 'toll', 'car wash', 'oil change', 'car maintenance', 'car repair', 'mechanic',
                'tire', 'battery', 'parts', 'bike', 'scooter', 'transportation', 'commute', 'ride',
                'shuttle', 'airport', 'rental', 'car rental', 'motorcycle', 'truck'
            ],
            'Entertainment': [
                'movie', 'cinema', 'theater', 'theatre', 'ticket', 'film', 'show', 'concert', 'music',
                'game', 'video game', 'gaming', 'playstation', 'xbox', 'nintendo', 'steam',
                'sports', 'gym', 'fitness', 'yoga', 'park', 'theme park', 'zoo', 'aquarium', 'museum',
                'vacation', 'travel', 'hotel', 'motel', 'resort', 'airbnb',
                'streaming', 'netflix', 'spotify', 'hulu', 'disney', 'amazon prime', 'subscription',
                'hobby', 'craft', 'art', 'instrument'
            ],
            'Shopping': [
                'store', 'mall', 'shop', 'retail', 'boutique', 'outlet', 'amazon', 'ebay', 'target',
                'walmart', 'bestbuy', 'department store',
                'clothing', 'apparel', 'clothes', 'shirt', 'pants', 'jeans', 'shorts', 'skirt', 'dress',
                'jacket', 'coat', 'sweater', 'hoodie', 'hat', 'cap', 'scarf', 'gloves', 'socks', 'shoes',
                'sneakers', 'boots', 'sandals', 'heels', 'belt', 'bag', 'purse', 'backpack', 'suitcase',
                'wallet', 'watch', 'jewelry', 'necklace', 'bracelet', 'ring', 'earring', 'sunglasses',
                'fashion', 'designer', 'nike', 'adidas', 'puma', 'zara', 'h&m', 'gap',
                'makeup', 'cosmetics', 'perfume', 'cologne', 'skincare', 'lotion'
            ],
            'Medical': [
                'pharmacy', 'pharmacist', 'prescription', 'medicine', 'medication', 'drug',
                'hospital', 'clinic', 'medical center', 'urgent care', 'doctor', 'physician',
                'dentist', 'dental', 'optometrist', 'eye doctor', 'optician', 'health', 'healthcare',
                'cvs', 'walgreens', 'rite aid', 'drugstore', 'vitamin', 'supplement', 'protein',
                'pain relief', 'ibuprofen', 'aspirin', 'tylenol', 'cold medicine', 'cough syrup',
                'bandage', 'gauze', 'thermometer', 'vaccine', 'immunization', 'checkup', 'exam',
                'test', 'lab', 'xray', 'ultrasound'
            ],
            'Utilities': [
                'electricity', 'electric', 'power', 'water bill', 'sewage', 'sewer', 'gas bill',
                'natural gas', 'propane', 'internet', 'broadband', 'wifi', 'isp', 'verizon', 'comcast',
                'phone', 'cellular', 'mobile', 'cable', 'tv', 'television', 'satellite', 'dish',
                'subscription', 'membership', 'bill payment', 'utility bill'
            ],
            'Education': [
                'school', 'elementary', 'middle school', 'high school', 'college', 'university', 'grad school',
                'course', 'class', 'lesson', 'tuition', 'registration', 'training', 'workshop', 'seminar',
                'book', 'magazine', 'novel', 'comic', 'audiobook', 'textbook', 'notebook', 'pen', 'pencil', 'paper', 'stationery', 'supplies',
                'backpack', 'lunch box', 'student', 'academic', 'learning', 'study', 'online course',
                'udemy', 'coursera', 'skillshare', 'masterclass'
            ],
            'Home & Garden': [
                'furniture', 'bed', 'mattress', 'sofa', 'couch', 'chair', 'desk', 'table',
                'nightstand', 'dresser', 'bookshelf', 'cabinet', 'closet', 'lamp', 'light', 'lighting',
                'bulb', 'curtain', 'blind', 'shade', 'drapes', 'rug', 'carpet', 'flooring',
                'paint', 'wallpaper', 'tile', 'wood', 'hardware', 'nail', 'screw', 'bolt', 'saw',
                'drill', 'hammer', 'wrench', 'home depot', 'lowes', 'home improvement',
                'garden', 'gardening', 'landscaping', 'plants', 'flowers', 'seeds', 'grass', 'lawn',
                'fertilizer', 'mulch', 'soil', 'patio', 'deck', 'outdoor', 'grill', 'bbq',
                'refrigerator', 'oven', 'stove', 'microwave', 'dishwasher', 'washing machine', 'dryer',
                'water heater', 'furnace', 'air conditioning', 'hvac', 'appliance', 'ikea', 'wayfair'
            ],
            'Maintenance': [
                'repair', 'fix', 'maintenance', 'service', 'car repair', 'auto repair', 'mechanic',
                'home repair', 'contractor', 'plumber', 'electrician', 'cleaning', 'house cleaning',
                'carpet cleaning', 'dry cleaning', 'laundry', 'pest control', 'exterminator',
                'inspection', 'warranty', 'extended warranty', 'insurance', 'protection plan'
            ]
        }
    
    @staticmethod
    def _categorize_with_fuzzy_matching(items: List[Dict]) -> List[Dict]:
        """Categorize items using fuzzy string matching with comprehensive database"""
        item_db = OCRService._get_item_database()
        
        for item in items:
            item_name = item.get('name', '').lower().strip()
            best_category = 'Other'
            best_score = 0.0
            
            # Check each category for best match
            for category, keywords in item_db.items():
                for keyword in keywords:
                    # Calculate similarity score using multiple methods
                    
                    # Method 1: Exact substring match (highest priority)
                    if keyword in item_name:
                        score = 1.0
                    # Method 2: Item name is substring of keyword (handles partial matches)
                    elif item_name in keyword:
                        score = 0.95
                    # Method 3: Fuzzy matching using sequence matcher
                    else:
                        score = SequenceMatcher(None, item_name, keyword).ratio()
                    
                    # Update best match if this is better
                    if score > best_score and score > 0.65:  # 65% threshold for fuzzy match
                        best_score = score
                        best_category = category
                        
                        # Stop early if we found a perfect or near-perfect match
                        if score > 0.95:
                            break
                
                # Break outer loop if we found excellent match
                if best_score > 0.95:
                    break
            
            item['category'] = best_category
            print(f"[OCR] '{item_name}' -> {best_category} (confidence: {best_score:.2f})")
        
        return items
    
    @staticmethod
    def process_receipt_image(image_path: str) -> Dict:
        """Complete OCR processing: extract receipt data and parse it"""
        try:
            print(f"[OCR] Processing receipt image: {image_path}")
            
            # Extract structured data from image using PaddleOCR-VL
            ocr_response = OCRService.extract_text_from_image(image_path)
            
            # Normalize and validate the response
            parsed_data = OCRService.parse_receipt_data(ocr_response)
            
            # Categorize items
            if parsed_data.get('items'):
                parsed_data['items'] = OCRService.categorize_items(parsed_data['items'])
                print(f"[OCR] Items categorized")
            
            parsed_data["status"] = "success"
            parsed_data["message"] = f"OCR processed successfully. {len(parsed_data.get('items', []))} items extracted."
            
            print(f"[OCR] Processing complete. Store: {parsed_data['storeName']}, Items: {len(parsed_data['items'])}")
            return parsed_data
        
        except Exception as e:
            print(f"[ERROR] Error processing receipt image: {e}")
            return {
                "status": "error",
                "message": str(e),
                "storeName": "Unknown Store",
                "date": datetime.now().strftime("%Y-%m-%d"),
                "totalAmount": 0.0,
                "taxAmount": 0.0,
                "subtotal": 0.0,
                "paymentMethod": "Unknown",
                "items": []
            }

