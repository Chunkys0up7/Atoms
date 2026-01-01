"""
Dynamic Process Rewriting Engine
Adapts workflows at runtime based on risk, compliance, and context
"""

import copy
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/runtime", tags=["runtime"])


# Request/Response Models
class RuntimeContext(BaseModel):
    """Context for runtime evaluation"""

    customer_data: Optional[Dict[str, Any]] = None
    transaction_data: Optional[Dict[str, Any]] = None
    risk_flags: List[str] = []
    compliance_requirements: List[str] = []


class PhaseModification(BaseModel):
    """Modification applied to a phase"""

    action: str  # 'insert', 'remove', 'modify'
    phase_id: str
    reason: str
    criticality: str


class JourneyEvaluation(BaseModel):
    """Result of runtime journey evaluation"""

    original_journey_id: str
    modified_journey: Dict[str, Any]
    modifications: List[PhaseModification]
    total_phases_added: int
    total_phases_removed: int
    risk_score: float


# Rule Engine
class ProcessRewriteRule:
    """Base class for process rewrite rules"""

    def __init__(self, rule_id: str, name: str, description: str, priority: int = 5):
        self.rule_id = rule_id
        self.name = name
        self.description = description
        self.priority = priority  # 1-10, higher = more important

    def evaluate(self, journey: Dict[str, Any], context: RuntimeContext) -> bool:
        """Check if rule should be applied"""
        raise NotImplementedError

    def apply(self, journey: Dict[str, Any], context: RuntimeContext) -> tuple[Dict[str, Any], PhaseModification]:
        """Apply the rule to modify journey"""
        raise NotImplementedError


class LowCreditScoreRule(ProcessRewriteRule):
    """Add manual review for low credit scores"""

    def __init__(self):
        super().__init__(
            rule_id="rule-low-credit",
            name="Low Credit Score Manual Review",
            description="Requires manual review for credit scores below 620",
            priority=9,
        )

    def evaluate(self, journey: Dict[str, Any], context: RuntimeContext) -> bool:
        if not context.customer_data:
            return False
        credit_score = context.customer_data.get("credit_score", 850)
        return credit_score < 620

    def apply(self, journey: Dict[str, Any], context: RuntimeContext) -> tuple[Dict[str, Any], PhaseModification]:
        # Insert manual review phase after initial assessment
        review_phase = {
            "id": "phase-manual-credit-review",
            "name": "Manual Credit Review",
            "description": "Enhanced review required due to credit risk",
            "modules": ["module-credit-analysis", "module-risk-assessment"],
            "targetDurationDays": 2,
            "criticality": "HIGH",
        }

        modified = copy.deepcopy(journey)
        # Insert after phase 1 (typically initial assessment)
        if len(modified.get("phases", [])) > 1:
            modified["phases"].insert(1, review_phase["id"])

        modification = PhaseModification(
            action="insert",
            phase_id=review_phase["id"],
            reason=f"Credit score {context.customer_data.get('credit_score')} below threshold (620)",
            criticality="HIGH",
        )

        return modified, modification


class HighValueTransactionRule(ProcessRewriteRule):
    """Add senior approval for high-value transactions"""

    def __init__(self):
        super().__init__(
            rule_id="rule-high-value",
            name="Senior Approval for High Value",
            description="Requires senior management approval for transactions over $1M",
            priority=10,
        )

    def evaluate(self, journey: Dict[str, Any], context: RuntimeContext) -> bool:
        if not context.transaction_data:
            return False
        amount = context.transaction_data.get("amount", 0)
        return amount > 1_000_000

    def apply(self, journey: Dict[str, Any], context: RuntimeContext) -> tuple[Dict[str, Any], PhaseModification]:
        approval_phase = {
            "id": "phase-senior-approval",
            "name": "Senior Management Approval",
            "description": "Required for transactions exceeding $1M",
            "modules": ["module-exec-review", "module-risk-committee"],
            "targetDurationDays": 3,
            "criticality": "CRITICAL",
        }

        modified = copy.deepcopy(journey)
        # Insert before final approval
        if len(modified.get("phases", [])) > 2:
            modified["phases"].insert(-1, approval_phase["id"])

        modification = PhaseModification(
            action="insert",
            phase_id=approval_phase["id"],
            reason=f"Transaction amount ${context.transaction_data.get('amount'):,.2f} exceeds $1M threshold",
            criticality="CRITICAL",
        )

        return modified, modification


