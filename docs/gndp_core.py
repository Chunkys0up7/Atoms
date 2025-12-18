"""
Graph-Native Documentation Platform (GNDP)
Core Implementation

This module provides the foundational data models, graph operations,
and RAG infrastructure for the documentation platform.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Any, Set, Callable
from datetime import datetime
import json
import yaml
from pathlib import Path
import hashlib


# =============================================================================
# ENUMS & CONSTANTS
# =============================================================================

class AtomType(Enum):
    """Types of atoms in the documentation graph."""
    PROCESS = "PROCESS"
    DECISION = "DECISION"
    GATEWAY = "GATEWAY"
    ROLE = "ROLE"
    SYSTEM = "SYSTEM"
    DOCUMENT = "DOCUMENT"
    REGULATION = "REGULATION"
    METRIC = "METRIC"
    RISK = "RISK"
    TOUCHPOINT = "TOUCHPOINT"  # For customer journeys
    CONTROL = "CONTROL"  # For compliance
    CUSTOM = "CUSTOM"


class EdgeType(Enum):
    """Types of relationships between atoms."""
    TRIGGERS = "TRIGGERS"
    REQUIRES = "REQUIRES"
    PRODUCES = "PRODUCES"
    PERFORMED_BY = "PERFORMED_BY"
    GOVERNED_BY = "GOVERNED_BY"
    USES = "USES"
    MEASURED_BY = "MEASURED_BY"
    MITIGATES = "MITIGATES"
    ESCALATES_TO = "ESCALATES_TO"
    VARIANT_OF = "VARIANT_OF"
    CONTAINS = "CONTAINS"  # Module -> Atom
    NEXT_STEP = "NEXT_STEP"  # For SOPs
    TRANSITIONS_TO = "TRANSITIONS_TO"  # For journeys


class RiskLevel(Enum):
    """Risk levels for change impact."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AtomStatus(Enum):
    """Lifecycle status of an atom."""
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    DEPRECATED = "DEPRECATED"
    ARCHIVED = "ARCHIVED"


# =============================================================================
# CORE DATA MODELS
# =============================================================================

@dataclass
class AtomMetadata:
    """Metadata attached to every atom."""
    owner: str
    team: str
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    last_reviewer: Optional[str] = None
    review_date: Optional[datetime] = None
    sla_hours: Optional[int] = None
    risk_level: RiskLevel = RiskLevel.LOW
    tags: List[str] = field(default_factory=list)
    custom_fields: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Edge:
    """A relationship between two atoms."""
    edge_type: EdgeType
    target_id: str
    properties: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "type": self.edge_type.value,
            "target": self.target_id,
            "properties": self.properties
        }


