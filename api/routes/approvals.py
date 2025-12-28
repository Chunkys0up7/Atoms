"""
Multi-Level Approval Workflow System

Handles approvals at multiple levels:
1. Atom Ownership Approval - Atom owners approve use of their atoms in modules
2. Module Approval - Module owners approve module composition
3. Document Publication Approval - Reviewers approve compiled documents for publication
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import yaml

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


class AtomUsageApprovalRequest(BaseModel):
    """Request to use an atom in a module"""
    atom_id: str
    module_id: str
    requested_by: str
    justification: Optional[str] = None


class ApprovalDecision(BaseModel):
    """Approval or rejection decision"""
    decision: str  # 'approve' or 'reject'
    approver: str
    notes: Optional[str] = None


class ModuleApprovalRequest(BaseModel):
    """Request approval for a module composition"""
    module_id: str
    requested_by: str
    justification: Optional[str] = None


def get_atoms_dir() -> Path:
    """Get the atoms directory."""
    return Path(__file__).parent.parent.parent / "atoms"


def get_ownership_file() -> Path:
    """Get the ownership assignments file."""
    return Path(__file__).parent.parent.parent / "test_data" / "ownership" / "ownership-assignments.yaml"


def get_approvals_dir() -> Path:
    """Get the approvals storage directory."""
    base = Path(__file__).parent.parent.parent / "data" / "approvals"
    base.mkdir(parents=True, exist_ok=True)
    return base


def get_atom_owner(atom_id: str) -> Optional[str]:
    """Get the owner of an atom."""
    # First check ownership-assignments.yaml
    ownership_file = get_ownership_file()
    if ownership_file.exists():
        with open(ownership_file, 'r') as f:
            data = yaml.safe_load(f)
            for assignment in data.get('assignments', []):
                if assignment['atomId'] == atom_id:
                    return assignment['owner']

    # Fall back to checking the atom file directly
    atoms_dir = get_atoms_dir()
    for atom_file in atoms_dir.rglob(f"{atom_id}.yaml"):
        with open(atom_file, 'r') as f:
            atom_data = yaml.safe_load(f)
            return atom_data.get('owner')

    return None


def get_atom_steward(atom_id: str) -> Optional[str]:
    """Get the steward of an atom."""
    # First check ownership-assignments.yaml
    ownership_file = get_ownership_file()
    if ownership_file.exists():
        with open(ownership_file, 'r') as f:
            data = yaml.safe_load(f)
            for assignment in data.get('assignments', []):
                if assignment['atomId'] == atom_id:
                    return assignment['steward']

    # Fall back to checking the atom file directly
    atoms_dir = get_atoms_dir()
    for atom_file in atoms_dir.rglob(f"{atom_id}.yaml"):
        with open(atom_file, 'r') as f:
            atom_data = yaml.safe_load(f)
            return atom_data.get('steward')

    return None


@router.post("/atom-usage")
def request_atom_usage_approval(request: AtomUsageApprovalRequest) -> Dict[str, Any]:
    """Request approval to use an atom in a module."""
    # Get atom owner
    owner = get_atom_owner(request.atom_id)
    steward = get_atom_steward(request.atom_id)

    if not owner:
        raise HTTPException(
            status_code=404,
            detail=f"Atom '{request.atom_id}' not found or has no owner"
        )

    # Create approval request
    now = datetime.utcnow().isoformat()
    approval_request = {
        'id': f"{request.module_id}_{request.atom_id}_{now}",
        'type': 'atom_usage',
        'atom_id': request.atom_id,
        'module_id': request.module_id,
        'requested_by': request.requested_by,
        'justification': request.justification,
        'owner': owner,
        'steward': steward,
        'status': 'pending',
        'created_at': now,
        'updated_at': now
    }

    # Save approval request
    approvals_dir = get_approvals_dir()
    request_file = approvals_dir / f"{approval_request['id']}.json"
    with open(request_file, 'w') as f:
        json.dump(approval_request, f, indent=2)

    return approval_request


@router.post("/atom-usage/{approval_id}/decide")
def decide_atom_usage_approval(approval_id: str, decision: ApprovalDecision) -> Dict[str, Any]:
    """Approve or reject an atom usage request."""
    approvals_dir = get_approvals_dir()
    request_file = approvals_dir / f"{approval_id}.json"

    if not request_file.exists():
        raise HTTPException(status_code=404, detail=f"Approval request '{approval_id}' not found")

    # Load approval request
    with open(request_file, 'r') as f:
        approval_request = json.load(f)

    # Verify approver is the owner or steward
    if decision.approver not in [approval_request['owner'], approval_request['steward']]:
        raise HTTPException(
            status_code=403,
            detail=f"Only the atom owner ({approval_request['owner']}) or steward ({approval_request['steward']}) can approve this request"
        )

    # Validate decision
    if decision.decision not in ['approve', 'reject']:
        raise HTTPException(status_code=400, detail="Decision must be 'approve' or 'reject'")

    # Update approval request
    now = datetime.utcnow().isoformat()
    approval_request['status'] = 'approved' if decision.decision == 'approve' else 'rejected'
    approval_request['decided_by'] = decision.approver
    approval_request['decided_at'] = now
    approval_request['decision_notes'] = decision.notes
    approval_request['updated_at'] = now

    # Save updated request
    with open(request_file, 'w') as f:
        json.dump(approval_request, f, indent=2)

    return approval_request


@router.get("/atom-usage/pending")
def get_pending_atom_approvals(owner: Optional[str] = None) -> Dict[str, Any]:
    """Get pending atom usage approval requests."""
    approvals_dir = get_approvals_dir()
    pending = []

    for request_file in approvals_dir.glob("*.json"):
        with open(request_file, 'r') as f:
            approval_request = json.load(f)

        if approval_request.get('type') == 'atom_usage' and approval_request.get('status') == 'pending':
            # Filter by owner if specified
            if owner and approval_request.get('owner') != owner:
                continue
            pending.append(approval_request)

    # Sort by created_at (newest first)
    pending.sort(key=lambda x: x.get('created_at', ''), reverse=True)

    return {
        'pending_approvals': pending,
        'count': len(pending)
    }


@router.get("/atom-usage/by-module/{module_id}")
def get_module_atom_approvals(module_id: str) -> Dict[str, Any]:
    """Get all atom usage approvals for a specific module."""
    approvals_dir = get_approvals_dir()
    approvals = []

    for request_file in approvals_dir.glob("*.json"):
        with open(request_file, 'r') as f:
            approval_request = json.load(f)

        if approval_request.get('type') == 'atom_usage' and approval_request.get('module_id') == module_id:
            approvals.append(approval_request)

    # Sort by created_at (newest first)
    approvals.sort(key=lambda x: x.get('created_at', ''), reverse=True)

    # Calculate approval stats
    total = len(approvals)
    approved = sum(1 for a in approvals if a.get('status') == 'approved')
    rejected = sum(1 for a in approvals if a.get('status') == 'rejected')
    pending = sum(1 for a in approvals if a.get('status') == 'pending')

    return {
        'module_id': module_id,
        'approvals': approvals,
        'stats': {
            'total': total,
            'approved': approved,
            'rejected': rejected,
            'pending': pending,
            'approval_rate': approved / total if total > 0 else 0
        }
    }


@router.post("/module")
def request_module_approval(request: ModuleApprovalRequest) -> Dict[str, Any]:
    """Request approval for a module composition."""
    # Get all atoms in the module
    modules_dir = Path(__file__).parent.parent.parent / "modules"
    module_file = modules_dir / f"{request.module_id}.yaml"

    if not module_file.exists():
        raise HTTPException(status_code=404, detail=f"Module '{request.module_id}' not found")

    with open(module_file, 'r') as f:
        module_data = yaml.safe_load(f)

    atom_ids = module_data.get('atoms', []) or module_data.get('atom_ids', [])

    # Check if all atoms have been approved for use in this module
    approvals_dir = get_approvals_dir()
    unapproved_atoms = []

    for atom_id in atom_ids:
        # Check if there's an approved atom usage request
        approved = False
        for request_file in approvals_dir.glob("*.json"):
            with open(request_file, 'r') as f:
                approval_request = json.load(f)

            if (approval_request.get('type') == 'atom_usage' and
                approval_request.get('atom_id') == atom_id and
                approval_request.get('module_id') == request.module_id and
                approval_request.get('status') == 'approved'):
                approved = True
                break

        if not approved:
            unapproved_atoms.append(atom_id)

    if unapproved_atoms:
        return {
            'status': 'pending_atom_approvals',
            'message': f"Cannot approve module until all atoms are approved",
            'unapproved_atoms': unapproved_atoms,
            'total_atoms': len(atom_ids),
            'approved_atoms': len(atom_ids) - len(unapproved_atoms)
        }

    # Create module approval request
    now = datetime.utcnow().isoformat()
    approval_request = {
        'id': f"module_{request.module_id}_{now}",
        'type': 'module_composition',
        'module_id': request.module_id,
        'requested_by': request.requested_by,
        'justification': request.justification,
        'atom_count': len(atom_ids),
        'status': 'pending',
        'created_at': now,
        'updated_at': now
    }

    # Save approval request
    request_file = approvals_dir / f"{approval_request['id']}.json"
    with open(request_file, 'w') as f:
        json.dump(approval_request, f, indent=2)

    return approval_request


@router.get("/module/{module_id}/readiness")
def check_module_approval_readiness(module_id: str) -> Dict[str, Any]:
    """Check if a module is ready for approval (all atoms approved)."""
    # Get all atoms in the module
    modules_dir = Path(__file__).parent.parent.parent / "modules"
    module_file = modules_dir / f"{module_id}.yaml"

    if not module_file.exists():
        raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found")

    with open(module_file, 'r') as f:
        module_data = yaml.safe_load(f)

    atom_ids = module_data.get('atoms', []) or module_data.get('atom_ids', [])

    # Check approval status for each atom
    approvals_dir = get_approvals_dir()
    atom_approval_status = []

    for atom_id in atom_ids:
        owner = get_atom_owner(atom_id)
        approved = False
        approval_id = None

        # Check if there's an approved atom usage request
        for request_file in approvals_dir.glob("*.json"):
            with open(request_file, 'r') as f:
                approval_request = json.load(f)

            if (approval_request.get('type') == 'atom_usage' and
                approval_request.get('atom_id') == atom_id and
                approval_request.get('module_id') == module_id):

                status = approval_request.get('status')
                if status == 'approved':
                    approved = True
                    approval_id = approval_request.get('id')
                    break

        atom_approval_status.append({
            'atom_id': atom_id,
            'owner': owner,
            'approved': approved,
            'approval_id': approval_id
        })

    approved_count = sum(1 for a in atom_approval_status if a['approved'])
    ready = approved_count == len(atom_ids)

    return {
        'module_id': module_id,
        'ready_for_approval': ready,
        'total_atoms': len(atom_ids),
        'approved_atoms': approved_count,
        'pending_atoms': len(atom_ids) - approved_count,
        'atom_approval_status': atom_approval_status
    }
