# Testing Guide

**System**: GNDP - Graph-Native Documentation Platform
**Version**: 1.0.0
**Last Updated**: 2025-12-25

---

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [API Testing](#api-testing)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Continuous Integration](#continuous-integration)

---

## Testing Strategy

### Testing Pyramid

```
        /\
       /E2E\        ← End-to-End Tests (10%)
      /------\
     /  API   \     ← API/Integration Tests (30%)
    /----------\
   /    Unit    \   ← Unit Tests (60%)
  /--------------\
```

### Coverage Goals

- **Unit Tests**: 80% code coverage minimum
- **Integration Tests**: All critical workflows
- **E2E Tests**: Core user journeys
- **API Tests**: 100% endpoint coverage

---

## Unit Testing

### Backend Unit Tests (Python)

#### Setup

```bash
# Install test dependencies
pip install pytest pytest-cov pytest-asyncio pytest-mock

# Create pytest.ini
cat > pytest.ini <<EOF
[pytest]
testpaths = tests/unit
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
EOF
```

#### Example Unit Tests

**Test File**: `tests/unit/test_atom_validation.py`

```python
import pytest
from pathlib import Path
from api.validation import validate_atom_schema

class TestAtomValidation:
    """Test atom schema validation"""

    def test_valid_atom_passes(self):
        """Valid atom should pass validation"""
        atom = {
            "id": "atom-test-001",
            "type": "process",
            "title": "Test Process",
            "summary": "Test summary",
            "content": {"steps": ["Step 1"]},
            "metadata": {
                "owner": "test-team",
                "status": "active"
            }
        }

        result = validate_atom_schema(atom)
        assert result.is_valid
        assert len(result.errors) == 0

    def test_missing_required_field_fails(self):
        """Atom missing required field should fail"""
        atom = {
            "id": "atom-test-002",
            "type": "process"
            # Missing title, summary, content
        }

        result = validate_atom_schema(atom)
        assert not result.is_valid
        assert "title" in str(result.errors)

    def test_invalid_type_fails(self):
        """Atom with invalid type should fail"""
        atom = {
            "id": "atom-test-003",
            "type": "invalid_type",
            "title": "Test",
            "summary": "Test",
            "content": {}
        }

        result = validate_atom_schema(atom)
        assert not result.is_valid
```

**Test File**: `tests/unit/test_graph_traversal.py`

```python
import pytest
from api.graph import GraphTraversal

class TestGraphTraversal:
    """Test graph traversal algorithms"""

    @pytest.fixture
    def sample_graph(self):
        """Create sample graph for testing"""
        return {
            "nodes": [
                {"id": "A", "type": "atom"},
                {"id": "B", "type": "atom"},
                {"id": "C", "type": "atom"}
            ],
            "edges": [
                {"from": "A", "to": "B", "type": "DEPENDS_ON"},
                {"from": "B", "to": "C", "type": "DEPENDS_ON"}
            ]
        }

    def test_find_downstream_dependencies(self, sample_graph):
        """Should find all downstream dependencies"""
        traversal = GraphTraversal(sample_graph)
        downstream = traversal.get_downstream("A")

        assert len(downstream) == 2
        assert "B" in downstream
        assert "C" in downstream

    def test_detect_circular_dependency(self):
        """Should detect circular dependencies"""
        circular_graph = {
            "nodes": [{"id": "A"}, {"id": "B"}],
            "edges": [
                {"from": "A", "to": "B"},
                {"from": "B", "to": "A"}
            ]
        }

        traversal = GraphTraversal(circular_graph)
        assert traversal.has_circular_dependency()
```

#### Running Unit Tests

```bash
# Run all unit tests
pytest tests/unit/

# Run with coverage
pytest tests/unit/ --cov=api --cov-report=html

# Run specific test file
pytest tests/unit/test_atom_validation.py

# Run specific test
pytest tests/unit/test_atom_validation.py::TestAtomValidation::test_valid_atom_passes

# Run with verbose output
pytest tests/unit/ -v

# Run and show print statements
pytest tests/unit/ -s
```

### Frontend Unit Tests (React/TypeScript)

#### Setup

```bash
# Install test dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event vitest jsdom

# Create vitest.config.ts
cat > vitest.config.ts <<EOF
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    }
  }
})
EOF
```

#### Example Component Tests

**Test File**: `tests/unit/OptimizationDashboard.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OptimizationDashboard from '../components/OptimizationDashboard';

describe('OptimizationDashboard', () => {
  it('renders dashboard title', () => {
    render(<OptimizationDashboard />);
    expect(screen.getByText(/System Optimization/i)).toBeInTheDocument();
  });

  it('displays suggestions when loaded', async () => {
    const mockSuggestions = [
      {
        id: 'sug-1',
        type: 'quality',
        title: 'Improve validation',
        severity: 'medium'
      }
    ];

    render(<OptimizationDashboard suggestions={mockSuggestions} />);

    await waitFor(() => {
      expect(screen.getByText('Improve validation')).toBeInTheDocument();
    });
  });

  it('filters suggestions by type', async () => {
    const mockSuggestions = [
      { id: 'sug-1', type: 'quality', title: 'Quality Issue' },
      { id: 'sug-2', type: 'performance', title: 'Perf Issue' }
    ];

    render(<OptimizationDashboard suggestions={mockSuggestions} />);

    const filter = screen.getByLabelText(/filter by type/i);
    fireEvent.change(filter, { target: { value: 'quality' } });

    expect(screen.getByText('Quality Issue')).toBeInTheDocument();
    expect(screen.queryByText('Perf Issue')).not.toBeInTheDocument();
  });

  it('calls apply handler when apply button clicked', async () => {
    const mockApply = vi.fn();
    const suggestion = { id: 'sug-1', type: 'quality', title: 'Test' };

    render(
      <OptimizationDashboard
        suggestions={[suggestion]}
        onApply={mockApply}
      />
    );

    const applyButton = screen.getByText(/Apply/i);
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockApply).toHaveBeenCalledWith('sug-1');
    });
  });
});
```

#### Running Frontend Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test OptimizationDashboard.test.tsx
```

---

## Integration Testing

### Backend Integration Tests

**Test File**: `tests/integration/test_api_endpoints.py`

```python
import pytest
from fastapi.testclient import TestClient
from api.server import app

class TestAPIEndpoints:
    """Test API endpoint integration"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    def test_get_atoms_returns_list(self, client):
        """GET /api/atoms should return list of atoms"""
        response = client.get("/api/atoms")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_get_atom_by_id(self, client):
        """GET /api/atoms/{id} should return specific atom"""
        response = client.get("/api/atoms/atom-cust-kyc")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "atom-cust-kyc"
        assert "title" in data
        assert "content" in data

    def test_get_nonexistent_atom_returns_404(self, client):
        """GET /api/atoms/{id} with invalid id should return 404"""
        response = client.get("/api/atoms/nonexistent")
        assert response.status_code == 404

    def test_graph_api_returns_valid_structure(self, client):
        """GET /api/graph/full should return valid graph"""
        response = client.get("/api/graph/full")

        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data
        assert isinstance(data["nodes"], list)
        assert isinstance(data["edges"], list)
```

**Test File**: `tests/integration/test_rag_pipeline.py`

```python
import pytest
from api.rag import RAGPipeline

class TestRAGPipeline:
    """Test RAG system integration"""

    @pytest.fixture
    async def rag_pipeline(self):
        """Initialize RAG pipeline"""
        pipeline = RAGPipeline()
        await pipeline.initialize()
        return pipeline

    @pytest.mark.asyncio
    async def test_document_indexing(self, rag_pipeline):
        """Should index document and retrieve it"""
        doc = {
            "id": "test-doc-001",
            "content": "This is a test document about mortgage processes"
        }

        # Index document
        await rag_pipeline.index_document(doc)

        # Query for document
        results = await rag_pipeline.query("mortgage processes")

        assert len(results) > 0
        assert results[0]["id"] == "test-doc-001"

    @pytest.mark.asyncio
    async def test_semantic_search(self, rag_pipeline):
        """Should find semantically similar documents"""
        # Index multiple documents
        docs = [
            {"id": "doc-1", "content": "Customer onboarding process"},
            {"id": "doc-2", "content": "Income verification steps"},
            {"id": "doc-3", "content": "Loan closing procedures"}
        ]

        for doc in docs:
            await rag_pipeline.index_document(doc)

        # Search with semantic query
        results = await rag_pipeline.query("how to verify customer income")

        # Should prioritize income verification document
        assert results[0]["id"] == "doc-2"
```

### Running Integration Tests

```bash
# Run integration tests
pytest tests/integration/

# Run with database setup/teardown
pytest tests/integration/ --setup-db

# Run specific integration test
pytest tests/integration/test_api_endpoints.py
```

---

## End-to-End Testing

### E2E Test Setup (Playwright)

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Initialize Playwright
npx playwright install
```

**Test File**: `tests/e2e/user-workflows.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Core User Workflows', () => {

  test('User can browse atoms and view details', async ({ page }) => {
    // Navigate to home
    await page.goto('http://localhost:5173');

    // Click on atom explorer
    await page.click('text=Explore Atoms');

    // Wait for atoms to load
    await page.waitForSelector('[data-testid="atom-card"]');

    // Should see multiple atoms
    const atomCards = await page.$$('[data-testid="atom-card"]');
    expect(atomCards.length).toBeGreaterThan(0);

    // Click first atom
    await atomCards[0].click();

    // Should see atom details
    await expect(page.locator('text=Atom Details')).toBeVisible();
    await expect(page.locator('[data-testid="atom-content"]')).toBeVisible();
  });

  test('User can search and filter atoms', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Enter search query
    await page.fill('[data-testid="search-input"]', 'customer');

    // Results should filter
    await page.waitForTimeout(500);
    const results = await page.$$('[data-testid="atom-card"]');

    // Verify results contain search term
    for (const result of results) {
      const text = await result.textContent();
      expect(text?.toLowerCase()).toContain('customer');
    }
  });

  test('User can compile and download document', async ({ page }) => {
    await page.goto('http://localhost:5173/publisher');

    // Select module
    await page.click('[data-testid="module-selector"]');
    await page.click('text=Income Verification');

    // Select template
    await page.click('text=SOP');

    // Click compile
    await page.click('text=Compile');

    // Wait for compilation
    await page.waitForSelector('text=Compiled Output', { timeout: 10000 });

    // Download button should appear
    await expect(page.locator('text=Download .md')).toBeVisible();
  });

  test('AI Assistant responds to queries', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Click AI Assistant
    await page.click('[data-testid="ai-assistant-toggle"]');

    // Enter query
    await page.fill('[data-testid="ai-input"]', 'What is the customer onboarding process?');
    await page.press('[data-testid="ai-input"]', 'Enter');

    // Should show response
    await page.waitForSelector('[data-testid="ai-response"]', { timeout: 15000 });

    const response = await page.textContent('[data-testid="ai-response"]');
    expect(response).toBeTruthy();
    expect(response!.length).toBeGreaterThan(50);
  });
});
```

### Running E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test user-workflows.spec.ts

# Run with specific browser
npx playwright test --project=chromium

# Debug mode
npx playwright test --debug
```

---

## API Testing

### Postman Collection

Create `tests/api/gndp-api.postman_collection.json`:

```json
{
  "info": {
    "name": "GNDP API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      },
      "test": "pm.test('Status is 200', () => pm.response.to.have.status(200));"
    },
    {
      "name": "Get All Atoms",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/atoms"
      },
      "test": "pm.test('Returns array', () => pm.expect(pm.response.json()).to.be.an('array'));"
    },
    {
      "name": "Get Specific Atom",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/atoms/atom-cust-kyc"
      },
      "test": "pm.test('Has required fields', () => {\n  const data = pm.response.json();\n  pm.expect(data).to.have.property('id');\n  pm.expect(data).to.have.property('title');\n});"
    }
  ]
}
```

### API Test Automation with Newman

```bash
# Install Newman
npm install -g newman

# Run Postman collection
newman run tests/api/gndp-api.postman_collection.json \
  --environment tests/api/production.postman_environment.json
```

---

## Performance Testing

### Load Testing with Locust

**Test File**: `tests/performance/locustfile.py`

```python
from locust import HttpUser, task, between

class GNDPUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def get_atoms(self):
        """Get atoms list - high frequency"""
        self.client.get("/api/atoms")

    @task(2)
    def get_specific_atom(self):
        """Get specific atom - medium frequency"""
        self.client.get("/api/atoms/atom-cust-kyc")

    @task(1)
    def get_graph(self):
        """Get full graph - low frequency"""
        self.client.get("/api/graph/full")

    @task(1)
    def rag_query(self):
        """RAG query - low frequency"""
        self.client.post("/api/rag/query", json={
            "query": "What is the customer onboarding process?",
            "top_k": 5
        })

    def on_start(self):
        """Called when user starts"""
        # Health check
        self.client.get("/health")
```

#### Running Load Tests

```bash
# Install Locust
pip install locust

# Run load test
locust -f tests/performance/locustfile.py --host=http://localhost:8000

# Headless mode with specific users
locust -f tests/performance/locustfile.py \
  --host=http://localhost:8000 \
  --users 50 \
  --spawn-rate 5 \
  --run-time 5m \
  --headless
```

### Performance Benchmarks

**Target Metrics:**
- API Response Time (p95): < 2000ms
- Database Query Time: < 500ms
- Frontend Load Time: < 3s
- RAG Query Time: < 3000ms

**Test File**: `tests/performance/benchmark.py`

```python
import time
import statistics
import requests

def benchmark_endpoint(url, iterations=100):
    """Benchmark an endpoint"""
    times = []

    for _ in range(iterations):
        start = time.time()
        response = requests.get(url)
        end = time.time()

        if response.status_code == 200:
            times.append((end - start) * 1000)  # Convert to ms

    return {
        "p50": statistics.median(times),
        "p95": statistics.quantiles(times, n=20)[18],  # 95th percentile
        "p99": statistics.quantiles(times, n=100)[98],
        "mean": statistics.mean(times),
        "min": min(times),
        "max": max(times)
    }

if __name__ == "__main__":
    print("Benchmarking /api/atoms...")
    results = benchmark_endpoint("http://localhost:8000/api/atoms")

    print(f"p50: {results['p50']:.2f}ms")
    print(f"p95: {results['p95']:.2f}ms")
    print(f"p99: {results['p99']:.2f}ms")

    # Assert performance targets
    assert results['p95'] < 2000, f"p95 latency {results['p95']}ms exceeds target"
```

---

## Security Testing

### Vulnerability Scanning

```bash
# Python dependencies
pip install safety
safety check

# Node dependencies
npm audit

# Fix vulnerabilities
npm audit fix
```

### OWASP ZAP Scanning

```bash
# Install ZAP
docker pull owasp/zap2docker-stable

# Run baseline scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:5173

# Full scan (takes longer)
docker run -t owasp/zap2docker-stable zap-full-scan.py \
  -t http://localhost:5173
```

### Security Test Cases

**Test File**: `tests/security/test_auth.py`

```python
import pytest
from fastapi.testclient import TestClient

class TestSecurityControls:
    """Test security controls"""

    def test_api_requires_authentication(self, client):
        """Protected endpoints should require auth"""
        response = client.post("/api/admin/reset")
        assert response.status_code == 401

    def test_sql_injection_prevented(self, client):
        """Should prevent SQL injection"""
        malicious_input = "'; DROP TABLE atoms; --"
        response = client.get(f"/api/atoms/{malicious_input}")

        # Should return 404, not execute SQL
        assert response.status_code == 404

    def test_xss_prevention(self, client):
        """Should sanitize XSS attempts"""
        xss_payload = "<script>alert('XSS')</script>"
        response = client.post("/api/feedback", json={
            "message": xss_payload
        })

        # Should sanitize output
        data = response.json()
        assert "<script>" not in str(data)
```

---

## Continuous Integration

### GitHub Actions Workflow

**File**: `.github/workflows/tests.yml`

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov

      - name: Run unit tests
        run: pytest tests/unit/ --cov=api --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run frontend tests
        run: npm test -- --coverage

  integration-tests:
    runs-on: ubuntu-latest

    services:
      neo4j:
        image: neo4j:5-community
        env:
          NEO4J_AUTH: neo4j/testpassword
        ports:
          - 7687:7687

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run integration tests
        run: pytest tests/integration/
        env:
          NEO4J_URI: bolt://localhost:7687
          NEO4J_USER: neo4j
          NEO4J_PASSWORD: testpassword

  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Start application
        run: |
          npm run build
          npm run preview &
          sleep 10

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Data Management

### Fixtures

**File**: `tests/fixtures/atoms.json`

```json
[
  {
    "id": "test-atom-001",
    "type": "process",
    "title": "Test Customer Onboarding",
    "summary": "Test process for customer onboarding",
    "content": {
      "steps": [
        "Collect customer information",
        "Verify identity",
        "Complete KYC"
      ]
    },
    "metadata": {
      "owner": "test-team",
      "status": "active"
    }
  }
]
```

### Test Database Seeding

```python
# tests/conftest.py
import pytest
import json
from pathlib import Path

@pytest.fixture(scope="session")
def test_atoms():
    """Load test atom fixtures"""
    fixture_path = Path(__file__).parent / "fixtures" / "atoms.json"
    with open(fixture_path) as f:
        return json.load(f)

@pytest.fixture
async def seed_database(test_atoms):
    """Seed database with test data"""
    from api.database import db

    # Clear existing test data
    await db.clear_test_data()

    # Insert fixtures
    for atom in test_atoms:
        await db.insert_atom(atom)

    yield

    # Cleanup
    await db.clear_test_data()
```

---

## Best Practices

### 1. Test Naming Convention

```python
# Good
def test_atom_validation_passes_with_valid_data():
    pass

def test_atom_validation_fails_when_missing_title():
    pass

# Bad
def test_validation():
    pass

def test1():
    pass
```

### 2. AAA Pattern (Arrange-Act-Assert)

```python
def test_create_atom():
    # Arrange
    atom_data = {"id": "test", "title": "Test"}

    # Act
    result = create_atom(atom_data)

    # Assert
    assert result.id == "test"
    assert result.title == "Test"
```

### 3. Test Independence

```python
# Each test should be independent
@pytest.fixture(autouse=True)
def reset_state():
    """Reset state before each test"""
    database.clear()
    cache.flush()
    yield
```

### 4. Mock External Dependencies

```python
from unittest.mock import patch

def test_api_call_with_mock():
    with patch('api.external.gemini_api.query') as mock_query:
        mock_query.return_value = {"response": "test"}

        result = our_function_that_calls_gemini()

        assert result == {"response": "test"}
        mock_query.assert_called_once()
```

---

## Coverage Reports

```bash
# Generate HTML coverage report (Python)
pytest --cov=api --cov-report=html
open htmlcov/index.html

# Generate coverage report (Frontend)
npm test -- --coverage
open coverage/index.html
```

---

## Continuous Monitoring

### Test Health Dashboard

Track over time:
- Test pass rate
- Code coverage percentage
- Test execution time
- Flaky test identification

---

**Document Version**: 1.0
**Last Reviewed**: 2025-12-25
**Next Review**: 2026-01-25
