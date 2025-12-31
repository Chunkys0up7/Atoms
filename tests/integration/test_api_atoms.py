"""
Integration tests for Atom API endpoints.

Tests the complete atom lifecycle: create, read, list, with caching validation.
"""

import shutil
import sys
import tempfile
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient

# Add API to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from api.cache import get_atom_cache
from api.server import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def temp_atoms_dir(monkeypatch):
    """Create temporary atoms directory for testing."""
    temp_dir = tempfile.mkdtemp()
    atoms_dir = Path(temp_dir) / "atoms"
    atoms_dir.mkdir()

    # Monkeypatch the atoms directory in atoms.py
    monkeypatch.setattr(
        "routes.atoms.Path.__truediv__", lambda self, other: atoms_dir if other == "atoms" else self / other
    )

    yield atoms_dir

    # Cleanup
    shutil.rmtree(temp_dir, ignore_errors=True)

    # Clear cache
    cache = get_atom_cache()
    cache.clear()


@pytest.fixture
def sample_atom():
    """Sample atom data for testing."""
    return {
        "id": "TEST-ATOM-001",
        "category": "CUSTOMER_FACING",
        "type": "PROCESS",
        "name": "Test Process",
        "version": "1.0.0",
        "status": "ACTIVE",
        "owner": "Test Team",
        "team": "Engineering",
        "ontologyDomain": "Testing",
        "criticality": "MEDIUM",
        "content": {"summary": "Test atom for integration testing"},
        "edges": [],
        "metrics": {"automation_level": 0.8, "avg_cycle_time_mins": 5, "error_rate": 0.01, "compliance_score": 0.95},
    }


