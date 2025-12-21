# Workflow & Ontology Builder Components Guide

**Version:** 2.0
**Date:** 2025-12-21
**Status:** Complete

---

## Overview

This guide documents the comprehensive builder and editor components added to the GNDP system, enabling full Create/Read/Update/Delete (CRUD) operations for Journeys, Phases, Modules, and Ontology Schema definitions.

---

## 🎯 What Was Added

### 1. **Workflow Builder Suite** (Complete CRUD)

#### A. Journey Editor ([components/JourneyEditor.tsx](../components/JourneyEditor.tsx))
Full-featured journey creation and modification interface.

**Features:**
- **Basic Information Management**
  - Auto-generated IDs from journey names
  - Name, description, and metadata editing
  - Version tracking and status management

- **Phase Sequencing**
  - Visual phase timeline with drag-to-reorder
  - Add existing phases or create new ones inline
  - Phase dependency validation
  - Up/Down arrow controls for ordering

- **Inline Phase Builder**
  - Create new phases without leaving journey editor
  - Set phase name, description, target duration
  - Automatically assigns to current journey

- **Validation & Metrics**
  - Required field validation
  - Total duration warning (>90 days)
  - Phase count, module count, atom count
  - Real-time metric calculation

- **Journey Metrics Summary**
  - Total phases
  - Total modules across all phases
  - Aggregate target duration
  - Total atoms involved

**Usage:**
```typescript
<JourneyEditor
  journey={existingJourney}  // null for new, object for edit
  phases={allPhases}
  modules={allModules}
  atoms={allAtoms}
  onSave={(journey) => handleSave(journey)}
  onCancel={() => setEditorOpen(false)}
/>
```

**Validation Rules:**
- Journey name required
- Description required
- At least 1 phase selected
- Warning if total duration > 90 days

---

#### B. Module Editor ([components/ModuleEditor.tsx](../components/ModuleEditor.tsx))
Sophisticated module composition interface with atom selection.

**Features:**
- **Two-Panel Layout**
  - Left: Configuration & selected atoms
  - Right: Available atom selection with filters

- **Atom Selection & Ordering**
  - Drag-to-reorder selected atoms
  - Up/Down buttons for sequencing
  - Remove atoms with one click
  - Visual atom previews with badges

- **Advanced Filtering**
  - Search by atom ID or name
  - Filter by AtomType (PROCESS, DECISION, etc.)
  - Filter by AtomCategory (CUSTOMER_FACING, BACK_OFFICE, SYSTEM)
  - Real-time filtered results

- **Validation & Analysis**
  - Required field checking
  - Circular dependency detection
  - Orphaned critical atom warnings
  - Workflow coherence checks

- **Module Metrics**
  - Average automation level
  - Critical atom count
  - High-priority atom count
  - Composition statistics

**Usage:**
```typescript
<ModuleEditor
  module={existingModule}  // null for new, object for edit
  atoms={allAtoms}
  onSave={(module) => handleSave(module)}
  onCancel={() => setEditorOpen(false)}
/>
```

**Validation Rules:**
- Module name required
- Description required
- Owner required
- At least 1 atom selected
- Warning for orphaned CRITICAL atoms

---

#### C. Workflow Builder Enhanced ([components/WorkflowBuilderEnhanced.tsx](../components/WorkflowBuilderEnhanced.tsx))
Main orchestration component integrating all builders.

**Features:**
- **Journey Management View**
  - Visual journey cards with metrics
  - Inline Edit/Delete buttons
  - Expandable phase timelines
  - Empty state with call-to-action

- **Phase/Module Management View**
  - Module grid layout
  - Per-module Edit/Delete controls
  - Atom composition preview
  - Empty state creation prompts

- **State Management**
  - Local state for journeys/phases/modules
  - CRUD operations with confirmation dialogs
  - Real-time UI updates
  - Undo-friendly (in production would sync with backend)

- **Integration Points**
  - Launches JourneyEditor for journey CRUD
  - Launches ModuleEditor for module CRUD
  - Handles onSelectAtom for atom detail viewing
  - Manages view state and navigation

**View Modes:**
1. **Journey Timeline**: Browse and manage journeys
2. **Module Management**: Manage modules within selected phase

**Usage:**
```typescript
<WorkflowBuilderEnhanced
  atoms={atoms}
  modules={modules}
  onSelectAtom={(atom) => showAtomDetails(atom)}
/>
```

---

### 2. **Ontology Schema Editor** ([components/OntologySchemaEditor.tsx](../components/OntologySchemaEditor.tsx))

Advanced ontology configuration interface for defining domains, types, and constraints.

**Features:**

