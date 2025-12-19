# GNDP Test Suite Documentation

Comprehensive test suite for the Graph-Native Documentation Platform (GNDP) with full coverage of Neo4j client, Claude client, RAG API, and schema validation.

## Overview

The test suite is organized into three main categories:

### 1. Unit Tests (`tests/unit/`)
- **test_neo4j_client.py**: Tests for Neo4j database client
- **test_claude_client.py**: Tests for Claude API client

### 2. Integration Tests (`tests/integration/`)
- **test_rag_api.py**: Tests for RAG API endpoints
- **test_schema_validation.py**: Tests for data schema validation

### 3. Shared Fixtures (`tests/conftest.py`)
- Mock fixtures for Neo4j and Claude clients
- Sample test data (atoms, graphs)
- API client setup and configuration

## Quick Start

### Installation

Install test dependencies:

```bash
pip install -r requirements.txt
```

The `requirements.txt` file includes:
- pytest >= 7.4.0
- pytest-cov >= 4.1.0 (coverage reporting)
- pytest-mock >= 3.11.1 (mocking)
- pytest-asyncio >= 0.21.0 (async support)
- pytest-xdist >= 3.3.1 (parallel testing)

### Running Tests

Run all tests:

```bash
pytest
```

Run specific test file:

```bash
pytest tests/unit/test_neo4j_client.py
```

Run specific test class:

```bash
pytest tests/unit/test_neo4j_client.py::TestNeo4jClientInitialization
```

Run specific test:

```bash
pytest tests/unit/test_neo4j_client.py::TestNeo4jClientInitialization::test_initialization_with_explicit_parameters
```

### Running Tests by Category

Run only unit tests:

```bash
pytest -m unit
```

Run only integration tests:

```bash
pytest -m integration
```

Run only slow tests:

```bash
pytest -m slow
```

### Running Tests in Parallel

Run tests using multiple workers (faster execution):

```bash
pytest -n auto
```

Run with 4 workers specifically:

```bash
pytest -n 4
```

## Test Structure

### Fixtures (conftest.py)

#### Neo4j Fixtures

```python
@pytest.fixture
def mock_neo4j_driver()
    # Mocked Neo4j driver with session management

@pytest.fixture
def mock_neo4j_client(mock_neo4j_driver)
    # Fully mocked Neo4jClient

@pytest.fixture
def neo4j_client_with_data(mock_neo4j_client)
    # Neo4j client with pre-configured test data
```

#### Claude Fixtures

```python
@pytest.fixture
def mock_anthropic_client()
    # Mocked Anthropic API client

@pytest.fixture
def mock_claude_client(mock_anthropic_client)
    # Fully mocked ClaudeClient

@pytest.fixture
def claude_client_with_responses(mock_claude_client)
    # Claude client with realistic RAG mode responses
```

#### Test Data Fixtures

```python
@pytest.fixture
def sample_atoms()
    # 5 sample atoms (REQ-001, DESIGN-001, PROC-001, VAL-001, RISK-001)

@pytest.fixture
def sample_graph()
    # Sample graph with nodes and edges

@pytest.fixture
def sample_atom_by_type(sample_atoms)
    # Atoms indexed by type
```

#### Parametrized Fixtures

```python
@pytest.fixture(params=["entity", "path", "impact"])
def rag_modes(request)
    # RAG mode parametrization

@pytest.fixture(params=[1, 2, 3, 5, 10])
def depth_values(request)
    # Graph traversal depth parametrization
```

## Test Coverage

### Unit Tests

#### Neo4j Client (test_neo4j_client.py)

- **Initialization**
  - Connection with explicit parameters
  - Connection with environment variables
  - Password validation
  - Driver instantiation
  - Error handling on connection failure

- **Connection Management**
  - Connection status checking
  - Proper driver closure
  - Context manager usage
  - Idempotent operations

- **Upstream Dependencies**
  - Finding upstream atoms
  - Custom depth parameter
  - Error handling
  - Database error recovery
  - Record serialization

