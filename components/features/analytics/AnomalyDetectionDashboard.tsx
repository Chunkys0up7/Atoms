import React, { useState, useEffect } from 'react';
import '../../../styles.css';

interface Anomaly {
  id: string;
  type: string;
  severity: string;
  category: string;
  atom_id: string | null;
  atom_name: string | null;
  description: string;
  details: Record<string, any>;
  suggested_action: string;
  confidence: number;
}

interface AnomalyReport {
  status: string;
  scan_timestamp: string;
  total_anomalies: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  anomalies: Anomaly[];
  recommendations: string[];
}

interface AnomalyCategory {
  category: string;
  type: string;
  severity: string;
  description: string;
}

type FilterType = 'all' | 'structural' | 'semantic' | 'temporal' | 'quality';
type FilterSeverity = 'all' | 'critical' | 'high' | 'medium' | 'low';

export default function AnomalyDetectionDashboard() {
  const [report, setReport] = useState<AnomalyReport | null>(null);
  const [categories, setCategories] = useState<AnomalyCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('all');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/anomalies/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const runDetection = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/anomalies/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          include_structural: true,
          include_semantic: true,
          include_temporal: true,
          include_quality: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        setReport(data);
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to run detection' }));
        setError(errorData.detail || 'Failed to run anomaly detection');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#f59e0b';
      case 'low': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'structural': return '#3b82f6';
      case 'semantic': return '#8b5cf6';
      case 'temporal': return '#10b981';
      case 'quality': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getFilteredAnomalies = (): Anomaly[] => {
    if (!report) return [];

    return report.anomalies.filter(anomaly => {
      const typeMatch = filterType === 'all' || anomaly.type === filterType;
      const severityMatch = filterSeverity === 'all' || anomaly.severity === filterSeverity;
      return typeMatch && severityMatch;
    });
  };

  const filteredAnomalies = getFilteredAnomalies();

  return (
    <div className="container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ marginBottom: '10px' }}>Anomaly Detection</h1>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Identify unusual patterns, data quality issues, and structural problems in your knowledge graph
        </p>
      </div>

      {/* Action Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        padding: '15px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px'
      }}>
        <div>
          <button
            onClick={runDetection}
            className="btn-primary"
            disabled={loading}
            style={{ marginRight: '10px' }}
          >
            {loading ? 'Running Scan...' : 'Run Anomaly Detection'}
          </button>
          {report && (
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              Last scan: {new Date(report.scan_timestamp).toLocaleString()}
            </span>
          )}
        </div>

        {report && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '13px'
              }}
            >
              <option value="all">All Types</option>
              <option value="structural">Structural</option>
              <option value="semantic">Semantic</option>
              <option value="temporal">Temporal</option>
              <option value="quality">Quality</option>
            </select>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as FilterSeverity)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '13px'
              }}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#dc2626'
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="loading-spinner" style={{ width: '40px', height: '40px', margin: '0 auto 20px' }}></div>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>Scanning knowledge graph for anomalies...</p>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '10px' }}>
            This may take 10-30 seconds
          </p>
        </div>
      )}

      {/* Report Summary */}
      {report && !loading && (
        <>
          {/* Statistics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#374151' }}>
                {report.total_anomalies}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '5px' }}>
                Total Anomalies
              </div>
            </div>

            {Object.entries(report.by_severity).map(([severity, count]) => (
              <div key={severity} className="card" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: getSeverityColor(severity) }}>
                  {count}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '5px', textTransform: 'capitalize' }}>
                  {severity}
                </div>
              </div>
            ))}
          </div>

          {/* Type Distribution */}
          <div className="card" style={{ padding: '20px', marginBottom: '30px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Anomalies by Type</h3>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {Object.entries(report.by_type).map(([type, count]) => (
                <div key={type} style={{ flex: '1 1 200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', textTransform: 'capitalize' }}>{type}</span>
                    <strong style={{ fontSize: '18px', color: getTypeColor(type) }}>{count}</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}>
                    <div style={{
                      width: `${(count / report.total_anomalies) * 100}%`,
                      height: '100%',
                      backgroundColor: getTypeColor(type),
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="card" style={{ padding: '20px', marginBottom: '30px', backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#92400e' }}>Recommendations</h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {report.recommendations.map((rec, idx) => (
                  <li key={idx} style={{ fontSize: '14px', color: '#78350f', marginBottom: '8px' }}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Anomalies Table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: 0 }}>
                Detected Anomalies ({filteredAnomalies.length})
              </h3>
            </div>

            {filteredAnomalies.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ fontSize: '16px', color: '#6b7280' }}>No anomalies match the current filters.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Atom</th>
                      <th>Description</th>
                      <th>Suggested Action</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAnomalies.map((anomaly) => (
                      <tr key={anomaly.id}>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: getSeverityColor(anomaly.severity),
                              color: '#fff',
                              textTransform: 'capitalize'
                            }}
                          >
                            {anomaly.severity}
                          </span>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: getTypeColor(anomaly.type),
                              color: '#fff',
                              textTransform: 'capitalize'
                            }}
                          >
                            {anomaly.type}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          {anomaly.category.replace(/_/g, ' ')}
                        </td>
                        <td>
                          {anomaly.atom_id ? (
                            <div style={{ fontSize: '12px' }}>
                              <code>{anomaly.atom_id}</code>
                              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                                {anomaly.atom_name || 'Unknown'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: '13px', maxWidth: '300px' }}>
                          {anomaly.description}
                        </td>
                        <td style={{ fontSize: '12px', color: '#6b7280', maxWidth: '250px' }}>
                          {anomaly.suggested_action}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '50px', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px' }}>
                              <div style={{
                                width: `${anomaly.confidence * 100}%`,
                                height: '100%',
                                backgroundColor: anomaly.confidence > 0.8 ? '#10b981' : anomaly.confidence > 0.5 ? '#f59e0b' : '#6b7280',
                                borderRadius: '3px'
                              }} />
                            </div>
                            <span style={{ fontSize: '11px' }}>
                              {(anomaly.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty State */}
      {!report && !loading && (
        <div style={{
          padding: '60px',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          border: '2px dashed #e5e7eb'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔍</div>
          <h2 style={{ marginBottom: '10px', color: '#374151' }}>No Scan Results Yet</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
            Click "Run Anomaly Detection" to scan your knowledge graph for issues
          </p>
          <button onClick={runDetection} className="btn-primary">
            Run First Scan
          </button>
        </div>
      )}

      {/* Category Reference */}
      {categories.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <details>
            <summary style={{
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '15px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              Anomaly Category Reference
            </summary>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '15px'
            }}>
              {categories.map((cat) => (
                <div key={cat.category} className="card" style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: getTypeColor(cat.type),
                        color: '#fff',
                        fontSize: '11px'
                      }}
                    >
                      {cat.type}
                    </span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: getSeverityColor(cat.severity),
                        color: '#fff',
                        fontSize: '11px'
                      }}
                    >
                      {cat.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '5px' }}>
                    {cat.category.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {cat.description}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
