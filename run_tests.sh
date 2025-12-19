#!/bin/bash
# GNDP Test Runner Script
# Convenient script for running different test suites

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Parse arguments
case "${1:-all}" in
    all)
        print_header "Running Full Test Suite"
        pytest --cov=api --cov-report=html --cov-report=term-missing -v
        print_success "Full test suite completed"
        ;;

    unit)
        print_header "Running Unit Tests"
        pytest tests/unit -v --cov=api --cov-report=term-missing
        print_success "Unit tests completed"
        ;;

    integration)
        print_header "Running Integration Tests"
        pytest tests/integration -v --cov=api --cov-report=term-missing
        print_success "Integration tests completed"
        ;;

    neo4j)
        print_header "Running Neo4j Client Tests"
        pytest tests/unit/test_neo4j_client.py -v --cov=api.neo4j_client
        print_success "Neo4j tests completed"
        ;;

    claude)
        print_header "Running Claude Client Tests"
        pytest tests/unit/test_claude_client.py -v --cov=api.claude_client
        print_success "Claude tests completed"
        ;;

    rag)
        print_header "Running RAG API Tests"
        pytest tests/integration/test_rag_api.py -v --cov=api.routes.rag
        print_success "RAG API tests completed"
        ;;

    schema)
        print_header "Running Schema Validation Tests"
        pytest tests/integration/test_schema_validation.py -v
        print_success "Schema validation tests completed"
        ;;

    fast)
        print_header "Running Fast Tests (excluding slow)"
        pytest -v -m "not slow" --cov=api --cov-report=term-missing
        print_success "Fast tests completed"
        ;;

    slow)
        print_header "Running All Tests Including Slow"
        pytest -v --cov=api --cov-report=term-missing
        print_success "All tests including slow completed"
        ;;

    parallel)
        print_header "Running Tests in Parallel"
        pytest -n auto -v --cov=api --cov-report=term-missing
        print_success "Parallel tests completed"
        ;;

    coverage)
        print_header "Generating Coverage Report"
        pytest --cov=api --cov-report=html --cov-report=term-missing -v
        print_success "Coverage report generated in htmlcov/index.html"
        if command -v xdg-open &> /dev/null; then
            xdg-open htmlcov/index.html
        elif command -v open &> /dev/null; then
            open htmlcov/index.html
        fi
        ;;

    markers)
        print_header "Available Markers"
        pytest --markers
        ;;

    list)
        print_header "Available Tests"
        pytest --collect-only -q
        ;;

    help|--help|-h)
        echo "GNDP Test Runner"
        echo ""
        echo "Usage: ./run_tests.sh [COMMAND]"
        echo ""
        echo "Commands:"
        echo "  all           Run full test suite (default)"
        echo "  unit          Run unit tests only"
        echo "  integration   Run integration tests only"
        echo "  neo4j         Run Neo4j client tests"
        echo "  claude        Run Claude client tests"
        echo "  rag           Run RAG API tests"
        echo "  schema        Run schema validation tests"
        echo "  fast          Run fast tests (excluding slow)"
        echo "  slow          Run all tests including slow"
        echo "  parallel      Run tests in parallel (faster)"
        echo "  coverage      Generate HTML coverage report"
        echo "  markers       Show available pytest markers"
        echo "  list          List all available tests"
        echo "  help          Show this help message"
        echo ""
        echo "Examples:"
        echo "  ./run_tests.sh unit"
        echo "  ./run_tests.sh neo4j"
        echo "  ./run_tests.sh coverage"
        ;;

    *)
        print_warning "Unknown command: $1"
        echo "Run './run_tests.sh help' for usage information"
        exit 1
        ;;
esac
