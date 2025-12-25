"""
Unit tests for graph traversal and dependency analysis.

Tests cover:
- Finding downstream dependencies
- Finding upstream dependencies
- Detecting circular dependencies
- Graph path finding
- Impact analysis traversal
- Module-scoped graph queries
"""

import pytest
from typing import List, Set, Dict, Optional


class TestGraphTraversal:
    """Test graph traversal algorithms"""

    def setup_method(self):
        """Set up test graph structure"""
        self.atoms = {
            "atom-cust-kyc": {
                "id": "atom-cust-kyc",
                "type": "process",
                "title": "Customer KYC",
                "relationships": {
                    "upstream": [],
                    "downstream": ["atom-cust-verify", "atom-bo-review"]
                }
            },
            "atom-cust-verify": {
                "id": "atom-cust-verify",
                "type": "process",
                "title": "Customer Verification",
                "relationships": {
                    "upstream": ["atom-cust-kyc"],
                    "downstream": ["atom-bo-decision"]
                }
            },
            "atom-bo-review": {
                "id": "atom-bo-review",
                "type": "process",
                "title": "Back Office Review",
                "relationships": {
                    "upstream": ["atom-cust-kyc"],
                    "downstream": ["atom-bo-decision"]
                }
            },
            "atom-bo-decision": {
                "id": "atom-bo-decision",
                "type": "process",
                "title": "Decision Point",
                "relationships": {
                    "upstream": ["atom-cust-verify", "atom-bo-review"],
                    "downstream": []
                }
            }
        }

    def test_find_downstream_dependencies(self):
        """Should find all downstream dependencies"""
        start_atom = "atom-cust-kyc"

        # Direct downstream
        direct_downstream = self.atoms[start_atom]["relationships"]["downstream"]
        assert "atom-cust-verify" in direct_downstream
        assert "atom-bo-review" in direct_downstream

        # Transitive downstream (all descendants)
        all_downstream = self._get_all_downstream(start_atom)
        assert "atom-cust-verify" in all_downstream
        assert "atom-bo-review" in all_downstream
        assert "atom-bo-decision" in all_downstream
        assert len(all_downstream) == 3

    def test_find_upstream_dependencies(self):
        """Should find all upstream dependencies"""
        end_atom = "atom-bo-decision"

        # Direct upstream
        direct_upstream = self.atoms[end_atom]["relationships"]["upstream"]
        assert "atom-cust-verify" in direct_upstream
        assert "atom-bo-review" in direct_upstream

        # Transitive upstream (all ancestors)
        all_upstream = self._get_all_upstream(end_atom)
        assert "atom-cust-verify" in all_upstream
        assert "atom-bo-review" in all_upstream
        assert "atom-cust-kyc" in all_upstream
        assert len(all_upstream) == 3

    def test_detect_circular_dependency(self):
        """Should detect circular dependencies in graph"""
        # Create a circular reference
        circular_atoms = {
            "atom-a": {
                "id": "atom-a",
                "relationships": {"upstream": [], "downstream": ["atom-b"]}
            },
            "atom-b": {
                "id": "atom-b",
                "relationships": {"upstream": ["atom-a"], "downstream": ["atom-c"]}
            },
            "atom-c": {
                "id": "atom-c",
                "relationships": {"upstream": ["atom-b"], "downstream": ["atom-a"]}
            }
        }

        has_cycle = self._detect_cycle(circular_atoms, "atom-a")
        assert has_cycle is True

    def test_no_circular_dependency_in_valid_graph(self):
        """Should not detect cycles in valid DAG"""
        has_cycle = self._detect_cycle(self.atoms, "atom-cust-kyc")
        assert has_cycle is False

    def test_find_path_between_atoms(self):
        """Should find path between two atoms"""
        path = self._find_path(self.atoms, "atom-cust-kyc", "atom-bo-decision")

        # One valid path: kyc -> verify -> decision
        assert path is not None
        assert path[0] == "atom-cust-kyc"
        assert path[-1] == "atom-bo-decision"
        assert "atom-cust-verify" in path or "atom-bo-review" in path

    def test_no_path_between_unconnected_atoms(self):
        """Should return None for unconnected atoms"""
        # Add isolated atom
        isolated_atom = {
            "atom-isolated": {
                "id": "atom-isolated",
                "relationships": {"upstream": [], "downstream": []}
            }
        }
        test_atoms = {**self.atoms, **isolated_atom}

        path = self._find_path(test_atoms, "atom-cust-kyc", "atom-isolated")
        assert path is None

    def test_impact_analysis_downstream(self):
        """Should identify all atoms impacted by a change"""
        # If atom-cust-kyc changes, all downstream should be impacted
        impacted = self._get_all_downstream("atom-cust-kyc")

        assert len(impacted) == 3
        assert "atom-cust-verify" in impacted
        assert "atom-bo-review" in impacted
        assert "atom-bo-decision" in impacted

    def test_impact_analysis_upstream(self):
        """Should identify all atoms that depend on target"""
        # If atom-bo-decision changes, check what depends on it
        impacted = self._get_all_downstream("atom-bo-decision")

        # Nothing downstream of decision point
        assert len(impacted) == 0

    def test_find_common_ancestor(self):
        """Should find common ancestor of two atoms"""
        # Both atom-cust-verify and atom-bo-review have atom-cust-kyc as ancestor
        ancestors_a = self._get_all_upstream("atom-cust-verify")
        ancestors_b = self._get_all_upstream("atom-bo-review")

        common = set(ancestors_a) & set(ancestors_b)
        assert "atom-cust-kyc" in common

    def test_find_common_descendant(self):
        """Should find common descendant of two atoms"""
        # Both atom-cust-verify and atom-bo-review have atom-bo-decision as descendant
        descendants_a = self._get_all_downstream("atom-cust-verify")
        descendants_b = self._get_all_downstream("atom-bo-review")

        common = set(descendants_a) & set(descendants_b)
        assert "atom-bo-decision" in common

    def test_graph_depth_calculation(self):
        """Should calculate maximum depth from root"""
        depths = self._calculate_depths(self.atoms)

        assert depths["atom-cust-kyc"] == 0  # Root
        assert depths["atom-cust-verify"] == 1
        assert depths["atom-bo-review"] == 1
        assert depths["atom-bo-decision"] == 2

    def test_find_root_atoms(self):
        """Should identify atoms with no upstream dependencies"""
        roots = [
            atom_id for atom_id, atom in self.atoms.items()
            if len(atom["relationships"]["upstream"]) == 0
        ]

        assert len(roots) == 1
        assert "atom-cust-kyc" in roots

    def test_find_leaf_atoms(self):
        """Should identify atoms with no downstream dependencies"""
        leaves = [
            atom_id for atom_id, atom in self.atoms.items()
            if len(atom["relationships"]["downstream"]) == 0
        ]

        assert len(leaves) == 1
        assert "atom-bo-decision" in leaves

    # Helper methods for graph traversal

    def _get_all_downstream(self, atom_id: str) -> Set[str]:
        """Get all downstream dependencies recursively"""
        visited = set()

        def traverse(current_id):
            if current_id not in self.atoms:
                return

            for downstream_id in self.atoms[current_id]["relationships"]["downstream"]:
                if downstream_id not in visited:
                    visited.add(downstream_id)
                    traverse(downstream_id)

        traverse(atom_id)
        return visited

    def _get_all_upstream(self, atom_id: str) -> Set[str]:
        """Get all upstream dependencies recursively"""
        visited = set()

        def traverse(current_id):
            if current_id not in self.atoms:
                return

            for upstream_id in self.atoms[current_id]["relationships"]["upstream"]:
                if upstream_id not in visited:
                    visited.add(upstream_id)
                    traverse(upstream_id)

        traverse(atom_id)
        return visited

    def _detect_cycle(self, atoms: Dict, start_id: str) -> bool:
        """Detect if there's a cycle in the graph using DFS"""
        visited = set()
        rec_stack = set()

        def has_cycle(node_id):
            visited.add(node_id)
            rec_stack.add(node_id)

            if node_id in atoms:
                for downstream_id in atoms[node_id]["relationships"]["downstream"]:
                    if downstream_id not in visited:
                        if has_cycle(downstream_id):
                            return True
                    elif downstream_id in rec_stack:
                        return True

            rec_stack.remove(node_id)
            return False

        return has_cycle(start_id)

    def _find_path(self, atoms: Dict, start_id: str, end_id: str) -> Optional[List[str]]:
        """Find a path between two atoms using BFS"""
        if start_id not in atoms or end_id not in atoms:
            return None

        if start_id == end_id:
            return [start_id]

        queue = [(start_id, [start_id])]
        visited = {start_id}

        while queue:
            current_id, path = queue.pop(0)

            if current_id not in atoms:
                continue

            for downstream_id in atoms[current_id]["relationships"]["downstream"]:
                if downstream_id == end_id:
                    return path + [downstream_id]

                if downstream_id not in visited:
                    visited.add(downstream_id)
                    queue.append((downstream_id, path + [downstream_id]))

        return None

    def _calculate_depths(self, atoms: Dict) -> Dict[str, int]:
        """Calculate depth of each atom from root(s)"""
        depths = {}

        # Find roots
        roots = [
            atom_id for atom_id, atom in atoms.items()
            if len(atom["relationships"]["upstream"]) == 0
        ]

        # BFS from each root
        for root_id in roots:
            queue = [(root_id, 0)]
            visited = set()

            while queue:
                current_id, depth = queue.pop(0)

                if current_id in visited:
                    continue

                visited.add(current_id)
                depths[current_id] = min(depths.get(current_id, float('inf')), depth)

                if current_id in atoms:
                    for downstream_id in atoms[current_id]["relationships"]["downstream"]:
                        queue.append((downstream_id, depth + 1))

        return depths


