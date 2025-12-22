# GNDP Implementation Roadmap
**Living Knowledge Graph: From Foundation to Intelligence**

## Current State Assessment (50% Complete)

### Architectural Objectives Progress

| Objective | Status | Current % | What Works | What's Missing |
|-----------|--------|-----------|------------|----------------|
| **Docs are Code** | 🟡 Partial | 70% | ✓ YAML atoms with versioning<br>✓ Git-based change tracking<br>✓ JSON Schema validation | ❌ No automated testing framework<br>❌ No deployment pipeline<br>❌ No validation in CI/CD |
| **Atoms + Molecules + Workflows** | 🟡 Partial | 60% | ✓ Well-defined atom model (124 atoms)<br>✓ Module (molecule) builder UI<br>✓ Journey editor with inline phase creation | ❌ **No dedicated Phase viewer**<br>❌ Phase-to-graph navigation missing<br>❌ Workflow context not in graph |
| **Ontology Ownership** | 🟡 Partial | 50% | ✓ Owner/steward fields in data model<br>✓ OntologySchemaEditor for domains/constraints<br>✓ Domain definitions | ❌ **No git lineage tracking**<br>❌ No change attribution UI<br>❌ No ownership history |
| **Dynamic Process Rewriting** | 🔴 Critical Gap | 5% | ✓ Data structure supports it | ❌ **NO runtime engine**<br>❌ No rule evaluation system<br>❌ No compliance-driven workflow modification<br>❌ Static workflows only |
| **Risk-Aware CI/CD** | 🟢 Strong | 75% | ✓ Claude-powered PR analysis (.github/workflows/pr-analysis.yml)<br>✓ impact_analysis.py with risk scoring<br>✓ Automated issue creation | ❌ **Not integrated in UI**<br>❌ No visual impact propagation<br>❌ No control validation automation |
| **System Thinking** | 🟡 Partial | 40% | ✓ Graph data structure with edges<br>✓ D3 visualization (GraphView.tsx)<br>✓ Multiple layout modes | ❌ **Graph view too simplistic**<br>❌ **No feedback loop visualization**<br>❌ No metrics → process optimization<br>❌ No impact propagation UI |

**Overall Completion: 50%** - Strong foundations, missing intelligence layer

---

## Critical Gaps Identified

### Gap 1: No Phase-Centric View (HIGH IMPACT)

**Problem:** Phases are the missing link between journeys and atoms, but have no dedicated UI.

**Current State:**
- Phases mentioned in WorkflowBuilder timeline (read-only)
- Phases creatable in JourneyEditor (inline only)
- NO standalone phase browser/editor

**Impact:**
- Can't understand workflow composition at phase level
- No phase-to-graph navigation
- Missing the "molecule" layer in Atom → Module → **Phase** → Journey hierarchy

**Solution:** Build PhaseExplorer.tsx (Priority 1)

### Gap 2: Graph View is Static, Not "Living" (HIGH IMPACT)

**Problem:** Graph doesn't adapt to context or show system dynamics.

**Current State:**
- Shows all atoms in flat network
- Basic filtering by type
- No journey/phase/module context
- No risk/compliance overlay
- No impact propagation visualization

**Impact:**
- Can't see "living knowledge graph" in action
- No connection between workflow builders and graph
- Missing the core value proposition

**Solution:** Add context modes and overlays to GraphView.tsx (Priority 2)

### Gap 3: Disconnected Views (MEDIUM IMPACT)

**Problem:** Workflow, Ontology, and Graph exist in silos.

**Current State:**
- Click a journey → can't see its graph
- Click an atom in graph → can't see its journey context
- No cross-navigation between views

**Impact:**
- User must manually correlate information
- System doesn't feel integrated
- Can't follow impact chains

**Solution:** Build integration layer with cross-view navigation (Priority 3)

### Gap 4: No Runtime Intelligence (VISION GAP)

**Problem:** This is what makes it "living" - currently 95% missing.

