# Tier 4: Workflow Execution Engine - Implementation Plan

## Executive Summary

Tier 4 transforms the GNDP system into an **executable workflow runtime** that can orchestrate business processes in real-time. This enables the system to not just document workflows, but to actually execute them with state management, task routing, and monitoring.

**Goal**: Execute graph-defined workflows as real business processes

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Interface                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ Process      │  │ Task Inbox   │  │ Monitoring       │      │
│  │ Initiator    │  │ (Work Queue) │  │ Dashboard        │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
└───────────────────────────┬───────────────────────────────────────┘
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Workflow Orchestrator                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ Process      │  │ State        │  │ Task             │      │
│  │ Engine       │  │ Machine      │  │ Router           │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Execution Runtime                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ Graph        │  │ Event Bus    │  │ Rule             │      │
│  │ Traversal    │  │ (Pub/Sub)    │  │ Engine           │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Persistence & Observability                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ Neo4j        │  │ PostgreSQL   │  │ Time-Series DB   │      │
│  │ (Graph)      │  │ (State)      │  │ (Metrics)        │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Process Instance
A running instance of a workflow (journey/phase/module)

```python
ProcessInstance = {
    "id": "proc-12345",
    "journey_id": "journey-purchase-fha",
    "status": "running",  # pending, running, completed, failed, suspended
    "started_at": "2025-01-15T10:00:00Z",
    "current_step": "atom-cust-application-submit",
    "context": {
        "loan_amount": 300000,
        "borrower_id": "BOR-123",
        "loan_officer_id": "LO-456"
    }
}
```

### 2. Task Instance
A unit of work assigned to a user or system

```python
TaskInstance = {
    "id": "task-67890",
    "process_instance_id": "proc-12345",
    "atom_id": "atom-bo-credit-analysis",
    "assigned_to": "user-underwriter-1",
    "status": "pending",  # pending, in_progress, completed, failed
    "due_date": "2025-01-16T17:00:00Z",
    "priority": "high",
    "data": {
        "credit_score": 720,
        "dti_ratio": 0.38
    }
}
```

### 3. Workflow State
Graph-based state representation

```cypher
// Current state in Neo4j
(process:ProcessInstance {id: 'proc-12345'})-[:AT_STEP]->(current:Atom {id: 'atom-bo-credit-analysis'})
(process)-[:COMPLETED]->(prev:Atom {id: 'atom-sys-credit-pull'})
(process)-[:PENDING]->(next:Atom {id: 'atom-bo-income-verification'})
```

---

## Features to Implement

### 1. Workflow Orchestrator

**File**: `api/orchestrator/workflow_engine.py` (600 lines)

**Core Components**:

```python
class WorkflowEngine:
    """
    Orchestrates workflow execution based on graph structure
    """

    async def start_process(self, journey_id: str, context: Dict) -> ProcessInstance:
        """
        Initialize a new process instance
        1. Create ProcessInstance record
        2. Find first atom (no DEPENDS_ON predecessors)
        3. Create first task
        4. Return process instance
        """

    async def advance_process(self, process_id: str, completed_task_id: str):
        """
        Move process forward after task completion
        1. Mark current atom as COMPLETED
        2. Find next atoms via ENABLES/DEPENDS_ON edges
        3. Check conditions (rules)
        4. Create new tasks for next atoms
        5. Update process state
        """

    async def get_next_atoms(self, process_id: str, current_atom_id: str) -> List[Atom]:
        """
        Determine next atoms using graph traversal
        """
        query = """
        MATCH (current:Atom {id: $atom_id})-[:ENABLES]->(next:Atom)
        WHERE NOT (next)<-[:COMPLETED {process_id: $process_id}]-()
        RETURN next
        """
```

**State Machine**:
```
PENDING → RUNNING → COMPLETED
             ↓
         SUSPENDED
             ↓
         RUNNING → FAILED
```

---

### 2. Task Queue & Routing

**File**: `api/orchestrator/task_router.py` (400 lines)

**Features**:
- Assign tasks based on PERFORMED_BY relationships
- Load balancing across users
- Priority queue (high/medium/low)
- Due date tracking
- Escalation rules

**Example**:
```python
async def assign_task(atom: Atom, process: ProcessInstance) -> TaskInstance:
    """
    Assign task to appropriate user/role
    """
    # Get role from graph
    role_query = """
    MATCH (atom:Atom {id: $atom_id})-[:PERFORMED_BY]->(role:Atom)
    RETURN role.id
    """

    # Find available users with that role
    users = await get_users_by_role(role_id)

    # Load balance
    assigned_user = await select_least_busy_user(users)

    # Create task
    task = TaskInstance(
        atom_id=atom.id,
        assigned_to=assigned_user.id,
        status='pending',
        created_at=datetime.now()
    )

    return task
```

