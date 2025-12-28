from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
import os
import secrets

from .routes import graph, atoms, modules, rag, runtime, lineage, feedback, documentation, mkdocs_service, rules, ownership, chunking, git_status, schema, phases, glossary, graph_analytics, relationship_inference, graph_constraints, anomaly_detection, websocket, presence, notifications, history, processes, tasks, templates, approvals


def get_admin_token():
    token = os.environ.get("API_ADMIN_TOKEN")
    if not token:
        raise HTTPException(status_code=503, detail="Admin token not configured")
    return token


app = FastAPI(
    title="GNDP API",
    description="Graph-Native Documentation Platform API",
    version="0.1.0"
)

# CORS configuration - restrict in production
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,http://localhost:8000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    # SECURITY: Explicit headers instead of wildcard to prevent CSRF
    allow_headers=["Content-Type", "Authorization", "X-Request-ID", "Accept"],
)

app.include_router(graph.router)
app.include_router(atoms.router)
app.include_router(modules.router)
app.include_router(rag.router)
app.include_router(runtime.router)
app.include_router(lineage.router)
app.include_router(feedback.router)
app.include_router(documentation.router)
app.include_router(mkdocs_service.router)
app.include_router(rules.router)
app.include_router(ownership.router)
app.include_router(chunking.router)
app.include_router(git_status.router)
app.include_router(schema.router)
app.include_router(phases.router)
app.include_router(glossary.router)
app.include_router(graph_analytics.router)
app.include_router(relationship_inference.router)
app.include_router(graph_constraints.router)
app.include_router(anomaly_detection.router)
app.include_router(websocket.router)
app.include_router(presence.router)
app.include_router(notifications.router)
app.include_router(history.router)
app.include_router(processes.router)
app.include_router(tasks.router)
app.include_router(templates.router)
app.include_router(approvals.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/trigger/sync")
def trigger_sync(authorization: str = Header(...)):
    """
    Trigger system sync operation (admin only).

    Requires Bearer token in Authorization header.
    Uses timing-safe comparison to prevent timing attacks.
    """
    expected = os.environ.get("API_ADMIN_TOKEN")
    if not expected:
        raise HTTPException(status_code=503, detail="Service unavailable")

    # Extract Bearer token
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    token = authorization[7:]  # Remove "Bearer " prefix

    # SECURITY: Use timing-safe comparison to prevent timing attacks
    if not secrets.compare_digest(token, expected):
        raise HTTPException(status_code=403, detail="Forbidden")

    # In production, you may dispatch a background job; here we return accepted
    return {"status": "sync scheduled"}
