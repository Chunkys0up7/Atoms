import React, { useState, useEffect } from 'react';
import { Journey, Phase, Module, Atom } from '../../../types';

interface JourneyEditorProps {
  journey?: Journey | null;
  phases: Phase[];
  modules: Module[];
  atoms: Atom[];
  onSave: (journey: Journey) => void;
  onCancel: () => void;
}

const JourneyEditor: React.FC<JourneyEditorProps> = ({
  journey,
  phases,
  modules,
  atoms,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    id: journey?.id || '',
    name: journey?.name || '',
    description: journey?.description || '',
    phases: journey?.phases || [] as string[]
  });

  const [selectedPhases, setSelectedPhases] = useState<string[]>(journey?.phases || []);
  const [newPhase, setNewPhase] = useState({
    name: '',
    description: '',
    targetDurationDays: 5,
    modules: [] as string[]
  });
  const [showPhaseBuilder, setShowPhaseBuilder] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Auto-generate ID from name
  useEffect(() => {
    if (!journey && formData.name) {
      const id = 'journey-' + formData.name.toLowerCase().replace(/\s+/g, '-');
      setFormData(prev => ({ ...prev, id }));
    }
  }, [formData.name, journey]);

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push('Journey name is required');
    }

    if (!formData.description.trim()) {
      errors.push('Journey description is required');
    }

    if (selectedPhases.length === 0) {
      errors.push('At least one phase must be selected');
    }

    // Validate phase ordering and dependencies
    const phaseObjs = phases.filter(p => selectedPhases.includes(p.id));
    const totalDuration = phaseObjs.reduce((sum, p) => sum + p.targetDurationDays, 0);

    if (totalDuration > 90) {
      errors.push(`Total journey duration (${totalDuration} days) exceeds recommended 90-day limit`);
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const journeyData: Journey = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      phases: selectedPhases
    };

    onSave(journeyData);
  };

  const handleAddPhase = () => {
    if (!newPhase.name.trim()) return;

    const phaseId = 'phase-' + newPhase.name.toLowerCase().replace(/\s+/g, '-');
    const phase: Phase = {
      id: phaseId,
      name: newPhase.name,
      description: newPhase.description,
      modules: newPhase.modules,
      targetDurationDays: newPhase.targetDurationDays,
      journeyId: formData.id
    };

    // In production, this would call an API to create the phase
    setSelectedPhases(prev => [...prev, phaseId]);
    setNewPhase({
      name: '',
      description: '',
      targetDurationDays: 5,
      modules: []
    });
    setShowPhaseBuilder(false);
  };

  const handlePhaseReorder = (phaseId: string, direction: 'up' | 'down') => {
    const index = selectedPhases.indexOf(phaseId);
    if (index === -1) return;

    const newOrder = [...selectedPhases];
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }

    setSelectedPhases(newOrder);
  };

  const selectedPhaseObjects = phases.filter(p => selectedPhases.includes(p.id));
  const availablePhases = phases.filter(p => !selectedPhases.includes(p.id));

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: 'var(--spacing-xl)',
          borderBottom: '2px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-tertiary)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                {journey ? 'Edit Journey' : 'Create New Journey'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Design end-to-end business processes with phases and workflows
              </p>
            </div>
            <button onClick={onCancel} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}>
              <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-xl)' }}>
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-lg)'
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626', marginBottom: '6px' }}>
                Validation Errors
              </div>
              <ul style={{ fontSize: '12px', color: '#991b1b', paddingLeft: '20px', margin: 0 }}>
                {validationErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Basic Information */}
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-md)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Basic Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Journey Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Purchase Loan Journey"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Journey ID
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="Auto-generated from name"
                  className="form-input"
                  style={{ width: '100%', backgroundColor: '#f8fafc' }}
                  disabled={!!journey}
                />
              </div>
            </div>

            <div style={{ marginTop: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose and scope of this journey..."
                className="form-input"
                style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Phase Configuration */}
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Phase Sequence ({selectedPhases.length})
              </h3>
              <button
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={() => setShowPhaseBuilder(true)}
              >
                <svg style={{ width: '12px', height: '12px', marginRight: '4px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Phase
              </button>
            </div>

            {/* Selected Phases with Ordering */}
            {selectedPhaseObjects.map((phase, index) => {
              const phaseModules = modules.filter(m => phase.modules.includes(m.id));
              return (
                <div
                  key={phase.id}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-md)',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
                    {/* Order Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button
                        onClick={() => handlePhaseReorder(phase.id, 'up')}
                        disabled={index === 0}
                        style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: '4px',
                          padding: '4px',
                          backgroundColor: index === 0 ? '#f8fafc' : '#ffffff',
                          cursor: index === 0 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handlePhaseReorder(phase.id, 'down')}
                        disabled={index === selectedPhases.length - 1}
                        style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: '4px',
                          padding: '4px',
                          backgroundColor: index === selectedPhases.length - 1 ? '#f8fafc' : '#ffffff',
                          cursor: index === selectedPhases.length - 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Phase Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '700',
                          color: 'var(--color-primary)',
                          minWidth: '24px'
                        }}>
                          {index + 1}.
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                          {phase.name}
                        </span>
                        <span className="badge" style={{ fontSize: '9px', backgroundColor: '#f59e0b' }}>
                          {phase.targetDurationDays}d SLA
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '32px', marginBottom: '6px' }}>
                        {phase.description}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginLeft: '32px' }}>
                        {phaseModules.length} modules • {phase.modules.length} total items
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => setSelectedPhases(prev => prev.filter(id => id !== phase.id))}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#ef4444'
                      }}
                    >
                      <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}

            {selectedPhases.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: 'var(--spacing-xl)',
                color: 'var(--color-text-tertiary)',
                fontSize: '13px'
              }}>
                No phases selected. Add phases from available phases or create new ones.
              </div>
            )}

            {/* Available Phases */}
            {availablePhases.length > 0 && (
              <div style={{ marginTop: 'var(--spacing-lg)' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-sm)' }}>
                  Available Phases
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                  {availablePhases.map(phase => (
                    <button
                      key={phase.id}
                      onClick={() => setSelectedPhases(prev => [...prev, phase.id])}
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {phase.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Journey Metrics Summary */}
          {selectedPhases.length > 0 && (
            <div style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: 'var(--spacing-lg)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-md)' }}>
                Journey Metrics
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-lg)' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-primary)' }}>
                    {selectedPhases.length}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    Phases
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>
                    {selectedPhaseObjects.reduce((sum, p) => sum + p.modules.length, 0)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    Total Modules
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>
                    {selectedPhaseObjects.reduce((sum, p) => sum + p.targetDurationDays, 0)}d
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    Target Duration
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#8b5cf6' }}>
                    {atoms.filter(a => selectedPhaseObjects.some(p => p.id === a.phaseId)).length}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    Total Atoms
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: 'var(--spacing-lg)',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            * Required fields
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <button onClick={onCancel} className="btn">
              Cancel
            </button>
            <button onClick={handleSave} className="btn btn-primary">
              {journey ? 'Update Journey' : 'Create Journey'}
            </button>
          </div>
        </div>

        {/* Phase Builder Modal */}
        {showPhaseBuilder && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: 'var(--spacing-xl)',
            boxShadow: 'var(--shadow-xl)',
            width: '500px',
            zIndex: 3000
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: 'var(--spacing-md)' }}>
              Create New Phase
            </h3>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                Phase Name
              </label>
              <input
                type="text"
                value={newPhase.name}
                onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
                placeholder="e.g., Processing"
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                value={newPhase.description}
                onChange={(e) => setNewPhase({ ...newPhase, description: e.target.value })}
                placeholder="Describe this phase..."
                className="form-input"
                style={{ width: '100%', minHeight: '60px' }}
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                Target Duration (days)
              </label>
              <input
                type="number"
                value={newPhase.targetDurationDays}
                onChange={(e) => setNewPhase({ ...newPhase, targetDurationDays: parseInt(e.target.value) || 0 })}
                min="1"
                className="form-input"
                style={{ width: '120px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPhaseBuilder(false)} className="btn">
                Cancel
              </button>
              <button onClick={handleAddPhase} className="btn btn-primary">
                Add Phase
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JourneyEditor;
