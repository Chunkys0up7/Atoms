#!/usr/bin/env python3
"""
GNDP Impact Analysis Script

Analyzes the impact of changed atoms/modules and outputs:
- Risk score and level
- Affected atoms (direct and indirect)
- Affected modules
- Approval recommendations

Usage:
    python impact_analysis.py --changed-files "atoms/proc-001.yaml,atoms/proc-002.yaml"
    python impact_analysis.py --changed-files "atoms/proc-001.yaml" --output-format markdown
"""

import argparse
import json
import os
import sys
import io
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum
import yaml

# Set UTF-8 encoding for stdout on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


class RiskLevel(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class ImpactResult:
    """Result of impact analysis."""
    changed_atoms: List[str]
    direct_impacts: Dict[str, str]  # atom_id -> relationship type
    indirect_impacts: Dict[str, int]  # atom_id -> distance
    affected_modules: Set[str]
    affected_regulations: List[str]
    cross_module_impacts: List[Tuple[str, str]]  # (source_module, target_module)
    risk_score: int
    risk_level: RiskLevel
    approval_required: str
    recommendations: List[str]


class ImpactAnalyzer:
    """Analyzes impact of documentation changes."""
    
    TYPE_WEIGHTS = {
        'REGULATION': 50,
        'SYSTEM': 30,
        'DECISION': 25,
        'PROCESS': 20,
        'ROLE': 15,
        'DOCUMENT': 10,
        'METRIC': 10,
        'RISK': 40,
    }
    
    PROPAGATING_EDGES = {'TRIGGERS', 'REQUIRES', 'PRODUCES', 'GOVERNED_BY'}
    
    def __init__(self, repo_root: Path):
        self.repo_root = repo_root
        self.atoms: Dict[str, dict] = {}
        self.modules: Dict[str, dict] = {}
        self.reverse_edges: Dict[str, List[Tuple[str, str]]] = {}  # target -> [(source, type)]
        self.atom_to_module: Dict[str, str] = {}
        
        self._load_all()
    
    def _load_all(self):
        """Load all atoms and modules from repository."""
        # Load atoms
        atoms_dir = self.repo_root / 'atoms'
        if atoms_dir.exists():
            for yaml_file in atoms_dir.rglob('*.yaml'):
                self._load_atom(yaml_file)
            for yaml_file in atoms_dir.rglob('*.yml'):
                self._load_atom(yaml_file)
        
        # Load modules
        modules_dir = self.repo_root / 'modules'
        if modules_dir.exists():
            for yaml_file in modules_dir.rglob('*.yaml'):
                self._load_module(yaml_file)
            for yaml_file in modules_dir.rglob('*.yml'):
                self._load_module(yaml_file)
        
        # Build reverse edge index and atom-to-module mapping
        self._build_indexes()
    
    def _load_atom(self, path: Path):
        """Load a single atom."""
        try:
            with open(path, encoding='utf-8') as f:
                data = yaml.safe_load(f)
            # Support both 'atom_id' and 'id' field names
            atom_id = data.get('atom_id') or data.get('id')
            if data and atom_id:
                data['_path'] = str(path)
                data['atom_id'] = atom_id  # Normalize to 'atom_id'
                self.atoms[atom_id] = data
        except Exception as e:
            print(f"Warning: Failed to load {path}: {e}", file=sys.stderr)
    
    def _load_module(self, path: Path):
        """Load a single module."""
        try:
            with open(path, encoding='utf-8') as f:
                data = yaml.safe_load(f)
            if data and 'module_id' in data:
                data['_path'] = str(path)
                self.modules[data['module_id']] = data
        except Exception as e:
            print(f"Warning: Failed to load {path}: {e}", file=sys.stderr)
    
    def _build_indexes(self):
        """Build reverse edge index and atom-to-module mapping."""
        # Reverse edges
        for atom_id, atom in self.atoms.items():
            for edge in atom.get('edges', []):
                target = edge.get('target', '')
                edge_type = edge.get('type', '')
                if target:
                    if target not in self.reverse_edges:
                        self.reverse_edges[target] = []
                    self.reverse_edges[target].append((atom_id, edge_type))
        
        # Atom to module
        for module_id, module in self.modules.items():
            for atom_id in module.get('atoms', []):
                self.atom_to_module[atom_id] = module_id
    
    def analyze(self, changed_files: List[str]) -> ImpactResult:
        """Analyze impact of changed files."""
        # Extract atom IDs from changed files
        changed_atoms = self._extract_changed_atoms(changed_files)
        
        if not changed_atoms:
            return ImpactResult(
                changed_atoms=[],
                direct_impacts={},
                indirect_impacts={},
                affected_modules=set(),
                affected_regulations=[],
                cross_module_impacts=[],
                risk_score=0,
                risk_level=RiskLevel.LOW,
                approval_required="AUTO",
                recommendations=[]
            )
        
        # Find all downstream impacts
        direct, indirect = self._find_downstream(changed_atoms)
        
        # Find affected modules
        all_affected = set(changed_atoms) | set(direct.keys()) | set(indirect.keys())
        affected_modules = {
            self.atom_to_module.get(aid)
            for aid in all_affected
            if aid in self.atom_to_module
        }
        affected_modules.discard(None)
        
        # Find affected regulations
        affected_regs = [
            aid for aid in all_affected
            if self.atoms.get(aid, {}).get('type') == 'REGULATION'
        ]
        
        # Find cross-module impacts
        cross_module = self._find_cross_module_impacts(changed_atoms, all_affected)
        
        # Calculate risk
        risk_score = self._calculate_risk(
            changed_atoms, direct, indirect, 
            affected_modules, affected_regs
        )
        risk_level = self._score_to_level(risk_score)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            risk_level, affected_regs, len(affected_modules), cross_module
        )
        
        return ImpactResult(
            changed_atoms=changed_atoms,
            direct_impacts=direct,
            indirect_impacts=indirect,
            affected_modules=affected_modules,
            affected_regulations=affected_regs,
            cross_module_impacts=cross_module,
            risk_score=risk_score,
            risk_level=risk_level,
            approval_required=self._get_approval_level(risk_level),
            recommendations=recommendations
        )
    
    def _extract_changed_atoms(self, changed_files: List[str]) -> List[str]:
        """Extract atom IDs from changed file paths."""
        atom_ids = []
        
        for file_path in changed_files:
            path = Path(file_path)
            if path.suffix in ['.yaml', '.yml']:
                # Try to load and get atom_id
                full_path = self.repo_root / path
                if full_path.exists():
                    try:
                        with open(full_path, encoding='utf-8') as f:
                            data = yaml.safe_load(f)
                        # Support both 'atom_id' and 'id' field names
                        atom_id = data.get('atom_id') or data.get('id')
                        if data and atom_id:
                            atom_ids.append(atom_id)
                    except:
                        pass
        
        return atom_ids
    
    def _find_downstream(
        self, 
        start_atoms: List[str]
    ) -> Tuple[Dict[str, str], Dict[str, int]]:
        """Find all downstream atoms using BFS."""
        direct = {}  # Atoms at distance 1
        indirect = {}  # Atoms at distance > 1
        visited = set(start_atoms)
        queue = [(atom_id, 0) for atom_id in start_atoms]
        
        while queue:
            current_id, depth = queue.pop(0)
            current_atom = self.atoms.get(current_id, {})
            
            for edge in current_atom.get('edges', []):
                edge_type = edge.get('type', '')
                target_id = edge.get('target', '')
                
                if not target_id or target_id in visited:
                    continue
                
                if edge_type not in self.PROPAGATING_EDGES:
                    continue
                
                visited.add(target_id)
                new_depth = depth + 1
                
                if new_depth == 1:
                    direct[target_id] = edge_type
                else:
                    indirect[target_id] = new_depth
                
                queue.append((target_id, new_depth))
        
        return direct, indirect
    
    def _find_cross_module_impacts(
        self, 
        changed_atoms: List[str],
        all_affected: Set[str]
    ) -> List[Tuple[str, str]]:
        """Find impacts that cross module boundaries."""
        cross_module = []
        
        for atom_id in changed_atoms:
            source_module = self.atom_to_module.get(atom_id)
            if not source_module:
                continue
            
            for affected_id in all_affected:
                if affected_id == atom_id:
                    continue
                
                target_module = self.atom_to_module.get(affected_id)
                if target_module and target_module != source_module:
                    pair = (source_module, target_module)
                    if pair not in cross_module:
                        cross_module.append(pair)
        
        return cross_module
    
    def _calculate_risk(
        self,
        changed: List[str],
        direct: Dict[str, str],
        indirect: Dict[str, int],
        modules: Set[str],
        regulations: List[str]
    ) -> int:
        """Calculate risk score."""
        score = 0
        
        # Weight by changed atom types
        for atom_id in changed:
            atom = self.atoms.get(atom_id, {})
            atom_type = atom.get('type', 'PROCESS')
            score += self.TYPE_WEIGHTS.get(atom_type, 10)
        
        # Direct impact penalty
        score += len(direct) * 10
        
        # Indirect impact (diminishing)
        for distance in indirect.values():
            score += max(1, 10 // distance)
        
        # Cross-module penalty
        if len(modules) > 1:
            score += (len(modules) - 1) * 25
        
        # Regulation cascade multiplier
        if regulations:
            score = int(score * (1 + len(regulations) * 0.5))
        
        return score
    
    def _score_to_level(self, score: int) -> RiskLevel:
        """Convert score to risk level."""
        if score < 30:
            return RiskLevel.LOW
        elif score < 70:
            return RiskLevel.MEDIUM
        elif score < 150:
            return RiskLevel.HIGH
        else:
            return RiskLevel.CRITICAL
    
    def _get_approval_level(self, level: RiskLevel) -> str:
        """Get required approval level."""
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
        module_count: int,
        cross_module: List[Tuple[str, str]]
    ) -> List[str]:
        """Generate recommendations based on analysis."""
        recs = []
        
        if level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            recs.append("Consider phased rollout with validation checkpoints")
            recs.append("Schedule review meeting with affected teams")
        
        if regulations:
            recs.append(f"Review compliance implications for {len(regulations)} affected regulation(s)")
            recs.append("Consider compliance team review before merge")
        
        if module_count > 2:
            recs.append(f"Coordinate with owners of {module_count} affected modules")
        
        if cross_module:
            modules_involved = set()
            for src, tgt in cross_module:
                modules_involved.add(src)
                modules_involved.add(tgt)
            recs.append(f"Cross-module impact detected: {', '.join(modules_involved)}")
        
        return recs


