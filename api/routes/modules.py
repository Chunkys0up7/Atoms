import json
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class CreateModuleRequest(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    owner: Optional[str] = None
    type: Optional[str] = "business"
    phaseId: Optional[str] = None
    atoms: Optional[List[str]] = []


class UpdateModuleRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = None
    type: Optional[str] = None
    atoms: Optional[List[str]] = None
    phaseId: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ApprovalActionRequest(BaseModel):
    action: str  # 'submit', 'approve', 'reject', 'request_changes'
    stage: str  # Current stage being acted upon
    reviewer_email: Optional[str] = None
    reviewer_role: Optional[str] = None
    comments: Optional[str] = None


def serialize_dates(obj):
    """Convert date/datetime objects to strings for JSON serialization."""
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: serialize_dates(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_dates(item) for item in obj]
    return obj


def load_approval_config() -> Dict[str, Any]:
    """Load approval configuration from config file."""
    config_path = Path(__file__).parent.parent.parent / "config" / "approval_config.yaml"

    # Default configuration if file doesn't exist
    default_config = {
        "default_stages": [
            {"name": "draft", "label": "Draft", "assigned_to": "Author"},
            {"name": "technical_review", "label": "Technical Review", "assigned_to": "Engineering Team"},
            {"name": "compliance_review", "label": "Compliance Review", "assigned_to": "Compliance Team"},
            {"name": "approved", "label": "Approved", "assigned_to": "VP Engineering"},
        ]
    }

    if not config_path.exists():
        return default_config

    try:
        with open(config_path, "r", encoding="utf-8") as fh:
            config = yaml.safe_load(fh)
            return config if config else default_config
    except (yaml.YAMLError, IOError, OSError):
        return default_config


def get_approval_stages(module_data: Dict[str, Any], approval_config: Dict[str, Any]) -> List[str]:
    """
    Determine approval stages for a module based on its configuration and criticality.

    Priority order:
    1. Module-specific approval.stages in YAML
    2. Workflow based on module criticality
    3. Default workflow stages
    """
    # Check if module defines custom approval stages
    approval = module_data.get("approval", {})
    if approval.get("stages"):
        return [stage["name"] for stage in approval["stages"]]

    # Check for criticality-based workflow
    criticality = module_data.get("criticality")
    if criticality and "workflows_by_criticality" in approval_config:
        workflow = approval_config["workflows_by_criticality"].get(criticality)
        if workflow and "stages" in workflow:
            return workflow["stages"]

    # Fall back to default stages
    default_stages = approval_config.get("default_stages", [])
    return [stage["name"] for stage in default_stages]


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
                    "id": data.get("module_id") or data.get("id"),
                    "name": data.get("name"),
                    "description": data.get("description"),
                    "owner": (
                        data.get("metadata", {}).get("owner")
                        if isinstance(data.get("metadata"), dict)
                        else data.get("owner")
                    ),
                    "atoms": data.get("atom_ids") or data.get("atoms") or [],
                    "phaseId": data.get("phaseId"),
                    "_file_path": str(yaml_file),
                    "_raw": serialize_dates(data),  # Serialize dates in raw data
                }
                modules.append(normalized)
        except (OSError, IOError) as e:
            print(f"Warning: Could not read {yaml_file}: {e}")
            continue
        except yaml.YAMLError as e:
            print(f"Warning: Invalid YAML in {yaml_file}: {e}")
            continue
        except (KeyError, ValueError, TypeError) as e:
            print(f"Warning: Invalid module data in {yaml_file}: {e}")
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
            file_id = data.get("module_id") or data.get("id")
            if file_id == module_id:
                # Normalize module structure for frontend compatibility
                normalized = {
                    "id": data.get("module_id") or data.get("id"),
                    "name": data.get("name"),
                    "description": data.get("description"),
                    "owner": (
                        data.get("metadata", {}).get("owner")
                        if isinstance(data.get("metadata"), dict)
                        else data.get("owner")
                    ),
                    "atoms": data.get("atom_ids") or data.get("atoms") or [],
                    "phaseId": data.get("phaseId"),
                    "_file_path": str(yaml_file),
                    "_raw": serialize_dates(data),  # Serialize dates in raw data
                }
                return normalized
        except (OSError, IOError):
            continue
        except yaml.YAMLError:
            continue
        except (KeyError, ValueError, TypeError):
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
            if data and (data.get("id") == module.id or data.get("module_id") == module.id):
                raise HTTPException(status_code=400, detail=f"Module with ID '{module.id}' already exists")
        except yaml.YAMLError:
            continue

    # Create module data structure
    module_data = {
        "module_id": module.id,
        "id": module.id,
        "name": module.name,
        "description": module.description or "",
        "type": module.type or "business",
        "owner": module.owner or "",
        "phaseId": module.phaseId,
        "atoms": module.atoms or [],
        "atom_ids": module.atoms or [],
        "metadata": {
            "created_at": datetime.now().isoformat(),
            "created_via": "ui",
            "status": "draft",
            "version": "1.0",
        },
    }

    # Write to YAML file
    file_path = base / f"{module.id}.yaml"
    try:
        with open(file_path, "w", encoding="utf-8") as fh:
            yaml.dump(module_data, fh, default_flow_style=False, sort_keys=False, allow_unicode=True)
    except (OSError, IOError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to write module file: {str(e)}")
    except yaml.YAMLError as e:
        raise HTTPException(status_code=500, detail=f"Failed to serialize module data: {str(e)}")

    # Return normalized format
    normalized = {
        "id": module.id,
        "name": module.name,
        "description": module.description or "",
        "owner": module.owner or "",
        "atoms": module.atoms or [],
        "phaseId": module.phaseId,
        "_file_path": str(file_path),
        "_raw": serialize_dates(module_data),
    }

    return normalized


@router.put("/api/modules/{module_id}")
def update_module(module_id: str, update: UpdateModuleRequest) -> Dict[str, Any]:
    """Update an existing module."""
    base = Path(__file__).parent.parent.parent / "modules"

    if not base.exists():
        raise HTTPException(status_code=404, detail="modules directory not found")

    # Find the module file
    module_file = None
    for yaml_file in base.glob("*.yaml"):
        try:
            with open(yaml_file, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
            if data and (data.get("id") == module_id or data.get("module_id") == module_id):
                module_file = yaml_file
                break
        except (yaml.YAMLError, IOError):
            continue

    if not module_file:
        raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found")

    # Read current module data
    with open(module_file, "r", encoding="utf-8") as fh:
        module_data = yaml.safe_load(fh)

    # Update fields
    if update.name is not None:
        module_data["name"] = update.name
    if update.description is not None:
        module_data["description"] = update.description
    if update.owner is not None:
        module_data["owner"] = update.owner
    if update.type is not None:
        module_data["type"] = update.type
    if update.atoms is not None:
        module_data["atoms"] = update.atoms
        module_data["atom_ids"] = update.atoms
    if update.phaseId is not None:
        module_data["phaseId"] = update.phaseId
    if update.metadata is not None:
        if "metadata" not in module_data:
            module_data["metadata"] = {}
        module_data["metadata"].update(update.metadata)

    # Update timestamp
    if "metadata" not in module_data:
        module_data["metadata"] = {}
    module_data["metadata"]["updated_at"] = datetime.now().isoformat()

    # Write back to file
    with open(module_file, "w", encoding="utf-8") as fh:
        yaml.dump(module_data, fh, default_flow_style=False, sort_keys=False, allow_unicode=True)

    # Return normalized format
    normalized = {
        "id": module_data.get("module_id") or module_data.get("id"),
        "name": module_data.get("name"),
        "description": module_data.get("description"),
        "owner": (
            module_data.get("metadata", {}).get("owner")
            if isinstance(module_data.get("metadata"), dict)
            else module_data.get("owner")
        ),
        "atoms": module_data.get("atom_ids") or module_data.get("atoms") or [],
        "phaseId": module_data.get("phaseId"),
        "_file_path": str(module_file),
        "_raw": serialize_dates(module_data),
    }

    return normalized


def trigger_github_event(event_type: str, module_id: str, payload: Dict[str, Any]):
    """Trigger a GitHub workflow dispatch event for approval workflow."""
    try:
        # Check if we're in a git repository
        repo_root = Path(__file__).parent.parent.parent

        # Create event file for GitHub Actions to pick up
        events_dir = repo_root / ".github" / "events"
        events_dir.mkdir(parents=True, exist_ok=True)

        event_file = events_dir / f"{event_type}_{module_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        event_data = {
            "event_type": event_type,
            "module_id": module_id,
            "timestamp": datetime.now().isoformat(),
            "payload": payload,
        }

        with open(event_file, "w", encoding="utf-8") as fh:
            json.dump(event_data, fh, indent=2)

        print(f"Created event file: {event_file}")
        return True
    except Exception as e:
        print(f"Warning: Failed to create event file: {e}")
        return False


@router.post("/api/modules/{module_id}/approval")
def approval_action(module_id: str, request: ApprovalActionRequest) -> Dict[str, Any]:
    """Perform an approval action on a module."""
    base = Path(__file__).parent.parent.parent / "modules"

    if not base.exists():
        raise HTTPException(status_code=404, detail="modules directory not found")

    # Find the module file
    module_file = None
    for yaml_file in base.glob("*.yaml"):
        try:
            with open(yaml_file, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
            if data and (data.get("id") == module_id or data.get("module_id") == module_id):
                module_file = yaml_file
                break
        except (yaml.YAMLError, IOError):
            continue

    if not module_file:
        raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found")

    # Read current module data
    with open(module_file, "r", encoding="utf-8") as fh:
        module_data = yaml.safe_load(fh)

    # Ensure metadata and approval_workflow exist
    if "metadata" not in module_data:
        module_data["metadata"] = {}

    if "approval_workflow" not in module_data["metadata"]:
        module_data["metadata"]["approval_workflow"] = {"current_stage": "draft", "stages": []}

    workflow = module_data["metadata"]["approval_workflow"]

    # Load approval configuration and determine stages for this module
    approval_config = load_approval_config()
    stage_order = get_approval_stages(module_data, approval_config)

    # Process action
    action = request.action
    current_stage = workflow.get("current_stage", "draft")

    if action == "submit":
        # Move to next stage
        current_index = stage_order.index(current_stage) if current_stage in stage_order else 0
        if current_index < len(stage_order) - 1:
            next_stage = stage_order[current_index + 1]
            workflow["current_stage"] = next_stage

            # Update or create stage entry
            stage_entry = next((s for s in workflow["stages"] if s.get("name") == next_stage), None)
            if not stage_entry:
                stage_entry = {"name": next_stage}
                workflow["stages"].append(stage_entry)

            stage_entry["status"] = "in_progress"
            stage_entry["started_at"] = datetime.now().isoformat()
            stage_entry["submitted_by"] = request.reviewer_email or "system"

            module_data["metadata"]["status"] = next_stage

            # Trigger GitHub event
            trigger_github_event(
                "approval_submitted",
                module_id,
                {"from_stage": current_stage, "to_stage": next_stage, "submitted_by": request.reviewer_email},
            )

    elif action == "approve":
        # Mark current stage as completed
        stage_entry = next((s for s in workflow["stages"] if s.get("name") == request.stage), None)
        if not stage_entry:
            stage_entry = {"name": request.stage}
            workflow["stages"].append(stage_entry)

        stage_entry["status"] = "completed"
        stage_entry["completed_at"] = datetime.now().isoformat()
        stage_entry["completed_by"] = request.reviewer_email or "system"
        stage_entry["reviewer_role"] = request.reviewer_role
        if request.comments:
            stage_entry["comments"] = request.comments

        # Move to next stage if not at the end
        current_index = stage_order.index(request.stage) if request.stage in stage_order else 0
        if current_index < len(stage_order) - 1:
            next_stage = stage_order[current_index + 1]
            workflow["current_stage"] = next_stage
            module_data["metadata"]["status"] = next_stage
        else:
            workflow["current_stage"] = "approved"
            module_data["metadata"]["status"] = "approved"

        # Trigger GitHub event
        trigger_github_event(
            "approval_approved",
            module_id,
            {"stage": request.stage, "approved_by": request.reviewer_email, "reviewer_role": request.reviewer_role},
        )

    elif action == "reject":
        # Mark stage as rejected and move back to draft
        stage_entry = next((s for s in workflow["stages"] if s.get("name") == request.stage), None)
        if not stage_entry:
            stage_entry = {"name": request.stage}
            workflow["stages"].append(stage_entry)

        stage_entry["status"] = "rejected"
        stage_entry["rejected_at"] = datetime.now().isoformat()
        stage_entry["rejected_by"] = request.reviewer_email or "system"
        stage_entry["reviewer_role"] = request.reviewer_role
        if request.comments:
            stage_entry["rejection_reason"] = request.comments

        workflow["current_stage"] = "draft"
        module_data["metadata"]["status"] = "draft"

        # Trigger GitHub event
        trigger_github_event(
            "approval_rejected",
            module_id,
            {"stage": request.stage, "rejected_by": request.reviewer_email, "reason": request.comments},
        )

    elif action == "request_changes":
        # Mark stage as needing changes
        stage_entry = next((s for s in workflow["stages"] if s.get("name") == request.stage), None)
        if not stage_entry:
            stage_entry = {"name": request.stage}
            workflow["stages"].append(stage_entry)

        stage_entry["status"] = "changes_requested"
        stage_entry["changes_requested_at"] = datetime.now().isoformat()
        stage_entry["changes_requested_by"] = request.reviewer_email or "system"
        stage_entry["reviewer_role"] = request.reviewer_role
        if request.comments:
            stage_entry["requested_changes"] = request.comments

        workflow["current_stage"] = "draft"
        module_data["metadata"]["status"] = "draft"

        # Trigger GitHub event
        trigger_github_event(
            "approval_changes_requested",
            module_id,
            {"stage": request.stage, "requested_by": request.reviewer_email, "changes": request.comments},
        )

    # Update timestamp
    module_data["metadata"]["updated_at"] = datetime.now().isoformat()

    # Write back to file
    with open(module_file, "w", encoding="utf-8") as fh:
        yaml.dump(module_data, fh, default_flow_style=False, sort_keys=False, allow_unicode=True)

    # Return normalized format
    normalized = {
        "id": module_data.get("module_id") or module_data.get("id"),
        "name": module_data.get("name"),
        "description": module_data.get("description"),
        "owner": (
            module_data.get("metadata", {}).get("owner")
            if isinstance(module_data.get("metadata"), dict)
            else module_data.get("owner")
        ),
        "atoms": module_data.get("atom_ids") or module_data.get("atoms") or [],
        "phaseId": module_data.get("phaseId"),
        "_file_path": str(module_file),
        "_raw": serialize_dates(module_data),
    }

    return normalized
