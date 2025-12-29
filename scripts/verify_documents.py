#!/usr/bin/env python3
"""Verify that documents are registered in the API."""

import requests
import json

def verify_documents():
    try:
        response = requests.get('http://localhost:8000/api/documents')
        data = response.json()
        
        print(f'Status: {response.status_code}')
        print(f'Total documents: {data["total"]}')
        print(f'Returned: {len(data["documents"])}')
        print()
        
        for doc in data['documents']:
            print(f'Title: {doc["title"]}')
            print(f'  ID: {doc["id"]}')
            print(f'  Type: {doc["template_type"]}')
            print(f'  Module: {doc["module_id"]}')
            print(f'  Atoms: {len(doc["atom_ids"])}')
            print()
            
    except requests.exceptions.ConnectionError:
        print('ERROR: Cannot connect to API server at http://localhost:8000')
        print('Make sure the backend server is running!')
    except Exception as e:
        print(f'ERROR: {e}')

if __name__ == "__main__":
    verify_documents()
