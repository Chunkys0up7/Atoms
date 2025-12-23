import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import GraphView from './components/GraphView';
import AtomExplorer from './components/AtomExplorer';
import ModuleExplorer from './components/ModuleExplorer';
import EdgeExplorer from './components/EdgeExplorer';
import ImpactAnalysisUI from './components/ImpactAnalysisUI';
import AIAssistant from './components/AIAssistant';
import ValidationCenter from './components/ValidationCenter';
import Publisher from './components/Publisher';
import IngestionEngine from './components/IngestionEngine';
import OntologyBrowser from './components/OntologyBrowser';
import WorkflowBuilderEnhanced from './components/WorkflowBuilderEnhanced';
import PhaseExplorer from './components/PhaseExplorer';
import Glossary from './components/Glossary';
import RuntimeSimulator from './components/RuntimeSimulator';
import LineageViewer from './components/LineageViewer';
import OptimizationDashboard from './components/OptimizationDashboard';
import Breadcrumb, { buildBreadcrumbs } from './components/Breadcrumb';
import { API_ENDPOINTS, ATOM_COLORS, MOCK_PHASES, MOCK_JOURNEYS } from './constants';
import { Atom, Module, ViewType, GraphContext, Phase, Journey } from './types';
import './styles.css';

interface NavigationContext {
  sourceView: ViewType;
  targetView: ViewType;
  context?: any;
}

