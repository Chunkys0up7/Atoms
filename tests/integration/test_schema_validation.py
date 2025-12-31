"""
Schema validation tests for GNDP data structures.

Tests validation of:
- Atom schema (requirements, designs, procedures, validations, risks)
- Module schema and organization
- Graph schema (nodes, edges, relationships)
- Validation error handling
- Schema compliance and data integrity
- Edge cases in schema validation
"""

import json
from pathlib import Path
from typing import Any, Dict, List

import pytest
import yaml
from jsonschema import Draft7Validator, ValidationError, validate

# ==================== Schema Definitions ====================

ATOM_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["id", "type", "title", "description"],
    "properties": {
        "id": {"type": "string", "pattern": "^[A-Z]+-[0-9]+$", "description": "Unique atom identifier"},
        "atom_id": {"type": "string", "pattern": "^[A-Z]+-[0-9]+$", "description": "Alternative ID field"},
        "type": {
            "type": "string",
            "enum": ["requirement", "design", "procedure", "validation", "risk", "policy"],
            "description": "Type of atom",
        },
        "title": {"type": "string", "minLength": 1, "maxLength": 500, "description": "Short descriptive title"},
        "description": {"type": "string", "minLength": 1, "description": "Detailed description"},
        "status": {
            "type": "string",
            "enum": ["draft", "active", "deprecated", "archived"],
            "description": "Current status",
        },
        "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"], "description": "Priority level"},
        "created_date": {"type": "string", "format": "date", "description": "Creation date in YYYY-MM-DD format"},
        "last_modified": {"type": "string", "format": "date", "description": "Last modification date"},
        "metadata": {"type": "object", "description": "Additional metadata"},
        "content": {"type": "string", "description": "Full content for embedding"},
        "summary": {"type": "string", "description": "Summary for display"},
    },
    "additionalProperties": True,
}


MODULE_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["name", "description"],
    "properties": {
        "name": {"type": "string", "minLength": 1, "description": "Module name"},
        "description": {"type": "string", "minLength": 1, "description": "Module description"},
        "atoms": {"type": "array", "items": {"type": "string"}, "description": "List of atom IDs in module"},
        "submodules": {"type": "array", "items": {"type": "string"}, "description": "List of submodule names"},
        "metadata": {"type": "object", "description": "Module metadata"},
    },
    "additionalProperties": True,
}


GRAPH_NODE_SCHEMA = {
    "type": "object",
    "required": ["id", "type"],
    "properties": {
        "id": {"type": "string"},
        "type": {"type": "string"},
        "label": {"type": "string"},
        "metadata": {"type": "object"},
    },
}


GRAPH_EDGE_SCHEMA = {
    "type": "object",
    "required": ["source", "target", "type"],
    "properties": {
        "source": {"type": "string"},
        "target": {"type": "string"},
        "type": {
            "type": "string",
            "enum": [
                "requires",
                "depends_on",
                "implements",
                "validates",
                "affects",
                "contains",
                "related_to",
                "part_of",
            ],
        },
        "weight": {"type": "number"},
        "metadata": {"type": "object"},
    },
}


GRAPH_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["nodes", "edges"],
    "properties": {
        "nodes": {"type": "array", "items": GRAPH_NODE_SCHEMA},
        "edges": {"type": "array", "items": GRAPH_EDGE_SCHEMA},
        "metadata": {"type": "object"},
    },
}


# ==================== Atom Schema Tests ====================


