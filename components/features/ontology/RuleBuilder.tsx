import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';

interface RuleBuilderProps {
    ruleId?: string;
    onClose: () => void;
    onSave: (rule: any) => Promise<void>;
}

interface RuleCondition {
    field: string;
    operator: string;
    value: string;
}

interface RuleAction {
    type: string;
    phase: {
        name: string;
        description: string;
        position: 'BEFORE' | 'AFTER';
        reference_phase?: string;
    };
    modification: {
        criticality: string;
        reason: string;
    };
}

const OPERATORS = [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'in', label: 'In List' },
];

const FIELDS = [
    { value: 'atom.type', label: 'Atom Type' },
    { value: 'atom.criticality', label: 'Criticality' },
    { value: 'context.environment', label: 'Environment' },
    { value: 'context.user_role', label: 'User Role' },
    { value: 'input.data_sensitivity', label: 'Data Sensitivity' },
];

const RuleBuilder: React.FC<RuleBuilderProps> = ({ ruleId, onClose, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        priority: 10,
        active: true,
        condition: {
            type: 'AND',
            rules: [] as RuleCondition[],
        },
        action: {
            type: 'INSERT_PHASE',
            phase: {
                name: '',
                description: '',
                position: 'BEFORE',
                reference_phase: '',
            },
            modification: {
                criticality: 'MEDIUM',
                reason: '',
            },
        } as RuleAction,
    });

    useEffect(() => {
        if (ruleId) {
            loadRule(ruleId);
        }
    }, [ruleId]);

    const loadRule = async (id: string) => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/api/rules/${id}`);
            if (response.ok) {
                const data = await response.json();
                setFormData(data);
            }
        } catch (error) {
            console.error('Failed to load rule:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCondition = () => {
        setFormData((prev) => ({
            ...prev,
            condition: {
                ...prev.condition,
                rules: [
                    ...prev.condition.rules,
                    { field: 'atom.type', operator: 'equals', value: '' },
                ],
            },
        }));
    };

    const handleRemoveCondition = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            condition: {
                ...prev.condition,
                rules: prev.condition.rules.filter((_, i) => i !== index),
            },
        }));
    };

    const handleConditionChange = (index: number, field: keyof RuleCondition, value: string) => {
        setFormData((prev) => {
            const newRules = [...prev.condition.rules];
            newRules[index] = { ...newRules[index], [field]: value };
            return {
                ...prev,
                condition: {
                    ...prev.condition,
                    rules: newRules,
                },
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
        } finally {
            setLoading(false);
        }
    };

    if (loading && ruleId) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg">Loading rule...</div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                        <h2 className="text-xl font-bold text-gray-800">
                            {ruleId ? 'Edit Rule' : 'Create New Business Rule'}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Rule Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., Require Approval for High Role"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Priority (1-100)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Description</label>
                                    <textarea
                                        required
                                        rows={2}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                                        placeholder="Explain what this rule does and why..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Conditions */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-lg font-semibold text-gray-800">Conditions (WHEN)</h3>
                                <button
                                    type="button"
                                    onClick={handleAddCondition}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                >
                                    <Plus size={16} /> Add Condition
                                </button>
                            </div>

                            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                                {formData.condition.rules.length === 0 && (
                                    <div className="text-sm text-gray-500 text-center py-2">
                                        No conditions added. Rule will apply to all contexts.
                                    </div>
                                )}
                                {formData.condition.rules.map((rule, index) => (
                                    <div key={index} className="flex gap-3 items-center">
                                        <select
                                            value={rule.field}
                                            onChange={(e) => handleConditionChange(index, 'field', e.target.value)}
                                            className="flex-1 px-3 py-2 border rounded-md text-sm"
                                        >
                                            {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                        </select>
                                        <select
                                            value={rule.operator}
                                            onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                                            className="w-40 px-3 py-2 border rounded-md text-sm"
                                        >
                                            {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                                        </select>
                                        <input
                                            type="text"
                                            value={rule.value}
                                            onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                                            className="flex-1 px-3 py-2 border rounded-md text-sm"
                                            placeholder="Value..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCondition(index)}
                                            className="text-red-500 hover:text-red-700 p-1"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Actions (THEN)</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <div className="col-span-2">
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 block">
                                        Dynamic Phase Insertion
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Phase Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.action.phase.name}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            action: { ...formData.action, phase: { ...formData.action.phase, name: e.target.value } }
                                        })}
                                        className="w-full px-3 py-2 border rounded-md"
                                        placeholder="e.g., Compliance Review"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Insert Position</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={formData.action.phase.position}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                action: { ...formData.action, phase: { ...formData.action.phase, position: e.target.value as any } }
                                            })}
                                            className="flex-1 px-3 py-2 border rounded-md"
                                        >
                                            <option value="BEFORE">Before</option>
                                            <option value="AFTER">After</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={formData.action.phase.reference_phase}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                action: { ...formData.action, phase: { ...formData.action.phase, reference_phase: e.target.value } }
                                            })}
                                            className="flex-1 px-3 py-2 border rounded-md"
                                            placeholder="Reference Phase ID..."
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Resulting Criticality & Reason</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={formData.action.modification.criticality}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                action: { ...formData.action, modification: { ...formData.action.modification, criticality: e.target.value } }
                                            })}
                                            className="w-40 px-3 py-2 border rounded-md"
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="CRITICAL">Critical</option>
                                        </select>
                                        <input
                                            type="text"
                                            required
                                            value={formData.action.modification.reason}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                action: { ...formData.action, modification: { ...formData.action.modification, reason: e.target.value } }
                                            })}
                                            className="flex-1 px-3 py-2 border rounded-md"
                                            placeholder="Reason for this modification..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                        >
                            <Save size={18} />
                            Save Rule
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RuleBuilder;
