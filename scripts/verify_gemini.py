import sys
import os
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

from api.gemini_client import get_gemini_client

def verify_gemini():
    print("--- Verifying Gemini Client ---")
    
    try:
        client = get_gemini_client()
        if not client.client:
            print("FAILED: Client definition returned None (API Key missing?)")
            return

        print("Client initialized.")
        try:
            print("Accessible models:")
            for m in client.client.models.list():
                print(f" - {m.name}")
        except Exception as e:
            print(f"Failed to list models: {e}")

        print("Sending prompt...")
        response = client.generate_content(
            prompt="Hello, are you working?",
            model="gemini-1.5-flash" # Trying simpler name again based on list output
        )
        print(f"Response: {response}")
        print("--- Verification Success ---")
        
    except Exception as e:
        print(f"FAILED: Error during verification: {e}")

if __name__ == "__main__":
    verify_gemini()