**Current State:**
- Workflows are static YAML
- No rule-based modification
- Metrics collected but not acted upon
- No feedback loops

**Impact:**
- System can't adapt to risk/compliance changes
- No "Dynamic Process Rewriting"
- No learning or optimization

**Solution:** Build runtime engine and feedback loop system (Long-term)

---

## Implementation Plan

### Phase 1: Bridge the Gaps (Short Term - Sessions 1-2)

#### Priority 1: PhaseExplorer Component ⚡ **START HERE**

**Goal:** Create dedicated phase management UI to complete the hierarchy.

**Component Structure:**
```
components/PhaseExplorer.tsx
├── PhaseList (left panel - 30% width)
│   ├── Group by Journey
│   ├── Filter by criticality/status
│   ├── Search by name
│   ├── Sort by sequence
│   └── Create Phase button
├── PhaseDetail (center - 40% width)
│   ├── Metadata card
│   │   ├── Name, description, sequence
│   │   ├── Duration, criticality
│   │   ├── Owner, team
│   │   └── Status indicator
│   ├── Module Composition
│   │   ├── List of modules in phase
│   │   ├── Sequence/order display
│   │   ├── Add/Remove modules
│   │   └── Module metrics summary
│   ├── Atom Breakdown
│   │   ├── All atoms within phase modules
│   │   ├── Aggregated metrics
│   │   ├── Criticality distribution
│   │   └── Compliance scores
│   └── Edit Controls
│       ├── Edit Phase button
│       ├── Delete Phase (with confirmation)
│       └── Duplicate Phase
└── PhaseGraph (right - 30% width)
    ├── Mini D3 graph showing atoms in phase
    ├── Module boundaries visualized
    ├── Edge relationships
    ├── Click atom → navigate to main graph
    └── Zoom/pan controls
```

**Features:**
- View all phases across all journeys
- Filter/search/sort phases
- See module composition and atom breakdown
- Edit phase metadata
- Visualize phase-level atom graph
- Navigate to full graph view with phase context

**Integration Points:**
- Sidebar: Add "Phases" navigation item
- WorkflowBuilder: Link from phase timeline to PhaseExplorer
- GraphView: Accept `phaseId` context parameter
- JourneyEditor: Link to PhaseExplorer for existing phases

**Files to Create/Modify:**
- ✅ Create `components/PhaseExplorer.tsx` (new component)
- ✅ Create `components/PhaseEditor.tsx` (modal for editing)
- ✅ Update `components/Sidebar.tsx` (add Phases nav item)
- ✅ Update `App.tsx` (add phase route)
- ✅ Update `types.ts` (add 'phases' to ViewType)

**Acceptance Criteria:**
- [ ] Can browse all phases across journeys
- [ ] Can filter/search phases
- [ ] Can see module composition
- [ ] Can see atom breakdown with metrics
- [ ] Can navigate phase → graph with context
- [ ] Can edit phase metadata
- [ ] Mini-graph shows phase atom relationships

---

#### Priority 2: Enhanced Graph View with Context

**Goal:** Transform graph from static to contextual and intelligent.

**New Context Modes:**
```typescript
type GraphContext =
  | { mode: 'global'; filters?: { types?: AtomType[]; criticality?: string[] } }
  | { mode: 'journey'; journeyId: string; highlightPath?: boolean }
  | { mode: 'phase'; phaseId: string; showModuleBoundaries?: boolean }
  | { mode: 'module'; moduleId: string; expandDependencies?: boolean }
  | { mode: 'impact'; atomId: string; depth: number; direction: 'upstream' | 'downstream' | 'both' }
  | { mode: 'risk'; minCriticality?: string; showControls?: boolean }
```

**Features to Add:**

1. **Context Selector UI**
   - Dropdown to switch modes
   - Context-specific controls
   - Breadcrumb navigation

2. **Journey Mode**
   - Show only atoms in journey's phases/modules
   - Highlight critical path
   - Color-code by phase
   - Show phase boundaries

