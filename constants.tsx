
import { AtomType, EdgeType, Atom, Module, Phase, Journey, AtomCategory } from './types';

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
  [AtomType.POLICY]: '#f472b6',
  [AtomType.CONTROL]: '#2dd4bf',
};

export const MOCK_ATOMS: Atom[] = [
  {
    id: 'atom-cust-income-w2-upload',
    category: AtomCategory.CUSTOMER_FACING,
    type: AtomType.PROCESS,
    name: 'Customer Uploads W-2',
    version: '1.0.0',
    status: 'ACTIVE',
    owner: 'Customer',
    team: 'Borrower Experience',
    ontologyDomain: 'Loan Origination',
    criticality: 'MEDIUM',
    moduleId: 'module-income-verification',
    metrics: { automation_level: 0.1, avg_cycle_time_mins: 72 * 60, error_rate: 0.05, compliance_score: 1.0 },
    content: {
      summary: 'Single customer action in borrower portal to provide income proof.',
      steps: ['Log into portal', 'Select W-2 document type', 'Upload file']
    },
    edges: [{ type: EdgeType.ENABLES, targetId: 'atom-bo-income-w2-review' }]
  },
  {
    id: 'atom-bo-income-w2-review',
    category: AtomCategory.BACK_OFFICE,
    type: AtomType.PROCESS,
    name: 'Processor Reviews W-2',
    version: '1.0.0',
    status: 'ACTIVE',
    owner: 'Processor',
    team: 'Loan Operations',
    ontologyDomain: 'Loan Origination',
    criticality: 'HIGH',
    moduleId: 'module-income-verification',
    metrics: { automation_level: 0.0, avg_cycle_time_mins: 4 * 60, error_rate: 0.02, compliance_score: 0.99 },
    content: {
      summary: 'Single back-office review task to verify W-2 data.',
      exceptions: [{ condition: 'Blurry Document', action: 'atom-bo-income-w2-stip-request' }]
    },
    edges: [{ type: EdgeType.ENABLES, targetId: 'atom-bo-income-calculation' }]
  },
  {
    id: 'atom-bo-income-calculation',
    category: AtomCategory.BACK_OFFICE,
    type: AtomType.PROCESS,
    name: 'Calculate Income',
    version: '1.0.0',
    status: 'ACTIVE',
    owner: 'Processor',
    team: 'Loan Operations',
    ontologyDomain: 'Loan Origination',
    criticality: 'CRITICAL',
    moduleId: 'module-income-verification',
    metrics: { automation_level: 0.5, avg_cycle_time_mins: 2 * 60, error_rate: 0.01, compliance_score: 1.0 },
    content: { summary: 'Single calculation task resulting in verified income value.' },
    edges: [{ type: EdgeType.DATA_FLOWS_TO, targetId: 'atom-sys-dti-engine' }]
  },
  {
    id: 'atom-sys-dti-engine',
    category: AtomCategory.SYSTEM,
    type: AtomType.SYSTEM,
    name: 'DTI Calculation Engine',
    version: '2.1.0',
    status: 'ACTIVE',
    owner: 'System',
    team: 'Core Engineering',
    ontologyDomain: 'Calculations & Algorithms',
    criticality: 'CRITICAL',
    moduleId: 'module-income-verification',
    metrics: { automation_level: 1.0, avg_cycle_time_mins: 0.1, error_rate: 0.001, compliance_score: 1.0 },
    content: { summary: 'Automated backend calculation of Debt-to-Income ratio.' },
    edges: []
  }
];

export const MOCK_MODULES: Module[] = [
  {
    id: 'module-income-verification',
    name: 'Income Verification',
    description: 'Workflow containing all income-related atoms.',
    owner: 'Processing Lead',
    atoms: ['atom-cust-income-w2-upload', 'atom-bo-income-w2-review', 'atom-bo-income-calculation', 'atom-sys-dti-engine'],
    phaseId: 'phase-processing'
  }
];

export const MOCK_PHASES: Phase[] = [
  {
    id: 'phase-processing',
    name: 'Processing',
    description: 'Customer milestone containing multiple operational modules.',
    modules: ['module-income-verification'],
    journeyId: 'journey-purchase-conventional',
    targetDurationDays: 5
  }
];

export const MOCK_JOURNEYS: Journey[] = [
  {
    id: 'journey-purchase-conventional',
    name: 'Purchase Loan Journey',
    description: 'Complete end-to-end process from application to funding.',
    phases: ['phase-processing']
  }
];
