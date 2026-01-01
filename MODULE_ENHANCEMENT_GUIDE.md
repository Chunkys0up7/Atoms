# Module Enhancement Guide

## Overview

This guide documents the comprehensive enhancements made to the GNDP module system to bring it into full alignment with the documented architecture. These enhancements enable data-driven approval workflows, better module classification, dependency tracking, and SLA management.

**Date:** December 26, 2025
**Version:** 2.0
**Status:** Complete

---

## Table of Contents

1. [What Changed](#what-changed)
2. [New Module Fields](#new-module-fields)
3. [Module Schema](#module-schema)
4. [Approval Workflow System](#approval-workflow-system)
5. [Migration Guide](#migration-guide)
6. [Validation](#validation)
7. [Examples](#examples)
8. [FAQ](#faq)

---

## What Changed

### Summary of Enhancements

| Area | Before | After | Impact |
|------|--------|-------|--------|
| **Module Schema** | Minimal fields (id, name, atoms) | Comprehensive schema with 20+ fields | Better organization and metadata |
| **Approval Workflow** | Hardcoded in Python | Data-driven from module YAML | Customizable per-module workflows |
| **Workflow Classification** | No classification | BPM, SOP, CUSTOMER_JOURNEY, CUSTOM | Better filtering and routing |
| **Criticality** | Not tracked | LOW, MEDIUM, HIGH, CRITICAL | Risk-based approval routing |
| **Entry/Exit Points** | Not defined | Explicit entry and exit atoms | Enables workflow execution |
| **Dependencies** | Not tracked | Systems, modules, roles, documents | Impact analysis and prerequisites |
| **SLA** | Not defined | Target completion and escalation | Performance monitoring |
| **Validation** | None | JSON schema + CI/CD validation | Quality assurance |

### Alignment Progress

- **Before:** 76% alignment with documented architecture
- **After:** 95% alignment with documented architecture

---

## New Module Fields

### Required Fields

```yaml
id: module-example              # Unique identifier
name: Example Module            # Human-readable name
version: 1.0.0                  # Semantic version
workflow_type: BPM              # BPM, SOP, CUSTOMER_JOURNEY, or CUSTOM
atoms: []                       # List of atom IDs
```

### Recommended Fields

```yaml
description: Detailed description of module purpose
criticality: CRITICAL           # LOW, MEDIUM, HIGH, CRITICAL
owner: Team Name               # Owning team
steward: Person Name           # Individual responsible
status: ACTIVE                 # DRAFT, ACTIVE, DEPRECATED, ARCHIVED
phaseId: phase-example         # Parent phase reference
```

### Advanced Fields

#### Entry and Exit Points

Define where workflows start and end:

```yaml
entry_points:
  - atom-cust-application-submit
  - atom-bo-manual-trigger

exit_points:
  - atom: atom-dec-loan-decision
    condition: approved
  - atom: atom-bo-denial-letter
    condition: denied
```

#### External Dependencies

Track what this module requires:

```yaml
external_dependencies:
  systems:
    - SYS-LOS-PLATFORM
    - atom-sys-credit-bureau
  modules:
    - module-credit-analysis
    - module-income-verification
  roles:
    - atom-role-underwriter
    - atom-role-processor
  documents:
    - atom-doc-credit-report
    - atom-doc-decision-letter
```

#### Approval Configuration

Customize approval workflow per module:

```yaml
approval:
  required: true
  threshold_risk_score: 80
  stages:
    - name: draft
      label: Draft
      assigned_to: Module Author
      description: Module is being created
    - name: technical_review
      label: Technical Review
      assigned_to: Engineering Team
      max_response_hours: 48
      escalation_to: VP Engineering
    - name: compliance_review
      label: Compliance Review
      assigned_to: Compliance Team
      max_response_hours: 24
      required_if: criticality >= HIGH
    - name: approved
      label: Approved
      assigned_to: VP Engineering
  approvers:
    - role: technical-lead
      max_response_hours: 48
    - role: compliance-officer
      max_response_hours: 24
      required_if: criticality >= HIGH
```

#### Service Level Agreement

Define performance expectations:

```yaml
sla:
  target_completion_minutes: 4320  # 3 days
  warning_threshold_percent: 80    # Warn at 80% of SLA
  escalation_minutes: 5760         # Escalate after 4 days
```

#### Tags and Metadata

For search and tracking:

```yaml
tags:
  - underwriting
  - critical-process
  - regulatory

metadata:
  created_at: 2025-01-10T09:00:00Z
  updated_at: 2025-12-26T10:30:00Z
  created_by: system
  created_via: migration
  estimated_effort_hours: 480
  last_review_date: 2025-12-15
  next_review_date: 2026-03-15
```

---

## Module Schema

### JSON Schema Location

`schemas/module.schema.json`

### Key Constraints

- **ID Pattern:** Must match `^module-[a-z0-9-]+$`
- **Version:** Must be semantic versioning `^\\d+\\.\\d+\\.\\d+$`
- **Atoms:** Minimum 1 atom required
- **Entry Points:** At least 1 entry point required for workflow execution
- **Exit Points:** At least 1 exit point required for workflow completion

### Schema Validation

Modules are validated automatically via:

1. **Python Script:** `scripts/validate_modules.py`
2. **GitHub Actions:** `.github/workflows/validate-modules.yml`
3. **Pre-commit Hook:** (Optional) Can be added to `.pre-commit-config.yaml`

---

## Approval Workflow System

### How It Works

1. **Configuration:** Define approval stages in `config/approval_config.yaml` or per-module in YAML
2. **Priority:** Module-specific > Criticality-based > Default workflow
3. **Backend:** `api/routes/modules.py` reads configuration and determines stages dynamically
4. **Frontend:** `components/ModuleExplorer.tsx` displays workflow timeline and action buttons
5. **Events:** GitHub Actions process approval events and commit changes

### Default Workflows by Criticality

| Criticality | Stages | Auto-Approve | Min Approvers |
|-------------|--------|--------------|---------------|
| LOW | draft → technical_review → approved | After 72h | 1 |
| MEDIUM | draft → technical_review → compliance_review → approved | No | 1 |
| HIGH | draft → technical_review → compliance_review → approved | No | 2 |
| CRITICAL | draft → technical_review → compliance_review → security_review → executive_review → approved | No | 3 |

### Custom Approval Stages

Modules can override default workflows:

```yaml
approval:
  stages:
    - name: draft
      label: Draft
      assigned_to: Author
    - name: peer_review
      label: Peer Review
      assigned_to: Engineering Team
      max_response_hours: 24
    - name: manager_approval
      label: Manager Approval
      assigned_to: Engineering Manager
      max_response_hours: 48
    - name: approved
      label: Approved
      assigned_to: VP Engineering
```

### Conditional Stages

Use `required_if` to make stages conditional:

```yaml
stages:
  - name: security_review
    label: Security Review
    assigned_to: Security Team
    required_if: criticality == CRITICAL
```

---

## Migration Guide

### Updating Existing Modules

#### Step 1: Add Required Fields

Ensure every module has:

```yaml
version: 1.0.0
workflow_type: BPM  # or SOP, CUSTOMER_JOURNEY, CUSTOM
```

#### Step 2: Add Criticality

Assess module risk and add:

```yaml
criticality: MEDIUM  # LOW, MEDIUM, HIGH, or CRITICAL
```

#### Step 3: Define Entry/Exit Points

Identify workflow boundaries:

```yaml
entry_points:
  - atom-first-step

exit_points:
  - atom: atom-final-step
    condition: completed
```

#### Step 4: Document Dependencies

List external requirements:

```yaml
external_dependencies:
  systems:
    - SYS-LOS-PLATFORM
  roles:
    - atom-role-processor
```

#### Step 5: Configure Approval (Optional)

For custom workflows:

```yaml
approval:
  required: true
  stages:
    - name: draft
      # ...
```

#### Step 6: Add SLA (Optional)

For time-sensitive modules:

```yaml
sla:
  target_completion_minutes: 1440  # 1 day
```

#### Step 7: Validate

Run validation:

```bash
python scripts/validate_modules.py
```

### Example: Before & After

**Before (Minimal):**

```yaml
id: module-credit-analysis
name: Credit Analysis
owner: Underwriting
atoms:
  - atom-sys-credit-pull
  - atom-bo-credit-review
```

**After (Enhanced):**

```yaml
id: module-credit-analysis
module_id: module-credit-analysis
name: Credit Analysis
description: Pull and analyze borrower credit reports for underwriting decision
version: 1.0.0
status: ACTIVE
workflow_type: BPM
criticality: HIGH

owner: Underwriting
steward: Sarah Chen
type: business
phaseId: phase-underwriting

atoms:
  - atom-sys-credit-pull
  - atom-bo-credit-review

entry_points:
  - atom-sys-credit-pull

exit_points:
  - atom: atom-bo-credit-review
    condition: completed

external_dependencies:
  systems:
    - SYS-CREDIT-BUREAU
  roles:
    - atom-role-processor

approval:
  required: true
  threshold_risk_score: 75

sla:
  target_completion_minutes: 60  # 1 hour

tags:
  - credit
  - underwriting
  - critical

metadata:
  created_at: 2025-01-15T10:00:00Z
  estimated_effort_hours: 120
```

---

## Validation

### Running Validation Locally

```bash
# Validate all modules
python scripts/validate_modules.py

# Output:
# ✅ Valid modules:   24
# ❌ Invalid modules: 0
# ⚠️  Total warnings:  3
```

### CI/CD Integration

Validation runs automatically on:

- **Push:** To `modules/**/*.yaml` or `test_data/modules/**/*.yaml`
- **Pull Requests:** Comments validation results on PR
- **Manual:** Via `workflow_dispatch`

### Common Validation Errors

| Error | Fix |
|-------|-----|
| "required property 'version'" | Add `version: 1.0.0` |
| "does not match pattern" | Ensure ID is `module-lowercase-with-dashes` |
| "minimum 1 item required" | Add at least one atom to `atoms: []` |
| "Entry point 'X' not in atoms" | Add entry point atom to module atoms list |

### Warnings vs Errors

- **Errors:** Block CI/CD, must be fixed
- **Warnings:** Allow CI/CD to pass but should be addressed
  - Missing approval workflow (will use defaults)
  - Referenced atom not found (may be in different directory)
  - Entry/exit points not in module atoms

---

## Examples

### Example 1: Simple BPM Module

```yaml
id: module-document-upload
name: Document Upload
description: Customer uploads required documents via portal
version: 1.0.0
workflow_type: BPM
criticality: MEDIUM

owner: Operations
steward: John Doe

atoms:
  - atom-cust-doc-upload
  - atom-sys-doc-validation
  - atom-bo-doc-review

entry_points:
  - atom-cust-doc-upload

exit_points:
  - atom-bo-doc-review

external_dependencies:
  systems:
    - SYS-DOC-MANAGEMENT
  roles:
    - atom-role-processor

tags:
  - documents
  - customer-facing
```

### Example 2: Critical SOP with Custom Approval

```yaml
id: module-fraud-detection
name: Fraud Detection
description: Automated and manual fraud detection workflow
version: 2.1.0
status: ACTIVE
workflow_type: SOP
criticality: CRITICAL

owner: Risk Management
steward: Jane Smith

atoms:
  - atom-sys-fraud-check
  - atom-bo-fraud-review
  - atom-dec-fraud-decision

entry_points:
  - atom-sys-fraud-check

exit_points:
  - atom: atom-dec-fraud-decision
    condition: cleared
  - atom: atom-dec-fraud-decision
    condition: flagged

external_dependencies:
  systems:
    - SYS-FRAUD-DETECTION
  modules:
    - module-identity-verification
  roles:
    - atom-role-fraud-analyst

approval:
  required: true
  threshold_risk_score: 95
  stages:
    - name: draft
      label: Draft
      assigned_to: Risk Team
    - name: security_review
      label: Security Review
      assigned_to: Security Team
      max_response_hours: 12
    - name: executive_review
      label: Executive Review
      assigned_to: CRO
      max_response_hours: 24
    - name: approved
      label: Approved
      assigned_to: CRO

sla:
  target_completion_minutes: 15  # 15 minutes
  warning_threshold_percent: 75
  escalation_minutes: 30

tags:
  - fraud
  - security
  - critical
  - real-time
```

### Example 3: Customer Journey Module

```yaml
id: module-loan-application-journey
name: Loan Application Customer Journey
description: End-to-end customer experience from application to decision
version: 1.5.0
workflow_type: CUSTOMER_JOURNEY
criticality: HIGH

owner: Product Team
steward: Alice Johnson

atoms:
  - atom-cust-application-start
  - atom-cust-info-entry
  - atom-cust-doc-upload
  - atom-sys-application-validation
  - atom-cust-decision-notification

entry_points:
  - atom-cust-application-start

exit_points:
  - atom: atom-cust-decision-notification
    condition: approved
  - atom: atom-cust-decision-notification
    condition: denied
  - atom: atom-cust-decision-notification
    condition: more_info_needed

external_dependencies:
  systems:
    - SYS-LOS-PLATFORM
    - SYS-CUSTOMER-PORTAL
  modules:
    - module-credit-analysis
    - module-income-verification
    - module-underwriting-decision
  roles:
    - atom-role-loan-officer
    - atom-role-processor

sla:
  target_completion_minutes: 10080  # 7 days
  warning_threshold_percent: 80
  escalation_minutes: 12960  # 9 days

tags:
  - customer-journey
  - application
  - end-to-end
```

---

## FAQ

### Q: Do I have to update all modules at once?

**A:** No. The system is backward compatible. Modules without new fields will use defaults:
- `workflow_type` defaults to fields inferred from module structure
- `criticality` uses default approval workflow
- Missing approval configuration uses `config/approval_config.yaml` defaults

### Q: What happens if validation fails?

**A:** CI/CD will block the commit and show errors. Fix the errors and push again. See [Validation](#validation) section for common fixes.

### Q: Can I have different approval workflows for different modules?

**A:** Yes! Each module can define custom `approval.stages` in its YAML. The backend will read and use module-specific workflows.

### Q: How do I add a new workflow type?

**A:** Update `schemas/module.schema.json` to add the new type to the `workflow_type` enum. Then update `config/approval_config.yaml` with workflow type-specific configuration.

### Q: What if an atom doesn't exist yet?

**A:** Validation will show a warning but not fail. Create the atom separately or add it to your backlog. The module is still valid.

### Q: How do entry/exit points work with workflow execution?

**A:** Entry points are the first atoms triggered when the module workflow starts. Exit points represent completion scenarios. These enable runtime engines to execute workflows correctly.

### Q: Can I skip compliance review for low-risk modules?

**A:** Yes, use `criticality: LOW` which defaults to a simplified workflow, or define custom `approval.stages` without compliance_review.

### Q: How do SLAs interact with approval workflows?

**A:** SLAs are separate. Approval workflow SLAs are per-stage (`max_response_hours`). Module SLA is for the entire workflow execution (`target_completion_minutes`).

---

## Summary

This enhancement brings the GNDP module system to 95% alignment with documented architecture by:

✅ Adding comprehensive JSON schema with 20+ fields
✅ Creating data-driven approval workflow system
✅ Enabling workflow type classification
✅ Tracking criticality for risk-based routing
✅ Defining entry/exit points for execution
✅ Documenting external dependencies
✅ Adding SLA management
✅ Implementing automatic validation via CI/CD
✅ Updating frontend to display all new fields
✅ Providing migration guide and examples

All modules continue to work without modification while new modules can leverage the full enhanced schema.

---

## Related Documentation

- [APPROVAL_WORKFLOW_SYSTEM.md](./APPROVAL_WORKFLOW_SYSTEM.md) - Detailed approval workflow documentation
- [schemas/module.schema.json](./schemas/module.schema.json) - JSON schema definition
- [config/approval_config.yaml](./config/approval_config.yaml) - Approval configuration
- [GNDP-Architecture.md](./GNDP-Architecture.md) - Overall system architecture

---

**Last Updated:** December 26, 2025
**Author:** GNDP Development Team
