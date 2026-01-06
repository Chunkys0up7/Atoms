import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './components/ui/Sidebar';
import Breadcrumb, { buildBreadcrumbs } from './components/ui/Breadcrumb';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { useGraph } from './contexts/GraphContext';
import { ViewType, Atom } from './types';
import { ATOM_COLORS, MOCK_PHASES, MOCK_JOURNEYS, API_ENDPOINTS } from './constants';

// Feature Components
import SmartDashboard from './components/features/dashboard/SmartDashboard';
import GraphView from './components/features/graph/GraphView';
import AtomExplorer from './components/features/ontology/AtomExplorer';
import ModuleExplorer from './components/features/ontology/ModuleExplorer';
import EdgeExplorer from './components/features/ontology/EdgeExplorer';
import ImpactAnalysisUI from './components/features/analytics/ImpactAnalysisUI';
import AIAssistant from './components/features/assistant/AIAssistantEnhanced';
import ValidationCenter from './components/features/analytics/ValidationCenter';
import Publisher from './components/features/ingestion/PublisherEnhanced';
import IngestionEngine from './components/features/ingestion/IngestionEngine';
import OntologyBrowser from './components/features/ontology/OntologyBrowser';
import DocumentLibrary from './components/features/docs/DocumentLibrary';
import MkDocsViewer from './components/features/docs/MkDocsViewerEnhanced';
import WorkflowBuilderEnhanced from './components/features/workflow/WorkflowBuilderEnhanced';
import PhaseExplorer from './components/features/ontology/PhaseExplorer';
import Glossary from './components/features/docs/Glossary';
import RuntimeSimulator from './components/RuntimeSimulator';
import RuleManager from './components/features/ontology/RuleManager';
import LineageViewer from './components/features/analytics/LineageViewer';
import OptimizationDashboard from './components/features/analytics/OptimizationDashboard';
import OwnershipDashboard from './components/features/analytics/OwnershipDashboard';
import AnalyticsHub from './components/features/analytics/AnalyticsHub';
import GraphAnalyticsDashboard from './components/features/analytics/GraphAnalyticsDashboard';
import KnowledgeHub from './components/features/knowledge/KnowledgeHub';
import AnomalyDetectionDashboard from './components/features/analytics/AnomalyDetectionDashboard';
import CollaborativeAtomEditor from './components/CollaborativeAtomEditor';
import ProcessMonitoringDashboard from './components/features/analytics/ProcessMonitoringDashboard';
import AtomDetailsSidebar from './components/ui/AtomDetailsSidebar';

import './styles.css';

