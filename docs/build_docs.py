"""
GNDP Documentation Builder
Generates MkDocs-compatible documentation from graph data

This module handles:
1. Reading atom/module YAML files from the repository
2. Generating markdown documentation pages
3. Building navigation structure
4. Creating graph data JSON for visualization
5. Generating index pages and cross-references
"""

import os
import json
import yaml
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, field
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
import shutil


# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class BuildConfig:
    """Configuration for the documentation build."""
    source_dir: Path  # Where atom/module YAML files live
    output_dir: Path  # Where to write generated markdown
    templates_dir: Path  # Jinja2 templates
    static_dir: Path  # Static files (CSS, JS)
    graph_output: Path  # Where to write graph JSON
    site_name: str = "GNDP Documentation"
    base_url: str = "/"
    
    # Feature flags
    generate_graph_json: bool = True
    generate_indexes: bool = True
    generate_cross_refs: bool = True
    include_mermaid: bool = True


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class AtomData:
    """Parsed atom data."""
    atom_id: str
    atom_type: str
    name: str
    description: str
    version: str
    status: str
    metadata: Dict[str, Any]
    content: Dict[str, Any]
    edges: List[Dict[str, Any]]
    source_file: Path
    
    @property
    def slug(self) -> str:
        return self.atom_id.lower().replace('-', '_')
    
    @property
    def url_path(self) -> str:
        type_folder = self.atom_type.lower() + 's'
        return f"atoms/{type_folder}/{self.slug}.md"


@dataclass  
class ModuleData:
    """Parsed module data."""
    module_id: str
    name: str
    description: str
    workflow_type: str
    atoms: List[str]
    entry_points: List[str]
    exit_points: List[str]
    metadata: Dict[str, Any]
    source_file: Path
    
    @property
    def slug(self) -> str:
        return self.module_id.lower().replace('-', '_')
    
    @property
    def url_path(self) -> str:
        return f"modules/{self.slug}/index.md"


@dataclass
class GraphData:
    """Graph structure for visualization."""
    nodes: List[Dict[str, Any]] = field(default_factory=list)
    edges: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_json(self) -> str:
        return json.dumps({
            'nodes': self.nodes,
            'edges': self.edges
        }, indent=2)


# =============================================================================
# PARSER
# =============================================================================

class GNDPParser:
    """Parses YAML files into data structures."""
    
    def __init__(self, source_dir: Path):
        self.source_dir = source_dir
        self.atoms: Dict[str, AtomData] = {}
        self.modules: Dict[str, ModuleData] = {}
    
    def parse_all(self) -> None:
        """Parse all YAML files in source directory."""
        # Parse atoms
        atoms_dir = self.source_dir / 'atoms'
        if atoms_dir.exists():
            for yaml_file in atoms_dir.rglob('*.yaml'):
                self._parse_atom_file(yaml_file)
            for yaml_file in atoms_dir.rglob('*.yml'):
                self._parse_atom_file(yaml_file)
        
        # Parse modules
        modules_dir = self.source_dir / 'modules'
        if modules_dir.exists():
            for yaml_file in modules_dir.rglob('*.yaml'):
                self._parse_module_file(yaml_file)
            for yaml_file in modules_dir.rglob('*.yml'):
                self._parse_module_file(yaml_file)
    
    def _parse_atom_file(self, file_path: Path) -> None:
        """Parse a single atom YAML file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
            
            if not data:
                return
            
            # Support both 'id' and 'atom_id' field names
            atom_id = data.get('atom_id') or data.get('id', '')
            # Support both 'title' and 'name' field names
            name = data.get('name') or data.get('title', '')
            # Support both 'summary' and 'description' field names
            description = data.get('description') or data.get('summary', '')

            atom = AtomData(
                atom_id=atom_id,
                atom_type=data.get('type', 'UNKNOWN'),
                name=name,
                description=description,
                version=data.get('version', '1.0.0'),
                status=data.get('status', 'DRAFT'),
                metadata=data.get('metadata', {}),
                content=data.get('content', {}),
                edges=data.get('edges', []),
                source_file=file_path
            )
            
            if atom.atom_id:
                self.atoms[atom.atom_id] = atom
                
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
    
    def _parse_module_file(self, file_path: Path) -> None:
        """Parse a single module YAML file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
            
            if not data:
                return
            
            module = ModuleData(
                module_id=data.get('module_id', ''),
                name=data.get('name', ''),
                description=data.get('description', ''),
                workflow_type=data.get('workflow_type', 'BPM'),
                atoms=data.get('atoms', []),
                entry_points=data.get('entry_points', []),
                exit_points=data.get('exit_points', []),
                metadata=data.get('metadata', {}),
                source_file=file_path
            )
            
            if module.module_id:
                self.modules[module.module_id] = module
                
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
    
    def build_graph(self) -> GraphData:
        """Build graph data from parsed atoms and modules."""
        graph = GraphData()
        
        # Add nodes from atoms
        for atom_id, atom in self.atoms.items():
            graph.nodes.append({
                'id': atom_id,
                'type': atom.atom_type,
                'label': atom.name,
                'description': atom.description,
                'status': atom.status,
                'owner': atom.metadata.get('owner', ''),
                'team': atom.metadata.get('team', ''),
                'url': atom.url_path
            })
        
        # Add edges from atoms
        for atom_id, atom in self.atoms.items():
            for edge in atom.edges:
                graph.edges.append({
                    'source': atom_id,
                    'target': edge.get('target', ''),
                    'type': edge.get('type', 'UNKNOWN'),
                    'properties': edge.get('properties', {})
                })
        
        return graph


