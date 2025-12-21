from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pathlib import Path
import yaml
import json
from datetime import date, datetime
from typing import List, Dict, Any, Optional

router = APIRouter()


class CreateModuleRequest(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    owner: Optional[str] = None
    phaseId: Optional[str] = None
    atoms: Optional[List[str]] = []


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
    base = Path(__file__).parent.parent.parent / "modules"

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
    base = Path(__file__).parent.parent.parent / "modules"

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


@router.post("/api/modules")
def create_module(module: CreateModuleRequest) -> Dict[str, Any]:
    """Create a new module."""
    base = Path(__file__).parent.parent.parent / "modules"

    if not base.exists():
        base.mkdir(parents=True, exist_ok=True)

    # Check if module ID already exists
    for yaml_file in base.glob("*.yaml"):
        try:
            with open(yaml_file, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
            if data and (data.get('id') == module.id or data.get('module_id') == module.id):
                raise HTTPException(status_code=400, detail=f"Module with ID '{module.id}' already exists")
        except yaml.YAMLError:
            continue

    # Create module data structure
    module_data = {
        'module_id': module.id,
        'id': module.id,
        'name': module.name,
        'description': module.description or '',
        'phaseId': module.phaseId,
        'atom_ids': module.atoms or [],
        'metadata': {
            'owner': module.owner or '',
            'created_at': datetime.now().isoformat(),
            'created_via': 'ui',
            'version': '1.0'
        }
    }

    # Write to YAML file
    file_path = base / f"{module.id}.yaml"
    try:
        with open(file_path, "w", encoding="utf-8") as fh:
            yaml.dump(module_data, fh, default_flow_style=False, sort_keys=False, allow_unicode=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create module: {str(e)}")

    # Return normalized format
    normalized = {
        'id': module.id,
        'name': module.name,
        'description': module.description or '',
        'owner': module.owner or '',
        'atoms': module.atoms or [],
        'phaseId': module.phaseId,
        '_file_path': str(file_path),
        '_raw': serialize_dates(module_data)
    }

    return normalized
