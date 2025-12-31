import hashlib
import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter()


class CreateDocumentRequest(BaseModel):
    title: str
    template_type: str  # SOP, TECHNICAL_DESIGN, EXECUTIVE_SUMMARY, COMPLIANCE_AUDIT
    module_id: str
    atom_ids: List[str]
    content: str  # Compiled markdown content
    metadata: Optional[Dict[str, Any]] = None


class UpdateDocumentRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


def get_docs_dir() -> Path:
    """Get the documents storage directory."""
    base = Path(__file__).parent.parent.parent / "data" / "documents"
    base.mkdir(parents=True, exist_ok=True)
    return base


def get_document_path(doc_id: str) -> Path:
    """Get the file path for a document."""
    docs_dir = get_docs_dir()
    return docs_dir / f"{doc_id}.json"


def get_mkdocs_dir() -> Path:
    """Get the MkDocs docs directory."""
    base = Path(__file__).parent.parent.parent / "docs"
    return base


def get_mkdocs_generated_docs_dir() -> Path:
    """Get the MkDocs generated/published directory."""
    base = get_mkdocs_dir() / "generated" / "published"
    base.mkdir(parents=True, exist_ok=True)
    return base


def sync_document_to_mkdocs(doc_id: str) -> Dict[str, str]:
    """Sync a document to MkDocs published folder."""
    # Load document
    doc_path = get_document_path(doc_id)
    if not doc_path.exists():
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")

    try:
        with open(doc_path, "r", encoding="utf-8") as f:
            document = json.load(f)

        # Get target directory
        published_dir = get_mkdocs_generated_docs_dir()

        # Create filename from title (sanitize for filesystem)
        title = document.get("title", doc_id)
        safe_filename = "".join(c if c.isalnum() or c in (" ", "-", "_") else "_" for c in title)
        safe_filename = safe_filename.replace(" ", "_").lower()

        # Add template type prefix
        template_prefix = document.get("template_type", "doc").lower()
        md_filename = f"{template_prefix}_{safe_filename}.md"

        target_path = published_dir / md_filename

        # Add frontmatter to content - quote all string values to prevent YAML parsing errors
        title = str(document.get("title", "Untitled")).replace("'", "''")  # Escape single quotes
        frontmatter = f"""---
title: '{title}'
template_type: '{document.get('template_type', 'unknown')}'
module: '{document.get('module_id', 'unknown')}'
created: '{document.get('created_at', 'unknown')}'
updated: '{document.get('updated_at', 'unknown')}'
version: {document.get('version', 1)}
atoms: {len(document.get('atom_ids', []))}
---

"""
        content_with_frontmatter = frontmatter + document.get("content", "")

        # Write to MkDocs
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(content_with_frontmatter)

        return {"status": "synced", "doc_id": doc_id, "mkdocs_path": str(target_path.relative_to(get_mkdocs_dir()))}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync document: {str(e)}")


def generate_doc_id(title: str, module_id: str) -> str:
    """Generate a unique document ID based on title and module."""
    content = f"{title}_{module_id}_{datetime.utcnow().isoformat()}"
    return hashlib.md5(content.encode()).hexdigest()[:12]


def save_version(doc_id: str, document: Dict[str, Any]) -> None:
    """Save a version of the document to the versions directory."""
    versions_dir = get_docs_dir() / "versions" / doc_id
    versions_dir.mkdir(parents=True, exist_ok=True)

    # Use timestamp for version filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    version_path = versions_dir / f"{timestamp}.json"

    with open(version_path, "w", encoding="utf-8") as f:
        json.dump(document, f, indent=2, ensure_ascii=False)


