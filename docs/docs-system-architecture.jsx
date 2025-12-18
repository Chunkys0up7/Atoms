import React, { useState } from 'react';

const DocsAsCodeArchitecture = () => {
  const [activeLayer, setActiveLayer] = useState(null);
  const [activeView, setActiveView] = useState('architecture');

  const layers = [
    {
      id: 'ingestion',
      name: 'Document Ingestion Layer',
      color: '#3B82F6',
      components: ['Existing Doc Parser', 'Template Engine', 'Atom Extractor', 'Schema Validator'],
      description: 'Converts existing documents into atomic units, extracts relationships, validates against schemas'
    },
    {
      id: 'graph',
      name: 'Graph Storage Layer',
      color: '#8B5CF6',
      components: ['Neo4j/NetworkX', 'Atom Nodes', 'Edge Registry', 'Version Control'],
      description: 'Stores atoms as nodes, relationships as edges, maintains full version history'
    },
    {
      id: 'cicd',
      name: 'CI/CD & Governance Layer',
      color: '#EC4899',
      components: ['Change Detection', 'Impact Analyzer', 'Risk Scorer', 'Approval Workflow'],
      description: 'Handles change management, calculates risk scores, routes approvals based on impact'
    },
    {
      id: 'rag',
      name: 'Graph RAG Layer',
      color: '#10B981',
      components: ['Graph Embeddings', 'Context Builder', 'Multi-RAG Router', 'Query Engine'],
      description: 'Leverages graph structure for intelligent retrieval, builds context-aware responses'
    },
    {
      id: 'output',
      name: 'Output Generation Layer',
      color: '#F59E0B',
      components: ['MD Generator', 'Graph Visualizer', 'Report Builder', 'API Endpoints'],
      description: 'Produces markdown docs, interactive graphs, impact reports, searchable interfaces'
    }
  ];

  const atomTypes = [
    { type: 'PROCESS', icon: '⚙️', desc: 'Business process steps' },
    { type: 'DECISION', icon: '◇', desc: 'Decision points/gates' },
    { type: 'ROLE', icon: '👤', desc: 'Responsible parties' },
    { type: 'SYSTEM', icon: '💻', desc: 'Systems/tools involved' },
    { type: 'DOCUMENT', icon: '📄', desc: 'Required documents' },
    { type: 'REGULATION', icon: '⚖️', desc: 'Compliance requirements' },
    { type: 'METRIC', icon: '📊', desc: 'KPIs and measurements' },
    { type: 'RISK', icon: '⚠️', desc: 'Risk factors' }
  ];

  const edgeTypes = [
    { type: 'TRIGGERS', color: '#3B82F6', desc: 'A triggers B to start' },
    { type: 'REQUIRES', color: '#EC4899', desc: 'A requires B to complete' },
    { type: 'PRODUCES', color: '#10B981', desc: 'A produces B as output' },
    { type: 'GOVERNED_BY', color: '#8B5CF6', desc: 'A is governed by B' },
    { type: 'PERFORMED_BY', color: '#F59E0B', desc: 'A is performed by B' },
    { type: 'MEASURED_BY', color: '#06B6D4', desc: 'A is measured by B' },
    { type: 'MITIGATES', color: '#EF4444', desc: 'A mitigates risk B' }
  ];

  const sampleGraph = {
    nodes: [
      { id: 1, label: 'Receive Application', type: 'PROCESS', x: 100, y: 150 },
      { id: 2, label: 'Verify Income', type: 'PROCESS', x: 280, y: 100 },
      { id: 3, label: 'Credit Check', type: 'PROCESS', x: 280, y: 200 },
      { id: 4, label: 'Income Sufficient?', type: 'DECISION', x: 460, y: 150 },
      { id: 5, label: 'Loan Officer', type: 'ROLE', x: 180, y: 280 },
      { id: 6, label: 'TRID Compliance', type: 'REGULATION', x: 380, y: 280 },
      { id: 7, label: 'LOS System', type: 'SYSTEM', x: 100, y: 50 },
      { id: 8, label: 'Processing Time', type: 'METRIC', x: 460, y: 50 }
    ],
    edges: [
      { from: 1, to: 2, type: 'TRIGGERS' },
      { from: 1, to: 3, type: 'TRIGGERS' },
      { from: 2, to: 4, type: 'TRIGGERS' },
      { from: 3, to: 4, type: 'REQUIRES' },
      { from: 5, to: 1, type: 'PERFORMED_BY' },
      { from: 5, to: 2, type: 'PERFORMED_BY' },
      { from: 6, to: 1, type: 'GOVERNED_BY' },
      { from: 7, to: 1, type: 'REQUIRES' },
      { from: 8, to: 2, type: 'MEASURED_BY' }
    ]
  };

  const getNodeColor = (type) => {
    const colors = {
      'PROCESS': '#3B82F6',
      'DECISION': '#F59E0B',
      'ROLE': '#10B981',
      'SYSTEM': '#8B5CF6',
      'DOCUMENT': '#6B7280',
      'REGULATION': '#EC4899',
      'METRIC': '#06B6D4',
      'RISK': '#EF4444'
    };
    return colors[type] || '#6B7280';
  };

  const getEdgeColor = (type) => {
    const edge = edgeTypes.find(e => e.type === type);
    return edge ? edge.color : '#94A3B8';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Graph-Native Documentation Platform
          </h1>
          <p className="text-gray-400 mt-2 text-lg">
            Atoms • Edges • RAG • Impact Analysis • CI/CD
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {['architecture', 'graph', 'atoms', 'pipeline'].map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeView === view 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>

        {/* Architecture View */}
        {activeView === 'architecture' && (
          <div className="space-y-4">
            {layers.map((layer, idx) => (
              <div
                key={layer.id}
                className={`bg-gray-900 rounded-xl p-6 border-l-4 cursor-pointer transition-all ${
                  activeLayer === layer.id ? 'ring-2 ring-white/20' : ''
                }`}
                style={{ borderColor: layer.color }}
                onClick={() => setActiveLayer(activeLayer === layer.id ? null : layer.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                      style={{ backgroundColor: layer.color + '30', color: layer.color }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{layer.name}</h3>
                      <p className="text-gray-400 text-sm mt-1">{layer.description}</p>
                    </div>
                  </div>
                  <span className="text-gray-500">{activeLayer === layer.id ? '▼' : '▶'}</span>
                </div>
                
                {activeLayer === layer.id && (
                  <div className="mt-4 grid grid-cols-4 gap-3">
                    {layer.components.map(comp => (
                      <div 
                        key={comp}
                        className="bg-gray-800 rounded-lg p-3 text-center text-sm"
                        style={{ borderTop: `2px solid ${layer.color}` }}
                      >
                        {comp}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {/* Data Flow Arrows */}
            <div className="flex justify-center py-4">
              <div className="flex items-center gap-4 text-gray-500">
                <span>↓ Ingest</span>
                <span>→ Store</span>
                <span>→ Govern</span>
                <span>→ Query</span>
                <span>→ Output ↓</span>
              </div>
            </div>
          </div>
        )}

        {/* Graph Demo View */}
        {activeView === 'graph' && (
          <div className="bg-gray-900 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Sample Process Graph</h3>
            <div className="relative bg-gray-950 rounded-lg h-96 overflow-hidden">
              {/* SVG for edges */}
              <svg className="absolute inset-0 w-full h-full">
                {sampleGraph.edges.map((edge, idx) => {
                  const fromNode = sampleGraph.nodes.find(n => n.id === edge.from);
                  const toNode = sampleGraph.nodes.find(n => n.id === edge.to);
                  return (
                    <g key={idx}>
                      <line
                        x1={fromNode.x + 60}
                        y1={fromNode.y + 20}
                        x2={toNode.x + 60}
                        y2={toNode.y + 20}
                        stroke={getEdgeColor(edge.type)}
                        strokeWidth="2"
                        strokeDasharray={edge.type === 'GOVERNED_BY' ? '5,5' : 'none'}
                        markerEnd="url(#arrow)"
                      />
                      <text
                        x={(fromNode.x + toNode.x) / 2 + 60}
                        y={(fromNode.y + toNode.y) / 2 + 15}
                        fill={getEdgeColor(edge.type)}
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {edge.type}
                      </text>
                    </g>
                  );
                })}
                <defs>
                  <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill="#94A3B8" />
                  </marker>
                </defs>
              </svg>
              
              {/* Nodes */}
              {sampleGraph.nodes.map(node => (
                <div
                  key={node.id}
                  className="absolute px-3 py-2 rounded-lg text-xs font-medium shadow-lg cursor-pointer hover:scale-105 transition-transform"
                  style={{
                    left: node.x,
                    top: node.y,
                    backgroundColor: getNodeColor(node.type),
                    minWidth: '120px',
                    textAlign: 'center'
                  }}
                >
                  <div className="opacity-70 text-[10px]">{node.type}</div>
                  <div>{node.label}</div>
                </div>
              ))}
            </div>
            
            {/* Edge Legend */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              {edgeTypes.map(edge => (
                <div key={edge.type} className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-0.5" style={{ backgroundColor: edge.color }}></div>
                  <span className="text-gray-400">{edge.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Atom Types View */}
        {activeView === 'atoms' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-900 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4">Atom Types</h3>
              <div className="space-y-3">
                {atomTypes.map(atom => (
                  <div key={atom.type} className="flex items-center gap-4 bg-gray-800 rounded-lg p-3">
                    <span className="text-2xl">{atom.icon}</span>
                    <div>
                      <div className="font-medium" style={{ color: getNodeColor(atom.type) }}>
                        {atom.type}
                      </div>
                      <div className="text-gray-400 text-sm">{atom.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4">Atom Schema</h3>
              <pre className="bg-gray-950 rounded-lg p-4 text-sm overflow-auto">
{`{
  "atom_id": "PROC-001",
  "type": "PROCESS",
  "name": "Verify Borrower Income",
  "description": "...",
  "version": "2.1.0",
  "status": "ACTIVE",
  
  "metadata": {
    "owner": "Underwriting Team",
    "created": "2024-01-15",
    "sla_hours": 24,
    "risk_level": "MEDIUM"
  },
  
  "edges": {
    "triggered_by": ["PROC-000"],
    "triggers": ["DEC-001"],
    "requires": ["DOC-003", "SYS-002"],
    "performed_by": ["ROLE-005"],
    "governed_by": ["REG-012"],
    "measured_by": ["MET-008"]
  },
  
  "content": {
    "steps": [...],
    "exceptions": [...],
    "notes": [...]
  }
}`}
              </pre>
            </div>
          </div>
        )}

        {/* CI/CD Pipeline View */}
        {activeView === 'pipeline' && (
          <div className="bg-gray-900 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-6">Change Pipeline with Impact Analysis</h3>
            
            <div className="flex items-center justify-between gap-4 mb-8">
              {[
                { stage: 'Propose', icon: '📝', desc: 'Submit change' },
                { stage: 'Analyze', icon: '🔍', desc: 'Graph traversal' },
                { stage: 'Score', icon: '📊', desc: 'Risk calculation' },
                { stage: 'Route', icon: '🔀', desc: 'Approval path' },
                { stage: 'Review', icon: '👁️', desc: 'Human approval' },
                { stage: 'Deploy', icon: '🚀', desc: 'Merge & publish' }
              ].map((step, idx) => (
                <React.Fragment key={step.stage}>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-2xl mb-2">
                      {step.icon}
                    </div>
                    <div className="font-medium">{step.stage}</div>
                    <div className="text-gray-500 text-xs">{step.desc}</div>
                  </div>
                  {idx < 5 && <div className="text-gray-600 text-2xl">→</div>}
                </React.Fragment>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-green-400 mb-2">Low Risk (Auto-Approve)</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Typo fixes</li>
                  <li>• Clarification updates</li>
                  <li>• Metadata changes</li>
                  <li>• ≤2 downstream atoms</li>
                </ul>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-yellow-400 mb-2">Medium Risk (Team Review)</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Process step changes</li>
                  <li>• New edge creation</li>
                  <li>• Role reassignment</li>
                  <li>• 3-10 downstream atoms</li>
                </ul>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-red-400 mb-2">High Risk (Escalated)</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Regulation changes</li>
                  <li>• Cross-process impacts</li>
                  <li>• System dependencies</li>
                  <li>• 10+ downstream atoms</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 bg-gray-950 rounded-lg p-4">
              <h4 className="font-medium mb-3">Impact Analysis Query</h4>
              <pre className="text-sm text-blue-400">
{`MATCH (changed:Atom {id: 'PROC-005'})
CALL apoc.path.subgraphNodes(changed, {
  relationshipFilter: "TRIGGERS>|REQUIRES>|PRODUCES>",
  maxLevel: 5
}) YIELD node as impacted
RETURN impacted.id, impacted.type, impacted.owner,
       length(shortestPath((changed)-[*]->(impacted))) as distance`}
              </pre>
            </div>
          </div>
        )}

        {/* RAG Architecture Summary */}
        <div className="mt-8 bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 border border-blue-500/30">
          <h3 className="text-xl font-semibold mb-4">Graph RAG Intelligence Layer</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-blue-400 font-medium mb-2">Entity RAG</div>
              <p className="text-sm text-gray-400">Query specific atoms by type, owner, status</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-purple-400 font-medium mb-2">Path RAG</div>
              <p className="text-sm text-gray-400">Traverse relationships, find connections</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-pink-400 font-medium mb-2">Impact RAG</div>
              <p className="text-sm text-gray-400">"What if" analysis on changes</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="text-green-400 font-medium mb-2">Semantic RAG</div>
              <p className="text-sm text-gray-400">Natural language over graph</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsAsCodeArchitecture;
