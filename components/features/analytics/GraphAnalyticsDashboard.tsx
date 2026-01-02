import React, { useState, useEffect } from 'react';
import '../../../styles.css';

interface CentralityResult {
  atom_id: string;
  atom_name: string;
  atom_type: string;
  betweenness_score: number;
  pagerank_score: number;
  degree_centrality: number;
  is_bottleneck: boolean;
  rank: number;
}

interface Community {
  community_id: number;
  atom_ids: string[];
  atom_count: number;
  suggested_module_name: string;
  cohesion_score: number;
  primary_types: string[];
}

interface IntegrityIssue {
  atom_id: string;
  atom_name: string;
  atom_type: string;
  issue_type: string;
  severity: string;
  description: string;
  suggested_fix: string | null;
}

interface IntegrityReport {
  status: string;
  summary: {
    total_atoms: number;
    total_relationships: number;
    total_issues: number;
    errors: number;
    warnings: number;
    info: number;
  };
  issues: IntegrityIssue[];
  health_score: number;
}

interface RelationshipSuggestion {
  source_atom_id: string;
  target_atom_id: string;
  suggested_edge_type: string;
  confidence: number;
  reason: string;
}

interface SemanticSuggestion {
  source_atom_id: string;
  source_name: string;
  target_atom_id: string;
  target_name: string;
  suggested_edge_type: string;
  confidence: number;
  reasoning: string;
  semantic_similarity: number;
  structural_support: string | null;
}

interface AnalyticsStats {
  graph_size: {
    atoms: number;
    relationships: number;
    density: number;
  };
  connectivity: {
    avg_degree: number;
    max_degree: number;
  };
  distribution: {
    atom_types: Record<string, number>;
    edge_types: Record<string, number>;
  };
}

type AnalyticsView = 'overview' | 'centrality' | 'communities' | 'integrity' | 'suggestions' | 'llm-inference';