class ComplianceCheckRule(ProcessRewriteRule):
    """Add compliance checks based on requirements"""

    def __init__(self):
        super().__init__(
            rule_id="rule-compliance",
            name="Regulatory Compliance Checks",
            description="Adds compliance verification for regulated transactions",
            priority=8,
        )

    def evaluate(self, journey: Dict[str, Any], context: RuntimeContext) -> bool:
        # Check if AML or KYC compliance required
        return "AML" in context.compliance_requirements or "KYC" in context.compliance_requirements

    def apply(self, journey: Dict[str, Any], context: RuntimeContext) -> tuple[Dict[str, Any], PhaseModification]:
        compliance_phase = {
            "id": "phase-compliance-verification",
            "name": "Compliance Verification",
            "description": f"Required checks: {', '.join(context.compliance_requirements)}",
            "modules": ["module-aml-check", "module-kyc-verification"],
            "targetDurationDays": 1,
            "criticality": "HIGH",
        }

        modified = copy.deepcopy(journey)
        # Insert at beginning for compliance
        modified["phases"].insert(0, compliance_phase["id"])

        modification = PhaseModification(
            action="insert",
            phase_id=compliance_phase["id"],
            reason=f"Compliance requirements: {', '.join(context.compliance_requirements)}",
            criticality="HIGH",
        )

        return modified, modification


class FraudRiskRule(ProcessRewriteRule):
    """Add fraud detection for risk flags"""

    def __init__(self):
        super().__init__(
            rule_id="rule-fraud",
            name="Fraud Detection Enhancement",
            description="Adds fraud screening when risk flags are present",
            priority=9,
        )

    def evaluate(self, journey: Dict[str, Any], context: RuntimeContext) -> bool:
        fraud_flags = ["suspicious_activity", "identity_mismatch", "velocity_check_failed"]
        return any(flag in context.risk_flags for flag in fraud_flags)

    def apply(self, journey: Dict[str, Any], context: RuntimeContext) -> tuple[Dict[str, Any], PhaseModification]:
        fraud_phase = {
            "id": "phase-fraud-investigation",
            "name": "Fraud Investigation",
            "description": f"Triggered by: {', '.join([f for f in context.risk_flags if f in ['suspicious_activity', 'identity_mismatch', 'velocity_check_failed']])}",  # noqa: E501
            "modules": ["module-fraud-screening", "module-identity-verification"],
            "targetDurationDays": 2,
            "criticality": "CRITICAL",
        }

        modified = copy.deepcopy(journey)
        # Insert early in process
        modified["phases"].insert(0, fraud_phase["id"])

        modification = PhaseModification(
            action="insert",
            phase_id=fraud_phase["id"],
            reason=f"Risk flags detected: {', '.join(context.risk_flags)}",
            criticality="CRITICAL",
        )

        return modified, modification


class FirstTimeBorrowerRule(ProcessRewriteRule):
    """Add enhanced documentation and education for first-time borrowers"""

    def __init__(self):
        super().__init__(
            rule_id="rule-first-time",
            name="First-Time Borrower Support",
            description="Adds education and documentation support for first-time borrowers",
            priority=6,
        )

    def evaluate(self, journey, context) -> bool:
        if not context.customer_data:
            return False
        return context.customer_data.get("first_time_borrower", False)

    def apply(self, journey, context):
        education_phase = {
            "id": "phase-borrower-education",
            "name": "Borrower Education & Documentation",
            "description": "Additional support for first-time borrowers",
            "modules": ["module-education", "module-doc-assistance"],
            "targetDurationDays": 1,
            "criticality": "MEDIUM",
        }

        modified = copy.deepcopy(journey)
        # Insert early, after application
        if len(modified.get("phases", [])) > 0:
            modified["phases"].insert(1, education_phase["id"])

        modification = PhaseModification(
            action="insert",
            phase_id=education_phase["id"],
            reason="First-time borrower requires additional education and support",
            criticality="MEDIUM",
        )

        return modified, modification


