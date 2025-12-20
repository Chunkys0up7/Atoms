
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
  const moduleAtoms = atoms.filter(a => activeModule?.atoms?.includes(a.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-md)' }}>
          <span>{activeJourney?.name}</span>
          <span>/</span>
          <span style={{ color: 'var(--color-primary)' }}>{activePhase?.name}</span>
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
          {activeModule ? activeModule.name : 'Select Module'}
        </h2>

        <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--spacing-md)', overflowX: 'auto', paddingBottom: '8px' }}>
          {phaseModules.map(mod => (
            <button
              key={mod.id}
              onClick={() => setSelectedModuleId(mod.id)}
              className="form-button"
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                backgroundColor: selectedModuleId === mod.id ? 'var(--color-primary)' : '#ffffff',
                color: selectedModuleId === mod.id ? '#ffffff' : 'var(--color-text-primary)',
                border: selectedModuleId === mod.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)'
              }}
            >
              {mod.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto content-area">
        <div style={{ padding: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
            <h3 style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '600', color: 'var(--color-text-tertiary)', letterSpacing: '0.5px' }}>Module Composition</h3>
            <span className="badge badge-info">{moduleAtoms.length} Atoms</span>
          </div>

          {moduleAtoms.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {moduleAtoms.map(atom => {
                  const displayTitle = atom.title || atom.name || 'Untitled';
                  const displaySummary = atom.summary || (atom.content && atom.content.summary) || '';
                  return (
                    <tr
                      key={atom.id}
                      onClick={() => onSelectAtom(atom)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '600' }}>{atom.id}</td>
                      <td style={{ fontWeight: '500' }}>{displayTitle}</td>
                      <td><span className="badge badge-info">{atom.type}</span></td>
                      <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-tertiary)' }}>
                        {displaySummary}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
              No atoms found in this module.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModuleExplorer;
