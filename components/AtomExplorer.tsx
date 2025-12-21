
import React, { useState } from 'react';
import { Atom, AtomType, AtomCategory, EdgeType } from '../types';
import { ATOM_COLORS, MOCK_PHASES } from '../constants';

interface AtomExplorerProps {
  atoms: Atom[];
  modules: any[];
  onSelect: (atom: Atom) => void;
}

const AtomExplorer: React.FC<AtomExplorerProps> = ({ atoms, modules, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AtomType | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAtom, setEditingAtom] = useState<Atom | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [currentEdgeTarget, setCurrentEdgeTarget] = useState('');
  const [currentEdgeType, setCurrentEdgeType] = useState<EdgeType>('ENABLES');

  const [newAtom, setNewAtom] = useState({
    id: '',
    category: 'CUSTOMER_FACING' as AtomCategory,
    type: 'PROCESS' as AtomType,
    name: '',
    version: '1.0.0',
    status: 'DRAFT' as 'ACTIVE' | 'DRAFT' | 'DEPRECATED',
    owner: '',
    team: '',
    ontologyDomain: 'Home Lending',
    criticality: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    phaseId: '',
    moduleId: '',
    content: {
      summary: '',
      steps: [] as string[],
    },
    edges: [] as { type: EdgeType; targetId: string }[],
    metrics: {
      automation_level: 0,
      avg_cycle_time_mins: 0,
      error_rate: 0,
      compliance_score: 0
    }
  });

  const handleCreateAtom = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('http://localhost:8000/api/atoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAtom)
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to create atom: ${error.detail || 'Unknown error'}`);
        return;
      }

      alert('Atom created successfully! Refresh the page to see the new atom.');
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      alert(`Failed to create atom: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setNewAtom({
      id: '',
      category: 'CUSTOMER_FACING',
      type: 'PROCESS',
      name: '',
      version: '1.0.0',
      status: 'DRAFT',
      owner: '',
      team: '',
      ontologyDomain: 'Home Lending',
      criticality: 'MEDIUM',
      phaseId: '',
      moduleId: '',
      content: { summary: '', steps: [] },
      edges: [],
      metrics: { automation_level: 0, avg_cycle_time_mins: 0, error_rate: 0, compliance_score: 0 }
    });
    setCurrentStep('');
  };

  const addStep = () => {
    if (currentStep.trim()) {
      setNewAtom({
        ...newAtom,
        content: {
          ...newAtom.content,
          steps: [...newAtom.content.steps, currentStep.trim()]
        }
      });
      setCurrentStep('');
    }
  };

  const removeStep = (index: number) => {
    setNewAtom({
      ...newAtom,
      content: {
        ...newAtom.content,
        steps: newAtom.content.steps.filter((_, i) => i !== index)
      }
    });
  };

  const addEdge = () => {
    if (currentEdgeTarget.trim()) {
      setNewAtom({
        ...newAtom,
        edges: [...newAtom.edges, { type: currentEdgeType, targetId: currentEdgeTarget.trim() }]
      });
      setCurrentEdgeTarget('');
    }
  };

  const removeEdge = (index: number) => {
    setNewAtom({
      ...newAtom,
      edges: newAtom.edges.filter((_, i) => i !== index)
    });
  };

  const filteredAtoms = atoms.filter(atom => {
    const name = atom.name || '';
    const id = atom.id || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || id.toLowerCase().includes(searchTerm.toLowerCase());
    const atomType = typeof atom.type === 'string' ? atom.type.toUpperCase() : String(atom.type).toUpperCase();
    const filterTypeUpper = filterType === 'ALL' ? 'ALL' : (typeof filterType === 'string' ? filterType.toUpperCase() : String(filterType).toUpperCase());
    const matchesType = filterTypeUpper === 'ALL' || atomType === filterTypeUpper;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>Atom Registry</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
              System-wide documentation units
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Total Units
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-primary)' }}>{atoms.length}</div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
              style={{ marginTop: '8px' }}
            >
              + Create Atom
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <input
            type="text"
            placeholder="Search by ID or name..."
            className="form-input"
            style={{ flex: 1 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="form-select"
            style={{ width: '200px' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="ALL">All Types</option>
            <option value="PROCESS">PROCESS</option>
            <option value="DECISION">DECISION</option>
            <option value="GATEWAY">GATEWAY</option>
            <option value="ROLE">ROLE</option>
            <option value="SYSTEM">SYSTEM</option>
            <option value="DOCUMENT">DOCUMENT</option>
            <option value="REGULATION">REGULATION</option>
            <option value="METRIC">METRIC</option>
            <option value="RISK">RISK</option>
            <option value="POLICY">POLICY</option>
            <option value="CONTROL">CONTROL</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto content-area">
        <div style={{ padding: 'var(--spacing-lg)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Category</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAtoms.map(atom => (
                <tr key={atom.id} onClick={() => onSelect(atom)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '600' }}>{atom.id}</td>
                  <td style={{ fontWeight: '500' }}>{atom.name}</td>
                  <td><span className="badge badge-info">{atom.type}</span></td>
                  <td><span className="badge badge-secondary">{atom.category}</span></td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{atom.owner}</td>
                  <td><span className={`badge ${atom.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>{atom.status}</span></td>
                  <td>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingAtom(atom); setShowEditModal(true); }}
                      style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Atom Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '12px',
            padding: 'var(--spacing-xl)', maxWidth: '800px', width: '90%',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: 'var(--spacing-lg)' }}>
              Create New Atom
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                  Atom ID <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newAtom.id}
                  onChange={(e) => setNewAtom({ ...newAtom, id: e.target.value })}
                  placeholder="atom-cust-loan-submit"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                  Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newAtom.name}
                  onChange={(e) => setNewAtom({ ...newAtom, name: e.target.value })}
                  placeholder="Customer Submits Loan Application"
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Category</label>
                <select value={newAtom.category} onChange={(e) => setNewAtom({ ...newAtom, category: e.target.value as AtomCategory })} className="form-input" style={{ width: '100%' }}>
                  <option value="CUSTOMER_FACING">Customer Facing</option>
                  <option value="BACK_OFFICE">Back Office</option>
                  <option value="SYSTEM">System</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Type</label>
                <select value={newAtom.type} onChange={(e) => setNewAtom({ ...newAtom, type: e.target.value as AtomType })} className="form-input" style={{ width: '100%' }}>
                  <option value="PROCESS">Process</option>
                  <option value="DECISION">Decision</option>
                  <option value="GATEWAY">Gateway</option>
                  <option value="ROLE">Role</option>
                  <option value="SYSTEM">System</option>
                  <option value="DOCUMENT">Document</option>
                  <option value="POLICY">Policy</option>
                  <option value="CONTROL">Control</option>
                  <option value="RISK">Risk</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Owner</label>
                <input type="text" value={newAtom.owner} onChange={(e) => setNewAtom({ ...newAtom, owner: e.target.value })} placeholder="Sarah Chen" className="form-input" style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Team</label>
                <input type="text" value={newAtom.team} onChange={(e) => setNewAtom({ ...newAtom, team: e.target.value })} placeholder="Customer Experience" className="form-input" style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Criticality</label>
                <select value={newAtom.criticality} onChange={(e) => setNewAtom({ ...newAtom, criticality: e.target.value as any })} className="form-input" style={{ width: '100%' }}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Phase</label>
                <select value={newAtom.phaseId} onChange={(e) => setNewAtom({ ...newAtom, phaseId: e.target.value })} className="form-input" style={{ width: '100%' }}>
                  <option value="">None</option>
                  {MOCK_PHASES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Module</label>
                <select value={newAtom.moduleId} onChange={(e) => setNewAtom({ ...newAtom, moduleId: e.target.value })} className="form-input" style={{ width: '100%' }}>
                  <option value="">None</option>
                  {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Summary</label>
              <textarea value={newAtom.content.summary} onChange={(e) => setNewAtom({ ...newAtom, content: { ...newAtom.content, summary: e.target.value } })} placeholder="Brief description of what this atom does..." className="form-input" style={{ width: '100%', minHeight: '60px' }} />
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Process Steps</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input type="text" value={currentStep} onChange={(e) => setCurrentStep(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addStep()} placeholder="Add a step..." className="form-input" style={{ flex: 1 }} />
                <button onClick={addStep} className="btn btn-secondary">Add Step</button>
              </div>
              {newAtom.content.steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', backgroundColor: '#f8fafc', borderRadius: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', flex: 1 }}>{i + 1}. {step}</span>
                  <button onClick={() => removeStep(i)} style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Remove</button>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Edges (Relationships)</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select value={currentEdgeType} onChange={(e) => setCurrentEdgeType(e.target.value as EdgeType)} className="form-input" style={{ width: '150px' }}>
                  <option value="ENABLES">ENABLES</option>
                  <option value="DEPENDS_ON">DEPENDS_ON</option>
                  <option value="RELATED_TO">RELATED_TO</option>
                  <option value="PERFORMED_BY">PERFORMED_BY</option>
                  <option value="GOVERNED_BY">GOVERNED_BY</option>
                </select>
                <input type="text" value={currentEdgeTarget} onChange={(e) => setCurrentEdgeTarget(e.target.value)} placeholder="Target atom ID..." className="form-input" style={{ flex: 1 }} />
                <button onClick={addEdge} className="btn btn-secondary">Add Edge</button>
              </div>
              {newAtom.edges.map((edge, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', backgroundColor: '#f8fafc', borderRadius: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-primary)' }}>{edge.type}</span>
                  <span style={{ fontSize: '12px', flex: 1 }}>{edge.targetId}</span>
                  <button onClick={() => removeEdge(i)} style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Remove</button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleCreateAtom} disabled={!newAtom.id || !newAtom.name || isCreating} className="btn btn-primary" style={{ flex: 1 }}>{isCreating ? 'Creating...' : 'Create Atom'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AtomExplorer;
