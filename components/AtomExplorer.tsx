
import React, { useState } from 'react';
import { Atom, AtomType } from '../types';
import { ATOM_COLORS } from '../constants';

interface AtomExplorerProps {
  atoms: Atom[];
  onSelect: (atom: Atom) => void;
}

const AtomExplorer: React.FC<AtomExplorerProps> = ({ atoms, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AtomType | 'ALL'>('ALL');

  const filteredAtoms = atoms.filter(atom => {
    const name = atom.name || atom.title || '';
    const id = atom.id || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || atom.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="p-10 border-b border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight mb-2">Global Registry</h2>
            <p className="text-slate-500 text-sm font-medium">
              System-wide documentation index. Manage indivisible 
              <span className="text-blue-500 ml-1 group relative cursor-help">
                Atomic Units
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 bg-slate-800 text-[10px] p-2 rounded-lg border border-slate-700 shadow-2xl z-50">
                  <span className="font-black text-white uppercase block mb-1">Methodology Tip:</span>
                  Atoms are the smallest indivisible units that cover exactly one concept or task.
                </div>
              </span>.
            </p>
          </div>
          <div className="flex flex-col items-end">
             <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Total Indexed Units</div>
             <div className="text-3xl font-black text-blue-500">{atoms.length}</div>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search by ID, Name, or Metadata..." 
              className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50 text-white placeholder:text-slate-600 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="bg-slate-900/80 border border-slate-800 rounded-2xl py-3.5 px-6 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-600/50 text-slate-400 cursor-pointer shadow-inner appearance-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="ALL">All Node Types</option>
            {Object.values(AtomType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAtoms.map(atom => (
            <div 
              key={atom.id}
              onClick={() => onSelect(atom)}
              className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] hover:border-blue-500/50 hover:bg-slate-900/80 cursor-pointer transition-all group flex flex-col shadow-sm hover:shadow-2xl hover:shadow-blue-900/10 active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="mono text-[10px] text-slate-500 font-black uppercase tracking-tighter bg-slate-950/80 border border-slate-800 px-3 py-1 rounded-full group-hover:text-blue-400 group-hover:border-blue-900 transition-colors">
                  {atom.id}
                </span>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${
                  atom.criticality === 'CRITICAL' ? 'border-red-500/50 text-red-400 bg-red-950/20' :
                  atom.criticality === 'HIGH' ? 'border-amber-500/50 text-amber-400 bg-amber-950/20' :
                  'border-slate-800 text-slate-500'
                }`}>
                  {atom.criticality}
                </span>
              </div>
              <h3 className="font-bold text-slate-200 group-hover:text-white mb-2 truncate text-lg tracking-tight">{atom.name}</h3>
              <p className="text-xs text-slate-500 line-clamp-2 mb-6 leading-relaxed font-medium">
                {atom.content.summary}
              </p>
              
              <div className="mt-auto pt-6 border-t border-slate-800/50 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ATOM_COLORS[atom.type] }}></div>
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">{atom.type}</span>
                 </div>
                 <div className="group relative">
                  <span className="text-[10px] mono text-slate-700 font-bold uppercase tracking-widest group-hover:text-slate-500 transition-colors">v{atom.version}</span>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AtomExplorer;
