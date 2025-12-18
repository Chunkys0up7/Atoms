import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as d3 from 'd3';

/**
 * GNDP Documentation Browser
 * Standalone React application for browsing graph-native documentation
 * 
 * Features:
 * - Interactive graph visualization
 * - Full-text search
 * - Atom/Module browsing
 * - Impact analysis view
 * - Markdown rendering
 */

// =============================================================================
// DATA CONTEXT
// =============================================================================

const DataContext = React.createContext(null);

const useData = () => React.useContext(DataContext);

// =============================================================================
// GRAPH VISUALIZATION COMPONENT
// =============================================================================

const GraphVisualization = ({ 
  nodes, 
  edges, 
  onNodeClick, 
  selectedNodeId,
  highlightedNodes = new Set(),
  width = 800, 
  height = 600 
}) => {
  const svgRef = React.useRef(null);
  const [simulation, setSimulation] = useState(null);

  const nodeColors = {
    PROCESS: '#3B82F6',
    DECISION: '#F59E0B',
    ROLE: '#10B981',
    SYSTEM: '#8B5CF6',
    DOCUMENT: '#6B7280',
    REGULATION: '#EC4899',
    METRIC: '#06B6D4',
    RISK: '#EF4444'
  };

  const edgeColors = {
    TRIGGERS: '#3B82F6',
    REQUIRES: '#EC4899',
    PRODUCES: '#10B981',
    GOVERNED_BY: '#8B5CF6',
    PERFORMED_BY: '#F59E0B'
  };

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const g = svg.append('g');

    // Arrow markers
    const defs = svg.append('defs');
    Object.entries(edgeColors).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', color)
        .attr('d', 'M0,-5L10,0L0,5');
    });

    // Create simulation
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(edges)
      .enter()
      .append('line')
      .attr('stroke', d => edgeColors[d.type] || '#64748B')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', d => 
        highlightedNodes.size === 0 || 
        (highlightedNodes.has(d.source.id || d.source) && 
         highlightedNodes.has(d.target.id || d.target)) ? 0.6 : 0.1
      )
      .attr('marker-end', d => `url(#arrow-${d.type})`);

    // Draw link labels
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(edges)
      .enter()
      .append('text')
      .attr('font-size', '9px')
      .attr('fill', d => edgeColors[d.type] || '#64748B')
      .attr('text-anchor', 'middle')
      .attr('opacity', d => 
        highlightedNodes.size === 0 || 
        (highlightedNodes.has(d.source.id || d.source) && 
         highlightedNodes.has(d.target.id || d.target)) ? 1 : 0
      )
      .text(d => d.type);

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .attr('opacity', d => 
        highlightedNodes.size === 0 || highlightedNodes.has(d.id) ? 1 : 0.2
      )
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick?.(d);
      });

    // Node circles
    node.append('circle')
      .attr('r', 25)
      .attr('fill', d => nodeColors[d.type] || '#64748B')
      .attr('stroke', d => d.id === selectedNodeId ? '#fff' : '#1E293B')
      .attr('stroke-width', d => d.id === selectedNodeId ? 3 : 2);

    // Node labels
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', 'white')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text(d => d.label?.substring(0, 10) || d.id.substring(0, 8));

    // Node IDs below
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 40)
      .attr('fill', '#94A3B8')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .text(d => d.id);

    // Tick function
    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      linkLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    setSimulation(sim);

    return () => sim.stop();
  }, [nodes, edges, selectedNodeId, highlightedNodes, width, height]);

  return (
    <svg 
      ref={svgRef} 
      width={width} 
      height={height}
      style={{ background: '#0F172A', borderRadius: '12px' }}
    />
  );
};

// =============================================================================
// ATOM DETAIL PANEL
// =============================================================================

