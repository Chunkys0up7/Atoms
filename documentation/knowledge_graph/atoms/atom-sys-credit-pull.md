---
title: System Pulls Soft Credit
id: atom-sys-credit-pull
type: PROCESS
---
# System Pulls Soft Credit

**ID:** `atom-sys-credit-pull`  

**Type:** `PROCESS`  

**Category:** `SYSTEM`  



## Content

{'summary': "Automated soft credit inquiry to assess initial creditworthiness without impacting customer's credit score", 'description': "This automated process retrieves a soft credit pull from one or more credit bureaus (Experian, Equifax, TransUnion) to assess a customer's creditworthiness during pre-qualification. Unlike a hard credit pull used in full applications, a soft pull does not affect the customer's credit score and can be performed without their explicit authorization (though consent is typically obtained). The system retrieves the credit score, credit history length, number of open accounts, and any derogatory items. This information is critical for determining if the customer meets minimum credit requirements and estimating loan terms.", 'steps': ['System receives pre-qualification request with customer SSN and consent', 'System formats credit inquiry request according to bureau API specifications', 'System calls credit bureau API (typically through service provider)', 'Bureau returns credit report data including: credit score, credit history, open accounts, payment history, derogatory items', 'System parses and validates credit report response', "System stores credit data in LOS with inquiry type marked as 'soft'", 'System flags if credit score is below minimum threshold', 'System makes credit data available for DTI calculation and pre-qualification decision'], 'purpose': "Provide immediate credit assessment for pre-qualification decisions without requiring a full application or impacting the customer's credit score. Enables rapid pre-qualification responses and helps identify credit issues early in the process.", 'business_context': 'Soft credit pulls are essential for competitive pre-qualification processes. They allow the bank to provide instant feedback to customers while protecting their credit scores. The system must integrate with credit bureau APIs (typically through a credit service provider like Equifax, Experian, or a third-party aggregator) and handle API failures gracefully. Response times are critical - customers expect near-instant results.', 'inputs': ['Customer SSN (last 4 digits sufficient for some bureaus)', 'Customer name and date of birth', 'Customer address (for identity verification)', 'Consent for credit inquiry'], 'outputs': ['Credit score (typically FICO score)', 'Credit report summary', 'Credit history length', 'Number of open accounts', 'Payment history indicators', 'Derogatory items (if any)'], 'prerequisites': ['Valid customer SSN', 'Customer consent for credit inquiry', 'Credit bureau API connectivity', 'Valid API credentials and service agreement'], 'success_criteria': ['Credit report successfully retrieved within 30 seconds', 'Credit data accurately stored in LOS', 'Soft inquiry properly marked (does not affect credit score)', 'System handles API failures gracefully with retry logic'], 'exceptions': [{'condition': 'Credit bureau API unavailable', 'action': 'Retry up to 3 times with exponential backoff, then queue for manual processing'}, {'condition': 'Customer SSN not found in credit bureau', 'action': 'Flag for manual review - may indicate identity verification needed'}, {'condition': 'Credit score below 620 (minimum threshold)', 'action': 'Still complete pre-qualification but flag for loan officer review and alternative program consideration'}]}

## Relationships

*No direct relationships defined.*
