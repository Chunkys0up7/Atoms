import { Atom, EdgeType } from '../../types';

export interface SchemaChange {
    type: 'added_property' | 'removed_property' | 'renamed_property' | 'deprecated_node' | 'added_node_type';
    target: string; // e.g. 'API.rateLimit'
    details?: string;
}

export interface SchemaVersion {
    version: string;
    date: Date;
    changes: SchemaChange[];
    migrationFn?: (atoms: Atom[]) => Atom[];
}

export class VersionManager {
    private versions: SchemaVersion[] = [];
    private currentVersion: string = '1.0.0';

    constructor() {
        // Initialize with base version
        this.versions.push({
            version: '1.0.0',
            date: new Date('2026-01-01'),
            changes: []
        });
    }

    public registerVersion(version: SchemaVersion) {
        this.versions.push(version);
        // Sort by date or semver logic
    }

    public getChangeLog(fromVersion: string, toVersion: string): SchemaChange[] {
        // Find all versions between from and to
        // Return accumulated changes
        // Simplified impl:
        return this.versions
            .filter(v => v.version > fromVersion && v.version <= toVersion)
            .flatMap(v => v.changes);
    }

    public migrate(atoms: Atom[], targetVersion: string): Atom[] {
        let migratedAtoms = [...atoms];
        // Apply migrations in order
        // ... implementation would iterate versions and apply migrationFn
        this.currentVersion = targetVersion;
        return migratedAtoms;
    }
}
