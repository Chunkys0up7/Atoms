# Knowledge Graph Visualization

This page provides an interactive visualization of the entire GNDP knowledge graph.

## Graph Overview

The GNDP system currently contains:

- **23 Atoms** across 6 categories
- **5 Modules** representing major system components
- **Relationships** showing dependencies, triggers, and validations

## Interactive Graph

<div id="gndp-graph-container" style="width: 100%; height: 600px; border: 1px solid #ddd; border-radius: 4px; margin: 20px 0;"></div>

<script>
// Graph data will be loaded from generated/api/graph/full.json
// Visualization using D3.js or similar

async function loadGraph() {
    try {
        // Use relative path for MkDocs static serving
        const response = await fetch('../generated/api/graph/full.json');
        const graphData = await response.json();

        // TODO: Render graph using D3.js or vis.js
        console.log('Graph data loaded:', graphData);

        // Placeholder: Display node count
        const container = document.getElementById('gndp-graph-container');
        container.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h2>Graph Statistics</h2>
                <p><strong>Nodes:</strong> ${graphData.nodes.length}</p>
                <p><strong>Edges:</strong> ${graphData.edges.length}</p>
                <p><em>Interactive visualization coming soon...</em></p>
                <p>
                    <a href="/generated/api/graph/full.json" target="_blank">
                        View raw JSON →
                    </a>
                </p>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load graph:', error);
        document.getElementById('gndp-graph-container').innerHTML = `
            <div style="padding: 20px; text-align: center; color: #999;">
                <h3>Graph Visualization Unavailable</h3>
                <p>Could not load graph data from <code>generated/api/graph/full.json</code></p>
                <p><small>Error: ${error.message}</small></p>
                <p style="margin-top: 20px;">
                    <strong>Possible solutions:</strong><br>
                    1. Run <code>python docs/build_docs.py --source . --output docs/generated</code> to generate the graph<br>
                    2. Ensure MkDocs is serving the <code>docs/generated</code> directory<br>
                    3. Check browser console for CORS or network errors
                </p>
            </div>
        `;
    }
}

// Load graph on page load
document.addEventListener('DOMContentLoaded', loadGraph);
</script>

## Graph by Type

View atoms filtered by type:

- [Requirements](generated/api/graph/type/requirement.json) - System requirements
- [Designs](generated/api/graph/type/design.json) - Design specifications
- [Procedures](generated/api/graph/type/procedure.json) - Operational procedures
- [Validations](generated/api/graph/type/validation.json) - Test specifications
- [Policies](generated/api/graph/type/policy.json) - Governance policies
- [Risks](generated/api/graph/type/risk.json) - Identified risks

## Module Graphs

View subgraphs for each module:

- [Authentication System](generated/api/graph/module/auth-system.json)
- [API Gateway](generated/api/graph/module/api-gateway.json)
- [Data Layer](generated/api/graph/module/data-layer.json)
- [Knowledge Graph](generated/api/graph/module/knowledge-graph.json)
- [AI Agent](generated/api/graph/module/ai-agent.json)

## Graph Analysis

### Centrality Analysis

Atoms with the highest degree centrality (most connections):

1. REQ-001 - User Authentication System
2. REQ-002 - Data Storage Requirements
3. DES-001 - System Architecture

### Critical Paths

Paths that, if broken, would impact multiple modules:

- REQ-001 → DES-001 → PROC-001 → VAL-001
- REQ-002 → DES-002 → PROC-002 → VAL-002

### Risk Coverage

Percentage of risks mitigated by controls:

- Identity Fraud: 85%
- Data Breach: 90%
- Performance Issues: 75%

---

*Graph data is automatically updated on each build*
*Last generated: 2025-12-18*
