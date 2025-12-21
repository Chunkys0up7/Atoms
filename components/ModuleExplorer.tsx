
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [atomSearchTerm, setAtomSearchTerm] = useState('');

  const [newModule, setNewModule] = useState({
    id: '',
    name: '',
    description: '',
    owner: '',
    phaseId: MOCK_PHASES[0]?.id || '',
    atoms: [] as string[]
  });

  const handleCreateModule = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('http://localhost:8000/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newModule)
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to create module: ${error.detail || 'Unknown error'}`);
        return;
      }

      alert('Module created successfully! Refresh the page to see the new module.');
      setShowCreateModal(false);
      setNewModule({ id: '', name: '', description: '', owner: '', phaseId: MOCK_PHASES[0]?.id || '', atoms: [] });
      setAtomSearchTerm('');
    } catch (error) {
      alert(`Failed to create module: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleAtomInModule = (atomId: string) => {
    if (newModule.atoms.includes(atomId)) {
      setNewModule({
        ...newModule,
        atoms: newModule.atoms.filter(id => id !== atomId)
      });
    } else {
      setNewModule({
        ...newModule,
        atoms: [...newModule.atoms, atomId]
      });
    }
  };

  const activeJourney = MOCK_JOURNEYS.find(j => j.id === selectedJourneyId);
  const activePhase = MOCK_PHASES.find(p => p.id === selectedPhaseId);
  const activeModule = modules.find(m => m.id === selectedModuleId);

  const phaseModules = modules.filter(m => m.phaseId === selectedPhaseId);
  const moduleAtoms = atoms.filter(a => activeModule?.atoms?.includes(a.id));

  const availableAtoms = atoms.filter(atom =>
    !newModule.atoms.includes(atom.id) &&
    (atomSearchTerm === '' ||
     atom.id.toLowerCase().includes(atomSearchTerm.toLowerCase()) ||
     atom.name.toLowerCase().includes(atomSearchTerm.toLowerCase()))
  ).slice(0, 50);

  const selectedAtoms = atoms.filter(a => newModule.atoms.includes(a.id));

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
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              border: '1px solid var(--color-primary)'
            }}
          >
            + Create Module
          </button>
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

      {/* Create Module Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: 'var(--spacing-xl)',
            maxWidth: '900px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-md)' }}>
              Create New Module
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Module ID <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newModule.id}
                  onChange={(e) => setNewModule({ ...newModule, id: e.target.value })}
                  placeholder="module-credit-analysis"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Module Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newModule.name}
                  onChange={(e) => setNewModule({ ...newModule, name: e.target.value })}
                  placeholder="Credit Analysis"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Phase
                </label>
                <select
                  value={newModule.phaseId}
                  onChange={(e) => setNewModule({ ...newModule, phaseId: e.target.value })}
                  className="form-input"
                  style={{ width: '100%' }}
                >
                  {MOCK_PHASES.map(phase => (
                    <option key={phase.id} value={phase.id}>{phase.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Owner
                </label>
                <input
                  type="text"
                  value={newModule.owner}
                  onChange={(e) => setNewModule({ ...newModule, owner: e.target.value })}
                  placeholder="Loan Origination"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                value={newModule.description}
                onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                placeholder="Describe the purpose of this module..."
                className="form-input"
                style={{ width: '100%', minHeight: '60px', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Compose Module from Atoms ({newModule.atoms.length} selected)
              </label>

              {/* Selected Atoms */}
              {selectedAtoms.length > 0 && (
                <div style={{ marginBottom: 'var(--spacing-sm)', maxHeight: '150px', overflowY: 'auto', backgroundColor: '#f8fafc', borderRadius: '8px', padding: 'var(--spacing-sm)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '6px' }}>SELECTED ATOMS</div>
                  {selectedAtoms.map(atom => (
                    <div key={atom.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', backgroundColor: '#ffffff', borderRadius: '4px', marginBottom: '4px', border: '1px solid var(--color-border)' }}>
                      <div>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '600', marginRight: '8px' }}>{atom.id}</span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{atom.name}</span>
                      </div>
                      <button onClick={() => toggleAtomInModule(atom.id)} style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Remove</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search and Select Atoms */}
              <input
                type="text"
                value={atomSearchTerm}
                onChange={(e) => setAtomSearchTerm(e.target.value)}
                placeholder="Search atoms to add to module..."
                className="form-input"
                style={{ width: '100%', marginBottom: '8px' }}
              />

              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', padding: 'var(--spacing-sm)' }}>
                {availableAtoms.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', color: 'var(--color-text-tertiary)', fontSize: '12px' }}>
                    {atomSearchTerm ? 'No matching atoms found' : 'All atoms selected'}
                  </div>
                )}
                {availableAtoms.map(atom => (
                  <div
                    key={atom.id}
                    onClick={() => toggleAtomInModule(atom.id)}
                    style={{
                      padding: '8px',
                      marginBottom: '4px',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '600', color: 'var(--color-primary)' }}>{atom.id}</span>
                        <span className="badge badge-info" style={{ fontSize: '9px', padding: '2px 6px' }}>{atom.type}</span>
                        <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '2px 6px' }}>{atom.category}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleAtomInModule(atom.id); }}
                        style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: 'var(--color-primary)', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        + Add
                      </button>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '500', marginBottom: '2px' }}>{atom.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{atom.content?.summary || 'No summary'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewModule({ id: '', name: '', description: '', owner: '', phaseId: MOCK_PHASES[0]?.id || '', atoms: [] });
                  setAtomSearchTerm('');
                }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateModule}
                disabled={!newModule.id || !newModule.name || newModule.atoms.length === 0 || isCreating}
                style={{ flex: 1 }}
              >
                {isCreating ? 'Creating...' : `Create Module (${newModule.atoms.length} atoms)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleExplorer;
