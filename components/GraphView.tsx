
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Atom, AtomType } from '../types';

interface GraphViewProps {
  atoms: Atom[];
  onSelectAtom: (atom: Atom) => void;
}

const GraphView: React.FC<GraphViewProps> = ({ atoms, onSelectAtom }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [layoutMode, setLayoutMode] = useState<'force' | 'hierarchy' | 'radial'>('hierarchy');
  const [showLabels, setShowLabels] = useState(true);
  const [maxNodes, setMaxNodes] = useState(100);

  useEffect(() => {
    if (!svgRef.current || atoms.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Filter atoms
    const filteredAtoms = atoms
      .filter(a => filterType === 'ALL' || a.type === filterType)
      .slice(0, maxNodes);

    // Build nodes and links
    const nodes = filteredAtoms.map(a => ({
      id: a.id,
      name: (a as any).name || (a as any).title || a.id,
      type: a.type,
      atom: a
    }));

    const links = filteredAtoms.flatMap(a =>
      ((a as any).edges || [])
        .map((e: any) => ({ source: a.id, target: e.targetId, type: e.type }))
        .filter((l: any) => nodes.some(n => n.id === l.target))
    );

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom as any);

    // Type colors - professional muted palette
    const typeColors: Record<string, string> = {
      'requirement': '#475569',
      'design': '#64748b',
      'procedure': '#334155',
      'validation': '#1e293b',
      'policy': '#0f172a',
      'risk': '#78350f',
      'PROCESS': '#475569',
      'DECISION': '#64748b',
      'SYSTEM': '#334155',
      'DOCUMENT': '#1e293b',
      'POLICY': '#0f172a',
      'RISK': '#78350f'
    };

    let simulation: any;

    if (layoutMode === 'hierarchy') {
      // Hierarchical tree layout
      const root = d3.stratify<any>()
        .id((d: any) => d.id)
        .parentId((d: any) => {
          const parentLink = links.find((l: any) => l.target === d.id);
          return parentLink ? parentLink.source : null;
        })(nodes.filter(n => {
          // Only include nodes that are connected
          return links.some((l: any) => l.source === n.id || l.target === n.id);
        }).concat(nodes.filter(n => {
          // Add disconnected nodes as roots
          return !links.some((l: any) => l.target === n.id);
        }).slice(0, 10)));

      const treeLayout = d3.tree<any>()
        .size([width - 100, height - 100]);

      treeLayout(root);

      // Position nodes
      root.each((d: any) => {
        const node = nodes.find(n => n.id === d.id);
        if (node) {
          (node as any).x = d.x + 50;
          (node as any).y = d.y + 50;
          (node as any).fx = d.x + 50;
          (node as any).fy = d.y + 50;
        }
      });
    } else if (layoutMode === 'radial') {
      // Radial layout
      const angleStep = (2 * Math.PI) / nodes.length;
      const radius = Math.min(width, height) / 3;
      nodes.forEach((n, i) => {
        const angle = i * angleStep;
        (n as any).x = width / 2 + radius * Math.cos(angle);
        (n as any).y = height / 2 + radius * Math.sin(angle);
        (n as any).fx = (n as any).x;
        (n as any).fy = (n as any).y;
      });
    } else {
      // Force-directed layout
      simulation = d3.forceSimulation(nodes as any)
        .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(30));
    }

    // Links
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", 1);

    // Nodes
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (event, d: any) => {
        if (d.atom) onSelectAtom(d.atom);
      });

    // Node circles
    node.append("circle")
      .attr("r", 8)
      .attr("fill", (d: any) => typeColors[d.type] || '#475569')
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2);

    // Labels (conditional)
    if (showLabels && nodes.length < 50) {
      node.append("text")
        .attr("dx", 12)
        .attr("dy", 4)
        .text((d: any) => d.id)
        .attr("fill", "#1e293b")
        .attr("font-size", "10px")
        .attr("font-family", "'Inter', sans-serif")
        .attr("font-weight", "500")
        .style("pointer-events", "none");
    }

    // Update positions
    function updatePositions() {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    }

    if (simulation) {
      simulation.on("tick", updatePositions);
    } else {
      updatePositions();
    }

    return () => {
      if (simulation) simulation.stop();
    };
  }, [atoms, onSelectAtom, filterType, layoutMode, showLabels, maxNodes]);

  const uniqueTypes = Array.from(new Set(atoms.map(a => a.type)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#ffffff' }}>
      {/* Controls */}
      <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border)', backgroundColor: '#f8fafc' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginRight: '8px', textTransform: 'uppercase' }}>
              Layout:
            </label>
            <select
              value={layoutMode}
              onChange={(e) => setLayoutMode(e.target.value as any)}
              style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '12px', backgroundColor: '#ffffff' }}
            >
              <option value="hierarchy">Hierarchy</option>
              <option value="force">Force</option>
              <option value="radial">Radial</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginRight: '8px', textTransform: 'uppercase' }}>
              Filter Type:
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '12px', backgroundColor: '#ffffff' }}
            >
              <option value="ALL">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginRight: '8px', textTransform: 'uppercase' }}>
              Max Nodes:
            </label>
            <select
              value={maxNodes}
              onChange={(e) => setMaxNodes(Number(e.target.value))}
              style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '12px', backgroundColor: '#ffffff' }}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginRight: '8px', textTransform: 'uppercase' }}>
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                style={{ marginRight: '6px' }}
              />
              Show Labels
            </label>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            Showing {Math.min(maxNodes, atoms.filter(a => filterType === 'ALL' || a.type === filterType).length)} of {atoms.length} atoms
          </div>
        </div>
      </div>

      {/* Graph */}
      <div style={{ flex: 1, position: 'relative' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%', backgroundColor: '#ffffff' }} />

        <div style={{ position: 'absolute', bottom: '16px', left: '16px', padding: '12px', backgroundColor: '#ffffff', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '11px' }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--color-text-primary)' }}>Legend</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {uniqueTypes.slice(0, 6).map(type => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#475569', border: '2px solid #ffffff' }}></div>
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphView;
