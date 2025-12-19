"""
Pytest configuration and shared fixtures for GNDP test suite.

This module provides comprehensive fixtures for:
- Neo4j client mocking
- Claude client mocking
- Test data (atoms, graphs)
- API client setup
- Async test support
"""

import pytest
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from unittest.mock import Mock, MagicMock, AsyncMock, patch

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


# ==================== Sample Test Data ====================

SAMPLE_ATOMS = [
    {
        "id": "REQ-001",
        "atom_id": "REQ-001",
        "type": "requirement",
        "title": "User Authentication System",
        "description": "System must provide secure user authentication",
        "status": "active",
        "priority": "high",
        "created_date": "2025-01-01",
        "last_modified": "2025-01-15",
        "metadata": {
            "module": "auth",
            "tags": ["security", "user-management"],
            "owner": "platform-team"
        }
    },
    {
        "id": "DESIGN-001",
        "atom_id": "DESIGN-001",
        "type": "design",
        "title": "OAuth 2.0 Authentication Design",
        "description": "Design document for OAuth 2.0 implementation",
        "status": "active",
        "priority": "high",
        "created_date": "2025-01-02",
        "last_modified": "2025-01-15",
        "metadata": {
            "module": "auth",
            "tags": ["security", "design"],
            "owner": "platform-team"
        }
    },
    {
        "id": "PROC-001",
        "atom_id": "PROC-001",
        "type": "procedure",
        "title": "Token Generation Procedure",
        "description": "Step-by-step procedure for generating JWT tokens",
        "status": "active",
        "priority": "high",
        "created_date": "2025-01-05",
        "last_modified": "2025-01-15",
        "metadata": {
            "module": "auth",
            "tags": ["procedure", "implementation"],
            "owner": "platform-team"
        }
    },
    {
        "id": "VAL-001",
        "atom_id": "VAL-001",
        "type": "validation",
        "title": "Authentication Test Plan",
        "description": "Comprehensive test plan for authentication system",
        "status": "active",
        "priority": "high",
        "created_date": "2025-01-10",
        "last_modified": "2025-01-15",
        "metadata": {
            "module": "auth",
            "tags": ["testing", "validation"],
            "owner": "qa-team"
        }
    },
    {
        "id": "RISK-001",
        "atom_id": "RISK-001",
        "type": "risk",
        "title": "Token Expiration Risk",
        "description": "Risk of token expiration causing authentication failures",
        "status": "active",
        "impact_level": "medium",
        "created_date": "2025-01-12",
        "last_modified": "2025-01-15",
        "metadata": {
            "module": "auth",
            "tags": ["risk", "security"],
            "mitigation": "Implement refresh token mechanism"
        }
    }
]


SAMPLE_GRAPH_DATA = {
    "nodes": [
        {"id": node["id"], "type": node["type"], "label": node["title"]}
        for node in SAMPLE_ATOMS
    ],
    "edges": [
        {"source": "REQ-001", "target": "DESIGN-001", "type": "implements"},
        {"source": "DESIGN-001", "target": "PROC-001", "type": "implements"},
        {"source": "PROC-001", "target": "VAL-001", "type": "validated_by"},
        {"source": "VAL-001", "target": "REQ-001", "type": "validates"},
        {"source": "RISK-001", "target": "REQ-001", "type": "affects"},
    ]
}


# ==================== Neo4j Fixtures ====================

@pytest.fixture
def mock_neo4j_driver():
    """
    Mock Neo4j driver fixture.

    Provides a MagicMock that simulates Neo4j driver behavior with
    proper session management and query execution.

    Returns:
        MagicMock: Mocked Neo4j driver
    """
    driver = MagicMock()
    session = MagicMock()

    # Configure session context manager
    driver.session.return_value.__enter__ = Mock(return_value=session)
    driver.session.return_value.__exit__ = Mock(return_value=None)

    return driver


@pytest.fixture
def mock_neo4j_client(mock_neo4j_driver):
    """
    Mock Neo4j client fixture.

    Provides a fully mocked Neo4jClient with configurable responses
    for common query patterns.

    Args:
        mock_neo4j_driver: Mocked Neo4j driver

    Returns:
        Mock: Configured Neo4j client mock
    """
    with patch('api.neo4j_client.GraphDatabase.driver', return_value=mock_neo4j_driver):
        from api.neo4j_client import Neo4jClient

        client = Neo4jClient(
            uri="neo4j://localhost:7687",
            user="neo4j",
            password="password"
        )

        # Configure default mock responses
        client.driver = mock_neo4j_driver

        return client