class TestAtomSchema:
    """Tests for atom schema validation."""

    def test_valid_requirement_atom(self):
        """
        Test validation of valid requirement atom.

        Verifies that properly formed requirement passes validation.
        """
        atom = {
            "id": "REQ-001",
            "type": "requirement",
            "title": "User Authentication",
            "description": "System must support user authentication",
        }

        validate(instance=atom, schema=ATOM_SCHEMA)  # Should not raise

    def test_valid_design_atom(self):
        """
        Test validation of valid design atom.

        Verifies that properly formed design passes validation.
        """
        atom = {
            "id": "DESIGN-001",
            "type": "design",
            "title": "OAuth 2.0 Design",
            "description": "Design for OAuth 2.0 implementation",
        }

        validate(instance=atom, schema=ATOM_SCHEMA)

    def test_valid_atom_with_optional_fields(self):
        """
        Test validation of atom with optional fields.

        Verifies that additional optional fields are accepted.
        """
        atom = {
            "id": "PROC-001",
            "type": "procedure",
            "title": "Token Generation",
            "description": "Procedure for generating tokens",
            "status": "active",
            "priority": "high",
            "created_date": "2025-01-15",
            "last_modified": "2025-01-20",
            "metadata": {"module": "auth", "owner": "dev-team"},
        }

        validate(instance=atom, schema=ATOM_SCHEMA)

    def test_missing_required_id_raises_error(self):
        """
        Test that missing ID raises validation error.

        Verifies required field validation.
        """
        atom = {"type": "requirement", "title": "Test", "description": "Test description"}

        with pytest.raises(ValidationError):
            validate(instance=atom, schema=ATOM_SCHEMA)

    def test_missing_required_type_raises_error(self):
        """
        Test that missing type raises validation error.

        Verifies type field is required.
        """
        atom = {"id": "REQ-001", "title": "Test", "description": "Test description"}

        with pytest.raises(ValidationError):
            validate(instance=atom, schema=ATOM_SCHEMA)

    def test_missing_required_title_raises_error(self):
        """
        Test that missing title raises validation error.

        Verifies title field is required.
        """
        atom = {"id": "REQ-001", "type": "requirement", "description": "Test description"}

        with pytest.raises(ValidationError):
            validate(instance=atom, schema=ATOM_SCHEMA)

    def test_missing_required_description_raises_error(self):
        """
        Test that missing description raises validation error.

        Verifies description field is required.
        """
        atom = {"id": "REQ-001", "type": "requirement", "title": "Test"}

        with pytest.raises(ValidationError):
            validate(instance=atom, schema=ATOM_SCHEMA)

    def test_invalid_atom_id_format_raises_error(self):
        """
        Test that invalid ID format raises error.

        Verifies ID pattern validation.
        """
        atom = {
            "id": "INVALID-ID",  # Missing hyphen number format
            "type": "requirement",
            "title": "Test",
            "description": "Test",
        }

        with pytest.raises(ValidationError):
            validate(instance=atom, schema=ATOM_SCHEMA)

    def test_invalid_atom_type_raises_error(self):
        """
        Test that invalid type raises error.

        Verifies type enum validation.
        """
        atom = {"id": "REQ-001", "type": "invalid_type", "title": "Test", "description": "Test"}

        with pytest.raises(ValidationError):
            validate(instance=atom, schema=ATOM_SCHEMA)

    def test_empty_title_raises_error(self):
        """
        Test that empty title raises error.

        Verifies minLength validation on title.
        """
        atom = {"id": "REQ-001", "type": "requirement", "title": "", "description": "Test"}

        with pytest.raises(ValidationError):
            validate(instance=atom, schema=ATOM_SCHEMA)

    def test_invalid_status_enum_raises_error(self):
        """
        Test that invalid status raises error.

        Verifies status enum validation.
        """
        atom = {
            "id": "REQ-001",
            "type": "requirement",
            "title": "Test",
            "description": "Test",
            "status": "invalid_status",
        }

        with pytest.raises(ValidationError):
            validate(instance=atom, schema=ATOM_SCHEMA)

    def test_invalid_priority_enum_raises_error(self):
        """
        Test that invalid priority raises error.

        Verifies priority enum validation.
        """
        atom = {
            "id": "REQ-001",
            "type": "requirement",
            "title": "Test",
            "description": "Test",
            "priority": "urgent",  # Not in enum
        }

        with pytest.raises(ValidationError):
            validate(instance=atom, schema=ATOM_SCHEMA)

    def test_valid_atom_id_alternative_field(self):
        """
        Test validation with atom_id alternative field.

        Verifies alternate ID field format.
        """
        atom = {"id": "REQ-001", "atom_id": "REQ-001", "type": "requirement", "title": "Test", "description": "Test"}

        validate(instance=atom, schema=ATOM_SCHEMA)

    @pytest.mark.parametrize("atom_type", ["requirement", "design", "procedure", "validation", "risk", "policy"])
    def test_all_valid_atom_types(self, atom_type):
        """
        Test all valid atom types.

        Parametrized test for each atom type enum value.
        """
        atom = {"id": "TEST-001", "type": atom_type, "title": "Test", "description": "Test"}

        validate(instance=atom, schema=ATOM_SCHEMA)

    @pytest.mark.parametrize("priority", ["low", "medium", "high", "critical"])
    def test_all_valid_priorities(self, priority):
        """
        Test all valid priority values.

        Parametrized test for each priority enum value.
        """
        atom = {"id": "TEST-001", "type": "requirement", "title": "Test", "description": "Test", "priority": priority}

        validate(instance=atom, schema=ATOM_SCHEMA)


