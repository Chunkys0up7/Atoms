---
title: Customer Onboarding
process_id: customer_onboarding
generated_by: generate_docs_from_bpmn.py
---

# Customer Onboarding

**Process ID:** `customer_onboarding`

## Overview
This process describes the end-to-end flow for onboarding a new customer, including KYC checks and account provisioning.

## Roles & Responsibilities
- **Relationship Manager**
- **Compliance Officer**
- **System**

## Process Steps
### 🟢 **Start**: Application Received
Process starts when a new application is received via the portal.

*ID: `StartEvent_1`*

### 👤 **User Task**: Collect ID Documents
The Relationship Manager collects physical or digital copies of ID documents (Passport, Utility Bill).

*ID: `Task_CollectDocs`*

### 👤 **User Task**: Review KYC
Compliance checks the documents against sanctions lists and verifies identity.

*ID: `Task_ReviewKYC`*

### ⚙️ **System Task**: Provision Account
System automatically creates the account in the core banking ledger.

*ID: `Task_ProvisionAccount`*

### 🔴 **End**: Onboarding Complete
Customer is notified and account is active.

*ID: `EndEvent_1`*
