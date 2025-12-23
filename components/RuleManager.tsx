import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, PlayCircle, Power, PowerOff, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import RuleBuilder from './RuleBuilder';

interface RuleDefinition {
  rule_id: string;
  name: string;
  description: string;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  version: number;
  condition: any;
  action: any;
}

export default function RuleManager() {
  const [rules, setRules] = useState<RuleDefinition[]>([]);
  const [filteredRules, setFilteredRules] = useState<RuleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedRule, setSelectedRule] = useState<RuleDefinition | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  useEffect(() => {
    filterRules();
  }, [rules, searchTerm, filterActive]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8001/api/rules');
      if (response.ok) {
        const data = await response.json();
        setRules(data);
      }
    } catch (error) {
      console.error('Failed to load rules:', error);
      showNotification('error', 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const filterRules = () => {
    let filtered = [...rules];

    // Filter by active status
    if (filterActive === 'active') {
      filtered = filtered.filter(r => r.active);
    } else if (filterActive === 'inactive') {
      filtered = filtered.filter(r => !r.active);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        r.rule_id.toLowerCase().includes(term)
      );
    }

    // Sort by priority (desc) then name
    filtered.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.name.localeCompare(b.name);
    });

    setFilteredRules(filtered);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateRule = () => {
    setEditingRuleId(undefined);
    setShowBuilder(true);
  };

  const handleEditRule = (ruleId: string) => {
    setEditingRuleId(ruleId);
    setShowBuilder(true);
  };

  const handleSaveRule = async (rule: any) => {
    try {
      const url = editingRuleId
        ? `http://localhost:8001/api/rules/${editingRuleId}`
        : 'http://localhost:8001/api/rules';

      const method = editingRuleId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });

      if (response.ok) {
        showNotification('success', `Rule ${editingRuleId ? 'updated' : 'created'} successfully`);
        setShowBuilder(false);
        loadRules();
        // Hot-reload rules in runtime engine
        await fetch('http://localhost:8001/api/runtime/rules/reload', { method: 'POST' });
      } else {
        const error = await response.json();
        showNotification('error', error.detail || 'Failed to save rule');
      }
    } catch (error) {
      console.error('Failed to save rule:', error);
      showNotification('error', 'Failed to save rule');
    }
  };

  const handleToggleActive = async (ruleId: string, currentlyActive: boolean) => {
    try {
      const endpoint = currentlyActive ? 'deactivate' : 'activate';
      const response = await fetch(`http://localhost:8001/api/rules/${ruleId}/${endpoint}`, {
        method: 'POST',
      });

      if (response.ok) {
        showNotification('success', `Rule ${currentlyActive ? 'deactivated' : 'activated'}`);
        loadRules();
        // Hot-reload rules in runtime engine
        await fetch('http://localhost:8001/api/runtime/rules/reload', { method: 'POST' });
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      showNotification('error', 'Failed to toggle rule status');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule? This will soft-delete it (set active=false).')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8001/api/rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showNotification('success', 'Rule deleted successfully');
        loadRules();
        // Hot-reload rules in runtime engine
        await fetch('http://localhost:8001/api/runtime/rules/reload', { method: 'POST' });
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
      showNotification('error', 'Failed to delete rule');
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'CRITICAL': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading rules...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Rule Manager</h1>
          <p className="text-gray-600 mt-1">Manage dynamic process rewriting rules</p>
        </div>
        <button
          onClick={handleCreateRule}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          New Rule
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search rules..."
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as any)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Rules ({rules.length})</option>
          <option value="active">Active ({rules.filter(r => r.active).length})</option>
          <option value="inactive">Inactive ({rules.filter(r => !r.active).length})</option>
        </select>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredRules.map((rule) => (
              <tr
                key={rule.rule_id}
                className={`hover:bg-gray-50 cursor-pointer ${selectedRule?.rule_id === rule.rule_id ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedRule(rule)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  {rule.active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      <Power size={12} />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      <PowerOff size={12} />
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 font-bold rounded-full">
                    {rule.priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                  <div className="text-xs text-gray-500">{rule.rule_id}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-700 max-w-md truncate">
                    {rule.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    {formatDate(rule.updated_at)}
                  </div>
                  <div className="text-xs text-gray-400">v{rule.version}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRule(rule.rule_id);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(rule.rule_id, rule.active);
                      }}
                      className={`p-2 rounded ${rule.active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                      title={rule.active ? 'Deactivate' : 'Activate'}
                    >
                      {rule.active ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRule(rule.rule_id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRules.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm || filterActive !== 'all' ? 'No rules match your filters' : 'No rules found'}
          </div>
        )}
      </div>

      {/* Rule Details Panel */}
      {selectedRule && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Rule Details</h2>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Condition</h3>
              <div className="bg-gray-50 p-3 rounded border">
                <div className="text-sm font-medium text-blue-600 mb-2">
                  {selectedRule.condition.type}
                </div>
                {selectedRule.condition.rules.map((rule: any, i: number) => (
                  <div key={i} className="text-sm text-gray-700 mb-1">
                    • {rule.field} {rule.operator} {JSON.stringify(rule.value)}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Action</h3>
              <div className="bg-gray-50 p-3 rounded border">
                <div className="text-sm font-medium text-purple-600 mb-2">
                  {selectedRule.action.type}
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <div><strong>Phase:</strong> {selectedRule.action.phase.name}</div>
                  <div><strong>Position:</strong> {selectedRule.action.phase.position}</div>
                  {selectedRule.action.phase.reference_phase && (
                    <div><strong>Reference:</strong> {selectedRule.action.phase.reference_phase}</div>
                  )}
                  <div className={`font-medium ${getCriticalityColor(selectedRule.action.modification.criticality)}`}>
                    {selectedRule.action.modification.criticality}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Reason</h3>
            <p className="text-sm text-gray-700">{selectedRule.action.modification.reason}</p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Created by:</span>
              <div className="font-medium text-gray-700">{selectedRule.created_by}</div>
            </div>
            <div>
              <span className="text-gray-500">Created:</span>
              <div className="font-medium text-gray-700">{formatDate(selectedRule.created_at)}</div>
            </div>
            <div>
              <span className="text-gray-500">Version:</span>
              <div className="font-medium text-gray-700">{selectedRule.version}</div>
            </div>
          </div>
        </div>
      )}

      {/* Rule Builder Modal */}
      {showBuilder && (
        <RuleBuilder
          ruleId={editingRuleId}
          onClose={() => setShowBuilder(false)}
          onSave={handleSaveRule}
        />
      )}
    </div>
  );
}
