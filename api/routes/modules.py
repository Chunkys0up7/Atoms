from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
import yaml
import json
from datetime import date, datetime
from typing import List, Dict, Any

router = APIRouter()


def serialize_dates(obj):
    """Convert date/datetime objects to strings for JSON serialization."""
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: serialize_dates(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_dates(item) for item in obj]
    return obj


@router.get("/api/modules")
def list_modules() -> List[Dict[str, Any]]:
    """List all modules in the system."""
    modules = []
    base = Path("modules")

    if not base.exists():
        raise HTTPException(status_code=404, detail="modules directory not found")

    # Find all YAML files in modules directory
    for yaml_file in base.glob("*.yaml"):
        try:
            with open(yaml_file, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
            if data:
                # Normalize module structure for frontend compatibility
                normalized = {
                    'id': data.get('module_id') or data.get('id'),
                    'name': data.get('name'),
                    'description': data.get('description'),
                    'owner': data.get('metadata', {}).get('owner') if isinstance(data.get('metadata'), dict) else data.get('owner'),
                    'atoms': data.get('atom_ids') or data.get('atoms') or [],
                    'phaseId': data.get('phaseId'),
                    '_file_path': str(yaml_file),
                    '_raw': serialize_dates(data)  # Serialize dates in raw data
                }
                modules.append(normalized)
        except Exception as e:
            print(f"Warning: Failed to load {yaml_file}: {e}")
            continue

    return modules


@router.get("/api/modules/{module_id}")
def get_module(module_id: str) -> Dict[str, Any]:
    """Get a specific module by ID."""
    base = Path("modules")

    if not base.exists():
        raise HTTPException(status_code=404, detail="modules directory not found")

    # Search for module file
    for yaml_file in base.glob("*.yaml"):
        try:
            with open(yaml_file, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)

            if not data:
                continue

            # Check if this is the requested module
            file_id = data.get('module_id') or data.get('id')
            if file_id == module_id:
                # Normalize module structure for frontend compatibility
                normalized = {
                    'id': data.get('module_id') or data.get('id'),
                    'name': data.get('name'),
                    'description': data.get('description'),
                    'owner': data.get('metadata', {}).get('owner') if isinstance(data.get('metadata'), dict) else data.get('owner'),
                    'atoms': data.get('atom_ids') or data.get('atoms') or [],
                    'phaseId': data.get('phaseId'),
                    '_file_path': str(yaml_file),
                    '_raw': serialize_dates(data)  # Serialize dates in raw data
                }
                return normalized
        except Exception:
            continue

    raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found")
