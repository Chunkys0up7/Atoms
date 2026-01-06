"""
Phases and Journeys API

Provides endpoints for managing phases and customer journeys:
- Phase CRUD operations
- Journey CRUD operations
- Phase-to-journey associations
- Phase metrics and analytics
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

import yaml

# Data storage paths
PHASES_DIR = Path(__file__).parent.parent.parent / "phases"
JOURNEYS_DIR = Path(__file__).parent.parent.parent / "journeys"


class Phase(BaseModel):
    """Phase model"""

    id: str
    name: str
    description: str
    modules: List[str] = []
    journeyId: Optional[str] = None
    targetDurationDays: int = 0
    sequence: Optional[int] = None
    entry_criteria: Optional[List[str]] = None
    exit_criteria: Optional[List[str]] = None
    sla_hours: Optional[int] = None


class Journey(BaseModel):
    """Customer journey model"""

    id: str
    name: str
    description: str
    phases: List[str] = []
    journey_type: Optional[str] = None  # purchase, refinance, etc.
    product_type: Optional[str] = None  # conventional, FHA, VA, etc.
    target_duration_days: Optional[int] = None


def load_phases() -> List[Phase]:
    """Load phases from YAML files in phases directory."""
    phases = []
    if not PHASES_DIR.exists():
        return get_default_phases()

    for yaml_file in PHASES_DIR.glob("*.yaml"):
        try:
            with open(yaml_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                if data:
                    phases.append(Phase(**data))
        except Exception as e:
            print(f"Error loading phase {yaml_file}: {e}", file=sys.stderr)

    return phases if phases else get_default_phases()


def save_phase_to_file(phase: Phase) -> None:
    """Save a single phase to its YAML file."""
    PHASES_DIR.mkdir(parents=True, exist_ok=True)
    file_path = PHASES_DIR / f"{phase.id}.yaml"
    
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            yaml.dump(phase.dict(), f, default_flow_style=False, sort_keys=False)
    except Exception as e:
        print(f"Error saving phase {phase.id}: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to save phase: {str(e)}")


def delete_phase_file(phase_id: str) -> None:
    """Delete a phase YAML file."""
    file_path = PHASES_DIR / f"{phase_id}.yaml"
    if file_path.exists():
        file_path.unlink()


def load_journeys() -> List[Journey]:
    """Load journeys from YAML files in journeys directory."""
    journeys = []
    if not JOURNEYS_DIR.exists():
        return get_default_journeys()

    for yaml_file in JOURNEYS_DIR.glob("*.yaml"):
        try:
            with open(yaml_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                if data:
                    journeys.append(Journey(**data))
        except Exception as e:
            print(f"Error loading journey {yaml_file}: {e}", file=sys.stderr)
            
    return journeys if journeys else get_default_journeys()


def save_journey_to_file(journey: Journey) -> None:
    """Save a single journey to its YAML file."""
    JOURNEYS_DIR.mkdir(parents=True, exist_ok=True)
    file_path = JOURNEYS_DIR / f"{journey.id}.yaml"
    
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            yaml.dump(journey.dict(), f, default_flow_style=False, sort_keys=False)
    except Exception as e:
        print(f"Error saving journey {journey.id}: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to save journey: {str(e)}")


def delete_journey_file(journey_id: str) -> None:
    """Delete a journey YAML file."""
    file_path = JOURNEYS_DIR / f"{journey_id}.yaml"
    if file_path.exists():
        file_path.unlink()


def get_default_phases() -> List[Phase]:
    """Get default phase configuration."""
    return [
        Phase(
            id="phase-pre-application",
            name="Pre-Application",
            description="Customer inquiry and pre-qualification",
            modules=["module-pre-qualification"],
            targetDurationDays=3,
            sequence=1,
            entry_criteria=["Customer interest expressed"],
            exit_criteria=["Pre-qualification completed", "Customer ready to apply"],
        ),
        Phase(
            id="phase-application-intake",
            name="Application Intake",
            description="Loan application submission and initial review",
            modules=["module-application-intake", "module-income-verification", "module-asset-verification"],
            targetDurationDays=7,
            sequence=2,
            entry_criteria=["Pre-qualification completed"],
            exit_criteria=["Complete application submitted", "Initial documents collected"],
        ),
        Phase(
            id="phase-processing",
            name="Processing",
            description="Document verification and processing",
            modules=["module-credit-analysis", "module-property-appraisal", "module-title-insurance"],
            targetDurationDays=14,
            sequence=3,
            entry_criteria=["Application submitted"],
            exit_criteria=["All documents verified", "Appraisal completed"],
        ),
        Phase(
            id="phase-underwriting",
            name="Underwriting",
            description="Risk assessment and loan decision",
            modules=["module-underwriting-decision", "module-conditions-management"],
            targetDurationDays=7,
            sequence=4,
            entry_criteria=["Documents verified", "Appraisal received"],
            exit_criteria=["Loan approved or denied", "Conditions identified"],
        ),
        Phase(
            id="phase-closing",
            name="Closing",
            description="Final preparation and closing",
            modules=["module-closing-preparation", "module-funding-recording", "module-quality-control"],
            targetDurationDays=14,
            sequence=5,
            entry_criteria=["Loan approved", "All conditions cleared"],
            exit_criteria=["Loan closed and funded"],
        ),
    ]


def get_default_journeys() -> List[Journey]:
    """Get default journey configuration."""
    return [
        Journey(
            id="journey-purchase-conventional",
            name="Home Purchase - Conventional",
            description="Conventional loan for home purchase",
            phases=[
                "phase-pre-application",
                "phase-application-intake",
                "phase-processing",
                "phase-underwriting",
                "phase-closing",
            ],
            journey_type="purchase",
            product_type="conventional",
            target_duration_days=45,
        ),
        Journey(
            id="journey-purchase-fha",
            name="Home Purchase - FHA",
            description="FHA loan for home purchase",
            phases=[
                "phase-pre-application",
                "phase-application-intake",
                "phase-processing",
                "phase-underwriting",
                "phase-closing",
            ],
            journey_type="purchase",
            product_type="fha",
            target_duration_days=50,
        ),
        Journey(
            id="journey-refinance-rate-term",
            name="Refinance - Rate & Term",
            description="Rate and term refinance",
            phases=[
                "phase-pre-application",
                "phase-application-intake",
                "phase-processing",
                "phase-underwriting",
                "phase-closing",
            ],
            journey_type="refinance",
            product_type="conventional",
            target_duration_days=35,
        ),
    ]


# Phase Endpoints


@router.get("/api/phases")
def get_all_phases() -> List[Phase]:
    """
    Get all phases.

    Returns:
        List of phase definitions
    """
    return load_phases()


@router.get("/api/phases/{phase_id}")
def get_phase(phase_id: str) -> Phase:
    """
    Get a specific phase by ID.

    Args:
        phase_id: Phase ID

    Returns:
        Phase definition
    """
    phases = load_phases()
    phase = next((p for p in phases if p.id == phase_id), None)

    if not phase:
        raise HTTPException(status_code=404, detail=f"Phase '{phase_id}' not found")

    return phase


@router.post("/api/phases")
def create_phase(phase: Phase) -> Phase:
    """
    Create a new phase.

    Args:
        phase: Phase definition

    Returns:
        Created phase
    """
    phases = load_phases()

    # Check for duplicate ID
    if any(p.id == phase.id for p in phases):
        raise HTTPException(status_code=400, detail=f"Phase with ID '{phase.id}' already exists")

    phases.append(phase)
    save_phase_to_file(phase)

    return phase


@router.put("/api/phases/{phase_id}")
def update_phase(phase_id: str, phase: Phase) -> Phase:
    """
    Update an existing phase.

    Args:
        phase_id: Phase ID to update
        phase: Updated phase definition

    Returns:
        Updated phase
    """
    phases = load_phases()
    index = next((i for i, p in enumerate(phases) if p.id == phase_id), None)

    if index is None:
        raise HTTPException(status_code=404, detail=f"Phase '{phase_id}' not found")

    phases[index] = phase
    save_phase_to_file(phase)

    return phase


@router.delete("/api/phases/{phase_id}")
def delete_phase(phase_id: str) -> Dict[str, Any]:
    """
    Delete a phase.

    Args:
        phase_id: Phase ID to delete

    Returns:
        Deletion confirmation
    """
    phases = load_phases()
    target = next((p for p in phases if p.id == phase_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Phase '{phase_id}' not found")

    delete_phase_file(phase_id)

    return {"status": "success", "message": f"Phase '{phase_id}' deleted"}


# Journey Endpoints


@router.get("/api/journeys")
def get_all_journeys() -> List[Journey]:
    """
    Get all customer journeys.

    Returns:
        List of journey definitions
    """
    return load_journeys()


@router.get("/api/journeys/{journey_id}")
def get_journey(journey_id: str) -> Journey:
    """
    Get a specific journey by ID.

    Args:
        journey_id: Journey ID

    Returns:
        Journey definition
    """
    journeys = load_journeys()
    journey = next((j for j in journeys if j.id == journey_id), None)

    if not journey:
        raise HTTPException(status_code=404, detail=f"Journey '{journey_id}' not found")

    return journey


@router.post("/api/journeys")
def create_journey(journey: Journey) -> Journey:
    """
    Create a new journey.

    Args:
        journey: Journey definition

    Returns:
        Created journey
    """
    journeys = load_journeys()

    # Check for duplicate ID
    if any(j.id == journey.id for j in journeys):
        raise HTTPException(status_code=400, detail=f"Journey with ID '{journey.id}' already exists")

    journeys.append(journey)
    save_journey_to_file(journey)

    return journey


@router.put("/api/journeys/{journey_id}")
def update_journey(journey_id: str, journey: Journey) -> Journey:
    """
    Update an existing journey.

    Args:
        journey_id: Journey ID to update
        journey: Updated journey definition

    Returns:
        Updated journey
    """
    journeys = load_journeys()
    index = next((i for i, j in enumerate(journeys) if j.id == journey_id), None)

    if index is None:
        raise HTTPException(status_code=404, detail=f"Journey '{journey_id}' not found")

    journeys[index] = journey
    save_journey_to_file(journey)

    return journey


@router.delete("/api/journeys/{journey_id}")
def delete_journey(journey_id: str) -> Dict[str, Any]:
    """
    Delete a journey.

    Args:
        journey_id: Journey ID to delete

    Returns:
        Deletion confirmation
    """
    journeys = load_journeys()
    target = next((j for j in journeys if j.id == journey_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Journey '{journey_id}' not found")

    delete_journey_file(journey_id)

    return {"status": "success", "message": f"Journey '{journey_id}' deleted"}


@router.get("/api/journeys/{journey_id}/phases")
def get_journey_phases(journey_id: str) -> List[Phase]:
    """
    Get all phases for a specific journey.

    Args:
        journey_id: Journey ID

    Returns:
        List of phases in the journey
    """
    journey = get_journey(journey_id)
    all_phases = load_phases()

    journey_phases = [p for p in all_phases if p.id in journey.phases]

    # Sort by sequence if available
    journey_phases.sort(key=lambda p: p.sequence if p.sequence else 999)

    return journey_phases


@router.get("/api/phases/stats")
def get_phase_stats() -> Dict[str, Any]:
    """
    Get phase statistics.

    Returns:
        Statistics about phases
    """
    phases = load_phases()
    journeys = load_journeys()

    total_modules = sum(len(p.modules) for p in phases)
    avg_duration = sum(p.targetDurationDays for p in phases) / len(phases) if phases else 0

    return {
        "total_phases": len(phases),
        "total_journeys": len(journeys),
        "total_modules_in_phases": total_modules,
        "avg_phase_duration_days": round(avg_duration, 1),
        "phases_by_journey": {j.id: len([p for p in phases if p.journeyId == j.id]) for j in journeys},
    }