# ==================== Module Schema Tests ====================


class TestModuleSchema:
    """Tests for module schema validation."""

    def test_valid_module(self):
        """
        Test validation of valid module.

        Verifies properly formed module passes validation.
        """
        module = {"name": "Authentication", "description": "Authentication module"}

        validate(instance=module, schema=MODULE_SCHEMA)

    def test_valid_module_with_atoms(self):
        """
        Test validation of module with atoms.

        Verifies module with atom references passes validation.
        """
        module = {
            "name": "Authentication",
            "description": "Authentication module",
            "atoms": ["REQ-001", "DESIGN-001", "PROC-001"],
        }

        validate(instance=module, schema=MODULE_SCHEMA)

    def test_valid_module_with_submodules(self):
        """
        Test validation of module with submodules.

        Verifies module hierarchy is supported.
        """
        module = {"name": "Core", "description": "Core module", "submodules": ["auth", "database", "api"]}

        validate(instance=module, schema=MODULE_SCHEMA)

    def test_missing_required_name_raises_error(self):
        """
        Test that missing name raises error.

        Verifies name field is required.
        """
        module = {"description": "Test module"}

        with pytest.raises(ValidationError):
            validate(instance=module, schema=MODULE_SCHEMA)

    def test_missing_required_description_raises_error(self):
        """
        Test that missing description raises error.

        Verifies description field is required.
        """
        module = {"name": "Test Module"}

        with pytest.raises(ValidationError):
            validate(instance=module, schema=MODULE_SCHEMA)

    def test_empty_name_raises_error(self):
        """
        Test that empty name raises error.

        Verifies minLength validation.
        """
        module = {"name": "", "description": "Test"}

        with pytest.raises(ValidationError):
            validate(instance=module, schema=MODULE_SCHEMA)


# ==================== Graph Schema Tests ====================


