---
title: System Pulls Full Credit Report
id: atom-sys-credit-report-pull
type: PROCESS
---
# System Pulls Full Credit Report

**ID:** `atom-sys-credit-report-pull`  

**Type:** `PROCESS`  

**Category:** `SYSTEM`  



## Content

{'summary': 'Pull tri-merge credit report from all three bureaus', 'description': 'Pull tri-merge credit report from all three bureaus', 'steps': ['System calls credit bureau API', 'Retrieve Experian, Equifax, and TransUnion reports', 'Merge reports into tri-merge', 'Calculate middle credit score', 'Store credit report in LOS'], 'purpose': 'This process enables System Pulls Full Credit Report to be completed efficiently and accurately.', 'business_context': 'This is a critical component of the home lending process that ensures compliance, accuracy, and customer satisfaction.', 'inputs': ['Required data and documents as specified in the process steps'], 'outputs': ['Processed data and status updates as specified in the process steps'], 'prerequisites': ['All required upstream processes must be completed'], 'success_criteria': ['Process completed successfully', 'All required outputs generated', 'Status updated in system']}

## Relationships

*No direct relationships defined.*
