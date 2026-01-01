import React, { useState, useEffect } from 'react';
import { Atom, Module } from '../types';
import { Home, Upload, FileText, Zap, Users, TrendingUp, Search, BookOpen, Settings, ArrowRight } from 'lucide-react';

interface DashboardProps {
  atoms: Atom[];
  modules: Module[];
  onNavigate: (view: string) => void;
}

interface QuickActionCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
  view: string;
  color: string;
  gradient: string;
}

const Dashboard: React.FC<DashboardProps> = ({ atoms, modules, onNavigate }) => {
  const [stats, setStats] = useState({
    totalAtoms: 0,
    totalModules: 0,
    activeAtoms: 0,
    recentlyUpdated: 0
  });

  useEffect(() => {
    // Calculate stats
    const activeAtoms = atoms.filter(a => a.status === 'ACTIVE').length;
    const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const recentlyUpdated = atoms.filter(a => {
      const updated = new Date(a.updated_at || a.created_at || 0);
      return updated > recentCutoff;
    }).length;

    setStats({
      totalAtoms: atoms.length,
      totalModules: modules.length,
      activeAtoms,
      recentlyUpdated
    });
  }, [atoms, modules]);

  const quickActions: QuickActionCard[] = [
    {
      title: 'Upload Documents',
      description: 'Transform existing documents into reusable atoms with AI-powered decomposition',
      icon: <Upload className="w-6 h-6" />,
      actionLabel: 'Start Upload',
      view: 'ingestion',
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    },
    {
      title: 'Compile Documents',
      description: 'Generate professional documents from atoms using AI templates',
      icon: <FileText className="w-6 h-6" />,
      actionLabel: 'Open Publisher',
      view: 'publisher',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    {
      title: 'Browse Atoms',
      description: 'Explore your atom registry and view relationships',
      icon: <Search className="w-6 h-6" />,
      actionLabel: 'Browse Registry',
      view: 'explorer',
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
    },
    {
      title: 'Manage Modules',
      description: 'Organize atoms into modules and define workflows',
      icon: <Settings className="w-6 h-6" />,
      actionLabel: 'View Modules',
      view: 'modules',
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    }
  ];

  const workflows: { title: string; description: string; steps: string[]; view: string }[] = [
    {
      title: 'Document Decomposition Workflow',
      description: 'Turn existing documents into reusable atoms',
      steps: [
        'Upload document → Data Ingestion',
        'AI extracts concepts → Review staging',
        'Verify reuse vs new atoms',
        'Commit to graph database'
      ],
      view: 'ingestion'
    },
    {
      title: 'Document Compilation Workflow',
      description: 'Generate new documents from atoms',
      steps: [
        'Select module → Publisher',
        'Choose template (SOP, Technical, etc.)',
        'AI compiles from atoms',
        'Auto-publish to RAG & docs'
      ],
      view: 'publisher'
    },
    {
      title: 'Analysis & Optimization',
      description: 'Monitor quality and optimize your knowledge graph',
      steps: [
        'View analytics → Graph Analytics',
        'Check anomalies → Anomaly Detection',
        'Review impact → Impact Analysis',
        'Validate structure → Validation'
      ],
      view: 'analytics'
    }
  ];

  return (
    <div style={{ padding: '48px', maxWidth: '1400px', margin: '0 auto', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Home className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 style={{
              fontSize: '36px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '4px'
            }}>
              Welcome to GNDP
            </h1>
            <p style={{ fontSize: '16px', color: '#64748b' }}>
              Graph-Native Documentation Platform
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '24px',
        marginBottom: '48px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Total Atoms</div>
            <BookOpen className="w-5 h-5 text-blue-500" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{stats.totalAtoms}</div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
            {stats.activeAtoms} active
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Modules</div>
            <Settings className="w-5 h-5 text-purple-500" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{stats.totalModules}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Organized workflows
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Recent Updates</div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{stats.recentlyUpdated}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Last 7 days
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Atom Reuse</div>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>
            {stats.totalAtoms > 0 ? Math.round((stats.totalAtoms / (stats.totalAtoms + stats.totalModules)) * 100) : 0}%
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Deduplication rate
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>
          Quick Actions
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {quickActions.map((action, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={() => onNavigate(action.view)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              }}
            >
              {/* Gradient accent bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: action.gradient
              }} />

              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: action.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                color: 'white'
              }}>
                {action.icon}
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                {action.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', lineHeight: '1.5' }}>
                {action.description}
              </p>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: action.color
              }}>
                {action.actionLabel}
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Common Workflows */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>
          Common Workflows
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '24px'
        }}>
          {workflows.map((workflow, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb'
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                {workflow.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                {workflow.description}
              </p>

              <div style={{ marginBottom: '16px' }}>
                {workflow.steps.map((step, stepIdx) => (
                  <div key={stepIdx} style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#eff6ff',
                      border: '2px solid #3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#3b82f6',
                      flexShrink: 0
                    }}>
                      {stepIdx + 1}
                    </div>
                    <div style={{ fontSize: '13px', color: '#475569', paddingTop: '2px' }}>
                      {step}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onNavigate(workflow.view)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#eff6ff';
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                Start Workflow →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Getting Started Guide */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>
          Getting Started
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>
              New to GNDP?
            </h3>
            <ul style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.8', paddingLeft: '20px' }}>
              <li><strong>Atoms</strong> are the smallest reusable units of knowledge (processes, roles, documents, etc.)</li>
              <li><strong>Modules</strong> group related atoms into workflows and phases</li>
              <li><strong>Publisher</strong> compiles atoms into professional documents using AI templates</li>
              <li><strong>RAG</strong> (Retrieval Augmented Generation) powers semantic search across all content</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>
              Key Features
            </h3>
            <ul style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.8', paddingLeft: '20px' }}>
              <li><strong>AI-Powered Deduplication:</strong> Automatically reuses existing atoms ({'>'}70% reuse rate)</li>
              <li><strong>Semantic Similarity Check:</strong> Catches potential duplicates before commit</li>
              <li><strong>Dynamic Templates:</strong> Create unlimited custom document templates</li>
              <li><strong>Full Traceability:</strong> Every document maintains links to source atoms</li>
            </ul>
          </div>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#eff6ff',
          borderRadius: '8px',
          border: '1px solid #dbeafe'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e3a8a' }}>
                Primary Use Case: Document Lifecycle
              </div>
              <div style={{ fontSize: '13px', color: '#1e40af', marginTop: '4px' }}>
                Upload old documents → Decompose into atoms → Recompile with AI templates → Publish to RAG → No duplication
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
