export interface AuditEntry {
    timestamp: Date;
    actor: string;
    action: 'query' | 'execute' | 'create' | 'update' | 'delete';
    queryString?: string;
    result: {
        status: 'success' | 'failure';
        nodeCount?: number;
        latencyMs?: number;
        costUsd?: number;
    };
    reasoningPath?: {
        conditions?: any[];
        semanticPath: string[]; // Auditable path
    };
}

export class AuditLog {
    private logs: AuditEntry[] = [];

    public record(entry: AuditEntry) {
        this.logs.push(entry);
        // In a real system, this would write to a secure append-only log or DB
        // console.log(`[AUDIT] ${entry.timestamp.toISOString()} ${entry.actor} ${entry.action}: ${entry.result.status}`);
    }

    public getLogs(filter?: { actor?: string, action?: string }): AuditEntry[] {
        return this.logs.filter(log => {
            if (filter?.actor && log.actor !== filter.actor) return false;
            if (filter?.action && log.action !== filter.action) return false;
            return true;
        });
    }

    public generateComplianceReport(start: Date, end: Date): any {
        const inRange = this.logs.filter(l => l.timestamp >= start && l.timestamp <= end);
        const totalOps = inRange.length;
        const failures = inRange.filter(l => l.result.status === 'failure').length;

        return {
            period: { start, end },
            totalOperations: totalOps,
            failureRate: totalOps > 0 ? failures / totalOps : 0,
            operationsByType: this.groupBy(inRange, 'action'),
            actors: [...new Set(inRange.map(l => l.actor))]
        };
    }

    private groupBy(array: any[], key: string) {
        return array.reduce((result: any, currentValue: any) => {
            (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
            return result;
        }, {});
    }
}
