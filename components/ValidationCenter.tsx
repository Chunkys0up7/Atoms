
import React, { useMemo } from 'react';
import { Atom, Module, LintIssue } from '../types';
import { detectCycles, validateEdges, runEnterpriseLinter } from '../graphLogic';

interface ValidationCenterProps {
  atoms: Atom[];
  modules: Module[];
  onFocusAtom: (atom: Atom) => void;
}

const ValidationCenter: React.FC<ValidationCenterProps> = ({ atoms, modules, onFocusAtom }) => {
  const graphIssues = useMemo(() => {
    return [...detectCycles(atoms), ...validateEdges(atoms)];
  }, [atoms]);

  const lintIssues = useMemo(() => {
    return runEnterpriseLinter(atoms, modules);
  }, [atoms, modules]);

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      <div className="p-10 border-b border-slate-800 bg-slate-900/40">
        <h2 className="text-4xl font-black text-white tracking-tight mb-2 uppercase">CI/CD Linter & Health</h2>
        <p className="text-slate-500 text-sm font-medium">Automated Enterprise Checks. Ensuring semantic consistency and graph integrity across {atoms.length} units.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
        {/* Graph Integrity Section */}
        <section>
          <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4">Graph Integrity ({graphIssues.length})</h3>
          <div className="space-y-3">
            {graphIssues.map((issue, i) => (
              <div key={i} className="bg-slate-900 border border-red-500/20 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">{issue.description}</div>
                    <div className="text-[10px] text-slate-500">Severity: {issue.severity}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {issue.affectedAtoms.map(id => (
                    <button key={id} onClick={() => { const a = atoms.find(x => x.id === id); if (a) onFocusAtom(a); }} className="text-[10px] px-2 py-1 bg-slate-800 text-slate-400 rounded-lg hover:text-white">Locate {id}</button>
                  ))}
                </div>
              </div>
            ))}
            {graphIssues.length === 0 && <div className="text-xs text-slate-600 italic">No graph integrity violations detected.</div>}
          </div>
        </section>

        {/* Semantic Linter Section */}
        <section>
          <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mb-4">Enterprise Linter ({lintIssues.length})</h3>
          <div className="grid grid-cols-1 gap-3">
            {lintIssues.map((issue, i) => (
              <div key={i} className={`p-5 rounded-[2rem] border ${issue.severity === 'ERROR' ? 'border-red-500/20 bg-red-950/5' : 'border-amber-500/20 bg-amber-950/5'} group transition-all`}>
                <div className="flex justify-between items-start mb-3">
                   <div className="flex items-center gap-3">
                     <span className={`text-[8px] font-black px-2 py-0.5 rounded ${issue.severity === 'ERROR' ? 'bg-red-500 text-white' : 'bg-amber-500 text-slate-950'}`}>{issue.severity}</span>
                     <span className="text-[10px] font-black text-slate-500 tracking-widest">{issue.category}</span>
                   </div>
                   <span className="mono text-[10px] text-slate-600">{issue.id}</span>
                </div>
                <p className="text-sm font-bold text-slate-200 mb-2">{issue.message}</p>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 italic">
                  <span className="text-blue-400 font-bold mr-2">FIX:</span>{issue.suggestion}
                </div>
                {issue.atomId && (
                   <button onClick={() => { const a = atoms.find(x => x.id === issue.atomId); if (a) onFocusAtom(a); }} className="mt-4 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-400">View Affected Atom</button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ValidationCenter;