---

### 3. Event-Driven Architecture

**File**: `api/orchestrator/event_bus.py` (300 lines)

**Event Types**:
```python
class WorkflowEvent(BaseModel):
    type: str  # process.started, task.created, task.completed, process.completed
    process_id: str
    timestamp: datetime
    payload: Dict[str, Any]

# Examples
ProcessStartedEvent = {
    "type": "process.started",
    "process_id": "proc-12345",
    "journey_id": "journey-purchase-fha",
    "initiated_by": "user-lo-1"
}

TaskCompletedEvent = {
    "type": "task.completed",
    "process_id": "proc-12345",
    "task_id": "task-67890",
    "atom_id": "atom-bo-credit-analysis",
    "completed_by": "user-uw-1",
    "result": "approved"
}
```

**Event Handlers**:
```python
@event_bus.on('task.completed')
async def on_task_completed(event: TaskCompletedEvent):
    # Advance workflow
    await workflow_engine.advance_process(
        event.process_id,
        event.task_id
    )

    # Send notifications
    await notify_stakeholders(event.process_id)

    # Update metrics
    await metrics.record_task_completion(event)
```

---

### 4. Conditional Branching (Rules)

**File**: `api/orchestrator/rule_evaluator.py` (350 lines)

**Purpose**: Execute business rules to determine workflow paths

**Integration with Existing RuleManager**:
```python
async def evaluate_transition(
    from_atom: Atom,
    to_atom: Atom,
    process_context: Dict
) -> bool:
    """
    Check if transition should occur based on rules
    """
    # Find rules attached to edge
    rules = await get_rules_for_transition(from_atom.id, to_atom.id)

    for rule in rules:
        # Evaluate rule against process context
        result = await rule_engine.evaluate(rule, process_context)

        if not result:
            return False  # Block transition

    return True  # Allow transition
```

**Example Rule**:
```yaml
rule_id: rule-credit-score-threshold
description: Only proceed to underwriting if credit score >= 620
conditions:
  - field: credit_score
    operator: gte
    value: 620
actions:
  - type: transition
    target: atom-bo-underwriting-review
```

---

### 5. Process Instance Management

**File**: `api/routes/processes.py` (500 lines)

**Endpoints**:

```python
@router.post("/api/processes/start")
async def start_process(request: StartProcessRequest) -> ProcessInstance:
    """
    Start a new workflow process
    """

@router.get("/api/processes/{process_id}")
async def get_process(process_id: str) -> ProcessInstance:
    """
    Get process details and current state
    """

@router.get("/api/processes")
async def list_processes(
    status: Optional[str] = None,
    journey_id: Optional[str] = None,
    limit: int = 50
) -> List[ProcessInstance]:
    """
    List all process instances with filters
    """

@router.post("/api/processes/{process_id}/suspend")
async def suspend_process(process_id: str):
    """
    Pause a running process
    """

@router.post("/api/processes/{process_id}/resume")
async def resume_process(process_id: str):
    """
    Resume a suspended process
    """

@router.post("/api/processes/{process_id}/abort")
async def abort_process(process_id: str, reason: str):
    """
    Terminate a process
    """

@router.get("/api/processes/{process_id}/history")
async def get_process_history(process_id: str) -> List[ProcessEvent]:
    """
    Get full execution history
    """

@router.get("/api/processes/{process_id}/visualize")
async def visualize_process(process_id: str) -> ProcessVisualization:
    """
    Get visual representation of process state
    (completed steps, current step, pending steps)
    """
```

---

### 6. Task Management

**File**: `api/routes/tasks.py` (400 lines)

**Endpoints**:

```python
@router.get("/api/tasks/inbox")
async def get_inbox(user_id: str, status: str = 'pending') -> List[TaskInstance]:
    """
    Get tasks assigned to user
    """

@router.post("/api/tasks/{task_id}/start")
async def start_task(task_id: str, user_id: str):
    """
    Claim and start a task
    """

@router.post("/api/tasks/{task_id}/complete")
async def complete_task(task_id: str, result: TaskResult):
    """
    Mark task as completed with result data
    """

@router.post("/api/tasks/{task_id}/reassign")
async def reassign_task(task_id: str, new_assignee: str):
    """
    Reassign task to different user
    """

@router.post("/api/tasks/{task_id}/escalate")
async def escalate_task(task_id: str):
    """
    Escalate overdue task to manager
    """

@router.get("/api/tasks/stats")
async def get_task_stats(user_id: str) -> TaskStats:
    """
    Get task statistics (pending, completed, overdue)
    """
```

