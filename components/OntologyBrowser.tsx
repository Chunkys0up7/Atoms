import React, { useState, useMemo } from 'react';
import { Atom, Module, AtomType, EdgeType, AtomCategory } from '../types';
import { ATOM_COLORS } from '../constants';
import OntologySchemaEditor from './OntologySchemaEditor';

interface OntologyBrowserProps {
  atoms: Atom[];
  modules: Module[];
  onSelectAtom?: (atom: Atom) => void;
}

type BrowserView = 'hierarchy' | 'domains' | 'types' | 'edges' | 'attributes';

const OntologyBrowser: React.FC<OntologyBrowserProps> = ({ atoms, modules, onSelectAtom }) => {
  const [view, setView] = useState<BrowserView>('hierarchy');
  const [selectedType, setSelectedType] = useState<AtomType | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedEdgeType, setSelectedEdgeType] = useState<EdgeType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);

  // Calculate domain statistics
  const domainStats = useMemo(() => {
    const stats: Record<string, { count: number; types: Set<AtomType> }> = {};
    atoms.forEach(atom => {
      if (!stats[atom.ontologyDomain]) {
        stats[atom.ontologyDomain] = { count: 0, types: new Set() };
      }
      stats[atom.ontologyDomain].count++;
      stats[atom.ontologyDomain].types.add(atom.type);
    });
    return stats;
  }, [atoms]);

  // Calculate type statistics
  const typeStats = useMemo(() => {
    const stats: Record<AtomType, number> = {} as Record<AtomType, number>;
    atoms.forEach(atom => {
      stats[atom.type] = (stats[atom.type] || 0) + 1;
    });
    return stats;
  }, [atoms]);

  // Calculate edge statistics
  const edgeStats = useMemo(() => {
    const stats: Record<EdgeType, number> = {} as Record<EdgeType, number>;
    atoms.forEach(atom => {
      atom.edges.forEach(edge => {
        stats[edge.type] = (stats[edge.type] || 0) + 1;
      });
    });
    return stats;
  }, [atoms]);

  // Get filtered atoms
  const filteredAtoms = useMemo(() => {
    let filtered = atoms;

    if (selectedType) {
      filtered = filtered.filter(a => a.type === selectedType);
    }

    if (selectedDomain) {
      filtered = filtered.filter(a => a.ontologyDomain === selectedDomain);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.id.toLowerCase().includes(query) ||
        a.name.toLowerCase().includes(query) ||
        a.ontologyDomain.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [atoms, selectedType, selectedDomain, searchQuery]);

  // Hierarchy View
  const renderHierarchyView = () => {
    const hierarchyLevels = [
      {
        level: 'JOURNEY',
        name: 'Journey',
        description: 'End-to-end business processes from start to completion',
        icon: '🌍',
        color: '#3b82f6',
        count: 1,
        examples: ['Purchase Loan Journey', 'Refinance Journey']
      },
      {
        level: 'PHASE',
        name: 'Phase',
        description: 'Major operational stages and milestones within a journey',
        icon: '🏁',
        color: '#8b5cf6',
        count: 1,
        examples: ['Processing', 'Underwriting', 'Closing']
      },
      {
        level: 'MODULE',
        name: 'Module',
        description: 'Reusable workflow patterns grouping related atoms',
        icon: '📦',
        color: '#10b981',
        count: modules.length,
        examples: modules.slice(0, 3).map(m => m.name)
      },
      {
        level: 'ATOM',
        name: 'Atom',
        description: 'Indivisible operational units: customer-facing, back-office, or system',
        icon: '⚛️',
        color: '#f59e0b',
        count: atoms.length,
        examples: atoms.slice(0, 3).map(a => a.name)
      }
    ];

    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          Ontology Hierarchy
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)' }}>
          Four-layer architecture from journeys to atomic operations
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {hierarchyLevels.map((level, index) => (
            <div key={level.level} style={{ position: 'relative' }}>
              {index > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '20px',
                  color: 'var(--color-primary)'
                }}>
                  ↓
                </div>
              )}
              <div style={{
                border: '2px solid var(--color-border)',
                borderRadius: '12px',
                padding: 'var(--spacing-xl)',
                backgroundColor: '#ffffff',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flex: 1 }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: level.color + '20',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px'
                    }}>
                      {level.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                          {level.name}
                        </h3>
                        <span className="badge" style={{ fontSize: '10px', backgroundColor: level.color }}>
                          {level.level}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)', lineHeight: '1.5' }}>
                        {level.description}
                      </p>
                      {level.examples.length > 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                          <strong>Examples:</strong> {level.examples.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '80px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: level.color }}>
                      {level.count}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                      Total
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Domain Browser View
  const renderDomainView = () => {
    const domains = Object.entries(domainStats).sort((a, b) => b[1].count - a[1].count);

    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Ontology Domains
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Browse atoms by business domain ownership
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-lg)' }}>
          {domains.map(([domain, stats]) => {
            const isSelected = selectedDomain === domain;
            return (
              <div
                key={domain}
                onClick={() => setSelectedDomain(isSelected ? null : domain)}
                style={{
                  border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: '8px',
                  padding: 'var(--spacing-lg)',
                  backgroundColor: isSelected ? 'var(--color-primary-light)' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? 'var(--shadow-md)' : 'none'
                }}
              >
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-sm)' }}>
                  {domain}
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    {stats.count} atoms
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    {stats.types.size} types
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {Array.from(stats.types).map(type => (
                    <span key={type} className="badge" style={{ fontSize: '9px', backgroundColor: ATOM_COLORS[type] }}>
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {selectedDomain && (
          <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-xl)', borderTop: '2px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-md)' }}>
              Atoms in {selectedDomain} ({filteredAtoms.length})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--spacing-md)' }}>
              {filteredAtoms.slice(0, 12).map(atom => (
                <div
                  key={atom.id}
                  onClick={() => onSelectAtom?.(atom)}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    padding: 'var(--spacing-md)',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                    {atom.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '6px' }}>
                    {atom.id}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <span className="badge" style={{ fontSize: '9px', backgroundColor: ATOM_COLORS[atom.type] }}>
                      {atom.type}
                    </span>
                    <span className="badge" style={{ fontSize: '9px' }}>
                      {atom.criticality}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {filteredAtoms.length > 12 && (
              <div style={{ textAlign: 'center', marginTop: 'var(--spacing-lg)', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                +{filteredAtoms.length - 12} more atoms
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Type Browser View
  const renderTypeView = () => {
    const types = Object.entries(typeStats).sort((a, b) => b[1] - a[1]);

    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Entity Types
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Browse atoms by type classification
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
          {types.map(([type, count]) => {
            const atomType = type as AtomType;
            const isSelected = selectedType === atomType;
            return (
              <div
                key={type}
                onClick={() => setSelectedType(isSelected ? null : atomType)}
                style={{
                  border: `2px solid ${isSelected ? ATOM_COLORS[atomType] : 'var(--color-border)'}`,
                  borderRadius: '8px',
                  padding: 'var(--spacing-lg)',
                  backgroundColor: isSelected ? ATOM_COLORS[atomType] + '20' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '28px', fontWeight: '700', color: ATOM_COLORS[atomType], marginBottom: '8px' }}>
                  {count}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                  {type}
                </div>
              </div>
            );
          })}
        </div>

        {selectedType && (
          <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-xl)', borderTop: '2px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-md)' }}>
              {selectedType} Atoms ({filteredAtoms.length})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--spacing-md)' }}>
              {filteredAtoms.map(atom => (
                <div
                  key={atom.id}
                  onClick={() => onSelectAtom?.(atom)}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    padding: 'var(--spacing-md)',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                    {atom.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '6px' }}>
                    {atom.id}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <span className="badge" style={{ fontSize: '9px' }}>
                      {atom.category}
                    </span>
                    <span className="badge" style={{ fontSize: '9px' }}>
                      {atom.criticality}
                    </span>
                    <span className="badge" style={{ fontSize: '9px' }}>
                      {atom.ontologyDomain}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Edge Browser View
  const renderEdgeView = () => {
    const edgeCategories = {
      Dependency: [EdgeType.DEPENDS_ON, EdgeType.ENABLES],
      Composition: [EdgeType.COMPONENT_OF, EdgeType.USES_COMPONENT],
      Semantic: [EdgeType.IMPLEMENTS, EdgeType.GOVERNED_BY, EdgeType.REQUIRES_KNOWLEDGE_OF],
      Workflow: [EdgeType.PARALLEL_WITH, EdgeType.ESCALATES_TO, EdgeType.DATA_FLOWS_TO],
      Lifecycle: [EdgeType.SUPERSEDES, EdgeType.REFERENCES]
    };

    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Relationship Types
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Browse edge types and their usage across the graph
          </p>
        </div>

        {Object.entries(edgeCategories).map(([category, edgeTypes]) => (
          <div key={category} style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-md)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {category} Edges
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--spacing-md)' }}>
              {edgeTypes.map(edgeType => {
                const count = edgeStats[edgeType] || 0;
                const isSelected = selectedEdgeType === edgeType;
                return (
                  <div
                    key={edgeType}
                    onClick={() => setSelectedEdgeType(isSelected ? null : edgeType)}
                    style={{
                      border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: '8px',
                      padding: 'var(--spacing-md)',
                      backgroundColor: isSelected ? 'var(--color-primary-light)' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                        {edgeType}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-primary)' }}>
                        {count}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                      {count} relationships
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-secondary)' }}>
      {/* Header with View Tabs */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--color-border)',
        padding: 'var(--spacing-lg) var(--spacing-xl)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              Ontology Browser
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Interactive exploration of the system ontology
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <button
              className="btn btn-primary"
              onClick={() => setShowSchemaEditor(true)}
              style={{ fontSize: '12px' }}
            >
              <svg style={{ width: '12px', height: '12px', marginRight: '4px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Schema Editor
            </button>
            <input
              type="text"
              placeholder="Search atoms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                width: '240px'
              }}
            />
          </div>
        </div>

        {/* View Mode Tabs */}
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-border)', marginTop: 'var(--spacing-md)' }}>
          {[
            { id: 'hierarchy' as BrowserView, label: 'Hierarchy' },
            { id: 'domains' as BrowserView, label: 'Domains' },
            { id: 'types' as BrowserView, label: 'Types' },
            { id: 'edges' as BrowserView, label: 'Relationships' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setView(tab.id);
                setSelectedType(null);
                setSelectedDomain(null);
                setSelectedEdgeType(null);
              }}
              style={{
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: '600',
                color: view === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${view === tab.id ? 'var(--color-primary)' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {view === 'hierarchy' && renderHierarchyView()}
        {view === 'domains' && renderDomainView()}
        {view === 'types' && renderTypeView()}
        {view === 'edges' && renderEdgeView()}
      </div>

      {/* Schema Editor Modal */}
      {showSchemaEditor && (
        <OntologySchemaEditor
          onSave={(domains, constraints) => {
            console.log('Schema saved:', { domains, constraints });
            // In production, this would sync with backend
            setShowSchemaEditor(false);
          }}
          onCancel={() => setShowSchemaEditor(false)}
        />
      )}
    </div>
  );
};

export default OntologyBrowser;
