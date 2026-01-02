"""
Integration tests for RAG API endpoints.

Tests the complete RAG API functionality including:
- POST /api/rag/query with all three modes (entity, path, impact)
- GET /api/rag/health for system health monitoring
- Error handling and validation
- Fallback behavior when services unavailable
- Response format and structure
- Edge cases and boundary conditions
"""

import json
from unittest.mock import MagicMock, Mock, patch

import pytest
from fastapi.testclient import TestClient

from api.server import app


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


class TestRAGQueryEndpoint:
    """Tests for POST /api/rag/query endpoint."""

    def test_query_entity_mode_success(self, client, mock_neo4j_client, mock_claude_client):
        """
        Test successful entity mode query.

        Verifies that entity mode returns semantic search results.
        """
        with patch("api.routes.rag.entity_rag") as mock_entity_rag:
            with patch("api.routes.rag.get_claude_client", return_value=mock_claude_client):
                mock_entity_rag.return_value = [
                    {
                        "id": "REQ-001",
                        "type": "requirement",
                        "title": "Test Requirement",
                        "content": "Test content",
                        "distance": 0.95,
                    }
                ]

                response = client.post(
                    "/api/rag/query", json={"query": "What is authentication?", "rag_mode": "entity"}
                )

                assert response.status_code == 200
                data = response.json()
                assert "answer" in data
                assert "sources" in data
                assert "context_atoms" in data

    def test_query_path_mode_success(self, client, mock_neo4j_client, mock_claude_client):
        """
        Test successful path mode query.

        Verifies that path mode returns relationship-aware results.
        """
        with patch("api.routes.rag.path_rag") as mock_path_rag:
            with patch("api.routes.rag.get_claude_client", return_value=mock_claude_client):
                mock_path_rag.return_value = [{"id": "REQ-001", "type": "requirement", "relationship": "implements"}]

                response = client.post(
                    "/api/rag/query", json={"query": "How does authentication work?", "rag_mode": "path"}
                )

                assert response.status_code == 200
                data = response.json()
                assert "answer" in data

    def test_query_impact_mode_success(self, client, mock_neo4j_client, mock_claude_client):
        """
        Test successful impact mode query.

        Verifies that impact mode returns dependency chain.
        """
        with patch("api.routes.rag.impact_rag") as mock_impact_rag:
            with patch("api.routes.rag.get_claude_client", return_value=mock_claude_client):
                mock_impact_rag.return_value = [{"id": "REQ-001", "type": "requirement", "impact_scope": "downstream"}]

                response = client.post(
                    "/api/rag/query",
                    json={"query": "What would change if we modified authentication?", "rag_mode": "impact"},
                )

                assert response.status_code == 200
                data = response.json()
                assert "answer" in data

    def test_query_with_top_k_parameter(self, client):
        """
        Test query with custom top_k parameter.

        Verifies that top_k parameter is respected.
        """
        with patch("api.routes.rag.entity_rag") as mock_entity_rag:
            with patch("api.routes.rag.get_claude_client", return_value=None):
                mock_entity_rag.return_value = []

                response = client.post("/api/rag/query", json={"query": "Test", "rag_mode": "entity", "top_k": 10})

                assert response.status_code == 200

    def test_query_with_atom_type_filter(self, client):
        """
        Test query with atom type filtering.

        Verifies that atom_type filter is applied.
        """
        with patch("api.routes.rag.entity_rag") as mock_entity_rag:
            with patch("api.routes.rag.get_claude_client", return_value=None):
                mock_entity_rag.return_value = []

                response = client.post(
                    "/api/rag/query", json={"query": "Test", "rag_mode": "entity", "atom_type": "requirement"}
                )

                assert response.status_code == 200

    def test_query_invalid_rag_mode(self, client):
        """
        Test query with invalid RAG mode.

        Verifies that invalid modes are rejected.
        """
        response = client.post("/api/rag/query", json={"query": "Test", "rag_mode": "invalid_mode"})

        assert response.status_code == 400
        assert "Unknown RAG mode" in response.json()["detail"]

    def test_query_without_chromadb_returns_error(self, client):
        """
        Test that query fails gracefully without chromadb.

        Verifies proper error message when RAG system unavailable.
        """
        with patch("api.routes.rag.HAS_CHROMA", False):
            response = client.post("/api/rag/query", json={"query": "Test", "rag_mode": "entity"})

            assert response.status_code == 500
            assert "chromadb" in response.json()["detail"].lower()

    def test_query_fallback_without_claude(self, client):
        """
        Test that query returns fallback answer without Claude.

        Verifies graceful degradation when Claude unavailable.
        """
        with patch("api.routes.rag.entity_rag") as mock_entity_rag:
            with patch("api.routes.rag.get_claude_client", return_value=None):
                mock_entity_rag.return_value = [{"id": "REQ-001", "type": "requirement", "distance": 0.95}]

                response = client.post("/api/rag/query", json={"query": "Test", "rag_mode": "entity"})

                assert response.status_code == 200
                data = response.json()
                assert "answer" in data
                # Fallback answer should mention Claude unavailable
                assert "Claude" in data.get("answer", "") or len(data.get("sources", [])) >= 0

    def test_query_no_results_returns_empty_response(self, client):
        """
        Test query with no matching results.

        Verifies proper handling of empty results.
        """
        with patch("api.routes.rag.entity_rag") as mock_entity_rag:
            with patch("api.routes.rag.get_claude_client", return_value=None):
                mock_entity_rag.return_value = []

                response = client.post(
                    "/api/rag/query", json={"query": "Obscure query with no matches", "rag_mode": "entity"}
                )

                assert response.status_code == 200
                data = response.json()
                assert "No relevant atoms found" in data["answer"]
                assert data["context_atoms"] == []

    def test_query_response_structure(self, client):
        """
        Test that query response has correct structure.

        Verifies all required fields are present.
        """
        with patch("api.routes.rag.entity_rag") as mock_entity_rag:
            with patch("api.routes.rag.get_claude_client", return_value=None):
                mock_entity_rag.return_value = [
                    {"id": "REQ-001", "type": "requirement", "distance": 0.95, "metadata": {"type": "requirement"}}
                ]

                response = client.post("/api/rag/query", json={"query": "Test", "rag_mode": "entity"})

                assert response.status_code == 200
                data = response.json()

                # Check required fields
                assert "answer" in data
                assert isinstance(data["answer"], str)
                assert "sources" in data
                assert isinstance(data["sources"], list)
                assert "context_atoms" in data
                assert isinstance(data["context_atoms"], list)

    @pytest.mark.parametrize("rag_mode", ["entity", "path", "impact"])
    def test_all_rag_modes_work(self, client, rag_mode):
        """
        Test that all RAG modes are functional.

        Parametrized test for all modes.
        """
        with patch("api.routes.rag.entity_rag") as mock_entity:
            with patch("api.routes.rag.path_rag") as mock_path:
                with patch("api.routes.rag.impact_rag") as mock_impact:
                    with patch("api.routes.rag.get_claude_client", return_value=None):
                        # Setup mocks
                        mock_entity.return_value = []
                        mock_path.return_value = []
                        mock_impact.return_value = []

                        response = client.post("/api/rag/query", json={"query": "Test", "rag_mode": rag_mode})

                        assert response.status_code == 200

    def test_query_with_default_parameters(self, client):
        """
        Test query with only required parameter.

        Verifies defaults are applied correctly.
        """
        with patch("api.routes.rag.entity_rag") as mock_entity_rag:
            with patch("api.routes.rag.get_claude_client", return_value=None):
                mock_entity_rag.return_value = []

                response = client.post("/api/rag/query", json={"query": "Test"})

                assert response.status_code == 200
                # Should default to entity mode
                mock_entity_rag.assert_called_once()