---

### 7. Monitoring & Observability

**File**: `components/ProcessMonitoringDashboard.tsx` (700 lines)

**Features**:

1. **Active Processes View**
   - List of running processes
   - Status indicators (on-track, delayed, blocked)
   - Progress bars (% complete)
   - SLA compliance

2. **Process Timeline**
   - Gantt chart of process steps
   - Actual vs. expected duration
   - Bottleneck identification

3. **Task Queue Dashboard**
   - Pending tasks by role
   - Average completion time
   - Overdue tasks (red alert)
   - Workload distribution

4. **Performance Metrics**
   - Process throughput (processes/day)
   - Average cycle time
   - Task completion rate
   - Error rate

5. **Live Process View**
   - Real-time visualization of active processes
   - Animated flow through workflow
   - Current atom highlighted
   - Completed path shown

**Example Component**:
```typescript
export default function ProcessMonitoringDashboard() {
  const [processes, setProcesses] = useState<ProcessInstance[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    // Fetch active processes
    fetchActiveProcesses();

    // Set up WebSocket for real-time updates
    const ws = new WebSocket('ws://localhost:8000/ws/monitoring');
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      handleProcessUpdate(update);
    };
  }, []);

  return (
    <div className="monitoring-dashboard">
      <MetricsCards metrics={metrics} />
      <ActiveProcessesTable processes={processes} />
      <ProcessTimeline />
      <TaskQueueView />
    </div>
  );
}
```

---

### 8. SLA & Performance Tracking

**File**: `api/services/sla_tracker.py` (300 lines)

**Features**:
- Define SLA targets per atom/module
- Track actual vs. target duration
- Alert on SLA violations
- Historical SLA compliance reporting

**Example**:
```python
SLA_DEFINITIONS = {
    "atom-bo-credit-analysis": {
        "target_duration": timedelta(hours=4),
        "escalation_threshold": timedelta(hours=6)
    },
    "atom-bo-underwriting-review": {
        "target_duration": timedelta(days=1),
        "escalation_threshold": timedelta(days=2)
    }
}

async def check_sla_compliance(task: TaskInstance):
    sla = SLA_DEFINITIONS.get(task.atom_id)
    elapsed = datetime.now() - task.created_at

    if elapsed > sla['escalation_threshold']:
        await escalate_task(task.id)
        await send_alert(task, "SLA violated")
```

---

### 9. Process Simulation & Testing

**File**: `api/services/process_simulator.py` (400 lines)

**Features**:
- Dry-run workflows without creating real tasks
- Test conditional branching
- Validate journey completeness
- Performance prediction

**Example**:
```python
async def simulate_journey(journey_id: str, test_context: Dict) -> SimulationResult:
    """
    Simulate a journey execution
    """
    result = SimulationResult()

    # Start simulation
    current_atoms = await get_starting_atoms(journey_id)

    while current_atoms:
        for atom in current_atoms:
            # Record atom visit
            result.visited_atoms.append(atom.id)

            # Evaluate rules
            next_atoms = await get_next_atoms_simulation(atom, test_context)
            current_atoms = next_atoms

            # Check for deadlocks
            if atom.id in result.visited_atoms[:-1]:
                result.errors.append(f"Cycle detected at {atom.id}")
                return result

    result.success = True
    result.total_steps = len(result.visited_atoms)
    return result
```

---

## Database Schema Extensions

### PostgreSQL (Process State)

```sql
CREATE TABLE process_instances (
    id VARCHAR(50) PRIMARY KEY,
    journey_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    context JSONB,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_by VARCHAR(50)
);

CREATE TABLE task_instances (
    id VARCHAR(50) PRIMARY KEY,
    process_instance_id VARCHAR(50) REFERENCES process_instances(id),
    atom_id VARCHAR(50) NOT NULL,
    assigned_to VARCHAR(50),
    status VARCHAR(20) NOT NULL,
    priority VARCHAR(10),
    due_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    result JSONB
);

CREATE TABLE process_events (
    id SERIAL PRIMARY KEY,
    process_instance_id VARCHAR(50) REFERENCES process_instances(id),
    event_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    payload JSONB,
    user_id VARCHAR(50)
);

CREATE INDEX idx_tasks_assigned_to ON task_instances(assigned_to, status);
CREATE INDEX idx_processes_status ON process_instances(status);
CREATE INDEX idx_events_process_id ON process_events(process_instance_id);
```

