import { useState, useEffect } from 'react';
import { Phase, Journey, Module } from '../types';

interface PhaseEditorProps {
  phase: Phase | null;
  journeys: Journey[];
  modules: Module[];
  onSave: (phase: Phase) => void;
  onCancel: () => void;
}

export default function PhaseEditor({ phase, journeys, modules, onSave, onCancel }: PhaseEditorProps) {
  const [formData, setFormData] = useState<Phase>({
    id: phase?.id || `phase-${Date.now()}`,
    name: phase?.name || '',
    description: phase?.description || '',
    modules: phase?.modules || [],
    journeyId: phase?.journeyId || '',
    targetDurationDays: phase?.targetDurationDays || 1
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (phase) {
      setFormData(phase);
    }
  }, [phase]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Phase name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.journeyId) {
      newErrors.journeyId = 'Journey selection is required';
    }

    if (formData.targetDurationDays < 1) {
      newErrors.targetDurationDays = 'Duration must be at least 1 day';
    }

    if (formData.modules.length === 0) {
      newErrors.modules = 'At least one module must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const handleModuleToggle = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.includes(moduleId)
        ? prev.modules.filter(id => id !== moduleId)
        : [...prev.modules, moduleId]
    }));
  };

  // Filter modules by selected journey
  const availableModules = modules.filter(m => {
    // Only show modules that belong to the selected journey's phases
    // or modules without a phase assignment
    if (!formData.journeyId) return true;

    const journey = journeys.find(j => j.id === formData.journeyId);
    if (!journey) return true;

    // If module has no phase, it's available
    if (!m.phaseId) return true;

    // If module's phase is in this journey, it's available
    return journey.phases.includes(m.phaseId);
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {phase ? 'Edit Phase' : 'Create Phase'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Phases represent major milestones in a journey, containing one or more modules
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phase Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`input w-full ${errors.name ? 'border-red-500' : ''}`}
                placeholder="e.g., Pre-Application, Processing, Underwriting"
              />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className={`input w-full ${errors.description ? 'border-red-500' : ''}`}
                rows={3}
                placeholder="Describe the purpose and scope of this phase..."
              />
              {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Journey *
                </label>
                <select
                  value={formData.journeyId}
                  onChange={(e) => setFormData(prev => ({ ...prev, journeyId: e.target.value }))}
                  className={`input w-full ${errors.journeyId ? 'border-red-500' : ''}`}
                >
                  <option value="">Select Journey</option>
                  {journeys.map(journey => (
                    <option key={journey.id} value={journey.id}>
                      {journey.name}
                    </option>
                  ))}
                </select>
                {errors.journeyId && <p className="text-red-600 text-sm mt-1">{errors.journeyId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Duration (days) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.targetDurationDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetDurationDays: parseInt(e.target.value) || 1 }))}
                  className={`input w-full ${errors.targetDurationDays ? 'border-red-500' : ''}`}
                />
                {errors.targetDurationDays && <p className="text-red-600 text-sm mt-1">{errors.targetDurationDays}</p>}
              </div>
            </div>

            {/* Module Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modules * ({formData.modules.length} selected)
              </label>
              {errors.modules && <p className="text-red-600 text-sm mb-2">{errors.modules}</p>}

              {availableModules.length === 0 ? (
                <div className="p-4 border border-gray-200 rounded text-center text-gray-500">
                  <p>No modules available</p>
                  {formData.journeyId ? (
                    <p className="text-sm mt-1">Create modules for this journey first</p>
                  ) : (
                    <p className="text-sm mt-1">Select a journey to see available modules</p>
                  )}
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-64 overflow-y-auto">
                  {availableModules.map(module => {
                    const isSelected = formData.modules.includes(module.id);
                    return (
                      <div
                        key={module.id}
                        onClick={() => handleModuleToggle(module.id)}
                        className={`p-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 hover:bg-blue-100'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center h-5 mt-0.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900">{module.name}</h4>
                              <span className="text-xs text-gray-500">
                                {module.atoms.length} atoms
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                            <p className="text-xs text-gray-500 mt-1">Owner: {module.owner}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Module Sequence Preview */}
            {formData.modules.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Module Sequence (drag to reorder)
                </label>
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                  {formData.modules.map((moduleId, index) => {
                    const module = modules.find(m => m.id === moduleId);
                    if (!module) return null;

                    return (
                      <div key={moduleId} className="flex items-center gap-3 p-3 bg-white rounded border border-gray-200">
                        <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{module.name}</h5>
                          <p className="text-xs text-gray-500">{module.atoms.length} atoms</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (index > 0) {
                                const newModules = [...formData.modules];
                                [newModules[index], newModules[index - 1]] = [newModules[index - 1], newModules[index]];
                                setFormData(prev => ({ ...prev, modules: newModules }));
                              }
                            }}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (index < formData.modules.length - 1) {
                                const newModules = [...formData.modules];
                                [newModules[index], newModules[index + 1]] = [newModules[index + 1], newModules[index]];
                                setFormData(prev => ({ ...prev, modules: newModules }));
                              }
                            }}
                            disabled={index === formData.modules.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="btn btn-primary"
          >
            {phase ? 'Save Changes' : 'Create Phase'}
          </button>
        </div>
      </div>
    </div>
  );
}
