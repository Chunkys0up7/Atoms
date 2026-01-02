import { Atom, EdgeType } from '../../types';
import { NodeType } from './schema';

export interface PolicyContext {
    environment: 'production' | 'staging' | 'local';
    userRole: string;
    licenseType?: string;
}

export class GovernanceEngine {
    private policies: Atom[] = [];

    constructor(atoms: Atom[]) {
        this.policies = atoms.filter(a => a.type === NodeType.POLICY);
    }

    public isActionAllowed(action: string, targetAtom: Atom, context: PolicyContext): { allowed: boolean; reason?: string } {
        // 1. Check direct constraints on the target
        if (targetAtom.enhancedMetadata?.allowedEnvironments) {
            if (!targetAtom.enhancedMetadata.allowedEnvironments.includes(context.environment)) {
                return { allowed: false, reason: `Environment '${context.environment}' not allowed. Requires: ${targetAtom.enhancedMetadata.allowedEnvironments.join(', ')}` };
            }
        }

        // 2. Check Graph Policies (FORBIDDEN_FOR edges)
        // This requires access to edges. Assuming we have them.
        const forbiddenEdges = this.policies.flatMap(p =>
            p.edges.filter(e => e.type === EdgeType.FORBIDDEN_FOR && e.targetId === targetAtom.id)
                .map(e => ({ policy: p, edge: e }))
        );

        for (const { policy } of forbiddenEdges) {
            // If policy matches context, then forbid
            // Simplified logic: assume policy atoms have metadata defining when they apply
            // For example, if policy says "No generic users", and context.userRole is generic...
            // This needs more complex logic matching policy metadata to context.
        }

        return { allowed: true };
    }
}