# =============================================================================
# TEMPLATES
# =============================================================================

ATOM_TEMPLATE = '''---
title: "{{ atom.name }}"
description: "{{ atom.description }}"
tags:
  - {{ atom.atom_type | lower }}
  - {{ atom.status | lower }}
{% for tag in atom.metadata.tags %}
  - {{ tag }}
{% endfor %}
---

# {{ atom.atom_id }}: {{ atom.name }}

<div class="atom-card" data-type="{{ atom.atom_type }}">
  <div class="atom-card-header">
    <span class="atom-card-id">{{ atom.atom_id }}</span>
    <span class="atom-type-badge {{ atom.atom_type | lower }}">{{ atom.atom_type }}</span>
  </div>
  <div class="atom-card-meta">
    <span class="atom-card-badge status-{{ atom.status | lower }}">{{ atom.status }}</span>
    <span>v{{ atom.version }}</span>
    <span>{{ atom.metadata.owner }} ({{ atom.metadata.team }})</span>
  </div>
</div>

## Description

{{ atom.description }}

{% if atom.content.steps %}
## Steps

{% for step in atom.content.steps %}
{{ loop.index }}. {{ step }}
{% endfor %}
{% endif %}

{% if atom.content.exceptions %}
## Exceptions

| Condition | Action |
|-----------|--------|
{% for exc in atom.content.exceptions %}
| {{ exc.condition }} | {{ exc.action }} |
{% endfor %}
{% endif %}

{% if atom.content.notes %}
## Notes

{% for note in atom.content.notes %}
- {{ note }}
{% endfor %}
{% endif %}

## Relationships

{% for edge_type, edges in edges_by_type.items() %}
{% if edges %}
### {{ edge_type | replace('_', ' ') | title }}

<ul class="edge-list">
{% for edge in edges %}
<li class="edge-item">
  <span class="edge-type {{ edge.type | lower | replace('_', '-') }}">{{ edge.type }}</span>
  <a href="{{ edge.target_url }}" class="edge-target">{{ edge.target }}</a>
  {% if edge.target_name %}<span class="edge-target-name">{{ edge.target_name }}</span>{% endif %}
</li>
{% endfor %}
</ul>
{% endif %}
{% endfor %}

{% if incoming_edges %}
### Referenced By

<ul class="edge-list">
{% for edge in incoming_edges %}
<li class="edge-item">
  <a href="{{ edge.source_url }}" class="edge-target">{{ edge.source }}</a>
  <span class="edge-type {{ edge.type | lower | replace('_', '-') }}">{{ edge.type }}</span>
  <span>this</span>
</li>
{% endfor %}
</ul>
{% endif %}

{% if mermaid_diagram %}
## Flow Diagram

```mermaid
{{ mermaid_diagram }}
```
{% endif %}

---

<div class="atom-footer">
  <small>
    Last Updated: {{ atom.metadata.updated_at or 'Unknown' }} |
    <a href="{{ source_url }}">View Source</a> |
    <a href="{{ history_url }}">View History</a>
  </small>
</div>
'''

