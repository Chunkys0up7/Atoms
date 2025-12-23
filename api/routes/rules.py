from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from pathlib import Path
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime
import json
import yaml

router = APIRouter()

# ============================================================================
# DATA MODELS
# ============================================================================

class ConditionRule(BaseModel):
    """Single condition in a rule (e.g., credit_score < 620)"""
    field: str = Field(..., description="Field path (e.g., 'customer_data.credit_score')")
    operator: Literal["EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN", "GREATER_EQUAL", "LESS_EQUAL", "CONTAINS", "NOT_CONTAINS", "IN", "NOT_IN"] = Field(..., description="Comparison operator")
    value: Any = Field(..., description="Value to compare against")


class ConditionGroup(BaseModel):
    """Group of conditions with logical operator"""
    type: Literal["AND", "OR", "NOT"] = Field(..., description="Logical operator for this group")
    rules: List[ConditionRule] = Field(default_factory=list, description="List of conditions in this group")
    groups: Optional[List['ConditionGroup']] = Field(default=None, description="Nested condition groups")


# Enable forward references for recursive model
ConditionGroup.model_rebuild()


class PhaseAction(BaseModel):
    """Definition of a phase to insert/modify"""
    id: str = Field(..., description="Phase ID (e.g., 'phase-manual-credit-review')")
    name: str = Field(..., description="Human-readable phase name")
    description: str = Field(..., description="Description of what this phase does")
    position: Literal["BEFORE", "AFTER", "REPLACE", "AT_START", "AT_END"] = Field(..., description="Where to insert the phase")
    reference_phase: Optional[str] = Field(None, description="Reference phase ID for BEFORE/AFTER/REPLACE")
    modules: List[str] = Field(default_factory=list, description="Module IDs to include in this phase")
    target_duration_days: int = Field(default=1, description="Expected duration in days")


class RuleModification(BaseModel):
    """Metadata about the modification"""
    reason: str = Field(..., description="Why this modification is being applied")
    criticality: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = Field(default="MEDIUM", description="Impact level of this modification")


class RuleAction(BaseModel):
    """Action to take when rule triggers"""
    type: Literal["INSERT_PHASE", "REMOVE_PHASE", "REPLACE_PHASE", "MODIFY_PHASE"] = Field(..., description="Type of modification")
    phase: PhaseAction = Field(..., description="Phase definition")
    modification: RuleModification = Field(..., description="Modification metadata")


class RuleDefinition(BaseModel):
    """Complete rule definition"""
    rule_id: str = Field(..., description="Unique rule identifier")
    name: str = Field(..., description="Human-readable rule name")
    description: str = Field(..., description="What this rule does and why")
    priority: int = Field(..., ge=1, le=10, description="Rule priority (1-10, higher = more important)")
    active: bool = Field(default=True, description="Whether this rule is active")
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), description="Creation timestamp")
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), description="Last update timestamp")
    created_by: str = Field(default="system", description="User who created this rule")
    version: int = Field(default=1, description="Rule version number")

    condition: ConditionGroup = Field(..., description="Condition(s) that trigger this rule")
    action: RuleAction = Field(..., description="Action to take when triggered")


class CreateRuleRequest(BaseModel):
    """Request to create a new rule"""
    name: str
    description: str
    priority: int = Field(ge=1, le=10)
    active: bool = True
    condition: ConditionGroup
    action: RuleAction
    created_by: str = "system"


class UpdateRuleRequest(BaseModel):
    """Request to update an existing rule"""
    name: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[int] = Field(None, ge=1, le=10)
    active: Optional[bool] = None
    condition: Optional[ConditionGroup] = None
    action: Optional[RuleAction] = None


class TestRuleResult(BaseModel):
    """Result of testing a rule"""
    rule_id: str
    triggered: bool
    reason: Optional[str] = None
    would_modify: bool
    modification_preview: Optional[Dict[str, Any]] = None


# ============================================================================
# STORAGE LAYER
# ============================================================================

def get_rules_dir() -> Path:
    """Get the rules storage directory."""
    base = Path(__file__).parent.parent.parent / "data" / "rules"
    base.mkdir(parents=True, exist_ok=True)
    return base


def get_rules_json_path() -> Path:
    """Get path to rules.json (primary storage)."""
    return get_rules_dir() / "rules.json"


def get_rule_yaml_path(rule_id: str, version: int) -> Path:
    """Get path to YAML backup for a specific rule version."""
    return get_rules_dir() / f"{rule_id}-v{version}.yaml"