3. **Phase Mode**
   - Focused graph for single phase
   - Module grouping visible
   - Sequence indicators
   - Link to PhaseExplorer

4. **Impact Mode**
   - Click atom → highlight dependencies
   - Upstream (what feeds this)
   - Downstream (what depends on this)
   - Depth control (1-3 levels)
   - Edge animation showing flow

5. **Risk Overlay**
   - Color atoms by criticality
   - Show compliance scores
   - Highlight control atoms
   - Filter by risk threshold

6. **Navigation Integration**
   - Click atom → show journey path
   - Right-click → context menu (View in Journey, View Phase, Edit)
   - Double-click → drill into dependencies

**Files to Modify:**
- ✅ `components/GraphView.tsx` - Add context prop and rendering logic
- ✅ `components/Sidebar.tsx` - Update graph nav with context picker
- ✅ `App.tsx` - Pass context to GraphView
- ✅ `types.ts` - Add GraphContext type

**Acceptance Criteria:**
- [ ] Can switch between context modes
- [ ] Journey mode filters atoms correctly
- [ ] Phase mode shows module boundaries
- [ ] Impact mode highlights dependencies with depth control
- [ ] Risk overlay colors by criticality
- [ ] Click navigation works (atom → journey, atom → phase)

---

#### Priority 3: Cross-View Navigation Integration

**Goal:** Connect workflow builders, phase explorer, and graph view.

**Navigation Flows:**

```
WorkflowBuilder (Journey Timeline)
  ↓ Click Journey Card
  → GraphView (mode: 'journey')
  ↓ Click Phase in Timeline
  → PhaseExplorer (selected phase)
  ↓ Click "View Graph"
  → GraphView (mode: 'phase')

PhaseExplorer
  ↓ Click Phase
  → GraphView (mode: 'phase')
  ↓ Click Module in Phase
  → GraphView (mode: 'module')
  ↓ Click Atom in Mini-Graph
  → GraphView (mode: 'impact', selected atom)

GraphView
  ↓ Right-click Atom → "View Journey"
  → WorkflowBuilder (scroll to atom's journey)
  ↓ Right-click Atom → "View Phase"
  → PhaseExplorer (scroll to atom's phase)
  ↓ Click Module Boundary
  → ModuleEditor (edit mode)
```

**Implementation:**

1. **Navigation State Management**
```typescript
// Add to App.tsx
const [navigationContext, setNavigationContext] = useState<{
  sourceView: ViewType;
  targetView: ViewType;
  context: any;
}>();

const navigateTo = (target: ViewType, context: any) => {
  setNavigationContext({ sourceView: currentView, targetView: target, context });
  setCurrentView(target);
};
```

2. **Context Preservation**
```typescript
// When navigating, preserve context
GraphView: { selectedAtom, highlightJourney, phaseFilter }
PhaseExplorer: { selectedPhase, journeyFilter }
WorkflowBuilder: { expandedJourney, highlightedPhase }
```

3. **Breadcrumb Navigation**
```typescript
// Add breadcrumb component
<Breadcrumb>
  <BreadcrumbItem>Workflows</BreadcrumbItem>
  <BreadcrumbItem>Customer Onboarding Journey</BreadcrumbItem>
  <BreadcrumbItem>Pre-Application Phase</BreadcrumbItem>
  <BreadcrumbItem active>Graph View</BreadcrumbItem>
</Breadcrumb>
```

**Files to Modify:**
- ✅ `App.tsx` - Add navigation state management
- ✅ `components/WorkflowBuilderEnhanced.tsx` - Add click handlers
- ✅ `components/PhaseExplorer.tsx` - Add navigation buttons
- ✅ `components/GraphView.tsx` - Add context menu
- ✅ Create `components/Breadcrumb.tsx` - Navigation breadcrumb