class HighDebtToIncomeRule(ProcessRewriteRule):
    """Add debt counseling for high DTI ratios"""

    def __init__(self):
        super().__init__(
            rule_id="rule-high-dti",
            name="High DTI Ratio Review",
            description="Requires debt counseling review for DTI > 43%",
            priority=8,
        )

    def evaluate(self, journey, context) -> bool:
        if not context.customer_data:
            return False
        dti = context.customer_data.get("debt_to_income_ratio", 0)
        return dti > 0.43

    def apply(self, journey, context):
        dti_phase = {
            "id": "phase-dti-review",
            "name": "DTI Review & Counseling",
            "description": f"High DTI ratio ({context.customer_data.get('debt_to_income_ratio', 0):.1%}) requires review",  # noqa: E501
            "modules": ["module-debt-analysis", "module-underwriting-exception"],
            "targetDurationDays": 2,
            "criticality": "HIGH",
        }

        modified = copy.deepcopy(journey)
        # Insert after assessment
        if len(modified.get("phases", [])) > 2:
            modified["phases"].insert(2, dti_phase["id"])

        modification = PhaseModification(
            action="insert",
            phase_id=dti_phase["id"],
            reason=f"DTI ratio {context.customer_data.get('debt_to_income_ratio', 0):.1%} exceeds 43% threshold",
            criticality="HIGH",
        )

        return modified, modification


class SelfEmployedIncomeRule(ProcessRewriteRule):
    """Add additional verification for self-employed borrowers"""

    def __init__(self):
        super().__init__(
            rule_id="rule-self-employed",
            name="Self-Employed Income Verification",
            description="Enhanced verification for self-employed income",
            priority=7,
        )

    def evaluate(self, journey, context) -> bool:
        if not context.customer_data:
            return False
        return context.customer_data.get("employment_type") == "SELF_EMPLOYED"

    def apply(self, journey, context):
        verification_phase = {
            "id": "phase-self-employed-verification",
            "name": "Self-Employed Income Verification",
            "description": "Additional documentation and verification for self-employed income",
            "modules": ["module-tax-return-analysis", "module-business-verification"],
            "targetDurationDays": 3,
            "criticality": "MEDIUM",
        }

        modified = copy.deepcopy(journey)
        # Insert after initial income verification
        if len(modified.get("phases", [])) > 1:
            modified["phases"].insert(2, verification_phase["id"])

        modification = PhaseModification(
            action="insert",
            phase_id=verification_phase["id"],
            reason="Self-employed income requires enhanced verification",
            criticality="MEDIUM",
        )

        return modified, modification


class PropertyTypeRiskRule(ProcessRewriteRule):
    """Add appraisal review for non-standard properties"""

    def __init__(self):
        super().__init__(
            rule_id="rule-property-risk",
            name="Non-Standard Property Review",
            description="Enhanced appraisal for condos, multi-family, or rural properties",
            priority=7,
        )

    def evaluate(self, journey, context) -> bool:
        if not context.transaction_data:
            return False
        property_type = context.transaction_data.get("property_type", "SINGLE_FAMILY")
        risky_types = ["CONDO", "MULTI_FAMILY", "RURAL", "MANUFACTURED"]
        return property_type in risky_types

    def apply(self, journey, context):
        appraisal_phase = {
            "id": "phase-enhanced-appraisal",
            "name": "Enhanced Property Appraisal",
            "description": f"Additional review for {context.transaction_data.get('property_type')} property",
            "modules": ["module-appraisal-review", "module-comparable-analysis"],
            "targetDurationDays": 2,
            "criticality": "MEDIUM",
        }

        modified = copy.deepcopy(journey)
        # Insert before final approval
        if len(modified.get("phases", [])) > 2:
            modified["phases"].insert(-1, appraisal_phase["id"])

        modification = PhaseModification(
            action="insert",
            phase_id=appraisal_phase["id"],
            reason=f"Property type {context.transaction_data.get('property_type')} requires enhanced appraisal",
            criticality="MEDIUM",
        )

        return modified, modification


