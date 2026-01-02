# Document Inventory: FHA Purchase Loan Workflow
**Status:** PUBLISHED  
**Version:** 1.0.0  
**Date:** 2025-12-26  
**Journey:** journey-purchase-fha  
**Audience:** Operations, Compliance, Training

## Introduction
This document catalogs all atoms, modules, phases, and supporting documentation for an FHA home purchase loan workflow. It demonstrates how individual process atoms combine into cohesive modules that form distinct phases within the complete customer journey.

## Journey Structure: FHA Home Purchase

```
journey-purchase-fha
│
├─ phase-pre-application-purchase-fha (2 days)
│  └─ module-pre-qualification
│
├─ phase-application-intake-purchase-fha (4 days)
│  ├─ module-application-intake
│  └─ module-property-appraisal
│
├─ phase-processing-purchase-fha (7 days)
│  ├─ module-income-verification
│  ├─ module-credit-analysis
│  └─ module-property-appraisal
│
├─ phase-underwriting-purchase-fha (5 days)
│  ├─ module-underwriting-decision
│  └─ module-conditions-management
│
└─ phase-closing-purchase-fha (3 days)
   ├─ module-closing-preparation
   └─ module-funding-recording
```

## Phase 1: Pre-Application (2 days)

### Phase Details
- **Target Duration:** 2 days
- **Team Lead:** Amanda White (Loan Officer)
- **Module:** module-pre-qualification

### Atoms in This Phase

| Atom ID | Name | Category | Criticality | Owner | Notes |
|---------|------|----------|-------------|-------|-------|
| atom-cust-pre-qual-request | Customer Requests Pre-Qualification | CUST | MEDIUM | Amanda White | Initial inquiry capture |
| atom-sys-credit-pull | System Pulls Soft Credit | SYSTEM | HIGH | Michael Rodriguez | FHA requires credit score |
| atom-sys-rate-lock-processing | System Processes Rate Lock | SYSTEM | HIGH | Jennifer Park | FHA 10% down typical |
| atom-bo-dti-calculation | Loan Officer Calculates DTI | BO | HIGH | Amanda White | Quick estimate |
| atom-cust-pre-approval-letter | System Generates Pre-Approval Letter | CUST | MEDIUM | Sarah Chen | Marketing tool |

### Key FHA Rules Applied
- Minimum credit score: 580 (with 10% down) or 500 (with 3.5% down)
- Maximum DTI: 57% (front-end: 40%)
- FHA mortgage insurance calculation (upfront + annual)
- Must own and occupy property
- Debt-to-income based on FHA net ratios

### Success Metrics
- Lead-to-application conversion: 72% (target: >70%)
- Pre-approval letter generation: 100%
- Average time from inquiry to approval: 1.8 days
- Streamline determination accuracy: 96%

---

## Phase 2: Application Intake (4 days)

### Phase Details
- **Target Duration:** 4 days
- **Team Lead:** Jennifer Park (Application Processor)
- **Modules:** module-application-intake + module-property-appraisal

### Core Atoms

**Customer-Facing Submission:**
| Atom ID | Purpose | Owner | Cycle Time |
|---------|---------|-------|-----------|
| atom-cust-initial-doc-upload | Upload initial documents (ID, pay stubs, etc) | Robert Kim | 24 hrs |
| atom-cust-w2-upload | Upload W-2 forms | Amanda White | 24 hrs |
| atom-cust-tax-return-upload | Upload tax returns (2 years) | Lisa Anderson | 24 hrs |
| atom-cust-bank-statement-upload | Upload bank statements (2 months) | Robert Kim | 24 hrs |
| atom-cust-pay-stub-upload | Upload recent pay stubs (30 days) | David Thompson | 12 hrs |

**FHA-Specific Appraisal:**
| Atom ID | Purpose | Owner | Criticality |
|---------|---------|-------|------------|
| atom-bo-appraisal-order | Order FHA appraisal (must use FHA roster) | Robert Kim | CRITICAL |
| atom-sys-appraisal-received | Receive appraisal report | Amanda White | CRITICAL |
| atom-bo-appraisal-review | Review for FHA compliance | Jennifer Park | CRITICAL |

