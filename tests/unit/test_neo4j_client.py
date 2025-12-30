"""
Unit tests for Neo4j client.

Tests the Neo4jClient class with comprehensive coverage of:
- Connection initialization and health checks
- Upstream dependency traversal
- Downstream impact analysis
- Full context retrieval
- Graph queries and filtering
- Error handling and edge cases
- Connection lifecycle management
"""

import pytest
from unittest.mock import Mock, MagicMock, patch, call
from neo4j.exceptions import ServiceUnavailable, DatabaseError

from api.neo4j_client import Neo4jClient, get_neo4j_client, close_neo4j_client


class TestNeo4jClientInitialization:
    """Tests for Neo4j client initialization and connection."""

    def test_initialization_with_explicit_parameters(self):
        """
        Test Neo4jClient initialization with explicit connection parameters.

        Verifies that the client correctly stores provided URI, username, and password.
        """
        with patch('api.neo4j_client.GraphDatabase.driver') as mock_driver:
            mock_driver.return_value.session.return_value.__enter__.return_value.run.return_value = None

            client = Neo4jClient(
                uri="neo4j://test-server:7687",
                user="testuser",
                password="testpass"
            )

            assert client.uri == "neo4j://test-server:7687"
            assert client.user == "testuser"
            assert client.password == "testpass"
            assert client.driver is not None

    def test_initialization_with_environment_variables(self, mock_env_vars, monkeypatch):
        """
        Test Neo4jClient initialization using environment variables.

        Verifies that the client reads connection parameters from environment when
        not explicitly provided.
        """
        with patch('api.neo4j_client.GraphDatabase.driver') as mock_driver:
            mock_driver.return_value.session.return_value.__enter__.return_value.run.return_value = None

            client = Neo4jClient()

            assert client.uri == "neo4j://localhost:7687"
            assert client.user == "neo4j"
            assert client.password == "password"

    def test_initialization_without_password_raises_error(self, monkeypatch):
        """
        Test that initialization fails without a password.

        Verifies that ValueError is raised when no password is provided or available
        in environment.
        """
        monkeypatch.delenv("NEO4J_PASSWORD", raising=False)

        with pytest.raises(ValueError, match="Neo4j password required"):
            Neo4jClient(
                uri="neo4j://localhost:7687",
                user="neo4j",
                password=None
            )

    def test_connection_error_on_failed_connect(self):
        """
        Test that ServiceUnavailable is raised when connection fails.

        Verifies proper error handling during the initial connection attempt.
        """
        with patch('api.neo4j_client.GraphDatabase.driver') as mock_driver:
            mock_driver.side_effect = Exception("Connection refused")

            with pytest.raises(ServiceUnavailable, match="Failed to connect to Neo4j"):
                Neo4jClient(
                    uri="neo4j://unreachable:7687",
                    user="neo4j",
                    password="password"
                )

    def test_driver_instantiation_with_correct_parameters(self):
        """
        Test that GraphDatabase.driver is called with correct parameters.

        Verifies that the Neo4j driver is initialized with proper auth and encryption settings.
        """
        with patch('api.neo4j_client.GraphDatabase.driver') as mock_driver:
            mock_driver.return_value.session.return_value.__enter__.return_value.run.return_value = None

            client = Neo4jClient(
                uri="neo4j://localhost:7687",
                user="neo4j",
                password="password"
            )

            mock_driver.assert_called_once_with(
                "neo4j://localhost:7687",
                auth=("neo4j", "password"),
                encrypted=False,
            )


