#!/usr/bin/env python3
"""Generate synthetic test data for a home-loan / banking integration demo.

Creates:
 - test_data/atoms/*.yaml  (atoms with full structure: category, type, content, edges, moduleId, phaseId)
 - test_data/modules/*.yaml (modules grouping atoms)
 - test_data/phases/*.yaml (phases grouping modules)
 - test_data/graph.json    (nodes + edges suitable for `scripts/sync_neo4j.py`)
 - test_data/docs/*.txt    (example documents)

Usage:
  python scripts/generate_test_data.py --count 200

The generator creates realistic home lending atoms, modules, and phases for a large bank.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

try:
    import yaml
except Exception:
    yaml = None


ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "test_data")
# API reads from these directories, not test_data subdirectories
ATOMS_BASE = os.path.join(ROOT, "atoms")
MODULES_DIR = os.path.join(ROOT, "modules")
PHASES_DIR = os.path.join(ROOT, "phases")  # If phases API exists
DOCS = os.path.join(OUT, "docs")


def ensure_dirs() -> None:
    # Create category subdirectories for atoms
    os.makedirs(os.path.join(ATOMS_BASE, "processes"), exist_ok=True)
    os.makedirs(os.path.join(ATOMS_BASE, "decisions"), exist_ok=True)
    os.makedirs(os.path.join(ATOMS_BASE, "systems"), exist_ok=True)
    os.makedirs(os.path.join(ATOMS_BASE, "roles"), exist_ok=True)
    os.makedirs(os.path.join(ATOMS_BASE, "policies"), exist_ok=True)
    os.makedirs(os.path.join(ATOMS_BASE, "controls"), exist_ok=True)
    os.makedirs(os.path.join(ATOMS_BASE, "documents"), exist_ok=True)
    os.makedirs(MODULES_DIR, exist_ok=True)
    os.makedirs(PHASES_DIR, exist_ok=True)
    os.makedirs(DOCS, exist_ok=True)


# Home Lending Domain Data
BANK_NAMES = [
    "First National Bank",
    "Premier Mortgage Bank",
    "Heritage Lending Group",
    "Trusted Home Finance",
    "Capital Residential Lending",
]

TEAMS = [
    "Loan Origination",
    "Underwriting",
    "Processing",
    "Closing",
    "Post-Closing",
    "Compliance",
    "Risk Management",
    "Customer Experience",
    "Technology",
]

OWNERS = [
    "Sarah Chen",
    "Michael Rodriguez",
    "Jennifer Park",
    "David Thompson",
    "Lisa Anderson",
    "Robert Kim",
    "Amanda White",
    "James Martinez",
]

# Define Phases (Customer Journey Milestones)
PHASES = [
    {
        "id": "phase-pre-application",
        "name": "Pre-Application",
        "description": "Initial customer engagement, pre-qualification, and rate shopping",
        "targetDurationDays": 7,
        "journeyId": "journey-purchase-conventional",
    },
    {
        "id": "phase-application-intake",
        "name": "Application Intake",
        "description": "Formal application submission, initial document collection, and completeness check",
        "targetDurationDays": 3,
        "journeyId": "journey-purchase-conventional",
    },
    {
        "id": "phase-processing",
        "name": "Processing",
        "description": "Document verification, income validation, credit analysis, and property appraisal",
        "targetDurationDays": 10,
        "journeyId": "journey-purchase-conventional",
    },
    {
        "id": "phase-underwriting",
        "name": "Underwriting",
        "description": "Risk assessment, loan decision, conditions management, and final approval",
        "targetDurationDays": 5,
        "journeyId": "journey-purchase-conventional",
    },
    {
        "id": "phase-closing",
        "name": "Closing",
        "description": "Document preparation, closing coordination, funding, and recording",
        "targetDurationDays": 7,
        "journeyId": "journey-purchase-conventional",
    },
    {
        "id": "phase-post-closing",
        "name": "Post-Closing",
        "description": "Quality control, document imaging, loan sale preparation, and servicing transfer",
        "targetDurationDays": 5,
        "journeyId": "journey-purchase-conventional",
    },
]

# Define Modules (Operational Workflows)
MODULES = [
    {
        "id": "module-pre-qualification",
        "name": "Pre-Qualification",
        "description": "Initial credit check, debt-to-income calculation, and pre-approval letter generation",
        "owner": "Loan Origination",
        "phaseId": "phase-pre-application",
    },
    {
        "id": "module-application-intake",
        "name": "Application Intake",
        "description": "1003 form completion, initial document upload, and application completeness validation",
        "owner": "Loan Origination",
        "phaseId": "phase-application-intake",
    },
    {
        "id": "module-income-verification",
        "name": "Income Verification",
        "description": "W-2 review, pay stub analysis, tax return validation, and income calculation",
        "owner": "Processing",
        "phaseId": "phase-processing",
    },
    {
        "id": "module-asset-verification",
        "name": "Asset Verification",
        "description": "Bank statement review, asset source documentation, and reserve calculation",
        "owner": "Processing",
        "phaseId": "phase-processing",
    },
    {
        "id": "module-credit-analysis",
        "name": "Credit Analysis",
        "description": "Credit report review, credit score analysis, trade line evaluation, and credit risk assessment",
        "owner": "Processing",
        "phaseId": "phase-processing",
    },
    {
        "id": "module-property-appraisal",
        "name": "Property Appraisal",
        "description": "Appraisal ordering, property inspection, value determination, and appraisal review",
        "owner": "Processing",
        "phaseId": "phase-processing",
    },
    {
        "id": "module-title-insurance",
        "name": "Title & Insurance",
        "description": "Title search, title insurance, hazard insurance verification, and flood determination",
        "owner": "Processing",
        "phaseId": "phase-processing",
    },
    {
        "id": "module-underwriting-decision",
        "name": "Underwriting Decision",
        "description": "Automated underwriting system (AUS) submission, manual underwrite, and loan decision",
        "owner": "Underwriting",
        "phaseId": "phase-underwriting",
    },
    {
        "id": "module-conditions-management",
        "name": "Conditions Management",
        "description": "Condition generation, condition fulfillment tracking, and condition clearance",
        "owner": "Underwriting",
        "phaseId": "phase-underwriting",
    },
    {
        "id": "module-closing-preparation",
        "name": "Closing Preparation",
        "description": "Closing disclosure generation, document preparation, and closing scheduling",
        "owner": "Closing",
        "phaseId": "phase-closing",
    },
    {
        "id": "module-funding-recording",
        "name": "Funding & Recording",
        "description": "Wire transfer, loan funding, deed recording, and post-closing document collection",
        "owner": "Closing",
        "phaseId": "phase-closing",
    },
    {
        "id": "module-quality-control",
        "name": "Quality Control",
        "description": "Post-closing audit, document imaging, compliance review, and loan sale preparation",
        "owner": "Post-Closing",
        "phaseId": "phase-post-closing",
    },
]

# Atom Templates - Home Lending Processes
ATOM_TEMPLATES = [
    # Pre-Application Phase
    {
        "id_prefix": "atom-cust-pre-qual-request",
        "name": "Customer Requests Pre-Qualification",
        "category": "CUSTOMER_FACING",
        "type": "PROCESS",
        "moduleId": "module-pre-qualification",
        "summary": "Customer initiates pre-qualification through online portal or phone call to determine initial loan eligibility",
        "description": "The pre-qualification request is the first step in the home lending journey where a prospective borrower expresses interest in obtaining a mortgage loan. This process allows customers to understand their borrowing capacity before committing to a full application. The bank uses this opportunity to capture initial customer information, assess basic eligibility, and provide a preliminary loan amount estimate. This is a non-binding process that helps customers shop for homes within their price range and gives the bank an early view of potential loan volume.",
        "purpose": "Enable customers to quickly assess their mortgage eligibility and obtain a preliminary loan amount estimate without the commitment of a full application. This improves customer experience by providing transparency early in the process and helps the bank identify qualified leads.",
        "business_context": "Pre-qualification is a critical customer acquisition tool in competitive mortgage markets. It allows the bank to engage customers early, build trust, and position themselves as the preferred lender. The process must be fast (typically under 24 hours) and user-friendly to compete with digital-first lenders. Pre-qualification letters are often required by real estate agents before showing properties, making this a gatekeeper process.",
        "steps": [
            "Customer accesses pre-qualification portal via bank website or mobile app",
            "Customer provides basic information including: full name, contact information, employment status, estimated annual income, estimated monthly debts, desired loan amount, and property type",
            "Customer consents to soft credit inquiry (does not impact credit score)",
            "System validates input data format and completeness",
            "System creates pre-qualification request record in LOS",
            "Customer receives confirmation email with request ID",
        ],
        "inputs": [
            "Customer name and contact information",
            "Estimated annual income",
            "Estimated monthly debt payments",
            "Desired loan amount",
            "Property type (purchase/refinance)",
            "Customer consent for credit inquiry",
        ],
        "outputs": [
            "Pre-qualification request record",
            "Request ID for tracking",
            "Confirmation notification to customer",
        ],
        "prerequisites": [
            "Customer must be 18 years or older",
            "Customer must provide valid contact information",
            "Customer must consent to credit inquiry",
        ],
        "success_criteria": [
            "Request successfully created in system",
            "Customer receives confirmation within 5 minutes",
            "All required fields captured accurately",
            "Request routed to appropriate loan officer within 1 hour",
        ],
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-sys-credit-pull",
        "name": "System Pulls Soft Credit",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-pre-qualification",
        "summary": "Automated soft credit inquiry to assess initial creditworthiness without impacting customer's credit score",
        "description": "This automated process retrieves a soft credit pull from one or more credit bureaus (Experian, Equifax, TransUnion) to assess a customer's creditworthiness during pre-qualification. Unlike a hard credit pull used in full applications, a soft pull does not affect the customer's credit score and can be performed without their explicit authorization (though consent is typically obtained). The system retrieves the credit score, credit history length, number of open accounts, and any derogatory items. This information is critical for determining if the customer meets minimum credit requirements and estimating loan terms.",
        "purpose": "Provide immediate credit assessment for pre-qualification decisions without requiring a full application or impacting the customer's credit score. Enables rapid pre-qualification responses and helps identify credit issues early in the process.",
        "business_context": "Soft credit pulls are essential for competitive pre-qualification processes. They allow the bank to provide instant feedback to customers while protecting their credit scores. The system must integrate with credit bureau APIs (typically through a credit service provider like Equifax, Experian, or a third-party aggregator) and handle API failures gracefully. Response times are critical - customers expect near-instant results.",
        "steps": [
            "System receives pre-qualification request with customer SSN and consent",
            "System formats credit inquiry request according to bureau API specifications",
            "System calls credit bureau API (typically through service provider)",
            "Bureau returns credit report data including: credit score, credit history, open accounts, payment history, derogatory items",
            "System parses and validates credit report response",
            "System stores credit data in LOS with inquiry type marked as 'soft'",
            "System flags if credit score is below minimum threshold",
            "System makes credit data available for DTI calculation and pre-qualification decision",
        ],
        "inputs": [
            "Customer SSN (last 4 digits sufficient for some bureaus)",
            "Customer name and date of birth",
            "Customer address (for identity verification)",
            "Consent for credit inquiry",
        ],
        "outputs": [
            "Credit score (typically FICO score)",
            "Credit report summary",
            "Credit history length",
            "Number of open accounts",
            "Payment history indicators",
            "Derogatory items (if any)",
        ],
        "prerequisites": [
            "Valid customer SSN",
            "Customer consent for credit inquiry",
            "Credit bureau API connectivity",
            "Valid API credentials and service agreement",
        ],
        "success_criteria": [
            "Credit report successfully retrieved within 30 seconds",
            "Credit data accurately stored in LOS",
            "Soft inquiry properly marked (does not affect credit score)",
            "System handles API failures gracefully with retry logic",
        ],
        "exceptions": [
            {
                "condition": "Credit bureau API unavailable",
                "action": "Retry up to 3 times with exponential backoff, then queue for manual processing",
            },
            {
                "condition": "Customer SSN not found in credit bureau",
                "action": "Flag for manual review - may indicate identity verification needed",
            },
            {
                "condition": "Credit score below 620 (minimum threshold)",
                "action": "Still complete pre-qualification but flag for loan officer review and alternative program consideration",
            },
        ],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-dti-calculation",
        "name": "Loan Officer Calculates DTI",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-pre-qualification",
        "summary": "Calculate debt-to-income ratio using stated income and debts",
        "steps": [
            "Retrieve customer income information",
            "Retrieve customer debt obligations",
            "Calculate monthly DTI ratio",
            "Compare against program guidelines",
        ],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-cust-pre-approval-letter",
        "name": "Customer Receives Pre-Approval Letter",
        "category": "CUSTOMER_FACING",
        "type": "DOCUMENT",
        "moduleId": "module-pre-qualification",
        "summary": "Generate and deliver pre-approval letter to customer",
        "steps": [
            "System generates pre-approval letter",
            "Email letter to customer",
            "Customer downloads letter from portal",
        ],
        "criticality": "MEDIUM",
    },
    # Application Intake Phase
    {
        "id_prefix": "atom-cust-application-submit",
        "name": "Customer Submits Loan Application",
        "category": "CUSTOMER_FACING",
        "type": "PROCESS",
        "moduleId": "module-application-intake",
        "summary": "Customer completes and submits Uniform Residential Loan Application (1003) to formally apply for a mortgage loan",
        "description": "The loan application submission is the formal initiation of the mortgage process where a customer completes the Uniform Residential Loan Application (Form 1003), the standard form used by all lenders. This comprehensive form captures all essential borrower information including personal details, employment history, income, assets, liabilities, and property information. The application can be completed online through the bank's portal, over the phone with a loan officer, or in person. Once submitted, the application becomes a binding document and the bank is required to provide a Loan Estimate within 3 business days per TRID regulations. This is a critical milestone that triggers the formal loan processing workflow.",
        "purpose": "Formally initiate the mortgage loan process by capturing all required borrower and property information in a standardized format. The application serves as the foundation for all subsequent underwriting and processing activities.",
        "business_context": "Application submission is the point where a customer transitions from shopping to committing to a loan with the bank. The experience must be smooth and professional to maintain customer confidence. The bank must balance thorough data collection with user experience - asking for too much upfront can cause abandonment, while asking for too little requires multiple follow-ups. Modern applications use progressive disclosure and save progress to improve completion rates. The application data quality directly impacts processing efficiency and underwriting accuracy.",
        "steps": [
            "Customer accesses loan application portal (web or mobile)",
            "Customer creates account or logs into existing account",
            "Customer selects loan type (purchase, refinance, cash-out refinance)",
            "Customer completes Section 1: Borrower Information (name, SSN, DOB, marital status, dependents)",
            "Customer completes Section 2: Financial Information (employment, income, assets)",
            "Customer completes Section 3: Property Information (address, property type, intended use)",
            "Customer completes Section 4: Loan Information (loan amount, down payment, loan purpose)",
            "Customer completes Section 5: Declarations (bankruptcies, foreclosures, judgments, etc.)",
            "Customer reviews all information for accuracy",
            "Customer provides electronic signature consenting to credit pull and authorizing information verification",
            "Customer submits application",
            "System validates required fields are complete",
            "System creates application record in LOS",
            "System generates application confirmation number",
            "System triggers Loan Estimate generation (must be sent within 3 business days per TRID)",
            "Customer receives confirmation email with application number and next steps",
        ],
        "inputs": [
            "Borrower personal information (name, SSN, DOB, contact info)",
            "Employment information (employer name, address, phone, job title, years employed)",
            "Income information (annual income, monthly income, overtime, bonuses)",
            "Asset information (bank accounts, investments, real estate)",
            "Liability information (credit cards, loans, alimony, child support)",
            "Property information (address, purchase price, property type)",
            "Loan information (loan amount, down payment, loan purpose)",
            "Customer signature and consent",
        ],
        "outputs": [
            "Completed Uniform Residential Loan Application (1003)",
            "Application record in LOS",
            "Application confirmation number",
            "Trigger for Loan Estimate generation",
            "Application submission timestamp",
        ],
        "prerequisites": [
            "Customer must be 18 years or older",
            "Customer must have valid SSN",
            "Customer must provide accurate information",
            "Customer must consent to credit inquiry",
        ],
        "success_criteria": [
            "All required fields completed accurately",
            "Application successfully submitted and stored",
            "Customer receives confirmation within 5 minutes",
            "Loan Estimate triggered for generation",
            "Application assigned to loan officer/processor",
        ],
        "exceptions": [
            {
                "condition": "Customer abandons application partway through",
                "action": "Save progress and send reminder email. Allow customer to resume where they left off.",
            },
            {
                "condition": "Required fields missing or invalid format",
                "action": "Display inline validation errors and prevent submission until corrected",
            },
            {
                "condition": "Duplicate application detected (same SSN and property)",
                "action": "Alert customer and link to existing application or allow them to proceed if intentional",
            },
        ],
        "regulatory_context": "The Uniform Residential Loan Application (1003) is required by Fannie Mae, Freddie Mac, and FHA/VA guidelines. Submission triggers TRID requirements including mandatory Loan Estimate delivery within 3 business days. All information must be collected in compliance with fair lending laws and cannot discriminate based on protected characteristics.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-sys-application-validation",
        "name": "System Validates Application Completeness",
        "category": "SYSTEM",
        "type": "VALIDATION",
        "moduleId": "module-application-intake",
        "summary": "Automated validation of required fields and application completeness",
        "steps": [
            "Check all required fields are populated",
            "Validate data formats (SSN, dates, amounts)",
            "Check for duplicate applications",
            "Generate completeness report",
        ],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-cust-initial-doc-upload",
        "name": "Customer Uploads Initial Documents",
        "category": "CUSTOMER_FACING",
        "type": "PROCESS",
        "moduleId": "module-application-intake",
        "summary": "Customer uploads initial required documents (ID, pay stubs, bank statements)",
        "steps": [
            "Customer accesses document upload portal",
            "Customer selects document type",
            "Customer uploads document file",
            "System confirms successful upload",
        ],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-completeness-review",
        "name": "Processor Reviews Application Completeness",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-application-intake",
        "summary": "Processor reviews application and documents for completeness",
        "steps": [
            "Processor opens application in LOS",
            "Review all application sections",
            "Check uploaded documents",
            "Identify missing items",
            "Generate initial document request if needed",
        ],
        "criticality": "HIGH",
    },
    # Income Verification Module
    {
        "id_prefix": "atom-cust-w2-upload",
        "name": "Customer Uploads W-2 Forms",
        "category": "CUSTOMER_FACING",
        "type": "PROCESS",
        "moduleId": "module-income-verification",
        "summary": "Customer uploads W-2 forms for income verification as part of the loan application process",
        "description": "The W-2 upload process is a critical step in income verification for salaried employees. Customers receive a document request through the loan portal or email, prompting them to upload their most recent W-2 forms (typically the two most recent tax years). W-2 forms provide official documentation of wages, tips, and other compensation reported to the IRS, making them a primary source of income verification. The system accepts various file formats (PDF, JPG, PNG) and performs basic validation to ensure the document is readable and appears to be a W-2 form. This process is essential for verifying the income stated on the loan application and calculating qualifying income.",
        "purpose": "Obtain official income documentation from customers to verify stated income on the loan application. W-2 forms are required for salaried employees and provide IRS-verified income data that is critical for underwriting decisions.",
        "business_context": "W-2 uploads are one of the most common document requests in mortgage processing. The process must be user-friendly and secure, as customers are handling sensitive tax documents. The bank must comply with data security regulations (including IRS requirements for handling tax documents) and ensure documents are stored securely. Delays in W-2 uploads are a common cause of loan processing delays, so the system must make it easy for customers to upload documents and provide clear feedback on document status.",
        "steps": [
            "Customer receives document request notification via email or loan portal",
            "Customer logs into secure loan portal",
            "Customer navigates to document upload section",
            "Customer selects 'W-2 Form' from document type dropdown",
            "Customer selects tax year (e.g., 2023, 2022)",
            "Customer clicks 'Choose File' and selects W-2 PDF or image from their device",
            "System validates file format (PDF, JPG, PNG accepted)",
            "System performs basic image quality check (not blurry, readable)",
            "System extracts basic data from W-2 using OCR (if available)",
            "System stores document in secure document management system",
            "System updates loan file status to show W-2 received",
            "Customer receives confirmation that document was successfully uploaded",
            "System notifies processor that new document is available for review",
        ],
        "inputs": [
            "W-2 form file (PDF, JPG, or PNG format)",
            "Tax year for the W-2",
            "Customer authentication (logged into portal)",
        ],
        "outputs": [
            "Stored W-2 document in document management system",
            "Document status update in LOS",
            "Confirmation notification to customer",
            "Notification to processor of new document",
        ],
        "prerequisites": [
            "Customer must have active loan application",
            "Customer must have received document request",
            "Customer must have W-2 forms available",
            "Customer must have access to loan portal",
        ],
        "success_criteria": [
            "Document successfully uploaded and stored",
            "Document is readable and not corrupted",
            "Customer receives confirmation within 30 seconds",
            "Processor is notified within 5 minutes",
            "Document is properly indexed and searchable",
        ],
        "exceptions": [
            {
                "condition": "File format not supported",
                "action": "Display error message with supported formats and allow customer to retry",
            },
            {
                "condition": "File size exceeds 10MB limit",
                "action": "Display error message requesting customer to compress or split file",
            },
            {
                "condition": "Document appears blurry or unreadable",
                "action": "Accept upload but flag for processor review - processor may request new upload",
            },
            {
                "condition": "Customer uploads wrong document type",
                "action": "Accept upload but flag for processor to review and request correct document",
            },
        ],
        "regulatory_context": "W-2 forms contain sensitive tax information protected under IRS regulations and privacy laws. The bank must ensure secure storage, proper access controls, and retention policies compliant with IRS requirements. Documents must be retained for the required period (typically 7 years) and securely destroyed when no longer needed.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-w2-review",
        "name": "Processor Reviews W-2 Forms",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-income-verification",
        "summary": "Processor reviews W-2 forms for accuracy and completeness",
        "steps": [
            "Processor opens W-2 documents",
            "Verify W-2 matches application income",
            "Check for multiple employers",
            "Verify tax year consistency",
            "Flag any discrepancies",
        ],
        "criticality": "HIGH",
        "exceptions": [
            {"condition": "Blurry or unreadable W-2", "action": "Request new W-2 upload"},
            {"condition": "W-2 income doesn't match application", "action": "Escalate to underwriter"},
        ],
    },
    {
        "id_prefix": "atom-cust-tax-return-upload",
        "name": "Customer Uploads Tax Returns",
        "category": "CUSTOMER_FACING",
        "type": "PROCESS",
        "moduleId": "module-income-verification",
        "summary": "Customer uploads signed tax returns (1040) for self-employed or complex income",
        "steps": [
            "Customer receives tax return request",
            "Customer uploads signed 1040 forms",
            "System confirms receipt",
        ],
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-tax-return-analysis",
        "name": "Processor Analyzes Tax Returns",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-income-verification",
        "summary": "Detailed analysis of tax returns for self-employed borrowers",
        "steps": [
            "Review Schedule C (business income)",
            "Calculate average income over 2 years",
            "Identify write-offs and deductions",
            "Calculate qualifying income",
            "Document analysis in LOS",
        ],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-sys-income-calculation",
        "name": "System Calculates Qualifying Income",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-income-verification",
        "summary": "Automated income calculation engine using verified documents",
        "steps": [
            "Extract income data from documents",
            "Apply income calculation rules",
            "Calculate base income",
            "Apply stability factors",
            "Generate income worksheet",
        ],
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-voi-verification",
        "name": "Processor Performs VOI (Verification of Income)",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-income-verification",
        "summary": "Request verification of income directly from employer",
        "steps": [
            "Generate VOI request form",
            "Send to employer via fax/email",
            "Receive completed VOI",
            "Compare VOI to pay stubs and W-2",
            "Resolve any discrepancies",
        ],
        "criticality": "HIGH",
    },
    # Asset Verification Module
    {
        "id_prefix": "atom-cust-bank-statement-upload",
        "name": "Customer Uploads Bank Statements",
        "category": "CUSTOMER_FACING",
        "type": "PROCESS",
        "moduleId": "module-asset-verification",
        "summary": "Customer uploads 2 months of bank statements for asset verification",
        "steps": [
            "Customer receives bank statement request",
            "Customer downloads statements from bank",
            "Customer uploads statements",
            "System confirms receipt",
        ],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-asset-source-review",
        "name": "Processor Reviews Asset Source",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-asset-verification",
        "summary": "Review bank statements for large deposits and source of funds",
        "steps": [
            "Review 2 months of bank statements",
            "Identify large deposits (>25% of monthly income)",
            "Request source of funds documentation",
            "Verify sufficient reserves",
            "Document findings",
        ],
        "criticality": "HIGH",
        "exceptions": [
            {"condition": "Large unexplained deposit", "action": "Request gift letter or explanation"},
            {"condition": "Insufficient reserves", "action": "Request additional asset documentation"},
        ],
    },
    {
        "id_prefix": "atom-sys-reserve-calculation",
        "name": "System Calculates Reserves",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-asset-verification",
        "summary": "Calculate required and available reserves based on program guidelines",
        "steps": [
            "Retrieve verified asset balances",
            "Apply program reserve requirements",
            "Calculate months of reserves",
            "Compare to requirements",
            "Generate reserve worksheet",
        ],
        "criticality": "MEDIUM",
    },
    # Credit Analysis Module
    {
        "id_prefix": "atom-sys-credit-report-pull",
        "name": "System Pulls Full Credit Report",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-credit-analysis",
        "summary": "Pull tri-merge credit report from all three bureaus",
        "steps": [
            "System calls credit bureau API",
            "Retrieve Experian, Equifax, and TransUnion reports",
            "Merge reports into tri-merge",
            "Calculate middle credit score",
            "Store credit report in LOS",
        ],
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-credit-analysis",
        "name": "Processor Analyzes Credit Report",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-credit-analysis",
        "summary": "Detailed review of credit history, scores, and trade lines",
        "steps": [
            "Review credit scores from all bureaus",
            "Analyze payment history",
            "Review trade lines and balances",
            "Identify derogatory items",
            "Calculate total monthly debt payments",
            "Document credit analysis",
        ],
        "criticality": "CRITICAL",
        "exceptions": [
            {"condition": "Credit score below minimum", "action": "Route to manual underwriting"},
            {"condition": "Recent bankruptcy or foreclosure", "action": "Require explanation letter"},
        ],
    },
    {
        "id_prefix": "atom-bo-derogatory-review",
        "name": "Processor Reviews Derogatory Items",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-credit-analysis",
        "summary": "Review and document explanation for derogatory credit items",
        "steps": [
            "Identify all derogatory items",
            "Request explanation letter from borrower",
            "Review explanation for reasonableness",
            "Document in credit analysis",
            "Flag for underwriter review if significant",
        ],
        "criticality": "HIGH",
    },
    # Property Appraisal Module
    {
        "id_prefix": "atom-bo-appraisal-order",
        "name": "Processor Orders Property Appraisal",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-property-appraisal",
        "summary": "Order property appraisal from approved appraiser",
        "steps": [
            "Select appraiser from approved list",
            "Generate appraisal order",
            "Send order to appraiser",
            "Schedule property inspection",
            "Track appraisal status",
        ],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-sys-appraisal-received",
        "name": "System Receives Appraisal Report",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-property-appraisal",
        "summary": "Appraisal report uploaded and received in system",
        "steps": [
            "Appraiser uploads completed appraisal",
            "System receives and stores appraisal",
            "Notify processor of receipt",
            "Extract key data (value, condition, comps)",
        ],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-appraisal-review",
        "name": "Processor Reviews Appraisal",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-property-appraisal",
        "summary": "Review appraisal for accuracy, value reasonableness, and compliance",
        "steps": [
            "Review property description",
            "Verify comparable sales",
            "Check value reasonableness",
            "Review property condition",
            "Verify compliance with guidelines",
            "Flag any issues for underwriter",
        ],
        "criticality": "CRITICAL",
        "exceptions": [
            {"condition": "Appraised value below purchase price", "action": "Route to underwriter for LTV adjustment"},
            {"condition": "Property condition issues", "action": "Request repairs or value adjustment"},
        ],
    },
    # Title & Insurance Module
    {
        "id_prefix": "atom-sys-title-order",
        "name": "System Orders Title Search",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-title-insurance",
        "summary": "Automated title search order to title company",
        "steps": [
            "System generates title order",
            "Send to selected title company",
            "Track title search status",
            "Receive preliminary title report",
        ],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-title-review",
        "name": "Processor Reviews Title Report",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-title-insurance",
        "summary": "Review title report for liens, encumbrances, and ownership issues",
        "steps": [
            "Review property ownership",
            "Check for existing liens",
            "Verify seller has clear title",
            "Identify any title issues",
            "Request title insurance commitment",
        ],
        "criticality": "CRITICAL",
        "exceptions": [
            {"condition": "Existing liens on property", "action": "Require lien payoff at closing"},
            {"condition": "Title defects", "action": "Require title curative work"},
        ],
    },
    {
        "id_prefix": "atom-sys-flood-determination",
        "name": "System Performs Flood Determination",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-title-insurance",
        "summary": "Automated flood zone determination for property",
        "steps": [
            "Submit property address to flood determination service",
            "Receive flood zone designation",
            "Store flood determination certificate",
            "Flag if flood insurance required",
        ],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-cust-insurance-verification",
        "name": "Customer Provides Hazard Insurance",
        "category": "CUSTOMER_FACING",
        "type": "PROCESS",
        "moduleId": "module-title-insurance",
        "summary": "Customer provides proof of hazard insurance coverage",
        "steps": [
            "Customer receives insurance request",
            "Customer contacts insurance agent",
            "Customer uploads insurance declaration page",
            "System confirms receipt",
        ],
        "criticality": "HIGH",
    },
    # Underwriting Decision Module
    {
        "id_prefix": "atom-sys-aus-submission",
        "name": "System Submits to AUS (DU/LP)",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-underwriting-decision",
        "summary": "Submit loan to automated underwriting system (Desktop Underwriter or Loan Prospector)",
        "steps": [
            "Package loan data for AUS",
            "Submit to Fannie Mae DU or Freddie Mac LP",
            "Receive AUS findings",
            "Store findings in LOS",
            "Route based on findings (Approve/Eligible/Refer)",
        ],
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-manual-underwrite",
        "name": "Underwriter Performs Manual Underwrite",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-underwriting-decision",
        "summary": "Manual underwriting for loans that don't meet AUS guidelines",
        "steps": [
            "Underwriter reviews complete file",
            "Analyze credit, income, assets, property",
            "Apply manual underwriting guidelines",
            "Calculate risk factors",
            "Make loan decision",
            "Document decision rationale",
        ],
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-dec-loan-decision",
        "name": "Loan Decision (Approve/Deny/Suspend)",
        "category": "BACK_OFFICE",
        "type": "DECISION",
        "moduleId": "module-underwriting-decision",
        "summary": "Final loan decision based on underwriting analysis",
        "steps": [
            "Review all underwriting findings",
            "Apply program guidelines",
            "Make approve/deny/suspend decision",
            "Generate decision letter",
            "Notify customer and loan officer",
        ],
        "criticality": "CRITICAL",
    },
    # Conditions Management Module
    {
        "id_prefix": "atom-sys-condition-generation",
        "name": "System Generates Conditions",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-conditions-management",
        "summary": "Automated generation of underwriting conditions based on AUS findings",
        "steps": [
            "Parse AUS findings",
            "Generate standard conditions",
            "Generate specific conditions based on findings",
            "Assign conditions to appropriate parties",
            "Notify processor of conditions",
        ],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-condition-tracking",
        "name": "Processor Tracks Condition Fulfillment",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-conditions-management",
        "summary": "Track status of all underwriting conditions",
        "steps": [
            "Monitor condition status dashboard",
            "Request documents from customer",
            "Receive condition fulfillment",
            "Update condition status",
            "Notify underwriter when conditions cleared",
        ],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-condition-clearance",
        "name": "Underwriter Clears Conditions",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-conditions-management",
        "summary": "Underwriter reviews and clears fulfilled conditions",
        "steps": [
            "Review condition fulfillment documents",
            "Verify condition is satisfied",
            "Clear condition in LOS",
            "Check if all conditions cleared",
            "Proceed to final approval if complete",
        ],
        "criticality": "CRITICAL",
    },
    # Closing Preparation Module
    {
        "id_prefix": "atom-sys-closing-disclosure",
        "name": "System Generates Closing Disclosure",
        "category": "SYSTEM",
        "type": "DOCUMENT",
        "moduleId": "module-closing-preparation",
        "summary": "Generate TRID-compliant Closing Disclosure (CD) form",
        "steps": [
            "Calculate all closing costs",
            "Populate CD with loan terms",
            "Generate initial CD",
            "Send to customer (3 days before closing)",
            "Generate final CD if changes occur",
        ],
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-closing-doc-prep",
        "name": "Closing Coordinator Prepares Documents",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-closing-preparation",
        "summary": "Prepare all closing documents for signing",
        "steps": [
            "Generate promissory note",
            "Generate mortgage/deed of trust",
            "Prepare all required disclosures",
            "Prepare settlement statement",
            "Package documents for closing",
        ],
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-cust-closing-scheduling",
        "name": "Customer Schedules Closing",
        "category": "CUSTOMER_FACING",
        "type": "PROCESS",
        "moduleId": "module-closing-preparation",
        "summary": "Coordinate closing date and time with all parties",
        "steps": [
            "Closing coordinator contacts customer",
            "Customer selects preferred closing date",
            "Coordinate with title company",
            "Confirm all parties available",
            "Schedule closing appointment",
        ],
        "criticality": "HIGH",
    },
    # Funding & Recording Module
    {
        "id_prefix": "atom-cust-closing-signing",
        "name": "Customer Signs Closing Documents",
        "category": "CUSTOMER_FACING",
        "type": "PROCESS",
        "moduleId": "module-funding-recording",
        "summary": "Customer attends closing and signs all loan documents",
        "steps": [
            "Customer arrives at closing location",
            "Review closing disclosure",
            "Sign promissory note",
            "Sign mortgage/deed of trust",
            "Sign all required disclosures",
            "Receive keys (if purchase)",
        ],
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-sys-funding-wire",
        "name": "System Initiates Funding Wire",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-funding-recording",
        "summary": "Automated wire transfer of loan funds to title company",
        "steps": [
            "Verify all documents signed",
            "Calculate final funding amount",
            "Initiate wire transfer",
            "Confirm wire receipt",
            "Update loan status to funded",
        ],
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-sys-deed-recording",
        "name": "System Records Deed",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-funding-recording",
        "summary": "Record mortgage/deed of trust with county recorder",
        "steps": [
            "Submit recorded copy request to title company",
            "Title company records deed",
            "Receive recorded copy",
            "Store in document management system",
            "Update loan status",
        ],
        "criticality": "HIGH",
    },
    # Quality Control Module
    {
        "id_prefix": "atom-bo-post-closing-audit",
        "name": "QC Auditor Performs Post-Closing Review",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-quality-control",
        "summary": "Quality control review of closed loan file",
        "steps": [
            "Select loan for QC review",
            "Review all loan documents",
            "Verify compliance with guidelines",
            "Check for documentation errors",
            "Document findings",
            "Resolve any issues found",
        ],
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-sys-document-imaging",
        "name": "System Images Loan Documents",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-quality-control",
        "summary": "Scan and store all loan documents in document management system",
        "steps": [
            "Scan all paper documents",
            "Index documents by type",
            "Store in document management system",
            "Verify image quality",
            "Archive original documents",
        ],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-loan-sale-prep",
        "name": "Processor Prepares Loan for Sale",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-quality-control",
        "summary": "Prepare loan file for sale to secondary market (Fannie/Freddie)",
        "steps": [
            "Verify all documents complete",
            "Prepare loan data file",
            "Submit to loan delivery system",
            "Resolve any delivery errors",
            "Confirm loan purchase",
        ],
        "criticality": "HIGH",
    },
    # Regulatory & Policy Atoms
    {
        "id_prefix": "atom-pol-trid-compliance",
        "name": "TRID Compliance Policy",
        "category": "BACK_OFFICE",
        "type": "POLICY",
        "moduleId": None,
        "summary": "Truth in Lending Act and RESPA Integrated Disclosure (TRID) compliance requirements",
        "steps": [
            "Provide Loan Estimate within 3 business days",
            "Provide Closing Disclosure 3 business days before closing",
            "Monitor for changes requiring redisclosure",
            "Maintain compliance documentation",
        ],
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-pol-fair-lending",
        "name": "Fair Lending Policy",
        "category": "BACK_OFFICE",
        "type": "POLICY",
        "moduleId": None,
        "summary": "Equal Credit Opportunity Act and Fair Housing Act compliance",
        "steps": [
            "Ensure non-discriminatory lending practices",
            "Monitor for disparate impact",
            "Maintain fair lending documentation",
            "Conduct regular fair lending training",
        ],
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-ctrl-credit-policy",
        "name": "Credit Policy Control",
        "category": "BACK_OFFICE",
        "type": "CONTROL",
        "moduleId": None,
        "summary": "Minimum credit score and credit history requirements",
        "steps": [
            "Verify minimum credit score met",
            "Review credit history length",
            "Check for recent credit issues",
            "Apply credit policy exceptions if needed",
        ],
        "criticality": "HIGH",
    },
    # System & Role Atoms
    {
        "id_prefix": "atom-sys-los-platform",
        "name": "Loan Origination System (LOS)",
        "category": "SYSTEM",
        "type": "SYSTEM",
        "moduleId": None,
        "summary": "Primary loan origination system for managing loan applications",
        "steps": [],
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-sys-doc-management",
        "name": "Document Management System",
        "category": "SYSTEM",
        "type": "SYSTEM",
        "moduleId": None,
        "summary": "System for storing and managing loan documents",
        "steps": [],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-role-loan-officer",
        "name": "Loan Officer",
        "category": "BACK_OFFICE",
        "type": "ROLE",
        "moduleId": None,
        "summary": "Primary customer contact and loan originator",
        "steps": [],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-role-processor",
        "name": "Loan Processor",
        "category": "BACK_OFFICE",
        "type": "ROLE",
        "moduleId": None,
        "summary": "Processes loan applications and collects documentation",
        "steps": [],
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-role-underwriter",
        "name": "Underwriter",
        "category": "BACK_OFFICE",
        "type": "ROLE",
        "moduleId": None,
        "summary": "Makes loan decisions and manages underwriting conditions",
        "steps": [],
        "criticality": "CRITICAL",
    },
    # Additional Granular Atoms - Income Verification Details
    {
        "id_prefix": "atom-cust-pay-stub-upload",
        "name": "Customer Uploads Pay Stubs",
        "category": "CUSTOMER_FACING",
        "type": "PROCESS",
        "moduleId": "module-income-verification",
        "summary": "Customer uploads most recent pay stubs (typically 2 months) to verify current income",
        "description": "Pay stubs provide current income verification and are required alongside W-2 forms to verify ongoing employment and current income levels. Customers upload pay stubs through the secure portal, and the system validates the format and extracts key information.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-pay-stub-review",
        "name": "Processor Reviews Pay Stubs",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-income-verification",
        "summary": "Processor reviews pay stubs to verify current income, employment status, and YTD earnings",
        "description": "Pay stub review ensures the customer's current income matches what was stated on the application and verifies they are still employed. Processor checks pay frequency, gross pay, deductions, and year-to-date totals.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-income-stability-check",
        "name": "Processor Checks Income Stability",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-income-verification",
        "summary": "Processor analyzes income history to determine if income is stable, increasing, or decreasing",
        "description": "Income stability is a key underwriting factor. Processor reviews income over the past 2 years to identify trends and ensure income is likely to continue. Declining income may require additional documentation or explanation.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-bonus-overtime-calculation",
        "name": "Processor Calculates Bonus and Overtime Income",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-income-verification",
        "summary": "Processor calculates qualifying bonus and overtime income based on 2-year average",
        "description": "Bonus and overtime income can only be used if it's consistent over 2 years. Processor calculates the 2-year average and applies it to qualifying income calculations.",
        "criticality": "MEDIUM",
    },
    # Asset Verification Details
    {
        "id_prefix": "atom-cust-asset-statement-upload",
        "name": "Customer Uploads Asset Statements",
        "category": "CUSTOMER_FACING",
        "type": "PROCESS",
        "moduleId": "module-asset-verification",
        "summary": "Customer uploads investment account statements, retirement accounts, and other asset documentation",
        "description": "Asset statements verify the customer has sufficient funds for down payment and reserves. Customers upload statements from various account types including checking, savings, investment, and retirement accounts.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-gift-letter-review",
        "name": "Processor Reviews Gift Letter",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-asset-verification",
        "summary": "Processor reviews gift letter when customer receives funds from family member for down payment",
        "description": "Gift letters are required when down payment funds come from a gift rather than the borrower's own assets. Processor verifies the gift letter meets requirements and that gift funds are properly sourced.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-large-deposit-review",
        "name": "Processor Reviews Large Deposits",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-asset-verification",
        "summary": "Processor identifies and reviews large deposits (typically >25% of monthly income) to verify source of funds",
        "description": "Large deposits require explanation to ensure funds are legitimate and not borrowed. Processor flags large deposits and requests documentation of the source.",
        "criticality": "HIGH",
    },
    # Credit Analysis Details
    {
        "id_prefix": "atom-bo-credit-score-analysis",
        "name": "Processor Analyzes Credit Scores",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-credit-analysis",
        "summary": "Processor reviews credit scores from all three bureaus and determines middle score",
        "description": "Credit scores from Experian, Equifax, and TransUnion are compared, and the middle score is used for underwriting. Processor verifies scores meet minimum requirements.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-payment-history-review",
        "name": "Processor Reviews Payment History",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-credit-analysis",
        "summary": "Processor reviews 24-month payment history for all trade lines to identify late payments",
        "description": "Payment history is critical for credit assessment. Processor reviews all accounts for late payments, defaults, or collections and documents findings.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-debt-ratio-calculation",
        "name": "Processor Calculates Total Debt Ratios",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-credit-analysis",
        "summary": "Processor calculates front-end and back-end debt-to-income ratios using verified income and debts",
        "description": "Debt ratios are key underwriting metrics. Front-end ratio is housing payment divided by income. Back-end ratio includes all debts. Both must meet program guidelines.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-collection-account-review",
        "name": "Processor Reviews Collection Accounts",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-credit-analysis",
        "summary": "Processor reviews collection accounts and determines if they must be paid off before closing",
        "description": "Collection accounts may need to be paid off depending on amount and program guidelines. Processor reviews each collection and determines requirements.",
        "criticality": "MEDIUM",
    },
    # Property Appraisal Details
    {
        "id_prefix": "atom-bo-appraisal-scheduling",
        "name": "Processor Schedules Property Appraisal",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-property-appraisal",
        "summary": "Processor coordinates with appraiser to schedule property inspection date and time",
        "description": "Appraisal scheduling requires coordination between appraiser, property owner, and real estate agent. Processor ensures all parties are available and property is accessible.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-comparable-sales-review",
        "name": "Processor Reviews Comparable Sales",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-property-appraisal",
        "summary": "Processor reviews comparable sales used in appraisal to verify they are appropriate",
        "description": "Comparable sales must be similar properties sold recently in the same area. Processor verifies comparables are appropriate and supports the appraised value.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-property-condition-review",
        "name": "Processor Reviews Property Condition",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-property-appraisal",
        "summary": "Processor reviews appraisal property condition notes and identifies any required repairs",
        "description": "Property condition issues may require repairs before closing. Processor reviews condition notes and determines if repairs are required or if value adjustments are needed.",
        "criticality": "HIGH",
    },
    # Title & Insurance Details
    {
        "id_prefix": "atom-bo-title-issue-resolution",
        "name": "Processor Resolves Title Issues",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-title-insurance",
        "summary": "Processor works with title company to resolve any liens, judgments, or other title defects",
        "description": "Title issues must be resolved before closing. Processor coordinates with title company and customer to clear any liens, judgments, or other defects that could prevent clear title transfer.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-flood-insurance-verification",
        "name": "Processor Verifies Flood Insurance",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-title-insurance",
        "summary": "Processor verifies flood insurance is obtained when property is in flood zone",
        "description": "Properties in flood zones require flood insurance. Processor verifies the property's flood zone status and ensures flood insurance is obtained and meets requirements.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-homeowners-insurance-review",
        "name": "Processor Reviews Homeowners Insurance",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-title-insurance",
        "summary": "Processor reviews homeowners insurance policy to ensure coverage meets lender requirements",
        "description": "Homeowners insurance must meet lender requirements for coverage amount and include lender as loss payee. Processor verifies policy details before closing.",
        "criticality": "HIGH",
    },
    # Underwriting Details
    {
        "id_prefix": "atom-bo-risk-assessment",
        "name": "Underwriter Performs Risk Assessment",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-underwriting-decision",
        "summary": "Underwriter evaluates overall loan risk by analyzing credit, income, assets, and property",
        "description": "Risk assessment is a comprehensive evaluation of all loan factors. Underwriter weighs credit risk, income stability, asset sufficiency, and property value to determine overall loan risk.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-program-eligibility-check",
        "name": "Underwriter Verifies Program Eligibility",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-underwriting-decision",
        "summary": "Underwriter verifies loan meets all program guidelines (Fannie Mae, Freddie Mac, FHA, VA, etc.)",
        "description": "Each loan program has specific eligibility requirements. Underwriter verifies the loan meets all guidelines for the selected program including loan amount limits, credit requirements, and property type restrictions.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-compensating-factors-analysis",
        "name": "Underwriter Analyzes Compensating Factors",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-underwriting-decision",
        "summary": "Underwriter identifies compensating factors that offset risk when loan is borderline",
        "description": "Compensating factors like large down payment, significant reserves, or excellent credit history can offset other risk factors. Underwriter documents these factors to support approval decision.",
        "criticality": "MEDIUM",
    },
    # Conditions Management Details
    {
        "id_prefix": "atom-bo-prior-to-doc-conditions",
        "name": "Processor Tracks Prior-to-Doc Conditions",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-conditions-management",
        "summary": "Processor tracks conditions that must be cleared before loan documents can be prepared",
        "description": "Prior-to-doc conditions are critical items that must be resolved before closing documents can be generated. Processor monitors these conditions closely to avoid closing delays.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-prior-to-funding-conditions",
        "name": "Processor Tracks Prior-to-Funding Conditions",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-conditions-management",
        "summary": "Processor tracks conditions that must be cleared before loan can be funded",
        "description": "Prior-to-funding conditions are items that must be resolved before wire transfer can be initiated. These are typically less critical but still required for funding.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-condition-aging-review",
        "name": "Processor Reviews Condition Aging",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-conditions-management",
        "summary": "Processor monitors how long conditions have been outstanding and escalates if needed",
        "description": "Conditions that remain outstanding too long can delay closing. Processor reviews condition aging and escalates to underwriter or supervisor if conditions are not being resolved timely.",
        "criticality": "MEDIUM",
    },
    # Closing Details
    {
        "id_prefix": "atom-bo-closing-disclosure-review",
        "name": "Customer Reviews Closing Disclosure",
        "category": "CUSTOMER_FACING",
        "type": "PROCESS",
        "moduleId": "module-closing-preparation",
        "summary": "Customer reviews Closing Disclosure to verify all costs and loan terms are correct",
        "description": "TRID requires customers receive Closing Disclosure 3 days before closing. Customer reviews all costs, loan terms, and cash to close to ensure accuracy before signing.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-closing-package-assembly",
        "name": "Closing Coordinator Assembles Closing Package",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-closing-preparation",
        "summary": "Closing coordinator assembles all required documents into closing package for signing",
        "description": "Closing package includes promissory note, mortgage/deed of trust, all disclosures, settlement statement, and other required documents. Coordinator ensures all documents are included and properly executed.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-notary-coordination",
        "name": "Closing Coordinator Coordinates Notary",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-closing-preparation",
        "summary": "Closing coordinator arranges for notary to witness document signing at closing",
        "description": "Many loan documents require notarization. Coordinator arranges for qualified notary to be present at closing to witness signatures and notarize documents.",
        "criticality": "HIGH",
    },
    # Funding Details
    {
        "id_prefix": "atom-bo-funding-verification",
        "name": "Processor Verifies Funding Requirements",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-funding-recording",
        "summary": "Processor verifies all funding requirements are met before initiating wire transfer",
        "description": "Before funding, processor verifies all conditions are cleared, documents are signed, and title is clear. This prevents funding loans that don't meet requirements.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-sys-wire-verification",
        "name": "System Verifies Wire Transfer",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-funding-recording",
        "summary": "System verifies wire transfer was successfully received by title company",
        "description": "After initiating wire transfer, system monitors for confirmation that funds were received. Title company confirms receipt before closing can proceed.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-funding-reconciliation",
        "name": "Processor Reconciles Funding Amount",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-funding-recording",
        "summary": "Processor reconciles actual funding amount with loan amount and verifies accuracy",
        "description": "Funding amount must match loan amount exactly. Processor reconciles wire transfer amount with loan documents to ensure accuracy before and after funding.",
        "criticality": "HIGH",
    },
    # Post-Closing Details
    {
        "id_prefix": "atom-bo-document-audit",
        "name": "QC Auditor Performs Document Audit",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-quality-control",
        "summary": "QC auditor reviews all loan documents for completeness and accuracy",
        "description": "Document audit ensures all required documents are present, properly executed, and accurate. Auditor checks signatures, dates, and document completeness.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-data-accuracy-review",
        "name": "QC Auditor Reviews Data Accuracy",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-quality-control",
        "summary": "QC auditor verifies loan data accuracy by comparing documents to LOS data",
        "description": "Data accuracy review ensures information in LOS matches loan documents. Auditor compares key fields like loan amount, interest rate, and borrower information.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-loan-delivery-prep",
        "name": "Processor Prepares Loan for Secondary Market Delivery",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-quality-control",
        "summary": "Processor prepares loan file for sale to Fannie Mae, Freddie Mac, or other investors",
        "description": "Loan delivery requires specific file formats and data requirements. Processor ensures loan meets investor requirements and prepares delivery file with all required data and documents.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-sys-loan-delivery-submission",
        "name": "System Submits Loan to Secondary Market",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-quality-control",
        "summary": "System submits loan file to Fannie Mae or Freddie Mac loan delivery system",
        "description": "Automated submission to secondary market requires proper file formatting and data validation. System submits loan and receives confirmation of purchase or identifies any errors requiring correction.",
        "criticality": "HIGH",
    },
    # Additional System Processes
    {
        "id_prefix": "atom-sys-loan-estimate-generation",
        "name": "System Generates Loan Estimate",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-application-intake",
        "summary": "System automatically generates TRID-compliant Loan Estimate within 3 business days of application",
        "description": "Loan Estimate is required by TRID within 3 business days of application submission. System calculates all costs and generates compliant form with loan terms and estimated closing costs.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-sys-redisclosure-trigger",
        "name": "System Triggers Redisclosure Requirements",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-closing-preparation",
        "summary": "System monitors for changes requiring Loan Estimate or Closing Disclosure redisclosure",
        "description": "TRID requires redisclosure if certain changes occur (rate lock, APR change, etc.). System monitors for these changes and triggers redisclosure process when needed.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-sys-rate-lock-processing",
        "name": "System Processes Rate Lock",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-underwriting-decision",
        "summary": "System processes customer's rate lock request and locks interest rate for specified period",
        "description": "Rate locks protect customers from rate increases during processing. System processes lock request, calculates lock fee, and secures rate for the lock period (typically 30-60 days).",
        "criticality": "HIGH",
    },
    # Additional Validation and Verification Atoms
    {
        "id_prefix": "atom-sys-identity-verification",
        "name": "System Performs Identity Verification",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-application-intake",
        "summary": "System verifies customer identity using SSN, address, and other data points",
        "description": "Identity verification prevents fraud by confirming the applicant is who they claim to be. System uses multiple data sources to verify identity.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-employment-verification",
        "name": "Processor Verifies Employment",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-income-verification",
        "summary": "Processor contacts employer to verify employment status, job title, and income",
        "description": "Employment verification confirms the customer is currently employed and verifies income information. Processor calls employer or sends verification form.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-rental-history-verification",
        "name": "Processor Verifies Rental History",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-credit-analysis",
        "summary": "Processor verifies rental payment history for first-time homebuyers",
        "description": "Rental history demonstrates payment responsibility. Processor contacts landlords to verify payment history and rental amount.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-alimony-child-support-verification",
        "name": "Processor Verifies Alimony and Child Support",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-income-verification",
        "summary": "Processor verifies alimony and child support payments when used as income",
        "description": "Alimony and child support can be used as income if properly documented. Processor verifies court orders and payment history.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-retirement-income-verification",
        "name": "Processor Verifies Retirement Income",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-income-verification",
        "summary": "Processor verifies retirement income from pensions, 401k, or Social Security",
        "description": "Retirement income requires different verification than employment income. Processor reviews retirement account statements and benefit letters.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-self-employment-verification",
        "name": "Processor Verifies Self-Employment Income",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-income-verification",
        "summary": "Processor verifies self-employment income using tax returns and profit/loss statements",
        "description": "Self-employment income requires detailed analysis of tax returns and business financials. Processor calculates qualifying income after business expenses.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-rental-income-verification",
        "name": "Processor Verifies Rental Income",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-income-verification",
        "summary": "Processor verifies rental income from investment properties",
        "description": "Rental income can be used if properly documented. Processor reviews lease agreements and tax returns showing rental income.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-asset-verification-letter",
        "name": "Processor Requests Asset Verification Letter",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-asset-verification",
        "summary": "Processor requests verification letter from financial institution confirming account balances",
        "description": "Asset verification letters provide official confirmation of account balances. Processor requests these when statements are unclear or additional verification is needed.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-down-payment-verification",
        "name": "Processor Verifies Down Payment Source",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-asset-verification",
        "summary": "Processor verifies source of down payment funds to ensure they are not borrowed",
        "description": "Down payment must come from borrower's own funds or acceptable gift. Processor traces funds back to source to ensure they are not borrowed.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-reserves-verification",
        "name": "Processor Verifies Reserves",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-asset-verification",
        "summary": "Processor verifies borrower has required reserves after closing",
        "description": "Reserves are liquid assets remaining after closing. Processor verifies borrower has sufficient reserves per program requirements.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-credit-inquiry-review",
        "name": "Processor Reviews Credit Inquiries",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-credit-analysis",
        "summary": "Processor reviews recent credit inquiries to identify other loan applications",
        "description": "Multiple credit inquiries may indicate borrower is shopping for loans or has other applications. Processor reviews inquiries and may request explanation.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-credit-dispute-review",
        "name": "Processor Reviews Credit Disputes",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-credit-analysis",
        "summary": "Processor reviews credit report for disputed items and determines impact",
        "description": "Disputed items on credit report may need to be resolved before closing. Processor reviews disputes and determines if resolution is required.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-liability-verification",
        "name": "Processor Verifies All Liabilities",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-credit-analysis",
        "summary": "Processor verifies all debts listed on credit report and application match",
        "description": "All liabilities must be included in debt calculations. Processor verifies credit report debts match application and identifies any missing debts.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-property-type-verification",
        "name": "Processor Verifies Property Type",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-property-appraisal",
        "summary": "Processor verifies property type (single-family, condo, townhouse, etc.) matches program eligibility",
        "description": "Different property types have different program requirements. Processor verifies property type is eligible for the selected loan program.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-occupancy-verification",
        "name": "Processor Verifies Occupancy Intent",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-property-appraisal",
        "summary": "Processor verifies borrower intends to occupy property as primary residence",
        "description": "Primary residence loans have better terms than investment property loans. Processor verifies occupancy intent through application and documentation.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-hazard-insurance-binder",
        "name": "Processor Obtains Hazard Insurance Binder",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-title-insurance",
        "summary": "Processor obtains insurance binder showing coverage is in place before closing",
        "description": "Hazard insurance binder confirms coverage is active. Processor obtains binder from insurance agent and verifies it meets lender requirements.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-title-commitment-review",
        "name": "Processor Reviews Title Commitment",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-title-insurance",
        "summary": "Processor reviews title commitment to identify any exceptions or requirements",
        "description": "Title commitment shows what will be covered by title insurance and any exceptions. Processor reviews commitment and ensures all requirements are met.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-survey-review",
        "name": "Processor Reviews Property Survey",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-title-insurance",
        "summary": "Processor reviews property survey to identify any encroachments or boundary issues",
        "description": "Property survey shows property boundaries and any structures. Processor reviews survey for encroachments or boundary issues that could affect title.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-underwriting-exception-request",
        "name": "Underwriter Requests Exception",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-underwriting-decision",
        "summary": "Underwriter requests exception approval when loan doesn't meet standard guidelines",
        "description": "Exceptions allow loans that don't meet standard guidelines but have compensating factors. Underwriter documents exception request and justification.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-exception-approval",
        "name": "Underwriting Manager Approves Exception",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-underwriting-decision",
        "summary": "Underwriting manager reviews and approves or denies exception requests",
        "description": "Exception approvals require manager review. Manager evaluates compensating factors and risk before approving exceptions.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-loan-modification-review",
        "name": "Underwriter Reviews Loan Modifications",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-underwriting-decision",
        "summary": "Underwriter reviews any changes to loan terms after initial approval",
        "description": "Loan modifications require re-underwriting. Underwriter reviews changes and determines if re-approval is needed.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-condition-verification",
        "name": "Processor Verifies Condition Fulfillment",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-conditions-management",
        "summary": "Processor verifies that conditions have been properly fulfilled before clearing",
        "description": "Condition verification ensures all requirements are met. Processor reviews condition fulfillment documents and verifies they satisfy the condition.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-expired-condition-review",
        "name": "Processor Reviews Expired Conditions",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-conditions-management",
        "summary": "Processor reviews conditions that have expired and determines if still needed",
        "description": "Some conditions expire if not fulfilled timely. Processor reviews expired conditions and determines if they are still required or can be waived.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-closing-cost-review",
        "name": "Processor Reviews Closing Costs",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-closing-preparation",
        "summary": "Processor reviews all closing costs for accuracy and reasonableness",
        "description": "Closing costs must be accurate and reasonable. Processor reviews all fees and charges to ensure they match estimates and are justified.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-cash-to-close-calculation",
        "name": "Processor Calculates Cash to Close",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-closing-preparation",
        "summary": "Processor calculates total cash required from borrower at closing",
        "description": "Cash to close includes down payment, closing costs, prepaids, and credits. Processor calculates final amount borrower must bring to closing.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-closing-wire-instructions",
        "name": "Processor Provides Wire Instructions",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-closing-preparation",
        "summary": "Processor provides wire transfer instructions for closing funds",
        "description": "Closing funds are typically wired to title company. Processor provides secure wire instructions to borrower for closing funds transfer.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-funding-package-review",
        "name": "Processor Reviews Funding Package",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-funding-recording",
        "summary": "Processor reviews all documents in funding package before releasing funds",
        "description": "Funding package must be complete and accurate before funds are released. Processor reviews all documents to ensure they are properly executed and complete.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-funding-hold-review",
        "name": "Processor Reviews Funding Holds",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-funding-recording",
        "summary": "Processor reviews any funding holds and determines when they can be released",
        "description": "Funding holds prevent funds from being released until certain requirements are met. Processor reviews holds and releases them when conditions are satisfied.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-servicing-transfer-prep",
        "name": "Processor Prepares Loan for Servicing Transfer",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-quality-control",
        "summary": "Processor prepares loan file for transfer to loan servicing department or servicer",
        "description": "After closing, loans are transferred to servicing. Processor ensures all required data and documents are prepared for servicing transfer.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-investor-reporting",
        "name": "Processor Completes Investor Reporting",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-quality-control",
        "summary": "Processor completes required reporting to loan investor (Fannie Mae, Freddie Mac, etc.)",
        "description": "Investors require regular reporting on loan performance and status. Processor completes required reports and submits to investor.",
        "criticality": "MEDIUM",
    },
    {
        "id_prefix": "atom-bo-compliance-audit",
        "name": "QC Auditor Performs Compliance Audit",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-quality-control",
        "summary": "QC auditor reviews loan for compliance with all regulations and guidelines",
        "description": "Compliance audit ensures loan meets all regulatory requirements. Auditor reviews loan against compliance checklist and documents any issues.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-fraud-detection",
        "name": "System Performs Fraud Detection",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-application-intake",
        "summary": "System runs fraud detection algorithms to identify suspicious applications",
        "description": "Fraud detection uses data analytics to identify potentially fraudulent applications. System flags suspicious patterns for manual review.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-fraud-review",
        "name": "Fraud Analyst Reviews Flagged Applications",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-application-intake",
        "summary": "Fraud analyst reviews applications flagged by fraud detection system",
        "description": "Flagged applications require manual fraud review. Analyst investigates suspicious patterns and determines if application is legitimate.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-sys-aus-findings-review",
        "name": "Processor Reviews AUS Findings",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-underwriting-decision",
        "summary": "Processor reviews automated underwriting system findings and conditions",
        "description": "AUS findings provide initial underwriting decision and list required conditions. Processor reviews findings and determines next steps.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-manual-review-trigger",
        "name": "System Triggers Manual Underwriting Review",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-underwriting-decision",
        "summary": "System automatically routes loans to manual underwriting when AUS cannot approve",
        "description": "Loans that don't receive AUS approval are routed to manual underwriting. System identifies these loans and assigns to underwriter.",
        "criticality": "HIGH",
    },
    {
        "id_prefix": "atom-bo-loan-denial-documentation",
        "name": "Underwriter Documents Loan Denial",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-underwriting-decision",
        "summary": "Underwriter documents reason for loan denial in compliance with fair lending laws",
        "description": "Loan denials must be properly documented with specific reasons. Underwriter documents denial reason to ensure compliance with fair lending requirements.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-adverse-action-letter",
        "name": "System Generates Adverse Action Letter",
        "category": "SYSTEM",
        "type": "PROCESS",
        "moduleId": "module-underwriting-decision",
        "summary": "System generates adverse action letter when loan is denied or terms are less favorable",
        "description": "Adverse action letters are required by law when loan is denied or terms are less favorable than requested. System generates compliant letter with specific denial reasons.",
        "criticality": "CRITICAL",
    },
    {
        "id_prefix": "atom-bo-appeal-review",
        "name": "Underwriting Manager Reviews Appeal",
        "category": "BACK_OFFICE",
        "type": "PROCESS",
        "moduleId": "module-underwriting-decision",
        "summary": "Underwriting manager reviews borrower appeal of loan denial",
        "description": "Borrowers can appeal loan denials. Manager reviews appeal, re-evaluates loan, and makes final decision.",
        "criticality": "MEDIUM",
    },
]


def enhance_atom_template(template: Dict) -> Dict:
    """Add default detailed fields to atom template if missing."""
    # Add description if missing (use summary as base)
    if "description" not in template:
        template["description"] = template.get("summary", "")

    # Add purpose if missing
    if "purpose" not in template:
        template["purpose"] = (
            f"This process enables {template.get('name', 'the workflow')} to be completed efficiently and accurately."
        )

    # Add business_context if missing
    if "business_context" not in template:
        template["business_context"] = (
            f"This is a critical component of the home lending process that ensures compliance, accuracy, and customer satisfaction."
        )

    # Add inputs if missing
    if "inputs" not in template and template.get("steps"):
        template["inputs"] = ["Required data and documents as specified in the process steps"]

    # Add outputs if missing
    if "outputs" not in template and template.get("steps"):
        template["outputs"] = ["Processed data and status updates as specified in the process steps"]

    # Add prerequisites if missing
    if "prerequisites" not in template:
        template["prerequisites"] = ["All required upstream processes must be completed"]

    # Add success_criteria if missing
    if "success_criteria" not in template:
        template["success_criteria"] = [
            "Process completed successfully",
            "All required outputs generated",
            "Status updated in system",
        ]

    return template


def make_atom(template: Dict, index: Optional[int] = None) -> Dict:
    """Create an atom from a template."""
    atom_id = template["id_prefix"]
    if index is not None:
        atom_id = f"{template['id_prefix']}-{index:03d}"

    # Determine phaseId from moduleId
    phase_id = None
    if template.get("moduleId"):
        for module in MODULES:
            if module["id"] == template["moduleId"]:
                phase_id = module.get("phaseId")
                break

    # Generate metrics
    metrics = {
        "automation_level": round(random.uniform(0.0, 1.0), 2),
        "avg_cycle_time_mins": random.randint(15, 1440),  # 15 mins to 24 hours
        "error_rate": round(random.uniform(0.0, 0.1), 3),
        "compliance_score": round(random.uniform(0.85, 1.0), 2),
    }

    # Adjust metrics based on type
    if template["category"] == "SYSTEM":
        metrics["automation_level"] = round(random.uniform(0.7, 1.0), 2)
        metrics["avg_cycle_time_mins"] = random.randint(1, 60)
    elif template["category"] == "CUSTOMER_FACING":
        metrics["automation_level"] = round(random.uniform(0.3, 0.8), 2)
        metrics["avg_cycle_time_mins"] = random.randint(60, 2880)  # 1 hour to 2 days
    else:  # BACK_OFFICE
        metrics["automation_level"] = round(random.uniform(0.0, 0.5), 2)
        metrics["avg_cycle_time_mins"] = random.randint(30, 480)  # 30 mins to 8 hours

    # Build comprehensive content
    content = {
        "summary": template["summary"],
        "description": template.get("description", template["summary"]),
        "steps": template.get("steps", []),
    }

    # Add detailed fields if present
    if template.get("purpose"):
        content["purpose"] = template["purpose"]
    if template.get("business_context"):
        content["business_context"] = template["business_context"]
    if template.get("inputs"):
        content["inputs"] = template["inputs"]
    if template.get("outputs"):
        content["outputs"] = template["outputs"]
    if template.get("prerequisites"):
        content["prerequisites"] = template["prerequisites"]
    if template.get("success_criteria"):
        content["success_criteria"] = template["success_criteria"]
    if template.get("regulatory_context"):
        content["regulatory_context"] = template["regulatory_context"]
    if template.get("exceptions"):
        content["exceptions"] = template["exceptions"]

    atom = {
        "id": atom_id,
        "category": template["category"],
        "type": template["type"],
        "name": template["name"],
        "version": "1.0.0",
        "status": random.choices(["ACTIVE", "DRAFT", "DEPRECATED"], [0.85, 0.1, 0.05])[0],
        "owner": random.choice(OWNERS),
        "team": random.choice(TEAMS),
        "ontologyDomain": "Home Lending",
        "criticality": template.get("criticality", "MEDIUM"),
        "phaseId": phase_id,
        "moduleId": template.get("moduleId"),
        "content": content,
        "edges": [],
        "metrics": metrics,
    }

    return atom


def create_edges(atoms: List[Dict]) -> List[Dict]:
    """Create meaningful edges between atoms."""
    edges = []
    atom_dict = {atom["id"]: atom for atom in atoms}  # noqa: F841

    # Define edge patterns based on relationships (using full atom IDs)
    edge_patterns = [
        # Customer actions enable back-office processes
        ("atom-cust-pre-qual-request", "atom-sys-credit-pull", "ENABLES"),
        ("atom-cust-pre-qual-request", "atom-bo-dti-calculation", "ENABLES"),
        ("atom-cust-application-submit", "atom-sys-application-validation", "ENABLES"),
        ("atom-cust-application-submit", "atom-bo-completeness-review", "ENABLES"),
        ("atom-cust-initial-doc-upload", "atom-bo-completeness-review", "ENABLES"),
        ("atom-cust-w2-upload", "atom-bo-w2-review", "ENABLES"),
        ("atom-cust-tax-return-upload", "atom-bo-tax-return-analysis", "ENABLES"),
        ("atom-cust-bank-statement-upload", "atom-bo-asset-source-review", "ENABLES"),
        ("atom-cust-insurance-verification", "atom-bo-closing-doc-prep", "ENABLES"),
        ("atom-cust-closing-scheduling", "atom-bo-closing-doc-prep", "ENABLES"),
        ("atom-cust-closing-signing", "atom-sys-funding-wire", "ENABLES"),
        # System processes enable back-office processes
        ("atom-sys-credit-pull", "atom-bo-dti-calculation", "ENABLES"),
        ("atom-sys-application-validation", "atom-bo-completeness-review", "ENABLES"),
        ("atom-sys-credit-report-pull", "atom-bo-credit-analysis", "ENABLES"),
        ("atom-sys-appraisal-received", "atom-bo-appraisal-review", "ENABLES"),
        ("atom-sys-income-calculation", "atom-sys-aus-submission", "ENABLES"),
        ("atom-sys-reserve-calculation", "atom-sys-aus-submission", "ENABLES"),
        ("atom-sys-aus-submission", "atom-bo-manual-underwrite", "ENABLES"),
        ("atom-sys-condition-generation", "atom-bo-condition-tracking", "ENABLES"),
        ("atom-sys-closing-disclosure", "atom-bo-closing-doc-prep", "ENABLES"),
        ("atom-sys-funding-wire", "atom-sys-deed-recording", "ENABLES"),
        ("atom-sys-deed-recording", "atom-sys-document-imaging", "ENABLES"),
        # Back-office processes enable other processes
        ("atom-bo-w2-review", "atom-sys-income-calculation", "ENABLES"),
        ("atom-bo-tax-return-analysis", "atom-sys-income-calculation", "ENABLES"),
        ("atom-bo-voi-verification", "atom-sys-income-calculation", "ENABLES"),
        ("atom-bo-asset-source-review", "atom-sys-reserve-calculation", "ENABLES"),
        ("atom-bo-credit-analysis", "atom-sys-aus-submission", "ENABLES"),
        ("atom-bo-appraisal-review", "atom-sys-aus-submission", "ENABLES"),
        ("atom-bo-title-review", "atom-sys-aus-submission", "ENABLES"),
        ("atom-bo-manual-underwrite", "atom-dec-loan-decision", "ENABLES"),
        ("atom-bo-condition-clearance", "atom-sys-closing-disclosure", "ENABLES"),
        ("atom-bo-closing-doc-prep", "atom-cust-closing-signing", "ENABLES"),
        ("atom-bo-post-closing-audit", "atom-sys-document-imaging", "ENABLES"),
        ("atom-sys-document-imaging", "atom-bo-loan-sale-prep", "ENABLES"),
        # Processes depend on systems
        ("atom-sys-credit-pull", "atom-sys-los-platform", "USES_COMPONENT"),
        ("atom-sys-application-validation", "atom-sys-los-platform", "USES_COMPONENT"),
        ("atom-sys-income-calculation", "atom-sys-los-platform", "USES_COMPONENT"),
        ("atom-sys-aus-submission", "atom-sys-los-platform", "USES_COMPONENT"),
        ("atom-sys-document-imaging", "atom-sys-doc-management", "USES_COMPONENT"),
        # Processes performed by roles
        ("atom-bo-dti-calculation", "atom-role-loan-officer", "PERFORMED_BY"),
        ("atom-bo-completeness-review", "atom-role-processor", "PERFORMED_BY"),
        ("atom-bo-w2-review", "atom-role-processor", "PERFORMED_BY"),
        ("atom-bo-tax-return-analysis", "atom-role-processor", "PERFORMED_BY"),
        ("atom-bo-credit-analysis", "atom-role-processor", "PERFORMED_BY"),
        ("atom-bo-appraisal-review", "atom-role-processor", "PERFORMED_BY"),
        ("atom-bo-manual-underwrite", "atom-role-underwriter", "PERFORMED_BY"),
        ("atom-dec-loan-decision", "atom-role-underwriter", "PERFORMED_BY"),
        ("atom-bo-condition-clearance", "atom-role-underwriter", "PERFORMED_BY"),
        # Processes governed by policies
        ("atom-sys-closing-disclosure", "atom-pol-trid-compliance", "GOVERNED_BY"),
        ("atom-bo-manual-underwrite", "atom-pol-fair-lending", "GOVERNED_BY"),
        ("atom-bo-credit-analysis", "atom-ctrl-credit-policy", "GOVERNED_BY"),
        ("atom-dec-loan-decision", "atom-ctrl-credit-policy", "GOVERNED_BY"),
        # Data flows
        ("atom-sys-credit-pull", "atom-bo-credit-analysis", "DATA_FLOWS_TO"),
        ("atom-sys-income-calculation", "atom-sys-aus-submission", "DATA_FLOWS_TO"),
        ("atom-sys-reserve-calculation", "atom-sys-aus-submission", "DATA_FLOWS_TO"),
        ("atom-bo-appraisal-review", "atom-sys-aus-submission", "DATA_FLOWS_TO"),
        # Income Verification Additional Edges
        ("atom-cust-pay-stub-upload", "atom-bo-pay-stub-review", "ENABLES"),
        ("atom-bo-pay-stub-review", "atom-sys-income-calculation", "ENABLES"),
        ("atom-bo-w2-review", "atom-bo-income-stability-check", "ENABLES"),
        ("atom-bo-income-stability-check", "atom-sys-income-calculation", "ENABLES"),
        ("atom-bo-pay-stub-review", "atom-bo-bonus-overtime-calculation", "ENABLES"),
        ("atom-bo-bonus-overtime-calculation", "atom-sys-income-calculation", "ENABLES"),
        # Asset Verification Additional Edges
        ("atom-cust-asset-statement-upload", "atom-bo-asset-source-review", "ENABLES"),
        ("atom-bo-asset-source-review", "atom-bo-gift-letter-review", "ENABLES"),
        ("atom-bo-asset-source-review", "atom-bo-large-deposit-review", "ENABLES"),
        ("atom-bo-large-deposit-review", "atom-sys-reserve-calculation", "ENABLES"),
        # Credit Analysis Additional Edges
        ("atom-sys-credit-report-pull", "atom-bo-credit-score-analysis", "ENABLES"),
        ("atom-bo-credit-score-analysis", "atom-bo-credit-analysis", "ENABLES"),
        ("atom-sys-credit-report-pull", "atom-bo-payment-history-review", "ENABLES"),
        ("atom-bo-payment-history-review", "atom-bo-credit-analysis", "ENABLES"),
        ("atom-bo-credit-analysis", "atom-bo-debt-ratio-calculation", "ENABLES"),
        ("atom-bo-debt-ratio-calculation", "atom-sys-aus-submission", "ENABLES"),
        ("atom-sys-credit-report-pull", "atom-bo-collection-account-review", "ENABLES"),
        ("atom-bo-collection-account-review", "atom-bo-condition-tracking", "ENABLES"),
        # Property Appraisal Additional Edges
        ("atom-bo-appraisal-order", "atom-bo-appraisal-scheduling", "ENABLES"),
        ("atom-sys-appraisal-received", "atom-bo-comparable-sales-review", "ENABLES"),
        ("atom-bo-comparable-sales-review", "atom-bo-appraisal-review", "ENABLES"),
        ("atom-sys-appraisal-received", "atom-bo-property-condition-review", "ENABLES"),
        ("atom-bo-property-condition-review", "atom-bo-condition-tracking", "ENABLES"),
        # Title & Insurance Additional Edges
        ("atom-sys-title-order", "atom-bo-title-review", "ENABLES"),
        ("atom-bo-title-review", "atom-bo-title-issue-resolution", "ENABLES"),
        ("atom-bo-title-issue-resolution", "atom-sys-aus-submission", "ENABLES"),
        ("atom-sys-flood-determination", "atom-bo-flood-insurance-verification", "ENABLES"),
        ("atom-bo-flood-insurance-verification", "atom-bo-closing-doc-prep", "ENABLES"),
        ("atom-cust-insurance-verification", "atom-bo-homeowners-insurance-review", "ENABLES"),
        ("atom-bo-homeowners-insurance-review", "atom-bo-closing-doc-prep", "ENABLES"),
        # Underwriting Additional Edges
        ("atom-sys-aus-submission", "atom-bo-risk-assessment", "ENABLES"),
        ("atom-bo-risk-assessment", "atom-bo-manual-underwrite", "ENABLES"),
        ("atom-bo-manual-underwrite", "atom-bo-program-eligibility-check", "ENABLES"),
        ("atom-bo-program-eligibility-check", "atom-dec-loan-decision", "ENABLES"),
        ("atom-bo-risk-assessment", "atom-bo-compensating-factors-analysis", "ENABLES"),
        ("atom-bo-compensating-factors-analysis", "atom-bo-manual-underwrite", "ENABLES"),
        # Conditions Management Additional Edges
        ("atom-sys-condition-generation", "atom-bo-prior-to-doc-conditions", "ENABLES"),
        ("atom-bo-prior-to-doc-conditions", "atom-bo-condition-tracking", "ENABLES"),
        ("atom-sys-condition-generation", "atom-bo-prior-to-funding-conditions", "ENABLES"),
        ("atom-bo-prior-to-funding-conditions", "atom-bo-condition-tracking", "ENABLES"),
        ("atom-bo-condition-tracking", "atom-bo-condition-aging-review", "ENABLES"),
        ("atom-bo-condition-aging-review", "atom-bo-condition-clearance", "ENABLES"),
        # Closing Additional Edges
        ("atom-sys-closing-disclosure", "atom-bo-closing-disclosure-review", "ENABLES"),
        ("atom-bo-closing-disclosure-review", "atom-bo-closing-doc-prep", "ENABLES"),
        ("atom-bo-closing-doc-prep", "atom-bo-closing-package-assembly", "ENABLES"),
        ("atom-bo-closing-package-assembly", "atom-bo-notary-coordination", "ENABLES"),
        ("atom-bo-notary-coordination", "atom-cust-closing-signing", "ENABLES"),
        # Funding Additional Edges
        ("atom-cust-closing-signing", "atom-bo-funding-verification", "ENABLES"),
        ("atom-bo-funding-verification", "atom-sys-funding-wire", "ENABLES"),
        ("atom-sys-funding-wire", "atom-sys-wire-verification", "ENABLES"),
        ("atom-sys-wire-verification", "atom-bo-funding-reconciliation", "ENABLES"),
        ("atom-bo-funding-reconciliation", "atom-sys-deed-recording", "ENABLES"),
        # Post-Closing Additional Edges
        ("atom-sys-deed-recording", "atom-bo-document-audit", "ENABLES"),
        ("atom-bo-document-audit", "atom-bo-post-closing-audit", "ENABLES"),
        ("atom-bo-post-closing-audit", "atom-bo-data-accuracy-review", "ENABLES"),
        ("atom-bo-data-accuracy-review", "atom-bo-loan-delivery-prep", "ENABLES"),
        ("atom-bo-loan-delivery-prep", "atom-sys-loan-delivery-submission", "ENABLES"),
        # Application Intake Additional Edges
        ("atom-cust-application-submit", "atom-sys-loan-estimate-generation", "ENABLES"),
        ("atom-sys-loan-estimate-generation", "atom-cust-pre-approval-letter", "ENABLES"),
        # Closing Preparation Additional Edges
        ("atom-sys-rate-lock-processing", "atom-sys-redisclosure-trigger", "ENABLES"),
        ("atom-sys-redisclosure-trigger", "atom-sys-closing-disclosure", "ENABLES"),
        # System Dependencies
        ("atom-sys-loan-estimate-generation", "atom-sys-los-platform", "USES_COMPONENT"),
        ("atom-sys-redisclosure-trigger", "atom-sys-los-platform", "USES_COMPONENT"),
        ("atom-sys-rate-lock-processing", "atom-sys-los-platform", "USES_COMPONENT"),
        ("atom-sys-loan-delivery-submission", "atom-sys-los-platform", "USES_COMPONENT"),
        ("atom-sys-wire-verification", "atom-sys-los-platform", "USES_COMPONENT"),
    ]

    # Create edges based on patterns
    for source_prefix, target_prefix, edge_type in edge_patterns:
        # Find atoms matching these prefixes (exact match on prefix)
        for source in atoms:
            if source["id"] == source_prefix or source["id"].startswith(source_prefix + "-"):
                for target in atoms:
                    if target["id"] == target_prefix or target["id"].startswith(target_prefix + "-"):
                        # Check if edge already exists in atom's edges
                        existing_edge_in_atom = any(
                            e.get("targetId") == target["id"] and e.get("type") == edge_type
                            for e in source.get("edges", [])
                        )

                        if not existing_edge_in_atom:
                            # Add to source atom's edges
                            source["edges"].append({"type": edge_type, "targetId": target["id"]})

                            # Add to edges list for graph.json
                            edge = {"source": source["id"], "target": target["id"], "type": edge_type}
                            if edge not in edges:
                                edges.append(edge)

    # Also create edges based on module relationships - atoms in same module are related
    module_atoms = {}
    for atom in atoms:
        module_id = atom.get("moduleId")
        if module_id:
            if module_id not in module_atoms:
                module_atoms[module_id] = []
            module_atoms[module_id].append(atom)

    # Create RELATED_TO edges between atoms in the same module
    for module_id, module_atom_list in module_atoms.items():
        for i, atom1 in enumerate(module_atom_list):
            for atom2 in module_atom_list[i + 1 :]:
                # Only add if they don't already have a direct edge
                has_direct_edge = any(
                    e.get("targetId") == atom2["id"] or e.get("targetId") == atom1["id"]
                    for e in atom1.get("edges", []) + atom2.get("edges", [])
                )
                if not has_direct_edge and random.random() < 0.3:  # 30% chance to add RELATED_TO
                    atom1["edges"].append({"type": "RELATED_TO", "targetId": atom2["id"]})
                    edges.append({"source": atom1["id"], "target": atom2["id"], "type": "RELATED_TO"})

    return edges


def write_atom(atom: Dict) -> None:
    """Write atom to YAML file in appropriate category subdirectory."""
    fname = f"{atom['id']}.yaml"

    # Determine subdirectory based on atom type
    atom_type = atom.get("type", "").upper()
    if atom_type == "PROCESS":
        subdir = "processes"
    elif atom_type == "DECISION":
        subdir = "decisions"
    elif atom_type == "SYSTEM":
        subdir = "systems"
    elif atom_type == "ROLE":
        subdir = "roles"
    elif atom_type == "POLICY":
        subdir = "policies"
    elif atom_type == "CONTROL":
        subdir = "controls"
    elif atom_type == "DOCUMENT":
        subdir = "documents"
    else:
        subdir = "processes"  # default

    path = os.path.join(ATOMS_BASE, subdir, fname)
    if yaml:
        with open(path, "w", encoding="utf-8") as fh:
            yaml.safe_dump(atom, fh, sort_keys=False, default_flow_style=False)
    else:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(atom, fh, indent=2)


def write_module(module: Dict) -> None:
    """Write module to YAML file."""
    fname = f"{module['id']}.yaml"
    path = os.path.join(MODULES_DIR, fname)
    if yaml:
        with open(path, "w", encoding="utf-8") as fh:
            yaml.safe_dump(module, fh, sort_keys=False, default_flow_style=False)
    else:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(module, fh, indent=2)


def write_phase(phase: Dict) -> None:
    """Write phase to YAML file."""
    fname = f"{phase['id']}.yaml"
    path = os.path.join(PHASES_DIR, fname)
    if yaml:
        with open(path, "w", encoding="utf-8") as fh:
            yaml.safe_dump(phase, fh, sort_keys=False, default_flow_style=False)
    else:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(phase, fh, indent=2)


def generate(count: int = 200) -> None:
    """Generate test data."""
    import shutil

    print("Generating home lending test data...")
    print("WARNING: This will write to atoms/ and modules/ directories (used by API)")
    print("Old test data in these directories will be cleaned.")

    # Clean old test data directories
    old_dirs = [
        os.path.join(ATOMS_BASE, "requirements"),
        os.path.join(ATOMS_BASE, "designs"),
        os.path.join(ATOMS_BASE, "procedures"),
        os.path.join(ATOMS_BASE, "validations"),
        os.path.join(ATOMS_BASE, "risks"),
    ]
    for old_dir in old_dirs:
        if os.path.exists(old_dir):
            shutil.rmtree(old_dir)
            print(f"Cleaned {old_dir}")

    # Clean old policy files (POL-*.yaml) but keep new ones (atom-pol-*.yaml)
    policies_dir = os.path.join(ATOMS_BASE, "policies")
    if os.path.exists(policies_dir):
        for file in os.listdir(policies_dir):
            if file.startswith("POL-") and file.endswith(".yaml"):
                os.remove(os.path.join(policies_dir, file))
                print(f"Cleaned old policy file: {file}")

    ensure_dirs()

    # Create atoms from templates
    atoms = []
    for template in ATOM_TEMPLATES:
        # Enhance template with default detailed fields if missing
        enhanced_template = enhance_atom_template(template.copy())
        atom = make_atom(enhanced_template)
        atoms.append(atom)

    print(f"Created {len(atoms)} atoms")

    # Create edges (this also populates edges in atoms)
    edges = create_edges(atoms)
    print(f"Created {len(edges)} edges")

    # Write atoms (now with edges populated)
    for atom in atoms:
        write_atom(atom)

    # Create modules with their atoms
    modules = []
    for module_template in MODULES:
        module = {
            "id": module_template["id"],
            "name": module_template["name"],
            "description": module_template["description"],
            "owner": module_template["owner"],
            "atoms": [atom["id"] for atom in atoms if atom.get("moduleId") == module_template["id"]],
            "phaseId": module_template.get("phaseId"),
        }
        modules.append(module)
        write_module(module)

    print(f"Created {len(modules)} modules")

    # Create phases with their modules
    phases = []
    for phase_template in PHASES:
        phase = {
            "id": phase_template["id"],
            "name": phase_template["name"],
            "description": phase_template["description"],
            "modules": [module["id"] for module in modules if module.get("phaseId") == phase_template["id"]],
            "journeyId": phase_template.get("journeyId"),
            "targetDurationDays": phase_template.get("targetDurationDays", 0),
        }
        phases.append(phase)
        write_phase(phase)

    print(f"Created {len(phases)} phases")

    # Create graph.json
    nodes = []
    for atom in atoms:
        nodes.append({"id": atom["id"], "type": atom["type"], "category": atom["category"]})

    for module in modules:
        nodes.append({"id": module["id"], "type": "Module"})

    for phase in phases:
        nodes.append({"id": phase["id"], "type": "Phase"})

    graph = {"nodes": nodes, "edges": edges}

    graph_path = os.path.join(OUT, "graph.json")
    with open(graph_path, "w", encoding="utf-8") as fh:
        json.dump(graph, fh, indent=2)

    print(f"Created graph.json with {len(nodes)} nodes and {len(edges)} edges")

    # Create example documents
    doc_templates = [
        "Loan Application - Uniform Residential Loan Application (1003)\n\nBorrower Information:\n- Name: [Customer Name]\n- SSN: [SSN]\n- Employment: [Employer]\n- Income: $[Amount]\n\nProperty Information:\n- Address: [Property Address]\n- Purchase Price: $[Amount]\n- Loan Amount: $[Amount]\n\nGenerated: {timestamp}",
        "Income Verification Worksheet\n\nBase Income Calculation:\n- W-2 Income: $[Amount]\n- Tax Return Income: $[Amount]\n- Other Income: $[Amount]\n\nQualifying Income: $[Amount]\nDTI Ratio: [Ratio]%\n\nGenerated: {timestamp}",
        "Credit Analysis Report\n\nCredit Scores:\n- Experian: [Score]\n- Equifax: [Score]\n- TransUnion: [Score]\n- Middle Score: [Score]\n\nTrade Lines: [Count]\nMonthly Debt: $[Amount]\n\nGenerated: {timestamp}",
    ]

    for i, template in enumerate(doc_templates, 1):
        doc_path = os.path.join(DOCS, f"doc-{i}.txt")
        with open(doc_path, "w", encoding="utf-8") as fh:
            fh.write(template.format(timestamp=datetime.now(timezone.utc).isoformat()))

    print(f"Created {len(doc_templates)} example documents")
    print(f"\nTest data generation complete!")
    print(f"Output directory: {OUT}")
    print(f"  - Atoms: {len(atoms)}")
    print(f"  - Modules: {len(modules)}")
    print(f"  - Phases: {len(phases)}")
    print(f"  - Edges: {len(edges)}")


def cli():
    parser = argparse.ArgumentParser(description="Generate home lending test data")
    parser.add_argument(
        "--count", type=int, default=200, help="Number of data points (currently unused, generates full set)"
    )
    args = parser.parse_args()
    generate(args.count)


if __name__ == "__main__":
    cli()
