-- ============================================================================
-- TIER 4: Workflow Execution Engine - PostgreSQL Schema
-- ============================================================================
-- Purpose: Store runtime process state, tasks, and execution history
-- Database: PostgreSQL 14+
-- Created: 2025-12-27
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable timestamp functions
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================================
-- TABLE: process_instances
-- Purpose: Track running workflow instances
-- ============================================================================
CREATE TABLE IF NOT EXISTS process_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identity
    process_definition_id VARCHAR(255) NOT NULL,  -- Module ID or workflow ID
    process_name VARCHAR(255) NOT NULL,
    process_type VARCHAR(50) NOT NULL,  -- 'journey', 'phase', 'module', 'custom'

    -- State
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, running, suspended, completed, failed, cancelled
    current_phase VARCHAR(255),
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 0,
    progress_percentage NUMERIC(5,2) DEFAULT 0.00,

    -- Ownership
    initiated_by VARCHAR(255) NOT NULL,
    assigned_to VARCHAR(255),
    assigned_team VARCHAR(255),

    -- Context
    business_context JSONB DEFAULT '{}',
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    variables JSONB DEFAULT '{}',  -- Runtime variables

    -- Timing
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    due_date TIMESTAMP,
    estimated_duration_mins INTEGER,
    actual_duration_mins INTEGER,

    -- SLA
    sla_target_mins INTEGER,
    sla_status VARCHAR(50) DEFAULT 'on_track',  -- on_track, at_risk, breached
    sla_breach_time TIMESTAMP,

    -- Metadata
    priority VARCHAR(20) DEFAULT 'medium',  -- low, medium, high, critical
    tags TEXT[],
    parent_process_id UUID REFERENCES process_instances(id) ON DELETE CASCADE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Audit
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    version INTEGER DEFAULT 1,

    -- Indexes will be created below
    CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'suspended', 'completed', 'failed', 'cancelled')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- ============================================================================
-- TABLE: tasks
-- Purpose: Individual work items within a process
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identity
    process_instance_id UUID NOT NULL REFERENCES process_instances(id) ON DELETE CASCADE,
    task_definition_id VARCHAR(255) NOT NULL,  -- Atom ID
    task_name VARCHAR(255) NOT NULL,
    task_type VARCHAR(50) NOT NULL,  -- 'manual', 'automated', 'approval', 'notification'

    -- State
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, assigned, in_progress, completed, failed, skipped, cancelled
    substatus VARCHAR(100),  -- 'awaiting_approval', 'blocked', etc.

    -- Assignment
    assigned_to VARCHAR(255),
    assigned_team VARCHAR(255),
    assignment_method VARCHAR(50) DEFAULT 'manual',  -- manual, round_robin, load_balanced, skill_based
    claimed_by VARCHAR(255),
    claimed_at TIMESTAMP,

    -- Dependencies
    depends_on UUID[] DEFAULT '{}',  -- Array of task IDs this depends on
    blocking UUID[] DEFAULT '{}',  -- Array of task IDs blocked by this

    -- Context
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    form_data JSONB DEFAULT '{}',  -- For manual tasks with forms

    -- Timing
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    due_date TIMESTAMP,
    estimated_duration_mins INTEGER,
    actual_duration_mins INTEGER,

    -- SLA
    sla_target_mins INTEGER,
    sla_status VARCHAR(50) DEFAULT 'on_track',
    sla_breach_time TIMESTAMP,

    -- Retry logic
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,

    -- Metadata
    priority VARCHAR(20) DEFAULT 'medium',
    tags TEXT[],
    notes TEXT,

    -- Audit
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    version INTEGER DEFAULT 1,

    CONSTRAINT valid_task_status CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'failed', 'skipped', 'cancelled')),
    CONSTRAINT valid_task_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