@router.get("/api/documents")
def list_documents(
    limit: int = 100, offset: int = 0, module_id: Optional[str] = None, template_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    List all documents with optional filtering.

    Args:
        limit: Maximum number of documents to return
        offset: Number of documents to skip
        module_id: Filter by module ID
        template_type: Filter by template type
    """
    docs_dir = get_docs_dir()
    documents = []

    # Load all document files
    for doc_file in docs_dir.glob("*.json"):
        try:
            with open(doc_file, "r", encoding="utf-8") as f:
                doc = json.load(f)

            # Apply filters
            if module_id and doc.get("module_id") != module_id:
                continue
            if template_type and doc.get("template_type") != template_type:
                continue

            documents.append(doc)
        except Exception as e:
            print(f"Warning: Failed to load {doc_file}: {e}")
            continue

    # Sort by updated_at (most recent first)
    documents.sort(key=lambda x: x.get("updated_at", ""), reverse=True)

    # Apply pagination
    total = len(documents)
    paginated_docs = documents[offset : offset + limit]

    return {
        "documents": paginated_docs,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": (offset + limit) < total,
    }


@router.get("/api/documents/{doc_id}")
def get_document(doc_id: str) -> Dict[str, Any]:
    """Get a specific document by ID."""
    doc_path = get_document_path(doc_id)

    if not doc_path.exists():
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")

    try:
        with open(doc_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load document: {str(e)}")


@router.post("/api/documents")
def create_document(doc: CreateDocumentRequest) -> Dict[str, Any]:
    """Create a new document."""
    # Generate unique ID
    doc_id = generate_doc_id(doc.title, doc.module_id)

    # Create document structure
    now = datetime.utcnow().isoformat()
    document = {
        "id": doc_id,
        "title": doc.title,
        "template_type": doc.template_type,
        "module_id": doc.module_id,
        "atom_ids": doc.atom_ids,
        "content": doc.content,
        "metadata": doc.metadata or {},
        "created_at": now,
        "updated_at": now,
        "version": 1,
        "approval_status": "draft",  # New documents start as draft
    }

    # Save document
    doc_path = get_document_path(doc_id)
    try:
        with open(doc_path, "w", encoding="utf-8") as f:
            json.dump(document, f, indent=2, ensure_ascii=False)

        # Save initial version
        save_version(doc_id, document)

        # Auto-sync to MkDocs
        try:
            sync_result = sync_document_to_mkdocs(doc_id)
            document["mkdocs_sync"] = sync_result
        except Exception as sync_error:
            # Log but don't fail the document creation
            print(f"Warning: Failed to sync document to MkDocs: {sync_error}")
            document["mkdocs_sync"] = {"status": "failed", "error": str(sync_error)}

        # Auto-index in RAG system
        try:
            import httpx

            rag_response = httpx.post(
                "http://localhost:8001/api/rag/index-document",
                json={
                    "doc_id": doc_id,
                    "title": doc.title,
                    "content": doc.content,
                    "template_type": doc.template_type,
                    "module_id": doc.module_id,
                    "atom_ids": doc.atom_ids,
                    "metadata": doc.metadata,
                },
                timeout=30.0,
            )

            if rag_response.status_code == 200:
                document["rag_index"] = rag_response.json()
            else:
                document["rag_index"] = {"status": "failed", "error": f"HTTP {rag_response.status_code}"}
        except Exception as rag_error:
            # Log but don't fail the document creation
            print(f"Warning: Failed to index document in RAG: {rag_error}")
            document["rag_index"] = {"status": "failed", "error": str(rag_error)}

        return document
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create document: {str(e)}")


@router.put("/api/documents/{doc_id}")
def update_document(doc_id: str, update: UpdateDocumentRequest) -> Dict[str, Any]:
    """Update an existing document."""
    doc_path = get_document_path(doc_id)

    if not doc_path.exists():
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")

    try:
        # Load existing document
        with open(doc_path, "r", encoding="utf-8") as f:
            document = json.load(f)

        # Save current version before updating
        save_version(doc_id, document)

        # Update fields
        if update.title is not None:
            document["title"] = update.title
        if update.content is not None:
            document["content"] = update.content
        if update.metadata is not None:
            document["metadata"].update(update.metadata)

        # Increment version and update timestamp
        document["version"] = document.get("version", 1) + 1
        document["updated_at"] = datetime.utcnow().isoformat()

        # Save updated document
        with open(doc_path, "w", encoding="utf-8") as f:
            json.dump(document, f, indent=2, ensure_ascii=False)

        return document
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update document: {str(e)}")


@router.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str) -> Dict[str, str]:
    """Delete a document."""
    doc_path = get_document_path(doc_id)

    if not doc_path.exists():
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")

    try:
        # Load document for final version save
        with open(doc_path, "r", encoding="utf-8") as f:
            document = json.load(f)

        # Save final version with deleted flag
        document["deleted_at"] = datetime.utcnow().isoformat()
        save_version(doc_id, document)

        # Delete the main file
        doc_path.unlink()

        return {"status": "deleted", "id": doc_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@router.get("/api/documents/{doc_id}/versions")
def get_document_versions(doc_id: str) -> Dict[str, Any]:
    """Get all versions of a document."""
    versions_dir = get_docs_dir() / "versions" / doc_id

    if not versions_dir.exists():
        return {"versions": [], "total": 0}

    versions = []
    for version_file in sorted(versions_dir.glob("*.json"), reverse=True):
        try:
            with open(version_file, "r", encoding="utf-8") as f:
                version_data = json.load(f)

            # Extract timestamp from filename
            timestamp = version_file.stem

            versions.append(
                {
                    "timestamp": timestamp,
                    "version": version_data.get("version", 1),
                    "updated_at": version_data.get("updated_at"),
                    "title": version_data.get("title"),
                    "size": len(version_data.get("content", "")),
                }
            )
        except Exception as e:
            print(f"Warning: Failed to load version {version_file}: {e}")
            continue

    return {"versions": versions, "total": len(versions)}


@router.get("/api/documents/{doc_id}/versions/{timestamp}")
def get_document_version(doc_id: str, timestamp: str) -> Dict[str, Any]:
    """Get a specific version of a document."""
    version_path = get_docs_dir() / "versions" / doc_id / f"{timestamp}.json"

    if not version_path.exists():
        raise HTTPException(status_code=404, detail=f"Version '{timestamp}' not found")

    try:
        with open(version_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load version: {str(e)}")


@router.get("/api/documents/export/{doc_id}/markdown")
def export_document_markdown(doc_id: str) -> str:
    """Export document as markdown."""
    document = get_document(doc_id)
    return document.get("content", "")


@router.get("/api/documents/export/{doc_id}/html")
def export_document_html(doc_id: str) -> str:
    """Export document as HTML."""
    document = get_document(doc_id)
    content = document.get("content", "")
    title = document.get("title", "Document")

    # Simple HTML wrapper (client will use react-markdown for full rendering)
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        body {{
            font-family: 'Helvetica Neue', Arial, 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica', sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 40px auto;
            padding: 20px;
            color: #333;
        }}
        h1 {{ border-bottom: 2px solid #eee; padding-bottom: 10px; }}
        h2 {{ margin-top: 24px; }}
        code {{ background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }}
        pre {{ background: #f4f4f4; padding: 12px; border-radius: 4px; overflow-x: auto; }}
        blockquote {{ border-left: 4px solid #ddd; padding-left: 16px; color: #666; }}
    </style>
</head>
<body>
    <pre>{content}</pre>
</body>
</html>"""

    return html


@router.post("/api/documents/{doc_id}/sync")
def sync_document(doc_id: str) -> Dict[str, Any]:
    """Sync a document to MkDocs published folder."""
    return sync_document_to_mkdocs(doc_id)


@router.post("/api/documents/sync-all")
def sync_all_documents() -> Dict[str, Any]:
    """Sync all documents to MkDocs published folder."""
    docs_dir = get_docs_dir()
    synced = []
    failed = []

    for doc_file in docs_dir.glob("*.json"):
        doc_id = doc_file.stem
        try:
            result = sync_document_to_mkdocs(doc_id)
            synced.append(result)
        except Exception as e:
            failed.append({"doc_id": doc_id, "error": str(e)})

    return {"status": "completed", "synced": len(synced), "failed": len(failed), "results": synced, "errors": failed}


# Approval Workflow Routes


class SubmitForReviewRequest(BaseModel):
    reviewer: str  # Username or email of the reviewer
    notes: Optional[str] = None


class ApprovalDecisionRequest(BaseModel):
    decision: str  # 'approve' or 'reject'
    notes: Optional[str] = None
    reviewer: str


@router.post("/api/documents/{doc_id}/submit-for-review")
def submit_for_review(doc_id: str, request: SubmitForReviewRequest) -> Dict[str, Any]:
    """Submit a document for review."""
    doc_path = get_document_path(doc_id)

    if not doc_path.exists():
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")

    try:
        # Load existing document
        with open(doc_path, "r", encoding="utf-8") as f:
            document = json.load(f)

        # Check if already submitted or approved
        current_status = document.get("approval_status", "draft")
        if current_status == "pending_review":
            raise HTTPException(status_code=400, detail="Document is already pending review")
        if current_status == "approved":
            raise HTTPException(status_code=400, detail="Document is already approved")

        # Save current version before updating
        save_version(doc_id, document)

        # Update approval fields
        now = datetime.utcnow().isoformat()
        document["approval_status"] = "pending_review"
        document["submitted_for_review_at"] = now
        document["reviewer"] = request.reviewer
        document["review_notes"] = request.notes
        document["updated_at"] = now

        # Save updated document
        with open(doc_path, "w", encoding="utf-8") as f:
            json.dump(document, f, indent=2, ensure_ascii=False)

        return document
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit document for review: {str(e)}")


@router.post("/api/documents/{doc_id}/approve-reject")
def approve_or_reject_document(doc_id: str, request: ApprovalDecisionRequest) -> Dict[str, Any]:
    """Approve or reject a document."""
    doc_path = get_document_path(doc_id)

    if not doc_path.exists():
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")

    try:
        # Load existing document
        with open(doc_path, "r", encoding="utf-8") as f:
            document = json.load(f)

        # Check if document is pending review
        current_status = document.get("approval_status", "draft")
        if current_status != "pending_review":
            raise HTTPException(
                status_code=400,
                detail=f"Document must be pending review to approve/reject (current status: {current_status})",
            )

        # Validate decision
        if request.decision not in ["approve", "reject"]:
            raise HTTPException(status_code=400, detail="Decision must be 'approve' or 'reject'")

        # Save current version before updating
        save_version(doc_id, document)

        # Update approval fields
        now = datetime.utcnow().isoformat()
        document["approval_status"] = "approved" if request.decision == "approve" else "rejected"
        document["reviewed_at"] = now
        document["reviewed_by"] = request.reviewer
        document["review_decision_notes"] = request.notes
        document["updated_at"] = now

        # If approved, sync to MkDocs
        if request.decision == "approve":
            try:
                sync_result = sync_document_to_mkdocs(doc_id)
                document["mkdocs_sync"] = sync_result
                document["published_at"] = now
            except Exception as sync_error:
                print(f"Warning: Failed to sync approved document to MkDocs: {sync_error}")
                document["mkdocs_sync"] = {"status": "failed", "error": str(sync_error)}

        # Save updated document
        with open(doc_path, "w", encoding="utf-8") as f:
            json.dump(document, f, indent=2, ensure_ascii=False)

        return document
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to {request.decision} document: {str(e)}")


@router.post("/api/documents/{doc_id}/revert-to-draft")
def revert_to_draft(doc_id: str) -> Dict[str, Any]:
    """Revert a document back to draft status."""
    doc_path = get_document_path(doc_id)

    if not doc_path.exists():
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")

    try:
        # Load existing document
        with open(doc_path, "r", encoding="utf-8") as f:
            document = json.load(f)

        # Save current version before updating
        save_version(doc_id, document)

        # Update status
        now = datetime.utcnow().isoformat()
        document["approval_status"] = "draft"
        document["reverted_to_draft_at"] = now
        document["updated_at"] = now

        # Clear review fields
        document.pop("submitted_for_review_at", None)
        document.pop("reviewer", None)
        document.pop("review_notes", None)
        document.pop("reviewed_at", None)
        document.pop("reviewed_by", None)
        document.pop("review_decision_notes", None)

        # Save updated document
        with open(doc_path, "w", encoding="utf-8") as f:
            json.dump(document, f, indent=2, ensure_ascii=False)

        return document
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to revert document to draft: {str(e)}")
