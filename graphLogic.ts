
import { Atom, ValidationIssue, EdgeType } from './types';

/**
 * Detects circular dependencies using Depth First Search.
 */
export const detectCycles = (atoms: Atom[]): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const atomMap = new Map(atoms.map(a => [a.id, a]));
  const visited = new Set<string>();
  const recStack = new Set<string>();

  const findPath = (start: string, target: string, path: string[] = []): string[] | null => {
    if (start === target) return [...path, target];
    const atom = atomMap.get(start);
    if (!atom) return null;

    for (const edge of atom.edges) {
      const result = findPath(edge.targetId, target, [...path, start]);
      if (result) return result;
    }
    return null;
  };

  const traverse = (nodeId: string) => {
    if (recStack.has(nodeId)) {
      // Found a cycle
      const cyclePath = findPath(nodeId, nodeId);
      issues.push({
        type: 'CYCLE',
        severity: 'CRITICAL',
        description: `Circular dependency detected: ${cyclePath?.join(' -> ')}`,
        affectedAtoms: [nodeId]
      });
      return;
    }
    if (visited.has(nodeId)) return;

    visited.add(nodeId);
    recStack.add(nodeId);

    const atom = atomMap.get(nodeId);
    if (atom) {
      atom.edges.forEach(edge => traverse(edge.targetId));
    }

    recStack.delete(nodeId);
  };

  atoms.forEach(atom => traverse(atom.id));
  return issues;
};

/**
 * Validates edge properties against enterprise rules.
 */
export const validateEdges = (atoms: Atom[]): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const atomIds = new Set(atoms.map(a => a.id));

  atoms.forEach(atom => {
    atom.edges.forEach(edge => {
      // Check for broken references
      if (!atomIds.has(edge.targetId)) {
        issues.push({
          type: 'BROKEN_REF',
          severity: 'CRITICAL',
          description: `Broken reference to non-existent atom: ${edge.targetId}`,
          affectedAtoms: [atom.id, edge.targetId]
        });
      }

      // Business Rule: TRIGGERS must have a description for context
      if (edge.type === EdgeType.TRIGGERS && !edge.description) {
        issues.push({
          type: 'SCHEMA_VIOLATION',
          severity: 'WARNING',
          description: `Edge of type TRIGGERS requires a description for impact audit.`,
          affectedAtoms: [atom.id]
        });
      }
    });

    // Check for orphans
    const isTarget = atoms.some(a => a.edges.some(e => e.targetId === atom.id));
    if (!isTarget && atom.edges.length === 0) {
      issues.push({
        type: 'ORPHAN',
        severity: 'WARNING',
        description: `Atom is isolated (no incoming or outgoing edges).`,
        affectedAtoms: [atom.id]
      });
    }
  });

  return issues;
};