-- ============================================================================
-- TABLE: process_events
-- Purpose: Event log for process execution (audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS process_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identity
    process_instance_id UUID NOT NULL REFERENCES process_instances(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,

    -- Event details
    event_type VARCHAR(100) NOT NULL,  -- 'process_started', 'task_completed', 'sla_breach', etc.
    event_category VARCHAR(50) NOT NULL,  -- 'lifecycle', 'error', 'sla', 'assignment'
    severity VARCHAR(20) DEFAULT 'info',  -- 'info', 'warning', 'error', 'critical'

    -- Actor
    user_id VARCHAR(255),
    user_name VARCHAR(255),
    automated BOOLEAN DEFAULT false,

    -- Details
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',

    -- State changes
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    old_data JSONB,
    new_data JSONB,

    -- Timing
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Metadata
    correlation_id VARCHAR(255),  -- For tracing related events
    tags TEXT[]
);

-- ============================================================================
-- TABLE: sla_metrics
-- Purpose: SLA tracking and metrics
-- ============================================================================
CREATE TABLE IF NOT EXISTS sla_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identity
    process_instance_id UUID REFERENCES process_instances(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,  -- 'process', 'task', 'phase'

    -- Targets
    target_duration_mins INTEGER NOT NULL,
    warning_threshold_mins INTEGER,  -- When to mark 'at_risk'

    -- Actuals
    actual_duration_mins INTEGER,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'on_track',  -- on_track, at_risk, breached, met
    breach_amount_mins INTEGER DEFAULT 0,

    -- Business impact
    business_impact VARCHAR(20) DEFAULT 'medium',  -- low, medium, high, critical
    escalation_required BOOLEAN DEFAULT false,
    escalated_to VARCHAR(255),
    escalated_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_sla_status CHECK (status IN ('on_track', 'at_risk', 'breached', 'met'))
);

-- ============================================================================
-- TABLE: task_assignments
-- Purpose: Assignment history and load balancing
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identity
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

    -- Assignment
    assigned_to VARCHAR(255) NOT NULL,
    assigned_by VARCHAR(255) NOT NULL,
    assignment_method VARCHAR(50) NOT NULL,  -- 'manual', 'round_robin', 'load_balanced'

    -- State
    status VARCHAR(50) NOT NULL DEFAULT 'active',  -- active, reassigned, completed, cancelled

    -- Timing
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Performance
    time_to_accept_mins INTEGER,
    time_to_complete_mins INTEGER,

    -- Metadata
    reason TEXT,  -- Reason for assignment or reassignment

    CONSTRAINT valid_assignment_status CHECK (status IN ('active', 'reassigned', 'completed', 'cancelled'))
);

-- ============================================================================
-- TABLE: workflow_rules
-- Purpose: Business rules for workflow execution
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identity
    rule_name VARCHAR(255) NOT NULL UNIQUE,
    rule_type VARCHAR(50) NOT NULL,  -- 'routing', 'sla', 'assignment', 'escalation'

    -- Scope
    applies_to VARCHAR(50) NOT NULL,  -- 'all', 'process_type', 'specific_process'
    process_type VARCHAR(100),
    process_definition_id VARCHAR(255),

    -- Condition
    condition_expression TEXT NOT NULL,  -- JSONLogic or similar

    -- Action
    action_type VARCHAR(50) NOT NULL,  -- 'assign', 'escalate', 'notify', 'route'
    action_config JSONB NOT NULL,

    -- State
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,  -- Lower = higher priority

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(255),

    -- Metadata
    description TEXT,
    tags TEXT[]
);

-- ============================================================================
-- TABLE: performance_metrics
-- Purpose: Aggregated performance data
-- ============================================================================
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Dimensions
    metric_date DATE NOT NULL,
    metric_hour INTEGER,  -- NULL for daily aggregates
    process_type VARCHAR(100),
    process_definition_id VARCHAR(255),
    user_id VARCHAR(255),
    team VARCHAR(255),

    -- Counters
    processes_started INTEGER DEFAULT 0,
    processes_completed INTEGER DEFAULT 0,
    processes_failed INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_failed INTEGER DEFAULT 0,

    -- Timing
    avg_process_duration_mins NUMERIC(10,2),
    avg_task_duration_mins NUMERIC(10,2),

    -- SLA
    sla_breaches INTEGER DEFAULT 0,
    sla_compliance_rate NUMERIC(5,2),  -- Percentage

    -- Quality
    error_rate NUMERIC(5,2),  -- Percentage
    rework_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Unique constraint for upsert operations
    CONSTRAINT unique_metric UNIQUE (metric_date, metric_hour, process_type, process_definition_id, user_id, team)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Process instances indexes
