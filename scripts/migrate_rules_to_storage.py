"""
Migration script to convert hardcoded rules from runtime.py to JSON storage.

This script converts the 13 hardcoded ProcessRewriteRule classes into
the new RuleDefinition format and saves them to data/rules/rules.json.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

# Add api directory to path so we can import the rules module
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))

from routes.rules import (
    ConditionGroup,
    ConditionRule,
    PhaseAction,
    RuleAction,
    RuleDefinition,
    RuleModification,
)


def create_rule_definition(
    rule_id: str,
    name: str,
    description: str,
    priority: int,
    condition: ConditionGroup,
    action: RuleAction,
    created_by: str = "system-migration",
) -> RuleDefinition:
    """Helper to create a RuleDefinition with consistent timestamps."""
    now = datetime.utcnow().isoformat()
    return RuleDefinition(
        rule_id=rule_id,
        name=name,
        description=description,
        priority=priority,
        active=True,
        created_at=now,
        updated_at=now,
        created_by=created_by,
        version=1,
        condition=condition,
        action=action,
    )


def migrate_rules():
    """Convert all hardcoded rules to RuleDefinition format."""

    rules = []

    # Rule 1: Low Credit Score
    rules.append(
        create_rule_definition(
            rule_id="rule-low-credit",
            name="Low Credit Score Manual Review",
            description="Requires manual review for credit scores below 620",
            priority=9,
            condition=ConditionGroup(
                type="AND", rules=[ConditionRule(field="customer_data.credit_score", operator="LESS_THAN", value=620)]
            ),
            action=RuleAction(
                type="INSERT_PHASE",
                phase=PhaseAction(
                    id="phase-manual-credit-review",
                    name="Manual Credit Review",
                    description="Enhanced review required due to credit risk",
                    position="AFTER",
                    reference_phase="phase-assessment",
                    modules=["module-credit-analysis", "module-risk-assessment"],
                    target_duration_days=2,
                ),
                modification=RuleModification(reason="Credit score below threshold (620)", criticality="HIGH"),
            ),
        )
    )

    # Rule 2: High Value Transaction
    rules.append(
        create_rule_definition(
            rule_id="rule-high-value",
            name="Senior Approval for High Value",
            description="Requires senior management approval for transactions over $1M",
            priority=10,
            condition=ConditionGroup(
                type="AND",
                rules=[ConditionRule(field="transaction_data.amount", operator="GREATER_THAN", value=1000000)],
            ),
            action=RuleAction(
                type="INSERT_PHASE",
                phase=PhaseAction(
                    id="phase-senior-approval",
                    name="Senior Management Approval",
                    description="Required for transactions exceeding $1M",
                    position="BEFORE",
                    reference_phase="phase-final-approval",
                    modules=["module-exec-review", "module-risk-committee"],
                    target_duration_days=3,
                ),
                modification=RuleModification(
                    reason="Transaction amount exceeds $1M threshold", criticality="CRITICAL"
                ),
            ),
        )
    )

    # Rule 3: Compliance Check (AML/KYC)
    rules.append(
        create_rule_definition(
            rule_id="rule-compliance",
            name="Regulatory Compliance Checks",
            description="Adds compliance verification for regulated transactions",
            priority=8,
            condition=ConditionGroup(
                type="OR",
                rules=[
                    ConditionRule(field="compliance_requirements", operator="CONTAINS", value="AML"),
                    ConditionRule(field="compliance_requirements", operator="CONTAINS", value="KYC"),
                ],
            ),
            action=RuleAction(
                type="INSERT_PHASE",
                phase=PhaseAction(
                    id="phase-compliance-verification",
                    name="Compliance Verification",
                    description="Required AML/KYC checks",
                    position="AT_START",
                    reference_phase=None,
                    modules=["module-aml-check", "module-kyc-verification"],
                    target_duration_days=1,
                ),
                modification=RuleModification(reason="Compliance requirements detected (AML/KYC)", criticality="HIGH"),
            ),
        )
    )

    # Rule 4: Fraud Risk
    rules.append(
        create_rule_definition(
            rule_id="rule-fraud",
            name="Fraud Detection Enhancement",
            description="Adds fraud screening when risk flags are present",
            priority=9,
            condition=ConditionGroup(
                type="OR",
                rules=[
                    ConditionRule(field="risk_flags", operator="CONTAINS", value="suspicious_activity"),
                    ConditionRule(field="risk_flags", operator="CONTAINS", value="identity_mismatch"),
                    ConditionRule(field="risk_flags", operator="CONTAINS", value="velocity_check_failed"),
                ],
            ),
            action=RuleAction(
                type="INSERT_PHASE",
                phase=PhaseAction(
                    id="phase-fraud-investigation",
                    name="Fraud Investigation",
                    description="Triggered by risk flags",
                    position="AT_START",
                    reference_phase=None,
                    modules=["module-fraud-screening", "module-identity-verification"],
                    target_duration_days=2,
                ),
                modification=RuleModification(
                    reason="Risk flags detected requiring fraud investigation", criticality="CRITICAL"
                ),
            ),
        )
    )

    # Rule 5: First Time Borrower
    rules.append(
        create_rule_definition(
            rule_id="rule-first-time",
            name="First-Time Borrower Support",
            description="Adds education and documentation support for first-time borrowers",
            priority=6,
            condition=ConditionGroup(
                type="AND",
                rules=[ConditionRule(field="customer_data.first_time_borrower", operator="EQUALS", value=True)],
            ),
            action=RuleAction(
                type="INSERT_PHASE",
                phase=PhaseAction(
                    id="phase-borrower-education",
                    name="Borrower Education & Documentation",
                    description="Additional support for first-time borrowers",
                    position="AFTER",
                    reference_phase="phase-application",
                    modules=["module-education", "module-doc-assistance"],
                    target_duration_days=1,
                ),
                modification=RuleModification(
                    reason="First-time borrower requires additional education and support", criticality="MEDIUM"
                ),
            ),
        )
    )

    # Rule 6: High DTI
    rules.append(
        create_rule_definition(
            rule_id="rule-high-dti",
            name="High DTI Ratio Review",
            description="Requires debt counseling review for DTI > 43%",
            priority=8,
            condition=ConditionGroup(
                type="AND",
                rules=[ConditionRule(field="customer_data.debt_to_income_ratio", operator="GREATER_THAN", value=0.43)],
            ),
            action=RuleAction(
                type="INSERT_PHASE",
                phase=PhaseAction(
                    id="phase-dti-review",
                    name="DTI Review & Counseling",
                    description="High DTI ratio requires review",
                    position="AFTER",
                    reference_phase="phase-assessment",
                    modules=["module-debt-analysis", "module-underwriting-exception"],
                    target_duration_days=2,
                ),
                modification=RuleModification(reason="DTI ratio exceeds 43% threshold", criticality="HIGH"),
            ),
        )
    )

    # Rule 7: Self-Employed
    rules.append(
        create_rule_definition(
            rule_id="rule-self-employed",
            name="Self-Employed Income Verification",
            description="Enhanced verification for self-employed income",
            priority=7,
            condition=ConditionGroup(
                type="AND",
                rules=[ConditionRule(field="customer_data.employment_type", operator="EQUALS", value="SELF_EMPLOYED")],
            ),
            action=RuleAction(
                type="INSERT_PHASE",
                phase=PhaseAction(
                    id="phase-self-employed-verification",
                    name="Self-Employed Income Verification",
                    description="Additional documentation and verification for self-employed income",
                    position="AFTER",
                    reference_phase="phase-income-verification",
                    modules=["module-tax-return-analysis", "module-business-verification"],
                    target_duration_days=3,
                ),
                modification=RuleModification(
                    reason="Self-employed income requires enhanced verification", criticality="MEDIUM"
                ),
            ),
        )
    )

    # Rule 8: Property Type Risk
    rules.append(
        create_rule_definition(
            rule_id="rule-property-risk",
            name="Non-Standard Property Review",
            description="Enhanced appraisal for condos, multi-family, or rural properties",
            priority=7,
            condition=ConditionGroup(
                type="AND",
                rules=[
                    ConditionRule(
                        field="transaction_data.property_type",
                        operator="IN",
                        value=["CONDO", "MULTI_FAMILY", "RURAL", "MANUFACTURED"],
                    )
                ],
            ),
            action=RuleAction(
                type="INSERT_PHASE",
                phase=PhaseAction(
                    id="phase-enhanced-appraisal",
                    name="Enhanced Property Appraisal",
                    description="Additional review for non-standard property types",
                    position="BEFORE",
                    reference_phase="phase-final-approval",
                    modules=["module-appraisal-review", "module-comparable-analysis"],
                    target_duration_days=2,
                ),
                modification=RuleModification(
                    reason="Non-standard property type requires enhanced appraisal", criticality="MEDIUM"
                ),
            ),
        )
    )

    # Rule 9: Cash-Out Refinance
    rules.append(
        create_rule_definition(
            rule_id="rule-cash-out",
            name="Cash-Out Refinance Review",
            description="Additional review for cash-out refinance transactions",
            priority=7,
            condition=ConditionGroup(
                type="AND",
                rules=[
                    ConditionRule(field="transaction_data.loan_purpose", operator="EQUALS", value="REFINANCE"),
                    ConditionRule(field="transaction_data.cash_out_amount", operator="GREATER_THAN", value=0),
                ],
            ),
            action=RuleAction(
                type="INSERT_PHASE",
                phase=PhaseAction(
                    id="phase-equity-review",
                    name="Equity & Cash-Out Review",
                    description="Review cash-out amount and equity position",
                    position="AFTER",
                    reference_phase="phase-assessment",
                    modules=["module-equity-analysis", "module-ltv-verification"],
                    target_duration_days=1,
                ),
                modification=RuleModification(reason="Cash-out refinance requires equity review", criticality="MEDIUM"),
            ),
        )
    )

    # Rule 10: Expired Documents
    rules.append(
        create_rule_definition(
            rule_id="rule-doc-expiration",
            name="Document Expiration Check",
            description="Re-verification when documents are close to expiration",
            priority=8,
            condition=ConditionGroup(
                type="AND", rules=[ConditionRule(field="risk_flags", operator="CONTAINS", value="documents_expiring")]
            ),
            action=RuleAction(
                type="INSERT_PHASE",
                phase=PhaseAction(
                    id="phase-document-reverification",
                    name="Document Re-Verification",
                    description="Update expiring documents before closing",
                    position="BEFORE",
                    reference_phase="phase-final-approval",
                    modules=["module-doc-update", "module-reverification"],
                    target_duration_days=1,
                ),
                modification=RuleModification(
                    reason="Documents nearing expiration require re-verification", criticality="HIGH"
                ),
            ),
        )
    )

    # Rule 11: Low Appraisal
    rules.append(
        create_rule_definition(
            rule_id="rule-low-appraisal",
            name="Low Appraisal Handling",
            description="Add renegotiation when appraisal < purchase price",
            priority=9,
            condition=ConditionGroup(
                type="AND",
                rules=[ConditionRule(field="risk_flags", operator="CONTAINS", value="appraisal_below_value")],
            ),
            action=RuleAction(
                type="INSERT_PHASE",
                phase=PhaseAction(
                    id="phase-value-renegotiation",
                    name="Price Renegotiation",
                    description="Appraisal below purchase price requires renegotiation",
                    position="BEFORE",
                    reference_phase="phase-approval",
                    modules=["module-price-negotiation", "module-contract-amendment"],
                    target_duration_days=3,
                ),
                modification=RuleModification(
                    reason="Appraisal value below purchase price requires renegotiation", criticality="HIGH"
                ),
            ),
        )
    )

    # Rule 12: State-Specific Requirements
    rules.append(
        create_rule_definition(
            rule_id="rule-state-compliance",
            name="State-Specific Requirements",
            description="Add compliance phases for states with special requirements",
            priority=8,
            condition=ConditionGroup(
                type="AND",
                rules=[
                    ConditionRule(
                        field="transaction_data.property_state", operator="IN", value=["NY", "TX", "CA", "NV"]
                    )
                ],
            ),
            action=RuleAction(
                type="INSERT_PHASE",
                phase=PhaseAction(
                    id="phase-state-compliance",
                    name="State-Specific Compliance",
                    description="State-specific requirements",
                    position="AFTER",
                    reference_phase="phase-application",
                    modules=["module-state-disclosure", "module-state-regulations"],
                    target_duration_days=1,
                ),
                modification=RuleModification(
                    reason="Property in state with special compliance requirements", criticality="HIGH"
                ),
            ),
        )
    )

    # Rule 13: Non-Resident
    rules.append(
        create_rule_definition(
            rule_id="rule-non-resident",
            name="Non-Resident Verification",
            description="Enhanced verification for non-resident borrowers",
            priority=7,
            condition=ConditionGroup(
                type="AND",
                rules=[ConditionRule(field="customer_data.residency_status", operator="EQUALS", value="NON_RESIDENT")],
            ),
            action=RuleAction(
                type="INSERT_PHASE",
                phase=PhaseAction(
                    id="phase-non-resident-verification",
                    name="Non-Resident Verification",
                    description="Additional documentation for non-resident borrowers",
                    position="AFTER",
                    reference_phase="phase-application",
                    modules=["module-visa-verification", "module-international-credit"],
                    target_duration_days=3,
                ),
                modification=RuleModification(
                    reason="Non-resident status requires enhanced verification", criticality="MEDIUM"
                ),
            ),
        )
    )

    return rules


def save_to_storage(rules: list):
    """Save rules to JSON storage and create YAML backups."""
    from routes.rules import save_rule_yaml_backup, save_rules_to_storage

    # Create storage structure
    storage = {
        "version": "1.0",
        "last_updated": datetime.utcnow().isoformat(),
        "rules": [rule.model_dump() for rule in rules],
    }

    # Save JSON
    save_rules_to_storage(storage)
    print(f"[OK] Saved {len(rules)} rules to data/rules/rules.json")

    # Save YAML backups
    for rule in rules:
        save_rule_yaml_backup(rule)
    print(f"[OK] Created {len(rules)} YAML backup files")


def main():
    """Run the migration."""
    print("=" * 60)
    print("Rule Migration Script")
    print("Converting hardcoded rules to JSON storage")
    print("=" * 60)
    print()

    # Convert rules
    print("Converting 13 hardcoded rules...")
    rules = migrate_rules()

    # Display summary
    print(f"\n[OK] Converted {len(rules)} rules:")
    for rule in sorted(rules, key=lambda r: -r.priority):
        print(f"  [{rule.priority}] {rule.name} ({rule.rule_id})")

    # Save to storage
    print("\nSaving to storage...")
    save_to_storage(rules)

    print("\n" + "=" * 60)
    print("Migration Complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Review data/rules/rules.json")
    print("2. Verify YAML backups in data/rules/")
    print("3. Test rules API: GET http://localhost:8001/api/rules")
    print("4. Refactor ProcessRewriteEngine to load from storage")
    print()


if __name__ == "__main__":
    main()
