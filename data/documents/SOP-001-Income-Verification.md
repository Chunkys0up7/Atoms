# SOP-001: Income Verification Workflow
**Status:** APPROVED  
**Version:** 2.1.0  
**Last Updated:** 2025-12-26  
**Owner:** James Martinez (Loan Operations)  
**Steward:** Sarah Chen (Borrower Experience)

## Overview
This Standard Operating Procedure documents the complete income verification workflow for conventional home purchase loans. The process spans from initial document collection through final income calculation and validation.

## Workflow Scope
**Applies To:** All conventional home purchase loans  
**Phase:** Processing  
**Module:** module-income-verification  
**Target Duration:** 5 business days  

## Atoms Involved

### Customer-Facing (atom-cust-*)
- **atom-cust-w2-upload** — Customer uploads W-2 forms via borrower portal
  - Criticality: HIGH
  - Automation: 10%
  - Cycle Time: 72 hours (avg)

- **atom-cust-tax-return-upload** — Customer uploads recent tax returns
  - Criticality: HIGH
  - Automation: 10%
  - Cycle Time: 48 hours (avg)

- **atom-cust-bank-statement-upload** — Customer uploads bank statements for asset verification
  - Criticality: MEDIUM
  - Automation: 5%
  - Cycle Time: 24 hours (avg)

### Back-Office Processing (atom-bo-*)
- **atom-bo-w2-review** — Processor verifies W-2 data for consistency and completeness
  - Criticality: HIGH
  - Automation: 9%
  - Cycle Time: 94 minutes (avg)
  - Exception: Blurry documents → request new upload

- **atom-bo-tax-return-analysis** — Processor analyzes tax returns for income patterns
  - Criticality: HIGH
  - Automation: 15%
  - Cycle Time: 120 minutes (avg)
  - Exception: Inconsistent returns → escalate to underwriter

- **atom-bo-voi-verification** — Processor requests Verification of Income from employer
  - Criticality: MEDIUM
  - Automation: 20%
  - Cycle Time: 2-3 business days

### System Processing (atom-sys-*)
- **atom-sys-income-calculation** — Automated income calculation engine
  - Criticality: CRITICAL
  - Automation: 96%
  - Cycle Time: 49 seconds (avg)
  - Applies: Income stability rules, averaging, elimination factors

- **atom-sys-credit-report-pull** — System pulls credit report for employment verification
  - Criticality: CRITICAL
  - Automation: 100%
  - Cycle Time: 30 seconds (avg)

## Process Flow

### Step 1: Document Collection (Days 1-2)
1. **Customer uploads documents** (atom-cust-w2-upload, atom-cust-tax-return-upload)
2. **System validates** (atom-sys-application-validation)
3. **Document management system** images and organizes files (atom-sys-document-imaging)

### Step 2: Processor Review (Days 2-3)
1. **Processor reviews W-2s** (atom-bo-w2-review)
   - Verify tax years match application
   - Check for multiple employers
   - Flag inconsistencies with application
   
2. **Processor analyzes tax returns** (atom-bo-tax-return-analysis)
   - Review income trends
   - Identify deductions
   - Flag unusual items (losses, write-offs)

3. **Processor requests VOI** (atom-bo-voi-verification) if needed
   - Contact employer directly
   - Verify current employment status
   - Confirm base salary

### Step 3: Automated Calculation (Day 3)
1. **System calculates income** (atom-sys-income-calculation)
   - Extract verified income amounts
   - Apply stability factors (24-month average for bonus/commission)
   - Calculate qualifying income per investor guidelines

2. **System calculates DTI** (atom-sys-dti-engine)
   - Uses verified income
   - Applies to all debt obligations
   - Generates income worksheet

### Step 4: Validation & Exception Handling (Day 4)
1. **System identifies exceptions** if:
   - Declining income trend
   - Missing documentation
   - Inconsistent employer information

2. **Underwriter reviews exceptions** if raised
   - Decides on compensating factors
   - Requests additional documentation if needed

## Success Criteria
- ✓ All income sources documented and verified
- ✓ Qualifying income calculated per investor guidelines
- ✓ DTI ratio within acceptable limits
- ✓ No unresolved exceptions remaining
- ✓ Documentation packaged for underwriting review

## Escalation Procedures
**Condition:** Income discrepancy > 10% of stated amount  
**Action:** Escalate to underwriter for review + possible rework  
**Timeline:** Same business day

**Condition:** Missing 2 years of tax returns  
**Action:** Request amended returns or alternative income documentation  
**Timeline:** Within 24 hours

## Compliance Notes
- Verify income per FNMA guidelines (Form 1003, 1040, W-2s)
- Document all income used in qualification
- Maintain audit trail of calculations
- TRID disclosure requires income verification before CD issuance

## Metrics & KPIs
- **First-pass accuracy:** 94.2% (target: >95%)
- **Average cycle time:** 4.1 days (target: ≤5 days)
- **Exception rate:** 12.3% (target: <10%)
- **Processor productivity:** 6.8 applications/day (target: >8)

---
**Approval:** Sarah Chen, Jennifer Park  
**Last Reviewed:** 2025-12-20