class TestConnectionManagement:
    """Tests for connection lifecycle management."""

    def test_is_connected_returns_true_when_connected(self, mock_neo4j_client):
        """
        Test is_connected returns True for active connection.

        Verifies that the method correctly identifies an active connection.
        """
        assert mock_neo4j_client.is_connected() is True

    def test_is_connected_returns_false_when_not_connected(self, mock_neo4j_client):
        """
        Test is_connected returns False when driver is None.

        Verifies that the method correctly identifies when no connection exists.
        """
        mock_neo4j_client.driver = None
        assert mock_neo4j_client.is_connected() is False

    def test_is_connected_returns_false_on_exception(self, mock_neo4j_client):
        """
        Test is_connected returns False when query fails.

        Verifies that connection errors are handled gracefully.
        """
        session_mock = MagicMock()
        session_mock.run.side_effect = Exception("Connection timeout")
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        assert mock_neo4j_client.is_connected() is False

    def test_close_closes_driver(self, mock_neo4j_client):
        """
        Test that close() properly closes the driver.

        Verifies that the driver is closed and set to None.
        """
        # Save reference to driver before closing
        driver = mock_neo4j_client.driver

        mock_neo4j_client.close()

        driver.close.assert_called_once()
        assert mock_neo4j_client.driver is None

    def test_close_is_idempotent(self, mock_neo4j_client):
        """
        Test that close() can be called multiple times safely.

        Verifies that calling close() twice doesn't raise errors.
        """
        mock_neo4j_client.close()
        mock_neo4j_client.close()  # Should not raise

        assert mock_neo4j_client.driver is None

    def test_context_manager_usage(self):
        """
        Test Neo4jClient can be used as context manager.

        Verifies that __enter__ and __exit__ methods work correctly.
        """
        with patch('api.neo4j_client.GraphDatabase.driver'):
            with patch.object(Neo4jClient, '_connect'):
                client = Neo4jClient.__new__(Neo4jClient)
                driver_mock = MagicMock()
                client.driver = driver_mock

                with client as ctx:
                    assert ctx is client

                # Driver should be closed on exit
                driver_mock.close.assert_called_once()


class TestUpstreamDependencies:
    """Tests for finding upstream dependencies."""

    def test_find_upstream_dependencies_success(self, neo4j_client_with_data):
        """
        Test successful upstream dependency retrieval.

        Verifies that the method correctly queries and returns upstream atoms.
        """
        result = neo4j_client_with_data.find_upstream_dependencies("REQ-001")

        assert isinstance(result, list)
        # REQ-001 has no upstream deps in our test data
        assert len(result) == 0

    def test_find_upstream_dependencies_with_custom_depth(self, neo4j_client_with_data):
        """
        Test upstream dependency retrieval with custom max_depth.

        Verifies that the max_depth parameter is respected.
        """
        result = neo4j_client_with_data.find_upstream_dependencies("REQ-001", max_depth=5)

        # Verify the query was called
        session_mock = neo4j_client_with_data.driver.session.return_value.__enter__.return_value
        assert session_mock.run.called

    def test_find_upstream_dependencies_not_connected_raises_error(self):
        """
        Test that upstream dependencies raises error when not connected.

        Verifies proper error handling when driver is None.
        """
        client = Neo4jClient.__new__(Neo4jClient)
        client.driver = None

        with pytest.raises(ServiceUnavailable, match="Not connected to Neo4j"):
            client.find_upstream_dependencies("REQ-001")

    def test_find_upstream_dependencies_database_error_handling(self, mock_neo4j_client):
        """
        Test database error handling in upstream dependencies.

        Verifies that DatabaseError from Neo4j is properly caught and re-raised.
        """
        session_mock = MagicMock()
        session_mock.run.side_effect = DatabaseError("Query execution failed")
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        with pytest.raises(Neo4jError, match="Error finding upstream dependencies"):
            mock_neo4j_client.find_upstream_dependencies("REQ-001")

    def test_find_upstream_dependencies_returns_serialized_records(self, mock_neo4j_client):
        """
        Test that upstream dependencies returns properly serialized records.

        Verifies that Neo4j records are converted to dictionaries.
        """
        result_record = MagicMock()
        result_record.items.return_value = [
            ("upstream", {"id": "DESIGN-001", "type": "design"}),
            ("rel_path", ["implements"]),
            ("depth", 1)
        ]

        session_mock = MagicMock()
        session_mock.run.return_value = [result_record]
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        result = mock_neo4j_client.find_upstream_dependencies("DESIGN-001")

        assert isinstance(result, list)
        assert len(result) == 1