export default function GraphAnalyticsDashboard() {
  const [activeView, setActiveView] = useState<AnalyticsView>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [centrality, setCentrality] = useState<CentralityResult[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null);
  const [suggestions, setSuggestions] = useState<RelationshipSuggestion[]>([]);
  const [llmSuggestions, setLlmSuggestions] = useState<SemanticSuggestion[]>([]);
  const [inferenceLoading, setInferenceLoading] = useState(false);

  // Load overview stats
  useEffect(() => {
    if (activeView === 'overview') {
      fetchStats();
    }
  }, [activeView]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/graph/analytics/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        setError('Failed to load analytics statistics');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCentrality = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/graph/analytics/centrality?limit=50');
      if (response.ok) {
        const data = await response.json();
        setCentrality(data);
      } else {
        setError('Failed to load centrality analysis');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunities = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/graph/analytics/communities?min_size=3');
      if (response.ok) {
        const data = await response.json();
        setCommunities(data);
      } else {
        setError('Failed to load community detection');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchIntegrity = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/graph/analytics/integrity');
      if (response.ok) {
        const data = await response.json();
        setIntegrityReport(data);
      } else {
        setError('Failed to load integrity validation');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/graph/analytics/suggestions?limit=20');
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      } else {
        setError('Failed to load relationship suggestions');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchLlmInference = async () => {
    setInferenceLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/relationships/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: 10,
          min_confidence: 0.6,
          include_reasoning: true
        })
      });
      if (response.ok) {
        const data = await response.json();
        setLlmSuggestions(data);
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to load LLM inference' }));
        setError(errorData.detail || 'Failed to load LLM inference');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setInferenceLoading(false);
    }
  };

  const handleViewChange = (view: AnalyticsView) => {
    setActiveView(view);
    switch (view) {
      case 'centrality':
        if (centrality.length === 0) fetchCentrality();
        break;
      case 'communities':
        if (communities.length === 0) fetchCommunities();
        break;
      case 'integrity':
        if (!integrityReport) fetchIntegrity();
        break;
      case 'suggestions':
        if (suggestions.length === 0) fetchSuggestions();
        break;
      case 'llm-inference':
        if (llmSuggestions.length === 0) fetchLlmInference();
        break;
    }
  };

  const renderOverview = () => {
    if (!stats) return <p>Loading statistics...</p>;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Graph Size Card */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Graph Size</h3>
          <div style={{ fontSize: '14px' }}>
            <p><strong>Atoms:</strong> {stats.graph_size.atoms}</p>
            <p><strong>Relationships:</strong> {stats.graph_size.relationships}</p>
            <p><strong>Density:</strong> {(stats.graph_size.density * 100).toFixed(2)}%</p>
          </div>
        </div>

        {/* Connectivity Card */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Connectivity</h3>
          <div style={{ fontSize: '14px' }}>
            <p><strong>Avg Degree:</strong> {stats.connectivity.avg_degree}</p>
            <p><strong>Max Degree:</strong> {stats.connectivity.max_degree}</p>
          </div>
        </div>

        {/* Atom Types Card */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Atom Types</h3>
          <div style={{ fontSize: '13px', maxHeight: '200px', overflowY: 'auto' }}>
            {Object.entries(stats.distribution.atom_types).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>{type || 'unknown'}:</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Edge Types Card */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Edge Types</h3>
          <div style={{ fontSize: '13px', maxHeight: '200px', overflowY: 'auto' }}>
            {Object.entries(stats.distribution.edge_types).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>{type}:</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCentrality = () => {
    const bottlenecks = centrality.filter(c => c.is_bottleneck);

    return (
      <div>
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>Centrality Analysis</h3>
          <p style={{ fontSize: '14px', marginBottom: '10px' }}>
            Identifies critical atoms based on betweenness (bottlenecks), PageRank (importance), and degree (connectivity).
          </p>
          <p style={{ fontSize: '14px', color: '#dc2626', fontWeight: 'bold' }}>
            {bottlenecks.length} bottleneck(s) detected
          </p>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Atom ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Betweenness</th>
              <th>PageRank</th>
              <th>Degree</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {centrality.map((item) => (
              <tr key={item.atom_id} style={{ backgroundColor: item.is_bottleneck ? '#fef2f2' : 'transparent' }}>
                <td>{item.rank}</td>
                <td><code style={{ fontSize: '12px' }}>{item.atom_id}</code></td>
                <td>{item.atom_name}</td>
                <td><span className="badge">{item.atom_type}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '60px', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}>
                      <div style={{
                        width: `${item.betweenness_score * 100}%`,
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        borderRadius: '4px'
                      }} />
                    </div>
                    <span style={{ fontSize: '12px' }}>{item.betweenness_score.toFixed(2)}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '60px', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}>
                      <div style={{
                        width: `${item.pagerank_score * 100}%`,
                        height: '100%',
                        backgroundColor: '#10b981',
                        borderRadius: '4px'
                      }} />
                    </div>
                    <span style={{ fontSize: '12px' }}>{item.pagerank_score.toFixed(2)}</span>
                  </div>
                </td>
                <td><strong>{item.degree_centrality}</strong></td>
                <td>
                  {item.is_bottleneck && (
                    <span className="badge" style={{ backgroundColor: '#dc2626', color: '#fff' }}>
                      Bottleneck
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCommunities = () => {
    return (
      <div>
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>Community Detection</h3>
          <p style={{ fontSize: '14px' }}>
            Identifies natural groupings of atoms that could become modules or indicate missing relationships.
          </p>
          <p style={{ fontSize: '14px', fontWeight: 'bold' }}>
            {communities.length} communities detected
          </p>
        </div>

        {communities.map((community) => (
          <div key={community.community_id} className="card" style={{ marginBottom: '20px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
              <div>
                <h4 style={{ marginTop: 0, marginBottom: '5px' }}>{community.suggested_module_name}</h4>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                  {community.atom_count} atoms • Cohesion: {(community.cohesion_score * 100).toFixed(1)}%
                </p>
              </div>
              <span className="badge" style={{ backgroundColor: '#10b981', color: '#fff' }}>
                Community #{community.community_id}
              </span>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <strong style={{ fontSize: '13px' }}>Primary Types:</strong>
              <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                {community.primary_types.map((type) => (
                  <span key={type} className="badge">{type}</span>
                ))}
              </div>
            </div>

            <div>
              <strong style={{ fontSize: '13px' }}>Atoms ({community.atom_ids.length}):</strong>
              <div style={{
                marginTop: '5px',
                fontSize: '12px',
                maxHeight: '100px',
                overflowY: 'auto',
                backgroundColor: '#f9fafb',
                padding: '10px',
                borderRadius: '4px'
              }}>
                {community.atom_ids.join(', ')}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderIntegrity = () => {
    if (!integrityReport) return <p>Loading integrity report...</p>;

    const { summary, issues, health_score } = integrityReport;

    return (
      <div>
        <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>Graph Integrity Validation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '15px' }}>
            <div>
              <p style={{ fontSize: '13px', margin: 0, color: '#6b7280' }}>Health Score</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0' }}>{health_score}%</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', margin: 0, color: '#6b7280' }}>Total Issues</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0' }}>{summary.total_issues}</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', margin: 0, color: '#dc2626' }}>Errors</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0', color: '#dc2626' }}>{summary.errors}</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', margin: 0, color: '#f59e0b' }}>Warnings</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0', color: '#f59e0b' }}>{summary.warnings}</p>
            </div>
          </div>
        </div>

        {issues.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
            <p style={{ fontSize: '18px', color: '#10b981', fontWeight: 'bold' }}>✓ No integrity issues found!</p>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>Your graph structure is healthy.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Atom ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Issue Type</th>
                <th>Description</th>
                <th>Suggested Fix</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue, idx) => (
                <tr key={idx}>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: issue.severity === 'error' ? '#dc2626' : issue.severity === 'warning' ? '#f59e0b' : '#6b7280',
                        color: '#fff'
                      }}
                    >
                      {issue.severity}
                    </span>
                  </td>
                  <td><code style={{ fontSize: '12px' }}>{issue.atom_id}</code></td>
                  <td>{issue.atom_name}</td>
                  <td><span className="badge">{issue.atom_type}</span></td>
                  <td><span className="badge">{issue.issue_type.replace(/_/g, ' ')}</span></td>
                  <td style={{ fontSize: '13px' }}>{issue.description}</td>
                  <td style={{ fontSize: '12px', color: '#6b7280' }}>{issue.suggested_fix || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderSuggestions = () => {
    return (
      <div>
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f3ff', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>Relationship Suggestions</h3>
          <p style={{ fontSize: '14px' }}>
            AI-powered suggestions for missing relationships based on graph structure and common patterns.
          </p>
          <p style={{ fontSize: '14px', fontWeight: 'bold' }}>
            {suggestions.length} potential relationships identified
          </p>
        </div>

        {suggestions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <p style={{ fontSize: '16px', color: '#6b7280' }}>No relationship suggestions at this time.</p>
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>Your graph appears well-connected!</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Source Atom</th>
                <th>→</th>
                <th>Target Atom</th>
                <th>Suggested Edge</th>
                <th>Confidence</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((suggestion, idx) => (
                <tr key={idx}>
                  <td><code style={{ fontSize: '12px' }}>{suggestion.source_atom_id}</code></td>
                  <td style={{ textAlign: 'center', fontSize: '18px', color: '#9ca3af' }}>→</td>
                  <td><code style={{ fontSize: '12px' }}>{suggestion.target_atom_id}</code></td>
                  <td>
                    <span className="badge" style={{ backgroundColor: '#8b5cf6', color: '#fff' }}>
                      {suggestion.suggested_edge_type}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '80px', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}>
                        <div style={{
                          width: `${suggestion.confidence * 100}%`,
                          height: '100%',
                          backgroundColor: suggestion.confidence > 0.7 ? '#10b981' : suggestion.confidence > 0.5 ? '#f59e0b' : '#6b7280',
                          borderRadius: '4px'
                        }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        {(suggestion.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: '13px', color: '#6b7280' }}>{suggestion.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <div className="container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ marginBottom: '10px' }}>Graph Analytics</h1>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Advanced graph algorithms and insights for your knowledge graph
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '10px'
      }}>
        <button
          className={activeView === 'overview' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => handleViewChange('overview')}
        >
          Overview
        </button>
        <button
          className={activeView === 'centrality' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => handleViewChange('centrality')}
        >
          Centrality
        </button>
        <button
          className={activeView === 'communities' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => handleViewChange('communities')}
        >
          Communities
        </button>
        <button
          className={activeView === 'integrity' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => handleViewChange('integrity')}
        >
          Integrity
        </button>
        <button
          className={activeView === 'suggestions' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => handleViewChange('suggestions')}
        >
          Suggestions
        </button>
        <button
          className={activeView === 'llm-inference' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => handleViewChange('llm-inference')}
        >
          LLM Inference
        </button>
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

      {/* Loading Indicator */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>Loading analytics...</p>
        </div>
      )}

      {/* Content */}
      {!loading && !inferenceLoading && (
        <>
          {activeView === 'overview' && renderOverview()}
          {activeView === 'centrality' && renderCentrality()}
          {activeView === 'communities' && renderCommunities()}
          {activeView === 'integrity' && renderIntegrity()}
          {activeView === 'suggestions' && renderSuggestions()}
          {activeView === 'llm-inference' && renderLlmInference()}
        </>
      )}

      {/* LLM Inference Loading */}
      {inferenceLoading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '16px', color: '#6b7280' }}>Running LLM-powered inference...</p>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '10px' }}>
            This may take 30-60 seconds as Claude analyzes atom relationships
          </p>
        </div>
      )}
    </div>
  );

  function renderLlmInference() {
    return (
      <div>
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>LLM-Powered Relationship Inference</h3>
          <p style={{ fontSize: '14px', marginBottom: '10px' }}>
            Uses Claude AI to analyze atom content semantically and suggest meaningful relationships.
            Combines vector similarity (ChromaDB) + graph structure (Neo4j) + LLM reasoning.
          </p>
          <button
            onClick={fetchLlmInference}
            className="btn-primary"
            style={{ marginTop: '10px' }}
            disabled={inferenceLoading}
          >
            {inferenceLoading ? 'Running Inference...' : 'Run New Inference'}
          </button>
        </div>

        {llmSuggestions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <p style={{ fontSize: '16px', color: '#6b7280' }}>No LLM suggestions yet.</p>
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>Click "Run New Inference" to analyze relationships.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Source</th>
                <th>→</th>
                <th>Target</th>
                <th>Edge Type</th>
                <th>Confidence</th>
                <th>Similarity</th>
                <th>Reasoning</th>
                <th>Structure</th>
              </tr>
            </thead>
            <tbody>
              {llmSuggestions.map((suggestion, idx) => (
                <tr key={idx}>
                  <td>
                    <div style={{ fontSize: '12px' }}>
                      <code>{suggestion.source_atom_id}</code>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        {suggestion.source_name}
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '18px', color: '#9ca3af' }}>→</td>
                  <td>
                    <div style={{ fontSize: '12px' }}>
                      <code>{suggestion.target_atom_id}</code>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        {suggestion.target_name}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ backgroundColor: '#8b5cf6', color: '#fff' }}>
                      {suggestion.suggested_edge_type}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '60px', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}>
                        <div style={{
                          width: `${suggestion.confidence * 100}%`,
                          height: '100%',
                          backgroundColor: suggestion.confidence > 0.8 ? '#10b981' : suggestion.confidence > 0.6 ? '#f59e0b' : '#6b7280',
                          borderRadius: '4px'
                        }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        {(suggestion.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '50px', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px' }}>
                        <div style={{
                          width: `${suggestion.semantic_similarity * 100}%`,
                          height: '100%',
                          backgroundColor: '#3b82f6',
                          borderRadius: '3px'
                        }} />
                      </div>
                      <span style={{ fontSize: '11px' }}>
                        {(suggestion.semantic_similarity * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: '12px', color: '#374151', maxWidth: '300px' }}>
                    {suggestion.reasoning}
                  </td>
                  <td style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {suggestion.structural_support || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }
}
