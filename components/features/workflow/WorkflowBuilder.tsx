import React, { useState, useMemo } from 'react';
import { Atom, Module, Phase, Journey } from '../../../types';
import { MOCK_PHASES, MOCK_JOURNEYS } from '../../../constants';

interface WorkflowBuilderProps {
  atoms: Atom[];
  modules: Module[];
  onSelectAtom?: (atom: Atom) => void;
}

type ViewMode = 'journey' | 'phase' | 'module';

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ atoms, modules, onSelectAtom }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('journey');
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Use mock data for now - in production, these would come from props or API
  const journeys = MOCK_JOURNEYS;
  const phases = MOCK_PHASES;

  // Get selected journey and its phases
  const selectedJourney = useMemo(() => {
    return journeys.find(j => j.id === selectedJourneyId);
  }, [selectedJourneyId, journeys]);

  const journeyPhases = useMemo(() => {
    if (!selectedJourney) return [];
    return phases.filter(p => selectedJourney.phases.includes(p.id));
  }, [selectedJourney, phases]);

  // Get selected phase and its modules
  const selectedPhase = useMemo(() => {
    return phases.find(p => p.id === selectedPhaseId);
  }, [selectedPhaseId, phases]);

  const phaseModules = useMemo(() => {
    if (!selectedPhase) return [];
    return modules.filter(m => selectedPhase.modules.includes(m.id));
  }, [selectedPhase, modules]);

  // Journey Timeline View
  const renderJourneyTimeline = () => {
    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              Journey Workflow
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              End-to-end business processes composed of phases and modules
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <svg style={{ width: '14px', height: '14px', marginRight: '6px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Journey
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {journeys.map((journey) => {
            const journeyPhaseList = phases.filter(p => journey.phases.includes(p.id));
            const totalModules = journeyPhaseList.reduce((sum, p) => sum + p.modules.length, 0);
            const totalDuration = journeyPhaseList.reduce((sum, p) => sum + p.targetDurationDays, 0);
            const journeyAtoms = atoms.filter(a =>
              journeyPhaseList.some(p => p.id === a.phaseId)
            );

            return (
              <div
                key={journey.id}
                style={{
                  border: '2px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: 'var(--spacing-lg)',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedJourneyId === journey.id ? 'var(--shadow-md)' : 'none',
                  borderColor: selectedJourneyId === journey.id ? 'var(--color-primary)' : 'var(--color-border)'
                }}
                onClick={() => setSelectedJourneyId(journey.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                        {journey.name}
                      </h3>
                      <span className="badge badge-info" style={{ fontSize: '10px' }}>
                        JOURNEY
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                      {journey.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginLeft: 'var(--spacing-lg)' }}>
                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-primary)' }}>
                        {journeyPhaseList.length}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                        Phases
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: '#10b981' }}>
                        {totalModules}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                        Modules
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: '#f59e0b' }}>
                        {totalDuration}d
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                        Target SLA
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phase Timeline */}
                {selectedJourneyId === journey.id && (
                  <div style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-md)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Phase Progression
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', overflowX: 'auto', paddingBottom: '8px' }}>
                      {journeyPhaseList.map((phase, index) => {
                        const phaseModuleList = modules.filter(m => phase.modules.includes(m.id));
                        return (
                          <div
                            key={phase.id}
                            style={{
                              minWidth: '240px',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px',
                              padding: 'var(--spacing-md)',
                              backgroundColor: 'var(--color-bg-tertiary)',
                              position: 'relative',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPhaseId(phase.id);
                              setViewMode('phase');
                            }}
                          >
                            {index > 0 && (
                              <div style={{
                                position: 'absolute',
                                left: '-12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--color-primary)',
                                fontSize: '16px',
                                fontWeight: '700'
                              }}>
                                →
                              </div>
                            )}
                            <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                              PHASE {index + 1}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                              {phase.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-sm)', lineHeight: '1.4' }}>
                              {phase.description}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                              <span>{phaseModuleList.length} modules</span>
                              <span className="badge" style={{ fontSize: '9px', backgroundColor: '#f59e0b' }}>
                                {phase.targetDurationDays}d
                              </span>
                            </div>
                          </div>
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
  };

  // Phase Detail View
  const renderPhaseDetail = () => {
    if (!selectedPhase) {
      return (
        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
          Select a phase to view details
        </div>
      );
    }

    const phaseAtoms = atoms.filter(a => a.phaseId === selectedPhase.id);

    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xl)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <button
                onClick={() => setViewMode('journey')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', color: 'var(--color-text-secondary)' }}
              >
                <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                {selectedPhase.name}
              </h2>
              <span className="badge badge-info">PHASE</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginLeft: '28px' }}>
              {selectedPhase.description}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ textAlign: 'center', minWidth: '70px' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)' }}>
                {phaseModules.length}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                Modules
              </div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '70px' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#10b981' }}>
                {phaseAtoms.length}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                Atoms
              </div>
            </div>
            <div style={{ textAlign: 'center', minWidth: '70px' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#f59e0b' }}>
                {selectedPhase.targetDurationDays}d
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                SLA
              </div>
            </div>
          </div>
        </div>

        {/* Module Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--spacing-lg)' }}>
          {phaseModules.map((module) => {
            const moduleAtoms = atoms.filter(a => module.atoms.includes(a.id));
            const criticalCount = moduleAtoms.filter(a => a.criticality === 'CRITICAL').length;
            const highCount = moduleAtoms.filter(a => a.criticality === 'HIGH').length;

            return (
              <div
                key={module.id}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: 'var(--spacing-lg)',
                  backgroundColor: '#ffffff',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => setViewMode('module')}
              >
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                      {module.name}
                    </h3>
                    <span className="badge" style={{ fontSize: '9px', backgroundColor: '#8b5cf6' }}>
                      MODULE
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                    {module.description}
                  </p>
                </div>

                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Owner
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {module.owner}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {moduleAtoms.length} atoms
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {criticalCount > 0 && (
                      <span className="badge" style={{ fontSize: '9px', backgroundColor: '#ef4444' }}>
                        {criticalCount} CRITICAL
                      </span>
                    )}
                    {highCount > 0 && (
                      <span className="badge" style={{ fontSize: '9px', backgroundColor: '#f59e0b' }}>
                        {highCount} HIGH
                      </span>
                    )}
                  </div>
                </div>

                {/* Atom List */}
                <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Atoms ({moduleAtoms.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                    {moduleAtoms.slice(0, 5).map((atom) => (
                      <div
                        key={atom.id}
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-text-secondary)',
                          padding: '4px 6px',
                          backgroundColor: 'var(--color-bg-tertiary)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAtom?.(atom);
                        }}
                      >
                        <div style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>
                          {atom.name}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
                          {atom.type} • {atom.criticality}
                        </div>
                      </div>
                    ))}
                    {moduleAtoms.length > 5 && (
                      <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '4px' }}>
                        +{moduleAtoms.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-secondary)' }}>
      {/* View Mode Tabs */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 var(--spacing-xl)'
      }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <button
            onClick={() => setViewMode('journey')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: '600',
              color: viewMode === 'journey' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${viewMode === 'journey' ? 'var(--color-primary)' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Journey Timeline
          </button>
          <button
            onClick={() => setViewMode('phase')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: '600',
              color: viewMode === 'phase' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${viewMode === 'phase' ? 'var(--color-primary)' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Phase Details
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {viewMode === 'journey' && renderJourneyTimeline()}
        {viewMode === 'phase' && renderPhaseDetail()}
      </div>
    </div>
  );
};

export default WorkflowBuilder;
