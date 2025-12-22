
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Atom, Module, GraphContext, Phase, Journey } from '../types';

interface GraphViewProps {
  atoms: Atom[];
  modules?: Module[];
  phases?: Phase[];
  journeys?: Journey[];
  context?: GraphContext;
  onSelectAtom: (atom: Atom) => void;
  onContextChange?: (context: GraphContext) => void;
}

const CATEGORY_COLORS = {
  'CUSTOMER_FACING': '#3b82f6',
  'BACK_OFFICE': '#8b5cf6',
  'SYSTEM': '#10b981'
};

const GraphView: React.FC<GraphViewProps> = ({
  atoms,
  modules = [],
  phases = [],
  journeys = [],
  context = { mode: 'global' },
  onSelectAtom,
  onContextChange
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showEdges, setShowEdges] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'force' | 'radial' | 'cluster' | 'hierarchical'>('force');
  const [showModuleGroups, setShowModuleGroups] = useState(false);
  const [highlightedAtoms, setHighlightedAtoms] = useState<Set<string>>(new Set());

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

    // Filter atoms based on context
    let filteredAtoms = atoms;
    let highlightedIds = new Set<string>();

    // Apply context-specific filtering
    if (context.mode === 'journey' && context.journeyId) {
      // Show atoms in phases of this journey
      const journey = journeys.find(j => j.id === context.journeyId);
      if (journey) {
        const journeyPhases = phases.filter(p => journey.phases.includes(p.id));
        const phaseModules = modules.filter(m => journeyPhases.some(p => p.modules.includes(m.id)));
        filteredAtoms = atoms.filter(a => phaseModules.some(m => m.atoms.includes(a.id)));
      }
    } else if (context.mode === 'phase' && context.phaseId) {
      // Show atoms in modules of this phase
      const phase = phases.find(p => p.id === context.phaseId);
      if (phase) {
        const phaseModules = modules.filter(m => phase.modules.includes(m.id));
        filteredAtoms = atoms.filter(a => phaseModules.some(m => m.atoms.includes(a.id)));
      }
    } else if (context.mode === 'module' && context.moduleId) {
      // Show atoms in this module and optionally dependencies
      const module = modules.find(m => m.id === context.moduleId);
      if (module) {
        filteredAtoms = atoms.filter(a => module.atoms.includes(a.id));
        if (context.expandDependencies) {
          // Add atoms that these atoms depend on or enable
          const expandedIds = new Set(filteredAtoms.map(a => a.id));
          filteredAtoms.forEach(atom => {
            atom.edges?.forEach(edge => {
              const targetAtom = atoms.find(a => a.id === edge.targetId);
              if (targetAtom && !expandedIds.has(targetAtom.id)) {
                filteredAtoms.push(targetAtom);
                expandedIds.add(targetAtom.id);
              }
            });
          });
        }
      }
    } else if (context.mode === 'impact' && context.atomId) {
      // Show dependency tree from selected atom
      const sourceAtom = atoms.find(a => a.id === context.atomId);
      if (sourceAtom) {
        const impactedIds = new Set<string>([context.atomId]);
        highlightedIds.add(context.atomId);

        const traverseDependencies = (atomId: string, currentDepth: number) => {
          if (currentDepth >= context.depth) return;

          const atom = atoms.find(a => a.id === atomId);
          if (!atom) return;

          atom.edges?.forEach(edge => {
            if (context.direction === 'downstream' || context.direction === 'both') {
              if (!impactedIds.has(edge.targetId)) {
                impactedIds.add(edge.targetId);
                highlightedIds.add(edge.targetId);
                traverseDependencies(edge.targetId, currentDepth + 1);
              }
            }
          });

          if (context.direction === 'upstream' || context.direction === 'both') {
            atoms.forEach(a => {
              a.edges?.forEach(e => {
                if (e.targetId === atomId && !impactedIds.has(a.id)) {
                  impactedIds.add(a.id);
                  highlightedIds.add(a.id);
                  traverseDependencies(a.id, currentDepth + 1);
                }
              });
            });
          }
        };

        traverseDependencies(context.atomId, 0);
        filteredAtoms = atoms.filter(a => impactedIds.has(a.id));
      }
    } else if (context.mode === 'risk') {
      // Filter by criticality
      if (context.minCriticality) {
        const criticalityOrder = { 'LOW': 0, 'MEDIUM': 1, 'HIGH': 2, 'CRITICAL': 3 };
        const minLevel = criticalityOrder[context.minCriticality];
        filteredAtoms = atoms.filter(a => criticalityOrder[a.criticality] >= minLevel);
      }
      if (context.showControls) {
        // Highlight control atoms
        atoms.filter(a => a.type === 'CONTROL').forEach(a => highlightedIds.add(a.id));
      }
    } else if (context.mode === 'global' && context.filters) {
      // Apply global filters
      if (context.filters.types) {
        filteredAtoms = filteredAtoms.filter(a => context.filters!.types!.includes(a.type));
      }
      if (context.filters.criticality) {
        filteredAtoms = filteredAtoms.filter(a => context.filters!.criticality!.includes(a.criticality));
      }
    }

    // Apply category filter on top of context filtering
    if (selectedCategory !== 'ALL') {
      filteredAtoms = filteredAtoms.filter(a => a.category === selectedCategory);
    }

    setHighlightedAtoms(highlightedIds);

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
    } else if (layoutMode === 'cluster') {
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
    } else {
      // Hierarchical layout - group by module/phase
      const moduleGroups = new Map();

      // Group nodes by moduleId
      nodes.forEach(node => {
        const moduleId = node.atom.moduleId || 'unassigned';
        if (!moduleGroups.has(moduleId)) {
          moduleGroups.set(moduleId, []);
        }
        moduleGroups.get(moduleId).push(node);
      });

      // Calculate module positions in a grid
      const moduleIds = Array.from(moduleGroups.keys());
      const cols = Math.ceil(Math.sqrt(moduleIds.length));
      const modulePositions = new Map();

      moduleIds.forEach((moduleId, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        modulePositions.set(moduleId, {
          x: (width / (cols + 1)) * (col + 1),
          y: (height / (Math.ceil(moduleIds.length / cols) + 1)) * (row + 1)
        });
      });

      simulation = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80).strength(0.3))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('collision', d3.forceCollide().radius(30))
        .force('x', d3.forceX((d: any) => modulePositions.get(d.atom.moduleId || 'unassigned').x).strength(0.8))
        .force('y', d3.forceY((d: any) => modulePositions.get(d.atom.moduleId || 'unassigned').y).strength(0.8));

      // Draw module boundary boxes if hierarchical mode is enabled
      if (showModuleGroups) {
        setTimeout(() => {
          moduleIds.forEach(moduleId => {
            const moduleNodes = moduleGroups.get(moduleId);
            if (moduleNodes.length === 0) return;

            const xs = moduleNodes.map((n: any) => n.x);
            const ys = moduleNodes.map((n: any) => n.y);
            const minX = Math.min(...xs) - 40;
            const maxX = Math.max(...xs) + 40;
            const minY = Math.min(...ys) - 40;
            const maxY = Math.max(...ys) + 40;

            const module = modules.find(m => m.id === moduleId);

            g.insert('rect', ':first-child')
              .attr('x', minX)
              .attr('y', minY)
              .attr('width', maxX - minX)
              .attr('height', maxY - minY)
              .attr('fill', '#f8fafc')
              .attr('stroke', '#cbd5e1')
              .attr('stroke-width', 2)
              .attr('stroke-dasharray', '5,5')
              .attr('rx', 8)
              .attr('opacity', 0.6);

            g.append('text')
              .attr('x', minX + 10)
              .attr('y', minY + 20)
              .attr('font-size', '12px')
              .attr('font-weight', '600')
              .attr('fill', '#475569')
              .text(module?.name || moduleId);
          });
        }, 1000);
      }
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

    // Node circles with context-aware styling
    node.append('circle')
      .attr('r', (d: any) => {
        const isHighlighted = highlightedIds.has(d.id);
        const baseSize = d.criticality === 'CRITICAL' ? 20 : d.criticality === 'HIGH' ? 16 : d.criticality === 'MEDIUM' ? 12 : 10;
        return isHighlighted ? baseSize + 4 : baseSize;
      })
      .attr('fill', (d: any) => {
        // Risk mode: color by criticality
        if (context.mode === 'risk') {
          const criticalityColors = {
            'CRITICAL': '#ef4444',
            'HIGH': '#f97316',
            'MEDIUM': '#f59e0b',
            'LOW': '#10b981'
          };
          return criticalityColors[d.criticality as keyof typeof criticalityColors] || '#64748b';
        }
        // Default: color by category
        return CATEGORY_COLORS[d.category as keyof typeof CATEGORY_COLORS] || '#64748b';
      })
      .attr('stroke', (d: any) => {
        const isHighlighted = highlightedIds.has(d.id);
        return isHighlighted ? '#fbbf24' : '#ffffff';
      })
      .attr('stroke-width', (d: any) => {
        const isHighlighted = highlightedIds.has(d.id);
        return isHighlighted ? 4 : 2;
      })
      .attr('opacity', (d: any) => {
        // In impact mode, dim non-highlighted nodes
        if (context.mode === 'impact' && !highlightedIds.has(d.id)) return 0.3;
        return 0.9;
      });

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
  }, [atoms, selectedCategory, showEdges, layoutMode, showModuleGroups, modules, phases, journeys, context, onSelectAtom]);

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

        {/* Context Mode Selector */}
        <div style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: '#e0f2fe', borderRadius: '8px', border: '1px solid #0ea5e9' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#0369a1', marginBottom: '8px' }}>
            CONTEXT MODE: {context.mode.toUpperCase()}
          </div>
          <div style={{ fontSize: '11px', color: '#075985' }}>
            {context.mode === 'global' && 'Showing all atoms with optional filters'}
            {context.mode === 'journey' && `Showing atoms in journey: ${journeys.find(j => j.id === context.journeyId)?.name || context.journeyId}`}
            {context.mode === 'phase' && `Showing atoms in phase: ${phases.find(p => p.id === context.phaseId)?.name || context.phaseId}`}
            {context.mode === 'module' && `Showing atoms in module: ${modules.find(m => m.id === context.moduleId)?.name || context.moduleId}`}
            {context.mode === 'impact' && `Impact analysis from: ${atoms.find(a => a.id === context.atomId)?.name || context.atomId} (depth: ${context.depth}, ${context.direction})`}
            {context.mode === 'risk' && `Risk view - ${context.minCriticality ? `min: ${context.minCriticality}` : 'all criticalities'}${context.showControls ? ', controls highlighted' : ''}`}
          </div>
          {onContextChange && (
            <button
              onClick={() => onContextChange({ mode: 'global' })}
              style={{
                marginTop: '8px',
                padding: '4px 12px',
                fontSize: '11px',
                backgroundColor: 'white',
                border: '1px solid #0ea5e9',
                borderRadius: '4px',
                color: '#0369a1',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Reset to Global View
            </button>
          )}
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
            <option value="hierarchical">Hierarchical (Modules)</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showEdges}
              onChange={(e) => setShowEdges(e.target.checked)}
            />
            Show Edges
          </label>

          {layoutMode === 'hierarchical' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showModuleGroups}
                onChange={(e) => setShowModuleGroups(e.target.checked)}
              />
              Show Module Boundaries
            </label>
          )}

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
