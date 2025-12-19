# Quick Test Guide - GNDP

## Installation

```bash
pip install -r requirements.txt
```

## Running Tests

### Quick Commands

```bash
# All tests
pytest

# Unit tests only
pytest -m unit

# Integration tests only
pytest -m integration

# With coverage
pytest --cov=api --cov-report=html

# In parallel (faster)
pytest -n auto

# Specific component
pytest tests/unit/test_neo4j_client.py
pytest tests/unit/test_claude_client.py
pytest tests/integration/test_rag_api.py
pytest tests/integration/test_schema_validation.py
```

### Using Test Runner Script

```bash
./run_tests.sh all              # Full suite
./run_tests.sh unit             # Unit tests
./run_tests.sh integration      # Integration tests
./run_tests.sh neo4j            # Neo4j tests
./run_tests.sh claude           # Claude tests
./run_tests.sh rag              # RAG API tests
./run_tests.sh schema           # Schema tests
./run_tests.sh coverage         # Generate HTML report
./run_tests.sh parallel         # Run in parallel
./run_tests.sh help             # Show all options
```

## Test Statistics

| Metric | Count |
|--------|-------|
| Total Test Cases | 145+ |
| Unit Tests | 95+ |
| Integration Tests | 50+ |
| Lines of Test Code | 3,551 |
| Coverage Target | >85% |

## File Structure

```
tests/
├── conftest.py                      # 579 lines - All fixtures
├── unit/
│   ├── test_neo4j_client.py        # 738 lines - 50+ tests
│   └── test_claude_client.py       # 686 lines - 45+ tests
└── integration/
    ├── test_rag_api.py             # 639 lines - 30+ tests
    └── test_schema_validation.py   # 909 lines - 20+ tests

pytest.ini                           # Pytest configuration
TESTING.md                           # 561 lines - Full documentation
TEST_SUMMARY.md                      # 509 lines - Test overview
QUICK_TEST_GUIDE.md                 # This file
run_tests.sh                         # 143 lines - Test runner script
```

## What's Tested

### Neo4j Client (50+ tests)
- Connection initialization
- Upstream/downstream dependency finding
- Full context retrieval
- Implementation chain traversal
- Type-based searches
- Health checks
- Error handling
- Edge cases

### Claude Client (45+ tests)
- Initialization and API key handling
- RAG answer generation (entity, path, impact modes)
- Context building
- System prompt generation
- Response formatting
- Error scenarios
- Token tracking

### RAG API (30+ tests)
- POST /api/rag/query (all modes)
- GET /api/rag/health
- Error handling
- Fallback behavior
- Response structure
- Consistency checks

### Schema Validation (20+ tests)
- Atom schema validation
- Module schema validation
- Graph schema validation
- Edge cases
- Referential integrity
- Unicode/special characters

## Common Issues & Solutions

### Pytest not found
```bash
pip install pytest pytest-cov pytest-mock pytest-asyncio
```

### Import errors
```bash
# Make sure you're in project root
cd f:\Projects\FullSytem
pytest
```

### Mock not working
```bash
# Run with verbose output
pytest -vv tests/unit/test_neo4j_client.py::TestClass::test_method

# Check imports in conftest.py
```

### Coverage report issues
```bash
# Clear cache and regenerate
rm -rf .pytest_cache
pytest --cov=api --cov-report=html
```

## Test Markers

```bash
pytest -m "unit"          # Unit tests
pytest -m "integration"   # Integration tests
pytest -m "slow"          # Slow tests
pytest -m "not slow"      # Fast tests only
pytest -m "async"         # Async tests
```

## Detailed Documentation

- **TESTING.md** - Comprehensive guide with examples
- **TEST_SUMMARY.md** - Complete test inventory and structure

## Example Test Runs

### Run single test
```bash
pytest tests/unit/test_neo4j_client.py::TestNeo4jClientInitialization::test_initialization_with_explicit_parameters -vv
```

### Run tests by class
```bash
pytest tests/unit/test_neo4j_client.py::TestUpstreamDependencies -v
```

### Run with specific markers
```bash
pytest -m "unit and not slow" -v
```

### Generate coverage report and open
```bash
pytest --cov=api --cov-report=html
```

## Continuous Integration

```bash
# JUnit output for CI
pytest --junitxml=junit.xml

# XML coverage for SonarQube
pytest --cov=api --cov-report=xml

# Parallel execution (faster)
pytest -n auto
```

## Key Features

✅ **Comprehensive**: 145+ test cases covering all major components
✅ **Documented**: Every test has clear docstrings and examples
✅ **Modular**: Fixtures for easy reuse and composition
✅ **Isolated**: Proper mocking to avoid external dependencies
✅ **Professional**: Type hints, markers, parametrization
✅ **Fast**: Parallel execution support for quick feedback
✅ **Extensible**: Easy to add new tests following patterns

## Need Help?

1. See `TESTING.md` for detailed documentation
2. Check test examples in the test files
3. Run with `-vv` flag for verbose output
4. Use `-s` to see print statements
5. Check `run_tests.sh help` for all options