CREATE INDEX IF NOT EXISTS idx_process_instances_status ON process_instances(status);
CREATE INDEX IF NOT EXISTS idx_process_instances_assigned ON process_instances(assigned_to);
CREATE INDEX IF NOT EXISTS idx_process_instances_created ON process_instances(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_process_instances_due ON process_instances(due_date) WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_process_instances_sla ON process_instances(sla_status) WHERE status IN ('running', 'suspended');
CREATE INDEX IF NOT EXISTS idx_process_instances_definition ON process_instances(process_definition_id);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_process ON tasks(process_instance_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_claimed ON tasks(claimed_by);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date) WHERE status IN ('pending', 'assigned', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_tasks_sla ON tasks(sla_status) WHERE status IN ('assigned', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at DESC);

-- Process events indexes
CREATE INDEX IF NOT EXISTS idx_events_process ON process_events(process_instance_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_task ON process_events(task_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON process_events(event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON process_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_user ON process_events(user_id, timestamp DESC);

-- SLA metrics indexes
CREATE INDEX IF NOT EXISTS idx_sla_process ON sla_metrics(process_instance_id);
CREATE INDEX IF NOT EXISTS idx_sla_task ON sla_metrics(task_id);
CREATE INDEX IF NOT EXISTS idx_sla_status ON sla_metrics(status);
CREATE INDEX IF NOT EXISTS idx_sla_breach ON sla_metrics(status, breach_amount_mins DESC) WHERE status = 'breached';

-- Task assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON task_assignments(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_assignments_date ON task_assignments(assigned_at DESC);

-- Workflow rules indexes
CREATE INDEX IF NOT EXISTS idx_rules_enabled ON workflow_rules(enabled, priority);
CREATE INDEX IF NOT EXISTS idx_rules_type ON workflow_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_rules_scope ON workflow_rules(applies_to, process_type);

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_metrics_date ON performance_metrics(metric_date DESC, metric_hour DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_metrics_process ON performance_metrics(process_definition_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_user ON performance_metrics(user_id, metric_date DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_process_instances_updated_at BEFORE UPDATE ON process_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sla_metrics_updated_at BEFORE UPDATE ON sla_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_rules_updated_at BEFORE UPDATE ON workflow_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_metrics_updated_at BEFORE UPDATE ON performance_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment version on update
CREATE OR REPLACE FUNCTION increment_version_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_process_instances_version BEFORE UPDATE ON process_instances
    FOR EACH ROW EXECUTE FUNCTION increment_version_column();

CREATE TRIGGER increment_tasks_version BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION increment_version_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active processes summary
CREATE OR REPLACE VIEW v_active_processes AS
SELECT
    pi.id,
    pi.process_name,
    pi.status,
    pi.progress_percentage,
    pi.assigned_to,
    pi.due_date,
    pi.sla_status,
    pi.created_at,
    COUNT(t.id) as total_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
    COUNT(t.id) FILTER (WHERE t.status IN ('pending', 'assigned', 'in_progress')) as active_tasks
FROM process_instances pi
LEFT JOIN tasks t ON t.process_instance_id = pi.id
WHERE pi.status IN ('pending', 'running', 'suspended')
GROUP BY pi.id;

-- My tasks view
CREATE OR REPLACE VIEW v_my_tasks AS
SELECT
    t.id,
    t.task_name,
    t.status,
    t.priority,
    t.due_date,
    t.sla_status,
    t.assigned_to,
    t.created_at,
    pi.process_name,
    pi.process_type,
    pi.id as process_instance_id
FROM tasks t
INNER JOIN process_instances pi ON pi.id = t.process_instance_id
WHERE t.status IN ('assigned', 'in_progress');

-- SLA breaches view
CREATE OR REPLACE VIEW v_sla_breaches AS
SELECT
    'process' as breach_type,
    pi.id,
    pi.process_name as name,
    pi.sla_status,
    pi.due_date,
    pi.assigned_to,
    EXTRACT(EPOCH FROM (NOW() - pi.due_date))/60 as minutes_overdue,
    pi.created_at
FROM process_instances pi
WHERE pi.sla_status = 'breached' AND pi.status IN ('running', 'suspended')

UNION ALL

SELECT
    'task' as breach_type,
    t.id,
    t.task_name as name,
    t.sla_status,
    t.due_date,
    t.assigned_to,
    EXTRACT(EPOCH FROM (NOW() - t.due_date))/60 as minutes_overdue,
    t.created_at
FROM tasks t
WHERE t.sla_status = 'breached' AND t.status IN ('assigned', 'in_progress')
ORDER BY minutes_overdue DESC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE process_instances IS 'Running workflow instances with state and progress tracking';
COMMENT ON TABLE tasks IS 'Individual work items within processes';
COMMENT ON TABLE process_events IS 'Event log for process execution audit trail';
COMMENT ON TABLE sla_metrics IS 'SLA tracking and compliance metrics';
COMMENT ON TABLE task_assignments IS 'Task assignment history for load balancing';
COMMENT ON TABLE workflow_rules IS 'Business rules for workflow automation';
COMMENT ON TABLE performance_metrics IS 'Aggregated performance data for analytics';

COMMENT ON VIEW v_active_processes IS 'Summary of all active processes with task counts';
COMMENT ON VIEW v_my_tasks IS 'Tasks assigned to users that need attention';
COMMENT ON VIEW v_sla_breaches IS 'All SLA breaches across processes and tasks';

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default workflow rules (examples)
INSERT INTO workflow_rules (rule_name, rule_type, applies_to, condition_expression, action_type, action_config, created_by, description)
VALUES
    ('High Priority Auto-Escalate', 'escalation', 'all', '{"and": [{"var": "priority"}, {"==": [{"var": "priority"}, "critical"]}]}', 'escalate', '{"escalate_to": "manager", "notify": true}', 'system', 'Auto-escalate critical priority processes'),
    ('Round Robin Assignment', 'assignment', 'all', '{"==": [{"var": "assignment_method"}, "round_robin"]}', 'assign', '{"method": "round_robin", "pool": "team"}', 'system', 'Distribute tasks evenly across team'),
    ('SLA At-Risk Notification', 'sla', 'all', '{"==": [{"var": "sla_status"}, "at_risk"]}', 'notify', '{"recipients": ["assigned_to", "manager"], "template": "sla_at_risk"}', 'system', 'Notify when SLA is at risk')
ON CONFLICT (rule_name) DO NOTHING;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
