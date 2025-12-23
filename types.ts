
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
  DEPENDS_ON = 'DEPENDS_ON',
  ENABLES = 'ENABLES',
  RELATED_TO = 'RELATED_TO',
  COMPONENT_OF = 'COMPONENT_OF',
  USES_COMPONENT = 'USES_COMPONENT',
  PARALLEL_WITH = 'PARALLEL_WITH',
  ESCALATES_TO = 'ESCALATES_TO',
  GOVERNED_BY = 'GOVERNED_BY',
  DATA_FLOWS_TO = 'DATA_FLOWS_TO',
  IMPLEMENTS = 'IMPLEMENTS',
  REFERENCES = 'REFERENCES',
  SUPERSEDES = 'SUPERSEDES',
  REQUIRES_KNOWLEDGE_OF = 'REQUIRES_KNOWLEDGE_OF',
  PERFORMED_BY = 'PERFORMED_BY'
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
  description?: string;
  purpose?: string;
  business_context?: string;
  steps?: string[];
  inputs?: string[];
  outputs?: string[];
  prerequisites?: string[];
  success_criteria?: string[];
  regulatory_context?: string;
  exceptions?: { condition: string; action: string }[];
}

export interface Atom {
  id: string;
  category: AtomCategory;
  type: AtomType;
  name: string;
  version: string;
  status: 'ACTIVE' | 'DRAFT' | 'DEPRECATED';
  owner: string;
  team: string;
  ontologyDomain: string;
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

export interface GlossaryItem {
  term: string;
  definition: string;
  category: string;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  owner: string;
  atoms: string[];
  phaseId?: string;
}

export interface Phase {
  id: string;
  name: string;
  description: string;
  modules: string[];
  journeyId?: string;
  targetDurationDays: number;
}

export interface Journey {
  id: string;
  name: string;
  description: string;
  phases: string[];
}

export type NodeLevel = 'ATOM' | 'MODULE' | 'PHASE' | 'JOURNEY';

export type ViewType = 'explorer' | 'modules' | 'phases' | 'graph' | 'edges' | 'impact' | 'assistant' | 'ingestion' | 'health' | 'publisher' | 'ontology' | 'glossary' | 'workflow' | 'runtime' | 'rules' | 'feedback' | 'library' | 'docssite';

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

// Graph Context Modes for Enhanced Visualization
export type GraphContext =
  | { mode: 'global'; filters?: { types?: AtomType[]; criticality?: Criticality[] } }
  | { mode: 'journey'; journeyId: string; highlightPath?: boolean }
  | { mode: 'phase'; phaseId: string; showModuleBoundaries?: boolean }
  | { mode: 'module'; moduleId: string; expandDependencies?: boolean }
  | { mode: 'impact'; atomId: string; depth: number; direction: 'upstream' | 'downstream' | 'both' }
  | { mode: 'risk'; minCriticality?: Criticality; showControls?: boolean };
