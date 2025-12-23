import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, PlayCircle, Save, AlertCircle } from 'lucide-react';

// Types matching backend Pydantic models
interface ConditionRule {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'GREATER_EQUAL' | 'LESS_EQUAL' | 'CONTAINS' | 'NOT_CONTAINS' | 'IN' | 'NOT_IN';
  value: any;
}

interface ConditionGroup {
  type: 'AND' | 'OR' | 'NOT';
  rules: ConditionRule[];
  groups?: ConditionGroup[] | null;
}

interface PhaseAction {
  id: string;
  name: string;
  description: string;
  position: 'BEFORE' | 'AFTER' | 'REPLACE' | 'AT_START' | 'AT_END';
  reference_phase: string | null;
  modules: string[];
  target_duration_days: number;
}

interface RuleModification {
  reason: string;
  criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface RuleAction {
  type: 'INSERT_PHASE' | 'REMOVE_PHASE' | 'REPLACE_PHASE' | 'MODIFY_PHASE';
  phase: PhaseAction;
  modification: RuleModification;
}

interface RuleDefinition {
  rule_id?: string;
  name: string;
  description: string;
  priority: number;
  active: boolean;
  condition: ConditionGroup;
  action: RuleAction;
  created_by?: string;
  version?: number;
}

interface RuleBuilderProps {
  ruleId?: string;
  onClose: () => void;
  onSave: (rule: RuleDefinition) => void;
}

const OPERATORS = [
  { value: 'EQUALS', label: 'Equals' },
  { value: 'NOT_EQUALS', label: 'Not Equals' },
  { value: 'GREATER_THAN', label: 'Greater Than' },
  { value: 'LESS_THAN', label: 'Less Than' },
  { value: 'GREATER_EQUAL', label: 'Greater or Equal' },
  { value: 'LESS_EQUAL', label: 'Less or Equal' },
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'NOT_CONTAINS', label: 'Not Contains' },
  { value: 'IN', label: 'In List' },
  { value: 'NOT_IN', label: 'Not In List' },
];

const FIELDS = [
  { value: 'customer_data.credit_score', label: 'Credit Score', type: 'number' },
  { value: 'customer_data.debt_to_income_ratio', label: 'DTI Ratio', type: 'number' },
  { value: 'customer_data.employment_type', label: 'Employment Type', type: 'string' },
  { value: 'customer_data.first_time_borrower', label: 'First Time Borrower', type: 'boolean' },
  { value: 'customer_data.residency_status', label: 'Residency Status', type: 'string' },
  { value: 'transaction_data.amount', label: 'Transaction Amount', type: 'number' },
  { value: 'transaction_data.loan_purpose', label: 'Loan Purpose', type: 'string' },
  { value: 'transaction_data.property_type', label: 'Property Type', type: 'string' },
  { value: 'transaction_data.property_state', label: 'Property State', type: 'string' },
  { value: 'transaction_data.cash_out_amount', label: 'Cash Out Amount', type: 'number' },
  { value: 'risk_flags', label: 'Risk Flags', type: 'array' },
  { value: 'compliance_requirements', label: 'Compliance Requirements', type: 'array' },
];