@dataclass
class Atom:
    """The fundamental unit of documentation."""
    atom_id: str
    atom_type: AtomType
    name: str
    description: str
    version: str = "1.0.0"
    status: AtomStatus = AtomStatus.DRAFT
    metadata: AtomMetadata = field(default_factory=lambda: AtomMetadata(
        owner="unassigned", team="unassigned"
    ))
    content: Dict[str, Any] = field(default_factory=dict)
    edges: List[Edge] = field(default_factory=list)
    
    def __post_init__(self):
        if not self.atom_id:
            self.atom_id = self._generate_id()
    
    def _generate_id(self) -> str:
        """Generate a unique atom ID based on type and name."""
        prefix = self.atom_type.value[:4].upper()
        hash_input = f"{self.name}{datetime.now().isoformat()}"
        hash_suffix = hashlib.md5(hash_input.encode()).hexdigest()[:6]
        return f"{prefix}-{hash_suffix.upper()}"
    
    def add_edge(self, edge_type: EdgeType, target_id: str, **properties) -> Edge:
        """Add an edge to another atom."""
        edge = Edge(edge_type=edge_type, target_id=target_id, properties=properties)
        self.edges.append(edge)
        return edge
    
    def get_edges_by_type(self, edge_type: EdgeType) -> List[Edge]:
        """Get all edges of a specific type."""
        return [e for e in self.edges if e.edge_type == edge_type]
    
    def to_yaml(self) -> str:
        """Serialize atom to YAML."""
        data = {
            "atom_id": self.atom_id,
            "type": self.atom_type.value,
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "status": self.status.value,
            "metadata": {
                "owner": self.metadata.owner,
                "team": self.metadata.team,
                "risk_level": self.metadata.risk_level.value,
                "tags": self.metadata.tags
            },
            "content": self.content,
            "edges": [e.to_dict() for e in self.edges]
        }
        return yaml.dump(data, default_flow_style=False, sort_keys=False)
    
    @classmethod
    def from_yaml(cls, yaml_str: str) -> Atom:
        """Deserialize atom from YAML."""
        data = yaml.safe_load(yaml_str)
        metadata = AtomMetadata(
            owner=data["metadata"]["owner"],
            team=data["metadata"]["team"],
            risk_level=RiskLevel(data["metadata"]["risk_level"]),
            tags=data["metadata"].get("tags", [])
        )
        edges = [
            Edge(
                edge_type=EdgeType(e["type"]),
                target_id=e["target"],
                properties=e.get("properties", {})
            )
            for e in data.get("edges", [])
        ]
        return cls(
            atom_id=data["atom_id"],
            atom_type=AtomType(data["type"]),
            name=data["name"],
            description=data["description"],
            version=data["version"],
            status=AtomStatus(data["status"]),
            metadata=metadata,
            content=data.get("content", {}),
            edges=edges
        )
    
    def to_markdown(self) -> str:
        """Generate markdown documentation for this atom."""
        lines = [
            f"# {self.atom_id}: {self.name}",
            "",
            f"**Type:** {self.atom_type.value}  ",
            f"**Status:** {self.status.value}  ",
            f"**Version:** {self.version}  ",
            f"**Owner:** {self.metadata.owner} ({self.metadata.team})",
            "",
            "## Description",
            self.description,
            ""
        ]
        
        # Add content sections
        if "steps" in self.content:
            lines.extend(["## Steps", ""])
            for i, step in enumerate(self.content["steps"], 1):
                lines.append(f"{i}. {step}")
            lines.append("")
        
        if "exceptions" in self.content:
            lines.extend(["## Exceptions", "", "| Condition | Action |", "|-----------|--------|"])
            for exc in self.content["exceptions"]:
                lines.append(f"| {exc['condition']} | {exc['action']} |")
            lines.append("")
        
        # Add relationships
        if self.edges:
            lines.extend(["## Relationships", ""])
            for edge_type in EdgeType:
                type_edges = self.get_edges_by_type(edge_type)
                if type_edges:
                    lines.append(f"### {edge_type.value.replace('_', ' ').title()}")
                    for edge in type_edges:
                        lines.append(f"- [{edge.target_id}](./{edge.target_id.lower()}.md)")
                    lines.append("")
        
        lines.extend([
            "---",
            f"*Last Updated: {self.metadata.updated_at.strftime('%Y-%m-%d')}*"
        ])
        
        return "\n".join(lines)


@dataclass
class Module:
    """A logical grouping of atoms representing a complete workflow."""
    module_id: str
    name: str
    description: str
    workflow_type: str  # BPM, SOP, CUSTOMER_JOURNEY, CUSTOM
    atoms: List[str] = field(default_factory=list)  # Atom IDs
    entry_points: List[str] = field(default_factory=list)
    exit_points: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


# =============================================================================
# GRAPH OPERATIONS
# =============================================================================