class CashOutRefinanceRule(ProcessRewriteRule):
    """Add equity review for cash-out refinances"""

    def __init__(self):
        super().__init__(
            rule_id="rule-cash-out",
            name="Cash-Out Refinance Review",
            description="Additional review for cash-out refinance transactions",
            priority=7,
        )

    def evaluate(self, journey, context) -> bool:
        if not context.transaction_data:
            return False
        loan_purpose = context.transaction_data.get("loan_purpose", "PURCHASE")
        cash_out = context.transaction_data.get("cash_out_amount", 0)
        return loan_purpose == "REFINANCE" and cash_out > 0

    def apply(self, journey, context):
        equity_phase = {
            "id": "phase-equity-review",
            "name": "Equity & Cash-Out Review",
            "description": f"Review cash-out amount ${context.transaction_data.get('cash_out_amount', 0):,.0f}",
            "modules": ["module-equity-analysis", "module-ltv-verification"],
            "targetDurationDays": 1,
            "criticality": "MEDIUM",
        }

        modified = copy.deepcopy(journey)
        # Insert after assessment
        if len(modified.get("phases", [])) > 1:
            modified["phases"].insert(2, equity_phase["id"])

        modification = PhaseModification(
            action="insert",
            phase_id=equity_phase["id"],
            reason=f"Cash-out refinance with ${context.transaction_data.get('cash_out_amount', 0):,.0f} requires equity review",  # noqa: E501
            criticality="MEDIUM",
        )

        return modified, modification


class ExpiredDocumentsRule(ProcessRewriteRule):
    """Add re-verification if documents are expiring soon"""

    def __init__(self):
        super().__init__(
            rule_id="rule-doc-expiration",
            name="Document Expiration Check",
            description="Re-verification when documents are close to expiration",
            priority=8,
        )

    def evaluate(self, journey, context) -> bool:
        return "documents_expiring" in context.risk_flags

    def apply(self, journey, context):
        reverify_phase = {
            "id": "phase-document-reverification",
            "name": "Document Re-Verification",
            "description": "Update expiring documents before closing",
            "modules": ["module-doc-update", "module-reverification"],
            "targetDurationDays": 1,
            "criticality": "HIGH",
        }

        modified = copy.deepcopy(journey)
        # Insert before final approval
        if len(modified.get("phases", [])) > 2:
            modified["phases"].insert(-1, reverify_phase["id"])

        modification = PhaseModification(
            action="insert",
            phase_id=reverify_phase["id"],
            reason="Documents nearing expiration require re-verification",
            criticality="HIGH",
        )

        return modified, modification


class LowAppraisalRule(ProcessRewriteRule):
    """Add renegotiation phase if appraisal comes in low"""

    def __init__(self):
        super().__init__(
            rule_id="rule-low-appraisal",
            name="Low Appraisal Handling",
            description="Add renegotiation when appraisal < purchase price",
            priority=9,
        )

    def evaluate(self, journey, context) -> bool:
        return "appraisal_below_value" in context.risk_flags

    def apply(self, journey, context):
        renegotiation_phase = {
            "id": "phase-value-renegotiation",
            "name": "Price Renegotiation",
            "description": "Appraisal below purchase price requires renegotiation",
            "modules": ["module-price-negotiation", "module-contract-amendment"],
            "targetDurationDays": 3,
            "criticality": "HIGH",
        }

        modified = copy.deepcopy(journey)
        # Insert before approval
        if len(modified.get("phases", [])) > 2:
            modified["phases"].insert(-2, renegotiation_phase["id"])

        modification = PhaseModification(
            action="insert",
            phase_id=renegotiation_phase["id"],
            reason="Appraisal value below purchase price requires renegotiation",
            criticality="HIGH",
        )

        return modified, modification