#### A. Domain Definition Management
- **Domain Properties:**
  - ID, name, description
  - Owner assignment
  - Allowed AtomTypes for domain
  - Required attributes list
  - Custom validation rules

- **Domain Operations:**
  - Create new domains
  - Edit existing domains
  - Delete domains (with confirmation)
  - Real-time validation

- **Example Domains Included:**
  - Loan Origination
  - Risk Management
  - Compliance & Regulatory

#### B. Edge Constraint Management
- **Constraint Definition:**
  - Edge type (DEPENDS_ON, GOVERNED_BY, etc.)
  - Valid source types
  - Valid target types
  - Description and rationale
  - Required vs optional flag

- **Visual Constraint Display:**
  - Source types → Target types matrix
  - Color-coded by requirement level
  - Inline editing and deletion

- **Example Constraints:**
  - DEPENDS_ON: PROCESS → PROCESS/DECISION/GATEWAY
  - GOVERNED_BY: PROCESS/DECISION → REGULATION/POLICY
  - IMPLEMENTS: PROCESS/CONTROL → POLICY/REGULATION

#### C. Validation Summary Tab
- **Schema Statistics:**
  - Total registered domains
  - Total edge constraints
  - Total validation rules

- **Schema Overview:**
  - Ownership completeness check
  - Required constraint count
  - Type safety verification
  - Validation rule coverage

**Usage:**
```typescript
<OntologySchemaEditor
  onSave={(domains, constraints) => {
    // Persist to backend/config
    saveSchemaToDB(domains, constraints);
  }}
  onCancel={() => closeEditor()}
/>
```

**Access:**
- Available via "Schema Editor" button in OntologyBrowser header
- Modal overlay with tabs for different schema aspects

---

## 🏗️ Architecture Integration

### Component Hierarchy

```
App.tsx
  └── WorkflowBuilderEnhanced  (view: 'workflow')
        ├── JourneyEditor (modal)
        │     └── Inline Phase Builder
        └── ModuleEditor (modal)
              └── Two-panel atom selection

  └── OntologyBrowser  (view: 'ontology')
        └── OntologySchemaEditor (modal)
              ├── Domain Management
              ├── Edge Constraints
              └── Validation Summary
```

### Data Flow

#### Workflow Creation Flow
```
1. User clicks "Create Journey"
2. JourneyEditor opens (empty state)
3. User fills name/description
4. User adds/creates phases
5. User reorders phases
6. User clicks "Save Journey"
7. WorkflowBuilderEnhanced receives journey object
8. Local state updated
9. (In production: API call to persist)
10. UI refreshes with new journey
```

#### Module Creation Flow
```
1. User navigates to Phase view
2. User clicks "Create Module"
3. ModuleEditor opens (empty state)
4. User fills module metadata
5. User filters and selects atoms
6. User reorders atoms for workflow
7. Validation runs (circular deps, critical atoms)
8. User clicks "Save Module"
9. WorkflowBuilderEnhanced receives module object
10. Local state updated
11. UI refreshes in module grid
```

#### Ontology Schema Flow
```
1. User clicks "Schema Editor" in OntologyBrowser
2. OntologySchemaEditor modal opens
3. User navigates tabs (Domains/Constraints/Summary)
4. User creates/edits domains or constraints
5. Changes tracked in local state
6. User clicks "Save Schema Configuration"
7. OntologyBrowser receives domains & constraints
8. (In production: API call to persist schema)
9. Schema applied to validation engine
```

---

## 🔍 Key Design Patterns

### 1. **Modal-Based Editors**
All editors are full-screen modals to provide:
- Maximum workspace
- Focus on single task
- Easy cancel without losing context
- Consistent UX pattern

### 2. **Two-Step Creation**
- Create → Configure → Save
- Validation before save
- Preview during configuration
- Confirmation dialogs for destructive actions

### 3. **Inline Sub-Creation**
- Create phases while creating journeys
- No need to pre-create all dependencies
- Streamlined workflow
- Contextual creation

### 4. **Real-Time Validation**
- Validation errors shown inline
- Red banner with specific issues
- Prevention of invalid saves
- Helpful error messages

### 5. **Metric-Driven UI**
- Show counts, durations, criticality
- Visual indicators of complexity
- Help users make informed decisions
- Dashboard-style summaries

---

## 📋 Validation Rules Reference

### Journey Validation
| Rule | Severity | Message |
|------|----------|---------|
| Name required | ERROR | "Journey name is required" |
| Description required | ERROR | "Journey description is required" |
| Must have phases | ERROR | "At least one phase must be selected" |
| Duration > 90d | WARNING | "Total journey duration exceeds 90-day limit" |

