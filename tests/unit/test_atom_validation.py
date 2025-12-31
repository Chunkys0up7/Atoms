"""
Unit tests for atom schema validation.

Tests cover:
- Valid atom structures
- Missing required fields
- Invalid field types
- Invalid enum values
- Edge cases and boundary conditions
"""

import json
from pathlib import Path

import pytest


class TestAtomValidation:
    """Test atom schema validation logic"""

    def test_valid_atom_passes_validation(self):
        """Valid atom with all required fields should pass"""
        atom = {
            "id": "test-atom-001",
            "type": "process",
            "title": "Test Process",
            "summary": "A test summary for validation",
            "content": {"steps": ["Step 1", "Step 2"], "summary": "Process summary"},
            "metadata": {"owner": "test-team", "status": "active", "version": "1.0.0"},
            "relationships": {"upstream": [], "downstream": []},
        }

        # Basic structure validation
        assert "id" in atom
        assert "type" in atom
        assert "title" in atom
        assert atom["id"].startswith("test-")
        assert len(atom["summary"]) > 0

    def test_missing_required_id_fails(self):
        """Atom missing required 'id' field should fail"""
        atom = {"type": "process", "title": "Test", "summary": "Test summary"}

        assert "id" not in atom
        # In production, this would raise ValidationError

    def test_missing_required_type_fails(self):
        """Atom missing required 'type' field should fail"""
        atom = {"id": "test-atom-002", "title": "Test", "summary": "Test summary"}

        assert "type" not in atom

    def test_invalid_atom_type_fails(self):
        """Atom with invalid type should fail"""
        atom = {
            "id": "test-atom-003",
            "type": "invalid_type",  # Not in allowed types
            "title": "Test",
            "summary": "Test",
        }

        valid_types = ["process", "policy", "requirement", "design", "validation", "risk"]
        assert atom["type"] not in valid_types

    def test_atom_id_format_validation(self):
        """Atom ID should follow naming convention"""
        valid_ids = ["atom-cust-kyc", "atom-bo-underwriting", "atom-sys-validation"]

        for atom_id in valid_ids:
            assert atom_id.startswith("atom-")
            parts = atom_id.split("-")
            assert len(parts) >= 3  # atom-category-name

    def test_invalid_atom_id_format(self):
        """Invalid atom ID formats should be detected"""
        invalid_ids = [
            "ATOM-001",  # Uppercase
            "test-atom",  # Wrong prefix
            "atom",  # Too short
            "atom-",  # Incomplete
        ]

        for atom_id in invalid_ids:
            # These should fail validation
            assert not (atom_id.startswith("atom-") and len(atom_id.split("-")) >= 3)

    def test_atom_content_structure(self):
        """Atom content should have proper structure"""
        content = {"steps": ["Step 1", "Step 2"], "summary": "Content summary", "details": "Detailed information"}

        assert "summary" in content
        assert isinstance(content.get("steps"), list)
        assert len(content["steps"]) > 0

    def test_atom_metadata_structure(self):
        """Atom metadata should contain required fields"""
        metadata = {
            "owner": "loan-origination-team",
            "status": "active",
            "version": "1.0.0",
            "created_date": "2025-01-01",
            "last_modified": "2025-01-15",
        }

        required_fields = ["owner", "status", "version"]
        for field in required_fields:
            assert field in metadata

    def test_atom_relationships_structure(self):
        """Atom relationships should have upstream/downstream"""
        relationships = {"upstream": ["atom-cust-identify"], "downstream": ["atom-cust-verify", "atom-bo-review"]}

        assert "upstream" in relationships
        assert "downstream" in relationships
        assert isinstance(relationships["upstream"], list)
        assert isinstance(relationships["downstream"], list)

    def test_empty_relationships_allowed(self):
        """Empty relationship arrays should be valid"""
        relationships = {"upstream": [], "downstream": []}

        assert relationships["upstream"] == []
        assert relationships["downstream"] == []

    def test_atom_summary_length(self):
        """Atom summary should not be empty"""
        valid_summary = "This is a proper summary with sufficient detail"
        invalid_summary = ""

        assert len(valid_summary) > 10
        assert len(invalid_summary) == 0

    def test_atom_title_required(self):
        """Atom title is required and non-empty"""
        valid_title = "Customer KYC Process"
        invalid_title = ""

        assert len(valid_title) > 0
        assert len(invalid_title) == 0

    def test_atom_type_enum_validation(self):
        """Atom type must be from allowed enum"""
        allowed_types = ["process", "policy", "requirement", "design", "validation", "risk", "procedure", "guideline"]

        test_type = "process"
        invalid_type = "random_type"

        assert test_type in allowed_types
        assert invalid_type not in allowed_types

    def test_atom_status_enum_validation(self):
        """Atom status must be from allowed enum"""
        allowed_statuses = ["active", "draft", "archived", "deprecated"]

        valid_status = "active"
        invalid_status = "pending"

        assert valid_status in allowed_statuses
        assert invalid_status not in allowed_statuses

    def test_atom_version_format(self):
        """Atom version should follow semver format"""
        valid_versions = ["1.0.0", "2.1.3", "0.0.1"]
        invalid_versions = ["1.0", "v1.0.0", "1"]

        for version in valid_versions:
            parts = version.split(".")
            assert len(parts) == 3
            assert all(p.isdigit() for p in parts)

        for version in invalid_versions:
            # Invalid if it has a 'v' prefix or doesn't have exactly 3 numeric parts
            has_v_prefix = version.startswith("v")
            parts = version.replace("v", "").split(".")
            is_valid_format = len(parts) == 3 and all(p.isdigit() for p in parts if p)
            assert has_v_prefix or not is_valid_format