**Acceptance Criteria:**
- [ ] Can navigate Journey → Graph → Phase → Graph
- [ ] Context preserved across navigation
- [ ] Breadcrumb shows navigation path
- [ ] Back/forward navigation works
- [ ] Selected items remain highlighted

---

### Phase 2: Intelligence Layer (Medium Term - Sessions 3-5)

#### Priority 4: Impact Analysis UI

**Goal:** Visualize downstream effects of changes.

**Features:**
- Impact propagation view (what breaks if this changes)
- Dependency chain visualization
- Risk assessment for changes
- Integration with existing impact_analysis.py

**Component:**
```
components/ImpactAnalyzer.tsx
├── Change Selector (select atom/module to modify)
├── Impact Graph (show affected atoms)
├── Risk Assessment (criticality, compliance impact)
└── Mitigation Suggestions
```

#### Priority 5: Lineage Tracking Integration

**Goal:** Show git history for atoms and workflows.

**Features:**
- Git blame integration for atoms
- Change history timeline
- Owner attribution by commits
- Version comparison (diff view)

**Component:**
```
components/LineageViewer.tsx
├── Timeline of changes
├── Author attribution
├── Commit messages
└── Diff view
```

#### Priority 6: Risk/Compliance Overlay

**Goal:** Visual risk and compliance status throughout UI.

**Features:**
- Compliance score badges on atoms
- Risk heatmap in graph view
- Control validation status
- Alert indicators for violations

**Enhancements:**
- Add risk badges to AtomExplorer cards
- Color-code graph nodes by compliance
- Show control coverage metrics
- Highlight missing controls

---

### Phase 3: Runtime Intelligence (Long Term - Vision)

#### Priority 7: Dynamic Process Rewriting Engine

**Goal:** Workflows that adapt based on risk, compliance, and context.

**Architecture:**
```python
# api/routes/runtime.py
class ProcessRewriteEngine:
    def evaluate_journey(self, journey: Journey, context: dict) -> Journey:
        """Apply rules to modify workflow at runtime"""

        # Risk-based routing
        if context['customer']['credit_score'] < 620:
            journey = self.insert_manual_review_step(journey)

        # Compliance requirements
        if context['loan_amount'] > 1_000_000:
            journey = self.add_senior_approval_gate(journey)

        # Missing controls
        for phase in journey.phases:
            if self.missing_required_control(phase):
                phase.modules.append(self.get_compensating_control())

        return journey

    def insert_manual_review_step(self, journey: Journey) -> Journey:
        """Add manual review phase for high-risk scenarios"""
        review_phase = Phase(
            id="phase-manual-review",
            name="Manual Credit Review",
            modules=["module-credit-analysis", "module-underwriter-review"]
        )
        journey.phases.insert(2, review_phase)  # After pre-qual
        return journey
```

**UI Integration:**
```typescript
// components/RuntimeSimulator.tsx
<RuntimeSimulator>
  <ContextInput>
    {/* User inputs scenario: credit score, loan amount, etc. */}
  </ContextInput>
  <ProcessComparison>
    <ProcessView title="Standard Flow" journey={standardJourney} />
    <ProcessView title="Runtime Modified" journey={modifiedJourney} />
  </ProcessComparison>
  <ChangeSummary>
    {/* Shows what was added/removed and why */}
  </ChangeSummary>
</RuntimeSimulator>
```

#### Priority 8: Feedback Loop System

**Goal:** Metrics drive process optimization.

