
import React, { useState } from 'react';
import { Atom, Module } from '../types';
import { ATOM_COLORS, MOCK_PHASES, MOCK_JOURNEYS } from '../constants';

interface ModuleExplorerProps {
  modules: Module[];
  atoms: Atom[];
  onSelectAtom: (atom: Atom) => void;
}

const ModuleExplorer: React.FC<ModuleExplorerProps> = ({ modules, atoms, onSelectAtom }) => {
  const [selectedJourneyId, setSelectedJourneyId] = useState(MOCK_JOURNEYS[0]?.id);
  const [selectedPhaseId, setSelectedPhaseId] = useState(MOCK_PHASES[0]?.id);
  const [selectedModuleId, setSelectedModuleId] = useState(modules[0]?.id);

  const activeJourney = MOCK_JOURNEYS.find(j => j.id === selectedJourneyId);
  const activePhase = MOCK_PHASES.find(p => p.id === selectedPhaseId);
  const activeModule = modules.find(m => m.id === selectedModuleId);
  
  const phaseModules = modules.filter(m => m.phaseId === selectedPhaseId);
  const moduleAtoms = atoms.filter(a => activeModule?.atoms.includes(a.id));

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="p-8 border-b border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
          <span>{activeJourney?.name}</span>
          <span className="text-slate-800">/</span>
          <span className="text-blue-500">{activePhase?.name}</span>
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
          {activeModule ? activeModule.name : 'Select Module'}
        </h2>
        
        <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
          {phaseModules.map(mod => (
            <button
              key={mod.id}
              onClick={() => setSelectedModuleId(mod.id)}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                selectedModuleId === mod.id
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {mod.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-8 flex gap-8">
        <div className="min-w-[400px] flex flex-col gap-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.3em]">Module Composition</h3>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">{moduleAtoms.length} Atoms</span>
          </div>
          
          <div className="space-y-4">
            {moduleAtoms.length > 0 ? (
              moduleAtoms.map(atom => (
                <div
                  key={atom.id}
                  onClick={() => onSelectAtom(atom)}
                  className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-blue-500/50 hover:bg-slate-800/80 cursor-pointer transition-all group relative overflow-hidden shadow-sm"
                >
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1.5" 
                    style={{ backgroundColor: ATOM_COLORS[atom.type] }}
                  />
                  <div className="flex justify-between items-start mb-4">
                    <span className="mono text-[10px] text-slate-500 font-bold bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                      {atom.id}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">{atom.type}</span>
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-100 text-lg mb-2 group-hover:text-blue-400 transition-colors">{atom.name}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-medium">
                    {atom.content.summary}
                  </p>
                  
                  <div className="mt-6 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-[9px] font-black uppercase text-slate-500">Atomic Activity</span>
                     </div>
                     <svg className="w-4 h-4 text-slate-700 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7" />
                     </svg>
                  </div>
                </div>
              ))
            ) : (
              <div className="border-2 border-dashed border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center text-slate-600 text-center">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mb-4">⚛️</div>
                <h4 className="text-sm font-black uppercase tracking-widest mb-1">Module Empty</h4>
                <p className="text-xs italic">No atomic units linked to this module.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Relationship Preview */}
        {activeModule && (
          <div className="flex-1 min-w-[300px] bg-slate-900/20 border border-slate-800 border-dashed rounded-[3rem] p-10 flex flex-col justify-center items-center text-center">
             <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] mb-4">Logical Flow</div>
             <div className="space-y-4 w-full max-w-xs">
                {moduleAtoms.map((a, i) => (
                  <React.Fragment key={a.id}>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {a.name}
                    </div>
                    {i < moduleAtoms.length - 1 && (
                      <div className="flex justify-center">
                        <svg className="w-4 h-4 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7-7-7" />
                        </svg>
                      </div>
                    )}
                  </React.Fragment>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleExplorer;
