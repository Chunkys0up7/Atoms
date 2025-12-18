from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import os
import yaml

router = APIRouter()


@router.get("/api/atoms/{atom_id}")
def get_atom(atom_id: str):
    # Attempt to locate YAML file under atoms/ by id or filename
    base = os.path.join("atoms")
    if not os.path.isdir(base):
        raise HTTPException(status_code=404, detail="atoms directory not found")
    # try common filename patterns
    candidates = [
        os.path.join(base, f"{atom_id}.yaml"),
        os.path.join(base, f"{atom_id}.yml"),
        os.path.join(base, atom_id + ".yaml"),
    ]
    for c in candidates:
        if os.path.exists(c):
            with open(c, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
            return JSONResponse(content=data)
    raise HTTPException(status_code=404, detail="atom not found")
