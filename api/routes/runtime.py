"""
Dynamic Process Rewriting Engine
Adapts workflows at runtime based on risk, compliance, and context
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import copy

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
            priority=9
        )

    def evaluate(self, journey: Dict[str, Any], context: RuntimeContext) -> bool:
        if not context.customer_data:
            return False
        credit_score = context.customer_data.get('credit_score', 850)
        return credit_score < 620

    def apply(self, journey: Dict[str, Any], context: RuntimeContext) -> tuple[Dict[str, Any], PhaseModification]:
        # Insert manual review phase after initial assessment
        review_phase = {
            "id": "phase-manual-credit-review",
            "name": "Manual Credit Review",
            "description": "Enhanced review required due to credit risk",
            "modules": ["module-credit-analysis", "module-risk-assessment"],
            "targetDurationDays": 2,
            "criticality": "HIGH"
        }

        modified = copy.deepcopy(journey)
        # Insert after phase 1 (typically initial assessment)
        if len(modified.get('phases', [])) > 1:
            modified['phases'].insert(1, review_phase['id'])

        modification = PhaseModification(
            action="insert",
            phase_id=review_phase['id'],
            reason=f"Credit score {context.customer_data.get('credit_score')} below threshold (620)",
            criticality="HIGH"
        )

        return modified, modification


class HighValueTransactionRule(ProcessRewriteRule):
    """Add senior approval for high-value transactions"""

    def __init__(self):
        super().__init__(
            rule_id="rule-high-value",
            name="Senior Approval for High Value",
            description="Requires senior management approval for transactions over $1M",
            priority=10
        )

    def evaluate(self, journey: Dict[str, Any], context: RuntimeContext) -> bool:
        if not context.transaction_data:
            return False
        amount = context.transaction_data.get('amount', 0)
        return amount > 1_000_000

    def apply(self, journey: Dict[str, Any], context: RuntimeContext) -> tuple[Dict[str, Any], PhaseModification]:
        approval_phase = {
            "id": "phase-senior-approval",
            "name": "Senior Management Approval",
            "description": "Required for transactions exceeding $1M",
            "modules": ["module-exec-review", "module-risk-committee"],
            "targetDurationDays": 3,
            "criticality": "CRITICAL"
        }

        modified = copy.deepcopy(journey)
        # Insert before final approval
        if len(modified.get('phases', [])) > 2:
            modified['phases'].insert(-1, approval_phase['id'])

        modification = PhaseModification(
            action="insert",
            phase_id=approval_phase['id'],
            reason=f"Transaction amount ${context.transaction_data.get('amount'):,.2f} exceeds $1M threshold",
            criticality="CRITICAL"
        )

        return modified, modification


class ComplianceCheckRule(ProcessRewriteRule):
    """Add compliance checks based on requirements"""

    def __init__(self):
        super().__init__(
            rule_id="rule-compliance",
            name="Regulatory Compliance Checks",
            description="Adds compliance verification for regulated transactions",
            priority=8
        )

    def evaluate(self, journey: Dict[str, Any], context: RuntimeContext) -> bool:
        # Check if AML or KYC compliance required
        return 'AML' in context.compliance_requirements or 'KYC' in context.compliance_requirements

    def apply(self, journey: Dict[str, Any], context: RuntimeContext) -> tuple[Dict[str, Any], PhaseModification]:
        compliance_phase = {
            "id": "phase-compliance-verification",
            "name": "Compliance Verification",
            "description": f"Required checks: {', '.join(context.compliance_requirements)}",
            "modules": ["module-aml-check", "module-kyc-verification"],
            "targetDurationDays": 1,
            "criticality": "HIGH"
        }

        modified = copy.deepcopy(journey)
        # Insert at beginning for compliance
        modified['phases'].insert(0, compliance_phase['id'])

        modification = PhaseModification(
            action="insert",
            phase_id=compliance_phase['id'],
            reason=f"Compliance requirements: {', '.join(context.compliance_requirements)}",
            criticality="HIGH"
        )

        return modified, modification


class FraudRiskRule(ProcessRewriteRule):
    """Add fraud detection for risk flags"""

    def __init__(self):
        super().__init__(
            rule_id="rule-fraud",
            name="Fraud Detection Enhancement",
            description="Adds fraud screening when risk flags are present",
            priority=9
        )

    def evaluate(self, journey: Dict[str, Any], context: RuntimeContext) -> bool:
        fraud_flags = ['suspicious_activity', 'identity_mismatch', 'velocity_check_failed']
        return any(flag in context.risk_flags for flag in fraud_flags)

    def apply(self, journey: Dict[str, Any], context: RuntimeContext) -> tuple[Dict[str, Any], PhaseModification]:
        fraud_phase = {
            "id": "phase-fraud-investigation",
            "name": "Fraud Investigation",
            "description": f"Triggered by: {', '.join([f for f in context.risk_flags if f in ['suspicious_activity', 'identity_mismatch', 'velocity_check_failed']])}",
            "modules": ["module-fraud-screening", "module-identity-verification"],
            "targetDurationDays": 2,
            "criticality": "CRITICAL"
        }

        modified = copy.deepcopy(journey)
        # Insert early in process
        modified['phases'].insert(0, fraud_phase['id'])

        modification = PhaseModification(
            action="insert",
            phase_id=fraud_phase['id'],
            reason=f"Risk flags detected: {', '.join(context.risk_flags)}",
            criticality="CRITICAL"
        )

        return modified, modification


# Process Rewrite Engine
class ProcessRewriteEngine:
    """Engine for evaluating and modifying journeys at runtime"""

    def __init__(self):
        # Register all rules
        self.rules: List[ProcessRewriteRule] = [
            LowCreditScoreRule(),
            HighValueTransactionRule(),
            ComplianceCheckRule(),
            FraudRiskRule(),
        ]
        # Sort by priority (highest first)
        self.rules.sort(key=lambda r: r.priority, reverse=True)

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

        # Apply each applicable rule
        for rule in self.rules:
            if rule.evaluate(modified_journey, context):
                modified_journey, modification = rule.apply(modified_journey, context)
                modifications.append(modification)

        # Calculate risk score based on modifications
        risk_score = self._calculate_risk_score(modifications)

        # Count changes
        original_phases = len(journey.get('phases', []))
        modified_phases = len(modified_journey.get('phases', []))

        return JourneyEvaluation(
            original_journey_id=journey.get('id', 'unknown'),
            modified_journey=modified_journey,
            modifications=modifications,
            total_phases_added=max(0, modified_phases - original_phases),
            total_phases_removed=max(0, original_phases - modified_phases),
            risk_score=risk_score
        )

    def _calculate_risk_score(self, modifications: List[PhaseModification]) -> float:
        """Calculate overall risk score from 0.0 to 1.0"""
        if not modifications:
            return 0.0

        criticality_weights = {
            'LOW': 0.1,
            'MEDIUM': 0.3,
            'HIGH': 0.6,
            'CRITICAL': 1.0
        }

        total_weight = sum(criticality_weights.get(m.criticality, 0.5) for m in modifications)
        return min(1.0, total_weight / len(modifications))


# API Endpoints
engine = ProcessRewriteEngine()


@router.post("/evaluate", response_model=JourneyEvaluation)
async def evaluate_journey(
    journey: Dict[str, Any],
    context: RuntimeContext
):
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
    """List all available runtime rules"""
    return {
        "rules": [
            {
                "rule_id": rule.rule_id,
                "name": rule.name,
                "description": rule.description,
                "priority": rule.priority
            }
            for rule in engine.rules
        ],
        "total_count": len(engine.rules)
    }


@router.post("/simulate")
async def simulate_scenarios(
    journey_id: str,
    scenarios: List[RuntimeContext]
):
    """
    Simulate multiple scenarios for a journey

    Returns comparison of how the journey would be modified under different contexts
    """
    # For now, return mock journey - in production would fetch from DB
    base_journey = {
        "id": journey_id,
        "name": "Loan Origination Journey",
        "phases": ["phase-application", "phase-assessment", "phase-approval"]
    }

    results = []
    for scenario in scenarios:
        evaluation = engine.evaluate_journey(base_journey, scenario)
        results.append({
            "context": scenario.dict(),
            "evaluation": evaluation.dict()
        })

    return {
        "journey_id": journey_id,
        "scenarios_evaluated": len(scenarios),
        "results": results
    }
