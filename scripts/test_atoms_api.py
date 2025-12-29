#!/usr/bin/env python3
"""Test atoms API endpoint."""

import requests

try:
    print("Testing atoms API endpoint...")
    response = requests.get('http://localhost:8000/api/atoms?limit=5')
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ API Response Success!")
        print(f"   Total atoms: {data['total']}")
        print(f"   Returned: {len(data['atoms'])}")
    else:
        print(f"❌ Error Response: {response.text[:200]}")
        
except requests.exceptions.ConnectionError:
    print("❌ ERROR: Cannot connect to API server at http://localhost:8000")
except Exception as e:
    print(f"❌ ERROR: {e}")
