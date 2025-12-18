from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

from api.routes import graph, atoms


def get_admin_token():
    token = os.environ.get("API_ADMIN_TOKEN")
    if not token:
        raise HTTPException(status_code=503, detail="Admin token not configured")
    return token


app = FastAPI(title="GNDP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graph.router)
app.include_router(atoms.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/trigger/sync")
def trigger_sync(admin_token: str | None = None):
    expected = os.environ.get("API_ADMIN_TOKEN")
    if not expected or admin_token != expected:
        raise HTTPException(status_code=403, detail="forbidden")
    # In production, you may dispatch a background job; here we return accepted
    return {"status": "sync scheduled"}