class StateSpecificRequirementsRule(ProcessRewriteRule):
    """Add state-specific compliance phases"""

    def __init__(self):
        super().__init__(
            rule_id="rule-state-compliance",
            name="State-Specific Requirements",
            description="Add compliance phases for states with special requirements",
            priority=8,
        )

    def evaluate(self, journey, context) -> bool:
        if not context.transaction_data:
            return False
        # States with special requirements
        special_states = ["NY", "TX", "CA", "NV"]
        state = context.transaction_data.get("property_state", "")
        return state in special_states

    def apply(self, journey, context):
        state = context.transaction_data.get("property_state", "")
        compliance_phase = {
            "id": f"phase-{state.lower()}-compliance",
            "name": f"{state} State Compliance",
            "description": f"State-specific requirements for {state}",
            "modules": [f"module-{state.lower()}-disclosure", "module-state-regulations"],
            "targetDurationDays": 1,
            "criticality": "HIGH",
        }

        modified = copy.deepcopy(journey)
        # Insert early in process
        if len(modified.get("phases", [])) > 0:
            modified["phases"].insert(1, compliance_phase["id"])

        modification = PhaseModification(
            action="insert",
            phase_id=compliance_phase["id"],
            reason=f"Property in {state} requires state-specific compliance",
            criticality="HIGH",
        )

        return modified, modification


class NonResidentRule(ProcessRewriteRule):
    """Add verification for non-resident borrowers"""

    def __init__(self):
        super().__init__(
            rule_id="rule-non-resident",
            name="Non-Resident Verification",
            description="Enhanced verification for non-resident borrowers",
            priority=7,
        )

    def evaluate(self, journey, context) -> bool:
        if not context.customer_data:
            return False
        return context.customer_data.get("residency_status") == "NON_RESIDENT"

    def apply(self, journey, context):
        verification_phase = {
            "id": "phase-non-resident-verification",
            "name": "Non-Resident Verification",
            "description": "Additional documentation for non-resident borrowers",
            "modules": ["module-visa-verification", "module-international-credit"],
            "targetDurationDays": 3,
            "criticality": "MEDIUM",
        }

        modified = copy.deepcopy(journey)
        # Insert early
        if len(modified.get("phases", [])) > 0:
            modified["phases"].insert(1, verification_phase["id"])

        modification = PhaseModification(
            action="insert",
            phase_id=verification_phase["id"],
            reason="Non-resident status requires enhanced verification",
            criticality="MEDIUM",
        )

        return modified, modification


# Dynamic Rule Loading
def load_rules_from_storage():
    """Load rules from JSON storage"""
    import json
    from pathlib import Path

    rules_path = Path(__file__).parent.parent.parent / "data" / "rules" / "rules.json"

    if not rules_path.exists():
        return []

    try:
        with open(rules_path, "r", encoding="utf-8") as f:
            storage = json.load(f)
            return storage.get("rules", [])
    except Exception as e:
        print(f"Warning: Failed to load rules from storage: {e}")
        return []


