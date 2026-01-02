---
title: TECH-DATA-FLOW: Closing Integration Points & APIs
template_type: TECHNICAL_DESIGN
module: module-closing-preparation
created: 2025-12-26T14:19:47.097636
updated: 2025-12-26T14:19:47.097636
version: 1
atoms: 8
---

# Data Flow & Integration Guide: Closing Phase
**Status:** APPROVED  
**Version:** 2.0.0  
**Date:** 2025-12-26  
**Module:** module-closing-preparation + module-funding-recording  
**Audience:** Developers, Integration Engineers, Operations

## Document Overview
Comprehensive technical reference for data flows, system integrations, API contracts, and exception handling during the Closing phase of the mortgage lifecycle.

## Systems Landscape

### Primary Systems
| System | Owner | Purpose | Integration Type |
|--------|-------|---------|------------------|
| LOS (Loan Origination) | David Thompson | Source of truth for loan data | Real-time API |
| Document Engine | Michael Rodriguez | Generate closing docs | REST API |
| eSignature Platform | James Martinez | Capture digital signatures | Webhook + polling |
| Funding System | Robert Kim | Wire coordination | Message queue |
| Compliance Engine | Jennifer Park | TILA-RESPA compliance | Real-time API |
| County Recording System | David Thompson | Record deed/mortgage | Batch file transfer |

## Core Data Objects

### Loan Object (from LOS)
```json
{
  "loanId": "LN-2025-000156",
  "borrower": {
    "name": "John Smith",
    "ssn": "XXX-XX-1234",
    "email": "john@example.com",
    "phone": "555-123-4567"
  },
  "property": {
    "address": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip": "62701",
    "apn": "14-27-376-012"
  },
  "loan": {
    "amount": 350000,
    "rate": 6.750,
    "term": 360,
    "type": "CONVENTIONAL",
    "purpose": "PURCHASE"
  },
  "closing": {
    "scheduledDate": "2025-12-28T14:00:00Z",
    "title_company": "ABC Title Corp",
    "closing_location": "Springfield Branch Office"
  }
}
```

### Closing Disclosure Document
```yaml
closingId: CD-2025-000156
loanId: LN-2025-000156
generatedDate: 2025-12-26T10:30:00Z
generatedBy: atom-sys-closing-disclosure

sections:
  loan_terms:
    loanAmount: 350000
    interestRate: 6.750
    loanTerm: 360
    paymentSchedule: "Monthly"
  
  projected_payments:
    principal_interest: 2332.50
    property_taxes: 425.00
    homeowners_insurance: 125.00
    hoa_fees: 0
    total_monthly: 2882.50
  
  costs_at_closing:
    buyer_side_closing_costs: 8750
    seller_side_closing_costs: 14300
    
  loan_estimate_comparison:
    le_issued_date: 2025-12-20
    disclosed_apy: 6.823
    estimate_loan_charges: 2650
    actual_loan_charges: 2675
    variance_pct: 0.94  # % difference
```

## Process Flow: Closing Phase

### Phase 1: Pre-Closing (T-3 to T-1 days)

#### Atom: atom-bo-closing-doc-prep
**Status:** APPROVED module-closing-preparation  
**Owner:** Robert Kim | **Steward:** David Thompson  
**Criticality:** CRITICAL  

**Inputs:**
- Final loan data from LOS
- Appraisal report (if applicable)
- Title commitment
- Clear-to-close status from underwriting

**Process Steps:**
1. Pull final loan data via LOS API
   ```
   GET /api/loans/{loanId}/final-details
   Response: Loan object with all conditions cleared
   ```

2. Validate all required documents are in eFolder
   ```
   POST /api/documents/validate-complete
   {
     "loanId": "LN-2025-000156",
     "requiredDocs": ["1003", "appraisal", "title", "voe", "vod"]
   }
   Response: { "status": "COMPLETE", "missingDocs": [] }
   ```

3. Generate Closing Disclosure (via Document Engine)
   ```
   POST /api/documents/generate
   {
     "documentType": "CLOSING_DISCLOSURE",
     "loanId": "LN-2025-000156",
     "effectiveDate": "2025-12-26"
   }
   Response: { "documentId": "CD-2025-000156", "url": "s3://..." }
   ```

