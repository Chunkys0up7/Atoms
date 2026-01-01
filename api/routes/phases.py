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

# Data storage paths
PHASES_DATA_PATH = Path(__file__).parent.parent.parent / "data" / "phases.json"
JOURNEYS_DATA_PATH = Path(__file__).parent.parent.parent / "data" / "journeys.json"


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
    """Load phases from JSON file."""
    if not PHASES_DATA_PATH.exists():
        return get_default_phases()

    try:
        with open(PHASES_DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [Phase(**p) for p in data]
    except Exception as e:
        print(f"Error loading phases: {e}", file=sys.stderr)
        return get_default_phases()


def save_phases(phases: List[Phase]) -> None:
    """Save phases to JSON file."""
    PHASES_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)

    try:
        with open(PHASES_DATA_PATH, "w", encoding="utf-8") as f:
            json.dump([p.dict() for p in phases], f, indent=2)
    except Exception as e:
        print(f"Error saving phases: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to save phases: {str(e)}")


def load_journeys() -> List[Journey]:
    """Load journeys from JSON file."""
    if not JOURNEYS_DATA_PATH.exists():
        return get_default_journeys()

    try:
        with open(JOURNEYS_DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [Journey(**j) for j in data]
    except Exception as e:
        print(f"Error loading journeys: {e}", file=sys.stderr)
        return get_default_journeys()


def save_journeys(journeys: List[Journey]) -> None:
    """Save journeys to JSON file."""
    JOURNEYS_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)

    try:
        with open(JOURNEYS_DATA_PATH, "w", encoding="utf-8") as f:
            json.dump([j.dict() for j in journeys], f, indent=2)
    except Exception as e:
        print(f"Error saving journeys: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to save journeys: {str(e)}")


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
    save_phases(phases)

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
    save_phases(phases)

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
    phases = [p for p in phases if p.id != phase_id]

    save_phases(phases)

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
    save_journeys(journeys)

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
    save_journeys(journeys)

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
    journeys = [j for j in journeys if j.id != journey_id]

    save_journeys(journeys)

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