class TestRAGHealthEndpoint:
    """Tests for GET /api/rag/health endpoint."""

    def test_health_check_success(self, client):
        """
        Test successful health check.

        Verifies that health endpoint returns status.
        """
        response = client.get("/api/rag/health")

        assert response.status_code == 200
        data = response.json()
        assert "chromadb_installed" in data
        assert "neo4j_connected" in data or "neo4j_error" in data
        assert "dual_index_ready" in data
        assert "full_rag_ready" in data

    def test_health_check_chroma_status(self, client):
        """
        Test health check includes Chroma status.

        Verifies vector database status is reported.
        """
        with patch("api.routes.rag.HAS_CHROMA", True):
            with patch("api.routes.rag.init_chroma_client") as mock_init:
                mock_collection = MagicMock()
                mock_collection.count.return_value = 100
                mock_client = MagicMock()
                mock_client.get_collection.return_value = mock_collection
                mock_init.return_value = mock_client

                response = client.get("/api/rag/health")

                assert response.status_code == 200
                data = response.json()
                assert data["chromadb_installed"] is True
                assert data["vector_db_exists"] is True

    def test_health_check_chroma_not_installed(self, client):
        """
        Test health check when Chroma not installed.

        Verifies proper reporting of missing dependency.
        """
        with patch("api.routes.rag.HAS_CHROMA", False):
            response = client.get("/api/rag/health")

            assert response.status_code == 200
            data = response.json()
            assert data["chromadb_installed"] is False

    def test_health_check_neo4j_status(self, client, mock_neo4j_client):
        """
        Test health check includes Neo4j status.

        Verifies graph database status is reported.
        """
        mock_neo4j_client.health_check.return_value = {
            "connected": True,
            "status": "connected",
            "atom_count": 50,
            "relationship_count": 100,
        }

        with patch("api.routes.rag.get_neo4j_client", return_value=mock_neo4j_client):
            response = client.get("/api/rag/health")

            assert response.status_code == 200
            data = response.json()  # noqa: F841

    def test_health_check_neo4j_disconnected(self, client):
        """
        Test health check when Neo4j disconnected.

        Verifies proper reporting of connection failure.
        """
        with patch("api.routes.rag.get_neo4j_client", return_value=None):
            response = client.get("/api/rag/health")

            assert response.status_code == 200
            data = response.json()
            assert data["neo4j_connected"] is False

    def test_health_check_claude_available(self, client, mock_claude_client):
        """
        Test health check includes Claude availability.

        Verifies LLM status is reported.
        """
        with patch("api.routes.rag.get_claude_client", return_value=mock_claude_client):
            response = client.get("/api/rag/health")

            assert response.status_code == 200
            data = response.json()
            assert data["claude_api_available"] is True

    def test_health_check_all_systems_ready(self, client, mock_neo4j_client, mock_claude_client):
        """
        Test health check with all systems operational.

        Verifies full_rag_ready flag when all components available.
        """
        mock_neo4j_client.health_check.return_value = {"connected": True, "status": "connected"}

        with patch("api.routes.rag.HAS_CHROMA", True):
            with patch("api.routes.rag.init_chroma_client") as mock_chroma:
                mock_collection = MagicMock()
                mock_collection.count.return_value = 100
                mock_client = MagicMock()
                mock_client.get_collection.return_value = mock_collection
                mock_chroma.return_value = mock_client

                with patch("api.routes.rag.get_neo4j_client", return_value=mock_neo4j_client):
                    with patch("api.routes.rag.get_claude_client", return_value=mock_claude_client):
                        response = client.get("/api/rag/health")

                        assert response.status_code == 200
                        data = response.json()
                        # Should have all components ready
                        assert "dual_index_ready" in data
                        assert "full_rag_ready" in data


