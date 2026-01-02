# Process Map: Pre-Application Phase (Refinance Rate & Term)
**Status:** IN REVIEW  
**Version:** 1.0.0  
**Created:** 2025-12-26  
**Journey:** journey-refinance-rate-term  
**Phase:** phase-pre-application-refinance-rate-term  

## Executive Summary
The Pre-Application phase for Rate & Term Refinance is designed to quickly qualify refinance prospects and determine product suitability. This phase is intentionally brief (2-day target) and focuses on high-level eligibility screening to determine LTV, rate lock timing, and program options.

## Phase Timeline & Milestones

```
Day 1                                    Day 2
├─ Customer initiates inquiry    ├─ Rate lock offer
├─ Initial qualification          ├─ Product recommendation
├─ Document collection start     └─ Loan approval decision
└─ LTV calculation begins

Target Duration: 2 business days
```

## Atoms in This Phase

### Customer-Facing Entry Points

**atom-cust-pre-qual-request**
- **Owner:** Amanda White | **Steward:** N/A
- **Criticality:** MEDIUM
- **Automation:** 20%
- **Cycle Time:** 15 min (avg)
- **Purpose:** Customer submits basic info (name, email, phone, address, loan amount)
- **Output:** Pre-qual inquiry record in LOS
- **Success Criteria:** Valid contact info + loan amount specified

### System Processing

**atom-sys-credit-pull**
- **Owner:** Michael Rodriguez | **Steward:** Sarah Chen
- **Criticality:** HIGH
- **Automation:** 100%
- **Cycle Time:** 30 sec
- **Purpose:** Pull soft credit to assess current credit profile
- **Data Used:** SSN from pre-qual form
- **Decision Point:**
  - Credit score < 620 → refer to specialist program
  - Recent bankruptcy (< 2 years) → requires waiting period
  - Multiple recent inquiries → potential rate adjustment

**atom-sys-rate-lock-processing**
- **Owner:** Jennifer Park | **Steward:** N/A
- **Criticality:** HIGH
- **Automation:** 95%
- **Cycle Time:** 2 min
- **Purpose:** Generate rate quote and lock offer
- **Inputs Required:**
  - Loan amount
  - Property address
  - Loan purpose (Rate & Term)
  - Current loan info (current rate, balance, lien position)
- **Outputs:** Rate lock sheet with 10-day rate hold

### Loan Officer Activities

**atom-bo-dti-calculation**
- **Owner:** Amanda White | **Steward:** N/A
- **Criticality:** HIGH
- **Automation:** 40%
- **Cycle Time:** 20 min
- **Purpose:** Calculate estimated DTI for approval authority
- **Note:** Quick estimate only; full DTI requires full application

**atom-cust-pre-approval-letter** (conditional)
- **Owner:** Sarah Chen | **Steward:** Amanda White
- **Criticality:** MEDIUM
- **Automation:** 85%
- **Cycle Time:** 2 min
- **Condition:** Generated only if pre-qual approves
- **Use:** Marketing outreach, customer confidence building

## Data Dependencies & Flows

```
┌─────────────────────────────────┐
│ Customer Pre-Qual Request       │
│ (atom-cust-pre-qual-request)    │
│                                 │
│ • Name, DOB, contact info       │
│ • Loan amount desired           │
│ • Property address              │
│ • Current mortgage info         │
└────────────────┬────────────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
      ▼                     ▼
┌──────────────┐    ┌─────────────────┐
│ Credit Pull  │    │ Rate Generation │
│ (atom-sys-   │    │ (atom-sys-rate- │
│  credit-     │    │  lock-          │
│  pull)       │    │  processing)    │
│              │    │                 │
│ • Score      │    │ • Current rate  │
│ • History    │    │ • New rate      │
│ • Inquiries  │    │ • Points        │
└──────┬───────┘    │ • Payment       │
       │            │   impact        │
       │            └────────┬────────┘
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
       ┌──────────────────────┐
       │ DTI Calculation      │
       │ (atom-bo-dti-       │
       │  calculation)       │
       │                     │
       │ • Est. new payment  │
       │ • Current debts     │
       │ • Income estimate   │
       │ • Final DTI ratio   │
       └──────────┬──────────┘
                  │
          ┌───────┴────────┐
          │                │
          ▼                ▼
    ┌─────────┐    ┌──────────────┐
    │ APPROVED │    │ CONDITIONAL  │
    │ (proceed │    │ (needs info) │
    │ to app)  │    │              │
    └─────────┘    └──────────────┘
```

