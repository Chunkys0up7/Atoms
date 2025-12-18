
import React, { useState } from 'react';
import { Atom, EdgeType } from '../types';
import { ATOM_COLORS } from '../constants';

interface EdgeExplorerProps {
  atoms: Atom[];
  onSelectAtom: (atom: Atom) => void;
}

const EdgeExplorer: React.FC<EdgeExplorerProps> = ({ atoms, onSelectAtom }) => {
  const [filter, setFilter] = useState<EdgeType | 'ALL'>('ALL');

  const allEdges = atoms.flatMap(atom => 
    atom.edges.map(edge => ({
      source: atom,
      targetId: edge.targetId,
      type: edge.type,
      description: edge.description
    }))
  ).filter(e => filter === 'ALL' || e.type === filter);

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="p-8 border-b border-slate-800 bg-slate-900/40">
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Dependency & Edge Network</h2>
        <p className="text-slate-400 text-sm max-w-2xl">Global relationship audit. Monitor how atoms trigger, require, or govern one another across the enterprise.</p>
        
        <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === 'ALL' ? 'bg-slate-200 text-slate-900' : 'bg-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            All Relations
          </button>
          {Object.values(EdgeType).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                filter === type ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <table className="w-full text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-[10px] uppercase font-black text-slate-500 tracking-widest px-4">
              <th className="pb-4 pl-4">Source Atom</th>
              <th className="pb-4">Relationship</th>
              <th className="pb-4">Target Reference</th>
              <th className="pb-4">Context</th>
            </tr>
          </thead>
          <tbody>
            {allEdges.map((edge, i) => {
              const targetAtom = atoms.find(a => a.id === edge.targetId);
              return (
                <tr key={i} className="group hover:bg-slate-900/80 transition-all cursor-pointer">
                  <td className="py-4 pl-4 rounded-l-2xl border-y border-l border-slate-800 bg-slate-900/40 group-hover:border-slate-700" onClick={() => onSelectAtom(edge.source)}>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATOM_COLORS[edge.source.type] }} />
                      <div>
                        <div className="text-xs font-bold text-slate-200">{edge.source.name}</div>
                        <div className="text-[9px] mono text-slate-500">{edge.source.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 border-y border-slate-800 bg-slate-900/40 group-hover:border-slate-700">
                    <span className="text-[9px] font-black px-2 py-1 bg-slate-800 rounded border border-slate-700 text-slate-400">
                      {edge.type}
                    </span>
                  </td>
                  <td className="py-4 border-y border-slate-800 bg-slate-900/40 group-hover:border-slate-700" onClick={() => targetAtom && onSelectAtom(targetAtom)}>
                    {targetAtom ? (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATOM_COLORS[targetAtom.type] }} />
                        <div>
                          <div className="text-xs font-bold text-slate-200">{targetAtom.name}</div>
                          <div className="text-[9px] mono text-slate-500">{targetAtom.id}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-red-500 mono text-[10px] uppercase font-bold tracking-tighter bg-red-950/20 px-2 py-1 rounded">Broken Ref: {edge.targetId}</span>
                    )}
                  </td>
                  <td className="py-4 pr-4 rounded-r-2xl border-y border-r border-slate-800 bg-slate-900/40 group-hover:border-slate-700">
                    <span className="text-xs text-slate-500 italic">
                      {edge.description || 'No context metadata provided.'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EdgeExplorer;