const CRITICALITY_LEVELS = [
  { value: 'LOW', label: 'Low', color: 'text-green-600' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-600' },
  { value: 'HIGH', label: 'High', color: 'text-orange-600' },
  { value: 'CRITICAL', label: 'Critical', color: 'text-red-600' },
];

export default function RuleBuilder({ ruleId, onClose, onSave }: RuleBuilderProps) {
  const [rule, setRule] = useState<RuleDefinition>({
    name: '',
    description: '',
    priority: 5,
    active: true,
    condition: {
      type: 'AND',
      rules: [{ field: 'customer_data.credit_score', operator: 'LESS_THAN', value: 620 }],
      groups: null,
    },
    action: {
      type: 'INSERT_PHASE',
      phase: {
        id: '',
        name: '',
        description: '',
        position: 'AFTER',
        reference_phase: 'phase-assessment',
        modules: [],
        target_duration_days: 1,
      },
      modification: {
        reason: '',
        criticality: 'MEDIUM',
      },
    },
  });

  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ruleId) {
      loadRule(ruleId);
    }
  }, [ruleId]);

  const loadRule = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8001/api/rules/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRule(data);
      }
    } catch (error) {
      console.error('Failed to load rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => {
    setRule({
      ...rule,
      condition: {
        ...rule.condition,
        rules: [
          ...rule.condition.rules,
          { field: 'customer_data.credit_score', operator: 'LESS_THAN', value: 0 },
        ],
      },
    });
  };

  const removeCondition = (index: number) => {
    setRule({
      ...rule,
      condition: {
        ...rule.condition,
        rules: rule.condition.rules.filter((_, i) => i !== index),
      },
    });
  };

  const updateCondition = (index: number, field: keyof ConditionRule, value: any) => {
    const newRules = [...rule.condition.rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRule({
      ...rule,
      condition: {
        ...rule.condition,
        rules: newRules,
      },
    });
  };

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!rule.name.trim()) newErrors.push('Rule name is required');
    if (!rule.description.trim()) newErrors.push('Description is required');
    if (rule.condition.rules.length === 0) newErrors.push('At least one condition is required');
    if (!rule.action.phase.id.trim()) newErrors.push('Phase ID is required');
    if (!rule.action.phase.name.trim()) newErrors.push('Phase name is required');
    if (!rule.action.modification.reason.trim()) newErrors.push('Modification reason is required');

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(rule);
    }
  };

  const getFieldType = (fieldPath: string) => {
    const field = FIELDS.find(f => f.value === fieldPath);
    return field?.type || 'string';
  };

  const renderValueInput = (condition: ConditionRule, index: number) => {
    const fieldType = getFieldType(condition.field);
    const isInOperator = condition.operator === 'IN' || condition.operator === 'NOT_IN';

    if (fieldType === 'boolean') {
      return (
        <select
          value={condition.value.toString()}
          onChange={(e) => updateCondition(index, 'value', e.target.value === 'true')}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }

    if (isInOperator) {
      return (
        <input
          type="text"
          value={Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}
          onChange={(e) => updateCondition(index, 'value', e.target.value.split(',').map(v => v.trim()))}
          placeholder="Comma-separated values"
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 flex-1"
        />
      );
    }

    return (
      <input
        type={fieldType === 'number' ? 'number' : 'text'}
        value={condition.value}
        onChange={(e) => updateCondition(index, 'value', fieldType === 'number' ? parseFloat(e.target.value) : e.target.value)}
        placeholder="Value"
        step={fieldType === 'number' ? '0.01' : undefined}
        className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 flex-1"
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {ruleId ? 'Edit Rule' : 'Create New Rule'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-red-600 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-red-800">Validation Errors</h3>
                  <ul className="mt-2 space-y-1">
                    {errors.map((error, i) => (
                      <li key={i} className="text-sm text-red-700">• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Metadata Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Rule Metadata</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={rule.name}
                onChange={(e) => setRule({ ...rule, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Low Credit Score Review"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={rule.description}
                onChange={(e) => setRule({ ...rule, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="What this rule does and why it exists"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority (1-10)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={rule.priority}
                  onChange={(e) => setRule({ ...rule, priority: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="text-center text-lg font-semibold text-blue-600">{rule.priority}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={rule.active}
                    onChange={(e) => setRule({ ...rule, active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Conditions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-700">Conditions</h3>
              <select
                value={rule.condition.type}
                onChange={(e) => setRule({ ...rule, condition: { ...rule.condition, type: e.target.value as any } })}
                className="px-3 py-1 border rounded-lg text-sm font-medium"
              >
                <option value="AND">AND (all must match)</option>
                <option value="OR">OR (any can match)</option>
                <option value="NOT">NOT (none should match)</option>
              </select>
            </div>

            <div className="space-y-3">
              {rule.condition.rules.map((condition, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <select
                        value={condition.field}
                        onChange={(e) => updateCondition(index, 'field', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {FIELDS.map(field => (
                          <option key={field.value} value={field.value}>{field.label}</option>
                        ))}
                      </select>

                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {OPERATORS.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>

                      {renderValueInput(condition, index)}
                    </div>

                    <button
                      onClick={() => removeCondition(index)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Remove condition"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addCondition}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Condition
              </button>
            </div>
          </div>

          {/* Action Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">Action</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                <select
                  value={rule.action.type}
                  onChange={(e) => setRule({ ...rule, action: { ...rule.action, type: e.target.value as any } })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INSERT_PHASE">Insert Phase</option>
                  <option value="REMOVE_PHASE">Remove Phase</option>
                  <option value="REPLACE_PHASE">Replace Phase</option>
                  <option value="MODIFY_PHASE">Modify Phase</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <select
                  value={rule.action.phase.position}
                  onChange={(e) => setRule({ ...rule, action: { ...rule.action, phase: { ...rule.action.phase, position: e.target.value as any } } })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BEFORE">Before</option>
                  <option value="AFTER">After</option>
                  <option value="REPLACE">Replace</option>
                  <option value="AT_START">At Start</option>
                  <option value="AT_END">At End</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phase ID</label>
                <input
                  type="text"
                  value={rule.action.phase.id}
                  onChange={(e) => setRule({ ...rule, action: { ...rule.action, phase: { ...rule.action.phase, id: e.target.value } } })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="phase-manual-review"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phase Name</label>
                <input
                  type="text"
                  value={rule.action.phase.name}
                  onChange={(e) => setRule({ ...rule, action: { ...rule.action, phase: { ...rule.action.phase, name: e.target.value } } })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Manual Review"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phase Description</label>
              <input
                type="text"
                value={rule.action.phase.description}
                onChange={(e) => setRule({ ...rule, action: { ...rule.action, phase: { ...rule.action.phase, description: e.target.value } } })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="What this phase does"
              />
            </div>

            {(rule.action.phase.position === 'BEFORE' || rule.action.phase.position === 'AFTER' || rule.action.phase.position === 'REPLACE') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Phase</label>
                <input
                  type="text"
                  value={rule.action.phase.reference_phase || ''}
                  onChange={(e) => setRule({ ...rule, action: { ...rule.action, phase: { ...rule.action.phase, reference_phase: e.target.value } } })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="phase-assessment"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Duration (days)</label>
                <input
                  type="number"
                  value={rule.action.phase.target_duration_days}
                  onChange={(e) => setRule({ ...rule, action: { ...rule.action, phase: { ...rule.action.phase, target_duration_days: parseInt(e.target.value) } } })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Criticality</label>
                <select
                  value={rule.action.modification.criticality}
                  onChange={(e) => setRule({ ...rule, action: { ...rule.action, modification: { ...rule.action.modification, criticality: e.target.value as any } } })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {CRITICALITY_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modification Reason</label>
              <textarea
                value={rule.action.modification.reason}
                onChange={(e) => setRule({ ...rule, action: { ...rule.action, modification: { ...rule.action.modification, reason: e.target.value } } })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Why this modification is being applied"
              />
            </div>
          </div>

          {/* JSON Preview */}
          {showPreview && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-700">JSON Preview</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(rule, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            {showPreview ? 'Hide' : 'Show'} JSON
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={20} />
              {loading ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