const App: React.FC = () => {
  const { atoms, modules, phases, journeys, isLoading, error, loadData, ingestData, graphPlanner, governanceEngine, auditLog } = useGraph();
  const navigate = useNavigate();
  const location = useLocation();

  // Local UI state that doesn't need to be global
  const [selectedAtom, setSelectedAtom] = useState<Atom | null>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [graphContext, setGraphContext] = useState<any>({ mode: 'global' });

  // Map current path to ViewType for Sidebar compatibility
  const getCurrentView = (): ViewType => {
    const path = location.pathname.substring(1);
    if (path === '') return 'dashboard';
    return path as ViewType;
  };

  const handleAtomSelect = (atom: Atom) => {
    setSelectedAtom(atom);
    // Optionally navigate to details view or keep sidebar selection
    // navigate(`/atoms/${atom.id}`); 
  };

  // Shared navigation handler for components
  const handleNavigate = (view: string, context?: any) => {
    if (context?.moduleId) setSelectedModuleId(context.moduleId);
    if (context?.phaseId) setSelectedPhaseId(context.phaseId);
    if (context?.journeyId) setSelectedJourneyId(context.journeyId);
    if (context?.graphContext) setGraphContext(context.graphContext);

    navigate(`/${view}`);
  };

  if (isLoading) {
    return (
      <div className="content-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Loading data from server...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ color: 'var(--color-error)', fontSize: '16px', fontWeight: '600' }}>Error Loading Data</div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', maxWidth: '400px', textAlign: 'center' }}>{error}</div>
        <button onClick={loadData} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">GNDP System</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
            Documentation Registry
          </div>
        </div>
        <Sidebar currentView={getCurrentView()} onViewChange={(view) => navigate(`/${view === 'dashboard' ? '' : view}`)} />
      </aside>

      <main className="main-content" role="main">
        <header className="app-header" role="banner">
          <div className="header-title">
            <span className="header-breadcrumb">System Registry</span>
            <span style={{ color: 'var(--color-border-dark)', margin: '0 8px' }}>/</span>
            <span className="header-view-name">
              {getCurrentView().replace('_', ' ').charAt(0).toUpperCase() + getCurrentView().replace('_', ' ').slice(1)}
            </span>
          </div>

          <div className="header-actions">
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textAlign: 'right' }} aria-live="polite">
              <div style={{ fontWeight: '600', marginBottom: '2px' }}>Total Atoms: {atoms.length}</div>
              <div>Modules: {modules.length}</div>
            </div>
            <button
              onClick={loadData}
              className="btn"
              title="Refresh data"
              aria-label="Refresh atom and module data"
            >
              <svg style={{ width: '14px', height: '14px', display: 'inline-block', verticalAlign: 'middle' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </header>

        {/* 
          TODO: Breadcrumb needs update to generic routing support 
          For now, simplistic implementation
        */}
        <div style={{ padding: '0 var(--spacing-lg) var(--spacing-sm) var(--spacing-lg)' }}>
          {/* Breadcrumb would go here */}
        </div>

        <div className="content-area">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<SmartDashboard atoms={atoms} modules={modules} onNavigate={handleNavigate} />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />

              <Route path="/knowledge" element={
                <KnowledgeHub
                  atoms={atoms}
                  modules={modules}
                  phases={phases}
                  journeys={journeys}
                  onSelectAtom={handleAtomSelect}
                  onNavigateToGraph={(moduleId) => handleNavigate('graph', { moduleId, graphContext: { mode: 'module', moduleId, expandDependencies: true } })}
                />
              } />
              <Route path="/ontology" element={<Navigate to="/knowledge" replace />} />
              <Route path="/explorer" element={<Navigate to="/knowledge" replace />} />
              <Route path="/modules" element={<Navigate to="/knowledge" replace />} />
              <Route path="/atoms" element={<Navigate to="/knowledge" replace />} />
              <Route path="/glossary" element={<Glossary />} />

              <Route path="/workflow" element={
                <WorkflowBuilderEnhanced
                  atoms={atoms}
                  modules={modules}
                  onSelectAtom={handleAtomSelect}
                  onNavigateToGraph={(journeyId) => handleNavigate('graph', { journeyId, graphContext: { mode: 'journey', journeyId } })}
                  onNavigateToPhase={(phaseId) => handleNavigate('phases', { phaseId })}
                />
              } />

              <Route path="/phases" element={
                <PhaseExplorer
                  phases={phases.length > 0 ? phases : MOCK_PHASES}
                  journeys={journeys.length > 0 ? journeys : MOCK_JOURNEYS}
                  modules={modules}
                  atoms={atoms}
                  onPhaseSelect={(phase) => setSelectedPhaseId(phase.id)}
                  onNavigateToGraph={(phaseId) => handleNavigate('graph', { phaseId, graphContext: { mode: 'phase', phaseId, showModuleBoundaries: true } })}
                  onNavigateToModule={(moduleId) => handleNavigate('modules', { moduleId })}
                  selectedPhaseId={selectedPhaseId}
                />
              } />

              {/* Obsolete routes redirected to Knowledge Hub */}

              <Route path="/graph" element={
                <GraphView
                  atoms={atoms}
                  modules={modules}
                  phases={phases.length > 0 ? phases : MOCK_PHASES}
                  journeys={journeys.length > 0 ? journeys : MOCK_JOURNEYS}
                  context={graphContext}
                  onSelectAtom={handleAtomSelect}
                  // onContextChange={setGraphContext} // Need to adapt to local state/URL
                  onNavigateToJourney={(journeyId) => handleNavigate('workflow', { journeyId })}
                  onNavigateToPhase={(phaseId) => handleNavigate('phases', { phaseId })}
                  onNavigateToModule={(moduleId) => handleNavigate('modules', { moduleId })}
                />
              } />

              <Route path="/edges" element={<EdgeExplorer atoms={atoms} onSelectAtom={handleAtomSelect} />} />

              <Route path="/validation" element={<ValidationCenter atoms={atoms} modules={modules} onFocusAtom={(a) => { handleAtomSelect(a); navigate('/explorer'); }} />} />
              <Route path="/health" element={<Navigate to="/validation" replace />} />

              <Route path="/impact" element={<ImpactAnalysisUI atoms={atoms} />} />
              <Route path="/publisher" element={<Publisher atoms={atoms} modules={modules} />} />
              <Route path="/library" element={<DocumentLibrary />} />
              <Route path="/documents" element={<Navigate to="/library" replace />} />
              <Route path="/docssite" element={<MkDocsViewer />} />

              <Route path="/assistant" element={
                <AIAssistant
                  atoms={atoms}
                />
              } />

              <Route path="/ingestion" element={<IngestionEngine atoms={atoms} onIngest={ingestData} />} />
              <Route path="/runtime" element={<RuntimeSimulator />} />
              <Route path="/rules" element={<RuleManager />} />

              {/* Analytics Hub Routes */}
              <Route path="/analytics" element={<AnalyticsHub atoms={atoms} modules={modules} />} />
              <Route path="/ownership" element={<Navigate to="/analytics" replace />} />
              <Route path="/anomalies" element={<Navigate to="/analytics" replace />} />
              <Route path="/optimization" element={<Navigate to="/analytics" replace />} />
              <Route path="/feedback" element={<Navigate to="/analytics" replace />} />

              <Route path="/collaborate" element={
                selectedAtom ? (
                  <CollaborativeAtomEditor
                    atom_id={selectedAtom.id}
                    user_id="user-demo"
                    user_name="Demo User"
                    onSave={async (atom) => {
                      // Governance Check is now potentially internal to the context or we keep it here
                      if (governanceEngine) {
                        const ctx = { environment: 'production' as const, userRole: 'admin', licenseType: 'enterprise' };
                        const policyCheck = governanceEngine.isActionAllowed('UPDATE', atom, ctx);
                        if (!policyCheck.allowed) {
                          alert(`Blocked by Policy: ${policyCheck.reason}`);
                          throw new Error(policyCheck.reason);
                        }
                      }
                      // API Save... logic
                      // Ideally this moves to a useMutation or context method
                      const response = await fetch(`${API_ENDPOINTS.atoms}/${atom.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(atom)
                      });
                      if (!response.ok) throw new Error('Failed to save atom');
                      await loadData();
                    }}
                    onConflict={(conflicts) => console.warn('Conflicts:', conflicts)}
                  />
                ) : (
                  <div className="content-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '16px', color: 'var(--color-text-secondary)' }}>
                      Select an atom to collaborate on
                    </div>
                    <button onClick={() => navigate('/explorer')} className="btn btn-primary">
                      Go to Atom Explorer
                    </button>
                  </div>
                )
              } />

              <Route path="/processes" element={<ProcessMonitoringDashboard />} />

              <Route path="*" element={<div className="content-area">Page not found</div>} />
            </Routes>
          </ErrorBoundary>
        </div>

        {/* Right Sidebar for Selected Atom Details */}
        {selectedAtom && (
          <AtomDetailsSidebar
            atom={selectedAtom}
            modules={modules}
            allAtoms={atoms}
            onClose={() => setSelectedAtom(null)}
            onSelectAtom={handleAtomSelect}
            onNavigate={(view) => navigate(`/${view}`)}
          />
        )}

      </main>
    </div>
  );
};

export default App;
