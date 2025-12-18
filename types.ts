
export enum AtomType {
  PROCESS = 'PROCESS',
  DECISION = 'DECISION',
  GATEWAY = 'GATEWAY',
  ROLE = 'ROLE',
  SYSTEM = 'SYSTEM',
  DOCUMENT = 'DOCUMENT',
  REGULATION = 'REGULATION',
  METRIC = 'METRIC',
  RISK = 'RISK'
}

export enum EdgeType {
  TRIGGERS = 'TRIGGERS',
  REQUIRES = 'REQUIRES',
  PRODUCES = 'PRODUCES',
  PERFORMED_BY = 'PERFORMED_BY',
  GOVERNED_BY = 'GOVERNED_BY',
  USES = 'USES',
  MEASURED_BY = 'MEASURED_BY',
  MITIGATES = 'MITIGATES',
  ESCALATES_TO = 'ESCALATES_TO',
  VARIANT_OF = 'VARIANT_OF'
}

export type Criticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Edge {
  type: EdgeType;
  targetId: string;
  label?: string;
  description?: string;
  metadata?: {
    latency_ms?: number;
    reliability_score?: number;
  };
}

export interface AtomContent {
  summary?: string;
  steps?: string[];
  exceptions?: { condition: string; action: string }[];
}

export interface Atom {
  id: string;
  type: AtomType;
  name: string;
  version: string;
  status: 'ACTIVE' | 'DRAFT' | 'DEPRECATED';
  owner: string;
  team: string;
  criticality: Criticality;
  phase?: string;
  content: AtomContent;
  edges: Edge[];
  lastSyncedAt?: string;
  // Simulation & Forecasting Fields
  metrics?: {
    automation_level: number; // 0 to 1
    avg_cycle_time_mins: number;
    error_rate: number;
    compliance_score: number;
  };
}

// Added Module interface to resolve import errors in other components
export interface Module {
  id: string;
  name: string;
  type: string;
  description: string;
  owner: string;
  phases: string[];
  atoms: string[];
}

export interface SimulationConfig {
  targetAtomId: string;
  changes: {
    type: 'AUTOMATE' | 'RESTRUCTURE' | 'DEPRECATE' | 'UPDATE';
    value: number | string;
  }[];
}

export interface ValidationIssue {
  type: 'CYCLE' | 'BROKEN_REF' | 'ORPHAN' | 'SCHEMA_VIOLATION';
  severity: 'CRITICAL' | 'WARNING';
  description: string;
  affectedAtoms: string[];
}