class TestGraphSchema:
    """Tests for graph schema validation."""

    def test_valid_graph(self):
        """
        Test validation of valid graph.

        Verifies properly formed graph passes validation.
        """
        graph = {
            "nodes": [{"id": "REQ-001", "type": "requirement"}, {"id": "DESIGN-001", "type": "design"}],
            "edges": [{"source": "REQ-001", "target": "DESIGN-001", "type": "implements"}],
        }

        validate(instance=graph, schema=GRAPH_SCHEMA)

    def test_valid_graph_with_metadata(self):
        """
        Test validation of graph with metadata.

        Verifies metadata is properly handled.
        """
        graph = {
            "nodes": [{"id": "REQ-001", "type": "requirement", "label": "Requirement 1"}],
            "edges": [{"source": "REQ-001", "target": "DESIGN-001", "type": "implements"}],
            "metadata": {"created": "2025-01-01", "version": "1.0"},
        }

        validate(instance=graph, schema=GRAPH_SCHEMA)

    def test_missing_required_nodes_raises_error(self):
        """
        Test that missing nodes raises error.

        Verifies nodes field is required.
        """
        graph = {"edges": []}

        with pytest.raises(ValidationError):
            validate(instance=graph, schema=GRAPH_SCHEMA)

    def test_missing_required_edges_raises_error(self):
        """
        Test that missing edges raises error.

        Verifies edges field is required.
        """
        graph = {"nodes": []}

        with pytest.raises(ValidationError):
            validate(instance=graph, schema=GRAPH_SCHEMA)

    def test_node_missing_required_id_raises_error(self):
        """
        Test that node without ID raises error.

        Verifies node ID requirement.
        """
        graph = {"nodes": [{"type": "requirement"}], "edges": []}  # Missing id

        with pytest.raises(ValidationError):
            validate(instance=graph, schema=GRAPH_SCHEMA)

    def test_node_missing_required_type_raises_error(self):
        """
        Test that node without type raises error.

        Verifies node type requirement.
        """
        graph = {"nodes": [{"id": "REQ-001"}], "edges": []}  # Missing type

        with pytest.raises(ValidationError):
            validate(instance=graph, schema=GRAPH_SCHEMA)

    def test_edge_missing_required_source_raises_error(self):
        """
        Test that edge without source raises error.

        Verifies edge source requirement.
        """
        graph = {"nodes": [], "edges": [{"target": "DESIGN-001", "type": "implements"}]}

        with pytest.raises(ValidationError):
            validate(instance=graph, schema=GRAPH_SCHEMA)

    def test_edge_missing_required_target_raises_error(self):
        """
        Test that edge without target raises error.

        Verifies edge target requirement.
        """
        graph = {"nodes": [], "edges": [{"source": "REQ-001", "type": "implements"}]}

        with pytest.raises(ValidationError):
            validate(instance=graph, schema=GRAPH_SCHEMA)

    def test_edge_missing_required_type_raises_error(self):
        """
        Test that edge without type raises error.

        Verifies edge type requirement.
        """
        graph = {"nodes": [], "edges": [{"source": "REQ-001", "target": "DESIGN-001"}]}

        with pytest.raises(ValidationError):
            validate(instance=graph, schema=GRAPH_SCHEMA)

    def test_invalid_edge_type_raises_error(self):
        """
        Test that invalid edge type raises error.

        Verifies edge type enum validation.
        """
        graph = {"nodes": [], "edges": [{"source": "REQ-001", "target": "DESIGN-001", "type": "invalid"}]}

        with pytest.raises(ValidationError):
            validate(instance=graph, schema=GRAPH_SCHEMA)

    @pytest.mark.parametrize(
        "edge_type",
        ["requires", "depends_on", "implements", "validates", "affects", "contains", "related_to", "part_of"],
    )
    def test_all_valid_edge_types(self, edge_type):
        """
        Test all valid edge types.

        Parametrized test for each relationship type.
        """
        graph = {"nodes": [], "edges": [{"source": "A", "target": "B", "type": edge_type}]}

        validate(instance=graph, schema=GRAPH_SCHEMA)


# ==================== Integration Schema Tests ====================


