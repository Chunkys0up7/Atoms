
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', backgroundColor: '#f8fafc' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '8px' }}>Impact Control Room</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>Enterprise Simulation Engine: Forecast Atom Reconfigurations and System Cascades.</p>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel: Parameters */}
        <div style={{ width: '380px', borderRight: '1px solid var(--color-border)', backgroundColor: '#f8fafc', padding: 'var(--spacing-lg)', overflowY: 'auto' }}>
          <section style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '12px' }}>1. Select Target</h3>
            <select
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--color-text-primary)',
                outline: 'none'
              }}
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
              <section style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Current Performance</span>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ATOM_COLORS[selectedAtom.type] }}></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Auto Level</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{(selectedAtom.metrics?.automation_level || 0) * 100}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Cycle Time</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{selectedAtom.metrics?.avg_cycle_time_mins || 0}m</div>
                  </div>
                </div>
              </section>

              <section style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '12px' }}>2. Simulation Parameters</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Automation Boost</label>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-primary)' }}>+{automationBoost}%</span>
                    </div>
                    <input
                      type="range"
                      min="0" max="100"
                      value={automationBoost}
                      onChange={(e) => setAutomationBoost(parseInt(e.target.value))}
                      style={{ width: '100%', height: '6px', borderRadius: '4px', cursor: 'pointer' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#ffffff', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Restructure Edges</span>
                    <div style={{ width: '40px', height: '20px', backgroundColor: '#e2e8f0', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: '#94a3b8', borderRadius: '50%', position: 'absolute', left: '4px', top: '4px' }}></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#ffffff', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Strict Compliance Mode</span>
                    <div style={{ width: '40px', height: '20px', backgroundColor: 'var(--color-primary)', borderRadius: '12px', position: 'relative', cursor: 'pointer' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: '#ffffff', borderRadius: '50%', position: 'absolute', right: '4px', top: '4px' }}></div>
                    </div>
                  </div>
                </div>
              </section>

              <button
                onClick={handleRunSimulation}
                disabled={isAnalyzing}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: isAnalyzing ? '#e2e8f0' : 'var(--color-primary)',
                  color: isAnalyzing ? 'var(--color-text-tertiary)' : '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'all 0.2s'
                }}
              >
                {isAnalyzing ? (
                  <div style={{ width: '16px', height: '16px', border: '2px solid var(--color-text-tertiary)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                ) : (
                  <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                Initialize Forecast
              </button>
            </>
          )}
        </div>
        </div>

        {/* Right Panel: Output & Forecast */}
        <div style={{ flex: 1, backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {report ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Dashboard Ribbon */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid var(--color-border)', backgroundColor: '#f8fafc' }}>
                <div style={{ padding: 'var(--spacing-md)', borderRight: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Impact Velocity</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-primary)' }}>FAST CASCADE</div>
                </div>
                <div style={{ padding: 'var(--spacing-md)', borderRight: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Risk Multiplier</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b' }}>1.4x DELTA</div>
                </div>
                <div style={{ padding: 'var(--spacing-md)', borderRight: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Doc Overhead</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#ec4899' }}>8 ATOMS</div>
                </div>
                <div style={{ padding: 'var(--spacing-md)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Rec Decision</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>GO (PHASED)</div>
                </div>
              </div>

              {/* Detailed Markdown Report */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-xl)' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', color: 'var(--color-text-primary)', lineHeight: '1.6' }}>
                  <div dangerouslySetInnerHTML={{ __html: report.replace(/\n/g, '<br/>') }} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              <div style={{ width: '80px', height: '80px', backgroundColor: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--spacing-lg)', position: 'relative' }}>
                <svg style={{ width: '40px', height: '40px', color: 'var(--color-text-tertiary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '12px' }}>Simulation Ready</h3>
              <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', lineHeight: '1.5' }}>Configure the target documentation unit and adjustment parameters on the left to generate a system-wide forecasting report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImpactAnalysisUI;
