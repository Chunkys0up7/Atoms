# Module Approval Workflow System

## Overview

The Graph-Native Documentation Platform (GNDP) now includes a comprehensive approval workflow system for modules. This system enables structured review, approval, and tracking of module changes with full GitHub CI/CD integration.

## Features

### 1. **Multi-Stage Approval Workflow**

Modules progress through the following stages:

1. **Draft** - Initial creation and editing
2. **Technical Review** - Engineering team reviews module composition and technical accuracy
3. **Compliance Review** - Compliance team validates regulatory requirements
4. **Approved** - Module is approved for use in production

### 2. **UI-Based Approval Actions**

The ModuleExplorer component provides interactive approval buttons:

- **Submit for Review** - Move module from draft to technical review
- **Approve** - Approve current stage and advance to next
- **Request Changes** - Send module back to draft with change requests
- **Reject** - Reject module and return to draft

### 3. **Audit Trail & Event Logging**

All approval actions are tracked with:
- Reviewer email and role
- Timestamp of action
- Comments/reasons for actions
- Complete workflow history in module YAML metadata

### 4. **GitHub Actions Integration**

Approval events trigger automated GitHub workflows that:
- Create event files for processing
- Commit module changes automatically
- Generate workflow summaries
- Archive processed events

## Architecture

### Backend API Endpoints

#### `PUT /api/modules/{module_id}`
Update module metadata, description, atoms, etc.

**Request Body:**
```json
{
  "name": "Updated Module Name",
  "description": "Updated description",
  "owner": "Team Name",
  "atoms": ["atom-1", "atom-2"],
  "metadata": {
    "criticality": "high"
  }
}
```

#### `POST /api/modules/{module_id}/approval`
Perform approval action on a module.

**Request Body:**
```json
{
  "action": "approve",
  "stage": "technical_review",
  "reviewer_email": "reviewer@example.com",
  "reviewer_role": "Engineering Lead",
  "comments": "All technical requirements met"
}
```

**Actions:**
- `submit` - Submit to next stage
- `approve` - Approve current stage
- `reject` - Reject module
- `request_changes` - Request changes

### Frontend Components

#### ModuleExplorer.tsx

Enhanced with:
- Approval workflow timeline visualization
- Interactive approval action buttons
- Approval modal for collecting reviewer information
- Real-time workflow status badges

#### Workflow State Display

Each stage shows:
- Status indicator (pending, in_progress, completed, rejected)
- Assigned team/person
- Reviewers (if applicable)
- Completion details (who, when)
- Action buttons (when actionable)

### Module YAML Structure

```yaml
module_id: module-example
name: Example Module
description: Module description
owner: Team Name
atoms:
  - atom-1
  - atom-2
metadata:
  status: technical_review
  created_at: 2025-01-15T10:30:00Z
  updated_at: 2025-01-15T14:20:00Z
  approval_workflow:
    current_stage: technical_review
    stages:
      - name: draft
        status: completed
        completed_at: 2025-01-15T10:35:00Z
        completed_by: author@example.com
      - name: technical_review
        status: in_progress
        started_at: 2025-01-15T10:35:00Z
        submitted_by: author@example.com
        assigned_to: Engineering Team
```

### GitHub Actions Workflow

**File:** `.github/workflows/module-approval.yml`

**Triggers:**
- Push to `.github/events/approval_*.json`
- Push to `modules/**/*.yaml`
- Manual workflow dispatch

**Actions:**
1. Detects approval event files
2. Processes event type (submitted, approved, rejected, changes_requested)
3. Generates workflow summary
4. Commits module changes
5. Archives processed events

**Event File Format:**
```json
{
  "event_type": "approval_approved",
  "module_id": "module-example",
  "timestamp": "2025-01-15T14:20:00Z",
  "payload": {
    "stage": "technical_review",
    "approved_by": "reviewer@example.com",
    "reviewer_role": "Engineering Lead"
  }
}
```

## Usage Guide

### For Module Authors

1. **Create a Module**
   - Click "Create Module" in ModuleExplorer
   - Fill in module details and select atoms
   - Module starts in "draft" status

2. **Submit for Review**
   - Double-click module to open detail panel
   - Click "Submit for Technical Review"
   - Module moves to technical_review stage