MODULE_TEMPLATE = '''---
title: "{{ module.name }}"
description: "{{ module.description }}"
tags:
  - module
  - {{ module.workflow_type | lower }}
---

# {{ module.module_id }}: {{ module.name }}

<div class="module-card">
  <div class="module-card-header">
    <div>
      <h2 class="module-card-title">{{ module.name }}</h2>
      <span class="module-card-id">{{ module.module_id }}</span>
    </div>
    <span class="atom-type-badge">{{ module.workflow_type }}</span>
  </div>
  
  <p>{{ module.description }}</p>
  
  <div class="module-stats">
    <div class="module-stat">
      <div class="module-stat-value">{{ module.atoms | length }}</div>
      <div class="module-stat-label">Atoms</div>
    </div>
    <div class="module-stat">
      <div class="module-stat-value">{{ module.entry_points | length }}</div>
      <div class="module-stat-label">Entry Points</div>
    </div>
    <div class="module-stat">
      <div class="module-stat-value">{{ module.exit_points | length }}</div>
      <div class="module-stat-label">Exit Points</div>
    </div>
  </div>
</div>

## Module Graph

<div id="module-graph-{{ module.module_id }}" class="graph-container" data-graph-src="{{ graph_json_url }}">
  <div class="graph-controls">
    <button class="graph-control-btn" data-action="zoom-in" title="Zoom In">+</button>
    <button class="graph-control-btn" data-action="zoom-out" title="Zoom Out">-</button>
    <button class="graph-control-btn" data-action="fit" title="Fit to View">⊡</button>
    <button class="graph-control-btn" data-action="reset" title="Reset">↺</button>
  </div>
  <div class="graph-search">
    <input type="text" placeholder="Search atoms..." />
  </div>
</div>

## Entry Points

{% for entry_id in module.entry_points %}
- [{{ entry_id }}]({{ atoms[entry_id].url_path if entry_id in atoms else '#' }}){% if entry_id in atoms %} - {{ atoms[entry_id].name }}{% endif %}

{% endfor %}

## Exit Points

{% for exit_id in module.exit_points %}
- [{{ exit_id }}]({{ atoms[exit_id].url_path if exit_id in atoms else '#' }}){% if exit_id in atoms %} - {{ atoms[exit_id].name }}{% endif %}

{% endfor %}

## Atoms in This Module

| ID | Name | Type | Status |
|----|------|------|--------|
{% for atom_id in module.atoms %}
{% if atom_id in atoms %}
| [{{ atom_id }}]({{ atoms[atom_id].url_path }}) | {{ atoms[atom_id].name }} | {{ atoms[atom_id].atom_type }} | {{ atoms[atom_id].status }} |
{% else %}
| {{ atom_id }} | *Not Found* | - | - |
{% endif %}
{% endfor %}

{% if external_dependencies %}
## External Dependencies

This module depends on atoms from other modules:

{% for dep in external_dependencies %}
- [{{ dep.atom_id }}]({{ dep.url_path }}) ({{ dep.module_id }})
{% endfor %}
{% endif %}

---

<div class="module-footer">
  <small>
    <a href="{{ source_url }}">View Source</a> |
    <a href="{{ history_url }}">View History</a>
  </small>
</div>
'''

INDEX_TEMPLATE = '''---
title: "{{ title }}"
description: "{{ description }}"
---

# {{ title }}

{{ description }}

{% if stats %}
<div class="impact-summary">
{% for stat in stats %}
  <div class="impact-card">
    <div class="impact-card-value">{{ stat.value }}</div>
    <div class="impact-card-label">{{ stat.label }}</div>
  </div>
{% endfor %}
</div>
{% endif %}

{% if items %}
## {{ items_title }}

{% for item in items %}
{{ item }}
{% endfor %}
{% endif %}

{% if graph_data %}
## Visualization

<div id="index-graph" class="graph-container" data-graph-src='{{ graph_data }}'>
  <div class="graph-controls">
    <button class="graph-control-btn" data-action="zoom-in" title="Zoom In">+</button>
    <button class="graph-control-btn" data-action="zoom-out" title="Zoom Out">-</button>
    <button class="graph-control-btn" data-action="fit" title="Fit to View">⊡</button>
  </div>
</div>
{% endif %}
'''


# =============================================================================
# GENERATOR
# =============================================================================