# Process Rewrite Engine
class ProcessRewriteEngine:
    """Engine for evaluating and modifying journeys at runtime"""

    def __init__(self):
        # Load rules dynamically from storage
        self.rule_definitions = self._load_rules()

        # All rules now loaded from storage (data/rules/rules.json)
        # Legacy hardcoded rules have been successfully migrated

    def _load_rules(self):
        """Load and parse rules from storage"""
        rules_data = load_rules_from_storage()

        # Filter to active rules only
        active_rules = [r for r in rules_data if r.get("active", False)]

        # Sort by priority (highest first)
        active_rules.sort(key=lambda r: r.get("priority", 0), reverse=True)

        return active_rules

    def reload_rules(self):
        """Hot-reload rules from storage without restarting server"""
        self.rule_definitions = self._load_rules()

    @property
    def rules(self):
        """Get current active rules (for backward compatibility with legacy API)"""
        return self._legacy_rules

    def _evaluate_condition(self, condition: Dict[str, Any], context: RuntimeContext) -> bool:
        """Evaluate a condition group against runtime context"""
        from routes.rules import ConditionGroup, evaluate_condition

        try:
            # Convert context to dict for evaluation
            context_dict = {
                "customer_data": context.customer_data or {},
                "transaction_data": context.transaction_data or {},
                "risk_flags": context.risk_flags,
                "compliance_requirements": context.compliance_requirements,
            }

            # Parse condition group
            condition_group = ConditionGroup(**condition)

            # Evaluate
            return evaluate_condition(condition_group, context_dict)
        except Exception as e:
            print(f"Warning: Condition evaluation failed: {e}")
            return False

    def _apply_rule_action(
        self, journey: Dict[str, Any], rule: Dict[str, Any], context: RuntimeContext
    ) -> tuple[Dict[str, Any], PhaseModification]:
        """Apply a rule action to a journey"""
        action = rule.get("action", {})
        action_type = action.get("type")
        phase = action.get("phase", {})
        modification_meta = action.get("modification", {})

        modified = copy.deepcopy(journey)
        phase_id = phase.get("id")
        position = phase.get("position", "AT_END")
        reference_phase = phase.get("reference_phase")

        # Build phase object
        _phase_obj = {  # noqa: F841
            "id": phase_id,
            "name": phase.get("name"),
            "description": phase.get("description"),
            "modules": phase.get("modules", []),
            "targetDurationDays": phase.get("target_duration_days", 1),
            "criticality": modification_meta.get("criticality", "MEDIUM"),
        }

        # Apply based on action type
        if action_type == "INSERT_PHASE":
            phases = modified.get("phases", [])

            # Don't insert if phase already exists
            if phase_id in phases:
                return modified, PhaseModification(
                    action="noop", phase_id=phase_id, reason="Phase already exists in journey", criticality="LOW"
                )

            if position == "AT_START":
                phases.insert(0, phase_id)
            elif position == "AT_END":
                phases.append(phase_id)
            elif position == "BEFORE" and reference_phase:
                try:
                    idx = phases.index(reference_phase)
                    phases.insert(idx, phase_id)
                except ValueError:
                    phases.append(phase_id)
            elif position == "AFTER" and reference_phase:
                try:
                    idx = phases.index(reference_phase)
                    phases.insert(idx + 1, phase_id)
                except ValueError:
                    phases.append(phase_id)
            else:
                phases.append(phase_id)

            modified["phases"] = phases

        elif action_type == "REMOVE_PHASE":
            phases = modified.get("phases", [])
            modified["phases"] = [p for p in phases if p != phase_id]

        elif action_type == "REPLACE_PHASE" and reference_phase:
            phases = modified.get("phases", [])
            modified["phases"] = [phase_id if p == reference_phase else p for p in phases]

        # Create modification record
        modification = PhaseModification(
            action=action_type.lower().replace("_", ""),
            phase_id=phase_id,
            reason=modification_meta.get("reason", f"Rule {rule.get('rule_id')} triggered"),
            criticality=modification_meta.get("criticality", "MEDIUM"),
        )

        return modified, modification

    def evaluate_journey(self, journey: Dict[str, Any], context: RuntimeContext) -> JourneyEvaluation:
        """
        Evaluate a journey and apply all applicable rules

        Args:
            journey: Original journey definition
            context: Runtime context (customer data, transaction data, etc.)

        Returns:
            JourneyEvaluation with modified journey and list of modifications
        """
        modified_journey = copy.deepcopy(journey)
        modifications = []

        # Apply dynamic rules from storage (NEW)
        for rule_def in self.rule_definitions:
            try:
                # Evaluate condition
                if self._evaluate_condition(rule_def.get("condition", {}), context):
                    # Apply action
                    modified_journey, modification = self._apply_rule_action(modified_journey, rule_def, context)
                    # Only add if not a noop
                    if modification.action != "noop":
                        modifications.append(modification)
            except Exception as e:
                print(f"Warning: Failed to apply rule {rule_def.get('rule_id')}: {e}")

        # All rules now loaded from storage - no legacy fallback needed

        # Calculate risk score based on modifications
        risk_score = self._calculate_risk_score(modifications)

        # Count changes
        original_phases = len(journey.get("phases", []))
        modified_phases = len(modified_journey.get("phases", []))

        return JourneyEvaluation(
            original_journey_id=journey.get("id", "unknown"),
            modified_journey=modified_journey,
            modifications=modifications,
            total_phases_added=max(0, modified_phases - original_phases),
            total_phases_removed=max(0, original_phases - modified_phases),
            risk_score=risk_score,
        )

    def _calculate_risk_score(self, modifications: List[PhaseModification]) -> float:
        """Calculate overall risk score from 0.0 to 1.0"""
        if not modifications:
            return 0.0

        criticality_weights = {"LOW": 0.1, "MEDIUM": 0.3, "HIGH": 0.6, "CRITICAL": 1.0}

        total_weight = sum(criticality_weights.get(m.criticality, 0.5) for m in modifications)
        return min(1.0, total_weight / len(modifications))