class TestAtomList:
    """Tests for GET /api/atoms endpoint."""

    def test_list_atoms_empty(self, client, temp_atoms_dir):
        """Should return empty list when no atoms exist."""
        response = client.get("/api/atoms")
        assert response.status_code == 200
        data = response.json()
        assert data["atoms"] == []
        assert data["total"] == 0

    def test_list_atoms_with_data(self, client, temp_atoms_dir, sample_atom):
        """Should return atoms when they exist."""
        # Create test atom file
        atom_file = temp_atoms_dir / f"{sample_atom['id']}.yaml"
        with open(atom_file, "w") as f:
            yaml.dump(sample_atom, f)

        response = client.get("/api/atoms")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["atoms"]) == 1
        assert data["atoms"][0]["id"] == sample_atom["id"]

    def test_list_atoms_pagination(self, client, temp_atoms_dir):
        """Should respect limit and offset parameters."""
        # Create 5 test atoms
        for i in range(5):
            atom = {"id": f"TEST-{i:03d}", "type": "PROCESS", "name": f"Test {i}"}
            with open(temp_atoms_dir / f"{atom['id']}.yaml", "w") as f:
                yaml.dump(atom, f)

        # Test pagination
        response = client.get("/api/atoms?limit=2&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert len(data["atoms"]) == 2
        assert data["total"] == 5
        assert data["has_more"] is True

        response = client.get("/api/atoms?limit=2&offset=4")
        data = response.json()
        assert len(data["atoms"]) == 1
        assert data["has_more"] is False

    def test_list_atoms_type_filter(self, client, temp_atoms_dir):
        """Should filter atoms by type."""
        # Create atoms of different types
        types = ["PROCESS", "DECISION", "PROCESS"]
        for i, atom_type in enumerate(types):
            atom = {"id": f"TEST-{i:03d}", "type": atom_type, "name": f"Test {i}"}
            with open(temp_atoms_dir / f"{atom['id']}.yaml", "w") as f:
                yaml.dump(atom, f)

        response = client.get("/api/atoms?type_filter=PROCESS")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert all(a["type"] == "PROCESS" for a in data["atoms"])

    def test_list_atoms_summary_only(self, client, temp_atoms_dir, sample_atom):
        """Should return minimal data when summary_only=true."""
        atom_file = temp_atoms_dir / f"{sample_atom['id']}.yaml"
        with open(atom_file, "w") as f:
            yaml.dump(sample_atom, f)

        response = client.get("/api/atoms?summary_only=true")
        assert response.status_code == 200
        data = response.json()
        atom = data["atoms"][0]

        # Should have minimal fields
        assert "id" in atom
        assert "type" in atom
        assert "summary" in atom
        # Should not have full content
        assert "content" not in atom or isinstance(atom.get("content"), str)

    def test_list_atoms_caching(self, client, temp_atoms_dir, sample_atom):
        """Should use cache for repeated requests."""
        atom_file = temp_atoms_dir / f"{sample_atom['id']}.yaml"
        with open(atom_file, "w") as f:
            yaml.dump(sample_atom, f)

        # First request - loads from disk
        response1 = client.get("/api/atoms")
        assert response1.status_code == 200

        # Modify file on disk
        sample_atom["name"] = "Modified Name"
        with open(atom_file, "w") as f:
            yaml.dump(sample_atom, f)

        # Second request - should return cached data (original name)
        response2 = client.get("/api/atoms")
        assert response2.status_code == 200
        data = response2.json()
        assert data["atoms"][0]["name"] == "Test Process"  # Original, not "Modified Name"


class TestAtomGet:
    """Tests for GET /api/atoms/{atom_id} endpoint."""

    def test_get_atom_success(self, client, temp_atoms_dir, sample_atom):
        """Should return atom when it exists."""
        atom_file = temp_atoms_dir / f"{sample_atom['id']}.yaml"
        with open(atom_file, "w") as f:
            yaml.dump(sample_atom, f)

        response = client.get(f"/api/atoms/{sample_atom['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_atom["id"]
        assert data["name"] == sample_atom["name"]

    def test_get_atom_not_found(self, client, temp_atoms_dir):
        """Should return 404 when atom doesn't exist."""
        response = client.get("/api/atoms/NONEXISTENT")
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()

    def test_get_atom_uses_cache(self, client, temp_atoms_dir, sample_atom):
        """Should use cached data for single atom lookup."""
        atom_file = temp_atoms_dir / f"{sample_atom['id']}.yaml"
        with open(atom_file, "w") as f:
            yaml.dump(sample_atom, f)

        # Load into cache via list
        client.get("/api/atoms")

        # Get specific atom - should use cache
        response = client.get(f"/api/atoms/{sample_atom['id']}")
        assert response.status_code == 200


class TestAtomCreate:
    """Tests for POST /api/atoms endpoint."""

    def test_create_atom_success(self, client, temp_atoms_dir, sample_atom):
        """Should create atom and return data."""
        response = client.post("/api/atoms", json=sample_atom)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_atom["id"]

        # Verify file was created
        atom_file = temp_atoms_dir / sample_atom["category"].lower() / f"{sample_atom['id']}.yaml"
        assert atom_file.exists()

    def test_create_atom_invalidates_cache(self, client, temp_atoms_dir, sample_atom):
        """Should invalidate cache after creation."""
        # Load initial (empty) data into cache
        response1 = client.get("/api/atoms")
        assert response1.json()["total"] == 0

        # Create atom
        client.post("/api/atoms", json=sample_atom)

        # Cache should be invalidated, new request should see the atom
        response2 = client.get("/api/atoms")
        assert response2.json()["total"] == 1

    def test_create_atom_atomic_write(self, client, temp_atoms_dir, sample_atom, monkeypatch):
        """Should use atomic write pattern."""
        import tempfile

        original_mkstemp = tempfile.mkstemp
        temp_files_created = []

        def track_mkstemp(*args, **kwargs):
            fd, path = original_mkstemp(*args, **kwargs)
            temp_files_created.append(path)
            return fd, path

        monkeypatch.setattr("tempfile.mkstemp", track_mkstemp)

        response = client.post("/api/atoms", json=sample_atom)
        assert response.status_code == 200

        # Should have created temp file (atomic write pattern)
        assert len(temp_files_created) > 0

    def test_create_atom_validation_error(self, client):
        """Should return 422 for invalid data."""
        invalid_atom = {
            "id": "TEST",
            # Missing required fields
        }

        response = client.post("/api/atoms", json=invalid_atom)
        assert response.status_code == 422  # Validation error


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
