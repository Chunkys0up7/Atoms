#!/usr/bin/env python3
"""Test ownership API endpoint."""

import json

import requests

try:
    print("Testing ownership API endpoint...")
    response = requests.get("http://localhost:8000/api/ownership/report")

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"✅ API Response Success!")
        print(f"   Total atoms: {data['coverage']['total_atoms']}")
        print(f"   Owner coverage: {data['coverage']['owner_coverage_pct']:.1f}%")
        print(f"   Steward coverage: {data['coverage']['steward_coverage_pct']:.1f}%")
    else:
        print(f"❌ Error Response:")
        print(json.dumps(response.json(), indent=2))

except requests.exceptions.ConnectionError:
    print("❌ ERROR: Cannot connect to API server at http://localhost:8000")
    print("   Make sure the backend server is running!")
except Exception as e:
    print(f"❌ ERROR: {e}")