@pytest.mark.unit
class TestModuleScopedGraph:
    """Test graph operations scoped to modules"""

    def setup_method(self):
        """Set up test data with module associations"""
        self.atoms = {
            "atom-cust-kyc": {
                "id": "atom-cust-kyc",
                "module_id": "mod-customer-onboarding",
                "relationships": {"downstream": ["atom-cust-verify"]}
            },
            "atom-cust-verify": {
                "id": "atom-cust-verify",
                "module_id": "mod-customer-onboarding",
                "relationships": {"downstream": ["atom-bo-review"]}
            },
            "atom-bo-review": {
                "id": "atom-bo-review",
                "module_id": "mod-back-office",
                "relationships": {"downstream": []}
            }
        }

    def test_filter_atoms_by_module(self):
        """Should filter atoms belonging to specific module"""
        module_id = "mod-customer-onboarding"

        filtered = {
            atom_id: atom for atom_id, atom in self.atoms.items()
            if atom.get("module_id") == module_id
        }

        assert len(filtered) == 2
        assert "atom-cust-kyc" in filtered
        assert "atom-cust-verify" in filtered
        assert "atom-bo-review" not in filtered

    def test_find_cross_module_dependencies(self):
        """Should identify dependencies crossing module boundaries"""
        cross_module_deps = []

        for atom_id, atom in self.atoms.items():
            module_id = atom.get("module_id")

            for downstream_id in atom["relationships"]["downstream"]:
                if downstream_id in self.atoms:
                    downstream_module = self.atoms[downstream_id].get("module_id")

                    if module_id != downstream_module:
                        cross_module_deps.append((atom_id, downstream_id))

        assert len(cross_module_deps) == 1
        assert ("atom-cust-verify", "atom-bo-review") in cross_module_deps

    def test_count_atoms_per_module(self):
        """Should count atoms in each module"""
        module_counts = {}

        for atom in self.atoms.values():
            module_id = atom.get("module_id")
            module_counts[module_id] = module_counts.get(module_id, 0) + 1

        assert module_counts["mod-customer-onboarding"] == 2
        assert module_counts["mod-back-office"] == 1