interface NavigationHistory {
  view: ViewType;
  context?: any;
  timestamp: number;
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('explorer');
  const [selectedAtom, setSelectedAtom] = useState<Atom | null>(null);
  const [atoms, setAtoms] = useState<Atom[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullAtomData, setFullAtomData] = useState<Atom | null>(null);
  const [graphContext, setGraphContext] = useState<GraphContext>({ mode: 'global' });
  const [navigationHistory, setNavigationHistory] = useState<NavigationHistory[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [showLineageViewer, setShowLineageViewer] = useState<boolean>(false);

  // Load data from API on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch atoms from API with full data (edges needed for graph/edge explorer)
      // Load all atoms in batches
      let allAtoms: Atom[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const atomsResponse = await fetch(`${API_ENDPOINTS.atoms}?limit=${batchSize}&offset=${offset}`);
        if (!atomsResponse.ok) {
          throw new Error(`Failed to load atoms: ${atomsResponse.statusText}`);
        }
        const atomsData = await atomsResponse.json();
        allAtoms = allAtoms.concat(atomsData.atoms || []);
        hasMore = atomsData.has_more;
        offset += batchSize;

        // Safety limit to prevent infinite loops
        if (offset > 10000) break;
      }

      setAtoms(allAtoms);

      // Fetch modules from API
      const modulesResponse = await fetch(API_ENDPOINTS.modules);
      if (!modulesResponse.ok) {
        throw new Error(`Failed to load modules: ${modulesResponse.statusText}`);
      }
      const modulesData = await modulesResponse.json();

      // Normalize module data for frontend compatibility
      const normalizedModules = modulesData.map((mod: any) => ({
        id: mod.id || mod.module_id,
        name: mod.name,
        description: mod.description,
        owner: mod.owner || (mod.metadata && mod.metadata.owner),
        atoms: mod.atoms || mod.atom_ids || [],
        phaseId: mod.phaseId
      }));

      setModules(normalizedModules);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFullAtomDetails = async (atomId: string) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.atoms}/${atomId}`);
      if (!response.ok) {
        throw new Error(`Failed to load atom details: ${response.statusText}`);
      }
      const fullAtom = await response.json();
      setFullAtomData(fullAtom);
    } catch (err) {
      console.error('Error loading atom details:', err);
      // Fallback to summary data if full fetch fails
      const summaryAtom = atoms.find(a => a.id === atomId);
      if (summaryAtom) {
        setFullAtomData(summaryAtom);
      }
    }
  };

  const handleAtomSelect = (atom: Atom) => {
    setSelectedAtom(atom);
    // Load full atom details
    loadFullAtomDetails(atom.id);
  };

  const handleIngest = (data: { atoms: Atom[], module: Module }) => {
    const newAtoms = data.atoms.filter(na => !atoms.some(a => a.id === na.id));
    setAtoms(prev => [...prev, ...newAtoms]);
    setModules(prev => [...prev, data.module]);
    setView('modules');
  };

  // Navigation helper with history tracking
  const navigateTo = (targetView: ViewType, context?: {
    atomId?: string;
    moduleId?: string;
    phaseId?: string;
    journeyId?: string;
    graphContext?: GraphContext;
  }) => {
    // Add current view to history
    setNavigationHistory(prev => [...prev, {
      view,
      context: {
        selectedAtom: selectedAtom?.id,
        selectedPhaseId,
        selectedJourneyId,
        selectedModuleId,
        graphContext
      },
      timestamp: Date.now()
    }]);

    // Apply new context
    if (context?.atomId) {
      const atom = atoms.find(a => a.id === context.atomId);
      if (atom) handleAtomSelect(atom);
    }
    if (context?.moduleId) setSelectedModuleId(context.moduleId);
    if (context?.phaseId) setSelectedPhaseId(context.phaseId);
    if (context?.journeyId) setSelectedJourneyId(context.journeyId);
    if (context?.graphContext) setGraphContext(context.graphContext);

    // Navigate to target view
    setView(targetView);
  };

  // Navigate back in history
  const navigateBack = () => {
    if (navigationHistory.length === 0) return;

    const previous = navigationHistory[navigationHistory.length - 1];
    setNavigationHistory(prev => prev.slice(0, -1));

    // Restore previous state
    if (previous.context?.selectedAtom) {
      const atom = atoms.find(a => a.id === previous.context.selectedAtom);
      if (atom) setSelectedAtom(atom);
    }
    if (previous.context?.selectedPhaseId) setSelectedPhaseId(previous.context.selectedPhaseId);
    if (previous.context?.selectedJourneyId) setSelectedJourneyId(previous.context.selectedJourneyId);
    if (previous.context?.selectedModuleId) setSelectedModuleId(previous.context.selectedModuleId);
    if (previous.context?.graphContext) setGraphContext(previous.context.graphContext);

    setView(previous.view);
  };

  const renderContent = () => {
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

    switch (view) {
      case 'ontology':
        return <OntologyBrowser atoms={atoms} modules={modules} onSelectAtom={(a) => { handleAtomSelect(a); }} />;
      case 'glossary':
        return <Glossary />;
      case 'workflow':
        return <WorkflowBuilderEnhanced
          atoms={atoms}
          modules={modules}
          onSelectAtom={(a) => { handleAtomSelect(a); }}
          onNavigateToGraph={(journeyId) => navigateTo('graph', { journeyId, graphContext: { mode: 'journey', journeyId } })}
          onNavigateToPhase={(phaseId) => navigateTo('phases', { phaseId })}
        />;
      case 'phases':
        return <PhaseExplorer
          phases={MOCK_PHASES}
          journeys={MOCK_JOURNEYS}
          modules={modules}
          atoms={atoms}
          onPhaseSelect={(phase) => setSelectedPhaseId(phase.id)}
          onNavigateToGraph={(phaseId) => navigateTo('graph', { phaseId, graphContext: { mode: 'phase', phaseId, showModuleBoundaries: true } })}
          onNavigateToModule={(moduleId) => navigateTo('modules', { moduleId })}
          selectedPhaseId={selectedPhaseId}
        />;
      case 'explorer':
        return <AtomExplorer atoms={atoms} modules={modules} onSelect={(a) => { handleAtomSelect(a); }} />;
      case 'modules':
        return <ModuleExplorer
          modules={modules}
          atoms={atoms}
          onSelectAtom={(a) => { handleAtomSelect(a); }}
          onNavigateToGraph={(moduleId) => navigateTo('graph', { moduleId, graphContext: { mode: 'module', moduleId, expandDependencies: true } })}
          selectedModuleId={selectedModuleId}
        />;
      case 'graph':
        return <GraphView
          atoms={atoms}
          modules={modules}
          phases={MOCK_PHASES}
          journeys={MOCK_JOURNEYS}
          context={graphContext}
          onSelectAtom={(a) => { handleAtomSelect(a); }}
          onContextChange={(ctx) => setGraphContext(ctx)}
          onNavigateToJourney={(journeyId) => navigateTo('workflow', { journeyId })}
          onNavigateToPhase={(phaseId) => navigateTo('phases', { phaseId })}
          onNavigateToModule={(moduleId) => navigateTo('modules', { moduleId })}
        />;
      case 'edges':
        return <EdgeExplorer atoms={atoms} onSelectAtom={(a) => { handleAtomSelect(a); }} />;
      case 'health':
        return <ValidationCenter atoms={atoms} modules={modules} onFocusAtom={(a) => { handleAtomSelect(a); setView('explorer'); }} />;
      case 'impact':
        return <ImpactAnalysisUI atoms={atoms} />;
      case 'publisher':
        return <Publisher atoms={atoms} modules={modules} />;
      case 'assistant':
        return <AIAssistant atoms={atoms} />;
      case 'ingestion':
        return <IngestionEngine atoms={atoms} onIngest={handleIngest} />;
      case 'runtime':
        return <RuntimeSimulator />;
      case 'feedback':
        return <OptimizationDashboard />;
      default:
        return <div className="content-area">Select a view from the sidebar</div>;
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">GNDP System</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
            Documentation Registry
          </div>
        </div>
        <Sidebar currentView={view} onViewChange={setView} />
      </aside>

      <main className="main-content">
        <header className="app-header">
          <div className="header-title">
            <span className="header-breadcrumb">System Registry</span>
            <span style={{ color: 'var(--color-border-dark)', margin: '0 8px' }}>/</span>
            <span className="header-view-name">
              {view.replace('_', ' ').charAt(0).toUpperCase() + view.replace('_', ' ').slice(1)}
            </span>
          </div>

          <div className="header-actions">
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textAlign: 'right' }}>
              <div style={{ fontWeight: '600', marginBottom: '2px' }}>Total Atoms: {atoms.length}</div>
              <div>Modules: {modules.length}</div>
            </div>
            <button onClick={loadData} className="btn" title="Refresh data">
              <svg style={{ width: '14px', height: '14px', display: 'inline-block', verticalAlign: 'middle' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </header>

        <Breadcrumb
          items={buildBreadcrumbs(
            view,
            {
              selectedAtom,
              selectedPhaseId,
              selectedJourneyId,
              selectedModuleId,
              phases: MOCK_PHASES,
              journeys: MOCK_JOURNEYS,
              modules
            },
            navigateTo
          )}
          canGoBack={navigationHistory.length > 0}
          onGoBack={navigateBack}
        />

        <div className="content-area">
          {renderContent()}
        </div>

        {selectedAtom && (() => {
          const displayAtom = fullAtomData || selectedAtom;
          return (
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '500px',
              height: '100%',
              backgroundColor: '#ffffff',
              borderLeft: '2px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1000,
              boxShadow: 'var(--shadow-lg)'
            }}>
              <div style={{
                padding: 'var(--spacing-lg)',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-tertiary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                      Atom Details
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                      {displayAtom.id}
                    </h3>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      {displayAtom.name || displayAtom.title || 'Untitled'}
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedAtom(null); setFullAtomData(null); }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: '4px',
                      color: 'var(--color-text-tertiary)'
                    }}
                  >
                    <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
                {/* Basic Info */}
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap', marginBottom: 'var(--spacing-md)' }}>
                    <span className="badge badge-info">{displayAtom.type}</span>
                    {displayAtom.status && <span className="badge badge-success">{displayAtom.status}</span>}
                    {displayAtom.criticality && <span className="badge" style={{ backgroundColor: displayAtom.criticality === 'CRITICAL' ? '#ef4444' : displayAtom.criticality === 'HIGH' ? '#f59e0b' : '#6b7280' }}>{displayAtom.criticality}</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {displayAtom.owner && <div><strong>Owner:</strong> {displayAtom.owner}</div>}
                    {displayAtom.team && <div><strong>Team:</strong> {displayAtom.team}</div>}
                    {displayAtom.version && <div><strong>Version:</strong> {displayAtom.version}</div>}
                    {displayAtom.category && <div><strong>Category:</strong> {displayAtom.category}</div>}
                  </div>
                </div>

                {/* Description */}
                {displayAtom.content?.description && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                      Description
                    </h5>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                      {displayAtom.content.description}
                    </p>
                  </div>
                )}

                {/* Summary */}
                {displayAtom.content?.summary && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                      Summary
                    </h5>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                      {displayAtom.content.summary}
                    </p>
                  </div>
                )}

                {/* Purpose */}
                {displayAtom.content?.purpose && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                      Purpose
                    </h5>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                      {displayAtom.content.purpose}
                    </p>
                  </div>
                )}

                {/* Business Context */}
                {displayAtom.content?.business_context && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                      Business Context
                    </h5>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                      {displayAtom.content.business_context}
                    </p>
                  </div>
                )}

                {/* Steps */}
                {displayAtom.content?.steps && displayAtom.content.steps.length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                      Process Steps
                    </h5>
                    <ol style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.8', paddingLeft: '20px' }}>
                      {displayAtom.content.steps.map((step: string, i: number) => (
                        <li key={i} style={{ marginBottom: 'var(--spacing-xs)' }}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Inputs */}
                {displayAtom.content?.inputs && displayAtom.content.inputs.length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                      Inputs
                    </h5>
                    <ul style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.8', paddingLeft: '20px' }}>
                      {displayAtom.content.inputs.map((input: string, i: number) => (
                        <li key={i} style={{ marginBottom: 'var(--spacing-xs)' }}>{input}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Outputs */}
                {displayAtom.content?.outputs && displayAtom.content.outputs.length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                      Outputs
                    </h5>
                    <ul style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.8', paddingLeft: '20px' }}>
                      {displayAtom.content.outputs.map((output: string, i: number) => (
                        <li key={i} style={{ marginBottom: 'var(--spacing-xs)' }}>{output}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prerequisites */}
                {displayAtom.content?.prerequisites && displayAtom.content.prerequisites.length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                      Prerequisites
                    </h5>
                    <ul style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.8', paddingLeft: '20px' }}>
                      {displayAtom.content.prerequisites.map((prereq: string, i: number) => (
                        <li key={i} style={{ marginBottom: 'var(--spacing-xs)' }}>{prereq}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Success Criteria */}
                {displayAtom.content?.success_criteria && displayAtom.content.success_criteria.length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                      Success Criteria
                    </h5>
                    <ul style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.8', paddingLeft: '20px' }}>
                      {displayAtom.content.success_criteria.map((criteria: string, i: number) => (
                        <li key={i} style={{ marginBottom: 'var(--spacing-xs)' }}>{criteria}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Metrics & Timing */}
                {displayAtom.metrics && (
                  <div style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '8px' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                      Metrics & Timing
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', fontSize: '12px' }}>
                      <div><strong>Avg Cycle Time:</strong> {displayAtom.metrics.avg_cycle_time_mins} mins ({Math.round(displayAtom.metrics.avg_cycle_time_mins / 60)} hours)</div>
                      <div><strong>Automation Level:</strong> {Math.round(displayAtom.metrics.automation_level * 100)}%</div>
                      <div><strong>Error Rate:</strong> {Math.round(displayAtom.metrics.error_rate * 100)}%</div>
                      <div><strong>Compliance Score:</strong> {Math.round(displayAtom.metrics.compliance_score * 100)}%</div>
                    </div>
                  </div>
                )}

                {/* Exceptions */}
                {displayAtom.content?.exceptions && displayAtom.content.exceptions.length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                      Exceptions
                    </h5>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      {displayAtom.content.exceptions.map((exc: any, i: number) => (
                        <div key={i} style={{ marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '4px' }}>
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>Condition: {exc.condition}</div>
                          <div>Action: {exc.action}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regulatory Context */}
                {displayAtom.content?.regulatory_context && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                      Regulatory Context
                    </h5>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                      {displayAtom.content.regulatory_context}
                    </p>
                  </div>
                )}

                {/* Edges/Relationships */}
                {displayAtom.edges && displayAtom.edges.length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                      Relationships ({displayAtom.edges.length})
                    </h5>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {displayAtom.edges.map((edge: any, i: number) => {
                        const targetAtom = atoms.find(a => a.id === edge.targetId);
                        return (
                          <div key={i} style={{ marginBottom: 'var(--spacing-xs)', padding: 'var(--spacing-xs)', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '4px' }}>
                            <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{edge.type}</span>
                            {' → '}
                            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleAtomSelect(targetAtom || { id: edge.targetId } as Atom)}>
                              {targetAtom?.name || edge.targetId}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Module & Phase Info */}
                {(displayAtom.moduleId || displayAtom.phaseId) && (
                  <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                      Organization
                    </h5>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {displayAtom.moduleId && (
                        <div style={{ marginBottom: '4px' }}>
                          <strong>Module:</strong> {modules.find(m => m.id === displayAtom.moduleId)?.name || displayAtom.moduleId}
                        </div>
                      )}
                      {displayAtom.phaseId && (
                        <div>
                          <strong>Phase:</strong> {displayAtom.phaseId.replace('phase-', '').replace('-', ' ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
                <button
                  onClick={() => setShowLineageViewer(true)}
                  className="btn btn-primary"
                  style={{ width: '100%', marginBottom: 'var(--spacing-sm)' }}
                >
                  <svg style={{ width: '14px', height: '14px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View History
                </button>
                <button
                  onClick={() => { setView('impact'); setSelectedAtom(null); setFullAtomData(null); }}
                  className="btn"
                  style={{ width: '100%', marginBottom: 'var(--spacing-sm)' }}
                >
                  View Impact Analysis
                </button>
                <button
                  onClick={() => { setView('edges'); setSelectedAtom(null); setFullAtomData(null); }}
                  className="btn"
                  style={{ width: '100%' }}
                >
                  View Edge Network
                </button>
              </div>
            </div>
          );
        })()}

        {/* Lineage Viewer Modal */}
        {showLineageViewer && selectedAtom && (
          <LineageViewer
            atomId={selectedAtom.id}
            onClose={() => setShowLineageViewer(false)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