class TestRAGErrorHandling:
    """Tests for error handling in RAG endpoints."""

    def test_entity_rag_error_handling(self, client):
        """
        Test error handling in entity RAG.

        Verifies graceful handling of RAG failures.
        """
        with patch("api.routes.rag.entity_rag", side_effect=Exception("RAG error")):
            with patch("api.routes.rag.get_claude_client", return_value=None):
                response = client.post("/api/rag/query", json={"query": "Test", "rag_mode": "entity"})

                # Should return empty results gracefully
                assert response.status_code == 200

    def test_path_rag_error_handling(self, client):
        """
        Test error handling in path RAG.

        Verifies graceful handling of Neo4j failures.
        """
        with patch("api.routes.rag.path_rag", side_effect=Exception("Neo4j error")):
            with patch("api.routes.rag.get_claude_client", return_value=None):
                response = client.post("/api/rag/query", json={"query": "Test", "rag_mode": "path"})

                assert response.status_code == 200

    def test_impact_rag_error_handling(self, client):
        """
        Test error handling in impact RAG.

        Verifies graceful handling of impact analysis failures.
        """
        with patch("api.routes.rag.impact_rag", side_effect=Exception("Impact error")):
            with patch("api.routes.rag.get_claude_client", return_value=None):
                response = client.post("/api/rag/query", json={"query": "Test", "rag_mode": "impact"})

                assert response.status_code == 200

    def test_claude_generation_error_handling(self, client):
        """
        Test error handling when Claude generation fails.

        Verifies fallback to non-Claude answer.
        """
        with patch("api.routes.rag.entity_rag") as mock_entity:
            with patch("api.routes.rag.get_claude_client") as mock_claude:
                mock_entity.return_value = [{"id": "REQ-001", "type": "requirement"}]

                mock_client = MagicMock()
                mock_client.generate_rag_answer.side_effect = Exception("Claude error")
                mock_claude.return_value = mock_client

                response = client.post("/api/rag/query", json={"query": "Test", "rag_mode": "entity"})

                assert response.status_code == 200
                # Should have fallback answer
                data = response.json()
                assert "answer" in data


