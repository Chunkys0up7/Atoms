import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Atom, Module, GraphContext as GraphContextType } from '../types';
import { GraphPlanner } from '../lib/graph/planner';
import { AuditLog } from '../lib/graph/audit';
import { GovernanceEngine } from '../lib/graph/governance';
import { BusinessRule } from '../lib/graph/rules';
import { API_ENDPOINTS } from '../constants';

interface GraphProviderContext {
    atoms: Atom[];
    modules: Module[];
    phases: any[];
    journeys: any[];
    isLoading: boolean;
    error: string | null;
    graphPlanner: GraphPlanner | null;
    governanceEngine: GovernanceEngine | null;
    auditLog: AuditLog;
    loadData: (silent?: boolean) => Promise<void>;
    ingestData: (data: { atoms: Atom[], module: Module }) => void;
    rules: BusinessRule[];
}

const GraphContext = createContext<GraphProviderContext | undefined>(undefined);

export const useGraph = () => {
    const context = useContext(GraphContext);
    if (!context) {
        throw new Error('useGraph must be used within a GraphProvider');
    }
    return context;
};

interface GraphProviderProps {
    children: ReactNode;
}

export const GraphProvider: React.FC<GraphProviderProps> = ({ children }) => {
    const [atoms, setAtoms] = useState<Atom[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [phases, setPhases] = useState<any[]>([]);
    const [journeys, setJourneys] = useState<any[]>([]);
    const [rules, setRules] = useState<BusinessRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [graphPlanner, setGraphPlanner] = useState<GraphPlanner | null>(null);
    const [governanceEngine, setGovernanceEngine] = useState<GovernanceEngine | null>(null);
    const [auditLog] = useState(() => new AuditLog()); // Stable instance

    useEffect(() => {
        if (atoms.length > 0) {
            setGraphPlanner(new GraphPlanner(atoms, rules));
            setGovernanceEngine(new GovernanceEngine(atoms));
        }
    }, [atoms, rules]);

    const loadData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        setError(null);

        try {
            // Fetch atoms
            let allAtoms: Atom[] = [];
            let offset = 0;
            const batchSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const atomsResponse = await fetch(`${API_ENDPOINTS.atoms}?limit=${batchSize}&offset=${offset}`);
                if (!atomsResponse.ok) {
                    throw new Error(`Failed to load atoms: ${atomsResponse.statusText}`);
                }
                const atomsData = await atomsResponse.json();
                allAtoms = allAtoms.concat(atomsData.atoms || []);
                hasMore = atomsData.has_more;
                offset += batchSize;
                if (offset > 10000) break;
            }

            setAtoms(allAtoms);

            // Fetch modules
            const modulesResponse = await fetch(API_ENDPOINTS.modules);
            if (!modulesResponse.ok) {
                throw new Error(`Failed to load modules: ${modulesResponse.statusText}`);
            }
            const modulesData = await modulesResponse.json();

            const normalizedModules = modulesData.map((mod: any) => ({
                id: mod.id || mod.module_id,
                name: mod.name,
                description: mod.description,
                owner: mod.owner || (mod.metadata && mod.metadata.owner),
                atoms: mod.atoms || mod.atom_ids || [],
                phaseId: mod.phaseId
            }));

            setModules(normalizedModules);

            // Fetch phases
            try {
                const phasesResponse = await fetch('http://localhost:8000/api/phases');
                if (phasesResponse.ok) {
                    const phasesData = await phasesResponse.json();
                    setPhases(phasesData);
                }
            } catch (e) {
                console.warn('Failed to load phases', e);
            }

            // Fetch journeys
            try {
                const journeysResponse = await fetch('http://localhost:8000/api/journeys');
                if (journeysResponse.ok) {
                    const journeysData = await journeysResponse.json();
                    setJourneys(journeysData);
                }
            } catch (e) {
                console.warn('Failed to load journeys', e);
            }

            // Fetch active rules
            try {
                const rulesResponse = await fetch(`${API_ENDPOINTS.rules || 'http://localhost:8000/api/rules'}?active_only=true`);
                if (rulesResponse.ok) {
                    const rulesData = await rulesResponse.json();
                    setRules(rulesData);
                }
            } catch (e) {
                console.warn('Failed to load rules', e);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
            setError(errorMessage);
            console.error('Error loading data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Initial load
        loadData();

        // Polling interval (5 seconds)
        const POLLING_INTERVAL = 5000;
        let timeoutId: NodeJS.Timeout;

        const pollData = async () => {
            // Only poll if tab is visible
            if (!document.hidden) {
                // Pass silent=true to avoid triggering global loading state repeatedly
                await loadData(true);
            }
            timeoutId = setTimeout(pollData, POLLING_INTERVAL);
        };

        // Start polling
        timeoutId = setTimeout(pollData, POLLING_INTERVAL);

        return () => {
            clearTimeout(timeoutId);
        };
    }, []);

    const ingestData = (data: { atoms: Atom[], module: Module }) => {
        const newAtoms = data.atoms.filter(na => !atoms.some(a => a.id === na.id));
        setAtoms(prev => [...prev, ...newAtoms]);
        setModules(prev => [...prev, data.module]);
    };

    return (
        <GraphContext.Provider value={{
            atoms,
            modules,
            phases,
            journeys,
            isLoading,
            error,
            graphPlanner,
            governanceEngine,
            auditLog,
            loadData,
            ingestData,
            rules
        }}>
            {children}
        </GraphContext.Provider>
    );
};