4. Generate Title Commitment Summary
5. Generate Loan Estimate (final version for comparison)

**Outputs:**
- Closing Disclosure (delivered to borrower via eSignature portal)
- Title commitment summary
- Final Loan Estimate
- eClosing package (if applicable)

**Exception Handling:**
- **Missing document:** Trigger atom-bo-condition-clearance retry
- **Loan amount mismatch:** Escalate to underwriter
- **CD compliance error:** Halt process, notify compliance officer

**Success Criteria:**
- ✓ CD generated within 24 hours of clear-to-close
- ✓ CD delivered to borrower with 3-day waiting period
- ✓ All required docs in eFolder
- ✓ No TILA-RESPA compliance violations

---

#### Atom: atom-sys-closing-disclosure
**Status:** APPROVED module-closing-preparation  
**Owner:** Michael Rodriguez | **Steward:** David Thompson  
**Criticality:** CRITICAL  
**Automation:** 92%

**Regulatory Context:**
- TILA-RESPA Rule compliance mandatory
- Must be issued 3 calendar days before closing
- Borrower must sign and acknowledge receipt
- Final disclosure issued within 1 day of closing

**Generation Logic:**
```
Input: Final loan data + all clearing conditions
├─ Calculate final payment schedule
│  ├─ Principal & interest
│  ├─ Property taxes (via property tax lookup)
│  ├─ Insurance (final binder amount)
│  └─ HOA/other recurring charges
├─ Calculate closing costs
│  ├─ Lender charges (underwriting, processing)
│  ├─ Third-party charges (appraisal, title, survey)
│  ├─ Prepaids (property taxes, insurance, HOA)
│  ├─ Escrow deposits
│  └─ Adjustments
├─ Validate CD vs. Loan Estimate
│  └─ Flag any > 10% variance on loan charges
├─ Generate regulatory disclosures
│  ├─ APR calculation
│  ├─ Finance charge summary
│  └─ Payment schedule table
└─ Create PDF & eSignature-ready version

Output: Closing Disclosure + compliance certification
```

**Data Integration Points:**
- **Property Tax Service:** Integration for annual tax estimates
  ```
  GET /api/propertytax/estimate?address={address}&county={county}
  Response: { "annualTax": 4200, "monthlyEscrow": 350 }
  ```

- **Insurance Provider:** Get final insurance binder
  ```
  GET /api/insurance/binder/{borrowerId}
  Response: { "premium": 1500, "escrowMonthly": 125 }
  ```

- **HOA Database:** Fetch HOA fees
  ```
  GET /api/hoa/fees?address={address}
  Response: { "monthlyFee": 0, "annualFee": 0 }
  ```

---

### Phase 2: Closing Day (T-day)

#### Atom: atom-cust-closing-signing
**Status:** IN PROGRESS module-closing-preparation  
**Owner:** James Martinez | **Steward:** N/A  
**Criticality:** CRITICAL  
**Automation:** 5% (manual ceremony)

**Prerequisites:**
- CD delivered 3+ days prior
- Borrower reviewed disclosure
- No last-minute loan changes
- Title commitment resolved (no exceptions)

**Process:**
1. **Closing Preparation** (1 hour before)
   - Print closing documents
   - Verify borrower identity (government ID)
   - Review signing authority
   - Set up eSignature platform (or wet signature setup)

2. **Document Review & Execution** (30-45 min)
   - Closing Disclosure acknowledgment
   - Note Rate Lock details
   - Promissory Note signing
   - Mortgage/Deed of Trust signing
   - Title insurance acknowledgment
   - Wire instruction confirmation
   - Other applicable docs (HOA disclosure, etc.)

3. **Post-Closing** (15 min)
   - Collect borrower and lender counterparts
   - Obtain closing attorney certification
   - Coordinate with title company for recording queue
   - Confirm funds due date and amount