## Quality Gates & Decision Points

### Gate 1: Credit Qualification (after atom-sys-credit-pull)
**Pass Criteria:**
- Credit score ≥ 620 (standard) OR ≥ 680 (preferred rates)
- No active fraud alerts
- No active bankruptcy
- No recent foreclosure (> 3 years prior)

**Fail Path:**
- Credit score < 580 → Refer to FHA specialist
- Active fraud alert → Escalate to compliance
- Recent foreclosure → Manual review required

**Success Rate:** 87% of inquiries pass credit gate

### Gate 2: LTV Qualification (after property valuation)
**For Rate & Term Refi:**
- LTV ≤ 80% → Streamline eligible (no appraisal needed)
- LTV 80-95% → Standard appraisal required
- LTV > 95% → Not eligible for this program

**Decision Logic:**
1. Pull estimated home value (Zillow, county records, prior appraisal)
2. Calculate LTV = Current Balance / Estimated Value
3. If LTV ≤ 80% → Generate streamline quote (no appraisal)
4. If LTV > 80% → Generate standard quote (appraisal required)

**Impact:** 65% of refi customers qualify for streamline (faster)

### Gate 3: Program Suitability
**Route Decision:**
- **Streamline Path** (LTV ≤ 80%)
  - Skip full application process
  - Proceed directly to closing
  - 5-day closing timeline

- **Standard Path** (80% < LTV ≤ 95%)
  - Requires full application
  - Appraisal ordered
  - 15-day closing timeline

- **Cashout Path** (any LTV)
  - Requires full application
  - Full underwriting
  - 20-day closing timeline

## Success Metrics

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Phase completion rate | 95% | 93.2% | Some drop-offs in rate shopping |
| Average phase duration | 2 days | 1.8 days | Well ahead of target |
| Pre-qual to app conversion | 70% | 68.5% | Minor rate lock expirations |
| Streamline qualification | 65% | 64.8% | On target |
| First-pass approval | 92% | 91.1% | Excellent |

## Exception Handling

### Scenario: Insufficient Equity (LTV > 100%)
**Condition:** Current balance exceeds estimated value  
**Actions:**
1. Offer HELOC pre-payment option
2. Extend search to cash-out refi (different program)
3. If no equity: Refer to short sale specialist

**SLA:** Response within 24 hours

### Scenario: Credit Score Borderline (620-640)
**Condition:** Customer qualifies but rate not competitive  
**Actions:**
1. Explain rate impact
2. Suggest credit improvement timeline (6-12 months)
3. Offer expedited app if customer wants to proceed
4. Document customer choice

**SLA:** Discussion within 2 hours of pull

### Scenario: Rate Lock Expiration
**Condition:** Customer rates-shops beyond 10-day lock period  
**Actions:**
1. System tracks lock expiration date
2. Auto-send renewal offer at day 8
3. Allow rate re-quote at market rates
4. Document all rate quotes for audit trail

**SLA:** Renewal offer sent automatically

## Handoff to Application Phase

### Required Deliverables from Pre-Qual
✓ Credit report & score  
✓ Property valuation (streamline or appraisal order)  
✓ Estimated DTI calculation  
✓ Rate quote & lock documentation  
✓ Program determination (streamline vs. standard)  
✓ Customer contact confirmation  

### Documentation Package
- Pre-qual form (completed)
- Credit report (pull date, score, summary)
- Rate lock sheet
- Pre-approval letter (if generated)
- Internal notes on any exceptions

### Transition Trigger
**To Application Phase:** Customer clicks "Apply Now" on rate quote OR accepts pre-approval letter

---

**Status:** In Review by Loan Operations Team  
**Feedback Due:** 2025-12-30  
**Approved By:** [Pending]
