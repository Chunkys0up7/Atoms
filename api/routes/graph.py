from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import os
import json

router = APIRouter()


@router.get("/api/graph/full.json")
def get_full_graph():
    path = os.path.join("docs", "api", "graph", "full.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="graph not found")
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    return JSONResponse(content=data)
