#!/usr/bin/env python
"""Test script to verify imports and start the server"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Testing imports...")

try:
    from app.main import app
    print("✓ FastAPI app imported successfully")
except Exception as e:
    print(f"✗ Error importing app: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

try:
    import uvicorn
    print("✓ uvicorn imported successfully")
except Exception as e:
    print(f"✗ Error importing uvicorn: {e}")
    sys.exit(1)

print("\nStarting server on http://localhost:8000")
print("Press Ctrl+C to stop\n")

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
