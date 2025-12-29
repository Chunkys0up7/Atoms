import { useState, useEffect } from 'react';
import { Target, Zap, BarChart3, CheckCircle, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../constants';

interface Suggestion {
  id: string;
  type: 'quality' | 'performance' | 'efficiency' | 'compliance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  target_type: 'atom' | 'module' | 'phase' | 'journey';
  target_id: string;
  target_name: string;
  issue: string;
  recommendation: string;
  impact_estimate?: string;
  suggested_actions: Array<{ action: string; description: string }>;
  metrics: Record<string, any>;
}

interface OptimizationReport {
  total_suggestions: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  suggestions: Suggestion[];
  summary: string;
}

export default function OptimizationDashboard() {
  const [report, setReport] = useState<OptimizationReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadOptimizationReport();
  }, []);

  const loadOptimizationReport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load current atoms and modules
      const [atomsRes, modulesRes] = await Promise.all([
        fetch('http://localhost:8000/api/atoms'),
        fetch('http://localhost:8000/api/modules')
      ]);

      if (!atomsRes.ok || !modulesRes.ok) {
        throw new Error('Failed to load system data');
      }

      const atomsData = await atomsRes.json();
      const modules = await modulesRes.json();

      // Extract atoms array from response (API returns { atoms: [...], total: ... })
      const atoms = atomsData.atoms || atomsData;

      // Analyze system
      const analysisRes = await fetch('http://localhost:8000/api/feedback/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atoms, modules })
      });

      if (!analysisRes.ok) {
        throw new Error('Failed to analyze system');
      }

      const data = await analysisRes.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load optimization report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = (suggestionId: string) => {
    setDismissedIds(prev => new Set(prev).add(suggestionId));
  };

  const handleApply = async (suggestion: Suggestion) => {
    try {
      // Apply suggestion via backend API
      const response = await fetch('http://localhost:8000/api/feedback/apply-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestion_id: suggestion.id,
          target_type: suggestion.target_type,
          target_id: suggestion.target_id,
          actions: suggestion.suggested_actions
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to apply suggestion');
      }

      const result = await response.json();

      // Show success message with details
      alert(
        `Suggestion Applied Successfully\n\n` +
        `Target: ${suggestion.target_name}\n` +
        `Actions Performed:\n${result.actions_applied.map((a: string) => `  • ${a}`).join('\n')}\n\n` +
        `${result.message || 'Changes have been applied to the system.'}`
      );

      // Dismiss the suggestion
      handleDismiss(suggestion.id);

      // Reload the report to see updated suggestions
      await loadOptimizationReport();
    } catch (err) {
      console.error('Apply suggestion error:', err);
      alert(
        `Failed to Apply Suggestion\n\n` +
        `${err instanceof Error ? err.message : 'An unexpected error occurred'}\n\n` +
        `The suggestion could not be applied automatically. Please apply changes manually.`
      );
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#ca8a04';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type: string) => {
    const iconClass = "w-4 h-4 inline-block";
    switch (type) {
      case 'quality': return <Target className={iconClass} />;
      case 'performance': return <Zap className={iconClass} />;
      case 'efficiency': return <BarChart3 className={iconClass} />;
      case 'compliance': return <CheckCircle className={iconClass} />;
      default: return <AlertCircle className={iconClass} />;
    }
  };

  const filteredSuggestions = report?.suggestions.filter(s => {
    if (dismissedIds.has(s.id)) return false;
    if (filterType !== 'all' && s.type !== filterType) return false;
    if (filterSeverity !== 'all' && s.severity !== filterSeverity) return false;
    return true;
  }) || [];

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
          Analyzing system performance...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>⚠️</div>
        <div style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)' }}>{error}</div>
        <button onClick={loadOptimizationReport} className="btn btn-sm">
          Retry
        </button>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: 'var(--spacing-lg)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              Optimization Dashboard
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              {report.summary}
            </p>
          </div>
          <button onClick={loadOptimizationReport} className="btn btn-sm">
            🔄 Refresh
          </button>
        </div>

        {/* Statistics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)' }}>
          <div style={{
            padding: 'var(--spacing-md)',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
              Total Suggestions
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700' }}>{report.total_suggestions}</div>
          </div>

          <div style={{
            padding: 'var(--spacing-md)',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca'
          }}>
            <div style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
              Critical
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626' }}>{report.by_severity.critical || 0}</div>
          </div>

          <div style={{
            padding: 'var(--spacing-md)',
            backgroundColor: '#fff7ed',
            borderRadius: '8px',
            border: '1px solid #fed7aa'
          }}>
            <div style={{ fontSize: '11px', color: '#9a3412', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
              High
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#ea580c' }}>{report.by_severity.high || 0}</div>
          </div>

          <div style={{
            padding: 'var(--spacing-md)',
            backgroundColor: '#fefce8',
            borderRadius: '8px',
            border: '1px solid #fde047'
          }}>
            <div style={{ fontSize: '11px', color: '#854d0e', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>
              Medium
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#ca8a04' }}>{report.by_severity.medium || 0}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
              Filter by Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input-field"
              style={{ width: '100%' }}
            >
              <option value="all">All Types</option>
              <option value="quality">Quality</option>
              <option value="performance">Performance</option>
              <option value="efficiency">Efficiency</option>
              <option value="compliance">Compliance</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
              Filter by Severity
            </label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="input-field"
              style={{ width: '100%' }}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Suggestions List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
        {filteredSuggestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-tertiary)' }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>✨</div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
              {report.total_suggestions === 0 ? 'No optimization opportunities found' : 'No suggestions match your filters'}
            </div>
            <div style={{ fontSize: '14px' }}>
              {report.total_suggestions === 0 ? 'System is performing well!' : 'Try adjusting your filters'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            {filteredSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                style={{
                  padding: 'var(--spacing-lg)',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: `1px solid ${getSeverityColor(suggestion.severity)}20`,
                  borderLeft: `4px solid ${getSeverityColor(suggestion.severity)}`
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: '4px' }}>
                      <span style={{ fontSize: '20px' }}>{getTypeIcon(suggestion.type)}</span>
                      <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{suggestion.target_name}</h3>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: `${getSeverityColor(suggestion.severity)}15`,
                        color: getSeverityColor(suggestion.severity),
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {suggestion.severity}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                      {suggestion.target_type} • {suggestion.target_id}
                    </div>
                  </div>
                </div>

                {/* Issue */}
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                    Issue
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {suggestion.issue}
                  </div>
                </div>

                {/* Recommendation */}
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                    Recommendation
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    {suggestion.recommendation}
                  </div>
                </div>

                {/* Impact Estimate */}
                {suggestion.impact_estimate && (
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                      Expected Impact
                    </div>
                    <div style={{
                      fontSize: '13px',
                      padding: 'var(--spacing-sm)',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: '6px',
                      color: '#166534'
                    }}>
                      💰 {suggestion.impact_estimate}
                    </div>
                  </div>
                )}

                {/* Suggested Actions */}
                {suggestion.suggested_actions.length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                      Suggested Actions
                    </div>
                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                      {suggestion.suggested_actions.map((action, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: 'var(--spacing-sm)',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            borderRadius: '6px',
                            fontSize: '13px'
                          }}
                        >
                          <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                            {action.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div style={{ color: 'var(--color-text-secondary)' }}>
                            {action.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metrics */}
                {Object.keys(suggestion.metrics).length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                      Metrics
                    </div>
                    <div style={{
                      padding: 'var(--spacing-sm)',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}>
                      {JSON.stringify(suggestion.metrics, null, 2)}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleDismiss(suggestion.id)}
                    className="btn btn-sm"
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--color-text-secondary)',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => handleApply(suggestion)}
                    className="btn btn-sm"
                    style={{
                      backgroundColor: getSeverityColor(suggestion.severity),
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    Apply Suggestion
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
