import { Atom } from '../../types';

export type QueryOperator = 'equals' | 'contains' | 'gt' | 'lt' | 'in';

export interface QueryCondition {
    field: string;
    operator: QueryOperator;
    value: any;
}

export interface QueryResult<T> {
    matches: T[];
    reasoning: {
        appliedFilters: string[];
        semanticPath: string[];
    };
}

export class SemanticQueryBuilder {
    private atoms: Atom[];
    private conditions: QueryCondition[] = [];
    private limitCount?: number;
    private sortField?: string;
    private sortDirection: 'asc' | 'desc' = 'asc';

    constructor(atoms: Atom[]) {
        this.atoms = atoms;
    }

    public where(field: string, operator: QueryOperator, value: any): this {
        this.conditions.push({ field, operator, value });
        return this;
    }

    public limit(count: number): this {
        this.limitCount = count;
        return this;
    }

    public orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
        this.sortField = field;
        this.sortDirection = direction;
        return this;
    }

    public execute(): QueryResult<Atom> {
        const auditLog: string[] = [];
        let result = [...this.atoms];

        // Apply Filters
        for (const cond of this.conditions) {
            const initialCount = result.length;
            result = result.filter(atom => this.evaluateCondition(atom, cond));
            const dropped = initialCount - result.length;
            auditLog.push(`Applied filter: ${cond.field} ${cond.operator} ${cond.value}. Dropped ${dropped} items.`);
        }

        // Apply Sort
        if (this.sortField) {
            result.sort((a, b) => {
                const valA = this.getFieldValue(a, this.sortField!);
                const valB = this.getFieldValue(b, this.sortField!);
                if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
            auditLog.push(`Sorted by ${this.sortField} ${this.sortDirection}`);
        }

        // Apply Limit
        if (this.limitCount !== undefined) {
            const beforeLimit = result.length;
            result = result.slice(0, this.limitCount);
            auditLog.push(`Limited to ${this.limitCount} items (from ${beforeLimit})`);
        }

        return {
            matches: result,
            reasoning: {
                appliedFilters: this.conditions.map(c => `${c.field} ${c.operator} ${c.value}`),
                semanticPath: auditLog
            }
        };
    }

    private evaluateCondition(atom: Atom, cond: QueryCondition): boolean {
        const val = this.getFieldValue(atom, cond.field);

        switch (cond.operator) {
            case 'equals': return val === cond.value;
            case 'contains': return Array.isArray(val) ? val.includes(cond.value) : String(val).includes(String(cond.value));
            case 'gt': return val > cond.value;
            case 'lt': return val < cond.value;
            case 'in': return Array.isArray(cond.value) && cond.value.includes(val);
            default: return false;
        }
    }

    // Helper to access nested properties safely, including new metadata if we add it
    private getFieldValue(atom: Atom, field: string): any {
        // Check top-level properties
        if (field in atom) return (atom as any)[field];
        // Check content
        if (field in atom.content) return (atom.content as any)[field];
        // Check metrics
        if (atom.metrics && field in atom.metrics) return (atom.metrics as any)[field];
        // Check enhancedMetadata
        if (atom.enhancedMetadata && field in atom.enhancedMetadata) return (atom.enhancedMetadata as any)[field];

        return undefined;
    }
}