class DocumentationGenerator:
    """Generates markdown documentation from parsed data."""
    
    def __init__(self, config: BuildConfig, parser: GNDPParser):
        self.config = config
        self.parser = parser
        self.env = Environment(
            loader=FileSystemLoader(str(config.templates_dir)) if config.templates_dir.exists() else None,
            autoescape=False
        )
        
        # Add templates from strings if no template dir
        if not config.templates_dir.exists():
            self.env.from_string = self.env.from_string
            self.atom_template = self.env.from_string(ATOM_TEMPLATE)
            self.module_template = self.env.from_string(MODULE_TEMPLATE)
            self.index_template = self.env.from_string(INDEX_TEMPLATE)
        else:
            self.atom_template = self.env.get_template('atom.md.j2')
            self.module_template = self.env.get_template('module.md.j2')
            self.index_template = self.env.get_template('index.md.j2')
    
    def generate_all(self) -> None:
        """Generate all documentation."""
        print("Starting documentation generation...")
        
        # Ensure output directories exist
        self._ensure_directories()
        
        # Generate atom pages
        print(f"Generating {len(self.parser.atoms)} atom pages...")
        for atom_id, atom in self.parser.atoms.items():
            self._generate_atom_page(atom)
        
        # Generate module pages
        print(f"Generating {len(self.parser.modules)} module pages...")
        for module_id, module in self.parser.modules.items():
            self._generate_module_page(module)
        
        # Generate index pages
        if self.config.generate_indexes:
            print("Generating index pages...")
            self._generate_index_pages()
        
        # Generate graph JSON
        if self.config.generate_graph_json:
            print("Generating graph JSON...")
            self._generate_graph_json()
        
        # Copy static files
        self._copy_static_files()
        
        print("Documentation generation complete!")
    
    def _ensure_directories(self) -> None:
        """Create output directory structure."""
        dirs = [
            self.config.output_dir / 'atoms' / 'processes',
            self.config.output_dir / 'atoms' / 'decisions',
            self.config.output_dir / 'atoms' / 'roles',
            self.config.output_dir / 'atoms' / 'systems',
            self.config.output_dir / 'atoms' / 'documents',
            self.config.output_dir / 'atoms' / 'regulations',
            self.config.output_dir / 'atoms' / 'metrics',
            self.config.output_dir / 'atoms' / 'risks',
            self.config.output_dir / 'modules',
            self.config.output_dir / 'graph',
            self.config.output_dir / 'api',
        ]
        for d in dirs:
            d.mkdir(parents=True, exist_ok=True)
    
    def _generate_atom_page(self, atom: AtomData) -> None:
        """Generate markdown page for an atom."""
        # Group edges by type
        edges_by_type = {}
        for edge in atom.edges:
            edge_type = edge.get('type', 'UNKNOWN')
            if edge_type not in edges_by_type:
                edges_by_type[edge_type] = []
            
            target_id = edge.get('target', '')
            target_atom = self.parser.atoms.get(target_id)
            
            edges_by_type[edge_type].append({
                'type': edge_type,
                'target': target_id,
                'target_name': target_atom.name if target_atom else '',
                'target_url': f"../{target_atom.url_path}" if target_atom else '#',
                'properties': edge.get('properties', {})
            })
        
        # Find incoming edges (atoms that reference this one)
        incoming_edges = []
        for other_id, other_atom in self.parser.atoms.items():
            if other_id == atom.atom_id:
                continue
            for edge in other_atom.edges:
                if edge.get('target') == atom.atom_id:
                    incoming_edges.append({
                        'source': other_id,
                        'source_name': other_atom.name,
                        'source_url': f"../{other_atom.url_path}",
                        'type': edge.get('type', 'UNKNOWN')
                    })
        
        # Generate Mermaid diagram if enabled
        mermaid_diagram = None
        if self.config.include_mermaid:
            mermaid_diagram = self._generate_atom_mermaid(atom)
        
        # Render template
        content = self.atom_template.render(
            atom=atom,
            edges_by_type=edges_by_type,
            incoming_edges=incoming_edges,
            mermaid_diagram=mermaid_diagram,
            source_url=f"https://github.com/org/repo/blob/main/{atom.source_file}",
            history_url=f"https://github.com/org/repo/commits/main/{atom.source_file}"
        )
        
        # Write file
        output_path = self.config.output_dir / atom.url_path
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding='utf-8')
    
    def _generate_module_page(self, module: ModuleData) -> None:
        """Generate markdown page for a module."""
        # Build module-specific graph
        module_graph = self._build_module_graph(module)
        
        # Find external dependencies
        external_deps = []
        module_atom_set = set(module.atoms)
        for atom_id in module.atoms:
            atom = self.parser.atoms.get(atom_id)
            if atom:
                for edge in atom.edges:
                    target_id = edge.get('target', '')
                    if target_id and target_id not in module_atom_set:
                        # Find which module contains this atom
                        for other_module in self.parser.modules.values():
                            if target_id in other_module.atoms:
                                target_atom = self.parser.atoms.get(target_id)
                                if target_atom:
                                    external_deps.append({
                                        'atom_id': target_id,
                                        'url_path': target_atom.url_path,
                                        'module_id': other_module.module_id
                                    })
                                break
        
        # Render template
        content = self.module_template.render(
            module=module,
            atoms=self.parser.atoms,
            graph_json_url=f"/api/graph/module/{module.module_id}.json",
            external_dependencies=external_deps,
            source_url=f"https://github.com/org/repo/blob/main/{module.source_file}",
            history_url=f"https://github.com/org/repo/commits/main/{module.source_file}"
        )
        
        # Write file
        output_path = self.config.output_dir / module.url_path
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding='utf-8')

        # Write module graph JSON
        graph_path = self.config.output_dir / 'api' / 'graph' / 'module' / f"{module.module_id}.json"
        graph_path.parent.mkdir(parents=True, exist_ok=True)
        graph_path.write_text(module_graph.to_json(), encoding='utf-8')
    
    def _build_module_graph(self, module: ModuleData) -> GraphData:
        """Build graph data for a specific module."""
        graph = GraphData()
        atom_set = set(module.atoms)
        
        for atom_id in module.atoms:
            atom = self.parser.atoms.get(atom_id)
            if atom:
                graph.nodes.append({
                    'id': atom_id,
                    'type': atom.atom_type,
                    'label': atom.name,
                    'description': atom.description,
                    'url': atom.url_path
                })
                
                for edge in atom.edges:
                    target_id = edge.get('target', '')
                    # Only include edges within the module or to external atoms
                    if target_id:
                        graph.edges.append({
                            'source': atom_id,
                            'target': target_id,
                            'type': edge.get('type', 'UNKNOWN'),
                            'external': target_id not in atom_set
                        })
        
        return graph
    
    def _generate_atom_mermaid(self, atom: AtomData) -> Optional[str]:
        """Generate Mermaid diagram for an atom's relationships."""
        lines = ['graph LR']
        
        # Style the central node
        node_style = {
            'PROCESS': 'fill:#3B82F6',
            'DECISION': 'fill:#F59E0B',
            'ROLE': 'fill:#10B981',
            'SYSTEM': 'fill:#8B5CF6',
            'REGULATION': 'fill:#EC4899'
        }.get(atom.atom_type, 'fill:#6B7280')
        
        lines.append(f'    style {atom.atom_id} {node_style},color:#fff')
        
        # Add outgoing edges
        for edge in atom.edges:
            target_id = edge.get('target', '')
            edge_type = edge.get('type', '')
            edge_label = edge_type.replace('_', ' ').lower()
            lines.append(f'    {atom.atom_id}["{atom.name}"] -->|{edge_label}| {target_id}')
        
        # Add incoming edges
        for other_id, other_atom in self.parser.atoms.items():
            if other_id == atom.atom_id:
                continue
            for edge in other_atom.edges:
                if edge.get('target') == atom.atom_id:
                    edge_label = edge.get('type', '').replace('_', ' ').lower()
                    lines.append(f'    {other_id}["{other_atom.name}"] -->|{edge_label}| {atom.atom_id}')
        
        if len(lines) <= 2:  # Only has style line, no edges
            return None
        
        return '\n'.join(lines)
    
    def _generate_index_pages(self) -> None:
        """Generate index pages for navigation."""
        # Atoms index
        atoms_by_type = {}
        for atom in self.parser.atoms.values():
            if atom.atom_type not in atoms_by_type:
                atoms_by_type[atom.atom_type] = []
            atoms_by_type[atom.atom_type].append(atom)
        
        stats = [
            {'value': len(self.parser.atoms), 'label': 'Total Atoms'},
            {'value': len(self.parser.modules), 'label': 'Modules'},
            {'value': len(atoms_by_type), 'label': 'Atom Types'},
            {'value': sum(len(a.edges) for a in self.parser.atoms.values()), 'label': 'Relationships'}
        ]
        
        items = []
        for atom_type, atoms in sorted(atoms_by_type.items()):
            items.append(f"\n### {atom_type} ({len(atoms)})\n")
            for atom in sorted(atoms, key=lambda a: a.name):
                items.append(f"- [{atom.atom_id}]({atom.url_path}) - {atom.name}")
        
        content = self.index_template.render(
            title="All Atoms",
            description="Complete index of all documentation atoms in the system.",
            stats=stats,
            items_title="Atoms by Type",
            items=items
        )

        (self.config.output_dir / 'atoms' / 'index.md').write_text(content, encoding='utf-8')
        
        # Modules index
        module_items = []
        for module in sorted(self.parser.modules.values(), key=lambda m: m.name):
            module_items.append(f"- [{module.module_id}]({module.url_path}) - {module.name} ({len(module.atoms)} atoms)")
        
        content = self.index_template.render(
            title="All Modules",
            description="Complete index of all workflow modules.",
            items_title="Modules",
            items=module_items
        )

        (self.config.output_dir / 'modules' / 'index.md').write_text(content, encoding='utf-8')
    
    def _generate_graph_json(self) -> None:
        """Generate full graph JSON for visualization."""
        graph = self.parser.build_graph()
        
        # Full graph
        full_graph_path = self.config.output_dir / 'api' / 'graph' / 'full.json'
        full_graph_path.parent.mkdir(parents=True, exist_ok=True)
        full_graph_path.write_text(graph.to_json(), encoding='utf-8')
        
        # Graphs by type
        for atom_type in set(a.atom_type for a in self.parser.atoms.values()):
            type_graph = GraphData()
            type_atoms = {k: v for k, v in self.parser.atoms.items() if v.atom_type == atom_type}
            
            for atom_id, atom in type_atoms.items():
                type_graph.nodes.append({
                    'id': atom_id,
                    'type': atom.atom_type,
                    'label': atom.name
                })
                for edge in atom.edges:
                    type_graph.edges.append({
                        'source': atom_id,
                        'target': edge.get('target', ''),
                        'type': edge.get('type', '')
                    })
            
            type_path = self.config.output_dir / 'api' / 'graph' / 'type' / f"{atom_type.lower()}.json"
            type_path.parent.mkdir(parents=True, exist_ok=True)
            type_path.write_text(type_graph.to_json(), encoding='utf-8')
    
    def _copy_static_files(self) -> None:
        """Copy static files to output."""
        if self.config.static_dir.exists():
            for item in self.config.static_dir.iterdir():
                dest = self.config.output_dir / item.name
                if item.is_dir():
                    shutil.copytree(item, dest, dirs_exist_ok=True)
                else:
                    shutil.copy2(item, dest)


# =============================================================================
# CLI ENTRY POINT
# =============================================================================

def main():
    """Main entry point for documentation generation."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate GNDP documentation')
    parser.add_argument('--source', '-s', type=Path, default=Path('.'),
                        help='Source directory containing atoms and modules')
    parser.add_argument('--output', '-o', type=Path, default=Path('./docs'),
                        help='Output directory for generated documentation')
    parser.add_argument('--templates', '-t', type=Path, default=Path('./templates'),
                        help='Templates directory')
    parser.add_argument('--static', type=Path, default=Path('./static'),
                        help='Static files directory')
    
    args = parser.parse_args()
    
    config = BuildConfig(
        source_dir=args.source,
        output_dir=args.output,
        templates_dir=args.templates,
        static_dir=args.static,
        graph_output=args.output / 'api' / 'graph'
    )
    
    # Parse source files
    gndp_parser = GNDPParser(config.source_dir)
    gndp_parser.parse_all()
    
    print(f"Parsed {len(gndp_parser.atoms)} atoms and {len(gndp_parser.modules)} modules")
    
    # Generate documentation
    generator = DocumentationGenerator(config, gndp_parser)
    generator.generate_all()


if __name__ == '__main__':
    main()