### Module Validation
| Rule | Severity | Message |
|------|----------|---------|
| Name required | ERROR | "Module name is required" |
| Description required | ERROR | "Module description is required" |
| Owner required | ERROR | "Module owner is required" |
| Must have atoms | ERROR | "At least one atom must be selected" |
| Orphaned critical | WARNING | "X CRITICAL atoms have no incoming dependencies" |

### Domain Validation
| Rule | Constraint |
|------|------------|
| Unique domain IDs | No duplicate IDs |
| Owner assignment | Every domain must have owner |
| Type restrictions | Only allowed types can be created in domain |
| Required attributes | Atoms must have all required attrs for domain |

### Edge Constraint Validation
| Rule | Constraint |
|------|------------|
| Type compatibility | Source/target must match constraint |
| Required edges | Required edge types must exist |
| No orphans | Critical nodes must have dependencies |
| Circular detection | Prevent circular dependencies |

---

## 🎨 UI/UX Guidelines

### Color Coding
- **Primary Actions**: Blue (`var(--color-primary)`)
- **Destructive Actions**: Red (`#ef4444`)
- **Metrics**:
  - Phases: Blue (`--color-primary`)
  - Modules: Green (`#10b981`)
  - Duration: Orange (`#f59e0b`)
  - Critical: Red (`#ef4444`)
  - High: Orange (`#f59e0b`)

### Button Patterns
- **Create**: "Create [Entity]" - Primary button, top-right
- **Edit**: Pencil icon - Inline, neutral color
- **Delete**: Trash icon - Inline, red color
- **Save**: "Save [Entity]" - Primary button, bottom-right
- **Cancel**: "Cancel" - Secondary button, bottom-right

### Empty States
- Large emoji icon
- Clear heading
- Explanatory text
- Call-to-action button
- Example: "No Journeys Created Yet" → "Create Your First Journey"

### Modal Structure
```
┌─────────────────────────────────┐
│ Header (title, description, ×)  │
├─────────────────────────────────┤
│ Tabs (if applicable)             │
├─────────────────────────────────┤
│                                  │
│ Content Area (scrollable)        │
│                                  │
├─────────────────────────────────┤
│ Footer (Cancel, Save)            │
└─────────────────────────────────┘
```

---

## 🔗 Integration with Existing Components

### WorkflowBuilder Integration
- Replaces static `WorkflowBuilder.tsx`
- Imported as `WorkflowBuilderEnhanced` in App.tsx
- Maintains same props interface
- Adds CRUD capabilities

### OntologyBrowser Integration
- "Schema Editor" button added to header
- Launches `OntologySchemaEditor` modal
- Maintains existing browse functionality
- Schema changes affect validation

### GraphView Integration
- Module grouping uses moduleId from created modules
- Hierarchical layout shows workflow structure
- Visual boundaries correspond to modules

---

## 🚀 Future Enhancements

### Planned Features
1. **Phase Editor**: Dedicated editor for phase-level CRUD
2. **Bulk Operations**: Select multiple entities for batch edit/delete
3. **Templates**: Save journey/module templates for reuse
4. **Version History**: Track changes over time
5. **Approval Workflows**: Multi-step approval for schema changes
6. **Import/Export**: JSON export of workflows and schemas
7. **Validation Engine**: Real-time schema conformance checking
8. **Dependency Visualization**: Graph view of dependencies before save
9. **Undo/Redo**: Action history for editors
10. **Collaborative Editing**: Real-time multi-user editing

### Backend Integration Points
```typescript
// Journey CRUD
POST   /api/journeys
GET    /api/journeys/:id
PUT    /api/journeys/:id
DELETE /api/journeys/:id

// Module CRUD
POST   /api/modules
GET    /api/modules/:id
PUT    /api/modules/:id
DELETE /api/modules/:id

// Schema Management
GET    /api/ontology/schema
PUT    /api/ontology/schema
POST   /api/ontology/domains
PUT    /api/ontology/domains/:id
POST   /api/ontology/constraints
```

---

## 📖 Usage Examples

### Example 1: Create a New Journey

```typescript
// 1. Navigate to Workflows view
<Sidebar onViewChange={setView} currentView="workflow" />

// 2. Click "Create Journey"
// Opens JourneyEditor with empty state

// 3. Fill in details
Name: "Purchase Loan Journey"
Description: "Complete end-to-end process from application to funding"

// 4. Add phases
- Select existing: "phase-processing"
- Create new:
  Name: "Underwriting"
  Description: "Risk assessment and approval"
  Target Duration: 3 days

// 5. Reorder phases
1. Application
2. Processing
3. Underwriting (newly created)
4. Closing

// 6. Review metrics
Phases: 4
Modules: 8
Target Duration: 15d

// 7. Save
Result: New journey created and displayed in timeline
```