### Neo4j (Execution Graph)

```cypher
// Link process to current step
CREATE (p:ProcessInstance {id: 'proc-12345'})-[:AT_STEP]->(a:Atom {id: 'atom-bo-credit-analysis'})

// Track completed steps
CREATE (p:ProcessInstance)-[:COMPLETED {timestamp: datetime()}]->(a:Atom)

// Track pending steps
CREATE (p:ProcessInstance)-[:PENDING]->(a:Atom)
```

---

## API Endpoints Summary

### Process Management (8 endpoints)
```
POST   /api/processes/start
GET    /api/processes/{process_id}
GET    /api/processes
POST   /api/processes/{process_id}/suspend
POST   /api/processes/{process_id}/resume
POST   /api/processes/{process_id}/abort
GET    /api/processes/{process_id}/history
GET    /api/processes/{process_id}/visualize
```

### Task Management (6 endpoints)
```
GET    /api/tasks/inbox
POST   /api/tasks/{task_id}/start
POST   /api/tasks/{task_id}/complete
POST   /api/tasks/{task_id}/reassign
POST   /api/tasks/{task_id}/escalate
GET    /api/tasks/stats
```

### Monitoring (4 endpoints)
```
GET    /api/monitoring/active-processes
GET    /api/monitoring/metrics
GET    /api/monitoring/sla-compliance
GET    /api/monitoring/bottlenecks
```

### Simulation (2 endpoints)
```
POST   /api/simulation/test-journey
GET    /api/simulation/validate-workflow
```

**Total New Endpoints**: 20 REST APIs

---

## Implementation Phases

### Phase 1: Core Engine (Week 1-2)
- [ ] WorkflowEngine class
- [ ] ProcessInstance data model
- [ ] TaskInstance data model
- [ ] PostgreSQL schema
- [ ] Basic start/advance/complete flow

### Phase 2: Task Management (Week 3)
- [ ] Task router with role-based assignment
- [ ] Task inbox API
- [ ] Task lifecycle (start, complete, reassign)
- [ ] Priority queue

### Phase 3: Event System (Week 4)
- [ ] Event bus implementation
- [ ] Event handlers
- [ ] WebSocket integration for real-time updates
- [ ] Process history tracking

### Phase 4: Rule Integration (Week 5)
- [ ] Rule evaluator
- [ ] Conditional branching
- [ ] Integration with existing RuleManager
- [ ] Test complex workflows

### Phase 5: Monitoring (Week 6)
- [ ] Process monitoring dashboard
- [ ] Task queue dashboard
- [ ] Performance metrics
- [ ] SLA tracking

### Phase 6: Advanced Features (Week 7-8)
- [ ] Process simulation
- [ ] Workflow validation
- [ ] Escalation rules
- [ ] Performance optimization

---

## Technology Stack

### Backend
- **FastAPI** - REST API
- **PostgreSQL** - Process/task state
- **Neo4j** - Workflow graph traversal
- **Redis** - Event bus pub/sub
- **Celery** - Background job processing (optional)
- **APScheduler** - SLA monitoring, escalations

### Frontend
- **React** - UI components
- **D3.js / Cytoscape.js** - Process visualization
- **WebSocket** - Real-time updates
- **Chart.js** - Metrics dashboards

### Observability
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **Elasticsearch** - Log aggregation (optional)

---

## Performance Considerations

### Scalability
- **Concurrent Processes**: 10,000+ active processes
- **Task Throughput**: 1,000 tasks/second
- **Database Sharding**: PostgreSQL read replicas
- **Cache Layer**: Redis for hot data

### Optimization
- **Graph Query Caching**: Cache next-atom lookups
- **Bulk Operations**: Batch task creation
- **Async Processing**: Non-blocking workflow advancement
- **Connection Pooling**: Database connection reuse

### Monitoring
- **Process Execution Time**: Track p50, p95, p99
- **Task Queue Depth**: Alert if queue grows
- **Error Rate**: Failed task attempts
- **Database Performance**: Query latency

---

## Security & Compliance

### Authorization
- Users can only see their assigned tasks
- Managers can see team tasks
- Admin can see all processes
- Row-level security in PostgreSQL

### Audit Trail
- Every task action logged
- Process state changes tracked
- User attribution for all operations
- Immutable event log

### Data Privacy
- Sensitive context data encrypted
- PII handling compliance (GDPR, CCPA)
- Access control on process data

---

## Testing Strategy

### Unit Tests
- WorkflowEngine logic
- Rule evaluation
- Task assignment algorithms

