import React, { useState } from 'react';
import { Atom, Module } from '../../../types';
import AtomExplorer from '../ontology/AtomExplorer';
import ModuleExplorer from '../ontology/ModuleExplorer';
import OntologyBrowser from '../ontology/OntologyBrowser';
import { BookOpen, Box, Database, Network } from 'lucide-react';

interface KnowledgeHubProps {
    atoms: Atom[];
    modules: Module[];
    phases?: any[];
    journeys?: any[];
    onSelectAtom: (atom: Atom) => void;
    onNavigateToGraph?: (moduleId: string) => void;
}

type KnowledgeTab = 'atoms' | 'modules' | 'ontology';

const KnowledgeHub: React.FC<KnowledgeHubProps> = ({
    atoms,
    modules,
    phases = [],
    journeys = [],
    onSelectAtom,
    onNavigateToGraph
}) => {
    const [activeTab, setActiveTab] = useState<KnowledgeTab>('atoms');

    const tabs = [
        { id: 'atoms', label: 'Atom Registry', icon: Database, description: 'Manage atomic units' },
        { id: 'modules', label: 'Module Catalog', icon: Box, description: 'Workflow components' },
        { id: 'ontology', label: 'Ontology Browser', icon: Network, description: 'Explore relationships' },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm z-10">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <BookOpen className="w-6 h-6 text-indigo-600" />
                            </div>
                            Knowledge Hub
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 ml-12">
                            Centralized repository for Atoms, Modules, and Ontology
                        </p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex gap-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as KnowledgeTab)}
                                className={`
                  relative flex items-center gap-2 px-4 py-3 rounded-t-lg transition-all duration-200
                  ${isActive
                                        ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500 font-semibold'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }
                `}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                                <span>{tab.label}</span>
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'atoms' && (
                    <div className="h-full w-full animate-fadeIn">
                        <AtomExplorer
                            atoms={atoms}
                            modules={modules}
                            onSelect={onSelectAtom}
                        />
                    </div>
                )}

                {activeTab === 'modules' && (
                    <div className="h-full w-full animate-fadeIn">
                        <ModuleExplorer
                            modules={modules}
                            atoms={atoms}
                            onSelectAtom={onSelectAtom}
                            onNavigateToGraph={onNavigateToGraph}
                        />
                    </div>
                )}

                {activeTab === 'ontology' && (
                    <div className="h-full w-full animate-fadeIn">
                        <OntologyBrowser
                            atoms={atoms}
                            modules={modules}
                            phases={phases}
                            journeys={journeys}
                            onSelectAtom={onSelectAtom}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default KnowledgeHub;
