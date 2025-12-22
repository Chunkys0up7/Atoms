import { useState, useMemo } from 'react';
import { Phase, Module, Atom, Journey, Criticality } from '../types';
import PhaseEditor from './PhaseEditor';

interface PhaseExplorerProps {
  phases: Phase[];
  journeys: Journey[];
  modules: Module[];
  atoms: Atom[];
  onPhaseSelect?: (phase: Phase) => void;
  onNavigateToGraph?: (phaseId: string) => void;
}

export default function PhaseExplorer({
  phases,
  journeys,
  modules,
  atoms,
  onPhaseSelect,
  onNavigateToGraph
}: PhaseExplorerProps) {
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJourney, setFilterJourney] = useState<string>('all');
  const [filterCriticality, setFilterCriticality] = useState<string>('all');
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);

  // Filter phases
  const filteredPhases = useMemo(() => {
    return phases.filter(phase => {
      const matchesSearch = phase.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          phase.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesJourney = filterJourney === 'all' || phase.journeyId === filterJourney;

      // Calculate phase criticality based on its modules' atoms
      const phaseModules = modules.filter(m => phase.modules.includes(m.id));
      const phaseAtoms = atoms.filter(a =>
        phaseModules.some(m => m.atoms.includes(a.id))
      );
      const hasHighCriticality = phaseAtoms.some(a => a.criticality === 'HIGH' || a.criticality === 'CRITICAL');
      const hasMediumCriticality = phaseAtoms.some(a => a.criticality === 'MEDIUM');

      let phaseCriticality: Criticality = 'LOW';
      if (phaseAtoms.some(a => a.criticality === 'CRITICAL')) phaseCriticality = 'CRITICAL';
      else if (hasHighCriticality) phaseCriticality = 'HIGH';
      else if (hasMediumCriticality) phaseCriticality = 'MEDIUM';

      const matchesCriticality = filterCriticality === 'all' || phaseCriticality === filterCriticality;

      return matchesSearch && matchesJourney && matchesCriticality;
    });
  }, [phases, searchQuery, filterJourney, filterCriticality, modules, atoms]);

  // Get journey for a phase
  const getJourney = (phase: Phase) => {
    return journeys.find(j => j.id === phase.journeyId);
  };

  // Get modules for selected phase
  const selectedPhaseModules = useMemo(() => {
    if (!selectedPhase) return [];
    return modules.filter(m => selectedPhase.modules.includes(m.id));
  }, [selectedPhase, modules]);

  // Get atoms for selected phase
  const selectedPhaseAtoms = useMemo(() => {
    if (!selectedPhase) return [];
    return atoms.filter(a =>
      selectedPhaseModules.some(m => m.atoms.includes(a.id))
    );
  }, [selectedPhase, selectedPhaseModules, atoms]);

  // Calculate metrics for selected phase
  const phaseMetrics = useMemo(() => {
    if (selectedPhaseAtoms.length === 0) return null;

    const avgAutomation = selectedPhaseAtoms.reduce((sum, a) =>
      sum + (a.metrics?.automation_level || 0), 0) / selectedPhaseAtoms.length;
    const avgCycleTime = selectedPhaseAtoms.reduce((sum, a) =>
      sum + (a.metrics?.avg_cycle_time_mins || 0), 0);
    const avgErrorRate = selectedPhaseAtoms.reduce((sum, a) =>
      sum + (a.metrics?.error_rate || 0), 0) / selectedPhaseAtoms.length;
    const avgCompliance = selectedPhaseAtoms.reduce((sum, a) =>
      sum + (a.metrics?.compliance_score || 0), 0) / selectedPhaseAtoms.length;

    const criticalityCount = {
      CRITICAL: selectedPhaseAtoms.filter(a => a.criticality === 'CRITICAL').length,
      HIGH: selectedPhaseAtoms.filter(a => a.criticality === 'HIGH').length,
      MEDIUM: selectedPhaseAtoms.filter(a => a.criticality === 'MEDIUM').length,
      LOW: selectedPhaseAtoms.filter(a => a.criticality === 'LOW').length,
    };

    return {
      automation: avgAutomation,
      cycleTime: avgCycleTime,
      errorRate: avgErrorRate,
      compliance: avgCompliance,
      criticalityCount
    };
  }, [selectedPhaseAtoms]);

  const handlePhaseClick = (phase: Phase) => {
    setSelectedPhase(phase);
    onPhaseSelect?.(phase);
  };

  const handleCreatePhase = () => {
    setEditingPhase(null);
    setEditorMode('create');
  };

  const handleEditPhase = () => {
    if (selectedPhase) {
      setEditingPhase(selectedPhase);
      setEditorMode('edit');
    }
  };

  const handleSavePhase = (phase: Phase) => {
    // In real app, would save to backend
    console.log('Saving phase:', phase);
    setEditorMode(null);
    setEditingPhase(null);
  };

  const handleCancelEdit = () => {
    setEditorMode(null);
    setEditingPhase(null);
  };

  const getCriticalityColor = (criticality: Criticality) => {
    switch (criticality) {
      case 'CRITICAL': return 'text-red-600 bg-red-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-green-600 bg-green-50';
    }
  };

  const getCriticalityBadge = (count: number, level: Criticality) => {
    if (count === 0) return null;
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${getCriticalityColor(level)}`}>
        {count} {level}
      </span>
    );
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Left Panel: Phase List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Phases</h2>
            <button
              onClick={handleCreatePhase}
              className="btn btn-primary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Phase
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search phases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full mb-3"
          />

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterJourney}
              onChange={(e) => setFilterJourney(e.target.value)}
              className="input flex-1"
            >
              <option value="all">All Journeys</option>
              {journeys.map(j => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>

            <select
              value={filterCriticality}
              onChange={(e) => setFilterCriticality(e.target.value)}
              className="input flex-1"
            >
              <option value="all">All Criticality</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Phase List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredPhases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No phases found</p>
              <button onClick={handleCreatePhase} className="text-blue-600 hover:underline">
                Create your first phase
              </button>
            </div>
          ) : (
            filteredPhases.map(phase => {
              const journey = getJourney(phase);
              const phaseModules = modules.filter(m => phase.modules.includes(m.id));
              const phaseAtoms = atoms.filter(a =>
                phaseModules.some(m => m.atoms.includes(a.id))
              );
              const isSelected = selectedPhase?.id === phase.id;

              return (
                <div
                  key={phase.id}
                  onClick={() => handlePhaseClick(phase)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-medium text-gray-900">{phase.name}</h3>
                    <span className="text-xs text-gray-500">{phase.targetDurationDays}d</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{phase.description}</p>
                  {journey && (
                    <p className="text-xs text-gray-500 mb-2">Journey: {journey.name}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{phaseModules.length} modules</span>
                    <span>•</span>
                    <span>{phaseAtoms.length} atoms</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Center Panel: Phase Detail */}
      <div className="w-2/5 bg-white border-r border-gray-200 flex flex-col">
        {selectedPhase ? (
          <>
            {/* Phase Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedPhase.name}</h2>
                  <p className="text-gray-600">{selectedPhase.description}</p>
                </div>
                <button
                  onClick={handleEditPhase}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Journey</p>
                  <p className="font-medium">{getJourney(selectedPhase)?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Target Duration</p>
                  <p className="font-medium">{selectedPhase.targetDurationDays} days</p>
                </div>
              </div>

              {/* Metrics */}
              {phaseMetrics && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Automation</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {(phaseMetrics.automation * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Compliance</p>
                    <p className="text-lg font-semibold text-green-600">
                      {(phaseMetrics.compliance * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Cycle Time</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {Math.round(phaseMetrics.cycleTime / 60)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Error Rate</p>
                    <p className="text-lg font-semibold text-orange-600">
                      {(phaseMetrics.errorRate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Module Composition */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Modules ({selectedPhaseModules.length})
                </h3>
                {selectedPhaseModules.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No modules in this phase</p>
                ) : (
                  <div className="space-y-3">
                    {selectedPhaseModules.map(module => {
                      const moduleAtoms = atoms.filter(a => module.atoms.includes(a.id));
                      return (
                        <div key={module.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">{module.name}</h4>
                              <p className="text-sm text-gray-600">{module.description}</p>
                            </div>
                            <span className="text-xs text-gray-500">{moduleAtoms.length} atoms</span>
                          </div>
                          <p className="text-xs text-gray-500">Owner: {module.owner}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Atom Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Atoms ({selectedPhaseAtoms.length})
                  </h3>
                  {phaseMetrics && (
                    <div className="flex gap-2">
                      {getCriticalityBadge(phaseMetrics.criticalityCount.CRITICAL, 'CRITICAL')}
                      {getCriticalityBadge(phaseMetrics.criticalityCount.HIGH, 'HIGH')}
                      {getCriticalityBadge(phaseMetrics.criticalityCount.MEDIUM, 'MEDIUM')}
                    </div>
                  )}
                </div>
                {selectedPhaseAtoms.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No atoms in this phase</p>
                ) : (
                  <div className="space-y-2">
                    {selectedPhaseAtoms.map(atom => (
                      <div key={atom.id} className="p-3 border border-gray-200 rounded hover:border-gray-300">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900 text-sm">{atom.name}</h4>
                              <span className={`px-2 py-0.5 rounded text-xs ${getCriticalityColor(atom.criticality)}`}>
                                {atom.criticality}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">{atom.content.summary}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg font-medium mb-2">No phase selected</p>
              <p className="text-sm">Select a phase from the list to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Phase Graph (Mini) */}
      <div className="w-1/4 bg-white flex flex-col">
        {selectedPhase ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Phase Graph</h3>
              <p className="text-sm text-gray-600 mb-4">
                Atom relationships within this phase
              </p>
              <button
                onClick={() => onNavigateToGraph?.(selectedPhase.id)}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
                View Full Graph
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center text-gray-400">
                <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-sm">D3 mini-graph will render here</p>
                <p className="text-xs mt-2">Showing {selectedPhaseAtoms.length} atoms</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p className="text-sm">Select a phase to view graph</p>
          </div>
        )}
      </div>

      {/* Phase Editor Modal */}
      {editorMode && (
        <PhaseEditor
          phase={editingPhase}
          journeys={journeys}
          modules={modules}
          onSave={handleSavePhase}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
}