class TestSchemaIntegration:
    """Integration tests for schema validation."""

    def test_complete_document_validation(self):
        """
        Test validation of complete document with all schemas.

        Verifies complex document passes all validations.
        """
        # Create atoms
        atoms = [
            {
                "id": "REQ-001",
                "type": "requirement",
                "title": "User Authentication",
                "description": "System must support authentication",
            },
            {
                "id": "DESIGN-001",
                "type": "design",
                "title": "OAuth Design",
                "description": "OAuth implementation design",
            },
        ]

        # Validate each atom
        for atom in atoms:
            validate(instance=atom, schema=ATOM_SCHEMA)

        # Create module
        module = {"name": "Authentication", "description": "Authentication module", "atoms": ["REQ-001", "DESIGN-001"]}

        validate(instance=module, schema=MODULE_SCHEMA)

        # Create graph
        graph = {
            "nodes": [{"id": a["id"], "type": a["type"]} for a in atoms],
            "edges": [{"source": "REQ-001", "target": "DESIGN-001", "type": "implements"}],
        }

        validate(instance=graph, schema=GRAPH_SCHEMA)

    def test_graph_node_consistency_with_atoms(self):
        """
        Test that graph nodes are consistent with atoms.

        Verifies nodes reference valid atom IDs and types.
        """
        atoms = [{"id": "REQ-001", "type": "requirement"}, {"id": "DESIGN-001", "type": "design"}]

        graph_nodes = [{"id": atom["id"], "type": atom["type"]} for atom in atoms]

        graph = {"nodes": graph_nodes, "edges": []}

        validate(instance=graph, schema=GRAPH_SCHEMA)

        # Verify consistency
        atom_ids = {a["id"] for a in atoms}
        node_ids = {n["id"] for n in graph_nodes}
        assert atom_ids == node_ids

    def test_graph_edge_references_valid_nodes(self):
        """
        Test that graph edges reference valid nodes.

        Verifies referential integrity.
        """
        node_ids = {"REQ-001", "DESIGN-001", "PROC-001"}

        edges = [
            {"source": "REQ-001", "target": "DESIGN-001", "type": "implements"},
            {"source": "DESIGN-001", "target": "PROC-001", "type": "implements"},
        ]

        graph = {"nodes": [{"id": nid, "type": "test"} for nid in node_ids], "edges": edges}

        validate(instance=graph, schema=GRAPH_SCHEMA)

        # Verify all edge nodes exist
        for edge in edges:
            assert edge["source"] in node_ids
            assert edge["target"] in node_ids


# ==================== Edge Case Tests ====================


class TestSchemaEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_very_long_title(self):
        """
        Test atom with very long title.

        Verifies maxLength validation is enforced.
        """
        atom = {
            "id": "REQ-001",
            "type": "requirement",
            "title": "x" * 501,  # Exceeds maxLength of 500
            "description": "Test",
        }

        with pytest.raises(ValidationError):
            validate(instance=atom, schema=ATOM_SCHEMA)

    def test_atom_with_special_characters(self):
        """
        Test atom with special characters in fields.

        Verifies special characters are handled.
        """
        atom = {
            "id": "REQ-001",
            "type": "requirement",
            "title": "User's Authentication & Authorization",
            "description": "Test with <special> & \"quotes\" and 'apostrophes'",
        }

        validate(instance=atom, schema=ATOM_SCHEMA)

    def test_atom_with_unicode_characters(self):
        """
        Test atom with unicode characters.

        Verifies unicode handling.
        """
        atom = {
            "id": "REQ-001",
            "type": "requirement",
            "title": "Autenticación de Usuarios",
            "description": "認証システム - Authentication System",
        }

        validate(instance=atom, schema=ATOM_SCHEMA)

    def test_graph_with_many_nodes(self):
        """
        Test graph with large number of nodes.

        Verifies scalability of schema.
        """
        nodes = [{"id": f"NODE-{i:04d}", "type": "test"} for i in range(1000)]
        edges = []

        graph = {"nodes": nodes, "edges": edges}

        validate(instance=graph, schema=GRAPH_SCHEMA)

    def test_graph_with_many_edges(self):
        """
        Test graph with large number of edges.

        Verifies edge handling at scale.
        """
        nodes = [{"id": "A", "type": "test"}]
        edges = [{"source": "A", "target": "A", "type": "requires"} for _ in range(100)]

        graph = {"nodes": nodes, "edges": edges}

        validate(instance=graph, schema=GRAPH_SCHEMA)

    def test_deeply_nested_metadata(self):
        """
        Test atom with deeply nested metadata.

        Verifies metadata object handling.
        """
        atom = {
            "id": "REQ-001",
            "type": "requirement",
            "title": "Test",
            "description": "Test",
            "metadata": {"level1": {"level2": {"level3": {"level4": {"value": "deeply nested"}}}}},
        }

        validate(instance=atom, schema=ATOM_SCHEMA)
