
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import GraphView from './components/GraphView';
import AtomExplorer from './components/AtomExplorer';
import ModuleExplorer from './components/ModuleExplorer';
import EdgeExplorer from './components/EdgeExplorer';
import ImpactAnalysisUI from './components/ImpactAnalysisUI';
import AIAssistant from './components/AIAssistant';
import ValidationCenter from './components/ValidationCenter';
import Publisher from './components/Publisher';
import IngestionEngine from './components/IngestionEngine';
import OntologyView from './components/OntologyView';
import Glossary from './components/Glossary';
import { MOCK_ATOMS, MOCK_MODULES, ATOM_COLORS } from './constants';
import { Atom, Module, ViewType } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('ingestion');
  const [selectedAtom, setSelectedAtom] = useState<Atom | null>(null);
  const [atoms, setAtoms] = useState<Atom[]>(MOCK_ATOMS);
  const [modules, setModules] = useState<Module[]>(MOCK_MODULES);

  const [isSyncing, setIsSyncing] = useState(false);
  const [uncommittedChanges, setUncommittedChanges] = useState(0);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setUncommittedChanges(0);
    }, 2000);
  };

  const handleIngest = (data: { atoms: Atom[], module: Module }) => {
    const newAtoms = data.atoms.filter(na => !atoms.some(a => a.id === na.id));
    setAtoms(prev => [...prev, ...newAtoms]);
    setModules(prev => [...prev, data.module]);
    setUncommittedChanges(prev => prev + newAtoms.length + 1);
    setView('modules');
  };

  const renderContent = () => {
    switch (view) {
      case 'ontology':
        return <OntologyView />;
      case 'glossary':
        return <Glossary />;
      case 'explorer':
        return <AtomExplorer atoms={atoms} onSelect={(a) => { setSelectedAtom(a); }} />;
      case 'modules':
        return <ModuleExplorer modules={modules} atoms={atoms} onSelectAtom={(a) => { setSelectedAtom(a); }} />;
      case 'graph':
        return <GraphView atoms={atoms} onSelectAtom={(a) => { setSelectedAtom(a); }} />;
      case 'edges':
        return <EdgeExplorer atoms={atoms} onSelectAtom={(a) => { setSelectedAtom(a); }} />;
      case 'health':
        return <ValidationCenter atoms={atoms} modules={modules} onFocusAtom={(a) => { setSelectedAtom(a); setView('explorer'); }} />;
      case 'impact':
        return <ImpactAnalysisUI atoms={atoms} />;
      case 'publisher':
        return <Publisher atoms={atoms} modules={modules} />;
      case 'assistant':
        return <AIAssistant atoms={atoms} />;
      case 'ingestion':
        return <IngestionEngine atoms={atoms} onIngest={handleIngest} />;
      default:
        return <div>Select a view from the sidebar</div>;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans selection:bg-blue-500/30">
      <Sidebar currentView={view} onViewChange={setView} />
      
      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-20 border-b border-slate-800 bg-[#0a0f1d]/80 backdrop-blur-2xl flex items-center justify-between px-10 shrink-0 z-10">
          <div className="flex items-center gap-4">
             <div className="text-[10px] uppercase font-black text-slate-500 tracking-[0.3em]">Registry Status</div>
             <span className="text-slate-700 font-light">/</span>
             <div className="text-sm font-bold text-slate-200 uppercase tracking-tighter">
               {view.replace('_', ' ').charAt(0).toUpperCase() + view.replace('_', ' ').slice(1)}
             </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="hidden lg:flex items-center gap-4 mr-4">
               <div className="flex flex-col items-end">
                 <span className="text-[8px] font-black text-slate-600 uppercase">Active Ontology</span>
                 <span className="text-[10px] font-bold text-slate-300">NASA Atomic v1.2</span>
               </div>
             </div>
             {uncommittedChanges > 0 && (
               <button onClick={handleSync} className="flex items-center gap-2 bg-blue-600/10 px-4 py-2 rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-600/20 transition-all">
                 {isSyncing ? <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                 <span className="text-[10px] font-black uppercase tracking-widest">Commit changes ({uncommittedChanges})</span>
               </button>
             )}
             <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center text-xs font-black text-white shadow-xl">JD</div>
          </div>
        </header>
        
        <div className="flex-1 min-h-0 bg-slate-950 relative">
          {renderContent()}
        </div>

        {selectedAtom && (
          <div className="absolute top-0 right-0 w-[420px] h-full bg-[#0a0f1d] border-l border-slate-800 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300 ease-out">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/20">
              <div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Atom Inspector</span>
                <h3 className="font-black text-white text-lg tracking-tight uppercase">{selectedAtom.id}</h3>
              </div>
              <button onClick={() => setSelectedAtom(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800 transition-colors text-slate-500 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xl font-black text-white tracking-tight">{selectedAtom.name}</h4>
                  <div className="w-3 h-3 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.5)]" style={{ backgroundColor: ATOM_COLORS[selectedAtom.type] }} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-black bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-slate-300 uppercase tracking-widest">{selectedAtom.type}</span>
                  <span className={`text-[10px] font-black border px-3 py-1 rounded-full uppercase tracking-widest ${selectedAtom.criticality === 'CRITICAL' ? 'bg-red-900/20 border-red-500/30 text-red-400' : selectedAtom.criticality === 'HIGH' ? 'bg-amber-900/20 border-amber-500/30 text-amber-400' : 'bg-slate-800/40 border-slate-700 text-slate-400'}`}>{selectedAtom.criticality} RISK</span>
                </div>
              </section>
              <section>
                <h5 className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-3">Unit Summary</h5>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">{selectedAtom.content.summary}</p>
              </section>
              <section>
                <h5 className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-3">Pointer Context</h5>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-[9px] font-black text-slate-600 uppercase mb-2">Ontology Domain</div>
                  <div className="text-xs font-bold text-slate-300">{selectedAtom.ontologyDomain}</div>
                </div>
              </section>
            </div>
            <div className="p-8 border-t border-slate-800 bg-[#0d1324] flex gap-3">
              <button onClick={() => { setView('impact'); setSelectedAtom(null); }} className="flex-1 bg-blue-600 hover:bg-blue-500 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-blue-900/30">Impact Analysis</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