- **Downstream Impacts**
  - Finding downstream atoms
  - Custom depth parameter
  - Error handling
  - Database error recovery

- **Full Context**
  - Center atom retrieval
  - Related atoms retrieval
  - Missing atom handling
  - Custom parameters

- **Implementation Chain**
  - Complete chain traversal
  - Missing requirement handling
  - Requirement → Design → Procedure → Validation mapping

- **Type-Based Search**
  - Finding atoms by type
  - Result limiting
  - Case-insensitivity

- **Atom Counting**
  - Total count
  - Per-type breakdown

- **Health Check**
  - Connection status
  - Database statistics
  - Error handling

- **Edge Cases**
  - Empty atom IDs
  - Special characters
  - Large depth values
  - Negative depth values

#### Claude Client (test_claude_client.py)

- **Initialization**
  - Explicit API key
  - Environment variable loading
  - Missing API key handling
  - Model configuration

- **RAG Answer Generation**
  - Entity mode generation
  - Path mode generation
  - Impact mode generation
  - Custom token limits
  - Empty context handling
  - Source attribution
  - Token tracking
  - API error handling

- **Context Building**
  - Empty context handling
  - Single atom formatting
  - Multiple atom formatting
  - Atom list truncation
  - Relationship inclusion
  - Missing field handling

- **System Prompt**
  - Entity mode prompts
  - Path mode prompts
  - Impact mode prompts
  - Unknown mode fallback

- **User Prompt**
  - Query inclusion
  - Context inclusion
  - Citation instructions

- **Response Formatting**
  - Complete field presence
  - Source metadata
  - Response structure

- **Error Scenarios**
  - Malformed atoms
  - Very long queries
  - Special characters
  - Unicode handling

### Integration Tests

#### RAG API (test_rag_api.py)

- **POST /api/rag/query**
  - Entity mode success
  - Path mode success
  - Impact mode success
  - Custom top_k parameter
  - Atom type filtering
  - Invalid mode rejection
  - chromadb unavailable handling
  - Fallback without Claude
  - No results handling
  - Response structure validation
  - All modes working
  - Default parameters

- **GET /api/rag/health**
  - Overall status
  - Chroma status
  - Chroma not installed
  - Neo4j status
  - Neo4j disconnected
  - Claude availability
  - Full system ready

- **Error Handling**
  - Entity RAG errors
  - Path RAG errors
  - Impact RAG errors
  - Claude generation errors
  - Graceful degradation

- **Integration Scenarios**
  - Complete workflow
  - Multi-mode comparison
  - Health/query consistency

#### Schema Validation (test_schema_validation.py)

- **Atom Schema**
  - Valid atoms (all types)
  - Optional fields
  - Required field validation
  - ID format validation
  - Type enum validation
  - Status and priority validation
  - Alternative ID field
  - All atom types
  - All priority levels

- **Module Schema**
  - Valid modules
  - Modules with atoms
  - Modules with submodules
  - Required field validation
  - Empty field validation

- **Graph Schema**
  - Valid graphs
  - Graphs with metadata
  - Required field validation
  - Node ID/type validation
  - Edge field validation
  - Edge type enum validation
  - All edge types
  - Node/edge consistency

- **Integration Schema Tests**
  - Complete document validation
  - Graph/atom consistency
  - Edge referential integrity

- **Edge Cases**
  - Very long fields
  - Special characters
  - Unicode support
  - Large graphs
  - Deep metadata nesting

## Coverage Report

Generate and view coverage report:

```bash
pytest --cov=api --cov-report=html
```

This creates an HTML report in `htmlcov/index.html`

View coverage in terminal:

```bash
pytest --cov=api --cov-report=term-missing
```

## Configuration

### pytest.ini

Main pytest configuration file with:
- Test discovery patterns
- Custom markers (unit, integration, slow, async)
- Coverage settings
- Output formatting
- Asyncio configuration

### Markers

Use markers to filter tests:

```bash
pytest -m "unit and not slow"
pytest -m "integration"
pytest -m "neo4j"
pytest -m "claude"
```

