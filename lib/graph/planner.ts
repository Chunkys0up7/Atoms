import { Atom, EdgeType } from '../../types';
import { BusinessRule, ConditionGroup, RuleCondition } from './rules';

export interface PlanStep {
    id: string;
    action: string;
    targetId: string;
    dependencies: string[];
    fallbackTargetId?: string;
    status: 'pending' | 'completed' | 'failed' | 'skipped';
    metadata?: any;
}

export interface ExecutionPlan {
    goal: string;
    steps: PlanStep[];
    estimatedCost: number;
    estimatedLatencyMs: number;
    parallelGroups: string[][];
    ruleModifications?: string[];
}

export interface PlannerOptions {
    maxCost?: number;
    maxLatencyMs?: number;
    requireRedundancy?: boolean;
    context?: any; // Runtime context for rule evaluation
}

export class GraphPlanner {
    private atoms: Map<string, Atom>;
    private rules: BusinessRule[];

    constructor(atoms: Atom[], rules: BusinessRule[] = []) {
        this.atoms = new Map(atoms.map(a => [a.id, a]));
        this.rules = rules.sort((a, b) => b.priority - a.priority);
    }

    public async plan(goal: string, targetAtomId: string, options: PlannerOptions = {}): Promise<ExecutionPlan> {
        const target = this.atoms.get(targetAtomId);
        if (!target) throw new Error(`Target atom ${targetAtomId} not found`);

        const rulesApplied: string[] = [];

        // 1. Evaluate Rule Interactions FIRST
        // Rules might inject new requirements or modify the goal based on context
        const context = options.context || {};
        // Add target atom details to context for evaluation
        const fullContext = {
            ...context,
            target: target,
            goal: goal
        };

        const activeRules = this.rules.filter(r => r.active);
        const modifications: any[] = [];

        for (const rule of activeRules) {
            if (this.evaluateCondition(rule.condition, fullContext)) {
                rulesApplied.push(rule.name);
                if (rule.action.type === 'INSERT_PHASE' && rule.action.phase) {
                    modifications.push({
                        type: 'INSERT',
                        phase: rule.action.phase,
                        reason: rule.action.modification.reason
                    });
                }
            }
        }

        // 2. Dependency Resolution (Base Plan)
        const steps: PlanStep[] = [];
        const visited = new Set<string>();
        let totalCost = 0;
        let totalLatency = 0;

        const resolveDependencies = (atomId: string) => {
            if (visited.has(atomId)) return;
            visited.add(atomId);

            const atom = this.atoms.get(atomId);
            if (!atom) return;

            // Direct dependencies
            const depEdges = atom.edges?.filter(e => e.type === EdgeType.DEPENDS_ON || e.type === EdgeType.REQUIRES_KNOWLEDGE_OF) || [];

            for (const edge of depEdges) {
                resolveDependencies(edge.targetId);
            }

            // Estimate Cost & Latency
            const cost = atom.enhancedMetadata?.costPerRequest || 0;
            const latency = atom.enhancedMetadata?.typicalLatencyMs || 10;
            totalCost += cost;
            totalLatency += latency;

            let fallbackId = undefined;
            if (atom.enhancedMetadata?.fallbackIds && atom.enhancedMetadata.fallbackIds.length > 0) {
                fallbackId = atom.enhancedMetadata.fallbackIds[0];
            }

            steps.push({
                id: `step_${atomId}`,
                action: 'execute_atom',
                targetId: atomId,
                dependencies: depEdges.map(e => `step_${e.targetId}`),
                fallbackTargetId: fallbackId,
                status: 'pending'
            });
        };

        resolveDependencies(targetAtomId);

        // 3. Apply Rule Modifications (Inject Phases)
        for (const mod of modifications) {
            if (mod.type === 'INSERT') {
                // Conceptually inject a step. 
                // If real "modules" were atoms, we'd look them up.
                // For now, we create a specialized step for the phase.
                const phaseStepId = `phase_${mod.phase.id}`;

                // If position is 'BEFORE', this phase must be completed before the target
                if (mod.phase.position === 'BEFORE' || mod.phase.position === 'AT_START') {
                    // Find the step for the target atom
                    const targetStep = steps.find(s => s.targetId === targetAtomId);
                    if (targetStep) {
                        targetStep.dependencies.push(phaseStepId);
                    }
                }

                steps.push({
                    id: phaseStepId,
                    action: 'execute_phase',
                    targetId: mod.phase.id,
                    dependencies: [], // Could depend on others if chained
                    status: 'pending',
                    metadata: {
                        description: `Injected by rule: ${mod.reason}`,
                        criticality: mod.criticality,
                        modules: mod.phase.modules
                    }
                });
            }
        }

        // Check Constraints
        if (options.maxCost !== undefined && totalCost > options.maxCost) {
            throw new Error(`Plan exceeds max cost: ${totalCost} > ${options.maxCost}`);
        }
        if (options.maxLatencyMs !== undefined && totalLatency > options.maxLatencyMs) {
            console.warn(`Plan estimates high latency: ${totalLatency} > ${options.maxLatencyMs}`);
        }

        return {
            goal,
            steps,
            estimatedCost: totalCost,
            estimatedLatencyMs: totalLatency,
            parallelGroups: [],
            ruleModifications: rulesApplied
        };
    }

    private evaluateCondition(condition: ConditionGroup, context: any): boolean {
        const results: boolean[] = [];

        // Rules
        for (const rule of condition.rules) {
            results.push(this.evaluateRule(rule, context));
        }

        // Nested Groups
        if (condition.groups) {
            for (const group of condition.groups) {
                results.push(this.evaluateCondition(group, context));
            }
        }

        if (results.length === 0) return true; // Empty group is true?

        if (condition.type === 'AND') return results.every(r => r);
        if (condition.type === 'OR') return results.some(r => r);
        if (condition.type === 'NOT') return !results.every(r => r); // Assuming NOT AND

        return false;
    }

    private evaluateRule(rule: RuleCondition, context: any): boolean {
        // Resolve field path: e.g. "target.enhancedMetadata.cost"
        const value = this.resolvePath(context, rule.field);

        switch (rule.operator) {
            case 'EQUALS': return value == rule.value; // loose equality for string/number tolerance
            case 'NOT_EQUALS': return value != rule.value;
            case 'GREATER_THAN': return value > rule.value;
            case 'LESS_THAN': return value < rule.value;
            case 'GREATER_EQUAL': return value >= rule.value;
            case 'LESS_EQUAL': return value <= rule.value;
            case 'CONTAINS': return Array.isArray(value) && value.includes(rule.value) || (typeof value === 'string' && value.includes(rule.value));
            case 'NOT_CONTAINS': return !((Array.isArray(value) && value.includes(rule.value)) || (typeof value === 'string' && value.includes(rule.value)));
            case 'IN': return Array.isArray(rule.value) && rule.value.includes(value);
            case 'NOT_IN': return Array.isArray(rule.value) && !rule.value.includes(value);
            default: return false;
        }
    }

    private resolvePath(obj: any, path: string): any {
        return path.split('.').reduce((prev, curr) => prev ? prev[curr] : undefined, obj);
    }
}