**FHA Compliance Items:**
- Appraisal must be done by FHA-approved appraiser
- Property must meet minimum standards
- Lead-based paint disclosure (properties built pre-1978)
- Flood zone determination
- Hazard insurance quotes obtained

### Completeness Review
| Item | FHA Required | Status |
|------|-------------|--------|
| Application (Form 1003) | Yes | Required |
| Credit Report | Yes | Pulled in pre-app |
| Employment Verification | Yes | Ordered if current employed |
| Income Verification (W-2, tax returns) | Yes | Collected |
| Asset Verification | Yes | Bank statements collected |
| FHA Appraisal | Yes | Ordered by end of day 2 |
| Purchase Agreement | Yes | Uploaded by customer |
| Property Disclosure | Yes | Seller provides |
| Lead Paint Disc (if applicable) | Yes | Disclosed |

### Handoff Checklist
- ✓ All required documents collected
- ✓ Appraisal ordered to FHA-approved appraiser
- ✓ Application 100% complete
- ✓ No conditions outstanding
- ✓ Ready for processing phase

---

## Phase 3: Processing (7 days)

### Phase Details
- **Target Duration:** 7 days
- **Team Lead:** James Martinez (Senior Processor)
- **Modules:** income-verification + credit-analysis + property-appraisal

### Key Differences from Conventional

**FHA-Specific Processing:**

1. **Mortgage Insurance Calculation**
   - Upfront Mortgage Insurance Premium (UFMIP): 1.75% of loan amount
   - Annual Mortgage Insurance Premium (MIP): Varies by LTV
   - MIP continues for life of loan if LTV > 90% at origination
   - MIP can be paid upfront or rolled into loan

2. **Income Calculation**
   - Use FHA net income ratios (more conservative than conventional)
   - Front-end ratio: 40% (housing + FHA MI)
   - Back-end ratio: 57% (total debts + FHA MI)
   - Any income with < 2 year history questioned

3. **Credit Requirements**
   - No mortgage history < 2 years if payment trend negative
   - 3-year seasoning for bankruptcy (with compensating factors)
   - Deferred judgment available for credit issues if documented

### Atoms in Processing Phase

**Income Verification:**
```yaml
atoms:
  - atom-cust-w2-upload
  - atom-cust-tax-return-upload
  - atom-bo-w2-review
  - atom-bo-tax-return-analysis
  - atom-sys-income-calculation
  - atom-bo-voi-verification
actions:
  - Verify 2 years of employment history
  - Apply FHA income ratios
  - Calculate FHA DTI (including MIP)
```

**Credit Analysis:**
```yaml
atoms:
  - atom-sys-credit-pull
  - atom-bo-credit-analysis
  - atom-bo-derogatory-review
  - atom-bo-payment-history-review
actions:
  - Review credit score (minimum 580 for 10% down)
  - Document any derogatory items
  - Identify reconciliation needs
  - Check for fraud indicators
```

**Appraisal Review:**
```yaml
atoms:
  - atom-bo-appraisal-order
  - atom-sys-appraisal-received
  - atom-bo-appraisal-review
  - atom-sys-flood-determination
  - atom-sys-title-order
actions:
  - Verify property meets FHA minimum property standards
  - Confirm value supports loan amount
  - Check for health/safety issues
  - Determine flood insurance needs
```

### FHA Conditions Common in This Phase
- Updated employment verification (if >30 days old)
- Explanation of credit delinquencies
- Compensating factors documentation
- Verification of liquid assets
- Gift letter verification (if applicable)
- Homeowners association documents
- Property condition repairs (if appraisal noted issues)

### Processing Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Phase completion | 7 days | 6.8 days | ✓ |
| Appraisal-to-UW time | 3 days | 2.9 days | ✓ |
| Condition fulfillment | 95% | 93.1% | ⚠ |
| First-pass completeness | 90% | 87.2% | ⚠ |

---

## Phase 4: Underwriting (5 days)