class DocumentGraph:
    """In-memory graph representation for documentation atoms."""
    
    def __init__(self):
        self.atoms: Dict[str, Atom] = {}
        self.modules: Dict[str, Module] = {}
        self._reverse_edges: Dict[str, List[tuple[str, EdgeType]]] = {}
    
    def add_atom(self, atom: Atom) -> None:
        """Add an atom to the graph."""
        self.atoms[atom.atom_id] = atom
        self._index_edges(atom)
    
    def _index_edges(self, atom: Atom) -> None:
        """Build reverse edge index for traversal."""
        for edge in atom.edges:
            if edge.target_id not in self._reverse_edges:
                self._reverse_edges[edge.target_id] = []
            self._reverse_edges[edge.target_id].append((atom.atom_id, edge.edge_type))
    
    def get_atom(self, atom_id: str) -> Optional[Atom]:
        """Retrieve an atom by ID."""
        return self.atoms.get(atom_id)
    
    def get_downstream(
        self, 
        atom_id: str, 
        edge_types: Optional[List[EdgeType]] = None,
        max_depth: int = 10
    ) -> Dict[str, int]:
        """
        Find all atoms downstream of the given atom.
        Returns dict of atom_id -> distance.
        """
        if edge_types is None:
            edge_types = [EdgeType.TRIGGERS, EdgeType.REQUIRES, EdgeType.PRODUCES]
        
        visited: Dict[str, int] = {}
        queue = [(atom_id, 0)]
        
        while queue:
            current_id, depth = queue.pop(0)
            
            if depth >= max_depth or current_id in visited:
                continue
            
            visited[current_id] = depth
            current = self.atoms.get(current_id)
            
            if current:
                for edge in current.edges:
                    if edge.edge_type in edge_types and edge.target_id not in visited:
                        queue.append((edge.target_id, depth + 1))
        
        # Remove the starting atom
        visited.pop(atom_id, None)
        return visited
    
    def get_upstream(
        self, 
        atom_id: str, 
        edge_types: Optional[List[EdgeType]] = None,
        max_depth: int = 10
    ) -> Dict[str, int]:
        """
        Find all atoms upstream of the given atom.
        Uses reverse edge index.
        """
        if edge_types is None:
            edge_types = [EdgeType.TRIGGERS, EdgeType.REQUIRES, EdgeType.PRODUCES]
        
        visited: Dict[str, int] = {}
        queue = [(atom_id, 0)]
        
        while queue:
            current_id, depth = queue.pop(0)
            
            if depth >= max_depth or current_id in visited:
                continue
            
            visited[current_id] = depth
            
            # Use reverse edge index
            upstream = self._reverse_edges.get(current_id, [])
            for source_id, edge_type in upstream:
                if edge_type in edge_types and source_id not in visited:
                    queue.append((source_id, depth + 1))
        
        visited.pop(atom_id, None)
        return visited
    
    def find_paths(
        self, 
        start_id: str, 
        end_id: str, 
        max_hops: int = 5
    ) -> List[List[str]]:
        """Find all paths between two atoms."""
        paths = []
        
        def dfs(current: str, target: str, path: List[str], depth: int):
            if depth > max_hops:
                return
            if current == target:
                paths.append(path.copy())
                return
            
            atom = self.atoms.get(current)
            if not atom:
                return
            
            for edge in atom.edges:
                if edge.target_id not in path:
                    path.append(edge.target_id)
                    dfs(edge.target_id, target, path, depth + 1)
                    path.pop()
        
        dfs(start_id, end_id, [start_id], 0)
        return paths
    
    def get_affected_modules(self, atom_ids: Set[str]) -> Set[str]:
        """Find all modules containing any of the given atoms."""
        affected = set()
        for module in self.modules.values():
            if atom_ids & set(module.atoms):
                affected.add(module.module_id)
        return affected


# =============================================================================
# IMPACT ANALYSIS
# =============================================================================

@dataclass
class ImpactReport:
    """Report of change impact analysis."""
    changed_atoms: List[str]
    directly_affected: Dict[str, int]  # atom_id -> distance
    indirectly_affected: Dict[str, int]
    affected_modules: Set[str]
    affected_regulations: List[str]
    risk_score: int
    risk_level: RiskLevel
    approval_required: str  # "AUTO", "TEAM", "LEAD", "EXECUTIVE"
    recommendations: List[str]