@pytest.mark.unit
class TestGraphEdgeCases:
    """Test edge cases in graph traversal"""

    def test_empty_graph_traversal(self):
        """Should handle empty graph gracefully"""
        atoms = {}

        # Should not crash
        roots = [
            atom_id for atom_id, atom in atoms.items()
            if len(atom["relationships"]["upstream"]) == 0
        ]

        assert len(roots) == 0

    def test_single_atom_graph(self):
        """Should handle graph with single isolated atom"""
        atoms = {
            "atom-solo": {
                "id": "atom-solo",
                "relationships": {"upstream": [], "downstream": []}
            }
        }

        # Should identify as both root and leaf
        roots = [
            atom_id for atom_id, atom in atoms.items()
            if len(atom["relationships"]["upstream"]) == 0
        ]
        leaves = [
            atom_id for atom_id, atom in atoms.items()
            if len(atom["relationships"]["downstream"]) == 0
        ]

        assert len(roots) == 1
        assert len(leaves) == 1
        assert roots[0] == "atom-solo"
        assert leaves[0] == "atom-solo"

    def test_self_referencing_atom(self):
        """Should handle atom referencing itself"""
        atoms = {
            "atom-self": {
                "id": "atom-self",
                "relationships": {
                    "upstream": [],
                    "downstream": ["atom-self"]  # Self-reference
                }
            }
        }

        # Should be detected as a cycle
        downstream = atoms["atom-self"]["relationships"]["downstream"]
        assert "atom-self" in downstream

    def test_missing_referenced_atom(self):
        """Should handle references to non-existent atoms"""
        atoms = {
            "atom-valid": {
                "id": "atom-valid",
                "relationships": {
                    "upstream": [],
                    "downstream": ["atom-missing"]  # References non-existent atom
                }
            }
        }

        downstream_id = atoms["atom-valid"]["relationships"]["downstream"][0]
        assert downstream_id not in atoms  # Broken reference

    def test_very_deep_graph(self):
        """Should handle deeply nested graph structures"""
        # Create a chain of 100 atoms
        atoms = {}
        for i in range(100):
            atom_id = f"atom-{i}"
            downstream = [f"atom-{i+1}"] if i < 99 else []
            upstream = [f"atom-{i-1}"] if i > 0 else []

            atoms[atom_id] = {
                "id": atom_id,
                "relationships": {
                    "upstream": upstream,
                    "downstream": downstream
                }
            }

        # Should have exactly 1 root and 1 leaf
        roots = [
            atom_id for atom_id, atom in atoms.items()
            if len(atom["relationships"]["upstream"]) == 0
        ]
        leaves = [
            atom_id for atom_id, atom in atoms.items()
            if len(atom["relationships"]["downstream"]) == 0
        ]

        assert len(roots) == 1
        assert roots[0] == "atom-0"
        assert len(leaves) == 1
        assert leaves[0] == "atom-99"
