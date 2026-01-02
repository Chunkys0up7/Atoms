import React from 'react';
import { Atom, Module, BusinessRule } from '../../../types';
import {
    Activity,
    AlertCircle,
    ArrowUpRight,
    CheckCircle2,
    Clock,
    Database,
    FileText,
    GitBranch,
    Layers,
    Layout,
    Plus,
    Search,
    ShieldCheck,
    Sparkles,
    Zap
} from 'lucide-react';
import { useGraph } from '../../../contexts/GraphContext';

interface SmartDashboardProps {
    atoms: Atom[];
    modules: Module[];
    onNavigate: (view: string) => void;
}

const SmartDashboard: React.FC<SmartDashboardProps> = ({ atoms, modules, onNavigate }) => {
    const { rules } = useGraph();

    // Metrics Calculation
    const totalAtoms = atoms.length;
    const activeAtoms = atoms.filter(a => a.status === 'ACTIVE').length;
    const atomHealth = totalAtoms > 0 ? Math.round((activeAtoms / totalAtoms) * 100) : 100;

    const recentAtoms = [...atoms]
        .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
        .slice(0, 5);

    const activeRules = rules.filter(r => r.isActive).length;

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fadeIn">
            {/* Welcome Section */}
            <div className="flex justify-between items-end border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
                            System Pulse
                        </span>
                        <Activity className="w-6 h-6 text-indigo-500" />
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Real-time overview of your Graph-Native Documentation Platform
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => onNavigate('ingestion')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md hover:shadow-lg"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Ingestion</span>
                    </button>
                </div>
            </div>

            {/* Hero Stats (System Pulse) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                        <Database className="w-24 h-24 text-indigo-600" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Knowledge Base</div>
                        <div className="text-4xl font-bold text-slate-900">{totalAtoms}</div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-green-600 bg-green-50 px-2 py-1 rounded w-fit">
                            <ArrowUpRight className="w-4 h-4" />
                            <span>{activeAtoms} Active</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                        <Layers className="w-24 h-24 text-purple-600" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Modules</div>
                        <div className="text-4xl font-bold text-slate-900">{modules.length}</div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-purple-600 bg-purple-50 px-2 py-1 rounded w-fit">
                            <Layout className="w-4 h-4" />
                            <span>4 Active Workflows</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                        <ShieldCheck className="w-24 h-24 text-amber-600" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Governance</div>
                        <div className="text-4xl font-bold text-slate-900">{activeRules}</div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Active Rules</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-xl shadow-md text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="text-indigo-100 text-sm font-semibold uppercase tracking-wider mb-2">System Health</div>
                        <div className="text-4xl font-bold">{atomHealth}%</div>
                        <div className="mt-2 text-sm text-indigo-100">
                            Operational Score
                        </div>
                        <div className="mt-4 h-2 bg-indigo-900/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white/80 rounded-full transition-all duration-1000"
                                style={{ width: `${atomHealth}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Feed / Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-500" />
                                Recent Updates
                            </h2>
                            <button
                                onClick={() => onNavigate('explorer')}
                                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                View Registry →
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {recentAtoms.map((atom) => (
                                <div key={atom.id} className="p-4 hover:bg-gray-50 transition flex items-start gap-4 cursor-pointer" onClick={() => onNavigate('explorer')}>
                                    <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                    ${atom.type === 'PROCESS' ? 'bg-blue-100 text-blue-600' :
                                            atom.type === 'DECISION' ? 'bg-amber-100 text-amber-600' :
                                                'bg-slate-100 text-slate-600'}
                  `}>
                                        {atom.type === 'PROCESS' ? <GitBranch className="w-5 h-5" /> :
                                            atom.type === 'DECISION' ? <GitBranch className="w-5 h-5 rotate-90" /> : <FileText className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-medium text-slate-900">{atom.name}</h4>
                                            <span className="text-xs text-slate-400">
                                                {new Date(atom.updated_at || Date.now()).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 line-clamp-1 mt-1">
                                            {atom.content?.summary || 'No summary available...'}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded uppercase font-bold tracking-wider">
                                                {atom.type}
                                            </span>
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded uppercase font-bold tracking-wider">
                                                {atom.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommended Actions */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                                Recommended Actions
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="border-l-4 border-amber-400 bg-amber-50 p-4 rounded-r-lg mb-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                                    <div>
                                        <h4 className="font-medium text-amber-900">Governance Review Required</h4>
                                        <p className="text-sm text-amber-700 mt-1">
                                            3 Atoms have missing compliance tags. Run the validation check to identify and fix them.
                                        </p>
                                        <button
                                            onClick={() => onNavigate('validation')}
                                            className="mt-3 text-xs md:text-sm font-semibold text-amber-800 hover:text-amber-900 underline"
                                        >
                                            Run Validation Check
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-r-lg">
                                <div className="flex gap-3">
                                    <Zap className="w-5 h-5 text-blue-600 shrink-0" />
                                    <div>
                                        <h4 className="font-medium text-blue-900">Optimize Graph Structure</h4>
                                        <p className="text-sm text-blue-700 mt-1">
                                            Analysis suggests 2 potential module consolidations based on dependency clustering.
                                        </p>
                                        <button
                                            onClick={() => onNavigate('analytics')}
                                            className="mt-3 text-xs md:text-sm font-semibold text-blue-800 hover:text-blue-900 underline"
                                        >
                                            View Optimization Insights
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-semibold text-slate-800 mb-4">Quick Launch</h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => onNavigate('ingestion')}
                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition text-left group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-medium text-slate-700">New Atom</div>
                                    <div className="text-xs text-slate-400">Create manually</div>
                                </div>
                            </button>

                            <button
                                onClick={() => onNavigate('search')}
                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition text-left group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition">
                                    <Search className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-medium text-slate-700">Search Knowledge</div>
                                    <div className="text-xs text-slate-400">Find anything</div>
                                </div>
                            </button>

                            <button
                                onClick={() => onNavigate('publisher')}
                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition text-left group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-medium text-slate-700">Generate Doc</div>
                                    <div className="text-xs text-slate-400">Compile artifacts</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="bg-indigo-900 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Sparkles className="w-32 h-32" />
                        </div>
                        <h3 className="font-bold text-lg mb-2 relative z-10">AI Assistant</h3>
                        <p className="text-indigo-200 text-sm mb-4 relative z-10">
                            Need help structuring your ontology? The AI assistant provides real-time suggestions.
                        </p>
                        <button
                            onClick={() => onNavigate('assistant')}
                            className="w-full py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-sm font-semibold transition relative z-10"
                        >
                            Open Assistant
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartDashboard;