### Integration Tests
- End-to-end process execution
- Multi-step workflows
- Conditional branching
- Error handling

### Load Tests
- 10,000 concurrent processes
- 100,000 tasks in queue
- Database performance under load

### Chaos Engineering
- Node failures during execution
- Database connection loss
- Race conditions in task assignment

---

## Success Metrics

### Technical
- ✅ Process completion rate > 99%
- ✅ Task assignment latency < 100ms
- ✅ Workflow advancement < 200ms
- ✅ Zero lost processes

### Business
- ✅ SLA compliance > 95%
- ✅ Average cycle time reduction 30%
- ✅ Task completion rate > 98%
- ✅ User satisfaction > 4.5/5

---

## Estimated Effort

| Component | Lines of Code | Effort (Days) |
|-----------|---------------|---------------|
| Workflow Engine | 600 | 5 |
| Task Router | 400 | 3 |
| Event Bus | 300 | 2 |
| Rule Evaluator | 350 | 3 |
| Process APIs | 500 | 3 |
| Task APIs | 400 | 2 |
| Monitoring Dashboard | 700 | 5 |
| SLA Tracker | 300 | 2 |
| Process Simulator | 400 | 3 |
| Frontend Components | 1,200 | 6 |
| Testing & Docs | 600 | 4 |
| **Total** | **5,750** | **38 days** |

---

## Files to Create

### Backend (12 files)
1. `api/orchestrator/workflow_engine.py` (600 lines)
2. `api/orchestrator/task_router.py` (400 lines)
3. `api/orchestrator/event_bus.py` (300 lines)
4. `api/orchestrator/rule_evaluator.py` (350 lines)
5. `api/routes/processes.py` (500 lines)
6. `api/routes/tasks.py` (400 lines)
7. `api/routes/monitoring.py` (300 lines)
8. `api/routes/simulation.py` (250 lines)
9. `api/services/sla_tracker.py` (300 lines)
10. `api/services/process_simulator.py` (400 lines)
11. `api/models/process_models.py` (200 lines)
12. `api/models/task_models.py` (150 lines)

### Frontend (8 files)
1. `components/ProcessMonitoringDashboard.tsx` (700 lines)
2. `components/TaskInbox.tsx` (400 lines)
3. `components/ProcessVisualization.tsx` (500 lines)
4. `components/TaskDetail.tsx` (300 lines)
5. `components/SLADashboard.tsx` (250 lines)
6. `services/ProcessService.ts` (200 lines)
7. `services/TaskService.ts` (150 lines)
8. `hooks/useProcessMonitoring.ts` (150 lines)

### Database
1. `migrations/001_create_process_tables.sql`
2. `migrations/002_create_task_tables.sql`
3. `migrations/003_create_event_tables.sql`

**Total**: 23 new files, ~5,750 lines of code

---

## Dependencies to Add

```bash
# Backend
pip install sqlalchemy==2.0.25  # PostgreSQL ORM
pip install psycopg2-binary==2.9.9  # PostgreSQL driver
pip install alembic==1.13.1  # Database migrations
pip install apscheduler==3.10.4  # Task scheduling
pip install celery==5.3.4  # Background jobs (optional)

# Frontend (package.json)
npm install d3@7.8.5
npm install cytoscape@3.28.1
npm install @types/cytoscape@3.19.16
npm install react-query@3.39.3  # Data fetching
npm install recharts@2.10.3  # Charts
```

---

## Integration with Existing System

### Tier 1 (Graph Analytics)
- Use centrality analysis to identify bottleneck atoms
- Optimize workflow paths based on analytics

### Tier 2 (Anomaly Detection)
- Detect workflow anomalies (stuck processes, unusual paths)
- Alert on execution patterns that violate norms

### Tier 3 (Real-Time Collaboration)
- Collaborative task completion
- Real-time visibility into process state
- Notifications when tasks assigned

### Existing Rule Manager
- Reuse rules for conditional workflow logic
- Extend rule types for process control

---

## Next Steps

After planning review:
1. Set up PostgreSQL database
2. Implement WorkflowEngine core (Phase 1)
3. Build task management (Phase 2)
4. Add event system (Phase 3)
5. Integrate rules (Phase 4)
6. Create monitoring dashboards (Phase 5)
7. Add simulation and testing (Phase 6)

---

## Status

📋 **Status**: Planning Complete - Ready for Implementation

**Blockers**: None
**Dependencies**: PostgreSQL required for state management

**Next Action**: Proceed with Phase 1 implementation after approval
