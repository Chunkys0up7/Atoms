
import React, { useState, useEffect } from 'react';
import { Atom, AtomType, AtomCategory, EdgeType } from '../types';
import { ATOM_COLORS, MOCK_PHASES } from '../constants';

interface AtomGitStatus {
  atom_id: string;
  file_path: string;
  status: string;
  last_commit_hash?: string;
  last_commit_date?: string;
  last_commit_author?: string;
  last_commit_message?: string;
  is_recently_changed: boolean;
  days_since_commit?: number;
}

interface AtomExplorerProps {
  atoms: Atom[];
  modules: any[];
  onSelect: (atom: Atom) => void;
}

const AtomExplorer: React.FC<AtomExplorerProps> = ({ atoms, modules, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AtomType | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<AtomCategory | 'ALL'>('ALL');
  const [filterPhase, setFilterPhase] = useState<string>('ALL');
  const [filterOwner, setFilterOwner] = useState<string>('ALL');
  const [filterCriticality, setFilterCriticality] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAtom, setEditingAtom] = useState<Atom | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [currentEdgeTarget, setCurrentEdgeTarget] = useState('');
  const [currentEdgeType, setCurrentEdgeType] = useState<EdgeType>('ENABLES');
  const [editStep, setEditStep] = useState('');
  const [editEdgeTarget, setEditEdgeTarget] = useState('');
  const [editEdgeType, setEditEdgeType] = useState<EdgeType>('ENABLES');

  const [createStep, setCreateStep] = useState<'search' | 'details' | 'review'>('search');
  const [similarAtoms, setSimilarAtoms] = useState<Atom[]>([]);
  const [gitStatuses, setGitStatuses] = useState<Map<string, AtomGitStatus>>(new Map());
  const [schemaValidations, setSchemaValidations] = useState<Map<string, {is_valid: boolean, errors: string[], warnings: string[]}>>(new Map());

  // Fetch git status for all atoms
  useEffect(() => {
    const fetchGitStatuses = async () => {
      try {
        console.log('[AtomExplorer] Fetching git statuses...');
        const response = await fetch('http://localhost:8000/api/git/atoms/status', {
          // Add timeout and retry logic
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });
        console.log('[AtomExplorer] Git status response:', response.ok, response.status);
        if (response.ok) {
          const statuses: AtomGitStatus[] = await response.json();
          console.log('[AtomExplorer] Received git statuses:', statuses.length, 'atoms');
          console.log('[AtomExplorer] Sample status:', statuses[0]);

          // Only update if we received valid data
          if (statuses && statuses.length > 0) {
            const statusMap = new Map(statuses.map(s => [s.atom_id, s]));
            setGitStatuses(statusMap);
            console.log('[AtomExplorer] Git status map size:', statusMap.size);
          } else {
            console.warn('[AtomExplorer] Received empty git status array, keeping existing state');
          }
        } else {
          console.error('[AtomExplorer] Failed to fetch git statuses:', response.status, response.statusText);
          // Don't clear existing state on failure
        }
      } catch (error) {
        console.error('[AtomExplorer] Failed to fetch git statuses:', error);
        // Don't clear existing state on error - keep showing last known good state
      }
    };

    fetchGitStatuses();
    // Refresh git status every 30 seconds
    const interval = setInterval(fetchGitStatuses, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch schema validation for visible atoms
  useEffect(() => {
    const validateAtoms = async () => {
      if (atoms.length === 0) return;

      try {
        console.log('[AtomExplorer] Validating atoms against schema...');
        const validationMap = new Map();

        // Validate atoms in batches to avoid overwhelming the server
        const batchSize = 20;
        for (let i = 0; i < Math.min(atoms.length, 100); i += batchSize) {
          const batch = atoms.slice(i, i + batchSize);

          const validationPromises = batch.map(async (atom) => {
            try {
              const response = await fetch('http://localhost:8000/api/schema/validate-atom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: atom.id,
                  type: atom.type,
                  ontologyDomain: atom.ontologyDomain,
                  name: atom.name,
                  edges: atom.edges || []
                }),
                signal: AbortSignal.timeout(5000)
              });

              if (response.ok) {
                const result = await response.json();
                return { atomId: atom.id, validation: result };
              }
            } catch (error) {
              // Skip validation errors silently
            }
            return null;
          });

          const results = await Promise.all(validationPromises);
          results.forEach(result => {
            if (result) {
              validationMap.set(result.atomId, result.validation);
            }
          });
        }

        setSchemaValidations(validationMap);
        console.log('[AtomExplorer] Schema validation complete:', validationMap.size, 'atoms validated');
      } catch (error) {
        console.error('[AtomExplorer] Schema validation failed:', error);
      }
    };

    // Run validation on mount and when atoms change
    validateAtoms();
  }, [atoms]);
  const [atomNameInput, setAtomNameInput] = useState('');
  const [newAtom, setNewAtom] = useState({
    id: '',
    category: 'CUSTOMER_FACING' as AtomCategory,
    type: 'PROCESS' as AtomType,
    name: '',
    version: '1.0.0',
    status: 'DRAFT' as 'ACTIVE' | 'DRAFT' | 'DEPRECATED',
    owning_team: '',
    author: '',
    team: '', // Legacy - for compatibility
    owner: '', // Legacy - for compatibility
    steward: '',
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
      // Ensure ID is set using auto-generated pattern
      const atomToCreate = {
        ...newAtom,
        id: newAtom.id || generateAtomId(newAtom.category, newAtom.name)
      };

      const response = await fetch('http://localhost:8000/api/atoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(atomToCreate)
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

  const handleEditAtom = async () => {
    if (!editingAtom) return;

    setIsCreating(true);
    try {
      const response = await fetch(`http://localhost:8000/api/atoms/${editingAtom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingAtom)
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to update atom: ${error.detail || 'Unknown error'}`);
        return;
      }

      alert('Atom updated successfully! Refresh the page to see changes.');
      setShowEditModal(false);
      setEditingAtom(null);
    } catch (error) {
      alert(`Failed to update atom: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Generate atom ID based on category and name
  const generateAtomId = (category: AtomCategory, name: string): string => {
    const prefixMap: Record<AtomCategory, string> = {
      'CUSTOMER_FACING': 'cust',
      'BACK_OFFICE': 'bo',
      'SYSTEM': 'sys'
    };
    const prefix = prefixMap[category];
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
    return `atom-${prefix}-${slug}`;
  };

  // Validation function to check if required fields are filled
  const validateAtom = (): boolean => {
    return !!(
      newAtom.name.trim() &&
      newAtom.owning_team.trim() &&
      newAtom.content.summary.trim()
    );
  };

  // Search for similar atoms
  const searchSimilarAtoms = (query: string) => {
    if (!query || query.length < 3) {
      setSimilarAtoms([]);
      return;
    }
    const similar = atoms.filter(atom =>
      atom.name.toLowerCase().includes(query.toLowerCase()) ||
      atom.content?.summary?.toLowerCase().includes(query.toLowerCase()) ||
      (atom.content?.steps || []).some(step => step.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 5);
    setSimilarAtoms(similar);
  };

  // Render git status badge
  const renderGitStatusBadge = (atomId: string) => {
    const gitStatus = gitStatuses.get(atomId);

    // Debug logging - remove after testing
    if (Math.random() < 0.01) { // Log ~1% of calls to avoid spam
      console.log('[renderGitStatusBadge] atomId:', atomId, 'gitStatus:', gitStatus, 'mapSize:', gitStatuses.size);
    }

    if (!gitStatus) {
      return (
        <span
          className="badge"
          style={{ fontSize: '10px', backgroundColor: '#9ca3af', color: '#fff', cursor: 'help' }}
          title="Git status unknown - atom may not be tracked in version control yet"
        >
          Unknown
        </span>
      );
    }

    // Build detailed tooltip
    let tooltip = '';
    let config = { label: '', color: '', icon: '' };

    if (gitStatus.status === 'new') {
      config = { label: 'New', color: '#10b981', icon: '+' };
      tooltip = 'This atom has been created but not yet committed to git. It needs to be committed to have version history.';
    } else if (gitStatus.status === 'modified') {
      config = { label: 'Modified', color: '#f59e0b', icon: '~' };
      tooltip = `This atom has uncommitted changes.\n\nLast committed: ${gitStatus.days_since_commit} day(s) ago by ${gitStatus.last_commit_author}\nCommit: ${gitStatus.last_commit_message}`;
    } else if (gitStatus.status === 'uncommitted') {
      config = { label: 'Uncommitted', color: '#ef4444', icon: '!' };
      tooltip = 'This atom has uncommitted changes. Commit these changes to preserve them in version history.';
    } else if (gitStatus.status === 'committed') {
      if (gitStatus.is_recently_changed) {
        config = { label: `${gitStatus.days_since_commit}d ago`, color: '#3b82f6', icon: '✓' };
        tooltip = `Recently committed (${gitStatus.days_since_commit} day(s) ago)\n\nAuthor: ${gitStatus.last_commit_author}\nCommit: ${gitStatus.last_commit_message}\nHash: ${gitStatus.last_commit_hash}`;
      } else {
        config = { label: 'Committed', color: '#6b7280', icon: '✓' };
        tooltip = `Committed ${gitStatus.days_since_commit} day(s) ago\n\nAuthor: ${gitStatus.last_commit_author}\nCommit: ${gitStatus.last_commit_message}\nHash: ${gitStatus.last_commit_hash}`;
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

  const resetForm = () => {
    setNewAtom({
      id: '',
      category: 'CUSTOMER_FACING',
      type: 'PROCESS',
      name: '',
      version: '1.0.0',
      status: 'DRAFT',
      owning_team: '',
      author: '',
      team: '', // Legacy
      owner: '', // Legacy
      steward: '',
      ontologyDomain: 'Home Lending',
      criticality: 'MEDIUM',
      phaseId: '',
      moduleId: '',
      content: { summary: '', steps: [] },
      edges: [],
      metrics: { automation_level: 0, avg_cycle_time_mins: 0, error_rate: 0, compliance_score: 0 }
    });
    setCurrentStep('');
    setCreateStep('search');
    setAtomNameInput('');
    setSimilarAtoms([]);
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

  // Get unique owners and phases for filter dropdowns
  const uniqueOwners = Array.from(new Set(atoms.map(a => a.owner).filter(Boolean))).sort();
  const uniquePhases = Array.from(new Set(atoms.map(a => a.phaseId).filter(Boolean)));

  const filteredAtoms = atoms.filter(atom => {
    const name = atom.name || '';
    const id = atom.id || '';
    const summary = atom.content?.summary || '';
    const description = atom.content?.description || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         description.toLowerCase().includes(searchTerm.toLowerCase());

    const atomType = typeof atom.type === 'string' ? atom.type.toUpperCase() : String(atom.type).toUpperCase();
    const filterTypeUpper = filterType === 'ALL' ? 'ALL' : (typeof filterType === 'string' ? filterType.toUpperCase() : String(filterType).toUpperCase());
    const matchesType = filterTypeUpper === 'ALL' || atomType === filterTypeUpper;

    const atomCategory = atom.category || '';
    const matchesCategory = filterCategory === 'ALL' || atomCategory === filterCategory;

    const matchesPhase = filterPhase === 'ALL' || atom.phaseId === filterPhase;

    const matchesOwner = filterOwner === 'ALL' || atom.owner === filterOwner;

    const matchesCriticality = filterCriticality === 'ALL' || atom.criticality === filterCriticality;

    return matchesSearch && matchesType && matchesCategory && matchesPhase && matchesOwner && matchesCriticality;
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

        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
          {/* Search Bar */}
          <div style={{ flex: 1, position: 'relative' }}>
            <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--color-text-tertiary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search atoms (ID, name, description, summary)..."
              className="form-input"
              style={{ paddingLeft: '32px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Compact Filter Dropdowns */}
          <select
            className="form-select"
            style={{ width: '140px', fontSize: '13px' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="ALL">Type: All</option>
            <option value="PROCESS">Process</option>
            <option value="DECISION">Decision</option>
            <option value="GATEWAY">Gateway</option>
            <option value="ROLE">Role</option>
            <option value="SYSTEM">System</option>
            <option value="DOCUMENT">Document</option>
            <option value="REGULATION">Regulation</option>
            <option value="METRIC">Metric</option>
            <option value="RISK">Risk</option>
            <option value="POLICY">Policy</option>
            <option value="CONTROL">Control</option>
          </select>

          <select
            className="form-select"
            style={{ width: '140px', fontSize: '13px' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
          >
            <option value="ALL">Category: All</option>
            <option value="CUSTOMER_FACING">Customer</option>
            <option value="BACK_OFFICE">Back Office</option>
            <option value="SYSTEM">System</option>
          </select>

          <select
            className="form-select"
            style={{ width: '140px', fontSize: '13px' }}
            value={filterPhase}
            onChange={(e) => setFilterPhase(e.target.value)}
          >
            <option value="ALL">Phase: All</option>
            {MOCK_PHASES.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: '160px', fontSize: '13px' }}
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
          >
            <option value="ALL">Owner: All</option>
            {uniqueOwners.map(owner => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: '150px', fontSize: '13px' }}
            value={filterCriticality}
            onChange={(e) => setFilterCriticality(e.target.value)}
            title="Filter by criticality level"
          >
            <option value="ALL">Criticality: All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Filter Badge and Clear Button */}
          {(filterType !== 'ALL' || filterCategory !== 'ALL' || filterPhase !== 'ALL' || filterOwner !== 'ALL' || filterCriticality !== 'ALL') && (
            <button
              onClick={() => {
                setFilterType('ALL');
                setFilterCategory('ALL');
                setFilterPhase('ALL');
                setFilterOwner('ALL');
                setFilterCriticality('ALL');
              }}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                backgroundColor: 'transparent',
                color: '#dc2626',
                border: '1px solid #dc2626',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}
              title="Clear all filters"
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Filter Summary */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'var(--spacing-sm)',
          fontSize: '12px'
        }}>
          <div style={{ color: 'var(--color-text-tertiary)' }}>
            Showing <strong style={{ color: 'var(--color-primary)' }}>{filteredAtoms.length}</strong> of {atoms.length} atoms
          </div>
          {(filterType !== 'ALL' || filterCategory !== 'ALL' || filterPhase !== 'ALL' || filterOwner !== 'ALL') && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {filterType !== 'ALL' && (
                <span style={{ padding: '2px 8px', fontSize: '11px', backgroundColor: '#e0e7ff', color: '#3730a3', borderRadius: '12px', fontWeight: '500' }}>
                  {filterType}
                </span>
              )}
              {filterCategory !== 'ALL' && (
                <span style={{ padding: '2px 8px', fontSize: '11px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '12px', fontWeight: '500' }}>
                  {filterCategory === 'CUSTOMER_FACING' ? 'Customer' : filterCategory === 'BACK_OFFICE' ? 'Back Office' : filterCategory}
                </span>
              )}
              {filterPhase !== 'ALL' && (
                <span style={{ padding: '2px 8px', fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '12px', fontWeight: '500' }}>
                  {MOCK_PHASES.find(p => p.id === filterPhase)?.name || filterPhase}
                </span>
              )}
              {filterOwner !== 'ALL' && (
                <span style={{ padding: '2px 8px', fontSize: '11px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '12px', fontWeight: '500' }}>
                  {filterOwner}
                </span>
              )}
            </div>
          )}
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
                <th>Module</th>
                <th>Criticality</th>
                <th>Metrics</th>
                <th>Edges</th>
                <th>Schema</th>
                <th>Team</th>
                <th>Status</th>
                <th>Git</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAtoms.map(atom => {
                const owningModule = modules.find(m => m.id === atom.moduleId);
                const criticalityColors = {
                  CRITICAL: '#dc2626',
                  HIGH: '#f59e0b',
                  MEDIUM: '#3b82f6',
                  LOW: '#6b7280'
                };
                const edgeCount = atom.edges?.length || 0;

                return (
                  <tr key={atom.id} onClick={() => onSelect(atom)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '600' }}>{atom.id}</td>
                    <td style={{ fontWeight: '500' }}>
                      {atom.name}
                      {atom.content?.summary && (
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }} title={atom.content.summary}>
                          {atom.content.summary.substring(0, 60)}{atom.content.summary.length > 60 ? '...' : ''}
                        </div>
                      )}
                    </td>
                    <td><span className="badge badge-info" style={{ fontSize: '10px' }}>{atom.type}</span></td>
                    <td><span className="badge badge-secondary" style={{ fontSize: '10px' }}>{atom.category}</span></td>
                    <td style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      {owningModule ? owningModule.name : atom.moduleId || '-'}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          fontSize: '10px',
                          backgroundColor: criticalityColors[atom.criticality as keyof typeof criticalityColors] || '#9ca3af',
                          color: '#fff'
                        }}
                      >
                        {atom.criticality}
                      </span>
                    </td>
                    <td>
                      {atom.metrics && (
                        <div style={{ fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div title="Automation Level">Auto: {((atom.metrics.automation_level || 0) * 100).toFixed(0)}%</div>
                          <div title="Compliance Score">Comp: {((atom.metrics.compliance_score || 0) * 100).toFixed(0)}%</div>
                        </div>
                      )}
                    </td>
                    <td>
                      {edgeCount > 0 && (
                        <span
                          className="badge"
                          style={{ fontSize: '10px', backgroundColor: '#e0e7ff', color: '#4338ca', cursor: 'help' }}
                          title={`${edgeCount} relationship${edgeCount > 1 ? 's' : ''}`}
                        >
                          {edgeCount}
                        </span>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const validation = schemaValidations.get(atom.id);
                        if (!validation) {
                          return (
                            <span
                              className="badge"
                              style={{ fontSize: '10px', backgroundColor: '#e5e7eb', color: '#6b7280', cursor: 'help' }}
                              title="Schema validation pending..."
                            >
                              ...
                            </span>
                          );
                        }

                        if (validation.is_valid) {
                          return (
                            <span
                              className="badge"
                              style={{ fontSize: '10px', backgroundColor: '#10b981', color: '#fff', cursor: 'help' }}
                              title={validation.warnings.length > 0 ? `Valid with warnings:\n${validation.warnings.join('\n')}` : 'Valid - conforms to schema'}
                            >
                              {validation.warnings.length > 0 ? '✓⚠' : '✓'}
                            </span>
                          );
                        } else {
                          return (
                            <span
                              className="badge"
                              style={{ fontSize: '10px', backgroundColor: '#dc2626', color: '#fff', cursor: 'help' }}
                              title={`Schema errors:\n${validation.errors.join('\n')}`}
                            >
                              ✗
                            </span>
                          );
                        }
                      })()}
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      <div>{atom.owning_team || atom.team || atom.owner || '-'}</div>
                      {atom.steward && <div style={{ fontSize: '10px', color: '#9ca3af' }}>({atom.steward})</div>}
                    </td>
                    <td><span className={`badge ${atom.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>{atom.status}</span></td>
                    <td>{renderGitStatusBadge(atom.id)}</td>
                    <td>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingAtom(atom); setShowEditModal(true); }}
                        style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
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
            padding: 'var(--spacing-xl)', maxWidth: '900px', width: '90%',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Header with Steps */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: 'var(--spacing-md)' }}>
                Create New Atom
              </h2>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                {['search', 'details', 'review'].map((step, idx) => (
                  <div key={step} style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: createStep === step ? '#3b82f6' : '#f3f4f6',
                    color: createStep === step ? '#ffffff' : '#6b7280',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    {idx + 1}. {step === 'search' ? 'Check for Duplicates' : step === 'details' ? 'Atom Details' : 'Review & Submit'}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Search for Similar Atoms */}
            {createStep === 'search' && (
              <div>
                <div style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <svg style={{ width: '20px', height: '20px', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>Before creating a new atom...</div>
                      <div style={{ fontSize: '13px', color: '#78350f' }}>
                        Search for existing atoms to avoid duplicates and ensure consistency across the documentation platform.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                    What does this atom do?
                  </label>
                  <input
                    type="text"
                    value={atomNameInput}
                    onChange={(e) => {
                      setAtomNameInput(e.target.value);
                      searchSimilarAtoms(e.target.value);
                    }}
                    placeholder="e.g., Customer submits loan application"
                    className="form-input"
                    style={{ width: '100%', fontSize: '14px', padding: '12px' }}
                    autoFocus
                  />
                </div>

                {similarAtoms.length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#dc2626', marginBottom: 'var(--spacing-sm)' }}>
                      ⚠️ Similar atoms found ({similarAtoms.length})
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #fecaca', borderRadius: '8px', backgroundColor: '#fef2f2' }}>
                      {similarAtoms.map(atom => (
                        <div key={atom.id} style={{
                          padding: 'var(--spacing-md)',
                          borderBottom: '1px solid #fecaca'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '14px', color: '#991b1b' }}>{atom.name}</div>
                              <div style={{ fontSize: '11px', color: '#7f1d1d', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{atom.id}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <span className="badge" style={{ fontSize: '9px', backgroundColor: ATOM_COLORS[atom.type] }}>{atom.type}</span>
                              <span className="badge" style={{ fontSize: '9px' }}>{atom.category}</span>
                            </div>
                          </div>
                          {atom.content?.summary && (
                            <div style={{ fontSize: '12px', color: '#7f1d1d', marginBottom: '6px' }}>{atom.content.summary}</div>
                          )}
                          <button
                            onClick={() => {
                              onSelect(atom);
                              setShowCreateModal(false);
                              resetForm();
                            }}
                            style={{
                              fontSize: '11px',
                              padding: '4px 8px',
                              backgroundColor: '#dc2626',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Use This Atom Instead
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                  <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!atomNameInput.trim()) {
                        alert('Please describe what the atom does');
                        return;
                      }
                      setNewAtom({ ...newAtom, name: atomNameInput });
                      setCreateStep('details');
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={!atomNameInput.trim()}
                  >
                    {similarAtoms.length > 0 ? 'Create Anyway →' : 'Continue →'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Atom Details */}
            {createStep === 'details' && (
              <div>
                <div style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-sm)', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #0ea5e9' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#0369a1' }}>Creating: {newAtom.name}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                      Atom ID <span style={{ color: '#6b7280', fontSize: '11px' }}>(auto-generated)</span>
                    </label>
                    <input
                      type="text"
                      value={generateAtomId(newAtom.category, newAtom.name)}
                      disabled
                      className="form-input"
                      style={{ width: '100%', backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }}
                    />
                    <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>
                      Format: atom-{'{category}'}-{'{slug}'}
                    </div>
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
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                      Owning Team <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input type="text" value={newAtom.owning_team} onChange={(e) => setNewAtom({ ...newAtom, owning_team: e.target.value, team: e.target.value })} placeholder="Customer Experience Team" className="form-input" style={{ width: '100%' }} required />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Author</label>
                    <input type="text" value={newAtom.author} onChange={(e) => setNewAtom({ ...newAtom, author: e.target.value, owner: e.target.value })} placeholder="Sarah Chen" className="form-input" style={{ width: '100%' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Steward</label>
                    <input type="text" value={newAtom.steward} onChange={(e) => setNewAtom({ ...newAtom, steward: e.target.value })} placeholder="Data Governance Team" className="form-input" style={{ width: '100%' }} />
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                    Summary <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea value={newAtom.content.summary} onChange={(e) => setNewAtom({ ...newAtom, content: { ...newAtom.content, summary: e.target.value } })} placeholder="Brief description of what this atom does..." className="form-input" style={{ width: '100%', minHeight: '60px' }} required />
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

                <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                  <button onClick={() => setCreateStep('search')} className="btn btn-secondary" style={{ flex: 1 }}>
                    ← Back
                  </button>
                  <button
                    onClick={() => setCreateStep('review')}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={!validateAtom()}
                  >
                    Review →
                  </button>
                </div>
                {!validateAtom() && (
                  <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', color: '#dc2626' }}>
                    <strong>Required fields missing:</strong> Please fill in Owning Team and Summary before proceeding.
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review & Submit */}
            {createStep === 'review' && (
              <div>
                <div style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <svg style={{ width: '20px', height: '20px', color: '#16a34a', flexShrink: 0, marginTop: '2px' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <div style={{ fontWeight: '600', color: '#166534', marginBottom: '4px' }}>Review before submitting</div>
                      <div style={{ fontSize: '13px', color: '#15803d' }}>
                        Please verify all details are correct. This atom will be added to the knowledge graph.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: 'var(--spacing-md)', color: '#111827' }}>Atom Overview</h3>
                  <div style={{ backgroundColor: '#f9fafb', padding: 'var(--spacing-md)', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--spacing-sm)', fontSize: '13px' }}>
                      <div style={{ fontWeight: '600', color: '#6b7280' }}>Atom ID:</div>
                      <div style={{ fontFamily: 'var(--font-mono)', color: '#3b82f6', fontWeight: '600' }}>
                        {generateAtomId(newAtom.category, newAtom.name)}
                      </div>

                      <div style={{ fontWeight: '600', color: '#6b7280' }}>Name:</div>
                      <div>{newAtom.name}</div>

                      <div style={{ fontWeight: '600', color: '#6b7280' }}>Category:</div>
                      <div><span className="badge badge-secondary">{newAtom.category}</span></div>

                      <div style={{ fontWeight: '600', color: '#6b7280' }}>Type:</div>
                      <div><span className="badge badge-info">{newAtom.type}</span></div>

                      <div style={{ fontWeight: '600', color: '#6b7280' }}>Owning Team:</div>
                      <div>{newAtom.owning_team || <span style={{ color: '#9ca3af' }}>Not assigned</span>}</div>

                      <div style={{ fontWeight: '600', color: '#6b7280' }}>Author:</div>
                      <div>{newAtom.author || <span style={{ color: '#9ca3af' }}>Not assigned</span>}</div>

                      <div style={{ fontWeight: '600', color: '#6b7280' }}>Steward:</div>
                      <div>{newAtom.steward || <span style={{ color: '#9ca3af' }}>Not assigned</span>}</div>

                      <div style={{ fontWeight: '600', color: '#6b7280' }}>Criticality:</div>
                      <div><span className={`badge ${newAtom.criticality === 'CRITICAL' ? 'badge-danger' : newAtom.criticality === 'HIGH' ? 'badge-warning' : 'badge-secondary'}`}>{newAtom.criticality}</span></div>

                      <div style={{ fontWeight: '600', color: '#6b7280' }}>Phase:</div>
                      <div>{newAtom.phaseId ? MOCK_PHASES.find(p => p.id === newAtom.phaseId)?.name : <span style={{ color: '#9ca3af' }}>None</span>}</div>

                      <div style={{ fontWeight: '600', color: '#6b7280' }}>Module:</div>
                      <div>{newAtom.moduleId ? modules.find(m => m.id === newAtom.moduleId)?.name : <span style={{ color: '#9ca3af' }}>None</span>}</div>
                    </div>
                  </div>
                </div>

                {newAtom.content.summary && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: 'var(--spacing-sm)', color: '#111827' }}>Summary</h3>
                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}>
                      {newAtom.content.summary}
                    </div>
                  </div>
                )}

                {newAtom.content.steps.length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: 'var(--spacing-sm)', color: '#111827' }}>Process Steps ({newAtom.content.steps.length})</h3>
                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      {newAtom.content.steps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '13px' }}>
                          <span style={{ fontWeight: '600', color: '#6b7280', minWidth: '20px' }}>{i + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {newAtom.edges.length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: 'var(--spacing-sm)', color: '#111827' }}>Edges ({newAtom.edges.length})</h3>
                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      {newAtom.edges.map((edge, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '13px', alignItems: 'center' }}>
                          <span style={{ fontWeight: '600', color: '#3b82f6', minWidth: '120px' }}>{edge.type}</span>
                          <span style={{ color: '#6b7280' }}>→</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{edge.targetId}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
                  <button onClick={() => setCreateStep('details')} className="btn btn-secondary" style={{ flex: 1 }}>
                    ← Back to Edit
                  </button>
                  <button
                    onClick={() => {
                      // Validate before creating
                      if (!validateAtom()) {
                        alert('Please fill in all required fields: Owning Team and Summary');
                        setCreateStep('details');
                        return;
                      }
                      // Set the auto-generated ID before submission
                      const generatedId = generateAtomId(newAtom.category, newAtom.name);
                      setNewAtom({ ...newAtom, id: generatedId });
                      // Call the create handler
                      handleCreateAtom();
                    }}
                    disabled={isCreating || !validateAtom()}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {isCreating ? 'Creating Atom...' : 'Create Atom ✓'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Atom Modal - Comprehensive */}
      {showEditModal && editingAtom && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '12px',
            padding: 'var(--spacing-xl)', maxWidth: '900px', width: '90%',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: 'var(--spacing-lg)' }}>
              Edit Atom: {editingAtom.id}
            </h2>

            {/* Basic Info - 2 Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Name</label>
                <input
                  type="text"
                  value={editingAtom.name || ''}
                  onChange={(e) => setEditingAtom({ ...editingAtom, name: e.target.value })}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Category</label>
                <select
                  value={editingAtom.category}
                  onChange={(e) => setEditingAtom({ ...editingAtom, category: e.target.value as AtomCategory })}
                  className="form-input"
                  style={{ width: '100%' }}
                >
                  <option value="CUSTOMER_FACING">Customer Facing</option>
                  <option value="BACK_OFFICE">Back Office</option>
                  <option value="SYSTEM">System</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Type</label>
                <select
                  value={editingAtom.type}
                  onChange={(e) => setEditingAtom({ ...editingAtom, type: e.target.value as AtomType })}
                  className="form-input"
                  style={{ width: '100%' }}
                >
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Status</label>
                <select
                  value={editingAtom.status}
                  onChange={(e) => setEditingAtom({ ...editingAtom, status: e.target.value as any })}
                  className="form-input"
                  style={{ width: '100%' }}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="DEPRECATED">DEPRECATED</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Owning Team</label>
                <input
                  type="text"
                  value={editingAtom.owning_team || editingAtom.team || ''}
                  onChange={(e) => setEditingAtom({ ...editingAtom, owning_team: e.target.value, team: e.target.value })}
                  className="form-input"
                  style={{ width: '100%' }}
                  placeholder="Customer Experience Team"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Author</label>
                <input
                  type="text"
                  value={editingAtom.author || editingAtom.owner || ''}
                  onChange={(e) => setEditingAtom({ ...editingAtom, author: e.target.value, owner: e.target.value })}
                  className="form-input"
                  style={{ width: '100%' }}
                  placeholder="Sarah Chen"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Criticality</label>
                <select
                  value={editingAtom.criticality || 'MEDIUM'}
                  onChange={(e) => setEditingAtom({ ...editingAtom, criticality: e.target.value as any })}
                  className="form-input"
                  style={{ width: '100%' }}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Phase</label>
                <select
                  value={editingAtom.phaseId || ''}
                  onChange={(e) => setEditingAtom({ ...editingAtom, phaseId: e.target.value || null })}
                  className="form-input"
                  style={{ width: '100%' }}
                >
                  <option value="">None</option>
                  {MOCK_PHASES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Module</label>
                <select
                  value={editingAtom.moduleId || ''}
                  onChange={(e) => setEditingAtom({ ...editingAtom, moduleId: e.target.value || null })}
                  className="form-input"
                  style={{ width: '100%' }}
                >
                  <option value="">None</option>
                  {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Steward</label>
                <input
                  type="text"
                  value={editingAtom.steward || ''}
                  onChange={(e) => setEditingAtom({ ...editingAtom, steward: e.target.value })}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Content Fields */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Summary</label>
              <textarea
                value={editingAtom.content?.summary || ''}
                onChange={(e) => setEditingAtom({
                  ...editingAtom,
                  content: { ...editingAtom.content, summary: e.target.value }
                })}
                className="form-input"
                style={{ width: '100%', minHeight: '60px' }}
              />
            </div>

            {/* Process Steps */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Process Steps</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={editStep}
                  onChange={(e) => setEditStep(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && editStep.trim()) {
                      setEditingAtom({
                        ...editingAtom,
                        content: {
                          ...editingAtom.content,
                          steps: [...(editingAtom.content?.steps || []), editStep]
                        }
                      });
                      setEditStep('');
                    }
                  }}
                  placeholder="Add a step..."
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => {
                    if (editStep.trim()) {
                      setEditingAtom({
                        ...editingAtom,
                        content: {
                          ...editingAtom.content,
                          steps: [...(editingAtom.content?.steps || []), editStep]
                        }
                      });
                      setEditStep('');
                    }
                  }}
                  className="btn btn-secondary"
                >
                  Add Step
                </button>
              </div>
              {(editingAtom.content?.steps || []).map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', backgroundColor: '#f8fafc', borderRadius: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)' }}>{i + 1}.</span>
                  <span style={{ flex: 1, fontSize: '13px' }}>{step}</span>
                  <button
                    onClick={() => {
                      setEditingAtom({
                        ...editingAtom,
                        content: {
                          ...editingAtom.content,
                          steps: (editingAtom.content?.steps || []).filter((_, idx) => idx !== i)
                        }
                      });
                    }}
                    style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Edges - Most Important for Workflow */}
            <div style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #0ea5e9' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#0369a1' }}>
                🔗 Edges (Relationships to Other Atoms)
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select
                  value={editEdgeType}
                  onChange={(e) => setEditEdgeType(e.target.value as EdgeType)}
                  className="form-select"
                  style={{ width: '150px' }}
                >
                  <option value="ENABLES">Enables</option>
                  <option value="REQUIRES">Requires</option>
                  <option value="DEPENDS_ON">Depends On</option>
                  <option value="TRIGGERS">Triggers</option>
                  <option value="VALIDATES">Validates</option>
                  <option value="PRODUCES">Produces</option>
                  <option value="CONSUMES">Consumes</option>
                </select>
                <input
                  type="text"
                  value={editEdgeTarget}
                  onChange={(e) => setEditEdgeTarget(e.target.value)}
                  placeholder="Target atom ID..."
                  className="form-input"
                  style={{ flex: 1 }}
                  list="atom-list-edit"
                />
                <datalist id="atom-list-edit">
                  {atoms.filter(a => a.id !== editingAtom.id).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </datalist>
                <button
                  onClick={() => {
                    if (editEdgeTarget.trim()) {
                      setEditingAtom({
                        ...editingAtom,
                        edges: [...(editingAtom.edges || []), { type: editEdgeType, targetId: editEdgeTarget }]
                      });
                      setEditEdgeTarget('');
                    }
                  }}
                  className="btn btn-secondary"
                >
                  Add Edge
                </button>
              </div>
              {(editingAtom.edges || []).map((edge, i) => {
                const targetAtom = atoms.find(a => a.id === edge.targetId);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', backgroundColor: '#ffffff', borderRadius: '4px', marginBottom: '4px', border: '1px solid #e0e7ff' }}>
                    <span className="badge" style={{ fontSize: '9px', backgroundColor: '#3b82f6' }}>{edge.type}</span>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{edge.targetId}</span>
                    {targetAtom && <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>→ {targetAtom.name}</span>}
                    <button
                      onClick={() => {
                        setEditingAtom({
                          ...editingAtom,
                          edges: (editingAtom.edges || []).filter((_, idx) => idx !== i)
                        });
                      }}
                      style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 6px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              {(editingAtom.edges || []).length === 0 && (
                <div style={{ padding: '8px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                  No edges defined. Add edges to connect this atom to others in the workflow.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
              <button
                onClick={() => { setShowEditModal(false); setEditingAtom(null); setEditStep(''); setEditEdgeTarget(''); }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleEditAtom}
                disabled={isCreating}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {isCreating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AtomExplorer;
