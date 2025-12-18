from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
import yaml
from typing import List, Dict, Any

router = APIRouter()


@router.get("/api/atoms")
def list_atoms() -> List[Dict[str, Any]]:
    """List all atoms in the system."""
    atoms = []
    base = Path("atoms")

    if not base.exists():
        raise HTTPException(status_code=404, detail="atoms directory not found")

    # Recursively find all YAML files
    for yaml_file in base.rglob("*.yaml"):
        try:
            with open(yaml_file, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
            if data:
                # Add file path for reference
                data['_file_path'] = str(yaml_file)
                # Ensure id field (support both 'id' and 'atom_id')
                if 'id' not in data and 'atom_id' in data:
                    data['id'] = data['atom_id']
                elif 'atom_id' not in data and 'id' in data:
                    data['atom_id'] = data['id']
                atoms.append(data)
        except Exception as e:
            # Skip files that fail to parse
            print(f"Warning: Failed to load {yaml_file}: {e}")
            continue

    return atoms


@router.get("/api/atoms/{atom_id}")
def get_atom(atom_id: str) -> Dict[str, Any]:
    """Get a specific atom by ID."""
    base = Path("atoms")

    if not base.exists():
        raise HTTPException(status_code=404, detail="atoms directory not found")

    # Search for atom in all subdirectories
    for yaml_file in base.rglob("*.yaml"):
        try:
            with open(yaml_file, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)

            if not data:
                continue

            # Check if this is the requested atom (support both id and atom_id)
            file_id = data.get('id') or data.get('atom_id')
            if file_id == atom_id:
                data['_file_path'] = str(yaml_file)
                return data
        except Exception:
            continue

    raise HTTPException(status_code=404, detail=f"Atom '{atom_id}' not found")
