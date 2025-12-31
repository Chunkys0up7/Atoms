#!/usr/bin/env python3
"""
GNDP Orphan and Graph Integrity Checker

Detects orphaned atoms, broken references, and circular dependencies.
Follows agent.md patterns for CI/CD integration.

Usage:
    python scripts/check_orphans.py                 # Check all
    python scripts/check_orphans.py --fix           # Auto-fix broken refs
    python scripts/check_orphans.py --report-only   # Generate report without errors
"""

import argparse
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set, Tuple

try:
    import yaml
except ImportError:
    print("Error: pyyaml not installed. Run: pip install pyyaml")
    sys.exit(1)


class GraphIntegrityChecker:
    """Checks integrity of GNDP atom/module graph."""

    def __init__(self, root_dir: Path = None):
        self.root_dir = root_dir or Path(__file__).parent.parent
        self.atoms: Dict[str, dict] = {}
        self.modules: Dict[str, dict] = {}
        self.issues: List[str] = []
        self.warnings: List[str] = []

    def load_atoms(self):
        """Load all atoms from YAML files."""
        atoms_dir = self.root_dir / "atoms"
        if not atoms_dir.exists():
            raise FileNotFoundError(f"Atoms directory not found: {atoms_dir}")

        for atom_file in atoms_dir.rglob("*.yaml"):
            try:
                with open(atom_file, "r", encoding="utf-8") as f:
                    atom_data = yaml.safe_load(f)
                    atom_id = atom_data.get("id")
                    if atom_id:
                        atom_data["_file_path"] = str(atom_file)
                        self.atoms[atom_id] = atom_data
            except Exception as e:
                self.warnings.append(f"Failed to load {atom_file}: {e}")

    def load_modules(self):
        """Load all modules from YAML files."""
        modules_dir = self.root_dir / "modules"
        if not modules_dir.exists():
            self.warnings.append(f"Modules directory not found: {modules_dir}")
            return

        for module_file in modules_dir.glob("*.yaml"):
            try:
                with open(module_file, "r", encoding="utf-8") as f:
                    module_data = yaml.safe_load(f)
                    module_id = module_data.get("module_id")
                    if module_id:
                        module_data["_file_path"] = str(module_file)
                        self.modules[module_id] = module_data
            except Exception as e:
                self.warnings.append(f"Failed to load {module_file}: {e}")

    def check_orphaned_atoms(self) -> List[str]:
        """Find atoms with no upstream or downstream connections."""
        orphans = []

        for atom_id, atom in self.atoms.items():
            upstream = atom.get("upstream_ids", [])
            downstream = atom.get("downstream_ids", [])

            if not upstream and not downstream:
                orphans.append(atom_id)
                self.warnings.append(f"Orphaned atom: {atom_id} ({atom.get('type')}) - no relationships")

        return orphans

    def check_broken_references(self) -> List[Tuple[str, str]]:
        """Find references to non-existent atoms."""
        broken_refs = []
        all_atom_ids = set(self.atoms.keys())

        for atom_id, atom in self.atoms.items():
            # Check upstream references
            for upstream_id in atom.get("upstream_ids", []):
                if upstream_id not in all_atom_ids:
                    broken_refs.append((atom_id, upstream_id))
                    self.issues.append(f"Broken reference: {atom_id} -> {upstream_id} (upstream atom not found)")

            # Check downstream references
            for downstream_id in atom.get("downstream_ids", []):
                if downstream_id not in all_atom_ids:
                    broken_refs.append((atom_id, downstream_id))
                    self.issues.append(f"Broken reference: {atom_id} -> {downstream_id} (downstream atom not found)")

        return broken_refs

    def check_bidirectional_consistency(self) -> List[str]:
        """Check if upstream/downstream relationships are bidirectional."""
        inconsistencies = []

        for atom_id, atom in self.atoms.items():
            # For each downstream, check if it has this atom as upstream
            for downstream_id in atom.get("downstream_ids", []):
                if downstream_id in self.atoms:
                    downstream_atom = self.atoms[downstream_id]
                    if atom_id not in downstream_atom.get("upstream_ids", []):
                        inconsistencies.append(f"{atom_id} -> {downstream_id} not reciprocated")
                        self.issues.append(
                            f"Inconsistent relationship: {atom_id} lists {downstream_id} as downstream, "
                            f"but {downstream_id} doesn't list {atom_id} as upstream"
                        )

            # For each upstream, check if it has this atom as downstream
            for upstream_id in atom.get("upstream_ids", []):
                if upstream_id in self.atoms:
                    upstream_atom = self.atoms[upstream_id]
                    if atom_id not in upstream_atom.get("downstream_ids", []):
                        inconsistencies.append(f"{upstream_id} <- {atom_id} not reciprocated")
                        self.issues.append(
                            f"Inconsistent relationship: {atom_id} lists {upstream_id} as upstream, "
                            f"but {upstream_id} doesn't list {atom_id} as downstream"
                        )

        return inconsistencies

    def check_circular_dependencies(self) -> List[List[str]]:
        """Detect circular dependencies using DFS."""

        def dfs(node: str, visited: Set[str], rec_stack: Set[str], path: List[str]) -> List[str]:
            """DFS to detect cycles."""
            visited.add(node)
            rec_stack.add(node)
            path.append(node)

            atom = self.atoms.get(node, {})
            for downstream_id in atom.get("downstream_ids", []):
                if downstream_id not in visited:
                    cycle = dfs(downstream_id, visited, rec_stack, path.copy())
                    if cycle:
                        return cycle
                elif downstream_id in rec_stack:
                    # Found cycle
                    cycle_start = path.index(downstream_id)
                    return path[cycle_start:] + [downstream_id]

            rec_stack.remove(node)
            return []

        cycles = []
        visited = set()

        for atom_id in self.atoms:
            if atom_id not in visited:
                cycle = dfs(atom_id, visited, set(), [])
                if cycle:
                    cycles.append(cycle)
                    self.issues.append(f"Circular dependency detected: {' -> '.join(cycle)}")

        return cycles

    def check_module_atom_references(self) -> List[str]:
        """Check if modules reference valid atoms."""
        invalid_refs = []

        for module_id, module in self.modules.items():
            for atom_id in module.get("atom_ids", []):
                if atom_id not in self.atoms:
                    invalid_refs.append(f"{module_id} -> {atom_id}")
                    self.issues.append(f"Module {module_id} references non-existent atom {atom_id}")

        return invalid_refs

    def check_module_dependencies(self) -> List[str]:
        """Check if module dependencies are valid."""
        invalid_deps = []
        all_module_ids = set(self.modules.keys())

        for module_id, module in self.modules.items():
            dependencies = module.get("metadata", {}).get("dependencies", [])
            for dep_id in dependencies:
                if dep_id not in all_module_ids:
                    invalid_deps.append(f"{module_id} -> {dep_id}")
                    self.issues.append(f"Module {module_id} depends on non-existent module {dep_id}")

        return invalid_deps

    def generate_report(self) -> dict:
        """Generate comprehensive integrity report."""
        orphans = self.check_orphaned_atoms()
        broken_refs = self.check_broken_references()
        inconsistencies = self.check_bidirectional_consistency()
        cycles = self.check_circular_dependencies()
        module_atom_refs = self.check_module_atom_references()
        module_deps = self.check_module_dependencies()

        return {
            "total_atoms": len(self.atoms),
            "total_modules": len(self.modules),
            "orphaned_atoms": len(orphans),
            "broken_references": len(broken_refs),
            "inconsistent_relationships": len(inconsistencies),
            "circular_dependencies": len(cycles),
            "invalid_module_atom_refs": len(module_atom_refs),
            "invalid_module_deps": len(module_deps),
            "orphan_details": orphans,
            "cycle_details": cycles,
        }

    def print_results(self, report: dict, report_only: bool = False):
        """Print integrity check results."""
        print("\n" + "=" * 60)
        print("GNDP Graph Integrity Report")
        print("=" * 60)

        print(f"\nSummary:")
        print(f"  Total Atoms: {report['total_atoms']}")
        print(f"  Total Modules: {report['total_modules']}")

        print(f"\nIssues Found:")
        print(f"  Orphaned Atoms: {report['orphaned_atoms']}")
        print(f"  Broken References: {report['broken_references']}")
        print(f"  Inconsistent Relationships: {report['inconsistent_relationships']}")
        print(f"  Circular Dependencies: {report['circular_dependencies']}")
        print(f"  Invalid Module->Atom Refs: {report['invalid_module_atom_refs']}")
        print(f"  Invalid Module Dependencies: {report['invalid_module_deps']}")

        # Detailed issues
        if self.issues:
            print(f"\n[ERROR] Critical Issues ({len(self.issues)}):")
            for issue in self.issues:
                print(f"  - {issue}")

        # Warnings
        if self.warnings:
            print(f"\n[WARN] Warnings ({len(self.warnings)}):")
            for warning in self.warnings[:10]:  # Limit to first 10
                print(f"  - {warning}")
            if len(self.warnings) > 10:
                print(f"  ... and {len(self.warnings) - 10} more warnings")

        # Overall status
        print("\n" + "=" * 60)
        if not self.issues:
            print("[OK] Graph integrity check passed!")
        elif report_only:
            print("[WARN] Issues found (report-only mode, not failing)")
        else:
            print("[ERROR] Graph integrity check failed!")
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Check GNDP graph integrity")
    parser.add_argument("--report-only", action="store_true", help="Generate report without failing on issues")
    parser.add_argument(
        "--root", type=Path, default=Path(__file__).parent.parent, help="Root directory of GNDP project"
    )

    args = parser.parse_args()

    checker = GraphIntegrityChecker(root_dir=args.root)

    try:
        print("Loading atoms and modules...")
        checker.load_atoms()
        checker.load_modules()

        print(f"Loaded {len(checker.atoms)} atoms and {len(checker.modules)} modules")

        print("Running integrity checks...")
        report = checker.generate_report()

        checker.print_results(report, report_only=args.report_only)

        # Exit with error if issues found (unless report-only mode)
        if checker.issues and not args.report_only:
            sys.exit(1)
        else:
            sys.exit(0)

    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