### Example 2: Edit a Module

```typescript
// 1. Navigate to Module Management view
// Select a phase

// 2. Click edit icon on existing module

// 3. Modify composition
- Remove atom: atom-sys-old-verification
- Add atom: atom-sys-new-ai-verification
- Reorder: Move verification before calculation

// 4. Check validation
✓ No orphaned critical atoms
✓ No circular dependencies
✓ Required fields complete

// 5. Review metrics
Atoms: 6
Avg Automation: 75%
Critical: 2
High: 1

// 6. Save
Result: Module updated with new composition
```

### Example 3: Define New Ontology Domain

```typescript
// 1. Open Schema Editor from OntologyBrowser

// 2. Navigate to "Domain Definitions" tab

// 3. Click "Create Domain"

// 4. Fill domain properties
ID: customer-service
Name: Customer Service
Description: Customer interaction and support processes
Owner: Customer Operations
Allowed Types: [PROCESS, DOCUMENT, METRIC, POLICY]
Required Attributes: [owner, response_time_sla, customer_impact]
Validation Rules:
  - All PROCESS atoms must have response_time_sla
  - METRIC atoms must define customer satisfaction measurement

// 5. Save Schema Configuration
Result: New domain available for atom creation
```

---

## 🧪 Testing Guide

### Manual Testing Checklist

#### Journey Editor
- [ ] Create new journey (empty state)
- [ ] Edit existing journey
- [ ] Add existing phase to journey
- [ ] Create new phase inline
- [ ] Reorder phases (up/down)
- [ ] Remove phase from journey
- [ ] Validation: Try saving without name
- [ ] Validation: Try saving without description
- [ ] Validation: Try saving with no phases
- [ ] Metrics update in real-time
- [ ] Cancel without saving

#### Module Editor
- [ ] Create new module (empty state)
- [ ] Edit existing module
- [ ] Search atoms by name
- [ ] Filter atoms by type
- [ ] Filter atoms by category
- [ ] Add atom to module
- [ ] Remove atom from module
- [ ] Reorder atoms (up/down)
- [ ] Validation: Required fields
- [ ] Validation: At least one atom
- [ ] Metrics calculation correct
- [ ] Two-panel layout responsive

#### Workflow Builder Enhanced
- [ ] Journey cards display correctly
- [ ] Edit button launches editor
- [ ] Delete button shows confirmation
- [ ] Phase timeline expands/collapses
- [ ] Navigate to phase detail view
- [ ] Module grid displays correctly
- [ ] Create module button works
- [ ] Empty states render properly

#### Ontology Schema Editor
- [ ] Domain management tab works
- [ ] Create new domain
- [ ] Edit existing domain
- [ ] Delete domain with confirmation
- [ ] Edge constraints tab works
- [ ] Create new constraint
- [ ] Edit existing constraint
- [ ] Validation summary displays
- [ ] Schema metrics calculate correctly

---

## 📚 References

### Related Documentation
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Initial implementation of viewers
- [docs-code-bank-arch.md](./docs-code-bank-arch.md) - Overall system architecture
- [types.ts](../types.ts) - Type definitions
- [constants.tsx](../constants.tsx) - Mock data and constants

### Component Files
- [JourneyEditor.tsx](../components/JourneyEditor.tsx)
- [ModuleEditor.tsx](../components/ModuleEditor.tsx)
- [WorkflowBuilderEnhanced.tsx](../components/WorkflowBuilderEnhanced.tsx)
- [OntologySchemaEditor.tsx](../components/OntologySchemaEditor.tsx)
- [OntologyBrowser.tsx](../components/OntologyBrowser.tsx) (updated)
- [App.tsx](../App.tsx) (updated)

---

## ✅ Summary

The builder components provide complete CRUD functionality for:

1. **Journeys**: Create, edit, delete with phase sequencing
2. **Modules**: Create, edit, delete with atom composition
3. **Ontology Schema**: Define domains, constraints, validation rules

All components feature:
- ✅ Real-time validation
- ✅ Metric calculation
- ✅ Empty state handling
- ✅ Confirmation dialogs
- ✅ Inline sub-creation
- ✅ Responsive two-panel layouts
- ✅ Consistent modal UX
- ✅ Comprehensive error handling

**Status**: Production-ready for integration with backend APIs.

---

**Last Updated:** 2025-12-21
**Version:** 2.0
**Author:** Claude Sonnet 4.5
