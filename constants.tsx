
import { AtomType, EdgeType, Atom, Module } from './types';

export const ATOM_COLORS: Record<AtomType, string> = {
  [AtomType.PROCESS]: '#3b82f6',
  [AtomType.DECISION]: '#f59e0b',
  [AtomType.GATEWAY]: '#8b5cf6',
  [AtomType.ROLE]: '#10b981',
  [AtomType.SYSTEM]: '#6366f1',
  [AtomType.DOCUMENT]: '#94a3b8',
  [AtomType.REGULATION]: '#ec4899',
  [AtomType.METRIC]: '#06b6d4',
  [AtomType.RISK]: '#ef4444',
};

export const MOCK_ATOMS: Atom[] = [
  {
    id: 'PROC-LO-001',
    type: AtomType.PROCESS,
    name: 'Receive Loan Application',
    version: '3.2.1',
    status: 'ACTIVE',
    owner: 'intake_supervisor',
    team: 'loan_operations',
    criticality: 'MEDIUM',
    phase: 'Intake',
    metrics: { automation_level: 0.2, avg_cycle_time_mins: 45, error_rate: 0.05, compliance_score: 0.98 },
    content: {
      summary: 'Initial intake and validation of borrower loan application.',
      steps: ['Receive application', 'Validate fields', 'Generate unique identifier'],
      exceptions: [{ condition: 'Missing SSN', action: 'Return to borrower' }]
    },
    edges: [
      { type: EdgeType.TRIGGERS, targetId: 'PROC-LO-002', description: 'Moves to secondary validation' },
      { type: EdgeType.PERFORMED_BY, targetId: 'ROLE-LO-005' },
      { type: EdgeType.GOVERNED_BY, targetId: 'REG-LO-012' }
    ]
  },
  {
    id: 'PROC-LO-002',
    type: AtomType.PROCESS,
    name: 'Validate Completeness',
    version: '1.0.0',
    status: 'ACTIVE',
    owner: 'intake_clerk',
    team: 'loan_operations',
    criticality: 'MEDIUM',
    phase: 'Intake',
    metrics: { automation_level: 0.1, avg_cycle_time_mins: 30, error_rate: 0.08, compliance_score: 0.95 },
    content: { summary: 'Secondary validation of document authenticity.', steps: ['Scan docs', 'Check signatures'] },
    edges: [{ type: EdgeType.TRIGGERS, targetId: 'DEC-LO-001', description: 'Begin decisioning' }]
  },
  {
    id: 'DEC-LO-001',
    type: AtomType.DECISION,
    name: 'Application Complete?',
    version: '1.0.0',
    status: 'ACTIVE',
    owner: 'system',
    team: 'automated',
    criticality: 'HIGH',
    phase: 'Intake',
    metrics: { automation_level: 0.9, avg_cycle_time_mins: 2, error_rate: 0.01, compliance_score: 1.0 },
    content: { summary: 'Binary decision gate for workflow progress.' },
    edges: [
      { type: EdgeType.TRIGGERS, targetId: 'PROC-LO-004', label: 'YES' },
      { type: EdgeType.TRIGGERS, targetId: 'PROC-LO-001', label: 'NO' }
    ]
  },
  {
    id: 'REG-LO-012',
    type: AtomType.REGULATION,
    name: 'TRID Initial Disclosure',
    version: '2024.1',
    status: 'ACTIVE',
    owner: 'compliance_officer',
    team: 'legal',
    criticality: 'CRITICAL',
    metrics: { automation_level: 0, avg_cycle_time_mins: 0, error_rate: 0, compliance_score: 1.0 },
    content: { summary: 'Strict federal timing requirements for initial TILA-RESPA disclosures.' },
    edges: []
  },
  {
    id: 'ROLE-LO-005',
    type: AtomType.ROLE,
    name: 'Loan Officer',
    version: '1.0.0',
    status: 'ACTIVE',
    owner: 'hr_ops',
    team: 'human_resources',
    criticality: 'LOW',
    content: { summary: 'Primary point of contact for borrower interactions.' },
    edges: []
  },
  {
    id: 'PROC-LO-004',
    type: AtomType.PROCESS,
    name: 'Assign Processor',
    version: '1.2.0',
    status: 'ACTIVE',
    owner: 'workflow_manager',
    team: 'operations',
    criticality: 'MEDIUM',
    phase: 'Processing',
    metrics: { automation_level: 0.5, avg_cycle_time_mins: 15, error_rate: 0.03, compliance_score: 0.99 },
    content: { summary: 'Assigning high-priority files to specialized queues.' },
    edges: []
  }
];

export const MOCK_MODULES: Module[] = [
  {
    id: 'MOD-INTAKE',
    name: 'Loan Application Life Cycle',
    type: 'BPM_WORKFLOW',
    description: 'The end-to-end journey from initial contact to processing readiness.',
    owner: 'Director of Lending Operations',
    phases: ['Intake', 'Correction', 'Processing', 'Closing'],
    atoms: ['PROC-LO-001', 'PROC-LO-002', 'DEC-LO-001', 'PROC-LO-004']
  }
];
