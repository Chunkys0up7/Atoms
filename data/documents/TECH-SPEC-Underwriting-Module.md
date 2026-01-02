# Technical Specification: Underwriting Decision Module
**Status:** DRAFT  
**Version:** 1.5.0  
**Date:** 2025-12-26  
**Owner:** Lisa Anderson (Post-Closing)  
**Steward:** Jennifer Park (Underwriting)

## Document Purpose
Technical specification for the underwriting decision module, detailing system architecture, data flows, decision rules, and integration points for conventional home purchase loans.

## Module Composition

### module-underwriting-decision
**Description:** Core underwriting review and loan decision engine  
**Phase:** Underwriting  
**Duration Target:** 4 days  
**Team:** Underwriting Department (3-5 underwriters)

#### Primary Atoms

| Atom ID | Name | Type | Criticality | Automation |
|---------|------|------|-------------|-----------|
| atom-sys-aus-submission | System Submits to AUS | SYSTEM | CRITICAL | 98% |
| atom-sys-aus-findings-review | Processor Reviews AUS Findings | PROCESS | HIGH | 20% |
| atom-bo-manual-underwrite | Underwriter Performs Manual UW | PROCESS | CRITICAL | 5% |
| atom-dec-loan-decision | Decision: Approve/Suspend/Deny | DECISION | CRITICAL | 0% |
| atom-bo-manual-review-trigger | System Triggers Manual Review | SYSTEM | HIGH | 85% |

### module-conditions-management
**Description:** Condition tracking, fulfillment, and clearance  
**Phase:** Underwriting → Closing  
**Duration Target:** 6 days  
**Team:** Shared (Underwriters + Processors)

#### Primary Atoms

| Atom ID | Name | Type | Criticality | Automation |
|---------|------|------|-------------|-----------|
| atom-sys-condition-generation | System Generates Conditions | SYSTEM | CRITICAL | 92% |
| atom-bo-condition-tracking | Processor Tracks Fulfillment | PROCESS | HIGH | 30% |
| atom-bo-condition-clearance | Underwriter Clears Conditions | PROCESS | HIGH | 10% |
| atom-bo-condition-verification | Processor Verifies Clearance | PROCESS | HIGH | 40% |

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ LOAN APPLICATION (from Processing Phase)                        │
│ - Verified income & assets                                      │
│ - Credit report & score                                         │
│ - Appraisal & title report                                      │
│ - Property documentation                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
            ┌─────────────────────────┐
            │  AUS Submission         │
            │ (atom-sys-aus-         │
            │  submission)           │
            │                        │
            │ Fannie Mae DU          │
            │ Freddie Mac LP         │
            │ Portfolio UW           │
            └────────────┬───────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
    ┌─────────────┐          ┌──────────────────┐
    │ Findings    │          │ Manual Review    │
    │ (Advisor)   │          │ (Tri-merge       │
    │             │          │  required)       │
    │ Review      │          │                  │
    │ (atom-sys-  │          │ Trigger          │
    │  aus-       │          │ (atom-bo-manual- │
    │  findings-  │          │  review-trigger) │
    │  review)    │          │                  │
    └──────┬──────┘          └────────┬─────────┘
           │                          │
           └──────────────┬───────────┘
                          │
                          ▼
            ┌─────────────────────────┐
            │ Underwriter Decision    │
            │ (atom-bo-manual-       │
            │  underwrite +          │
            │  atom-dec-loan-        │
            │  decision)             │
            │                        │
            │ • Approve              │
            │ • Approve with Conds   │
            │ • Suspend              │
            │ • Deny                 │
            └────────────┬───────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
    ┌───────────────┐        ┌────────────────┐
    │ Conditions    │        │ Denial / Susp. │
    │ Generated     │        │ (Complete      │
    │ (atom-sys-    │        │  adverse       │
    │  condition-   │        │  action)       │
    │  generation)  │        │                │
    │               │        └────────────────┘
    │ Tracked       │
    │ (atom-bo-     │
    │  condition-   │
    │  tracking)    │
    └───────┬───────┘
            │
            ▼ (when all conditions met)
    ┌────────────────┐
    │ Clear to Close │
    │ (atom-bo-      │
    │  condition-    │
    │  clearance)    │
    └────────────────┘
