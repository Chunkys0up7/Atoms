
import { Atom, ValidationIssue, EdgeType, LintIssue, Module, AtomType } from './types';

import { SemanticQueryBuilder } from './lib/graph/index';

export const runEnterpriseLinter = (atoms: Atom[], modules: Module[]): LintIssue[] => {
  const issues: LintIssue[] = [];
  const query = new SemanticQueryBuilder(atoms);

  // Rule: Every Process atom MUST have a PERFORMED_BY edge to a ROLE
  const processes = query.where('type', 'equals', AtomType.PROCESS).execute().matches;
  processes.forEach(atom => {
    const hasRole = atom.edges.some(e => e.type === EdgeType.PERFORMED_BY);
    if (!hasRole) {
      issues.push({
        id: `LINT-001-${atom.id}`,
        atomId: atom.id,
        severity: 'ERROR',
        category: 'COMPLIANCE',
        message: `Process '${atom.id}' has no assigned Role.`,
        suggestion: `Add a PERFORMED_BY edge linking to a ROLE atom.`
      });
    }
  });

  // Rule: Critical atoms must have a high automation_level or a detailed exception map
  // We can query for CRITICAL atoms directly
  const criticalAtoms = new SemanticQueryBuilder(atoms)
    .where('criticality', 'equals', 'CRITICAL')
    .execute().matches;

  criticalAtoms.forEach(atom => {
    if (!atom.content.exceptions || atom.content.exceptions.length === 0) {
      issues.push({
        id: `LINT-002-${atom.id}`,
        atomId: atom.id,
        severity: 'WARNING',
        category: 'STYLE',
        message: `Critical unit '${atom.id}' lacks documented exception handling.`,
        suggestion: `Define 'exceptions' in the atom content to mitigate high-risk failure modes.`
      });
    }
  });

  // Rule: Descriptive naming (Check all atoms)
  atoms.forEach(atom => {
    if (atom.name.length < 5) {
      issues.push({
        id: `LINT-003-${atom.id}`,
        atomId: atom.id,
        severity: 'INFO',
        category: 'STYLE',
        message: `Atom name is unusually short.`,
        suggestion: `Use a more descriptive name for better searchability in RAG contexts.`
      });
    }
  });

  return issues;
};

export const detectCycles = (atoms: Atom[]): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const atomMap = new Map(atoms.map(a => [a.id, a]));
  const visited = new Set<string>();
  const recStack = new Set<string>();

  const traverse = (nodeId: string) => {
    if (recStack.has(nodeId)) {
      issues.push({
        type: 'CYCLE',
        severity: 'CRITICAL',
        description: `Circular dependency detected starting at ${nodeId}`,
        affectedAtoms: [nodeId]
      });
      return;
    }
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    recStack.add(nodeId);
    const atom = atomMap.get(nodeId);
    if (atom) atom.edges.forEach(edge => traverse(edge.targetId));
    recStack.delete(nodeId);
  };

  atoms.forEach(atom => traverse(atom.id));
  return issues;
};

export const validateEdges = (atoms: Atom[]): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const atomIds = new Set(atoms.map(a => a.id));

  atoms.forEach(atom => {
    atom.edges.forEach(edge => {
      if (!atomIds.has(edge.targetId)) {
        issues.push({
          type: 'BROKEN_REF',
          severity: 'CRITICAL',
          description: `Broken reference to: ${edge.targetId}`,
          affectedAtoms: [atom.id, edge.targetId]
        });
      }
    });
  });
  return issues;
};
