
import React, { useMemo } from 'react';
import { Atom, ValidationIssue } from '../types';
import { detectCycles, validateEdges } from '../graphLogic';

interface ValidationCenterProps {
  atoms: Atom[];
  onFocusAtom: (atom: Atom) => void;
}

const ValidationCenter: React.FC<ValidationCenterProps> = ({ atoms, onFocusAtom }) => {
  const issues = useMemo(() => {
    const cycles = detectCycles(atoms);
    const rules = validateEdges(atoms);
    return [...cycles, ...rules];
  }, [atoms]);

  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="p-10 border-b border-slate-800 bg-slate-900/40">
        <h2 className="text-4xl font-black text-white tracking-tight mb-2">Graph Integrity Monitor</h2>
        <p className="text-slate-500 text-sm font-medium">Week 1 Hardened Validation. Detecting circular dependencies and transactional sync errors.</p>
        
        <div className="flex gap-6 mt-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex-1">
            <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Critical Blockers</div>
            <div className="text-4xl font-black text-white">{criticalCount}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex-1">
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">System Warnings</div>
            <div className="text-4xl font-black text-white">{warningCount}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex-1">
            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Network Health</div>
            <div className="text-4xl font-black text-white">{issues.length === 0 ? '100%' : 'Lacking'}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 space-y-4">
        {issues.length > 0 ? (
          issues.map((issue, idx) => (
            <div 
              key={idx} 
              className={`p-6 rounded-3xl border ${
                issue.severity === 'CRITICAL' 
                  ? 'bg-red-950/10 border-red-500/30' 
                  : 'bg-amber-950/10 border-amber-500/30'
              } flex items-center justify-between group hover:scale-[1.01] transition-all`}
            >
              <div className="flex items-center gap-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  issue.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                }`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{issue.type} Error</div>
                  <p className="text-slate-200 font-bold">{issue.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {issue.affectedAtoms.map(id => (
                  <button
                    key={id}
                    onClick={() => {
                      const atom = atoms.find(a => a.id === id);
                      if (atom) onFocusAtom(atom);
                    }}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black text-slate-400 hover:text-white transition-colors"
                  >
                    Locate {id}
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-20 opacity-40">
            <svg className="w-20 h-20 text-green-500 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-2xl font-black text-white">Graph is Valid</h3>
            <p className="text-slate-500 max-w-sm mt-2">All atomic transactions are verified and no circular dependencies were detected.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidationCenter;