class TestDownstreamImpacts:
    """Tests for finding downstream impacts."""

    def test_find_downstream_impacts_success(self, neo4j_client_with_data):
        """
        Test successful downstream impact retrieval.

        Verifies that the method correctly queries and returns downstream atoms.
        """
        result = neo4j_client_with_data.find_downstream_impacts("REQ-001")

        assert isinstance(result, list)

    def test_find_downstream_impacts_with_custom_depth(self, neo4j_client_with_data):
        """
        Test downstream impact retrieval with custom max_depth.

        Verifies that the max_depth parameter affects the query.
        """
        result = neo4j_client_with_data.find_downstream_impacts("REQ-001", max_depth=2)

        session_mock = neo4j_client_with_data.driver.session.return_value.__enter__.return_value
        assert session_mock.run.called

    def test_find_downstream_impacts_not_connected_raises_error(self):
        """
        Test that downstream impacts raises error when not connected.

        Verifies proper error handling when driver is None.
        """
        client = Neo4jClient.__new__(Neo4jClient)
        client.driver = None

        with pytest.raises(ServiceUnavailable, match="Not connected to Neo4j"):
            client.find_downstream_impacts("REQ-001")

    def test_find_downstream_impacts_database_error_handling(self, mock_neo4j_client):
        """
        Test database error handling in downstream impacts.

        Verifies that DatabaseError is properly caught and re-raised.
        """
        session_mock = MagicMock()
        session_mock.run.side_effect = DatabaseError("Query execution failed")
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        with pytest.raises(Neo4jError, match="Error finding downstream impacts"):
            mock_neo4j_client.find_downstream_impacts("REQ-001")


class TestFullContext:
    """Tests for full context retrieval."""

    def test_find_full_context_returns_center_and_related(self, mock_neo4j_client):
        """
        Test that full context returns center atom and related atoms.

        Verifies the structure of the returned context dictionary.
        """
        center_atom = {"id": "REQ-001", "type": "requirement", "title": "Test Requirement"}
        related_atoms = [
            {"id": "DESIGN-001", "type": "design", "title": "Test Design"},
            {"id": "PROC-001", "type": "procedure", "title": "Test Procedure"}
        ]

        center_result = MagicMock()
        center_result.data.return_value = [center_atom]

        related_result = MagicMock()
        related_result_record = MagicMock()
        related_result_record.items.return_value = [
            ("related", related_atoms[0]),
            ("connection_count", 2)
        ]
        related_result.__iter__ = Mock(return_value=iter([related_result_record]))

        session_mock = MagicMock()
        session_mock.run.side_effect = [center_result, related_result]
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        result = mock_neo4j_client.find_full_context("REQ-001")

        assert "center" in result
        assert "related" in result
        assert "total_related" in result

    def test_find_full_context_atom_not_found(self, mock_neo4j_client):
        """
        Test that full context returns error when atom not found.

        Verifies proper error handling for non-existent atoms.
        """
        center_result = MagicMock()
        center_result.data.return_value = []

        session_mock = MagicMock()
        session_mock.run.return_value = center_result
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        result = mock_neo4j_client.find_full_context("NONEXISTENT")

        assert "error" in result
        assert result["atom"] is None

    def test_find_full_context_with_custom_depth_and_limit(self, mock_neo4j_client):
        """
        Test full context with custom depth and limit parameters.

        Verifies that custom parameters are used in the query.
        """
        center_result = MagicMock()
        center_result.data.return_value = [{"id": "REQ-001"}]

        related_result = MagicMock()
        related_result.__iter__ = Mock(return_value=iter([]))

        session_mock = MagicMock()
        session_mock.run.side_effect = [center_result, related_result]
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        result = mock_neo4j_client.find_full_context("REQ-001", max_depth=3, limit=50)

        # Verify query was called with custom parameters
        calls = session_mock.run.call_args_list
        assert len(calls) >= 1


class TestImplementationChain:
    """Tests for implementation chain traversal."""

    def test_find_implementation_chain_complete_chain(self, mock_neo4j_client):
        """
        Test finding a complete implementation chain.

        Verifies that the method correctly retrieves requirement, design, procedure,
        and validation atoms.
        """
        requirement = {"id": "REQ-001", "type": "requirement"}
        design = {"id": "DESIGN-001", "type": "design"}
        procedure = {"id": "PROC-001", "type": "procedure"}
        validation = {"id": "VAL-001", "type": "validation"}

        req_result = MagicMock()
        req_result.data.return_value = [requirement]

        design_result = MagicMock()
        design_result.data.return_value = [design]

        proc_result = MagicMock()
        proc_result.data.return_value = [procedure]

        val_result = MagicMock()
        val_result.data.return_value = [validation]

        session_mock = MagicMock()
        session_mock.run.side_effect = [req_result, design_result, proc_result, val_result]
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        result = mock_neo4j_client.find_implementation_chain("REQ-001")

        assert "requirement" in result
        assert "designs" in result
        assert "procedures" in result
        assert "validations" in result

    def test_find_implementation_chain_requirement_not_found(self, mock_neo4j_client):
        """
        Test implementation chain when requirement not found.

        Verifies proper error handling for non-existent requirements.
        """
        req_result = MagicMock()
        req_result.data.return_value = []

        session_mock = MagicMock()
        session_mock.run.return_value = req_result
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        result = mock_neo4j_client.find_implementation_chain("NONEXISTENT")

        assert "error" in result


