
// GraphPlanner Rule Definitions
export interface RuleCondition {
    field: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'GREATER_EQUAL' | 'LESS_EQUAL' | 'CONTAINS' | 'NOT_CONTAINS' | 'IN' | 'NOT_IN';
    value: any;
}

export interface ConditionGroup {
    type: 'AND' | 'OR' | 'NOT';
    rules: RuleCondition[];
    groups?: ConditionGroup[];
}

export interface RuleAction {
    type: 'INSERT_PHASE' | 'REMOVE_PHASE' | 'REPLACE_PHASE' | 'MODIFY_PHASE';
    phase?: {
        id: string;
        name: string;
        position: 'BEFORE' | 'AFTER' | 'REPLACE' | 'AT_START' | 'AT_END';
        reference_phase?: string;
        modules?: string[];
    };
    modification: {
        reason: string;
        criticality: string;
    };
}

export interface BusinessRule {
    rule_id: string;
    name: string;
    priority: number;
    active: boolean;
    condition: ConditionGroup;
    action: RuleAction;
}
