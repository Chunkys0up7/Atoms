
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Atom, EdgeType } from '../types';
import { ATOM_COLORS } from '../constants';

interface GraphViewProps {
  atoms: Atom[];
  onSelectAtom: (atom: Atom) => void;
}

const GraphView: React.FC<GraphViewProps> = ({ atoms, onSelectAtom }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || atoms.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const nodes = atoms.map(a => ({ id: a.id, name: (a as any).name || (a as any).title || a.id, type: a.type }));
    const links = atoms.flatMap(a =>
      ((a as any).edges || []).map((e: any) => ({ source: a.id, target: e.targetId, type: e.type }))
    ).filter(l => nodes.some(n => n.id === l.target));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Zoom behavior
    svg.call(d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
      g.attr("transform", event.transform);
    }));

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Marker definition for arrows
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#475569");

    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#475569")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)");

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        const atom = atoms.find(a => a.id === d.id);
        if (atom) onSelectAtom(atom);
      })
      .on("mouseenter", (event, d) => setHoveredNode(d.id))
      .on("mouseleave", () => setHoveredNode(null))
      .call(d3.drag<SVGGElement, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    node.append("circle")
      .attr("r", 15)
      .attr("fill", (d: any) => ATOM_COLORS[d.type as keyof typeof ATOM_COLORS])
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    node.append("text")
      .attr("dx", 20)
      .attr("dy", ".35em")
      .text((d: any) => d.id)
      .attr("fill", "#f8fafc")
      .attr("font-size", "12px")
      .attr("font-family", "Inter, sans-serif")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => simulation.stop();
  }, [atoms, onSelectAtom]);

  return (
    <div className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur rounded-lg p-3 border border-slate-700 shadow-xl pointer-events-none">
        <h3 className="text-sm font-bold text-slate-200 mb-2">Graph Legend</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(ATOM_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 text-[10px]">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-slate-400 uppercase tracking-widest">{type}</span>
            </div>
          ))}
        </div>
      </div>
      {hoveredNode && (
        <div className="absolute bottom-4 right-4 bg-blue-600/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-xs animate-pulse">
          Node Focused: {hoveredNode}
        </div>
      )}
    </div>
  );
};

export default GraphView;
