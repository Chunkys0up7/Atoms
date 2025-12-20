
import React, { useState } from 'react';
import { Atom, AtomType } from '../types';
import { generateImpactAnalysis } from '../geminiService';
import { ATOM_COLORS } from '../constants';

interface ImpactAnalysisUIProps {
  atoms: Atom[];
}

const ImpactAnalysisUI: React.FC<ImpactAnalysisUIProps> = ({ atoms }) => {
  const [selectedId, setSelectedId] = useState('');
  const [automationBoost, setAutomationBoost] = useState(50);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const selectedAtom = atoms.find(a => a.id === selectedId);

  const handleRunSimulation = async () => {
    if (!selectedId) return;
    setIsAnalyzing(true);
    setReport(null);
    
    const graphContext = {
      target: selectedAtom,
      neighbors: atoms.filter(a =>
        ((a as any).edges || []).some((e: any) => e.targetId === selectedId) ||
        ((selectedAtom as any)?.edges || []).some((e: any) => e.targetId === a.id)
      )
    };

    const simulationParams = {
      action: "BOOST_AUTOMATION",
      target_boost_percent: automationBoost,
      expected_cycle_reduction: automationBoost * 0.8
    };

    const result = await generateImpactAnalysis(selectedId, graphContext, simulationParams);
    setReport(result || "Simulation failed.");
    setIsAnalyzing(false);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-slate-800 bg-slate-900/40 shrink-0">
        <h2 className="text-3xl font-black text-white tracking-tight mb-2 uppercase">Impact Control Room</h2>
        <p className="text-slate-500 text-sm font-medium">Enterprise Simulation Engine: Forecast Atom Reconfigurations and System Cascades.</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Parameters */}
        <div className="w-[380px] border-r border-slate-800 bg-slate-900/20 p-8 space-y-8 overflow-y-auto custom-scrollbar">
          <section>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">1. Select Target</h3>
            <select 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">-- SYSTEM REGISTRY --</option>
              {atoms.map(a => (
                <option key={a.id} value={a.id}>{a.id} | {(a as any).name || (a as any).title || 'Untitled'}</option>
              ))}
            </select>
          </section>

          {selectedAtom && (
            <>
              <section className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Current Performance</span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ATOM_COLORS[selectedAtom.type] }}></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[9px] text-slate-600 font-black uppercase">Auto Level</div>
                    <div className="text-sm font-bold text-slate-300">{(selectedAtom.metrics?.automation_level || 0) * 100}%</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-600 font-black uppercase">Cycle Time</div>
                    <div className="text-sm font-bold text-slate-300">{selectedAtom.metrics?.avg_cycle_time_mins || 0}m</div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">2. Simulation Parameters</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-bold text-slate-300">Automation Boost</label>
                      <span className="text-xs font-black text-blue-500">+{automationBoost}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={automationBoost}
                      onChange={(e) => setAutomationBoost(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-xs font-bold text-slate-400">Restructure Edges</span>
                    <div className="w-10 h-5 bg-slate-800 rounded-full relative cursor-pointer">
                      <div className="w-3 h-3 bg-slate-600 rounded-full absolute left-1 top-1"></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-xs font-bold text-slate-400">Strict Compliance Mode</span>
                    <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
                      <div className="w-3 h-3 bg-white rounded-full absolute right-1 top-1"></div>
                    </div>
                  </div>
                </div>
              </section>

              <button 
                onClick={handleRunSimulation}
                disabled={isAnalyzing}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3"
              >
                {isAnalyzing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                Initialize Forecast
              </button>
            </>
          )}
        </div>

        {/* Right Panel: Output & Forecast */}
        <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden">
          {report ? (
            <div className="h-full flex flex-col">
              {/* Dashboard Ribbon */}
              <div className="grid grid-cols-4 border-b border-slate-800 divide-x divide-slate-800 bg-slate-900/20 shrink-0">
                <div className="p-6">
                  <div className="text-[9px] font-black text-slate-600 uppercase mb-1">Impact Velocity</div>
                  <div className="text-xl font-black text-blue-500 tracking-tight">FAST CASCADE</div>
                </div>
                <div className="p-6">
                  <div className="text-[9px] font-black text-slate-600 uppercase mb-1">Risk Multiplier</div>
                  <div className="text-xl font-black text-amber-500 tracking-tight">1.4x DELTA</div>
                </div>
                <div className="p-6">
                  <div className="text-[9px] font-black text-slate-600 uppercase mb-1">Doc Overhead</div>
                  <div className="text-xl font-black text-pink-500 tracking-tight">8 ATOMS</div>
                </div>
                <div className="p-6">
                  <div className="text-[9px] font-black text-slate-600 uppercase mb-1">Rec Decision</div>
                  <div className="text-xl font-black text-green-500 tracking-tight">GO (PHASED)</div>
                </div>
              </div>

              {/* Detailed Markdown Report */}
              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                <div className="max-w-4xl mx-auto prose prose-invert prose-blue">
                  <div dangerouslySetInnerHTML={{ __html: report.replace(/\n/g, '<br/>') }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20">
              <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full animate-ping"></div>
                <svg className="w-10 h-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight mb-4">Simulation Ready</h3>
              <p className="text-slate-500 max-w-sm leading-relaxed font-medium">Configure the target documentation unit and adjustment parameters on the left to generate a system-wide forecasting report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImpactAnalysisUI;