3. **Handle Feedback**
   - If changes requested, update module
   - Re-submit when ready

### For Reviewers

1. **Access Module Details**
   - Double-click any module in the module list
   - View complete workflow timeline

2. **Review and Take Action**
   - Review module composition and metadata
   - Click appropriate action button:
     - **Approve** - Module meets requirements
     - **Request Changes** - Module needs updates
     - **Reject** - Module should not proceed

3. **Provide Context**
   - Enter your email and role
   - Add comments explaining your decision
   - Submit the action

### For Administrators

1. **Monitor Workflow**
   - Check GitHub Actions for approval events
   - Review workflow summaries
   - Monitor event archive

2. **Customize Workflow**
   - Edit stage definitions in `api/routes/modules.py`
   - Update default stages in `ModuleExplorer.tsx`
   - Configure GitHub Actions triggers

## State Machine

```
draft
  └─[submit]→ technical_review
                └─[approve]→ compliance_review
                              └─[approve]→ approved
                              └─[reject]→ draft
                              └─[request_changes]→ draft
                └─[reject]→ draft
                └─[request_changes]→ draft
```

## Event Flow

1. **User Action** (UI)
   ↓
2. **API Call** (POST /api/modules/{id}/approval)
   ↓
3. **YAML Update** (modules/{id}.yaml updated)
   ↓
4. **Event File Created** (.github/events/approval_*.json)
   ↓
5. **GitHub Actions Triggered** (module-approval.yml)
   ↓
6. **Event Processed** (Summary generated, files committed)
   ↓
7. **Event Archived** (.github/events/archive/)

## Security Considerations

- Reviewer information is self-reported (for now)
- All actions are logged with timestamps
- Event files provide audit trail
- GitHub Actions has write permissions for commits
- Module files are tracked in git for full history

## Future Enhancements

- [ ] Integration with auth system for verified reviewers
- [ ] Email notifications for approval requests
- [ ] Slack/Teams integration for workflow events
- [ ] Reviewer assignment based on module type
- [ ] SLA tracking for approval stages
- [ ] Dashboard for approval metrics
- [ ] Parallel approvals for multiple reviewers
- [ ] Conditional workflows based on criticality

## Troubleshooting

### Approval action fails
- Check backend logs for errors
- Verify module file permissions
- Ensure module ID is correct

### GitHub workflow not triggering
- Check if event file was created in `.github/events/`
- Verify workflow file syntax
- Check GitHub Actions permissions

### Module stuck in workflow stage
- Manually edit module YAML metadata
- Update `approval_workflow.current_stage`
- Commit changes to trigger sync

## Files Modified/Created

### Created:
- `.github/workflows/module-approval.yml` - GitHub Actions workflow
- `APPROVAL_WORKFLOW_SYSTEM.md` - This documentation

### Modified:
- `api/routes/modules.py` - Added update and approval endpoints
- `components/ModuleExplorer.tsx` - Added approval UI and modals

## API Examples

### Submit Module for Review
```bash
curl -X POST http://localhost:8000/api/modules/module-example/approval \
  -H "Content-Type: application/json" \
  -d '{
    "action": "submit",
    "stage": "draft",
    "reviewer_email": "author@example.com"
  }'
```

### Approve Technical Review
```bash
curl -X POST http://localhost:8000/api/modules/module-example/approval \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "stage": "technical_review",
    "reviewer_email": "tech-lead@example.com",
    "reviewer_role": "Engineering Lead",
    "comments": "Technical review complete - all atoms properly configured"
  }'
```

### Request Changes
```bash
curl -X POST http://localhost:8000/api/modules/module-example/approval \
  -H "Content-Type: application/json" \
  -d '{
    "action": "request_changes",
    "stage": "compliance_review",
    "reviewer_email": "compliance@example.com",
    "reviewer_role": "Compliance Officer",
    "comments": "Missing TRID compliance atoms - please add atom-pol-trid-compliance"
  }'
```

## Summary

The approval workflow system provides a complete solution for managing module lifecycle from creation through approval. It combines:

- **User-friendly UI** for easy interaction
- **Robust backend** for reliable processing
- **GitHub integration** for automation and audit
- **Flexible architecture** for future enhancements

All approval actions are tracked, logged, and integrated with your existing git-based workflow.