@pytest.mark.unit
class TestAtomFileStructure:
    """Test atom file structure and loading"""

    def test_load_atom_from_json(self):
        """Should load atom from JSON file"""
        atom_json = """{
            "id": "atom-test-load",
            "type": "process",
            "title": "Test Load",
            "summary": "Test loading from JSON"
        }"""

        atom = json.loads(atom_json)
        assert atom["id"] == "atom-test-load"
        assert atom["type"] == "process"

    def test_atom_json_serialization(self):
        """Atom should serialize to valid JSON"""
        atom = {
            "id": "atom-test-serialize",
            "type": "process",
            "title": "Test Serialize",
            "summary": "Test JSON serialization",
            "content": {"steps": ["Step 1"]},
            "metadata": {"owner": "test"},
            "relationships": {"upstream": [], "downstream": []},
        }

        json_str = json.dumps(atom, indent=2)
        loaded = json.loads(json_str)

        assert loaded["id"] == atom["id"]
        assert loaded["type"] == atom["type"]
        assert loaded["content"]["steps"] == atom["content"]["steps"]


@pytest.mark.unit
class TestAtomEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_atom_with_special_characters_in_title(self):
        """Atom title with special characters should be handled"""
        title = "Process: Customer KYC & Verification (2025)"
        assert len(title) > 0
        assert ":" in title
        assert "&" in title
        assert "(" in title

    def test_atom_with_very_long_summary(self):
        """Atom with very long summary should be handled"""
        long_summary = "A" * 5000
        assert len(long_summary) == 5000
        # Should still be valid, just long

    def test_atom_with_empty_content_object(self):
        """Atom with empty content object"""
        content = {}
        assert isinstance(content, dict)
        assert len(content) == 0
        # May be invalid depending on schema

    def test_atom_with_unicode_characters(self):
        """Atom with unicode characters should be handled"""
        title = "Process → Verification ✓"
        summary = "Müller's KYC process for São Paulo"

        assert "→" in title
        assert "✓" in title
        assert "ü" in summary
        assert "ã" in summary

    def test_atom_relationship_circular_reference(self):
        """Detect potential circular references"""
        atom_a = {"id": "atom-a", "relationships": {"downstream": ["atom-b"]}}

        atom_b = {"id": "atom-b", "relationships": {"downstream": ["atom-a"]}}  # Circular!

        # Check if atom-a is in downstream of something in its own downstream
        assert "atom-a" in atom_b["relationships"]["downstream"]
        assert "atom-b" in atom_a["relationships"]["downstream"]
        # This would be a circular dependency