## Mocking Strategy

### Neo4j Mocking

```python
# In tests
with patch('api.neo4j_client.GraphDatabase.driver') as mock_driver:
    # Mock driver implementation
    client = Neo4jClient()
```

### Claude Mocking

```python
# In tests
with patch('api.claude_client.Anthropic') as mock_anthropic:
    # Mock Anthropic client
    client = ClaudeClient(api_key="test-key")
```

### API Route Mocking

```python
# In integration tests
with patch('api.routes.rag.get_neo4j_client', return_value=mock_neo4j_client):
    with patch('api.routes.rag.get_claude_client', return_value=mock_claude_client):
        response = client.post("/api/rag/query", json={...})
```

## Best Practices

### Writing Tests

1. **Clear Names**: Use descriptive test names that explain what is being tested
   ```python
   def test_find_upstream_dependencies_with_custom_depth()
   ```

2. **Arrange-Act-Assert**: Organize tests in three sections
   ```python
   # Arrange
   atom_id = "REQ-001"

   # Act
   result = client.find_upstream_dependencies(atom_id, max_depth=5)

   # Assert
   assert isinstance(result, list)
   ```

3. **Use Fixtures**: Leverage fixtures for common setup
   ```python
   def test_something(mock_neo4j_client):
       # mock_neo4j_client is automatically injected
   ```

4. **Document Purpose**: Include docstrings explaining the test
   ```python
   def test_find_upstream_dependencies_success(neo4j_client_with_data):
       """
       Test successful upstream dependency retrieval.

       Verifies that the method correctly queries and returns upstream atoms.
       """
   ```

### Parametrized Testing

Use parametrization for testing multiple scenarios:

```python
@pytest.mark.parametrize("rag_mode", ["entity", "path", "impact"])
def test_all_rag_modes(client, rag_mode):
    """Test all RAG modes work correctly."""
    response = client.post("/api/rag/query", json={"rag_mode": rag_mode})
    assert response.status_code == 200
```

### Error Testing

Test error conditions and exceptions:

```python
def test_find_upstream_dependencies_not_connected_raises_error(self):
    """Test that error is raised when not connected."""
    client = Neo4jClient.__new__(Neo4jClient)
    client.driver = None

    with pytest.raises(ConnectionError, match="Not connected"):
        client.find_upstream_dependencies("REQ-001")
```

## Troubleshooting

### Tests Failing

1. **Ensure dependencies installed**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Check environment variables**:
   ```bash
   echo $NEO4J_URI
   echo $ANTHROPIC_API_KEY
   ```

3. **Run with verbose output**:
   ```bash
   pytest -vv tests/unit/test_neo4j_client.py
   ```

4. **Run single test with full output**:
   ```bash
   pytest -vv -s tests/unit/test_neo4j_client.py::TestClass::test_method
   ```

### Mocking Issues

If mocks aren't working:

1. Check import paths in patches
2. Verify mock is applied before class instantiation
3. Use `with patch()` context managers
4. Check return value configuration

### Async Test Issues

For async tests:

```python
@pytest.mark.asyncio
async def test_async_operation():
    result = await some_async_function()
    assert result
```

## Continuous Integration

The test suite is designed for CI/CD integration:

```bash
# Run tests with JUnit output for CI
pytest --junitxml=junit.xml --cov=api --cov-report=xml

# Run tests in parallel
pytest -n auto

# Run with strict markers (no typos)
pytest --strict-markers
```

## Contributing Tests

When contributing new tests:

1. Follow existing naming conventions
2. Add comprehensive docstrings
3. Use appropriate markers (@pytest.mark.unit, etc.)
4. Include both success and error cases
5. Use parametrization for multiple scenarios
6. Update this documentation

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Pytest-mock Documentation](https://pytest-mock.readthedocs.io/)
- [Python unittest.mock](https://docs.python.org/3/library/unittest.mock.html)
- [FastAPI Testing](https://fastapi.tiangolo.com/advanced/testing-dependencies/)