class ImpactAnalyzer:
    """Analyzes the impact of documentation changes."""
    
    # Risk weights by atom type
    TYPE_WEIGHTS = {
        AtomType.REGULATION: 50,
        AtomType.SYSTEM: 30,
        AtomType.DECISION: 25,
        AtomType.PROCESS: 20,
        AtomType.ROLE: 15,
        AtomType.DOCUMENT: 10,
        AtomType.METRIC: 10,
        AtomType.RISK: 40,
    }
    
    def __init__(self, graph: DocumentGraph):
        self.graph = graph
    
    def analyze(self, changed_atom_ids: List[str]) -> ImpactReport:
        """Perform full impact analysis on changed atoms."""
        all_downstream: Dict[str, int] = {}
        affected_regs = []
        
        for atom_id in changed_atom_ids:
            downstream = self.graph.get_downstream(atom_id)
            for aid, dist in downstream.items():
                if aid not in all_downstream or all_downstream[aid] > dist:
                    all_downstream[aid] = dist
                
                # Check for regulation impacts
                atom = self.graph.get_atom(aid)
                if atom and atom.atom_type == AtomType.REGULATION:
                    affected_regs.append(aid)
        
        # Separate direct (distance 1) from indirect
        direct = {k: v for k, v in all_downstream.items() if v == 1}
        indirect = {k: v for k, v in all_downstream.items() if v > 1}
        
        # Find affected modules
        all_affected = set(changed_atom_ids) | set(all_downstream.keys())
        affected_modules = self.graph.get_affected_modules(all_affected)
        
        # Calculate risk score
        risk_score = self._calculate_risk_score(
            changed_atom_ids, all_downstream, affected_modules, affected_regs
        )
        risk_level = self._score_to_level(risk_score)
        
        return ImpactReport(
            changed_atoms=changed_atom_ids,
            directly_affected=direct,
            indirectly_affected=indirect,
            affected_modules=affected_modules,
            affected_regulations=affected_regs,
            risk_score=risk_score,
            risk_level=risk_level,
            approval_required=self._get_approval_level(risk_level),
            recommendations=self._generate_recommendations(
                risk_level, affected_regs, len(affected_modules)
            )
        )
    
    def _calculate_risk_score(
        self,
        changed: List[str],
        downstream: Dict[str, int],
        modules: Set[str],
        regulations: List[str]
    ) -> int:
        score = 0
        
        for atom_id in changed:
            atom = self.graph.get_atom(atom_id)
            if atom:
                score += self.TYPE_WEIGHTS.get(atom.atom_type, 10)
        
        # Downstream impact
        score += len(downstream) * 5
        
        # Cross-module penalty
        if len(modules) > 1:
            score += (len(modules) - 1) * 20
        
        # Regulation cascade multiplier
        if regulations:
            score = int(score * (1 + len(regulations) * 0.5))
        
        return score
    
    def _score_to_level(self, score: int) -> RiskLevel:
        if score < 30:
            return RiskLevel.LOW
        elif score < 70:
            return RiskLevel.MEDIUM
        elif score < 150:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL
    
    def _get_approval_level(self, level: RiskLevel) -> str:
        return {
            RiskLevel.LOW: "AUTO",
            RiskLevel.MEDIUM: "TEAM",
            RiskLevel.HIGH: "LEAD",
            RiskLevel.CRITICAL: "EXECUTIVE"
        }[level]
    
    def _generate_recommendations(
        self, 
        level: RiskLevel, 
        regulations: List[str],
        module_count: int
    ) -> List[str]:
        recs = []
        
        if level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            recs.append("Consider phased rollout with validation checkpoints")
        
        if regulations:
            recs.append(f"Review compliance implications for {len(regulations)} affected regulation(s)")
        
        if module_count > 2:
            recs.append("Coordinate with owners of all affected modules before merge")
        
        return recs


# =============================================================================
# RAG FOUNDATION
# =============================================================================

@dataclass
class RAGContext:
    """Context assembled for RAG queries."""
    atoms: List[Atom]
    edges: List[tuple[str, EdgeType, str]]  # source, type, target
    modules: List[Module]
    query_type: str  # "entity", "path", "impact", "semantic"
    relevance_scores: Dict[str, float] = field(default_factory=dict)