```

## Decision Rules Engine

### Automatic Approval Rules
**Triggers** (when ALL conditions met):
- AUS recommendation: Approve/Accept
- No fraud indicators
- No compensating factor needs identified
- Property appraisal = purchase price
- Credit score ≥ 740
- DTI ≤ 43%
- No derogatory credit items
- Assets verified

**Output:** Auto-approve → proceed to condition generation

### Manual Underwriting Triggers
**Conditions requiring underwriter review** (atom-bo-manual-review-trigger):
- AUS finding: Manual Review Required
- Tri-merge discrepancy detected
- Credit score < 640
- DTI > 50%
- Commission/bonus income (requires 24-month average)
- Self-employment (requires 2-year tax returns)
- Gift funds (requires gift letter + source verification)
- Cash-out refinance (LTV considerations)
- Non-traditional credit
- Recent credit inquiries (>2 in 90 days)

### Condition Generation
**System triggers condition creation** (atom-sys-condition-generation) for:

| Category | Example Conditions | Criticality |
|----------|-------------------|-------------|
| Prior-to-Docs (PTD) | Clear title issues, Updated insurance quote | HIGH |
| Prior-to-Funding (PTF) | Final inspection, Clear all conditions | CRITICAL |
| Prior-to-Close | Loan estimate review, Disclosure timing | HIGH |

## Integration Points

### Upstream Dependencies
- **module-income-verification**: Must complete before UW review
  - Wait for: atom-sys-income-calculation completion
  - Data required: Qualifying income, DTI calculation

- **module-credit-analysis**: Must complete before UW review
  - Wait for: atom-bo-credit-analysis completion
  - Data required: Credit score, derogatory items, inquiries

- **module-property-appraisal**: Must complete before final approval
  - Wait for: atom-sys-appraisal-received completion
  - Data required: Final appraised value, condition notes

### Downstream Dependencies
- **module-closing-preparation**: Triggered after approval
  - Receives: Approved loan decision, clear conditions
  - Awaits: Condition fulfillment (atom-bo-condition-clearance)

- **module-funding-recording**: Triggered after clear-to-close
  - Receives: Final clear-to-close status
  - Uses: Condition verification (atom-bo-condition-verification)

## Exception Handling

### Loan Denial
**Trigger:** Underwriter selects "Deny"  
**Actions:**
1. System generates adverse action letter (atom-bo-adverse-action-letter)
2. Reason code documented for TRID/ECOA compliance
3. Appeal period notification sent to borrower
4. File archived with documentation

**SLA:** Adverse action notice within 3 business days

### Loan Suspension
**Trigger:** Missing documentation or information needed  
**Actions:**
1. System generates condition request (atom-sys-condition-generation)
2. Notification sent to processor/customer
3. File placed on hold pending response
4. Tracking system monitors aging

**SLA:** Decision within 5 business days of document receipt

### Exception Approval Process
**When:** Compensating factors exist  
**Process:**
1. Underwriter documents exception request (atom-bo-underwriting-exception-request)
2. Escalates to underwriting manager
3. Manager reviews & approves/denies (atom-bo-exception-approval)
4. Decision documented in loan file

**Authority:** Underwriting Manager (>$500k), Sr. UW Manager (<$500k)

## Performance Metrics

### Module-Level KPIs
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Average cycle time | 4 days | 3.8 days | ✓ |
| First-pass approval rate | >65% | 62.1% | ⚠ |
| Condition fulfillment rate | >95% | 94.2% | ⚠ |
| Clear-to-close accuracy | >98% | 97.8% | ⚠ |
| Appeal rate | <5% | 6.2% | ✗ |

### Atom-Level Performance
**atom-sys-aus-submission**
- Submission success rate: 99.7%
- Average submission time: 2.1 minutes
- Integration reliability: 99.9%

**atom-bo-manual-underwrite**
- Average review time: 45 minutes
- Exception identification rate: 94%
- Rework rate: 8.3%

**atom-sys-condition-generation**
- Condition accuracy: 96.8%
- Average conditions per loan: 2.3
- Condition relevancy: 95.2%

## Compliance & Risk Controls

### Regulatory Compliance
- **TRID:** Loan estimate issued before underwriting starts
- **ECOA:** Adverse action reasons documented
- **Fair Lending:** Pricing and approval decisions audited quarterly
- **QM/Ability to Repay:** DTI calculations verified before approval

### QC Review Points
1. **Pre-UW QC:** Application completeness check (atom-bo-completeness-review)
2. **Post-UW QC:** Decision documentation (atom-bo-document-audit)
3. **Pre-Close QC:** Condition fulfillment verification (atom-bo-condition-verification)
4. **Compliance Audit:** Fair lending & TRID review (atom-bo-compliance-audit)

## Configuration & Customization

### Investor Guidelines
- **Fannie Mae:** DTI limit 50%, Min credit 640, Max LTV 97%
- **Freddie Mac:** DTI limit 50%, Min credit 620, Max LTV 97%
- **Portfolio:** DTI limit 45%, Min credit 700, Max LTV 80%

### Decision Rules (Customizable)
```yaml
approval_rules:
  credit_score_minimum: 640
  dti_maximum: 50
  loanamount_maximum: 1000000
  compensating_factors_required: true

manual_review_triggers:
  - credit_score_below: 640
  - dti_above: 50
  - appraisal_variance_above: 0.05  # 5% variance
  - recent_inquiries_above: 2
  - gift_funds_present: true
```

---

**Review Status:** Pending underwriting team approval  
**Next Review Date:** 2026-03-26  
**Last Updated By:** Lisa Anderson