### Phase Details
- **Target Duration:** 5 days
- **Team Lead:** Lisa Anderson (Senior Underwriter)
- **Modules:** underwriting-decision + conditions-management

### FHA Underwriting Specifics

**Manual Underwriting Triggers:**
- Credit score < 620 (may need AUS exception)
- DTI > 50%
- Non-traditional credit
- Self-employment income
- Gift funds for down payment
- Bankruptcy/foreclosure on record
- Collection accounts or charge-offs
- Manually underwritten by rule

**Condition Categories:**

1. **Prior-to-Docs (PTD)** — Must clear before CD issued
   - Clear title issues (if any)
   - Property ownership verification
   - Updated homeowners insurance quote

2. **Prior-to-Funding (PTF)** — Must clear before funding
   - Final walkthrough/inspection
   - Final payoff quote from existing lender
   - All conditions satisfied

3. **Prior-to-Close** — Documentation requirements
   - Signed CD in file
   - Signed loan documents in eFolder
   - All insurance confirmations

### Underwriting Atoms

| Atom ID | Purpose | Owner | Criticality |
|---------|---------|-------|------------|
| atom-sys-aus-submission | Submit to AUS (Desktop Underwriter) | Michael Rodriguez | CRITICAL |
| atom-bo-manual-underwrite | Underwriter performs manual review | Jennifer Park | CRITICAL |
| atom-dec-loan-decision | Final loan decision | Jennifer Park | CRITICAL |
| atom-sys-condition-generation | Auto-generate PTD/PTF conditions | Jennifer Park | HIGH |
| atom-bo-condition-tracking | Track condition fulfillment | Lisa Anderson | HIGH |

### Decision Matrix

| Scenario | Action | Timeline |
|----------|--------|----------|
| AUS Approve, No flags | Auto-approve → CTC | 1 day |
| AUS Approve w/ conditions | Manual UW reviews, issues conditions | 2 days |
| AUS Manual Review | Underwriter does manual UW | 3 days |
| AUS Refer | Senior UW reviews, may deny | 4 days |

### Clear-to-Close Requirements
- ✓ All PTD conditions cleared
- ✓ All PTF conditions cleared
- ✓ Title report final & clear
- ✓ Appraisal final
- ✓ Clear decision in underwriting system
- ✓ Final CD delivered (3-day waiting period passed)

---

## Phase 5: Closing (3 days)

### Phase Details
- **Target Duration:** 3 days (T-1 to T+2)
- **Team Lead:** David Thompson (Closing Manager)
- **Modules:** closing-preparation + funding-recording

### Closing Atoms

**Document Preparation:**
| Atom ID | Purpose | Owner | Notes |
|---------|---------|-------|-------|
| atom-bo-closing-doc-prep | Generate all closing docs | Robert Kim | Includes FHA-specific docs |
| atom-sys-closing-disclosure | Generate CD + regulatory docs | Michael Rodriguez | TILA-RESPA compliance |
| atom-bo-closing-cost-review | Final reconciliation of costs | Jennifer Park | Verify MIP calculation |

**Closing Event:**
| Atom ID | Purpose | Owner | Notes |
|---------|---------|-------|-------|
| atom-cust-closing-scheduling | Schedule closing | Lisa Anderson | Coordinate title company |
| atom-cust-closing-signing | Borrower signs documents | James Martinez | In-person or eClosing |
| atom-bo-notary-coordination | Arrange notary services | Michael Rodriguez | Title company coordinates |

**Funding & Recording:**
| Atom ID | Purpose | Owner | Notes |
|---------|---------|-------|-------|
| atom-bo-closing-wire-instructions | Prepare wire instructions | Sarah Chen | Fraud prevention protocols |
| atom-sys-funding-wire | Wire funds to title company | Robert Kim | After signing confirmation |
| atom-sys-deed-recording | Submit deed for recording | David Thompson | County recording required |
| atom-bo-post-closing-audit | Post-closing quality review | David Thompson | Verify all steps complete |