class GraphRAG:
    """RAG system leveraging graph structure."""
    
    def __init__(self, graph: DocumentGraph):
        self.graph = graph
        self.impact_analyzer = ImpactAnalyzer(graph)
    
    def query_entity(
        self, 
        query: str, 
        type_filter: Optional[AtomType] = None,
        max_results: int = 10
    ) -> RAGContext:
        """
        Entity-based RAG query.
        In production, this would use vector embeddings.
        Here we use simple keyword matching for demonstration.
        """
        query_lower = query.lower()
        results = []
        
        for atom in self.graph.atoms.values():
            if type_filter and atom.atom_type != type_filter:
                continue
            
            # Simple relevance scoring (replace with embeddings in production)
            score = 0
            if query_lower in atom.name.lower():
                score += 0.5
            if query_lower in atom.description.lower():
                score += 0.3
            for step in atom.content.get("steps", []):
                if query_lower in step.lower():
                    score += 0.1
            
            if score > 0:
                results.append((atom, score))
        
        # Sort by relevance
        results.sort(key=lambda x: x[1], reverse=True)
        results = results[:max_results]
        
        return RAGContext(
            atoms=[r[0] for r in results],
            edges=[],
            modules=[],
            query_type="entity",
            relevance_scores={r[0].atom_id: r[1] for r in results}
        )
    
    def query_path(
        self, 
        start_id: str, 
        end_id: str, 
        max_hops: int = 5
    ) -> RAGContext:
        """Path-based RAG query to find connections between atoms."""
        paths = self.graph.find_paths(start_id, end_id, max_hops)
        
        # Collect all atoms and edges in paths
        atom_ids = set()
        edges = []
        
        for path in paths:
            for i, atom_id in enumerate(path):
                atom_ids.add(atom_id)
                if i < len(path) - 1:
                    source = self.graph.get_atom(atom_id)
                    if source:
                        for edge in source.edges:
                            if edge.target_id == path[i + 1]:
                                edges.append((atom_id, edge.edge_type, edge.target_id))
        
        atoms = [self.graph.get_atom(aid) for aid in atom_ids]
        atoms = [a for a in atoms if a is not None]
        
        return RAGContext(
            atoms=atoms,
            edges=edges,
            modules=[],
            query_type="path"
        )
    
    def query_impact(self, atom_id: str) -> tuple[RAGContext, ImpactReport]:
        """Impact-based RAG query for 'what if' analysis."""
        report = self.impact_analyzer.analyze([atom_id])
        
        # Gather all affected atoms
        affected_ids = (
            set(report.directly_affected.keys()) | 
            set(report.indirectly_affected.keys())
        )
        atoms = [self.graph.get_atom(aid) for aid in affected_ids]
        atoms = [a for a in atoms if a is not None]
        
        # Gather affected modules
        modules = [
            self.graph.modules[mid] 
            for mid in report.affected_modules 
            if mid in self.graph.modules
        ]
        
        context = RAGContext(
            atoms=atoms,
            edges=[],
            modules=modules,
            query_type="impact",
            relevance_scores={
                aid: 1.0 / (dist + 1) 
                for aid, dist in {
                    **report.directly_affected, 
                    **report.indirectly_affected
                }.items()
            }
        )
        
        return context, report
    
    def build_prompt_context(self, context: RAGContext) -> str:
        """Build context string for LLM prompt."""
        sections = []
        
        if context.atoms:
            sections.append("## Relevant Documentation Atoms\n")
            for atom in context.atoms:
                relevance = context.relevance_scores.get(atom.atom_id, 0)
                sections.append(f"### {atom.atom_id}: {atom.name}")
                sections.append(f"Type: {atom.atom_type.value} | Relevance: {relevance:.2f}")
                sections.append(f"Description: {atom.description}")
                if atom.content.get("steps"):
                    sections.append("Steps: " + "; ".join(atom.content["steps"][:3]))
                sections.append("")
        
        if context.edges:
            sections.append("## Relationships\n")
            for source, edge_type, target in context.edges:
                sections.append(f"- {source} --[{edge_type.value}]--> {target}")
            sections.append("")
        
        return "\n".join(sections)


