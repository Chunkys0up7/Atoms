import React, { useState, useEffect } from 'react';
import { AtomType, EdgeType, AtomCategory } from '../types';

interface DomainDefinition {
  id: string;
  name: string;
  description: string;
  owner: string;
  allowedTypes: AtomType[];
  requiredAttributes: string[];
  validationRules: string[];
}

interface EdgeConstraint {
  edgeType: EdgeType;
  sourceTypes: AtomType[];
  targetTypes: AtomType[];
  description: string;
  required: boolean;
}

interface OntologySchemaEditorProps {
  onSave: (domains: DomainDefinition[], constraints: EdgeConstraint[]) => void;
  onCancel: () => void;
}

const OntologySchemaEditor: React.FC<OntologySchemaEditorProps> = ({ onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'domains' | 'constraints' | 'validation'>('domains');
  const [isLoading, setIsLoading] = useState(true);

  // Domain Management State
  const [domains, setDomains] = useState<DomainDefinition[]>([
    {
      id: 'loan-origination',
      name: 'Loan Origination',
      description: 'All processes related to loan application and approval',
      owner: 'Lending Operations',
      allowedTypes: [AtomType.PROCESS, AtomType.DECISION, AtomType.DOCUMENT, AtomType.CONTROL],
      requiredAttributes: ['owner', 'criticality', 'compliance_score'],
      validationRules: ['Must have at least one CONTROL atom', 'All DECISION atoms must have success_criteria']
    },
    {
      id: 'risk-management',
      name: 'Risk Management',
      description: 'Risk identification, assessment, and mitigation processes',
      owner: 'Risk Department',
      allowedTypes: [AtomType.RISK, AtomType.CONTROL, AtomType.POLICY, AtomType.METRIC],
      requiredAttributes: ['owner', 'criticality', 'risk_level'],
      validationRules: ['All RISK atoms must have at least one CONTROL', 'METRIC atoms must define measurement criteria']
    },
    {
      id: 'compliance',
      name: 'Compliance & Regulatory',
      description: 'Regulatory compliance and policy enforcement',
      owner: 'Compliance Team',
      allowedTypes: [AtomType.REGULATION, AtomType.POLICY, AtomType.CONTROL, AtomType.DOCUMENT],
      requiredAttributes: ['regulatory_context', 'effective_date', 'compliance_score'],
      validationRules: ['REGULATION atoms must reference external regulation ID', 'POLICY atoms must have approval_chain']
    }
  ]);

  const [selectedDomain, setSelectedDomain] = useState<DomainDefinition | null>(null);
  const [showDomainEditor, setShowDomainEditor] = useState(false);

  // Edge Constraint State
  const [constraints, setConstraints] = useState<EdgeConstraint[]>([
    {
      edgeType: EdgeType.DEPENDS_ON,
      sourceTypes: [AtomType.PROCESS, AtomType.DECISION],
      targetTypes: [AtomType.PROCESS, AtomType.DECISION, AtomType.GATEWAY],
      description: 'Process/Decision can depend on other processes, decisions, or gateways',
      required: false
    },
    {
      edgeType: EdgeType.GOVERNED_BY,
      sourceTypes: [AtomType.PROCESS, AtomType.DECISION],
      targetTypes: [AtomType.REGULATION, AtomType.POLICY],
      description: 'Processes and decisions must be governed by regulations or policies',
      required: true
    },
    {
      edgeType: EdgeType.IMPLEMENTS,
      sourceTypes: [AtomType.PROCESS, AtomType.CONTROL],
      targetTypes: [AtomType.POLICY, AtomType.REGULATION],
      description: 'Processes/Controls implement policies or regulations',
      required: false
    }
  ]);

  const [selectedConstraint, setSelectedConstraint] = useState<EdgeConstraint | null>(null);
  const [showConstraintEditor, setShowConstraintEditor] = useState(false);

  // Load schema data from backend on mount
  useEffect(() => {
    const loadSchemaData = async () => {
      try {
        setIsLoading(true);

        // Load domains
        const domainsResponse = await fetch('http://localhost:8000/api/schema/domains');
        if (domainsResponse.ok) {
          const backendDomains = await domainsResponse.json();
          // Map backend format to frontend format
          const mappedDomains = backendDomains.map((d: any) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            owner: d.owner || 'Not Assigned',
            allowedTypes: d.allowed_types || [],
            requiredAttributes: d.required_attributes || [],
            validationRules: d.validation_rules || []
          }));
          setDomains(mappedDomains);
          console.log('[OntologySchemaEditor] Loaded domains from backend:', mappedDomains.length);
        }

        // Load constraints
        const constraintsResponse = await fetch('http://localhost:8000/api/schema/constraints');
        if (constraintsResponse.ok) {
          const backendConstraints = await constraintsResponse.json();
          // Map backend format to frontend format
          const mappedConstraints = backendConstraints.map((c: any) => ({
            edgeType: c.edge_type,
            sourceTypes: [c.source_type],
            targetTypes: [c.target_type],
            description: c.description,
            required: c.is_required || false
          }));
          setConstraints(mappedConstraints);
          console.log('[OntologySchemaEditor] Loaded constraints from backend:', mappedConstraints.length);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('[OntologySchemaEditor] Failed to load schema data:', error);
        setIsLoading(false);
        // Keep using default hardcoded data on error
      }
    };

    loadSchemaData();
  }, []);

  // Domain Editor
  const renderDomainManagement = () => {
    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              Domain Definitions
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Define business domains and their allowed entity types
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSelectedDomain(null);
              setShowDomainEditor(true);
            }}
          >
            <svg style={{ width: '12px', height: '12px', marginRight: '4px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Domain
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 'var(--spacing-lg)' }}>
          {domains.map(domain => (
            <div
              key={domain.id}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: 'var(--spacing-lg)',
                backgroundColor: '#ffffff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                    {domain.name}
                  </h4>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    ID: {domain.id}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => {
                      setSelectedDomain(domain);
                      setShowDomainEditor(true);
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: '4px',
                      color: 'var(--color-primary)'
                    }}
                  >
                    <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDomains(prev => prev.filter(d => d.id !== domain.id))}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: '4px',
                      color: '#ef4444'
                    }}
                  >
                    <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.4', marginBottom: 'var(--spacing-md)' }}>
                {domain.description}
              </p>

              <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Owner
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {domain.owner}
                </div>
              </div>

              <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Allowed Types ({domain.allowedTypes.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {domain.allowedTypes.map(type => (
                    <span key={type} className="badge" style={{ fontSize: '9px' }}>
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Required Attributes
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  {domain.requiredAttributes.join(', ')}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Validation Rules ({domain.validationRules.length})
                </div>
                <ul style={{ fontSize: '11px', color: 'var(--color-text-secondary)', paddingLeft: '16px', margin: 0 }}>
                  {domain.validationRules.map((rule, i) => (
                    <li key={i}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Edge Constraint Management
  const renderConstraintManagement = () => {
    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              Edge Constraints
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Define valid relationships between entity types
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSelectedConstraint(null);
              setShowConstraintEditor(true);
            }}
          >
            <svg style={{ width: '12px', height: '12px', marginRight: '4px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Constraint
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {constraints.map((constraint, index) => (
            <div
              key={index}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: 'var(--spacing-lg)',
                backgroundColor: '#ffffff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                      {constraint.edgeType}
                    </h4>
                    {constraint.required && (
                      <span className="badge" style={{ fontSize: '9px', backgroundColor: '#ef4444' }}>
                        REQUIRED
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                    {constraint.description}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => {
                      setSelectedConstraint(constraint);
                      setShowConstraintEditor(true);
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: '4px',
                      color: 'var(--color-primary)'
                    }}
                  >
                    <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setConstraints(prev => prev.filter((_, i) => i !== index))}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: '4px',
                      color: '#ef4444'
                    }}
                  >
                    <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Source Types
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {constraint.sourceTypes.map(type => (
                      <span key={type} className="badge" style={{ fontSize: '9px' }}>
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-primary)' }}>
                  →
                </div>

                <div>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Target Types
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {constraint.targetTypes.map(type => (
                      <span key={type} className="badge" style={{ fontSize: '9px' }}>
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Validation Summary
  const renderValidationSummary = () => {
    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-md)' }}>
          Schema Validation Summary
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
          <div style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: 'var(--spacing-lg)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '6px' }}>
              {domains.length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Registered Domains
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: 'var(--spacing-lg)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981', marginBottom: '6px' }}>
              {constraints.length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Edge Constraints
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: 'var(--spacing-lg)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b', marginBottom: '6px' }}>
              {domains.reduce((sum, d) => sum + d.validationRules.length, 0)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Validation Rules
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
            Schema Overview
          </div>
          <ul style={{ fontSize: '12px', color: '#1e3a8a', paddingLeft: '20px', margin: 0 }}>
            <li>All domains have defined ownership and allowed types</li>
            <li>{constraints.filter(c => c.required).length} required edge constraints enforced</li>
            <li>Type safety ensures atoms can only exist in valid domains</li>
            <li>Validation rules prevent schema violations at creation time</li>
          </ul>
        </div>
      </div>
    );
  };

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
                Ontology Schema Editor
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Define domains, entity types, and relationship constraints for your knowledge graph
              </p>
            </div>
            <button onClick={onCancel} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}>
              <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 var(--spacing-xl)'
        }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            {[
              { id: 'domains' as const, label: 'Domain Definitions' },
              { id: 'constraints' as const, label: 'Edge Constraints' },
              { id: 'validation' as const, label: 'Validation Summary' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === tab.id ? 'var(--color-primary)' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--color-bg-secondary)' }}>
          {activeTab === 'domains' && renderDomainManagement()}
          {activeTab === 'constraints' && renderConstraintManagement()}
          {activeTab === 'validation' && renderValidationSummary()}
        </div>

        {/* Footer */}
        <div style={{
          padding: 'var(--spacing-lg)',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--spacing-md)'
        }}>
          <button onClick={onCancel} className="btn">
            Cancel
          </button>
          <button onClick={() => onSave(domains, constraints)} className="btn btn-primary">
            Save Schema Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default OntologySchemaEditor;
