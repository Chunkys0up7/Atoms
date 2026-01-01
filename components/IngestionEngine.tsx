
import React, { useState } from 'react';
import { parseDocumentToGraph, verifyAtomDeduplication } from '../aiService';
import { Atom, Module, AtomType, Criticality } from '../types';
import { ATOM_COLORS } from '../constants';

interface IngestionEngineProps {
  atoms: Atom[];
  onIngest: (data: { atoms: Atom[], module: Module }) => void;
}

const IngestionEngine: React.FC<IngestionEngineProps> = ({ atoms: existingAtoms, onIngest }) => {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stagingData, setStagingData] = useState<{ proposedAtoms: any[], proposedModule: any, reuseStats?: any } | null>(null);
  const [deduplicationWarnings, setDeduplicationWarnings] = useState<string[]>([]);

  const handleStartAnalysis = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setError(null);
    setDeduplicationWarnings([]);

    try {
      const result = await parseDocumentToGraph(text, existingAtoms);

      // Verify AI's deduplication decisions with semantic similarity check
      const verification = await verifyAtomDeduplication(result.proposedAtoms, existingAtoms);
      if (!verification.verified) {
        setDeduplicationWarnings(verification.warnings);
      }

      setStagingData(result);
    } catch (err) {
      setError("Deduplication analysis failed. Please check content for complex formatting.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!stagingData) return;
    
    const formattedAtoms: Atom[] = stagingData.proposedAtoms.map(pa => ({
      ...pa,
      version: "1.0.0",
      status: "ACTIVE",
      owner: "ai_ingested",
      team: "unassigned",
      criticality: "MEDIUM" as Criticality,
      metrics: { automation_level: 0.1, avg_cycle_time_mins: 15, error_rate: 0.05, compliance_score: 1.0 }
    }));

    const formattedModule: Module = {
      ...stagingData.proposedModule,
      type: "BPM_WORKFLOW",
      owner: "ai_ingested",
      description: "Auto-generated from documentation source."
    };

    onIngest({ atoms: formattedAtoms, module: formattedModule });
    setStagingData(null);
    setText('');
  };

  if (stagingData) {
    const newCount = stagingData.proposedAtoms.filter(a => a.isNew).length;
    const reusedCount = stagingData.proposedAtoms.filter(a => !a.isNew).length;
    const reusePercentage = stagingData.reuseStats?.reusePercentage || 0;

    return (
      <div className="p-12 flex flex-col h-full bg-white overflow-hidden">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Verify System Changes</h2>
            <p className="text-gray-600 mt-2">
              AI resolved concepts. Please verify new vs reused nodes before syncing to Graph DB.
              {stagingData.reuseStats && (
                <span className="ml-2 text-sm font-bold" style={{ color: reusePercentage >= 70 ? '#10b981' : reusePercentage >= 50 ? '#f59e0b' : '#ef4444' }}>
                  Reuse Rate: {reusePercentage.toFixed(0)}%
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setStagingData(null)}
              className="px-6 py-3 rounded-2xl bg-white border border-gray-300 text-gray-700 font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-8 py-3 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-500 shadow-lg transition-all"
            >
              Commit & Sync Graph
            </button>
          </div>
        </div>

        {/* Deduplication Warnings */}
        {deduplicationWarnings.length > 0 && (
          <div className="mb-6 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-2xl">
            <div className="flex items-start gap-3 mb-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-black text-yellow-900 uppercase mb-2">Potential Duplicate Atoms Detected</h3>
                <p className="text-xs text-yellow-800 mb-3">
                  Our semantic similarity check found {deduplicationWarnings.length} atom{deduplicationWarnings.length > 1 ? 's' : ''} that may be duplicates of existing atoms. Consider reviewing these before committing.
                </p>
                <div className="space-y-2">
                  {deduplicationWarnings.map((warning, idx) => (
                    <div key={idx} className="text-xs text-yellow-900 bg-yellow-100 p-3 rounded-lg">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 grid grid-cols-3 gap-8 overflow-hidden">
          <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] sticky top-0 bg-white py-2">
              New Atoms Detected ({newCount})
            </h3>
            {stagingData.proposedAtoms.filter(a => a.isNew).map((atom, i) => {
              const displayTitle = atom.title || atom.name || 'Untitled';
              const displaySummary = atom.summary || (atom.content && atom.content.summary) || '';
              return (
                <div key={i} className="bg-white border border-gray-300 p-5 rounded-3xl border-l-4 border-l-emerald-500 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="mono text-[10px] text-gray-600 font-bold">{atom.id}</span>
                    <span className="text-[9px] font-black uppercase text-gray-500">{atom.type}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{displayTitle}</h4>
                  <p className="text-[11px] text-gray-600 leading-relaxed">{displaySummary}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
            <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] sticky top-0 bg-white py-2">
              Canonical Links (Reused) ({reusedCount})
            </h3>
            {stagingData.proposedAtoms.filter(a => !a.isNew).map((atom, i) => {
              const displayTitle = atom.title || atom.name || 'Untitled';
              return (
                <div key={i} className="bg-gray-50 border border-gray-300 p-5 rounded-3xl opacity-80">
                  <div className="flex justify-between items-center mb-2">
                    <span className="mono text-[10px] text-blue-600 font-bold">{atom.id}</span>
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span className="text-[9px] font-black uppercase text-gray-600">REUSED</span>
                    </div>
                  </div>
                  <h4 className="font-bold text-gray-700 mb-1">{displayTitle}</h4>
                  <p className="text-[10px] text-gray-600 italic">
                    {atom.reuseReason || 'Atom already exists in Global Registry. Relationships will be updated.'}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-4">
             <h3 className="text-[10px] font-black text-purple-600 uppercase tracking-[0.2em] py-2">
              Module Structure
            </h3>
            <div className="bg-white border border-gray-300 p-8 rounded-[2.5rem] shadow-lg">
               <div className="text-[10px] font-black text-gray-600 uppercase mb-2">Module Identified</div>
               <h4 className="text-2xl font-black text-gray-900 tracking-tight mb-6">{stagingData.proposedModule.name}</h4>

               <div className="space-y-6">
                 <div>
                    <div className="text-[9px] font-black text-gray-600 uppercase mb-3">Phase Sequences</div>
                    <div className="flex flex-wrap gap-2">
                      {stagingData.proposedModule.phases.map((p: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-gray-700 px-3 py-1 bg-gray-100 rounded-full border border-gray-300">{p}</span>
                          {i < stagingData.proposedModule.phases.length - 1 && <span className="text-gray-400">→</span>}
                        </div>
                      ))}
                    </div>
                 </div>
                 <div className="pt-6 border-t border-gray-200">
                    <div className="text-[9px] font-black text-gray-600 uppercase mb-3">Relationship Map</div>
                    <div className="text-xs text-gray-700 leading-loose">
                       {stagingData.proposedAtoms.flatMap(a => a.edges || []).length} total graph edges inferred from text structure.
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-12 flex flex-col items-center justify-center h-full bg-white">
      <div className="w-full max-w-4xl flex flex-col">
        <div className="flex items-center gap-6 mb-12">
          <div className="w-20 h-20 bg-blue-50 border border-blue-300 rounded-3xl flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <h2 className="text-4xl font-black mb-2 tracking-tight text-gray-900 uppercase">Ingestion Engine</h2>
            <p className="text-gray-600 text-lg">Atomize enterprise documentation. AI handles concept resolution and graph mapping.</p>
          </div>
        </div>

        <div className="bg-white border border-gray-300 rounded-[2.5rem] p-8 shadow-lg">
          <textarea
            className="w-full h-80 bg-white border border-gray-300 rounded-2xl p-6 text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-6 placeholder:text-gray-400 font-medium"
            placeholder="Paste document content... (e.g. Loan Origination SOP)"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-xl text-red-700 text-sm font-bold flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-xs font-bold text-gray-600">
               <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> Deduplication ON</span>
               <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> LLM Parser Active</span>
            </div>

            <button
              onClick={handleStartAnalysis}
              disabled={isProcessing || !text.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg flex items-center gap-4"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Analyzing Structure...
                </>
              ) : (
                <>
                  Review & Atomize
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IngestionEngine;
