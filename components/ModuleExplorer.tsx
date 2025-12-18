
import React, { useState } from 'react';
import { Atom, Module } from '../types';
import { ATOM_COLORS } from '../constants';

interface ModuleExplorerProps {
  modules: Module[];
  atoms: Atom[];
  onSelectAtom: (atom: Atom) => void;
}

const ModuleExplorer: React.FC<ModuleExplorerProps> = ({ modules, atoms, onSelectAtom }) => {
  const [selectedModuleId, setSelectedModuleId] = useState(modules[0]?.id);

  const activeModule = modules.find(m => m.id === selectedModuleId);
  const moduleAtoms = atoms.filter(a => activeModule?.atoms.includes(a.id));

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="p-8 border-b border-slate-800 bg-slate-900/40">
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Process Architecture</h2>
        <p className="text-slate-400 text-sm max-w-2xl">Browse your documentation through logical business modules and workflow phases.</p>
        
        <div className="flex gap-2 mt-6">
          {modules.map(mod => (
            <button
              key={mod.id}
              onClick={() => setSelectedModuleId(mod.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
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
        {activeModule?.phases.map(phase => {
          const phaseAtoms = moduleAtoms.filter(a => a.phase === phase);
          return (
            <div key={phase} className="min-w-[320px] flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs uppercase font-black text-slate-500 tracking-[0.2em]">{phase}</h3>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{phaseAtoms.length}</span>
              </div>
              
              <div className="space-y-4">
                {phaseAtoms.length > 0 ? (
                  phaseAtoms.map(atom => (
                    <div
                      key={atom.id}
                      onClick={() => onSelectAtom(atom)}
                      className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl hover:border-blue-500/50 hover:bg-slate-800/80 cursor-pointer transition-all group relative overflow-hidden shadow-sm hover:shadow-xl"
                    >
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1" 
                        style={{ backgroundColor: ATOM_COLORS[atom.type] }}
                      />
                      <div className="flex justify-between items-start mb-3">
                        <span className="mono text-[10px] text-slate-500 font-bold bg-slate-950 px-2 py-0.5 rounded">
                          {atom.id}
                        </span>
                        <div className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                          atom.criticality === 'CRITICAL' ? 'border-red-500/50 text-red-400 bg-red-950/20' :
                          atom.criticality === 'HIGH' ? 'border-amber-500/50 text-amber-400 bg-amber-950/20' :
                          'border-slate-700 text-slate-500'
                        }`}>
                          {atom.criticality}
                        </div>
                      </div>
                      <h4 className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">{atom.name}</h4>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed font-medium">
                        {atom.content.summary}
                      </p>
                      
                      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800/50">
                        {atom.edges.length > 0 && (
                          <div className="flex -space-x-1">
                            {atom.edges.slice(0, 3).map((_, i) => (
                              <div key={i} className="w-4 h-4 rounded-full border border-slate-900 bg-slate-700"></div>
                            ))}
                            {atom.edges.length > 3 && (
                              <span className="text-[8px] text-slate-500 pl-2">+{atom.edges.length - 3}</span>
                            )}
                          </div>
                        )}
                        <span className="text-[9px] text-slate-500 ml-auto self-center">Updated {atom.version}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="border border-dashed border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-600 italic text-sm">
                    No atoms assigned
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModuleExplorer;
