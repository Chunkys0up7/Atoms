import json
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/api/graph/full")
def get_full_graph() -> Dict[str, Any]:
    """Get the complete knowledge graph."""
    # Try both possible locations
    paths = [Path("docs/generated/api/graph/full.json"), Path("docs/api/graph/full.json")]

    for path in paths:
        if path.exists():
            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            return data

    raise HTTPException(status_code=404, detail="Graph not found. Run 'python builder.py build' to generate it.")


@router.get("/api/graph/full.json")
def get_full_graph_json():
    """Legacy endpoint for full graph (redirects to /api/graph/full)."""
    return get_full_graph()


@router.get("/api/graph/type/{atom_type}")
def get_graph_by_type(atom_type: str) -> Dict[str, Any]:
    """Get graph filtered by atom type."""
    paths = [Path(f"docs/generated/api/graph/type/{atom_type}.json"), Path(f"docs/api/graph/type/{atom_type}.json")]

    for path in paths:
        if path.exists():
            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            return data

    raise HTTPException(
        status_code=404, detail=f"Graph for type '{atom_type}' not found. Run 'python builder.py build' to generate it."
    )


@router.get("/api/graph/module/{module_id}")
def get_graph_by_module(module_id: str) -> Dict[str, Any]:
    """Get graph filtered by module."""
    paths = [Path(f"docs/generated/api/graph/module/{module_id}.json"), Path(f"docs/api/graph/module/{module_id}.json")]

    for path in paths:
        if path.exists():
            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            return data

    raise HTTPException(
        status_code=404,
        detail=f"Graph for module '{module_id}' not found. Run 'python builder.py build' to generate it.",
    )
