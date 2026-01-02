
import React, { useState, useEffect } from 'react';
import { Atom, Module } from '../../../types';

interface ModuleGitStatus {
  module_id: string;
  file_path: string;
  status: string;
  last_commit_hash?: string;
  last_commit_date?: string;
  last_commit_author?: string;
  last_commit_message?: string;
  is_recently_changed: boolean;
  days_since_commit?: number;
}

interface ModuleExplorerProps {
  modules: Module[];
  atoms: Atom[];
  onSelectAtom: (atom: Atom) => void;
  onNavigateToGraph?: (moduleId: string) => void;
}

const ModuleExplorer: React.FC<ModuleExplorerProps> = ({
  modules,
  atoms,
  onSelectAtom,
  onNavigateToGraph
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterWorkflowType, setFilterWorkflowType] = useState<string>('ALL');
  const [filterCriticality, setFilterCriticality] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedModuleForDetail, setSelectedModuleForDetail] = useState<Module | null>(null);
  const [gitStatuses, setGitStatuses] = useState<Map<string, ModuleGitStatus>>(new Map());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [atomSearchTerm, setAtomSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newModule, setNewModule] = useState({
    id: '',
    name: '',
    description: '',
    owner: '',
    type: 'business',
    atoms: [] as string[]
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<any>(null);
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [reviewerRole, setReviewerRole] = useState('');
  const [approvalComments, setApprovalComments] = useState('');
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // Fetch git status for all modules
  useEffect(() => {
    let hasLoggedError = false;

    const fetchGitStatuses = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/git/modules/status', {
          signal: AbortSignal.timeout(5000), // Reduced timeout from 10s to 5s
        });

        if (response.ok) {
          const statuses: ModuleGitStatus[] = await response.json();
          if (statuses && statuses.length > 0) {
            const statusMap = new Map(statuses.map(s => [s.module_id, s]));
            setGitStatuses(statusMap);
          }
        }
      } catch (error) {
        // Only log the first error to avoid console spam
        if (!hasLoggedError) {
          console.warn('[ModuleExplorer] Git status API unavailable (this is normal if backend is not running)');
          hasLoggedError = true;
        }
      }
    };

    fetchGitStatuses();
    // Only retry every 60 seconds instead of 30 to reduce network load
    const interval = setInterval(fetchGitStatuses, 60000);
    return () => clearInterval(interval);
  }, []);

  // Render git status badge
  const renderGitStatusBadge = (moduleId: string) => {
    const gitStatus = gitStatuses.get(moduleId);

    if (!gitStatus) {
      return (
        <span
          className="badge"
          style={{ fontSize: '10px', backgroundColor: '#9ca3af', color: '#fff', cursor: 'help' }}
          title="Git status unknown"
        >
          Unknown
        </span>
      );
    }

    let tooltip = '';
    let config = { label: '', color: '', icon: '' };

    if (gitStatus.status === 'new') {
      config = { label: 'New', color: '#10b981', icon: '+' };
      tooltip = 'New module file not yet committed to git';
    } else if (gitStatus.status === 'modified') {
      config = { label: 'Modified', color: '#f59e0b', icon: '~' };
      tooltip = `Modified ${gitStatus.days_since_commit} day(s) ago by ${gitStatus.last_commit_author}`;
    } else if (gitStatus.status === 'committed') {
      if (gitStatus.is_recently_changed) {
        config = { label: `${gitStatus.days_since_commit}d ago`, color: '#3b82f6', icon: '✓' };
        tooltip = `Committed ${gitStatus.days_since_commit} day(s) ago by ${gitStatus.last_commit_author}`;
      } else {
        config = { label: 'Committed', color: '#6b7280', icon: '✓' };
        tooltip = `Committed ${gitStatus.days_since_commit} day(s) ago`;
      }
    }

    return (
      <span
        className="badge"
        style={{
          fontSize: '10px',
          backgroundColor: config.color,
          color: '#fff',
          cursor: 'help'
        }}
        title={tooltip}
      >
        {config.icon} {config.label}
      </span>
    );
  };

  // Render approval status badge
  const renderApprovalBadge = (module: Module) => {
    const status = (module as any)._raw?.metadata?.status || 'draft';

    const statusConfig: Record<string, { label: string; color: string; tooltip: string }> = {
      draft: {
        label: 'Draft',
        color: '#9ca3af',
        tooltip: 'Module is in draft state - not yet ready for review'
      },
      pending: {
        label: 'Pending Review',
        color: '#f59e0b',
        tooltip: 'Module is pending approval review'
      },
      approved: {
        label: 'Approved',
        color: '#10b981',
        tooltip: 'Module has been approved for use'
      },
      deprecated: {
        label: 'Deprecated',
        color: '#ef4444',
        tooltip: 'Module is deprecated and should not be used for new work'
      }
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig.draft;

    return (
      <span
        className="badge"
        style={{
          fontSize: '10px',
          backgroundColor: config.color,
          color: '#fff',
          cursor: 'help'
        }}
        title={config.tooltip}
      >
        {config.label}
      </span>
    );
  };

  // Render criticality badge
  const renderCriticalityBadge = (module: Module) => {
    const criticality = (module as any)._raw?.metadata?.criticality;
    if (!criticality) return null;

    const criticalityConfig: Record<string, { color: string; tooltip: string }> = {
      critical: {
        color: '#dc2626',
        tooltip: 'Critical system module - failures have severe business impact'
      },
      high: {
        color: '#f59e0b',
        tooltip: 'High priority module - important for business operations'
      },
      medium: {
        color: '#3b82f6',
        tooltip: 'Medium priority module'
      },
      low: {
        color: '#6b7280',
        tooltip: 'Low priority module'
      }
    };

    const config = criticalityConfig[criticality.toLowerCase()] || criticalityConfig.medium;

    return (
      <span
        className="badge"
        style={{
          fontSize: '10px',
          backgroundColor: config.color,
          color: '#fff',
          cursor: 'help',
          marginLeft: '4px'
        }}
        title={config.tooltip}
      >
        {criticality.toUpperCase()}
      </span>
    );
  };

  // Filter modules
  const filteredModules = modules.filter(module => {
    const moduleData = (module as any)._raw || {};

    const matchesSearch = searchTerm === '' ||
      module.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (module.description && module.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const moduleType = moduleData.type || 'business';
    const matchesType = filterType === 'ALL' || moduleType === filterType;

    const approvalStatus = moduleData.metadata?.status || moduleData.status || 'draft';
    const matchesStatus = filterStatus === 'ALL' || approvalStatus.toLowerCase() === filterStatus.toLowerCase();

    const workflowType = moduleData.workflow_type;
    const matchesWorkflowType = filterWorkflowType === 'ALL' || workflowType === filterWorkflowType;

    const criticality = moduleData.criticality;
    const matchesCriticality = filterCriticality === 'ALL' || criticality === filterCriticality;

    return matchesSearch && matchesType && matchesStatus && matchesWorkflowType && matchesCriticality;
  });

  // Get unique values for filters
  const moduleTypes = Array.from(new Set(modules.map(m => (m as any)._raw?.type || 'business')));
  const workflowTypes = Array.from(new Set(modules.map(m => (m as any)._raw?.workflow_type).filter(Boolean)));
  const criticalityLevels = Array.from(new Set(modules.map(m => (m as any)._raw?.criticality).filter(Boolean)));

  const moduleAtoms = atoms.filter(a => selectedModule?.atoms?.includes(a.id));

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
      setNewModule({ id: '', name: '', description: '', owner: '', type: 'business', atoms: [] });
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

  const availableAtoms = atoms.filter(atom =>
    !newModule.atoms.includes(atom.id) &&
    (atomSearchTerm === '' ||
     atom.id.toLowerCase().includes(atomSearchTerm.toLowerCase()) ||
     atom.name.toLowerCase().includes(atomSearchTerm.toLowerCase()))
  ).slice(0, 50);

  const selectedAtoms = atoms.filter(a => newModule.atoms.includes(a.id));

  const handleApprovalAction = async () => {
    if (!approvalAction) return;

    setIsProcessingApproval(true);
    try {
      const response = await fetch(`http://localhost:8000/api/modules/${approvalAction.moduleId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: approvalAction.action,
          stage: approvalAction.stage,
          reviewer_email: reviewerEmail || undefined,
          reviewer_role: reviewerRole || undefined,
          comments: approvalComments || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to process approval: ${error.detail || 'Unknown error'}`);
        return;
      }

      alert(`Approval action '${approvalAction.action}' completed successfully!`);
      setShowApprovalModal(false);
      setApprovalAction(null);
      setReviewerEmail('');
      setReviewerRole('');
      setApprovalComments('');

      // Refresh the page to see updated workflow
      window.location.reload();
    } catch (error) {
      alert(`Failed to process approval: ${error}`);
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const openApprovalModal = (action: string, stage: string, moduleId: string) => {
    setApprovalAction({ action, stage, moduleId });
    setShowApprovalModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
            Modules
          </h2>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
            <span className="badge badge-info">{filteredModules.length} of {modules.length} modules</span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '600',
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              + Create Module
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search modules (ID, name, description)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ flex: '2', minWidth: '250px' }}
          />

          <select
            value={filterWorkflowType}
            onChange={(e) => setFilterWorkflowType(e.target.value)}
            className="form-input"
            style={{ width: '135px', fontSize: '13px' }}
            title="Filter by workflow type"
          >
            <option value="ALL">Type: All</option>
            <option value="BPM">BPM</option>
            <option value="SOP">SOP</option>
            <option value="CUSTOMER_JOURNEY">Journey</option>
            <option value="CUSTOM">Custom</option>
            {workflowTypes.filter(t => !['BPM', 'SOP', 'CUSTOMER_JOURNEY', 'CUSTOM'].includes(t)).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={filterCriticality}
            onChange={(e) => setFilterCriticality(e.target.value)}
            className="form-input"
            style={{ width: '120px', fontSize: '13px' }}
            title="Filter by criticality level"
          >
            <option value="ALL">Crit: All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-input"
            style={{ width: '135px', fontSize: '13px' }}
            title="Filter by approval status"
          >
            <option value="ALL">Status: All</option>
            <option value="draft">Draft</option>
            <option value="technical_review">Tech Review</option>
            <option value="compliance_review">Compliance</option>
            <option value="approved">Approved</option>
            <option value="ACTIVE">Active</option>
            <option value="DEPRECATED">Deprecated</option>
          </select>

          {(filterWorkflowType !== 'ALL' || filterCriticality !== 'ALL' || filterStatus !== 'ALL' || searchTerm !== '') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterWorkflowType('ALL');
                setFilterCriticality('ALL');
                setFilterStatus('ALL');
                setFilterType('ALL');
              }}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
              title="Clear all filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Module Table */}
      <div className="flex-1 overflow-y-auto content-area">
        <div style={{ padding: 'var(--spacing-lg)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '200px' }}>ID</th>
                <th>Name</th>
                <th style={{ width: '100px' }}>Atoms</th>
                <th style={{ width: '120px' }}>Owner</th>
                <th style={{ width: '120px' }}>Git Status</th>
                <th style={{ width: '140px' }}>Approval</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredModules.map(module => (
                <tr
                  key={module.id}
                  onClick={() => setSelectedModule(module)}
                  onDoubleClick={() => setSelectedModuleForDetail(module)}
                  style={{ cursor: 'pointer', backgroundColor: selectedModule?.id === module.id ? '#f0f9ff' : undefined }}
                >
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '600' }}>
                    {module.id}
                  </td>
                  <td style={{ fontWeight: '500' }}>{module.name}</td>
                  <td>
                    <span className="badge badge-info" style={{ fontSize: '11px' }}>
                      {module.atoms?.length || 0}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {module.owner || '-'}
                  </td>
                  <td>{renderGitStatusBadge(module.id)}</td>
                  <td>
                    {renderApprovalBadge(module)}
                    {renderCriticalityBadge(module)}
                  </td>
                  <td>
                    {onNavigateToGraph && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onNavigateToGraph(module.id); }}
                        style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid var(--color-border)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Graph
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredModules.length === 0 && (
            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
              No modules found matching your filters.
            </div>
          )}
        </div>

        {/* Module Details */}
        {selectedModule && (
          <div style={{ borderTop: '2px solid var(--color-border)', padding: 'var(--spacing-lg)', backgroundColor: '#f8fafc' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: 'var(--spacing-md)' }}>
              Module Details: {selectedModule.name}
            </h3>

            {selectedModule.description && (
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                {selectedModule.description}
              </p>
            )}

            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
              Atoms in Module ({moduleAtoms.length})
            </h4>

            {moduleAtoms.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleAtoms.map(atom => (
                    <tr
                      key={atom.id}
                      onClick={() => onSelectAtom(atom)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '600' }}>{atom.id}</td>
                      <td style={{ fontWeight: '500' }}>{atom.name}</td>
                      <td><span className="badge badge-info">{atom.type}</span></td>
                      <td><span className="badge badge-secondary">{atom.category}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
                No atoms in this module.
              </div>
            )}
          </div>
        )}
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
                  Type
                </label>
                <select
                  value={newModule.type}
                  onChange={(e) => setNewModule({ ...newModule, type: e.target.value })}
                  className="form-input"
                  style={{ width: '100%' }}
                >
                  <option value="business">Business Workflow</option>
                  <option value="technical">Technical System</option>
                  <option value="compliance">Compliance</option>
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
                  placeholder="Processing Team"
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
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '600', marginRight: '8px' }}>{atom.id}</span>
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
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '600', color: 'var(--color-primary)' }}>{atom.id}</span>
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
                  setNewModule({ id: '', name: '', description: '', owner: '', type: 'business', atoms: [] });
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

      {/* Module Detail Panel */}
      {selectedModuleForDetail && (() => {
        const module = selectedModuleForDetail;
        const moduleData = (module as any)._raw || {};
        const metadata = moduleData.metadata || {};
        const approvalWorkflow = metadata.approval_workflow || {
          current_stage: metadata.status || 'draft',
          stages: []
        };
        const moduleAtomsList = atoms.filter(a => module.atoms?.includes(a.id));

        // Default workflow stages if not defined
        const defaultStages = [
          { name: 'draft', label: 'Draft', assigned_to: 'Author', description: 'Module is being created' },
          { name: 'technical_review', label: 'Technical Review', assigned_to: 'Engineering Team', description: 'Technical validation of module composition' },
          { name: 'compliance_review', label: 'Compliance Review', assigned_to: 'Compliance Team', description: 'Regulatory and compliance verification' },
          { name: 'approved', label: 'Approved', assigned_to: 'VP Engineering', description: 'Module approved for use' }
        ];

        const stages = approvalWorkflow.stages.length > 0 ? approvalWorkflow.stages : defaultStages.map((s, i) => ({
          ...s,
          status: i === 0 && metadata.status === 'draft' ? 'completed' :
                  s.name === approvalWorkflow.current_stage ? 'in_progress' : 'pending'
        }));

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '600px',
            height: '100%',
            backgroundColor: '#ffffff',
            borderLeft: '2px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 2000,
            boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            {/* Header */}
            <div style={{
              padding: 'var(--spacing-lg)',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    Module Details
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                    {module.id}
                  </h3>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>
                    {module.name}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedModuleForDetail(null)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: '4px',
                    color: 'var(--color-text-tertiary)'
                  }}
                >
                  <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
              {/* Basic Info */}
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 'var(--spacing-md)' }}>
                  <span className="badge" style={{ backgroundColor: '#3b82f6', color: '#fff' }}>
                    {moduleData.type || 'business'}
                  </span>
                  {renderApprovalBadge(module)}
                  {renderCriticalityBadge(module)}
                  {renderGitStatusBadge(module.id)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {module.owner && <div><strong>Owner:</strong> {module.owner}</div>}
                  {moduleAtomsList.length > 0 && <div><strong>Atoms:</strong> {moduleAtomsList.length}</div>}
                  {metadata.created_at && <div><strong>Created:</strong> {new Date(metadata.created_at).toLocaleDateString()}</div>}
                  {metadata.version && <div><strong>Version:</strong> {metadata.version}</div>}
                </div>
              </div>

              {/* Description */}
              {module.description && (
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                    Description
                  </h5>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                    {module.description}
                  </p>
                </div>
              )}

              {/* Workflow Type & Criticality */}
              {(moduleData.workflow_type || moduleData.criticality) && (
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                    Classification
                  </h5>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {moduleData.workflow_type && (
                      <span style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '6px',
                        fontWeight: '500'
                      }}>
                        Type: {moduleData.workflow_type}
                      </span>
                    )}
                    {moduleData.criticality && (
                      <span style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        backgroundColor: moduleData.criticality === 'CRITICAL' ? '#fee2e2' : moduleData.criticality === 'HIGH' ? '#fef3c7' : '#e0e7ff',
                        color: moduleData.criticality === 'CRITICAL' ? '#991b1b' : moduleData.criticality === 'HIGH' ? '#92400e' : '#4338ca',
                        borderRadius: '6px',
                        fontWeight: '500'
                      }}>
                        Criticality: {moduleData.criticality}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Entry & Exit Points */}
              {(moduleData.entry_points || moduleData.exit_points) && (
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                    Workflow Boundaries
                  </h5>
                  <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {moduleData.entry_points && moduleData.entry_points.length > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                          Entry Points ({moduleData.entry_points.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {moduleData.entry_points.map((atomId: string, i: number) => (
                            <div key={i} style={{
                              fontSize: '11px',
                              padding: '6px 10px',
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              borderRadius: '4px',
                              fontFamily: 'var(--font-mono)',
                              borderLeft: '3px solid #16a34a'
                            }}>
                              → {atomId}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {moduleData.exit_points && moduleData.exit_points.length > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                          Exit Points ({moduleData.exit_points.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {moduleData.exit_points.map((exitPoint: any, i: number) => {
                            const atomId = typeof exitPoint === 'string' ? exitPoint : exitPoint.atom;
                            const condition = typeof exitPoint === 'object' ? exitPoint.condition : null;
                            return (
                              <div key={i} style={{
                                fontSize: '11px',
                                padding: '6px 10px',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                borderRadius: '4px',
                                fontFamily: 'var(--font-mono)',
                                borderLeft: '3px solid #f59e0b'
                              }}>
                                {atomId} {condition && <span style={{ fontStyle: 'italic', fontFamily: 'sans-serif' }}>({condition})</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* External Dependencies */}
              {moduleData.external_dependencies && (
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                    External Dependencies
                  </h5>
                  <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                    {moduleData.external_dependencies.systems && moduleData.external_dependencies.systems.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>SYSTEMS</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {moduleData.external_dependencies.systems.map((sys: string, i: number) => (
                            <span key={i} style={{
                              fontSize: '10px',
                              padding: '4px 8px',
                              backgroundColor: '#e0e7ff',
                              color: '#4338ca',
                              borderRadius: '4px',
                              fontFamily: 'var(--font-mono)'
                            }}>
                              {sys}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {moduleData.external_dependencies.modules && moduleData.external_dependencies.modules.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>MODULES</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {moduleData.external_dependencies.modules.map((mod: string, i: number) => (
                            <span key={i} style={{
                              fontSize: '10px',
                              padding: '4px 8px',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              borderRadius: '4px',
                              fontFamily: 'var(--font-mono)'
                            }}>
                              {mod}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {moduleData.external_dependencies.roles && moduleData.external_dependencies.roles.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>ROLES</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {moduleData.external_dependencies.roles.map((role: string, i: number) => (
                            <span key={i} style={{
                              fontSize: '10px',
                              padding: '4px 8px',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              borderRadius: '4px',
                              fontFamily: 'var(--font-mono)'
                            }}>
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {moduleData.external_dependencies.documents && moduleData.external_dependencies.documents.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>DOCUMENTS</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {moduleData.external_dependencies.documents.map((doc: string, i: number) => (
                            <span key={i} style={{
                              fontSize: '10px',
                              padding: '4px 8px',
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              borderRadius: '4px',
                              fontFamily: 'var(--font-mono)'
                            }}>
                              {doc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SLA Information */}
              {moduleData.sla && (
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                    Service Level Agreement
                  </h5>
                  <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: '#f9fafb',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)'
                  }}>
                    {moduleData.sla.target_completion_minutes && (
                      <div style={{ marginBottom: '6px' }}>
                        <strong>Target Completion:</strong> {Math.floor(moduleData.sla.target_completion_minutes / 60)} hours ({moduleData.sla.target_completion_minutes} minutes)
                      </div>
                    )}
                    {moduleData.sla.warning_threshold_percent && (
                      <div style={{ marginBottom: '6px' }}>
                        <strong>Warning Threshold:</strong> {moduleData.sla.warning_threshold_percent}% of SLA
                      </div>
                    )}
                    {moduleData.sla.escalation_minutes && (
                      <div>
                        <strong>Escalation After:</strong> {Math.floor(moduleData.sla.escalation_minutes / 60)} hours
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Approval Workflow */}
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-md)' }}>
                  Approval Workflow
                </h5>
                <div style={{ position: 'relative' }}>
                  {stages.map((stage, index) => {
                    const statusColor =
                      stage.status === 'completed' ? '#10b981' :
                      stage.status === 'in_progress' ? '#f59e0b' :
                      '#9ca3af';

                    const statusIcon =
                      stage.status === 'completed' ? '✓' :
                      stage.status === 'in_progress' ? '◉' :
                      '○';

                    return (
                      <div key={index} style={{ position: 'relative', paddingLeft: '32px', paddingBottom: index < stages.length - 1 ? '24px' : '0' }}>
                        {/* Timeline line */}
                        {index < stages.length - 1 && (
                          <div style={{
                            position: 'absolute',
                            left: '11px',
                            top: '24px',
                            bottom: '0',
                            width: '2px',
                            backgroundColor: '#e5e7eb'
                          }} />
                        )}

                        {/* Status dot */}
                        <div style={{
                          position: 'absolute',
                          left: '0',
                          top: '4px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: statusColor,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '600',
                          zIndex: 1
                        }}>
                          {statusIcon}
                        </div>

                        {/* Stage content */}
                        <div style={{
                          backgroundColor: stage.status === 'in_progress' ? '#fffbeb' : '#f9fafb',
                          border: `1px solid ${stage.status === 'in_progress' ? '#fbbf24' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          padding: '12px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                              {stage.label || stage.name}
                            </div>
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: statusColor,
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {stage.status}
                            </span>
                          </div>

                          {stage.description && (
                            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '6px' }}>
                              {stage.description}
                            </div>
                          )}

                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            <strong>Assigned to:</strong> {stage.assigned_to}
                          </div>

                          {stage.reviewers && stage.reviewers.length > 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                              <strong>Reviewers:</strong>
                              {stage.reviewers.map((r: any, i: number) => (
                                <div key={i} style={{ marginLeft: '8px', marginTop: '2px' }}>
                                  • {r.email} ({r.role})
                                </div>
                              ))}
                            </div>
                          )}

                          {stage.completed_by && (
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                              <strong>Completed by:</strong> {stage.completed_by}
                              {stage.completed_at && (
                                <span style={{ marginLeft: '8px' }}>
                                  on {new Date(stage.completed_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          )}

                          {stage.started_at && stage.status === 'in_progress' && (
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                              <strong>Started:</strong> {new Date(stage.started_at).toLocaleDateString()}
                            </div>
                          )}

                          {/* Approval Action Buttons */}
                          {stage.status === 'in_progress' && stage.name !== 'draft' && (
                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                              <button
                                onClick={() => openApprovalModal('approve', stage.name, module.id)}
                                style={{
                                  flex: 1,
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  backgroundColor: '#10b981',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => openApprovalModal('request_changes', stage.name, module.id)}
                                style={{
                                  flex: 1,
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  backgroundColor: '#f59e0b',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                ↻ Request Changes
                              </button>
                              <button
                                onClick={() => openApprovalModal('reject', stage.name, module.id)}
                                style={{
                                  flex: 1,
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  backgroundColor: '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✕ Reject
                              </button>
                            </div>
                          )}

                          {/* Submit to next stage button for draft */}
                          {stage.name === 'draft' && approvalWorkflow.current_stage === 'draft' && (
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                              <button
                                onClick={() => openApprovalModal('submit', 'draft', module.id)}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: '#3b82f6',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                → Submit for Technical Review
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Module Composition - Atoms */}
              {moduleAtomsList.length > 0 && (() => {
                // Calculate which atoms are shared across multiple modules
                const atomUsageMap = new Map<string, string[]>();
                modules.forEach(mod => {
                  const modAtomIds = mod.atoms || (mod as any).atom_ids || [];
                  modAtomIds.forEach((atomId: string) => {
                    if (!atomUsageMap.has(atomId)) {
                      atomUsageMap.set(atomId, []);
                    }
                    atomUsageMap.get(atomId)!.push(mod.id);
                  });
                });

                return (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                      Module Composition ({moduleAtomsList.length} Atoms)
                    </h5>
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                      {moduleAtomsList.map((atom, index) => {
                        const modulesUsingThisAtom = atomUsageMap.get(atom.id) || [];
                        const isShared = modulesUsingThisAtom.length > 1;
                        const otherModules = modulesUsingThisAtom.filter(modId => modId !== module.id);

                        return (
                          <div
                            key={atom.id}
                            onClick={() => onSelectAtom(atom)}
                            style={{
                              padding: '12px',
                              borderBottom: index < moduleAtomsList.length - 1 ? '1px solid var(--color-border)' : 'none',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s',
                              backgroundColor: isShared ? '#fef3c7' : '#ffffff',
                              borderLeft: isShared ? '3px solid #f59e0b' : 'none',
                              paddingLeft: isShared ? '9px' : '12px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isShared ? '#fde68a' : '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isShared ? '#fef3c7' : '#ffffff'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '600', color: 'var(--color-primary)' }}>
                                {atom.id}
                              </div>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {isShared && (
                                  <span
                                    className="badge"
                                    style={{
                                      fontSize: '9px',
                                      padding: '2px 6px',
                                      backgroundColor: '#f59e0b',
                                      color: '#fff',
                                      cursor: 'help'
                                    }}
                                    title={`Shared with ${otherModules.length} other module${otherModules.length > 1 ? 's' : ''}: ${otherModules.join(', ')}`}
                                  >
                                    Shared ({modulesUsingThisAtom.length})
                                  </span>
                                )}
                                <span className="badge badge-info" style={{ fontSize: '9px', padding: '2px 6px' }}>
                                  {atom.type}
                                </span>
                                <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '2px 6px' }}>
                                  {atom.category}
                                </span>
                              </div>
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                              {atom.name}
                            </div>
                            {atom.content?.summary && (
                              <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', lineHeight: '1.4' }}>
                                {atom.content.summary.substring(0, 120)}
                                {atom.content.summary.length > 120 ? '...' : ''}
                              </div>
                            )}
                            {isShared && otherModules.length > 0 && (
                              <div style={{
                                fontSize: '10px',
                                color: '#92400e',
                                marginTop: '6px',
                                paddingTop: '6px',
                                borderTop: '1px solid #fcd34d'
                              }}>
                                <div style={{ fontWeight: '600', marginBottom: '3px' }}>
                                  Shared with {otherModules.length} other module{otherModules.length > 1 ? 's' : ''}:
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {otherModules.map((moduleId, idx) => {
                                    const sharedModule = modules.find(m => m.id === moduleId);
                                    return (
                                      <span
                                        key={idx}
                                        style={{
                                          fontSize: '9px',
                                          padding: '2px 6px',
                                          backgroundColor: '#fbbf24',
                                          color: '#fff',
                                          borderRadius: '4px',
                                          fontWeight: '500',
                                          cursor: 'help'
                                        }}
                                        title={sharedModule ? `${sharedModule.name}\n${sharedModule.description || 'No description'}` : moduleId}
                                      >
                                        {moduleId}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Dependencies */}
              {moduleData.dependencies && moduleData.dependencies.length > 0 && (
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                    Dependencies
                  </h5>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {moduleData.dependencies.map((dep: string, i: number) => (
                      <div key={i} style={{
                        padding: '8px',
                        marginBottom: '4px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px'
                      }}>
                        {dep}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {moduleData.tags && moduleData.tags.length > 0 && (
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                    Tags
                  </h5>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {moduleData.tags.map((tag: string, i: number) => (
                      <span key={i} style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        backgroundColor: '#e0e7ff',
                        color: '#4f46e5',
                        borderRadius: '12px',
                        fontWeight: '500'
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Approval Action Modal */}
      {showApprovalModal && approvalAction && (
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
          zIndex: 3000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: 'var(--spacing-xl)',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-md)' }}>
              {approvalAction.action === 'submit' && '📤 Submit for Review'}
              {approvalAction.action === 'approve' && '✅ Approve Stage'}
              {approvalAction.action === 'reject' && '❌ Reject Module'}
              {approvalAction.action === 'request_changes' && '🔄 Request Changes'}
            </h2>

            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
              {approvalAction.action === 'submit' && `Submit this module to the next approval stage.`}
              {approvalAction.action === 'approve' && `Approve the ${approvalAction.stage} stage and move to the next stage.`}
              {approvalAction.action === 'reject' && `Reject this module and return it to draft status.`}
              {approvalAction.action === 'request_changes' && `Request changes and return the module to draft status.`}
            </p>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Your Email {(approvalAction.action === 'approve' || approvalAction.action === 'reject' || approvalAction.action === 'request_changes') && <span style={{ color: '#dc2626' }}>*</span>}
              </label>
              <input
                type="email"
                value={reviewerEmail}
                onChange={(e) => setReviewerEmail(e.target.value)}
                placeholder="reviewer@example.com"
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Your Role {(approvalAction.action === 'approve' || approvalAction.action === 'reject' || approvalAction.action === 'request_changes') && <span style={{ color: '#dc2626' }}>*</span>}
              </label>
              <input
                type="text"
                value={reviewerRole}
                onChange={(e) => setReviewerRole(e.target.value)}
                placeholder="Engineering Lead, Compliance Officer, etc."
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Comments {(approvalAction.action === 'reject' || approvalAction.action === 'request_changes') && <span style={{ color: '#dc2626' }}>*</span>}
              </label>
              <textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder={
                  approvalAction.action === 'reject' ? 'Explain why this module is being rejected...' :
                  approvalAction.action === 'request_changes' ? 'Describe what changes are needed...' :
                  'Optional comments about this approval...'
                }
                className="form-input"
                style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovalAction(null);
                  setReviewerEmail('');
                  setReviewerRole('');
                  setApprovalComments('');
                }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={isProcessingApproval}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleApprovalAction}
                disabled={
                  isProcessingApproval ||
                  ((approvalAction.action === 'approve' || approvalAction.action === 'reject' || approvalAction.action === 'request_changes') && (!reviewerEmail || !reviewerRole)) ||
                  ((approvalAction.action === 'reject' || approvalAction.action === 'request_changes') && !approvalComments)
                }
                style={{
                  flex: 1,
                  backgroundColor:
                    approvalAction.action === 'approve' ? '#10b981' :
                    approvalAction.action === 'reject' ? '#ef4444' :
                    approvalAction.action === 'request_changes' ? '#f59e0b' :
                    'var(--color-primary)'
                }}
              >
                {isProcessingApproval ? 'Processing...' :
                  approvalAction.action === 'submit' ? 'Submit' :
                  approvalAction.action === 'approve' ? 'Approve' :
                  approvalAction.action === 'reject' ? 'Reject' :
                  'Request Changes'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleExplorer;