**Architecture:**
```python
# api/routes/feedback.py
class FeedbackLoopEngine:
    def analyze_performance(self, module: Module) -> dict:
        """Analyze metrics and suggest improvements"""

        suggestions = []

        # High error rate
        if module.metrics.error_rate > 0.05:
            suggestions.append({
                'type': 'quality',
                'severity': 'high',
                'issue': f'Error rate {module.metrics.error_rate:.1%} exceeds threshold',
                'recommendation': 'Add validation atoms or error handling',
                'suggested_atoms': self.get_validation_atoms()
            })

        # Slow cycle time
        if module.metrics.avg_cycle_time_mins > module.sla_mins:
            suggestions.append({
                'type': 'performance',
                'severity': 'medium',
                'issue': f'Cycle time {module.metrics.avg_cycle_time_mins}min exceeds SLA',
                'recommendation': 'Consider automation opportunities',
                'automation_candidates': self.find_automation_candidates(module)
            })

        # Low automation
        if module.metrics.automation_level < 0.5:
            suggestions.append({
                'type': 'efficiency',
                'severity': 'low',
                'issue': f'Only {module.metrics.automation_level:.0%} automated',
                'recommendation': 'Identify manual steps for automation',
                'roi_estimate': self.calculate_automation_roi(module)
            })

        return {'module': module.id, 'suggestions': suggestions}
```

**UI Integration:**
```typescript
// components/OptimizationDashboard.tsx
<OptimizationDashboard>
  <MetricsOverview modules={modules} />
  <SuggestionsList>
    {suggestions.map(s => (
      <SuggestionCard
        issue={s.issue}
        recommendation={s.recommendation}
        severity={s.severity}
        onApply={() => applySuggestion(s)}
        onDismiss={() => dismissSuggestion(s)}
      />
    ))}
  </SuggestionsList>
  <ImpactSimulator>
    {/* Preview what happens if suggestion is applied */}
  </ImpactSimulator>
</OptimizationDashboard>
```

#### Priority 9: Real-Time Collaboration

**Goal:** Multi-user editing with conflict resolution.

**Features:**
- WebSocket-based live updates
- Operational transformation for concurrent edits
- User presence indicators
- Change notifications
- Conflict resolution UI

**Technology:**
- Backend: FastAPI WebSockets
- Frontend: WebSocket client with reconnection
- State sync: Yjs or ShareDB for CRDT

---

## Success Metrics

### Phase 1 (Short Term)
- [ ] Phase Explorer with full CRUD operations
- [ ] Graph view supports 5+ context modes
- [ ] Can navigate Journey → Phase → Graph → Atom and back
- [ ] All views feel integrated, not siloed

### Phase 2 (Medium Term)
- [ ] Impact analysis shows downstream effects visually
- [ ] Git lineage integrated for all atoms
- [ ] Risk/compliance overlays throughout UI
- [ ] Control validation automated in CI/CD

### Phase 3 (Long Term - Vision)
- [ ] Runtime engine can modify workflows based on rules
- [ ] Feedback loops suggest optimizations from metrics
- [ ] Real-time collaboration with 2+ concurrent users
- [ ] System demonstrably "living" and adaptive

---

## Architecture Alignment

This roadmap directly addresses the 6 core objectives:

1. **Docs are Code** → Phase 2: Add testing framework, deployment automation
2. **Atoms + Molecules + Workflows** → Phase 1: PhaseExplorer completes hierarchy
3. **Ontology Ownership** → Phase 2: Lineage tracking integration
4. **Dynamic Process Rewriting** → Phase 3: Runtime engine (biggest vision gap)
5. **Risk-Aware CI/CD** → Phase 2: Impact analysis UI, control validation
6. **System Thinking** → Phase 1: Enhanced graph + Phase 3: Feedback loops

---

## Next Immediate Actions

**Session Starting Now:**

1. ✅ Create `components/PhaseExplorer.tsx`
2. ✅ Create `components/PhaseEditor.tsx` (modal)
3. ✅ Update `components/Sidebar.tsx` (add Phases nav)
4. ✅ Update `App.tsx` (add phase route)
5. ✅ Update `types.ts` (ViewType)
6. ✅ Test phase browsing and editing
7. ✅ Add mini-graph to PhaseExplorer
8. ✅ Test phase → graph navigation

**Expected Outcome:**
Dedicated Phase view that bridges the gap between journeys and atoms, making the system hierarchy complete and navigable.

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-21
**Status:** Plan Published - Starting Phase 1, Priority 1 (PhaseExplorer)