def load_rules_from_storage() -> Dict[str, Any]:
    """Load all rules from rules.json."""
    rules_path = get_rules_json_path()

    if not rules_path.exists():
        # Initialize empty storage
        default_storage = {
            "version": "1.0",
            "last_updated": datetime.utcnow().isoformat(),
            "rules": []
        }
        save_rules_to_storage(default_storage)
        return default_storage

    try:
        with open(rules_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load rules: {str(e)}")


def save_rules_to_storage(rules_data: Dict[str, Any]) -> None:
    """Save all rules to rules.json."""
    rules_path = get_rules_json_path()
    rules_data["last_updated"] = datetime.utcnow().isoformat()

    try:
        with open(rules_path, "w", encoding="utf-8") as f:
            json.dump(rules_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save rules: {str(e)}")


def save_rule_yaml_backup(rule: RuleDefinition) -> None:
    """Save YAML backup of a rule for Git tracking."""
    yaml_path = get_rule_yaml_path(rule.rule_id, rule.version)

    try:
        rule_dict = rule.model_dump()
        with open(yaml_path, "w", encoding="utf-8") as f:
            yaml.dump(rule_dict, f, default_flow_style=False, allow_unicode=True)
    except Exception as e:
        print(f"Warning: Failed to save YAML backup: {e}")


def generate_rule_id(name: str) -> str:
    """Generate a rule ID from the name."""
    # Convert to lowercase, replace spaces with hyphens
    rule_id = name.lower().replace(" ", "-")
    # Remove special characters
    rule_id = "".join(c for c in rule_id if c.isalnum() or c == "-")
    # Add rule- prefix
    return f"rule-{rule_id}"


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.get("/api/rules")
def list_rules(active_only: bool = False) -> List[RuleDefinition]:
    """
    Get all rules.

    Args:
        active_only: If True, only return active rules

    Returns:
        List of rule definitions
    """
    storage = load_rules_from_storage()
    rules = [RuleDefinition(**rule) for rule in storage.get("rules", [])]

    if active_only:
        rules = [r for r in rules if r.active]

    # Sort by priority (descending) then name
    rules.sort(key=lambda r: (-r.priority, r.name))

    return rules


@router.get("/api/rules/{rule_id}")
def get_rule(rule_id: str) -> RuleDefinition:
    """
    Get a specific rule by ID.

    Args:
        rule_id: Rule identifier

    Returns:
        Rule definition
    """
    storage = load_rules_from_storage()

    for rule_data in storage.get("rules", []):
        if rule_data.get("rule_id") == rule_id:
            return RuleDefinition(**rule_data)

    raise HTTPException(status_code=404, detail=f"Rule '{rule_id}' not found")


@router.post("/api/rules")
def create_rule(request: CreateRuleRequest) -> RuleDefinition:
    """
    Create a new rule.

    Args:
        request: Rule creation request

    Returns:
        Created rule definition
    """
    storage = load_rules_from_storage()

    # Generate rule ID
    rule_id = generate_rule_id(request.name)

    # Check for duplicate
    existing_ids = [r.get("rule_id") for r in storage.get("rules", [])]
    if rule_id in existing_ids:
        # Add suffix to make unique
        counter = 2
        while f"{rule_id}-{counter}" in existing_ids:
            counter += 1
        rule_id = f"{rule_id}-{counter}"

    # Create rule
    now = datetime.utcnow().isoformat()
    rule = RuleDefinition(
        rule_id=rule_id,
        name=request.name,
        description=request.description,
        priority=request.priority,
        active=request.active,
        condition=request.condition,
        action=request.action,
        created_at=now,
        updated_at=now,
        created_by=request.created_by,
        version=1
    )

    # Add to storage
    storage["rules"].append(rule.model_dump())
    save_rules_to_storage(storage)

    # Save YAML backup
    save_rule_yaml_backup(rule)

    return rule


@router.put("/api/rules/{rule_id}")
def update_rule(rule_id: str, request: UpdateRuleRequest) -> RuleDefinition:
    """
    Update an existing rule (creates new version).

    Args:
        rule_id: Rule identifier
        request: Update request with fields to change

    Returns:
        Updated rule definition
    """
    storage = load_rules_from_storage()

    # Find rule
    rule_index = None
    for i, rule_data in enumerate(storage.get("rules", [])):
        if rule_data.get("rule_id") == rule_id:
            rule_index = i
            break

    if rule_index is None:
        raise HTTPException(status_code=404, detail=f"Rule '{rule_id}' not found")

    # Get current rule
    current_rule = RuleDefinition(**storage["rules"][rule_index])

    # Apply updates
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_rule, field, value)

    # Increment version
    current_rule.version += 1
    current_rule.updated_at = datetime.utcnow().isoformat()

    # Update in storage
    storage["rules"][rule_index] = current_rule.model_dump()
    save_rules_to_storage(storage)

    # Save YAML backup
    save_rule_yaml_backup(current_rule)

    return current_rule


@router.delete("/api/rules/{rule_id}")
def delete_rule(rule_id: str) -> Dict[str, str]:
    """
    Delete a rule (soft delete - sets active=False).

    Args:
        rule_id: Rule identifier

    Returns:
        Deletion status
    """
    storage = load_rules_from_storage()

    # Find and deactivate rule
    found = False
    for rule_data in storage.get("rules", []):
        if rule_data.get("rule_id") == rule_id:
            rule_data["active"] = False
            rule_data["updated_at"] = datetime.utcnow().isoformat()
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail=f"Rule '{rule_id}' not found")

    save_rules_to_storage(storage)

    return {"status": "deleted", "rule_id": rule_id}