# =============================================================================
# USAGE EXAMPLE
# =============================================================================

def example_usage():
    """Demonstrate the core functionality."""
    
    # Create a simple documentation graph
    graph = DocumentGraph()
    
    # Create atoms
    receive_app = Atom(
        atom_id="PROC-001",
        atom_type=AtomType.PROCESS,
        name="Receive Loan Application",
        description="Initial intake and validation of borrower loan application",
        metadata=AtomMetadata(owner="intake_supervisor", team="loan_operations"),
        content={
            "steps": [
                "Receive application via portal, email, or in-person",
                "Validate completeness of required fields",
                "Generate unique loan identifier",
                "Route to appropriate processor queue"
            ],
            "exceptions": [
                {"condition": "Missing SSN", "action": "Return to borrower"}
            ]
        }
    )
    
    verify_income = Atom(
        atom_id="PROC-002",
        atom_type=AtomType.PROCESS,
        name="Verify Borrower Income",
        description="Validate income documentation against stated values",
        metadata=AtomMetadata(owner="underwriter", team="underwriting")
    )
    
    credit_check = Atom(
        atom_id="PROC-003",
        atom_type=AtomType.PROCESS,
        name="Credit Check",
        description="Pull and analyze borrower credit report",
        metadata=AtomMetadata(owner="processor", team="processing")
    )
    
    trid_reg = Atom(
        atom_id="REG-001",
        atom_type=AtomType.REGULATION,
        name="TRID Disclosure Requirements",
        description="TILA-RESPA Integrated Disclosure timing requirements",
        metadata=AtomMetadata(owner="compliance", team="compliance", risk_level=RiskLevel.HIGH)
    )
    
    # Add edges
    receive_app.add_edge(EdgeType.TRIGGERS, "PROC-002")
    receive_app.add_edge(EdgeType.TRIGGERS, "PROC-003")
    receive_app.add_edge(EdgeType.GOVERNED_BY, "REG-001")
    verify_income.add_edge(EdgeType.REQUIRES, "PROC-001")
    credit_check.add_edge(EdgeType.REQUIRES, "PROC-001")
    
    # Add to graph
    for atom in [receive_app, verify_income, credit_check, trid_reg]:
        graph.add_atom(atom)
    
    # Create module
    intake_module = Module(
        module_id="MOD-INTAKE",
        name="Loan Intake Module",
        description="Application receipt and initial validation",
        workflow_type="BPM",
        atoms=["PROC-001", "PROC-002", "PROC-003"],
        entry_points=["PROC-001"]
    )
    graph.modules[intake_module.module_id] = intake_module
    
    # Demonstrate capabilities
    print("=== Atom YAML ===")
    print(receive_app.to_yaml())
    
    print("\n=== Atom Markdown ===")
    print(receive_app.to_markdown())
    
    print("\n=== Downstream Analysis ===")
    downstream = graph.get_downstream("PROC-001")
    print(f"Atoms downstream of PROC-001: {downstream}")
    
    print("\n=== Impact Analysis ===")
    analyzer = ImpactAnalyzer(graph)
    report = analyzer.analyze(["PROC-001"])
    print(f"Risk Score: {report.risk_score}")
    print(f"Risk Level: {report.risk_level.value}")
    print(f"Approval Required: {report.approval_required}")
    print(f"Affected Regulations: {report.affected_regulations}")
    print(f"Recommendations: {report.recommendations}")
    
    print("\n=== RAG Query ===")
    rag = GraphRAG(graph)
    context = rag.query_entity("income verification")
    print(f"Found {len(context.atoms)} relevant atoms")
    print(rag.build_prompt_context(context))


if __name__ == "__main__":
    example_usage()
