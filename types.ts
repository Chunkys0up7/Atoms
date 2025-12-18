
export enum AtomCategory {
  CUSTOMER_FACING = 'CUSTOMER_FACING', // atom-cust
  BACK_OFFICE = 'BACK_OFFICE',         // atom-bo
  SYSTEM = 'SYSTEM'                    // atom-sys
}

export enum AtomType {
  PROCESS = 'PROCESS',
  DECISION = 'DECISION',
  GATEWAY = 'GATEWAY',
  ROLE = 'ROLE',
  SYSTEM = 'SYSTEM',
  DOCUMENT = 'DOCUMENT',
  REGULATION = 'REGULATION',
  METRIC = 'METRIC',
  RISK = 'RISK',
  POLICY = 'POLICY',
  CONTROL = 'CONTROL'
}

export enum EdgeType {
  // --- NASA / Atomic Methodology Edges ---
  DEPENDS_ON = 'DEPENDS_ON',        // A requires B to be complete
  ENABLES = 'ENABLES',              // Completing A allows B to begin
  RELATED_TO = 'RELATED_TO',        // Conceptually connected
  COMPONENT_OF = 'COMPONENT_OF',    // A is part of B (Composition)
  USES_COMPONENT = 'USES_COMPONENT',// A references B (Pointer)
  PARALLEL_WITH = 'PARALLEL_WITH',  // Simultaneous execution
  ESCALATES_TO = 'ESCALATES_TO',    // Exception path
  GOVERNED_BY = 'GOVERNED_BY',      // Regulatory requirement
  DATA_FLOWS_TO = 'DATA_FLOWS_TO',   // Output of A feeds input of B

  // --- Semantic Documentation Network Edges ---
  IMPLEMENTS = 'IMPLEMENTS',        // A procedure implements a policy
  REFERENCES = 'REFERENCES',        // Standard citation
  SUPERSEDES = 'SUPERSEDES',        // Versioning/Deprecation
  REQUIRES_KNOWLEDGE_OF = 'REQUIRES_KNOWLEDGE_OF', // Prerequisite concept
  PERFORMED_BY = 'PERFORMED_BY'     // Role mapping
}

export type Criticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Edge {
  type: EdgeType;
  targetId: string;
  label?: string;
  description?: string;
}

export interface AtomContent {
  summary?: string;
  steps?: string[];
  exceptions?: { condition: string; action: string }[];
}

export interface Atom {
  id: string; // atom-cust-..., atom-bo-..., atom-sys-...
  category: AtomCategory;
  type: AtomType;
  name: string;
  version: string;
  status: 'ACTIVE' | 'DRAFT' | 'DEPRECATED';
  owner: string;
  team: string;
  ontologyDomain: string; // Ownership of the vocabulary/schema segment
  criticality: Criticality;
  phaseId?: string;
  moduleId?: string;
  content: AtomContent;
  edges: Edge[];
  metrics?: {
    automation_level: number;
    avg_cycle_time_mins: number;
    error_rate: number;
    compliance_score: number;
  };
}

export interface Module {
  id: string; // module-...
  name: string;
  description: string;
  owner: string;
  atoms: string[]; // List of Atom IDs
  phaseId?: string;
}

export interface Phase {
  id: string; // phase-...
  name: string;
  description: string;
  modules: string[]; // List of Module IDs
  journeyId?: string;
  targetDurationDays: number;
}

export interface Journey {
  id: string; // journey-...
  name: string;
  description: string;
  phases: string[]; // List of Phase IDs
}

export type NodeLevel = 'ATOM' | 'MODULE' | 'PHASE' | 'JOURNEY';

export interface ValidationIssue {
  type: string;
  severity: Criticality;
  description: string;
  affectedAtoms: string[];
}

export type LintSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface LintIssue {
  id: string;
  atomId?: string;
  severity: LintSeverity;
  category: 'COMPLIANCE' | 'CONSISTENCY' | 'STYLE' | 'GRAPH';
  message: string;
  suggestion: string;
}

export type DocTemplateType = 'SOP' | 'TECHNICAL_DESIGN' | 'EXECUTIVE_SUMMARY' | 'COMPLIANCE_AUDIT';