**Integration Point: eSignature Platform**
```
POST /api/esign/ceremony
{
  "loanId": "LN-2025-000156",
  "documents": [
    { "docId": "CD-2025-000156", "type": "CLOSING_DISCLOSURE" },
    { "docId": "PN-2025-000156", "type": "PROMISSORY_NOTE" },
    { "docId": "MOD-2025-000156", "type": "MORTGAGE" }
  ],
  "signers": [
    { "name": "John Smith", "email": "john@example.com", "role": "BORROWER" },
    { "name": "Jane Doe", "email": "jane@example.com", "role": "CLOSING_AGENT" }
  ],
  "ceremonyDate": "2025-12-28T14:00:00Z"
}

Response:
{
  "ceremonyId": "CER-2025-000156",
  "status": "SCHEDULED",
  "signingLink": "https://esign.platform.com/ceremony/CER-2025-000156"
}
```

**Webhook: Signing Completion**
```
POST /api/loans/webhooks/closing-signed
{
  "loanId": "LN-2025-000156",
  "ceremonyId": "CER-2025-000156",
  "signedTime": "2025-12-28T14:15:00Z",
  "documentsCompleted": 6,
  "documentsTotal": 6,
  "status": "COMPLETE"
}

Action: Trigger atom-sys-funding-wire
```

---

#### Atom: atom-sys-funding-wire
**Status:** APPROVED module-funding-recording  
**Owner:** Robert Kim | **Steward:** David Thompson  
**Criticality:** CRITICAL  
**Automation:** 98%

**Trigger:** Closing documents signed + funds available

**Funding Workflow:**
```
Closing Documents Signed
├─ Closing attorney certifies signing
├─ Record prepared
└─ Title company places on recording queue
   │
   ├─ County recording (48-72 hours)
   │  └─ Deed recorded → Title company issues policy
   │
   ├─ Parallel: Wire funds coordination
   │  ├─ Confirm wire instructions (atom-bo-closing-wire-instructions)
   │  ├─ Final payoff demand to existing lender
   │  ├─ Verify closing costs (final reconciliation)
   │  └─ Send wire to title company
   │
   └─ Title company funds seller & lender
      ├─ Funds released to seller account
      └─ Lender receives payoff confirmation + title policy
```

**Wire Instruction Data Flow:**
```json
{
  "wireId": "WIR-2025-000156",
  "loanId": "LN-2025-000156",
  "wipAmount": 344325,  // net after payoffs
  "wireDate": "2025-12-28T16:30:00Z",
  "destination": {
    "bankName": "ABC Title Company Escrow",
    "accountNumber": "XXXX-XXXX-1234",
    "routingNumber": "021000021",
    "reference": "Escrow for 123 Main St - Smith Loan"
  },
  "verification": {
    "borrowerVerified": true,
    "wireInstructionsAcknowledged": true,
    "dueDisses": ["no_third_party_wire", "confirm_amounts", "limit_wire_recipients"]
  }
}
```

**Verification Check:**
```
POST /api/wire/verify
{
  "wireId": "WIR-2025-000156",
  "destinationBank": "ABC Title Company",
  "amount": 344325,
  "borrowerAcknowledgment": true
}

Response: { "status": "VERIFIED", "canProceed": true }
```

**Integration: Send wire to Bank**
```
POST /bank-api/wire-transfer
{
  "externalWireId": "WIR-2025-000156",
  "amount": 344325,
  "destination": {
    "bank": "ABC Title Company",
    "account": "XXXX-1234",
    "routing": "021000021"
  },
  "reference": "Escrow 123 Main - Smith"
}

Response:
{
  "wireConfirmation": "WIRE-BANK-9876543",
  "status": "SENT",
  "expectedDelivery": "2025-12-28T16:35:00Z"
}
```

**Webhook: Wire Delivery Confirmation**
```
POST /api/loans/webhooks/wire-delivered
{
  "wireId": "WIR-2025-000156",
  "bankConfirmation": "WIRE-BANK-9876543",
  "deliveredTime": "2025-12-28T16:32:00Z",
  "amount": 344325,
  "status": "DELIVERED"
}

Action: Trigger atom-sys-wire-verification & atom-sys-deed-recording
```

---

#### Atom: atom-sys-deed-recording
**Status:** APPROVED module-funding-recording  
**Owner:** David Thompson | **Steward:** Lisa Anderson  
**Criticality:** CRITICAL  
**Automation:** 85%