@pytest.fixture
def neo4j_client_with_data(mock_neo4j_client):
    """
    Neo4j client fixture with pre-configured responses for test data.

    Provides realistic Neo4j query responses based on SAMPLE_ATOMS
    and SAMPLE_GRAPH_DATA.

    Args:
        mock_neo4j_client: Base mocked Neo4j client

    Returns:
        Mock: Neo4j client with configured responses
    """
    session_mock = MagicMock()
    mock_neo4j_client.driver.session.return_value.__enter__.return_value = session_mock

    # Default responses
    atom_id_responses = {atom["id"]: atom for atom in SAMPLE_ATOMS}

    def run_side_effect(query, **kwargs):
        """Handle different query types."""
        result_mock = MagicMock()

        # Handle find_upstream_dependencies
        if "requires|depends_on" in query and "->" in query:
            if kwargs.get("atom_id") == "REQ-001":
                result_mock.data.return_value = []  # No upstream deps
            result_mock.__iter__ = Mock(return_value=iter([]))
            return result_mock

        # Handle find_downstream_impacts
        if "requires|depends_on|affects" in query and "<-" in query:
            if kwargs.get("atom_id") == "REQ-001":
                # Return downstream dependencies
                result_mock.data.return_value = [
                    {"downstream": SAMPLE_ATOMS[1], "depth": 1}
                ]
            result_mock.__iter__ = Mock(return_value=iter([]))
            return result_mock

        # Handle health check
        if "RETURN 1" in query:
            result_mock.data.return_value = [{"result": 1}]
            return result_mock

        # Handle count queries
        if "count(a)" in query:
            result_mock.single.return_value = {"total": len(SAMPLE_ATOMS)}
            return result_mock

        # Default: return empty result
        result_mock.data.return_value = []
        result_mock.__iter__ = Mock(return_value=iter([]))
        return result_mock

    session_mock.run.side_effect = run_side_effect

    return mock_neo4j_client


# ==================== Claude Client Fixtures ====================

@pytest.fixture
def mock_anthropic_client():
    """
    Mock Anthropic/Claude client fixture.

    Provides a MagicMock that simulates the Anthropic API client
    behavior for message generation.

    Returns:
        MagicMock: Mocked Anthropic client
    """
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text="This is a test answer with relevant information.")],
        usage=MagicMock(
            input_tokens=100,
            output_tokens=50,
            total_tokens=150
        )
    )
    return mock_client


@pytest.fixture
def mock_claude_client(mock_anthropic_client):
    """
    Mock Claude client fixture.

    Provides a fully mocked ClaudeClient that simulates RAG answer generation
    without making actual API calls.

    Args:
        mock_anthropic_client: Mocked Anthropic client

    Returns:
        Mock: Configured Claude client
    """
    with patch('api.claude_client.Anthropic', return_value=mock_anthropic_client):
        from api.claude_client import ClaudeClient

        client = ClaudeClient(api_key="sk-test-key-12345")
        client.client = mock_anthropic_client

        return client


@pytest.fixture
def claude_client_with_responses(mock_claude_client):
    """
    Claude client fixture with realistic RAG mode responses.

    Provides responses tailored to different RAG modes (entity, path, impact).

    Args:
        mock_claude_client: Base mocked Claude client

    Returns:
        Mock: Claude client with configured responses
    """

    def create_response(mode):
        """Generate response based on RAG mode."""
        responses = {
            "entity": "The authentication system uses OAuth 2.0 protocol for secure user login.",
            "path": "REQ-001 requires DESIGN-001, which implements PROC-001, which is validated by VAL-001.",
            "impact": "Changes to REQ-001 would impact DESIGN-001, PROC-001, and VAL-001."
        }

        return MagicMock(
            content=[MagicMock(text=responses.get(mode, "Answer based on context."))],
            usage=MagicMock(
                input_tokens=100,
                output_tokens=50,
                total_tokens=150
            )
        )

    # Store original for mode detection
    original_create = mock_claude_client.client.messages.create

    def messages_create_side_effect(model, max_tokens, system, messages):
        """Determine RAG mode from system prompt."""
        rag_mode = "entity"
        if "PATH RAG MODE" in system:
            rag_mode = "path"
        elif "IMPACT RAG MODE" in system:
            rag_mode = "impact"

        return create_response(rag_mode)

    mock_claude_client.client.messages.create.side_effect = messages_create_side_effect

    return mock_claude_client


# ==================== Test Data Fixtures ====================

@pytest.fixture
def sample_atoms() -> List[Dict[str, Any]]:
    """
    Fixture providing sample atoms for testing.

    Returns:
        List of sample atom dictionaries
    """
    return SAMPLE_ATOMS