@router.post("/api/rules/{rule_id}/activate")
def activate_rule(rule_id: str) -> RuleDefinition:
    """
    Activate a rule.

    Args:
        rule_id: Rule identifier

    Returns:
        Updated rule definition
    """
    return update_rule(rule_id, UpdateRuleRequest(active=True))


@router.post("/api/rules/{rule_id}/deactivate")
def deactivate_rule(rule_id: str) -> RuleDefinition:
    """
    Deactivate a rule.

    Args:
        rule_id: Rule identifier

    Returns:
        Updated rule definition
    """
    return update_rule(rule_id, UpdateRuleRequest(active=False))


@router.get("/api/rules/{rule_id}/versions")
def get_rule_versions(rule_id: str) -> List[Dict[str, Any]]:
    """
    Get all YAML backup versions of a rule.

    Args:
        rule_id: Rule identifier

    Returns:
        List of version metadata
    """
    rules_dir = get_rules_dir()
    versions = []

    # Find all YAML files for this rule
    for yaml_file in sorted(rules_dir.glob(f"{rule_id}-v*.yaml")):
        try:
            # Extract version from filename
            version_str = yaml_file.stem.split("-v")[1]
            version = int(version_str)

            # Load YAML to get metadata
            with open(yaml_file, "r", encoding="utf-8") as f:
                rule_data = yaml.safe_load(f)

            versions.append({
                "version": version,
                "updated_at": rule_data.get("updated_at"),
                "name": rule_data.get("name"),
                "active": rule_data.get("active"),
                "file": str(yaml_file.name)
            })
        except Exception as e:
            print(f"Warning: Failed to load version {yaml_file}: {e}")
            continue

    # Sort by version descending
    versions.sort(key=lambda v: v["version"], reverse=True)

    return versions


@router.post("/api/rules/{rule_id}/test")
def test_rule(rule_id: str, context: Dict[str, Any]) -> TestRuleResult:
    """
    Test a rule against a specific context (dry run).

    Args:
        rule_id: Rule identifier
        context: Runtime context to test against

    Returns:
        Test result showing if rule would trigger
    """
    # Get the rule
    rule = get_rule(rule_id)

    # Evaluate condition
    triggered = evaluate_condition(rule.condition, context)

    result = TestRuleResult(
        rule_id=rule_id,
        triggered=triggered,
        would_modify=triggered and rule.active
    )

    if triggered:
        result.reason = rule.action.modification.reason
        result.modification_preview = {
            "action_type": rule.action.type,
            "phase_id": rule.action.phase.id,
            "phase_name": rule.action.phase.name,
            "position": rule.action.phase.position,
            "criticality": rule.action.modification.criticality
        }

    return result


def evaluate_condition(condition: ConditionGroup, context: Dict[str, Any]) -> bool:
    """
    Evaluate a condition group against context.

    Args:
        condition: Condition group to evaluate
        context: Runtime context

    Returns:
        True if condition is satisfied
    """
    results = []

    # Evaluate individual rules
    for rule in condition.rules:
        try:
            # Get field value from context
            value = context
            for part in rule.field.split("."):
                value = value.get(part, None)
                if value is None:
                    break

            # Evaluate operator
            if rule.operator == "EQUALS":
                results.append(value == rule.value)
            elif rule.operator == "NOT_EQUALS":
                results.append(value != rule.value)
            elif rule.operator == "GREATER_THAN":
                results.append(value is not None and value > rule.value)
            elif rule.operator == "LESS_THAN":
                results.append(value is not None and value < rule.value)
            elif rule.operator == "GREATER_EQUAL":
                results.append(value is not None and value >= rule.value)
            elif rule.operator == "LESS_EQUAL":
                results.append(value is not None and value <= rule.value)
            elif rule.operator == "CONTAINS":
                results.append(value is not None and rule.value in value)
            elif rule.operator == "NOT_CONTAINS":
                results.append(value is not None and rule.value not in value)
            elif rule.operator == "IN":
                results.append(value is not None and value in rule.value)
            elif rule.operator == "NOT_IN":
                results.append(value is not None and value not in rule.value)
            else:
                results.append(False)
        except Exception:
            results.append(False)

    # Evaluate nested groups
    if condition.groups:
        for group in condition.groups:
            results.append(evaluate_condition(group, context))

    # Apply logical operator
    if condition.type == "AND":
        return all(results) if results else True
    elif condition.type == "OR":
        return any(results) if results else False
    elif condition.type == "NOT":
        return not all(results) if results else True

    return False