def format_github_output(result: ImpactResult) -> str:
    """Format result for GitHub Actions output."""
    lines = [
        f"risk_level={result.risk_level.value}",
        f"risk_score={result.risk_score}",
        f"affected_count={len(result.direct_impacts) + len(result.indirect_impacts)}",
        f"modules_affected={len(result.affected_modules)}",
        f"approval_required={result.approval_required}"
    ]
    return '\n'.join(lines)


def format_markdown(result: ImpactResult) -> str:
    """Format result as markdown report."""
    risk_emoji = {
        RiskLevel.LOW: "🟢",
        RiskLevel.MEDIUM: "🟡",
        RiskLevel.HIGH: "🔴",
        RiskLevel.CRITICAL: "🟣"
    }
    
    lines = [
        f"### Risk Assessment",
        "",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Risk Level | {risk_emoji[result.risk_level]} **{result.risk_level.value}** |",
        f"| Risk Score | {result.risk_score} |",
        f"| Approval Required | {result.approval_required} |",
        "",
    ]
    
    if result.changed_atoms:
        lines.extend([
            "### Changed Atoms",
            "",
            *[f"- `{aid}`" for aid in result.changed_atoms],
            "",
        ])
    
    if result.direct_impacts:
        lines.extend([
            "### Direct Impacts",
            "",
            "| Atom | Relationship |",
            "|------|--------------|",
            *[f"| `{aid}` | {rel} |" for aid, rel in result.direct_impacts.items()],
            "",
        ])
    
    if result.indirect_impacts:
        lines.extend([
            "### Indirect Impacts",
            "",
            f"**{len(result.indirect_impacts)}** atoms affected indirectly",
            "",
            "<details>",
            "<summary>Show all</summary>",
            "",
            *[f"- `{aid}` (distance: {dist})" for aid, dist in 
              sorted(result.indirect_impacts.items(), key=lambda x: x[1])[:20]],
            "",
            "</details>",
            "",
        ])
    
    if result.affected_modules:
        lines.extend([
            "### Affected Modules",
            "",
            *[f"- {mod}" for mod in sorted(result.affected_modules)],
            "",
        ])
    
    if result.affected_regulations:
        lines.extend([
            "### ⚠️ Affected Regulations",
            "",
            *[f"- `{reg}`" for reg in result.affected_regulations],
            "",
        ])
    
    if result.cross_module_impacts:
        lines.extend([
            "### Cross-Module Impacts",
            "",
            *[f"- {src} → {tgt}" for src, tgt in result.cross_module_impacts],
            "",
        ])
    
    if result.recommendations:
        lines.extend([
            "### Recommendations",
            "",
            *[f"- {rec}" for rec in result.recommendations],
            "",
        ])
    
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description='GNDP Impact Analysis')
    parser.add_argument('--changed-files', required=True,
                        help='Comma-separated list of changed files')
    parser.add_argument('--repo-root', type=Path, default=Path('.'),
                        help='Repository root directory')
    parser.add_argument('--output-format', choices=['github', 'markdown', 'json'],
                        default='github', help='Output format')
    
    args = parser.parse_args()
    
    # Parse changed files
    changed_files = [f.strip() for f in args.changed_files.split(',') if f.strip()]
    
    if not changed_files:
        print("No changed files provided", file=sys.stderr)
        sys.exit(0)
    
    # Run analysis
    analyzer = ImpactAnalyzer(args.repo_root)
    result = analyzer.analyze(changed_files)
    
    # Output result
    if args.output_format == 'github':
        print(format_github_output(result))
    elif args.output_format == 'markdown':
        print(format_markdown(result))
    elif args.output_format == 'json':
        output = {
            'changed_atoms': result.changed_atoms,
            'direct_impacts': result.direct_impacts,
            'indirect_impacts': result.indirect_impacts,
            'affected_modules': list(result.affected_modules),
            'affected_regulations': result.affected_regulations,
            'cross_module_impacts': result.cross_module_impacts,
            'risk_score': result.risk_score,
            'risk_level': result.risk_level.value,
            'approval_required': result.approval_required,
            'recommendations': result.recommendations
        }
        print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()
