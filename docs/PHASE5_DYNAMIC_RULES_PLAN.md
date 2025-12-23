# Phase 5: Dynamic Process Rewriting - Make It Real

**Goal:** Transform the runtime simulator from a demo into a production-ready rule management system with persistence, UI builder, and actual workflow modification.

**Current State (65%):**
- ✅ Runtime engine with 13 hardcoded rules
- ✅ RuntimeSimulator for testing scenarios
- ✅ Rule evaluation logic in Python
- ❌ No rule persistence (rules lost on server restart)
- ❌ No rule builder UI (can't create new rules)
- ❌ Rules are hardcoded in runtime.py

**Target State (95%):**
- ✅ Rule persistence (database + YAML files)
- ✅ Rule Builder UI (visual editor for creating rules)
- ✅ Rule Manager dashboard (view/edit/delete/activate rules)
- ✅ Rule versioning and audit trail
- ✅ Dynamic rule loading (no code changes needed)
- ✅ Before/After visualization of rule effects

---

## Architecture Design

### 1. Rule Persistence Schema

#### Database Model (SQLite/JSON)
```python
# data/rules/rules.json
{
  "rules": [
    {
      "rule_id": "rule-low-credit-score-v1",
      "name": "Low Credit Score Review",
      "description": "Requires manual review for credit scores below 620",
      "priority": 9,
      "active": true,
      "created_at": "2025-12-23T10:00:00Z",
      "updated_at": "2025-12-23T10:00:00Z",
      "created_by": "admin@bank.com",
      "version": 1,

      "condition": {
        "type": "AND",  # Can be AND, OR, NOT
        "rules": [
          {
            "field": "customer_data.credit_score",
            "operator": "LESS_THAN",
            "value": 620
          }
        ]
      },

      "action": {
        "type": "INSERT_PHASE",
        "phase": {
          "id": "phase-manual-credit-review",
          "name": "Manual Credit Review",
          "description": "Manual review required for borderline credit profiles",
          "position": "AFTER",  # BEFORE, AFTER, REPLACE, AT_START, AT_END
          "reference_phase": "phase-assessment",
          "modules": ["module-credit-deep-dive"],
          "target_duration_days": 2
        },
        "modification": {
          "reason": "Credit score below acceptable threshold",
          "criticality": "HIGH"
        }
      }
    }
  ]
}
```

#### YAML Backup (Git-tracked)
```yaml
# rules/rule-low-credit-score-v1.yaml
rule_id: rule-low-credit-score-v1
name: Low Credit Score Review
description: Requires manual review for credit scores below 620
priority: 9
active: true
created_at: 2025-12-23T10:00:00Z
updated_at: 2025-12-23T10:00:00Z
created_by: admin@bank.com
version: 1

condition:
  type: AND
  rules:
    - field: customer_data.credit_score
      operator: LESS_THAN
      value: 620

action:
  type: INSERT_PHASE
  phase:
    id: phase-manual-credit-review
    name: Manual Credit Review
    description: Manual review required for borderline credit profiles
    position: AFTER
    reference_phase: phase-assessment
    modules:
      - module-credit-deep-dive
    target_duration_days: 2
  modification:
    reason: Credit score below acceptable threshold
    criticality: HIGH
```

### 2. Rule API Endpoints

```python
# api/routes/rules.py

@router.get("/api/rules")
def list_rules(active_only: bool = False) -> List[RuleDefinition]:
    """Get all rules (optionally filter to active only)"""

@router.get("/api/rules/{rule_id}")
def get_rule(rule_id: str) -> RuleDefinition:
    """Get a specific rule by ID"""

@router.post("/api/rules")
def create_rule(rule: CreateRuleRequest) -> RuleDefinition:
    """Create a new rule and save to storage"""

@router.put("/api/rules/{rule_id}")
def update_rule(rule_id: str, updates: UpdateRuleRequest) -> RuleDefinition:
    """Update an existing rule (creates new version)"""

@router.delete("/api/rules/{rule_id}")
def delete_rule(rule_id: str) -> Dict[str, str]:
    """Soft-delete a rule (sets active=false)"""

@router.post("/api/rules/{rule_id}/activate")
def activate_rule(rule_id: str) -> RuleDefinition:
    """Activate a rule"""

@router.post("/api/rules/{rule_id}/deactivate")
def deactivate_rule(rule_id: str) -> RuleDefinition:
    """Deactivate a rule"""

@router.get("/api/rules/{rule_id}/versions")
def get_rule_versions(rule_id: str) -> List[RuleDefinition]:
    """Get all versions of a rule"""

@router.post("/api/rules/{rule_id}/test")
def test_rule(rule_id: str, context: RuntimeContext) -> TestRuleResult:
    """Test a rule against a specific context (dry run)"""
```

### 3. Rule Builder UI Component

**Location:** `components/RuleBuilder.tsx`

**Features:**
1. **Rule Metadata Section**
   - Name (text input)
   - Description (textarea)
   - Priority (1-10 slider with labels)
   - Active toggle

2. **Condition Builder (Visual)**
   - Add/Remove condition groups
   - AND/OR/NOT logic operators
   - Field selector (dropdown of all available fields)
   - Operator selector (EQUALS, NOT_EQUALS, GREATER_THAN, LESS_THAN, CONTAINS, IN, etc.)
   - Value input (text/number/checkbox based on field type)
   - Nested condition support (groups within groups)

3. **Action Builder**
   - Action type selector (INSERT_PHASE, REMOVE_PHASE, REPLACE_PHASE, MODIFY_PHASE)
   - Phase selector (dropdown of available phases)
   - Position selector (BEFORE, AFTER, REPLACE, AT_START, AT_END)
   - Reference phase selector (which phase to insert before/after)
   - Reason text input
   - Criticality selector (LOW, MEDIUM, HIGH, CRITICAL)

4. **Preview Panel**
   - JSON preview of rule structure
   - Validation errors/warnings
   - Test scenario quick-test

5. **Actions**
   - Save (creates or updates rule)
   - Test (opens test modal)
   - Cancel
   - Delete (if editing existing rule)

**UI Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Rule Builder                                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Name: [Low Credit Score Review              ]          │
│  Description: [Requires manual review...      ]          │
│  Priority: ────●────── 9                                │
│  Active: [✓]                                            │
│                                                          │
│  ┌─ Conditions ─────────────────────────────┐           │
│  │ AND                          [+ Add OR] │           │
│  │                                          │           │
│  │  ┌─ Condition 1 ──────────────────────┐ │           │
│  │  │ Field:    [customer_data.credit_sc▼]│ │           │
│  │  │ Operator: [LESS_THAN              ▼]│ │           │
│  │  │ Value:    [620                     ]│ │           │
│  │  │                          [Remove]  │ │           │
│  │  └─────────────────────────────────────┘ │           │
│  │                             [+ Add Rule] │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
│  ┌─ Action ─────────────────────────────────┐           │
│  │ Type: [INSERT_PHASE                    ▼]│           │
│  │ Phase: [phase-manual-credit-review     ▼]│           │
│  │ Position: [AFTER                       ▼]│           │
│  │ Reference: [phase-assessment           ▼]│           │
│  │ Reason: [Credit score below threshold  ]│           │
│  │ Criticality: (•) Low ( ) Med (•) High    │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
│  [Preview JSON]  [Test Rule]  [Save]  [Cancel]          │
└─────────────────────────────────────────────────────────┘
```

### 4. Rule Manager Dashboard

**Location:** `components/RuleManager.tsx`

**Features:**
1. **Rule List Table**
   - Columns: Name, Priority, Active, Created, Updated, Actions
   - Sortable by all columns
   - Filter by active status
   - Search by name/description

2. **Actions Per Row**
   - Edit (opens RuleBuilder)
   - Test (opens test modal)
   - Activate/Deactivate toggle
   - Delete (soft delete)
   - View Versions (shows version history)

3. **Toolbar**
   - Create New Rule button
   - Import from YAML
   - Export All Rules
   - Sync to Git (commit rule changes)

4. **Rule Details Panel** (when row selected)
   - Full rule definition (JSON view)
   - Condition visualization
   - Action details
   - Usage statistics (how many times triggered)

**UI Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│  Rule Manager                                  [+ New Rule]      │
├──────────────────────────────────────────────────────────────────┤
│  Search: [____________]  Filter: [All Rules ▼]  [⚙ Sync to Git] │
├────┬─────────────────┬──────┬──────┬────────────┬──────────────┤
│ ✓  │ Name            │ Pri  │Active│ Updated    │ Actions      │
├────┼─────────────────┼──────┼──────┼────────────┼──────────────┤
│ [✓]│ Low Credit      │  9   │  ●   │ 2025-12-23 │ ✏️ 🧪 🗑️ 📋 │
│ [ ]│ High Value Txn  │ 10   │  ●   │ 2025-12-22 │ ✏️ 🧪 🗑️ 📋 │
│ [✓]│ Compliance Chk  │  8   │  ○   │ 2025-12-20 │ ✏️ 🧪 🗑️ 📋 │
│ ...│                 │      │      │            │              │
├────┴─────────────────┴──────┴──────┴────────────┴──────────────┤
│ Selected: Low Credit Score Review (rule-low-credit-score-v1)   │
│                                                                  │
│ Condition: customer_data.credit_score < 620                     │
│ Action: INSERT_PHASE phase-manual-credit-review AFTER phase-... │
│ Times Triggered: 1,234 (last 30 days)                           │
│ Average Risk Impact: +0.15                                      │
└──────────────────────────────────────────────────────────────────┘
```

### 5. Integration Points

1. **Navigation (Sidebar)**
   - Add "Rule Manager" under Tools section
   - Badge showing active rule count

2. **RuntimeSimulator Enhancement**
   - Show which rules were triggered in result
   - Link to edit rule from triggered rule list
   - "Create Rule from This Scenario" button

3. **Journey Editor Integration**
   - Button to "Preview with Rules" (shows modified journey)
   - Visual diff showing original vs rule-modified journey

---

## Implementation Plan

### Week 1: Backend Foundation (16 hours)

#### Day 1-2: Rule Persistence (6 hours)
1. Create `data/rules/` directory structure
2. Implement rule JSON schema validation
3. Create rule storage layer (read/write JSON + YAML)
4. Add rule versioning logic
5. Git integration for YAML backup

#### Day 3-4: Rule API (6 hours)
1. Create `api/routes/rules.py`
2. Implement all CRUD endpoints
3. Add rule activation/deactivation
4. Add version history endpoint
5. Add test endpoint for dry-run

#### Day 5: Dynamic Rule Loading (4 hours)
1. Refactor `ProcessRewriteEngine` to load rules from storage
2. Add hot-reload capability (no restart needed)
3. Replace hardcoded rules with dynamic loading
4. Add rule caching for performance

### Week 2: Frontend UI (16 hours)

#### Day 1-2: RuleBuilder Component (8 hours)
1. Create basic component structure
2. Implement condition builder with visual editor
3. Implement action builder
4. Add JSON preview panel
5. Add validation logic
6. Wire up to API (save/update/delete)

#### Day 3: RuleManager Dashboard (6 hours)
1. Create table view with sorting/filtering
2. Add row actions (edit/test/delete/activate)
3. Add details panel
4. Wire up to API (list/get/delete)

#### Day 4: Integration & Polish (2 hours)
1. Add "Rule Manager" to sidebar
2. Enhance RuntimeSimulator with rule links
3. Add success/error notifications
4. Final UI polish and testing

### Week 3: Testing & Documentation (8 hours)

#### Day 1-2: Testing (4 hours)
1. Create test rules in UI
2. Test rule evaluation in simulator
3. Test version history
4. Test activate/deactivate
5. Test Git sync

#### Day 3: Documentation (4 hours)
1. Update IMPLEMENTATION_ROADMAP.md
2. Create RULE_MANAGEMENT_GUIDE.md
3. Add API documentation
4. Record demo video/screenshots

---

## Success Criteria

✅ **Persistence Works**
- Rules saved to JSON + YAML
- Rules survive server restart
- Version history tracked
- Git commits for rule changes

✅ **UI is Usable**
- Can create new rule without code
- Visual condition builder is intuitive
- Preview shows rule JSON
- Test feature works

✅ **Integration is Seamless**
- RuntimeSimulator uses dynamic rules
- Rules can be edited from simulator
- Navigation includes Rule Manager
- No hardcoded rules in runtime.py

✅ **Before/After Visualization**
- Can see original vs modified journey
- Rule trigger count tracked
- Impact metrics shown

---

## Metrics for Success

| Metric | Current | Target |
|--------|---------|--------|
| **Dynamic Process Rewriting** | 65% | 95% |
| **Rules Hardcoded** | 13 | 0 |
| **Rules in Storage** | 0 | 13+ |
| **Rule Builder Exists** | ❌ | ✅ |
| **Rule Management UI** | ❌ | ✅ |
| **Hot Reload** | ❌ | ✅ |
| **Version History** | ❌ | ✅ |
| **Git Integration** | ❌ | ✅ |

---

## File Structure

```
api/
  routes/
    rules.py                    # NEW - Rule management API
    runtime.py                  # MODIFIED - Dynamic rule loading
data/
  rules/
    rules.json                  # NEW - Rule storage (primary)
    rule-{id}-v{n}.yaml         # NEW - Git-tracked rule backups
components/
  RuleBuilder.tsx               # NEW - Visual rule editor
  RuleManager.tsx               # NEW - Rule dashboard
  RuntimeSimulator.tsx          # MODIFIED - Link to rule editor
docs/
  PHASE5_DYNAMIC_RULES_PLAN.md  # THIS FILE
  RULE_MANAGEMENT_GUIDE.md      # NEW - User documentation
```

---

## Next Steps

1. **Get User Approval** - Confirm this approach aligns with vision
2. **Start Week 1** - Build backend persistence and API
3. **Iterate** - Build UI incrementally with frequent demos
4. **Test** - Validate with real banking scenarios
5. **Deploy** - Make rules production-ready