**Integration: County Recording System**
```
Batch File Transfer (overnight):
├─ Consolidate all documents needing recording
├─ Format per county requirements (XML/PDF)
├─ Submit to county recording office
└─ Track recording status

API Alternative (real-time):
POST /api/county/{countyCode}/record-document
{
  "recordingType": "DEED",
  "documentPath": "s3://closing-docs/deed-2025-000156.pdf",
  "propertyApn": "14-27-376-012",
  "borrower": "John Smith",
  "lender": "ABC Bank"
}

Response: { "recordingId": "REC-20251228-001", "status": "QUEUED" }
```

**Recording Status Polling:**
```
GET /api/county/{countyCode}/recording/{recordingId}

Response:
{
  "recordingId": "REC-20251228-001",
  "status": "RECORDED",
  "recordNumber": "2025-1247830",
  "recordedDate": "2025-12-30T10:15:00Z",
  "url": "https://county.records.com/search?recordNo=2025-1247830"
}

Action: Trigger atom-bo-post-closing-audit
```

---

### Phase 3: Post-Closing (T+1 to T+5 days)

#### Atom: atom-bo-post-closing-audit
**Status:** APPROVED module-quality-control  
**Owner:** David Thompson | **Steward:** Lisa Anderson  
**Criticality:** HIGH  
**Automation:** 35%

**Audit Checklist:**
- ✓ All documents signed correctly
- ✓ Wire transferred successfully
- ✓ Deed recorded (verify recording number)
- ✓ Title policy issued
- ✓ Final payoff funds received by seller
- ✓ Any conditions cleared and documented
- ✓ Closing costs reconciled to CD
- ✓ Borrower contact confirmed post-closing

**Audit Data Source:**
```
POST /api/audit/closing/{loanId}
{
  "auditType": "POST_CLOSING_VERIFICATION",
  "checkpoints": [
    { "item": "documents_signed", "verified": true },
    { "item": "wire_confirmed", "verified": true },
    { "item": "recording_confirmed", "verified": true },
    { "item": "title_policy_issued", "verified": true },
    { "item": "closing_costs_reconciled", "verified": true }
  ]
}

Response: { "auditId": "AUD-2025-000156", "status": "PASSED" }
```

**Investor Reporting:**
```
Batch Export (daily):
├─ Loan data + closing details
├─ Format per investor requirement (FNMA, FHLMC)
├─ Include: closing costs, rate, property details
└─ Submit via secure upload

Timing: T+1 to T+5 based on investor requirements
```

---

## Exception Handling Matrix

| Exception | Trigger | Action | Timeline | Owner |
|-----------|---------|--------|----------|-------|
| Signing reschedule | Borrower request | Update ceremony, resend CD | 2 hours | James M. |
| Wire instruction change | Borrower calls after CD issued | Follow fraud protocols, escalate | 1 hour | Robert K. |
| Recording rejection | County rejects document | Correct & resubmit, update borrower | 24 hours | David T. |
| Title commitment exception | Title company finds lien | Payoff negotiation, hold closing | 48 hours | David T. |
| Missing funds | Insufficient account | Investigate, request wire verification | 4 hours | Robert K. |
| Payoff discrepancy | Seller short funds | Negotiate seller contribution | 24 hours | James M. |

## Performance Dashboards

### Real-time Closing Pipeline
- Documents generated/delivered: 12/12
- Signings scheduled today: 8
- Signings completed: 5
- Wires queued: 2
- Recording status: 14 processed, 0 rejected

### SLA Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| CD generation time | < 24 hrs | 18.3 hrs | ✓ |
| Signing-to-wire time | < 48 hrs | 32.1 hrs | ✓ |
| Recording to title policy | < 5 days | 4.2 days | ✓ |
| Post-closing audit | < 5 days | 3.8 days | ✓ |
| Investor reporting | Per requirement | On time | ✓ |

---

**Version Control:**  
v2.0.0 — Full integration guide with data flows  
v1.5.0 — Initial process document  

**Last Updated:** 2025-12-26  
**Next Review:** 2026-03-26  
**Maintained By:** David Thompson, Robert Kim