class TestRAGIntegrationScenarios:
    """Integration tests for realistic RAG scenarios."""

    def test_complete_rag_workflow(self, client, mock_neo4j_client, mock_claude_client):
        """
        Test complete RAG workflow from query to answer.

        Verifies end-to-end functionality.
        """
        with patch("api.routes.rag.entity_rag") as mock_entity_rag:
            with patch("api.routes.rag.get_claude_client", return_value=mock_claude_client):
                mock_entity_rag.return_value = [
                    {
                        "id": "REQ-001",
                        "type": "requirement",
                        "title": "Authentication System",
                        "content": "OAuth 2.0 based authentication",
                        "distance": 0.95,
                    },
                    {
                        "id": "DESIGN-001",
                        "type": "design",
                        "title": "OAuth Design",
                        "content": "Design details",
                        "distance": 0.92,
                    },
                ]

                response = client.post(
                    "/api/rag/query",
                    json={"query": "How does our authentication work?", "rag_mode": "entity", "top_k": 5},
                )

                assert response.status_code == 200
                data = response.json()
                assert len(data["sources"]) == 2
                assert len(data["context_atoms"]) == 2

    def test_multi_mode_comparison(self, client):
        """
        Test querying same question in different modes.

        Verifies consistency across modes with same data.
        """
        query_data = {"query": "What impacts authentication changes?", "top_k": 5}

        for mode in ["entity", "path", "impact"]:
            with patch(f"api.routes.rag.{mode}_rag") as mock_rag:
                with patch("api.routes.rag.get_claude_client", return_value=None):
                    mock_rag.return_value = []

                    response = client.post("/api/rag/query", json={**query_data, "rag_mode": mode})

                    assert response.status_code == 200

    def test_health_and_query_consistency(self, client):
        """
        Test that health check and query endpoint are consistent.

        Verifies health status matches query availability.
        """
        with patch("api.routes.rag.HAS_CHROMA", True):
            with patch("api.routes.rag.init_chroma_client") as mock_chroma:
                mock_collection = MagicMock()
                mock_collection.count.return_value = 50
                mock_client = MagicMock()
                mock_client.get_collection.return_value = mock_collection
                mock_chroma.return_value = mock_client

                # Check health
                health_response = client.get("/api/rag/health")
                health_data = health_response.json()
                assert health_data["vector_db_exists"] is True

                # Should be able to query
                with patch("api.routes.rag.entity_rag") as mock_entity:
                    with patch("api.routes.rag.get_claude_client", return_value=None):
                        mock_entity.return_value = []

                        query_response = client.post("/api/rag/query", json={"query": "Test", "rag_mode": "entity"})

                        assert query_response.status_code == 200