const AtomDetailPanel = ({ atom, allAtoms, onNavigate, onClose }) => {
  if (!atom) return null;

  const typeColors = {
    PROCESS: 'bg-blue-500',
    DECISION: 'bg-amber-500',
    ROLE: 'bg-emerald-500',
    SYSTEM: 'bg-violet-500',
    REGULATION: 'bg-pink-500'
  };

  const getTargetAtom = (targetId) => allAtoms.find(a => a.id === targetId);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg">
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className={`${typeColors[atom.type] || 'bg-slate-500'} text-white text-xs px-2 py-1 rounded`}>
            {atom.type}
          </span>
          <h2 className="text-xl font-semibold text-white mt-2">{atom.label}</h2>
          <code className="text-slate-400 text-sm">{atom.id}</code>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {atom.description && (
        <p className="text-slate-300 text-sm mb-4">{atom.description}</p>
      )}

      {atom.content?.steps && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Steps</h3>
          <ol className="list-decimal list-inside text-sm text-slate-300 space-y-1">
            {atom.content.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {atom.edges && atom.edges.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">Relationships</h3>
          <div className="space-y-2">
            {atom.edges.map((edge, i) => {
              const targetAtom = getTargetAtom(edge.target);
              return (
                <div 
                  key={i}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                    {edge.type}
                  </span>
                  <button
                    onClick={() => onNavigate(edge.target)}
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    {targetAtom?.label || edge.target}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-500">
        <div>Owner: {atom.owner || 'Unassigned'}</div>
        <div>Status: {atom.status || 'Draft'}</div>
        <div>Version: {atom.version || '1.0.0'}</div>
      </div>
    </div>
  );
};

// =============================================================================
// SEARCH COMPONENT
// =============================================================================

const SearchPanel = ({ atoms, onSelect }) => {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(null);

  const results = useMemo(() => {
    if (!query && !typeFilter) return [];
    
    return atoms.filter(atom => {
      const matchesType = !typeFilter || atom.type === typeFilter;
      const matchesQuery = !query || 
        atom.id.toLowerCase().includes(query.toLowerCase()) ||
        atom.label?.toLowerCase().includes(query.toLowerCase()) ||
        atom.description?.toLowerCase().includes(query.toLowerCase());
      return matchesType && matchesQuery;
    }).slice(0, 20);
  }, [atoms, query, typeFilter]);

  const atomTypes = [...new Set(atoms.map(a => a.type))];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
      <input
        type="text"
        placeholder="Search atoms..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
      />
      
      <div className="flex gap-2 mt-3 flex-wrap">
        <button
          onClick={() => setTypeFilter(null)}
          className={`px-3 py-1 rounded text-sm ${
            !typeFilter ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          All
        </button>
        {atomTypes.map(type => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-3 py-1 rounded text-sm ${
              typeFilter === type ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {results.length > 0 && (
        <div className="mt-4 space-y-2 max-h-64 overflow-auto">
          {results.map(atom => (
            <button
              key={atom.id}
              onClick={() => onSelect(atom)}
              className="w-full text-left p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs bg-slate-600 px-2 py-0.5 rounded">
                  {atom.type}
                </span>
                <span className="text-white font-medium">{atom.label}</span>
              </div>
              <code className="text-xs text-slate-400">{atom.id}</code>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// IMPACT ANALYSIS COMPONENT
// =============================================================================

const ImpactAnalysis = ({ atoms, edges, selectedAtomId }) => {
  const impact = useMemo(() => {
    if (!selectedAtomId) return null;

    const downstream = new Set();
    const queue = [selectedAtomId];
    const distances = { [selectedAtomId]: 0 };

    while (queue.length > 0) {
      const current = queue.shift();
      const currentDist = distances[current];

      edges
        .filter(e => (e.source.id || e.source) === current)
        .forEach(e => {
          const targetId = e.target.id || e.target;
          if (!downstream.has(targetId) && targetId !== selectedAtomId) {
            downstream.add(targetId);
            distances[targetId] = currentDist + 1;
            queue.push(targetId);
          }
        });
    }

    const affectedAtoms = Array.from(downstream).map(id => ({
      ...atoms.find(a => a.id === id),
      distance: distances[id]
    })).filter(a => a.id);

    // Calculate risk
    const riskScore = affectedAtoms.reduce((score, atom) => {
      const typeWeight = {
        REGULATION: 50,
        SYSTEM: 30,
        PROCESS: 20,
        DECISION: 25,
        ROLE: 15
      }[atom.type] || 10;
      return score + typeWeight / atom.distance;
    }, 0);

    const riskLevel = riskScore < 30 ? 'LOW' : riskScore < 70 ? 'MEDIUM' : riskScore < 150 ? 'HIGH' : 'CRITICAL';

    return {
      affectedAtoms,
      riskScore: Math.round(riskScore),
      riskLevel,
      direct: affectedAtoms.filter(a => a.distance === 1),
      indirect: affectedAtoms.filter(a => a.distance > 1)
    };
  }, [atoms, edges, selectedAtomId]);

  if (!impact) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 text-center text-slate-400">
        Select an atom to analyze impact
      </div>
    );
  }

  const riskColors = {
    LOW: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    MEDIUM: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    HIGH: 'text-red-400 bg-red-400/10 border-red-400/30',
    CRITICAL: 'text-violet-400 bg-violet-400/10 border-violet-400/30'
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Impact Analysis</h3>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-white">{impact.affectedAtoms.length}</div>
          <div className="text-sm text-slate-400">Affected Atoms</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-white">{impact.riskScore}</div>
          <div className="text-sm text-slate-400">Risk Score</div>
        </div>
        <div className="text-center">
          <div className={`inline-block px-3 py-1 rounded border ${riskColors[impact.riskLevel]}`}>
            {impact.riskLevel}
          </div>
          <div className="text-sm text-slate-400 mt-1">Risk Level</div>
        </div>
      </div>

      {impact.direct.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-red-400 mb-2">
            Direct Impact ({impact.direct.length})
          </h4>
          <div className="space-y-1">
            {impact.direct.map(atom => (
              <div key={atom.id} className="text-sm text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                {atom.label || atom.id}
              </div>
            ))}
          </div>
        </div>
      )}

      {impact.indirect.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-amber-400 mb-2">
            Indirect Impact ({impact.indirect.length})
          </h4>
          <div className="space-y-1">
            {impact.indirect.slice(0, 10).map(atom => (
              <div key={atom.id} className="text-sm text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                {atom.label || atom.id}
                <span className="text-slate-500 text-xs">(depth: {atom.distance})</span>
              </div>
            ))}
            {impact.indirect.length > 10 && (
              <div className="text-slate-500 text-sm">
                +{impact.indirect.length - 10} more...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

const GNDPBrowser = ({ dataUrl = '/api/graph/full.json' }) => {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [selectedAtom, setSelectedAtom] = useState(null);
  const [activeView, setActiveView] = useState('graph');
  const [loading, setLoading] = useState(true);

  // Highlighted nodes for impact view
  const highlightedNodes = useMemo(() => {
    if (!selectedAtom || activeView !== 'impact') return new Set();
    
    const affected = new Set([selectedAtom.id]);
    const queue = [selectedAtom.id];

    while (queue.length > 0) {
      const current = queue.shift();
      graphData.edges
        .filter(e => (e.source.id || e.source) === current)
        .forEach(e => {
          const targetId = e.target.id || e.target;
          if (!affected.has(targetId)) {
            affected.add(targetId);
            queue.push(targetId);
          }
        });
    }

    return affected;
  }, [selectedAtom, graphData.edges, activeView]);

  useEffect(() => {
    fetch(dataUrl)
      .then(res => res.json())
      .then(data => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load graph data:', err);
        setLoading(false);
      });
  }, [dataUrl]);

  const handleNodeClick = useCallback((node) => {
    const fullAtom = graphData.nodes.find(n => n.id === node.id);
    setSelectedAtom(fullAtom);
  }, [graphData.nodes]);

  const handleNavigate = useCallback((atomId) => {
    const atom = graphData.nodes.find(n => n.id === atomId);
    if (atom) setSelectedAtom(atom);
  }, [graphData.nodes]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading documentation...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            GNDP Documentation Browser
          </h1>
          <nav className="flex gap-2">
            {['graph', 'search', 'impact'].map(view => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === view 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="flex gap-6">
          {/* Left Panel - Graph or Search */}
          <div className="flex-1">
            {activeView === 'graph' && (
              <GraphVisualization
                nodes={graphData.nodes}
                edges={graphData.edges}
                onNodeClick={handleNodeClick}
                selectedNodeId={selectedAtom?.id}
                highlightedNodes={highlightedNodes}
                width={900}
                height={600}
              />
            )}
            
            {activeView === 'search' && (
              <SearchPanel
                atoms={graphData.nodes}
                onSelect={setSelectedAtom}
              />
            )}

            {activeView === 'impact' && (
              <div className="space-y-6">
                <GraphVisualization
                  nodes={graphData.nodes}
                  edges={graphData.edges}
                  onNodeClick={handleNodeClick}
                  selectedNodeId={selectedAtom?.id}
                  highlightedNodes={highlightedNodes}
                  width={900}
                  height={400}
                />
                <ImpactAnalysis
                  atoms={graphData.nodes}
                  edges={graphData.edges}
                  selectedAtomId={selectedAtom?.id}
                />
              </div>
            )}
          </div>

          {/* Right Panel - Detail */}
          <div className="w-96">
            <AtomDetailPanel
              atom={selectedAtom}
              allAtoms={graphData.nodes}
              onNavigate={handleNavigate}
              onClose={() => setSelectedAtom(null)}
            />
          </div>
        </div>
      </main>

      {/* Stats Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <div className="flex gap-6">
            <span>{graphData.nodes.length} atoms</span>
            <span>{graphData.edges.length} relationships</span>
            <span>{new Set(graphData.nodes.map(n => n.type)).size} types</span>
          </div>
          <div>
            GNDP v1.0.0
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GNDPBrowser;