### FHA Closing-Specific Requirements
- Closing Disclosure (3-day waiting period from delivery)
- FHA mortgage insurance payment (UFMIP + first MIP payment)
- Hazard insurance binder verification
- Title insurance policy (FHA required format)
- HOA disclosure (if applicable)
- Final walkthrough report
- Mortgage note and FHA-compliant mortgage

### Closing Costs Breakdown (Example: $350,000 FHA Purchase)
```
Purchase Price:                           $350,000
Down Payment (3.5%):                      ($12,250)
Loan Amount:                              $337,750

FHA Upfront Mortgage Insurance (1.75%):    $5,911
Loan Amount after UFMIP:                  $343,661

Closing Costs (est 2-5%):
  Appraisal:                              $525
  Credit Report:                          $35
  Lender Title Insurance:                 $450
  Owner Title Insurance (optional):       $450
  Recording Fees:                         $250
  Title Examination:                      $350
  Homeowners Insurance (1 year):          $1,200
  Property Taxes (prorated):              $875
  HOA Fees (if applicable):               $250
  
Total Estimated Costs:                    $4,385

Total Due at Closing:                     ~$12,250 (down payment)
                                          + $4,385 (closing costs)
                                          ≈ $16,635 TOTAL

(Down payment + closing costs, or rolled into loan)
```

### Funding Timeline
- T-3: Closing Disclosure delivered (3-day waiting period starts)
- T-0: Closing ceremony, document signing
- T+1: Funds wired to title company
- T+2: Deed recorded, title policy issued
- T+3: Loan sale to investor (if applicable)

---

## Document References & Support Materials

### Process Documentation
- [SOP-001-Income-Verification.md](./SOP-001-Income-Verification.md) — Income verification workflow
- [TECH-SPEC-Underwriting-Module.md](./TECH-SPEC-Underwriting-Module.md) — Underwriting system specs
- [TECH-DATA-FLOW-Closing-Phase.md](./TECH-DATA-FLOW-Closing-Phase.md) — Data flows & integration

### Related Atoms
- **All 127 atoms** defined in `atoms/` folder
- **All 12 modules** defined in `modules/` folder
- **All 6 phases** defined in `phases/` folder
- **All 4 journeys** defined in journey configs

### Regulatory References
- Fannie Mae Seller Guide (FNMA requirements)
- Freddie Mac Guides (FHLMC requirements)
- FHA Handbook 4155.1 (Underwriting standards)
- TILA-RESPA Rule 12 CFR Part 1026 (Disclosure requirements)
- Fair Lending Guidelines (Disparate Impact)

### Training Materials
- [FHA Basics Course](./training/fha-101.md)
- [Underwriting Decision Criteria](./training/uw-decisions.md)
- [Condition Management Best Practices](./training/condition-mgmt.md)

---

## Summary & Ecosystem View

### Atoms Count by Type
| Type | Count | Examples |
|------|-------|----------|
| PROCESS | 78 | Credit analysis, W-2 review, condition tracking |
| SYSTEM | 25 | Condition generation, credit pull, AUS submission |
| DOCUMENT | 12 | Closing disclosure, CD, appraisal report |
| DECISION | 3 | Loan approval decision, exception approval |
| ROLE | 6 | Underwriter, Processor, Loan Officer |
| POLICY | 3 | Fair lending, TRID compliance, credit policy |
| CONTROL | 1 | Credit policy control |

### Module Count by Function
- **Pre-Qual:** 1 (module-pre-qualification)
- **Application:** 2 (application-intake, property-appraisal)
- **Processing:** 3 (income-verification, credit-analysis, property-appraisal)
- **Underwriting:** 2 (underwriting-decision, conditions-management)
- **Closing:** 2 (closing-preparation, funding-recording)
- **QC:** 1 (quality-control)

### Ownership Distribution
- **Owner Coverage:** 100% (all atoms have owners)
- **Steward Coverage:** 21.8% (27 atoms have stewards for oversight)
- **Department Coverage:** 6 teams involved
- **Cross-Functional Dependencies:** 23 inter-module flows

---

**Document Status:** Published  
**Last Updated:** 2025-12-26  
**Next Review Date:** 2026-03-26  
**Custodian:** James Martinez (Loan Operations Manager)
