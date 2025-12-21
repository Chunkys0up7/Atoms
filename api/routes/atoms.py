from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pathlib import Path
import yaml
from typing import List, Dict, Any, Optional
from datetime import datetime

router = APIRouter()


class CreateAtomRequest(BaseModel):
    id: str
    category: str
    type: str
    name: str
    version: Optional[str] = '1.0.0'
    status: Optional[str] = 'DRAFT'
    owner: Optional[str] = None
    team: Optional[str] = None
    ontologyDomain: Optional[str] = 'Home Lending'
    criticality: Optional[str] = 'MEDIUM'
    phaseId: Optional[str] = None
    moduleId: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    edges: Optional[List[Dict[str, Any]]] = None
    metrics: Optional[Dict[str, Any]] = None


@router.get("/api/atoms")
def list_atoms(limit: int = 100, offset: int = 0, summary_only: bool = False, type_filter: str = None) -> Dict[str, Any]:
    """
    List all atoms in the system.

    Args:
        limit: Maximum number of atoms to return (default 100, max 1000)
        offset: Number of atoms to skip (for pagination)
        summary_only: If true, return only id, type, and title (faster)
        type_filter: Optional filter by atom type (case-insensitive)
    """
    atoms = []
    base = Path(__file__).parent.parent.parent / "atoms"

    if not base.exists():
        raise HTTPException(status_code=404, detail="atoms directory not found")

    # Limit to reasonable bounds
    limit = min(limit, 1000)

    # Collect all YAML files
    yaml_files = list(base.rglob("*.yaml"))
    
    # Load atoms
    for yaml_file in yaml_files:
        try:
            with open(yaml_file, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
            if data:
                # Ensure id field (support both 'id' and 'atom_id')
                if 'id' not in data and 'atom_id' in data:
                    data['id'] = data['atom_id']
                elif 'atom_id' not in data and 'id' in data:
                    data['atom_id'] = data['id']
                
                # Normalize type field (handle both old lowercase and new uppercase)
                atom_type = data.get('type', '')
                if isinstance(atom_type, str):
                    # Normalize to uppercase for consistency
                    normalized_type = atom_type.upper()
                    data['type'] = normalized_type
                else:
                    normalized_type = str(atom_type).upper()
                    data['type'] = normalized_type
                
                # Apply type filter if specified
                if type_filter and normalized_type != type_filter.upper():
                    continue
                
                # Extract summary from content if needed
                summary = data.get('summary')
                if not summary and 'content' in data:
                    if isinstance(data['content'], dict):
                        summary = data['content'].get('summary')
                    elif isinstance(data['content'], str):
                        summary = data['content']
                
                # Ensure summary is set
                if not summary:
                    summary = ''
                if 'summary' not in data:
                    data['summary'] = summary
                
                if summary_only:
                    # Return minimal data for faster loading
                    atoms.append({
                        'id': data.get('id'),
                        'type': normalized_type,
                        'title': data.get('title') or data.get('name'),
                        'summary': summary,
                        'owner': data.get('owner'),
                        'status': data.get('status'),
                        'category': data.get('category'),
                        'moduleId': data.get('moduleId'),
                        'phaseId': data.get('phaseId'),
                        '_file_path': str(yaml_file)
                    })
                else:
                    # Add file path for reference
                    data['_file_path'] = str(yaml_file)
                    atoms.append(data)
        except Exception as e:
            # Skip files that fail to parse
            print(f"Warning: Failed to load {yaml_file}: {e}")
            continue
    
    # Apply pagination after filtering
    total = len(atoms)
    paginated_atoms = atoms[offset:offset + limit]

    return {
        'atoms': paginated_atoms,
        'total': total,
        'limit': limit,
        'offset': offset,
        'has_more': (offset + limit) < total
    }


@router.get("/api/atoms/{atom_id}")
def get_atom(atom_id: str) -> Dict[str, Any]:
    """Get a specific atom by ID with full details."""
    base = Path(__file__).parent.parent.parent / "atoms"

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
                # Ensure id field (support both 'id' and 'atom_id')
                if 'id' not in data and 'atom_id' in data:
                    data['id'] = data['atom_id']
                elif 'atom_id' not in data and 'id' in data:
                    data['atom_id'] = data['id']
                
                # Normalize type field
                atom_type = data.get('type', '')
                if isinstance(atom_type, str):
                    normalized_type = atom_type.upper()
                    data['type'] = normalized_type
                
                # Extract summary from content if needed
                summary = data.get('summary')
                if not summary and 'content' in data:
                    if isinstance(data['content'], dict):
                        summary = data['content'].get('summary')
                    elif isinstance(data['content'], str):
                        summary = data['content']
                
                # Ensure summary is set
                if 'summary' not in data and summary:
                    data['summary'] = summary
                if 'content' in data and isinstance(data['content'], dict) and 'summary' not in data['content'] and summary:
                    data['content']['summary'] = summary
                
                data['_file_path'] = str(yaml_file)
                return data
        except Exception as e:
            print(f"Warning: Failed to load {yaml_file}: {e}")
            continue

    raise HTTPException(status_code=404, detail=f"Atom '{atom_id}' not found")


@router.post("/api/atoms")
def create_atom(atom: CreateAtomRequest) -> Dict[str, Any]:
    """Create a new atom."""
    base = Path(__file__).parent.parent.parent / "atoms"

    if not base.exists():
        base.mkdir(parents=True, exist_ok=True)

    # Check if atom ID already exists
    for yaml_file in base.rglob("*.yaml"):
        try:
            with open(yaml_file, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
            if data and (data.get('id') == atom.id or data.get('atom_id') == atom.id):
                raise HTTPException(status_code=400, detail=f"Atom with ID '{atom.id}' already exists")
        except yaml.YAMLError:
            continue

    # Create atom data structure matching the test data format
    atom_data = {
        'id': atom.id,
        'category': atom.category.upper(),
        'type': atom.type.upper(),
        'name': atom.name,
        'version': atom.version or '1.0.0',
        'status': atom.status or 'DRAFT',
        'owner': atom.owner or '',
        'team': atom.team or '',
        'ontologyDomain': atom.ontologyDomain or 'Home Lending',
        'criticality': atom.criticality or 'MEDIUM',
        'phaseId': atom.phaseId,
        'moduleId': atom.moduleId,
        'content': atom.content or {'summary': ''},
        'edges': atom.edges or [],
        'metrics': atom.metrics or {
            'automation_level': 0,
            'avg_cycle_time_mins': 0,
            'error_rate': 0,
            'compliance_score': 0
        }
    }

    # Determine file path (use category if available, otherwise root)
    if atom.category:
        category_dir = base / atom.category.lower()
        category_dir.mkdir(exist_ok=True)
        file_path = category_dir / f"{atom.id}.yaml"
    else:
        file_path = base / f"{atom.id}.yaml"

    # Write to YAML file
    try:
        with open(file_path, "w", encoding="utf-8") as fh:
            yaml.dump(atom_data, fh, default_flow_style=False, sort_keys=False, allow_unicode=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create atom: {str(e)}")

    atom_data['_file_path'] = str(file_path)
    return atom_data
