import React, { useState, useEffect } from 'react';
import { Module, Atom, AtomType, AtomCategory } from '../types';

interface ModuleEditorProps {
  module?: Module | null;
  atoms: Atom[];
  onSave: (module: Module) => void;
  onCancel: () => void;
}

const ModuleEditor: React.FC<ModuleEditorProps> = ({ module, atoms, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    id: module?.id || '',
    name: module?.name || '',
    description: module?.description || '',
    owner: module?.owner || '',
    atoms: module?.atoms || [] as string[],
    phaseId: module?.phaseId || ''
  });

  const [selectedAtoms, setSelectedAtoms] = useState<string[]>(module?.atoms || []);
  const [filterType, setFilterType] = useState<AtomType | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<AtomCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Auto-generate ID from name
  useEffect(() => {
    if (!module && formData.name) {
      const id = 'module-' + formData.name.toLowerCase().replace(/\s+/g, '-');
      setFormData(prev => ({ ...prev, id }));
    }
  }, [formData.name, module]);

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push('Module name is required');
    }

    if (!formData.description.trim()) {
      errors.push('Module description is required');
    }

    if (!formData.owner.trim()) {
      errors.push('Module owner is required');
    }

    if (selectedAtoms.length === 0) {
      errors.push('At least one atom must be selected');
    }

    // Check for circular dependencies
    const selectedAtomObjs = atoms.filter(a => selectedAtoms.includes(a.id));
    const hasCircularDep = selectedAtomObjs.some(atom =>
      atom.edges.some(edge =>
        selectedAtoms.includes(edge.targetId) &&
        edge.type === 'DEPENDS_ON'
      )
    );

    // Check for critical atoms without dependencies
    const criticalAtoms = selectedAtomObjs.filter(a => a.criticality === 'CRITICAL');
    const orphanedCritical = criticalAtoms.filter(atom =>
      !selectedAtomObjs.some(other =>
        other.edges.some(edge => edge.targetId === atom.id)
      )
    );

    if (orphanedCritical.length > 0 && criticalAtoms.length > 1) {
      errors.push(`${orphanedCritical.length} CRITICAL atoms have no incoming dependencies - verify workflow`);
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const moduleData: Module = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      owner: formData.owner,
      atoms: selectedAtoms,
      phaseId: formData.phaseId || undefined
    };

    onSave(moduleData);
  };

  const handleAtomReorder = (atomId: string, direction: 'up' | 'down') => {
    const index = selectedAtoms.indexOf(atomId);
    if (index === -1) return;

    const newOrder = [...selectedAtoms];
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }

    setSelectedAtoms(newOrder);
  };

  // Filter atoms
  const filteredAtoms = atoms.filter(atom => {
    if (selectedAtoms.includes(atom.id)) return false;

    if (filterType !== 'ALL' && atom.type !== filterType) return false;
    if (filterCategory !== 'ALL' && atom.category !== filterCategory) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return atom.id.toLowerCase().includes(query) ||
             atom.name.toLowerCase().includes(query);
    }

    return true;
  });

  const selectedAtomObjects = atoms.filter(a => selectedAtoms.includes(a.id));

  // Calculate module metrics
  const avgAutomation = selectedAtomObjects.length > 0
    ? selectedAtomObjects.reduce((sum, a) => sum + (a.metrics?.automation_level || 0), 0) / selectedAtomObjects.length
    : 0;

  const criticalCount = selectedAtomObjects.filter(a => a.criticality === 'CRITICAL').length;
  const highCount = selectedAtomObjects.filter(a => a.criticality === 'HIGH').length;

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
        maxWidth: '1200px',
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
                {module ? 'Edit Module' : 'Create New Module'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Group related atoms into reusable workflow patterns
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
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex' }}>
          {/* Left Panel - Configuration */}
          <div style={{ width: '50%', padding: 'var(--spacing-xl)', borderRight: '1px solid var(--color-border)' }}>
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

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Module Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Income Verification"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Module ID
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="Auto-generated from name"
                  className="form-input"
                  style={{ width: '100%', backgroundColor: '#f8fafc' }}
                  disabled={!!module}
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the purpose and workflow of this module..."
                  className="form-input"
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  Owner *
                </label>
                <input
                  type="text"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="e.g., Processing Lead"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Selected Atoms */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-md)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Selected Atoms ({selectedAtoms.length})
              </h3>

              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                {selectedAtomObjects.map((atom, index) => (
                  <div
                    key={atom.id}
                    style={{
                      padding: 'var(--spacing-sm)',
                      borderBottom: index < selectedAtomObjects.length - 1 ? '1px solid var(--color-border)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {/* Order Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button
                        onClick={() => handleAtomReorder(atom.id, 'up')}
                        disabled={index === 0}
                        style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: '3px',
                          padding: '2px',
                          backgroundColor: index === 0 ? '#f8fafc' : '#ffffff',
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleAtomReorder(atom.id, 'down')}
                        disabled={index === selectedAtoms.length - 1}
                        style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: '3px',
                          padding: '2px',
                          backgroundColor: index === selectedAtoms.length - 1 ? '#f8fafc' : '#ffffff',
                          cursor: index === selectedAtoms.length - 1 ? 'not-allowed' : 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        ▼
                      </button>
                    </div>

                    {/* Atom Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                        {index + 1}. {atom.name}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                        {atom.id} • {atom.type}
                      </div>
                    </div>

                    {/* Badges */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span className="badge" style={{ fontSize: '9px' }}>
                        {atom.category}
                      </span>
                      {(atom.criticality === 'CRITICAL' || atom.criticality === 'HIGH') && (
                        <span className="badge" style={{
                          fontSize: '9px',
                          backgroundColor: atom.criticality === 'CRITICAL' ? '#ef4444' : '#f59e0b'
                        }}>
                          {atom.criticality}
                        </span>
                      )}
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => setSelectedAtoms(prev => prev.filter(id => id !== atom.id))}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#ef4444'
                      }}
                    >
                      <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                {selectedAtoms.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: 'var(--spacing-lg)',
                    color: 'var(--color-text-tertiary)',
                    fontSize: '12px'
                  }}>
                    No atoms selected. Select atoms from the right panel.
                  </div>
                )}
              </div>
            </div>

            {/* Module Metrics */}
            {selectedAtoms.length > 0 && (
              <div style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: 'var(--spacing-md)'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-sm)' }}>
                  Module Metrics
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)', fontSize: '11px' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Avg Automation:</span>
                    <span style={{ fontWeight: '600', marginLeft: '4px' }}>{Math.round(avgAutomation * 100)}%</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Critical:</span>
                    <span style={{ fontWeight: '600', marginLeft: '4px', color: '#ef4444' }}>{criticalCount}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>High:</span>
                    <span style={{ fontWeight: '600', marginLeft: '4px', color: '#f59e0b' }}>{highCount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Atom Selection */}
          <div style={{ width: '50%', padding: 'var(--spacing-xl)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-md)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Available Atoms
            </h3>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
              <input
                type="text"
                placeholder="Search atoms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ flex: 1, fontSize: '12px' }}
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="form-input"
                style={{ fontSize: '12px' }}
              >
                <option value="ALL">All Types</option>
                {Object.values(AtomType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="form-input"
                style={{ fontSize: '12px' }}
              >
                <option value="ALL">All Categories</option>
                {Object.values(AtomCategory).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Atom List */}
            <div style={{ maxHeight: 'calc(100% - 100px)', overflowY: 'auto' }}>
              {filteredAtoms.map(atom => (
                <div
                  key={atom.id}
                  onClick={() => setSelectedAtoms(prev => [...prev, atom.id])}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    padding: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: '#ffffff'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                      {atom.name}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAtoms(prev => [...prev, atom.id]);
                      }}
                      style={{
                        border: '1px solid var(--color-primary)',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        backgroundColor: '#ffffff',
                        color: 'var(--color-primary)',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      + Add
                    </button>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                    {atom.id}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <span className="badge" style={{ fontSize: '9px' }}>{atom.type}</span>
                    <span className="badge" style={{ fontSize: '9px' }}>{atom.category}</span>
                    <span className="badge" style={{ fontSize: '9px' }}>{atom.criticality}</span>
                  </div>
                </div>
              ))}

              {filteredAtoms.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: 'var(--spacing-xl)',
                  color: 'var(--color-text-tertiary)',
                  fontSize: '12px'
                }}>
                  No atoms match current filters
                </div>
              )}
            </div>
          </div>
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
            * Required fields • {selectedAtoms.length} atoms selected
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <button onClick={onCancel} className="btn">
              Cancel
            </button>
            <button onClick={handleSave} className="btn btn-primary">
              {module ? 'Update Module' : 'Create Module'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleEditor;