# API Endpoints
engine = ProcessRewriteEngine()


@router.post("/evaluate", response_model=JourneyEvaluation)
async def evaluate_journey(journey: Dict[str, Any], context: RuntimeContext):
    """
    Evaluate a journey with runtime context and return modified version

    Example request:
    {
        "journey": { "id": "journey-loan-origination", "phases": [...] },
        "context": {
            "customer_data": { "credit_score": 580 },
            "transaction_data": { "amount": 1500000 },
            "risk_flags": ["suspicious_activity"],
            "compliance_requirements": ["AML", "KYC"]
        }
    }
    """
    try:
        evaluation = engine.evaluate_journey(journey, context)
        return evaluation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@router.get("/rules")
async def list_rules():
    """List all available runtime rules (dynamic + legacy)"""
    dynamic_rules = [
        {
            "rule_id": rule.get("rule_id"),
            "name": rule.get("name"),
            "description": rule.get("description"),
            "priority": rule.get("priority"),
            "source": "storage",
            "active": rule.get("active", True),
        }
        for rule in engine.rule_definitions
    ]

    legacy_rules = [
        {
            "rule_id": rule.rule_id,
            "name": rule.name,
            "description": rule.description,
            "priority": rule.priority,
            "source": "hardcoded",
            "active": True,
        }
        for rule in engine._legacy_rules
    ]

    return {
        "dynamic_rules": dynamic_rules,
        "legacy_rules": legacy_rules,
        "total_dynamic": len(dynamic_rules),
        "total_legacy": len(legacy_rules),
        "total_count": len(dynamic_rules) + len(legacy_rules),
    }


@router.post("/rules/reload")
async def reload_rules():
    """Hot-reload rules from storage without restarting server"""
    try:
        engine.reload_rules()
        return {
            "status": "success",
            "message": f"Reloaded {len(engine.rule_definitions)} rules from storage",
            "rules_count": len(engine.rule_definitions),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reload rules: {str(e)}")


@router.post("/simulate")
async def simulate_scenarios(journey_id: str, scenarios: List[RuntimeContext]):
    """
    Simulate multiple scenarios for a journey

    Returns comparison of how the journey would be modified under different contexts
    """
    # For now, return mock journey - in production would fetch from DB
    base_journey = {
        "id": journey_id,
        "name": "Loan Origination Journey",
        "phases": ["phase-application", "phase-assessment", "phase-approval"],
    }

    results = []
    for scenario in scenarios:
        evaluation = engine.evaluate_journey(base_journey, scenario)
        results.append({"context": scenario.dict(), "evaluation": evaluation.dict()})

    return {"journey_id": journey_id, "scenarios_evaluated": len(scenarios), "results": results}
