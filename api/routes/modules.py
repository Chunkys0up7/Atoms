from fastapi import APIRouter, HTTPException
from pathlib import Path
import yaml
from typing import List, Dict, Any

router = APIRouter()


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
                data['_file_path'] = str(yaml_file)
                modules.append(data)
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
            file_id = data.get('module_id')
            if file_id == module_id:
                data['_file_path'] = str(yaml_file)
                return data
        except Exception:
            continue

    raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found")
