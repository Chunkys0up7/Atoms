
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Atom } from '../types';

interface GraphViewProps {
  atoms: Atom[];
  onSelectAtom: (atom: Atom) => void;
}

const CATEGORY_COLORS = {
  'CUSTOMER_FACING': '#3b82f6',
  'BACK_OFFICE': '#8b5cf6',
  'SYSTEM': '#10b981'
};

const GraphView: React.FC<GraphViewProps> = ({ atoms, onSelectAtom }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showEdges, setShowEdges] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'force' | 'radial' | 'cluster'>('force');

  useEffect(() => {
    if (!svgRef.current || atoms.length === 0) return;

    const width = svgRef.current.clientWidth || 1200;
    const height = svgRef.current.clientHeight || 800;

    if (width === 0 || height === 0) return;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create container with zoom
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Filter atoms
    const filteredAtoms = selectedCategory === 'ALL'
      ? atoms
      : atoms.filter(a => a.category === selectedCategory);

    // Build nodes
    const nodes = filteredAtoms.map(atom => ({
      id: atom.id,
      atom,
      category: atom.category,
      type: atom.type,
      criticality: atom.criticality
    }));

    // Build edges
    const links: any[] = [];
    filteredAtoms.forEach(atom => {
      const edges = (atom.edges || []);
      edges.forEach(edge => {
        const target = filteredAtoms.find(a => a.id === edge.targetId);
        if (target) {
          links.push({
            source: atom.id,
            target: edge.targetId,
            type: edge.type,
            value: edge.type === 'ENABLES' ? 3 : edge.type === 'DEPENDS_ON' ? 2 : 1
          });
        }
      });
    });

    // Create simulation based on layout mode
    let simulation: d3.Simulation<any, any>;

    if (layoutMode === 'force') {
      simulation = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(links).id((d: any) => d.id).distance(150).strength(0.5))
        .force('charge', d3.forceManyBody().strength(-800))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(40))
        .force('x', d3.forceX(width / 2).strength(0.05))
        .force('y', d3.forceY(height / 2).strength(0.05));
    } else if (layoutMode === 'radial') {
      // Radial layout - group by category in rings
      const categories = Array.from(new Set(nodes.map(n => n.category)));
      const angleStep = (2 * Math.PI) / nodes.length;

      nodes.forEach((node, i) => {
        const categoryIndex = categories.indexOf(node.category);
        const radius = 150 + (categoryIndex * 150);
        const angle = i * angleStep;
        (node as any).fx = width / 2 + radius * Math.cos(angle);
        (node as any).fy = height / 2 + radius * Math.sin(angle);
      });

      simulation = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100).strength(0.1));
    } else {
      // Cluster layout - group by category
      const categories = Array.from(new Set(nodes.map(n => n.category)));
      const categoryPositions = new Map();
      const cols = Math.ceil(Math.sqrt(categories.length));

      categories.forEach((cat, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        categoryPositions.set(cat, {
          x: (width / (cols + 1)) * (col + 1),
          y: (height / (Math.ceil(categories.length / cols) + 1)) * (row + 1)
        });
      });

      simulation = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100).strength(0.3))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('collision', d3.forceCollide().radius(35))
        .force('x', d3.forceX((d: any) => categoryPositions.get(d.category).x).strength(0.5))
        .force('y', d3.forceY((d: any) => categoryPositions.get(d.category).y).strength(0.5));
    }

    // Draw edges
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: any) => {
        if (d.type === 'ENABLES') return '#10b981';
        if (d.type === 'DEPENDS_ON') return '#ef4444';
        if (d.type === 'GOVERNED_BY') return '#f59e0b';
        return '#94a3b8';
      })
      .attr('stroke-width', (d: any) => d.value)
      .attr('stroke-opacity', showEdges ? 0.6 : 0.1)
      .attr('marker-end', 'url(#arrowhead)');

    // Define arrowhead marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#94a3b8')
      .attr('opacity', 0.6);

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<any, any>()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          if (layoutMode === 'force') {
            d.fx = null;
            d.fy = null;
          }
        }) as any
      )
      .on('click', (event, d: any) => {
        onSelectAtom(d.atom);
      });

    // Node circles
    node.append('circle')
      .attr('r', (d: any) => {
        if (d.criticality === 'CRITICAL') return 20;
        if (d.criticality === 'HIGH') return 16;
        if (d.criticality === 'MEDIUM') return 12;
        return 10;
      })
      .attr('fill', (d: any) => CATEGORY_COLORS[d.category as keyof typeof CATEGORY_COLORS] || '#64748b')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.9);

    // Node labels
    node.append('text')
      .text((d: any) => d.atom.name || d.id)
      .attr('font-size', '10px')
      .attr('dx', 25)
      .attr('dy', 4)
      .attr('fill', '#1e293b')
      .attr('font-weight', '600');

    // Type badge
    node.append('text')
      .text((d: any) => d.type)
      .attr('font-size', '8px')
      .attr('dx', 25)
      .attr('dy', 15)
      .attr('fill', '#64748b')
      .attr('font-weight', '500');

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Initial zoom to fit
    setTimeout(() => {
      const bounds = g.node()?.getBBox();
      if (bounds && bounds.width > 0 && bounds.height > 0) {
        const fullWidth = bounds.width;
        const fullHeight = bounds.height;
        const midX = bounds.x + fullWidth / 2;
        const midY = bounds.y + fullHeight / 2;

        const scale = 0.8 / Math.max(fullWidth / width, fullHeight / height);
        const translate = [width / 2 - scale * midX, height / 2 - scale * midY];

        svg.transition().duration(750).call(
          zoom.transform as any,
          d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
      }
    }, 500);

    return () => {
      simulation.stop();
    };
  }, [atoms, selectedCategory, showEdges, layoutMode, onSelectAtom]);

  const categories = Array.from(new Set(atoms.map(a => a.category)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#ffffff' }}>
      <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', backgroundColor: '#f8fafc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '8px' }}>Knowledge Graph</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
              Force-directed visualization of {atoms.length} atoms and their relationships
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>EDGES</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-primary)' }}>
                {atoms.reduce((sum, a) => sum + (a.edges?.length || 0), 0)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="form-input"
            style={{ width: '200px' }}
          >
            <option value="ALL">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={layoutMode}
            onChange={(e) => setLayoutMode(e.target.value as any)}
            className="form-input"
            style={{ width: '200px' }}
          >
            <option value="force">Force-Directed</option>
            <option value="radial">Radial</option>
            <option value="cluster">Clustered</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showEdges}
              onChange={(e) => setShowEdges(e.target.checked)}
            />
            Show Edges
          </label>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: CATEGORY_COLORS.CUSTOMER_FACING }}></div>
              <span>Customer Facing</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: CATEGORY_COLORS.BACK_OFFICE }}></div>
              <span>Back Office</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: CATEGORY_COLORS.SYSTEM }}></div>
              <span>System</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', bottom: '16px', right: '16px', backgroundColor: 'rgba(255,255,255,0.9)', padding: '12px', borderRadius: '8px', fontSize: '11px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontWeight: '600', marginBottom: '6px' }}>Edge Types:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <div style={{ width: '20px', height: '2px', backgroundColor: '#10b981' }}></div>
            <span>ENABLES</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <div style={{ width: '20px', height: '2px', backgroundColor: '#ef4444' }}></div>
            <span>DEPENDS_ON</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <div style={{ width: '20px', height: '2px', backgroundColor: '#f59e0b' }}></div>
            <span>GOVERNED_BY</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '20px', height: '2px', backgroundColor: '#94a3b8' }}></div>
            <span>Other</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphView;