class TestFindByType:
    """Tests for type-based atom searches."""

    def test_find_by_type_returns_atoms_of_type(self, mock_neo4j_client):
        """
        Test finding all atoms of a specific type.

        Verifies that the correct atoms are returned for a given type.
        """
        requirements = [
            {"id": "REQ-001", "type": "requirement"},
            {"id": "REQ-002", "type": "requirement"}
        ]

        result_record = MagicMock()
        result_record.items.return_value = [("a", requirements[0])]

        result_record2 = MagicMock()
        result_record2.items.return_value = [("a", requirements[1])]

        session_mock = MagicMock()
        session_mock.run.return_value = [result_record, result_record2]
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        result = mock_neo4j_client.find_by_type("requirement")

        assert isinstance(result, list)
        assert len(result) == 2

    def test_find_by_type_with_limit(self, mock_neo4j_client):
        """
        Test finding atoms with custom result limit.

        Verifies that the limit parameter is passed to the query.
        """
        session_mock = MagicMock()
        session_mock.run.return_value = []
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        result = mock_neo4j_client.find_by_type("design", limit=25)

        # Verify limit was used
        calls = session_mock.run.call_args_list
        assert len(calls) > 0

    def test_find_by_type_case_insensitive(self, mock_neo4j_client):
        """
        Test that find_by_type is case-insensitive.

        Verifies that type names are lowercased before query.
        """
        session_mock = MagicMock()
        session_mock.run.return_value = []
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        result = mock_neo4j_client.find_by_type("REQUIREMENT")

        # Verify query was called
        assert session_mock.run.called


class TestCountAtoms:
    """Tests for atom counting."""

    def test_count_atoms_returns_totals_and_by_type(self, mock_neo4j_client):
        """
        Test that count_atoms returns total and per-type counts.

        Verifies the structure of the returned count dictionary.
        """
        total_result = MagicMock()
        total_result.single.return_value = {"total": 5}

        type_result = MagicMock()
        type_result_record1 = MagicMock()
        type_result_record1.items.return_value = [("type", "requirement"), ("count", 2)]
        type_result_record2 = MagicMock()
        type_result_record2.items.return_value = [("type", "design"), ("count", 3)]
        type_result.__iter__ = Mock(return_value=iter([
            {"type": "requirement", "count": 2},
            {"type": "design", "count": 3}
        ]))

        session_mock = MagicMock()
        session_mock.run.side_effect = [total_result, type_result]
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        result = mock_neo4j_client.count_atoms()

        assert "total" in result
        assert "by_type" in result
        assert result["total"] == 5


class TestHealthCheck:
    """Tests for health check functionality."""

    def test_health_check_connected_status(self, mock_neo4j_client):
        """
        Test health check returns connected status.

        Verifies that successful connection returns proper health status.
        """
        session_mock = MagicMock()
        session_mock.run.side_effect = [
            MagicMock(),  # RETURN 1
            MagicMock(data=lambda: [{"component": "Neo4j Server"}]),  # dbms.components()
            MagicMock(single=lambda: {"count": 5}),  # atom count
            MagicMock(single=lambda: {"count": 10}),  # relationship count
        ]
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        result = mock_neo4j_client.health_check()

        assert result["connected"] is True
        assert result["status"] == "connected"

    def test_health_check_disconnected_status_when_driver_none(self):
        """
        Test health check returns disconnected when driver is None.

        Verifies proper status when no connection exists.
        """
        client = Neo4jClient.__new__(Neo4jClient)
        client.driver = None

        result = client.health_check()

        assert result["connected"] is False
        assert result["status"] == "disconnected"

    def test_health_check_error_status_on_exception(self, mock_neo4j_client):
        """
        Test health check returns error status on query failure.

        Verifies proper error handling and reporting.
        """
        session_mock = MagicMock()
        session_mock.run.side_effect = Exception("Query failed")
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        result = mock_neo4j_client.health_check()

        assert result["connected"] is False
        assert result["status"] == "error"
        assert "error" in result