@pytest.fixture
def sample_graph() -> Dict[str, Any]:
    """
    Fixture providing sample graph data.

    Returns:
        Dictionary with nodes and edges
    """
    return SAMPLE_GRAPH_DATA


@pytest.fixture
def sample_atom_by_type(sample_atoms) -> Dict[str, Dict[str, Any]]:
    """
    Fixture providing atoms indexed by type.

    Args:
        sample_atoms: Sample atoms fixture

    Returns:
        Dictionary mapping atom types to atoms
    """
    indexed = {}
    for atom in sample_atoms:
        atom_type = atom["type"]
        if atom_type not in indexed:
            indexed[atom_type] = []
        indexed[atom_type].append(atom)

    return indexed


# ==================== API Client Fixtures ====================

@pytest.fixture
def test_client():
    """
    FastAPI test client fixture.

    Provides a TestClient for making requests to the API without
    starting a server.

    Returns:
        TestClient: FastAPI test client
    """
    from fastapi.testclient import TestClient
    from api.server import app

    return TestClient(app)


@pytest.fixture
def test_client_with_mocks(test_client, mock_neo4j_client, mock_claude_client):
    """
    Test client with mocked dependencies.

    Patches Neo4j and Claude clients in the API routes to use mocks.

    Args:
        test_client: Base test client
        mock_neo4j_client: Mocked Neo4j client
        mock_claude_client: Mocked Claude client

    Returns:
        TestClient: Test client with mocked dependencies
    """
    with patch('api.routes.rag.get_neo4j_client', return_value=mock_neo4j_client):
        with patch('api.routes.rag.get_claude_client', return_value=mock_claude_client):
            yield test_client


# ==================== Configuration Fixtures ====================

@pytest.fixture
def mock_env_vars(monkeypatch):
    """
    Fixture for mocking environment variables.

    Provides a clean environment configuration for testing.

    Args:
        monkeypatch: Pytest's monkeypatch fixture

    Returns:
        Dict: Environment variable setters
    """
    env_vars = {
        "NEO4J_URI": "neo4j://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "password",
        "ANTHROPIC_API_KEY": "sk-test-key-12345",
        "API_ADMIN_TOKEN": "test-admin-token-12345",
        "ALLOWED_ORIGINS": "http://localhost:3000,http://localhost:5173"
    }

    for key, value in env_vars.items():
        monkeypatch.setenv(key, value)

    return env_vars


# ==================== Async Test Support ====================

@pytest.fixture
def event_loop():
    """
    Fixture providing event loop for async tests.

    Returns:
        asyncio.AbstractEventLoop: Event loop for async operations
    """
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ==================== Parametrization Fixtures ====================

@pytest.fixture(
    params=[
        ("REQ-001", "requirement"),
        ("DESIGN-001", "design"),
        ("PROC-001", "procedure"),
        ("VAL-001", "validation"),
        ("RISK-001", "risk"),
    ]
)
def atom_id_and_type(request):
    """
    Parametrized fixture providing various atom IDs and types.

    Yields:
        Tuple[str, str]: (atom_id, atom_type) pairs
    """
    return request.param


@pytest.fixture(
    params=["entity", "path", "impact"]
)
def rag_modes(request):
    """
    Parametrized fixture providing RAG modes.

    Yields:
        str: RAG mode (entity, path, or impact)
    """
    return request.param


@pytest.fixture(
    params=[1, 2, 3, 5, 10]
)
def depth_values(request):
    """
    Parametrized fixture providing graph traversal depth values.

    Yields:
        int: Depth value for graph traversal
    """
    return request.param


# ==================== Cleanup Fixtures ====================

@pytest.fixture
def cleanup_neo4j_client():
    """
    Fixture ensuring Neo4j client is properly closed.

    Yields:
        None
    """
    yield

    from api.neo4j_client import close_neo4j_client
    close_neo4j_client()


@pytest.fixture
def cleanup_mocks():
    """
    Fixture for cleaning up mock patches.

    Yields:
        None
    """
    yield
    # Any cleanup logic can be added here


# ==================== Pytest Configuration ====================

def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line(
        "markers",
        "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers",
        "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers",
        "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers",
        "async: mark test as async"
    )


# ==================== Collection Hooks ====================

def pytest_collection_modifyitems(config, items):
    """
    Modify test collection to add markers based on file location.

    Args:
        config: Pytest config
        items: Collected test items
    """
    for item in items:
        file_path = str(item.fspath)

        if "unit" in file_path:
            item.add_marker(pytest.mark.unit)
        elif "integration" in file_path:
            item.add_marker(pytest.mark.integration)

        if "async" in item.name.lower():
            item.add_marker(pytest.mark.async)
