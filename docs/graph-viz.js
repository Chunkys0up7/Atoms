/**
 * GNDP Graph Visualization
 * Interactive D3.js-based graph for exploring atoms and relationships
 */

class GNDPGraph {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container #${containerId} not found`);
      return;
    }

    this.options = {
      width: options.width || this.container.clientWidth,
      height: options.height || 600,
      nodeRadius: options.nodeRadius || 30,
      linkDistance: options.linkDistance || 150,
      chargeStrength: options.chargeStrength || -400,
      ...options
    };

    this.nodes = [];
    this.links = [];
    this.selectedNode = null;
    this.simulation = null;

    // Color schemes
    this.nodeColors = {
      PROCESS: '#3B82F6',
      DECISION: '#F59E0B',
      ROLE: '#10B981',
      SYSTEM: '#8B5CF6',
      DOCUMENT: '#6B7280',
      REGULATION: '#EC4899',
      METRIC: '#06B6D4',
      RISK: '#EF4444'
    };

    this.edgeColors = {
      TRIGGERS: '#3B82F6',
      REQUIRES: '#EC4899',
      PRODUCES: '#10B981',
      GOVERNED_BY: '#8B5CF6',
      PERFORMED_BY: '#F59E0B',
      USES: '#6B7280',
      MEASURED_BY: '#06B6D4',
      MITIGATES: '#EF4444'
    };

    this.init();
  }

  init() {
    // Create SVG
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.options.width} ${this.options.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Add zoom behavior
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);

    // Main group for transforms
    this.g = this.svg.append('g');

    // Arrow marker definition
    this.svg.append('defs').selectAll('marker')
      .data(Object.keys(this.edgeColors))
      .enter()
      .append('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 35)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', d => this.edgeColors[d])
      .attr('d', 'M0,-5L10,0L0,5');

    // Groups for links and nodes (order matters for z-index)
    this.linkGroup = this.g.append('g').attr('class', 'links');
    this.linkLabelGroup = this.g.append('g').attr('class', 'link-labels');
    this.nodeGroup = this.g.append('g').attr('class', 'nodes');

    // Tooltip
    this.tooltip = d3.select(this.container)
      .append('div')
      .attr('class', 'graph-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(15, 23, 42, 0.95)')
      .style('border', '1px solid #334155')
      .style('border-radius', '8px')
      .style('padding', '12px')
      .style('font-size', '13px')
      .style('max-width', '300px')
      .style('z-index', '100')
      .style('pointer-events', 'none');

    // Initialize force simulation
    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id).distance(this.options.linkDistance))
      .force('charge', d3.forceManyBody().strength(this.options.chargeStrength))
      .force('center', d3.forceCenter(this.options.width / 2, this.options.height / 2))
      .force('collision', d3.forceCollide().radius(this.options.nodeRadius + 10));
  }

  loadData(data) {
    // Transform data format if needed
    this.nodes = data.nodes.map(n => ({
      ...n,
      id: n.id || n.atom_id,
      type: n.type || n.atom_type,
      label: n.label || n.name
    }));

    this.links = data.edges.map(e => ({
      source: e.source || e.from,
      target: e.target || e.to,
      type: e.type || e.edge_type,
      properties: e.properties || {}
    }));

    this.render();
  }

  async loadFromAPI(endpoint) {
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      this.loadData(data);
    } catch (error) {
      console.error('Failed to load graph data:', error);
    }
  }

  render() {
    // Update links
    const links = this.linkGroup.selectAll('line')
      .data(this.links, d => `${d.source.id || d.source}-${d.target.id || d.target}`);

    links.exit().remove();

    const linksEnter = links.enter()
      .append('line')
      .attr('stroke', d => this.edgeColors[d.type] || '#64748B')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', d => `url(#arrow-${d.type})`)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => this.showEdgeTooltip(event, d))
      .on('mouseout', () => this.hideTooltip());

    this.linkElements = linksEnter.merge(links);

    // Update link labels
    const linkLabels = this.linkLabelGroup.selectAll('text')
      .data(this.links, d => `label-${d.source.id || d.source}-${d.target.id || d.target}`);

    linkLabels.exit().remove();

    const linkLabelsEnter = linkLabels.enter()
      .append('text')
      .attr('font-size', '10px')
      .attr('fill', d => this.edgeColors[d.type] || '#64748B')
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .text(d => d.type);

    this.linkLabelElements = linkLabelsEnter.merge(linkLabels);

    // Update nodes
    const nodes = this.nodeGroup.selectAll('g.node')
      .data(this.nodes, d => d.id);

    nodes.exit().remove();

    const nodesEnter = nodes.enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(this.drag())
      .on('click', (event, d) => this.onNodeClick(event, d))
      .on('mouseover', (event, d) => this.showNodeTooltip(event, d))
      .on('mouseout', () => this.hideTooltip());

    // Node circle
    nodesEnter.append('circle')
      .attr('r', this.options.nodeRadius)
      .attr('fill', d => this.nodeColors[d.type] || '#64748B')
      .attr('stroke', '#1E293B')
      .attr('stroke-width', 3);

    // Node type icon (small circle)
    nodesEnter.append('circle')
      .attr('r', 8)
      .attr('cy', -this.options.nodeRadius - 5)
      .attr('fill', d => this.nodeColors[d.type] || '#64748B')
      .attr('stroke', '#0F172A')
      .attr('stroke-width', 2);

    // Node label
    nodesEnter.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', 'white')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text(d => this.truncateLabel(d.label, 12));

    // Node ID below
    nodesEnter.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', this.options.nodeRadius + 15)
      .attr('fill', '#94A3B8')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .text(d => d.id);

    this.nodeElements = nodesEnter.merge(nodes);

    // Update simulation
    this.simulation.nodes(this.nodes).on('tick', () => this.tick());
    this.simulation.force('link').links(this.links);
    this.simulation.alpha(1).restart();
  }

  tick() {
    this.linkElements
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    this.linkLabelElements
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2);

    this.nodeElements.attr('transform', d => `translate(${d.x},${d.y})`);
  }

  drag() {
    return d3.drag()
      .on('start', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }

  truncateLabel(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength - 2) + '...' : text;
  }

  showNodeTooltip(event, d) {
    const html = `
      <div style="margin-bottom: 8px;">
        <span style="background: ${this.nodeColors[d.type]}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
          ${d.type}
        </span>
      </div>
      <div style="font-weight: 600; margin-bottom: 4px;">${d.label}</div>
      <div style="font-family: Consolas, 'Courier New', monospace; font-size: 11px; color: #94A3B8; margin-bottom: 8px;">${d.id}</div>
      ${d.description ? `<div style="font-size: 12px; color: #CBD5E1;">${d.description}</div>` : ''}
      ${d.owner ? `<div style="font-size: 11px; color: #64748B; margin-top: 8px;">Owner: ${d.owner}</div>` : ''}
    `;

    this.tooltip
      .html(html)
      .style('visibility', 'visible')
      .style('left', `${event.offsetX + 15}px`)
      .style('top', `${event.offsetY + 15}px`);
  }

  showEdgeTooltip(event, d) {
    const html = `
      <div style="margin-bottom: 8px;">
        <span style="background: ${this.edgeColors[d.type]}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
          ${d.type}
        </span>
      </div>
      <div style="font-size: 12px;">
        <span style="color: #94A3B8;">${d.source.id || d.source}</span>
        <span style="color: #64748B;"> → </span>
        <span style="color: #94A3B8;">${d.target.id || d.target}</span>
      </div>
    `;

    this.tooltip
      .html(html)
      .style('visibility', 'visible')
      .style('left', `${event.offsetX + 15}px`)
      .style('top', `${event.offsetY + 15}px`);
  }

  hideTooltip() {
    this.tooltip.style('visibility', 'hidden');
  }

  onNodeClick(event, d) {
    event.stopPropagation();

    // Toggle selection
    if (this.selectedNode === d) {
      this.selectedNode = null;
      this.resetHighlight();
    } else {
      this.selectedNode = d;
      this.highlightConnections(d);
    }

    // Dispatch custom event
    this.container.dispatchEvent(new CustomEvent('nodeClick', { detail: d }));
  }

  highlightConnections(node) {
    const connectedIds = new Set([node.id]);

    this.links.forEach(link => {
      const sourceId = link.source.id || link.source;
      const targetId = link.target.id || link.target;

      if (sourceId === node.id || targetId === node.id) {
        connectedIds.add(sourceId);
        connectedIds.add(targetId);
      }
    });

    // Fade non-connected elements
    this.nodeElements.style('opacity', d => connectedIds.has(d.id) ? 1 : 0.2);
    this.linkElements.style('opacity', d => {
      const sourceId = d.source.id || d.source;
      const targetId = d.target.id || d.target;
      return sourceId === node.id || targetId === node.id ? 1 : 0.1;
    });
    this.linkLabelElements.style('opacity', d => {
      const sourceId = d.source.id || d.source;
      const targetId = d.target.id || d.target;
      return sourceId === node.id || targetId === node.id ? 1 : 0;
    });
  }

  resetHighlight() {
    this.nodeElements.style('opacity', 1);
    this.linkElements.style('opacity', 0.6);
    this.linkLabelElements.style('opacity', 1);
  }

  // Public methods for external control
  zoomIn() {
    this.svg.transition().call(this.zoom.scaleBy, 1.3);
  }

  zoomOut() {
    this.svg.transition().call(this.zoom.scaleBy, 0.7);
  }

  resetZoom() {
    this.svg.transition().call(this.zoom.transform, d3.zoomIdentity);
  }

  fitToView() {
    const bounds = this.g.node().getBBox();
    const fullWidth = this.options.width;
    const fullHeight = this.options.height;
    const width = bounds.width;
    const height = bounds.height;
    const midX = bounds.x + width / 2;
    const midY = bounds.y + height / 2;

    if (width === 0 || height === 0) return;

    const scale = 0.8 / Math.max(width / fullWidth, height / fullHeight);
    const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];

    this.svg.transition()
      .duration(750)
      .call(this.zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
  }

  filterByType(types) {
    if (!types || types.length === 0) {
      this.nodeElements.style('display', 'block');
      this.linkElements.style('display', 'block');
      return;
    }

    const typeSet = new Set(types);
    this.nodeElements.style('display', d => typeSet.has(d.type) ? 'block' : 'none');

    // Hide links where either node is hidden
    this.linkElements.style('display', d => {
      const sourceType = d.source.type || this.nodes.find(n => n.id === d.source)?.type;
      const targetType = d.target.type || this.nodes.find(n => n.id === d.target)?.type;
      return typeSet.has(sourceType) && typeSet.has(targetType) ? 'block' : 'none';
    });
  }

  searchNodes(query) {
    if (!query) {
      this.resetHighlight();
      return [];
    }

    const queryLower = query.toLowerCase();
    const matches = this.nodes.filter(n =>
      n.id.toLowerCase().includes(queryLower) ||
      n.label.toLowerCase().includes(queryLower) ||
      (n.description && n.description.toLowerCase().includes(queryLower))
    );

    if (matches.length > 0) {
      const matchIds = new Set(matches.map(m => m.id));
      this.nodeElements.style('opacity', d => matchIds.has(d.id) ? 1 : 0.2);
      this.linkElements.style('opacity', 0.1);
    } else {
      this.resetHighlight();
    }

    return matches;
  }

  // Export graph as PNG
  exportPNG() {
    const svgData = new XMLSerializer().serializeToString(this.svg.node());
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = this.options.width * 2;
    canvas.height = this.options.height * 2;
    ctx.scale(2, 2);

    img.onload = () => {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const link = document.createElement('a');
      link.download = 'gndp-graph.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }
}

// Initialize graphs on page load
document.addEventListener('DOMContentLoaded', () => {
  // Find all graph containers and initialize
  document.querySelectorAll('.graph-container[data-graph-src]').forEach(container => {
    const graph = new GNDPGraph(container.id);
    const src = container.dataset.graphSrc;

    if (src.startsWith('{')) {
      // Inline JSON data
      graph.loadData(JSON.parse(src));
    } else {
      // URL to fetch
      graph.loadFromAPI(src);
    }

    // Store reference for external access
    container._gndpGraph = graph;

    // Setup controls if present
    const controls = container.querySelector('.graph-controls');
    if (controls) {
      controls.querySelector('[data-action="zoom-in"]')?.addEventListener('click', () => graph.zoomIn());
      controls.querySelector('[data-action="zoom-out"]')?.addEventListener('click', () => graph.zoomOut());
      controls.querySelector('[data-action="reset"]')?.addEventListener('click', () => graph.resetZoom());
      controls.querySelector('[data-action="fit"]')?.addEventListener('click', () => graph.fitToView());
      controls.querySelector('[data-action="export"]')?.addEventListener('click', () => graph.exportPNG());
    }

    // Setup search if present
    const search = container.querySelector('.graph-search input');
    if (search) {
      let debounceTimer;
      search.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          graph.searchNodes(e.target.value);
        }, 300);
      });
    }
  });
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GNDPGraph;
}