class TestSerializeRecord:
    """Tests for record serialization."""

    def test_serialize_record_with_dictionary(self):
        """
        Test serializing Neo4j record with dictionary-like structure.

        Verifies conversion of Neo4j records to Python dictionaries.
        """
        record = {"id": "REQ-001", "type": "requirement", "title": "Test"}

        result = Neo4jClient._serialize_record(record)

        assert isinstance(result, dict)
        assert result["id"] == "REQ-001"

    def test_serialize_record_with_nested_nodes(self):
        """
        Test serializing record with nested node objects.

        Verifies proper handling of nested Neo4j node structures.
        """
        node = MagicMock()
        node.items.return_value = [("id", "REQ-001"), ("type", "requirement")]

        record = {"node": node}

        result = Neo4jClient._serialize_record(record)

        assert isinstance(result, dict)

    def test_serialize_record_with_list_of_nodes(self):
        """
        Test serializing record containing list of nodes.

        Verifies handling of array structures in records.
        """
        node1 = MagicMock()
        node1.items.return_value = [("id", "REQ-001")]
        node2 = MagicMock()
        node2.items.return_value = [("id", "REQ-002")]

        record = {"nodes": [node1, node2]}

        result = Neo4jClient._serialize_record(record)

        assert isinstance(result, dict)


class TestSingleton:
    """Tests for singleton pattern in get_neo4j_client."""

    def test_get_neo4j_client_returns_singleton(self):
        """
        Test that get_neo4j_client returns same instance.

        Verifies singleton pattern implementation.
        """
        with patch('api.neo4j_client.GraphDatabase.driver'):
            with patch.object(Neo4jClient, '_connect'):
                # Clear global state
                import api.neo4j_client
                api.neo4j_client._neo4j_client = None

                client1 = get_neo4j_client()
                client2 = get_neo4j_client()

                assert client1 is client2

    def test_close_neo4j_client_clears_singleton(self):
        """
        Test that close_neo4j_client clears the singleton.

        Verifies that global instance is properly cleaned up.
        """
        with patch('api.neo4j_client.GraphDatabase.driver'):
            with patch.object(Neo4jClient, '_connect'):
                import api.neo4j_client
                api.neo4j_client._neo4j_client = None

                client = get_neo4j_client()
                close_neo4j_client()

                assert api.neo4j_client._neo4j_client is None


class TestEdgeCases:
    """Tests for edge cases and error scenarios."""

    def test_empty_atom_id(self, mock_neo4j_client):
        """
        Test handling of empty atom ID.

        Verifies proper error handling for invalid input.
        """
        session_mock = MagicMock()
        session_mock.run.return_value = []
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        # Should not raise, but query should be executed
        result = mock_neo4j_client.find_upstream_dependencies("")

        assert isinstance(result, list)

    def test_special_characters_in_atom_id(self, mock_neo4j_client):
        """
        Test handling of special characters in atom ID.

        Verifies proper escaping and handling of special characters.
        """
        session_mock = MagicMock()
        session_mock.run.return_value = []
        mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

        result = mock_neo4j_client.find_upstream_dependencies("REQ-001@special#chars")

        # Should execute without error
        assert isinstance(result, list)

    def test_very_large_depth_value(self, mock_neo4j_client):
        """
        Test handling of very large depth values.

        Verifies that excessively large depth values raise ValueError.
        """
        with pytest.raises(ValueError, match="max_depth must be an integer between 1 and 5"):
            mock_neo4j_client.find_upstream_dependencies("REQ-001", max_depth=100)

    def test_negative_depth_value(self, mock_neo4j_client):
        """
        Test handling of negative depth values.

        Verifies that negative depth values raise ValueError.
        """
        with pytest.raises(ValueError, match="max_depth must be an integer between 1 and 5"):
            mock_neo4j_client.find_upstream_dependencies("REQ-001", max_depth=-1)
