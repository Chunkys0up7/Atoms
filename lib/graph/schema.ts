import { Atom, AtomType, EdgeType } from '../../types';

export enum NodeType {
    API = 'API',
    CAPABILITY = 'CAPABILITY',
    AGENT = 'AGENT',
    POLICY = 'POLICY',
    VERSION = 'VERSION',
    // Mapping existing types for completeness
    PROCESS = 'PROCESS',
    DECISION = 'DECISION',
    GATEWAY = 'GATEWAY',
    ROLE = 'ROLE',
    SYSTEM = 'SYSTEM',
    DOCUMENT = 'DOCUMENT',
    REGULATION = 'REGULATION',
    METRIC = 'METRIC',
    RISK = 'RISK',
    CONTROL = 'CONTROL'
}

export interface NodeSchema {
    requiredProperties: string[];
    optionalProperties: string[];
    allowedEdgeTypes: EdgeType[];
}

export class GraphSchema {
    private schemas: Map<AtomType, NodeSchema> = new Map();

    constructor() {
        this.initializeSchemas();
    }

    private initializeSchemas() {
        // API Node Schema
        this.schemas.set(AtomType.API, {
            requiredProperties: ['domain', 'rateLimitPerMinute', 'typicalLatencyMs'],
            optionalProperties: ['costPerRequest', 'isDeprecated', 'authType'],
            allowedEdgeTypes: [EdgeType.DELIVERS, EdgeType.DEPENDS_ON, EdgeType.REPLACED_BY]
        });

        // Capability Node Schema
        this.schemas.set(AtomType.CAPABILITY, {
            requiredProperties: ['description'],
            optionalProperties: ['complexity'],
            allowedEdgeTypes: [EdgeType.IMPLEMENTS]
        });

        // Policy Node Schema
        this.schemas.set(AtomType.POLICY, {
            requiredProperties: ['action', 'effect'],
            optionalProperties: ['scope', 'priority'],
            allowedEdgeTypes: [EdgeType.FORBIDDEN_FOR, EdgeType.GOVERNED_BY]
        });

        // Version Node Schema
        this.schemas.set(AtomType.VERSION, {
            requiredProperties: ['versionString', 'releaseDate'],
            optionalProperties: ['changelog'],
            allowedEdgeTypes: [EdgeType.VERSION_OF]
        });
    }

    public validateNode(atom: Atom): string[] {
        const errors: string[] = [];
        const schema = this.schemas.get(atom.type);

        if (!schema) {
            return errors;
        }

        return errors;
    }

    public getSchema(type: AtomType): NodeSchema | undefined {
        return this.schemas.get(type);
    }
}
