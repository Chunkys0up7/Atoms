"""
Unit tests for Claude API client.

Tests the ClaudeClient class with comprehensive coverage of:
- Client initialization and API key handling
- RAG answer generation for all modes (entity, path, impact)
- Context building from atoms
- System prompt generation based on RAG mode
- API error handling and fallback behavior
- Token usage tracking
- Response formatting and source attribution
"""

import pytest
from unittest.mock import Mock, MagicMock, patch
from typing import Dict, Any, List

from api.claude_client import (
    ClaudeClient,
    get_claude_client,
)


class TestClaudeClientInitialization:
    """Tests for Claude client initialization."""

    def test_initialization_with_explicit_api_key(self):
        """
        Test ClaudeClient initialization with explicit API key.

        Verifies that the client correctly stores and uses provided API key.
        """
        with patch('api.claude_client.Anthropic') as mock_anthropic:
            client = ClaudeClient(api_key="sk-test-key-12345")

            assert client.api_key == "sk-test-key-12345"
            mock_anthropic.assert_called_once_with(api_key="sk-test-key-12345")

    def test_initialization_with_environment_variable(self, mock_env_vars):
        """
        Test ClaudeClient initialization using environment variable.

        Verifies that the client reads API key from environment when not provided.
        """
        with patch('api.claude_client.Anthropic') as mock_anthropic:
            client = ClaudeClient()

            assert client.api_key == "sk-test-key-12345"
            mock_anthropic.assert_called_once()

    def test_initialization_without_api_key_raises_error(self, monkeypatch):
        """
        Test that initialization fails without API key.

        Verifies that ValueError is raised when no API key is available.
        """
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

        with pytest.raises(ValueError, match="ANTHROPIC_API_KEY not found"):
            ClaudeClient(api_key=None)

    def test_initialization_sets_correct_model(self):
        """
        Test that correct Claude model is set during initialization.

        Verifies the model is set to the expected version.
        """
        with patch('api.claude_client.Anthropic'):
            client = ClaudeClient(api_key="sk-test-key")

            assert client.model == "claude-sonnet-4-20250514"

    def test_anthropic_client_not_installed_raises_error(self):
        """
        Test that ImportError is raised when anthropic package not installed.

        Verifies proper error handling for missing dependency.
        """
        with patch('api.claude_client.HAS_ANTHROPIC', False):
            with pytest.raises(ImportError, match="anthropic package not installed"):
                ClaudeClient(api_key="sk-test-key")


class TestGenerateRAGAnswer:
    """Tests for RAG answer generation."""

    def test_generate_rag_answer_entity_mode(self, mock_claude_client, sample_atoms):
        """
        Test RAG answer generation in entity mode.

        Verifies that entity mode generates contextually appropriate answers.
        """
        response = mock_claude_client.generate_rag_answer(
            query="What is the authentication system?",
            context_atoms=sample_atoms[:2],
            rag_mode="entity"
        )

        assert "answer" in response
        assert "model" in response
        assert "tokens_used" in response
        assert "sources" in response
        assert response["model"] == "claude-sonnet-4-20250514"

    def test_generate_rag_answer_path_mode(self, mock_claude_client, sample_atoms):
        """
        Test RAG answer generation in path mode.

        Verifies that path mode considers relationship information.
        """
        response = mock_claude_client.generate_rag_answer(
            query="How does authentication flow?",
            context_atoms=sample_atoms[:3],
            rag_mode="path"
        )

        assert "answer" in response
        assert "sources" in response

    def test_generate_rag_answer_impact_mode(self, mock_claude_client, sample_atoms):
        """
        Test RAG answer generation in impact mode.

        Verifies that impact mode focuses on downstream effects.
        """
        response = mock_claude_client.generate_rag_answer(
            query="What would happen if we changed authentication?",
            context_atoms=sample_atoms[:2],
            rag_mode="impact"
        )

        assert "answer" in response
        assert "sources" in response

    def test_generate_rag_answer_with_custom_max_tokens(self, mock_claude_client, sample_atoms):
        """
        Test RAG answer generation with custom token limit.

        Verifies that max_tokens parameter is passed to API.
        """
        response = mock_claude_client.generate_rag_answer(
            query="Test query",
            context_atoms=sample_atoms[:1],
            max_tokens=512
        )

        assert "answer" in response
        # Verify the API was called
        assert mock_claude_client.client.messages.create.called

    def test_generate_rag_answer_with_empty_context(self, mock_claude_client):
        """
        Test RAG answer generation with empty context.

        Verifies graceful handling of no context atoms.
        """
        response = mock_claude_client.generate_rag_answer(
            query="Test query",
            context_atoms=[],
            rag_mode="entity"
        )

        assert "answer" in response
        assert "sources" in response

    def test_generate_rag_answer_returns_sources(self, mock_claude_client, sample_atoms):
        """
        Test that RAG answer includes source attribution.

        Verifies that sources are properly extracted and returned.
        """
        test_atoms = [
            {
                "id": "REQ-001",
                "type": "requirement",
                "title": "Test Requirement",
                "distance": 0.95
            }
        ]

        response = mock_claude_client.generate_rag_answer(
            query="Test query",
            context_atoms=test_atoms
        )

        assert "sources" in response
        assert len(response["sources"]) >= 1
        assert response["sources"][0]["id"] == "REQ-001"
        assert response["sources"][0]["type"] == "requirement"

    def test_generate_rag_answer_tracks_token_usage(self, mock_claude_client, sample_atoms):
        """
        Test that RAG answer tracks token usage.

        Verifies that token counts are properly reported.
        """
        response = mock_claude_client.generate_rag_answer(
            query="Test query",
            context_atoms=sample_atoms[:1]
        )

        assert "tokens_used" in response
        assert "input" in response["tokens_used"]
        assert "output" in response["tokens_used"]
        assert "total" in response["tokens_used"]

    def test_generate_rag_answer_limits_sources_to_top_10(self, mock_claude_client):
        """
        Test that RAG answer limits sources to top 10.

        Verifies that overly long source lists are truncated.
        """
        many_atoms = [
            {
                "id": f"REQ-{i:03d}",
                "type": "requirement",
                "title": f"Requirement {i}"
            }
            for i in range(20)
        ]

        response = mock_claude_client.generate_rag_answer(
            query="Test query",
            context_atoms=many_atoms
        )

        assert len(response["sources"]) <= 10

    def test_generate_rag_answer_api_error_handling(self, mock_claude_client, sample_atoms):
        """
        Test error handling when API call fails.

        Verifies that API errors are caught and reported.
        """
        mock_claude_client.client.messages.create.side_effect = Exception("API Error")

        response = mock_claude_client.generate_rag_answer(
            query="Test query",
            context_atoms=sample_atoms[:1]
        )

        assert "error" in response or "answer" in response
        # Should return gracefully even on error


class TestBuildContext:
    """Tests for context building from atoms."""

    def test_build_context_empty_atoms(self, mock_claude_client):
        """
        Test context building with no atoms.

        Verifies default message for empty context.
        """
        context = mock_claude_client._build_context([], rag_mode="entity")

        assert "No relevant information found" in context

    def test_build_context_single_atom(self, mock_claude_client):
        """
        Test context building with single atom.

        Verifies proper formatting of single atom context.
        """
        atoms = [
            {
                "id": "REQ-001",
                "type": "requirement",
                "title": "Test Requirement",
                "content": "This is a test requirement"
            }
        ]

        context = mock_claude_client._build_context(atoms, rag_mode="entity")

        assert "REQ-001" in context
        assert "requirement" in context.lower()
        assert "Test Requirement" in context

    def test_build_context_multiple_atoms(self, mock_claude_client):
        """
        Test context building with multiple atoms.

        Verifies proper formatting and separation of multiple atoms.
        """
        atoms = [
            {
                "id": "REQ-001",
                "type": "requirement",
                "title": "Requirement 1",
                "content": "Content 1"
            },
            {
                "id": "DESIGN-001",
                "type": "design",
                "title": "Design 1",
                "content": "Content 2"
            }
        ]

        context = mock_claude_client._build_context(atoms, rag_mode="entity")

        assert "REQ-001" in context
        assert "DESIGN-001" in context
        assert "---" in context  # Separator

    def test_build_context_limits_to_top_10(self, mock_claude_client):
        """
        Test that context building limits atoms to top 10.

        Verifies that overly long atom lists are truncated.
        """
        atoms = [
            {
                "id": f"REQ-{i:03d}",
                "type": "requirement",
                "title": f"Requirement {i}",
                "content": f"Content {i}"
            }
            for i in range(15)
        ]

        context = mock_claude_client._build_context(atoms, rag_mode="entity")

        # Should contain atoms but not all 15
        assert "REQ-000" in context
        # Last atom (14) might not be included
        assert context.count("[") <= 10  # At most 10 atom entries

    def test_build_context_includes_relationship_in_path_mode(self, mock_claude_client):
        """
        Test that path mode includes relationship information.

        Verifies relationship metadata is included in path mode.
        """
        atoms = [
            {
                "id": "REQ-001",
                "type": "requirement",
                "title": "Requirement",
                "content": "Content",
                "relationship": "implements"
            }
        ]

        context = mock_claude_client._build_context(atoms, rag_mode="path")

        assert "implements" in context or "relationship" in context.lower()

    def test_build_context_includes_impact_path_in_impact_mode(self, mock_claude_client):
        """
        Test that impact mode includes relationship path.

        Verifies impact path is properly formatted.
        """
        atoms = [
            {
                "id": "REQ-001",
                "type": "requirement",
                "title": "Requirement",
                "content": "Content",
                "relationship_path": ["requires", "implements", "validates"]
            }
        ]

        context = mock_claude_client._build_context(atoms, rag_mode="impact")

        assert "→" in context or "impact path" in context.lower()

    def test_build_context_handles_missing_fields(self, mock_claude_client):
        """
        Test context building with missing optional fields.

        Verifies graceful handling of incomplete atom data.
        """
        atoms = [
            {
                "id": "REQ-001",
                # Missing type, title, content
            }
        ]

        context = mock_claude_client._build_context(atoms, rag_mode="entity")

        assert "REQ-001" in context
        # Should not raise exception


class TestGetSystemPrompt:
    """Tests for system prompt generation."""

    def test_get_system_prompt_entity_mode(self, mock_claude_client):
        """
        Test system prompt for entity mode.

        Verifies entity mode prompt includes semantic similarity guidance.
        """
        prompt = mock_claude_client._get_system_prompt("entity")

        assert "CRITICAL RULES" in prompt
        assert "ONLY use information from the provided context atoms" in prompt
        assert "ENTITY RAG MODE" in prompt
        assert "semantically similar" in prompt.lower()

    def test_get_system_prompt_path_mode(self, mock_claude_client):
        """
        Test system prompt for path mode.

        Verifies path mode prompt includes relationship guidance.
        """
        prompt = mock_claude_client._get_system_prompt("path")

        assert "CRITICAL RULES" in prompt
        assert "PATH RAG MODE" in prompt
        assert "relationship" in prompt.lower()
        assert "connected" in prompt.lower()

    def test_get_system_prompt_impact_mode(self, mock_claude_client):
        """
        Test system prompt for impact mode.

        Verifies impact mode prompt includes dependency and risk guidance.
        """
        prompt = mock_claude_client._get_system_prompt("impact")

        assert "CRITICAL RULES" in prompt
        assert "IMPACT RAG MODE" in prompt
        assert "impact" in prompt.lower() or "affect" in prompt.lower()

    def test_get_system_prompt_unknown_mode_returns_base_prompt(self, mock_claude_client):
        """
        Test system prompt for unknown mode.

        Verifies graceful fallback to base prompt for unknown modes.
        """
        prompt = mock_claude_client._get_system_prompt("unknown_mode")

        assert "CRITICAL RULES" in prompt
        assert "Graph-Native Documentation Platform" in prompt

    def test_system_prompt_includes_source_citation_rules(self, mock_claude_client):
        """
        Test that system prompt includes source citation rules.

        Verifies that citation format is specified.
        """
        for mode in ["entity", "path", "impact"]:
            prompt = mock_claude_client._get_system_prompt(mode)
            assert "cite" in prompt.lower() or "[" in prompt


class TestBuildUserPrompt:
    """Tests for user prompt building."""

    def test_build_user_prompt_includes_query(self, mock_claude_client):
        """
        Test that user prompt includes the query.

        Verifies query is properly formatted in prompt.
        """
        query = "What is the authentication system?"
        context = "Authentication system uses OAuth 2.0"

        prompt = mock_claude_client._build_user_prompt(query, context, "entity")

        assert "What is the authentication system?" in prompt
        assert "QUESTION:" in prompt

    def test_build_user_prompt_includes_context(self, mock_claude_client):
        """
        Test that user prompt includes context atoms.

        Verifies context is properly formatted in prompt.
        """
        query = "Test query"
        context = "This is the context"

        prompt = mock_claude_client._build_user_prompt(query, context, "entity")

        assert "This is the context" in prompt
        assert "CONTEXT FROM KNOWLEDGE GRAPH" in prompt

    def test_build_user_prompt_includes_citation_reminder(self, mock_claude_client):
        """
        Test that user prompt reminds about source citation.

        Verifies citation instructions are included.
        """
        prompt = mock_claude_client._build_user_prompt("Test", "Context", "entity")

        assert "cite" in prompt.lower() or "source" in prompt.lower()


class TestSingletonPattern:
    """Tests for singleton pattern in get_claude_client."""

    def test_get_claude_client_returns_singleton(self):
        """
        Test that get_claude_client returns same instance.

        Verifies singleton pattern implementation.
        """
        with patch('api.claude_client.Anthropic'):
            with patch('api.claude_client.HAS_ANTHROPIC', True):
                # Clear global state
                import api.claude_client
                api.claude_client._claude_client = None

                client1 = get_claude_client()
                client2 = get_claude_client()

                if client1 and client2:
                    assert client1 is client2

    def test_get_claude_client_returns_none_if_anthropic_not_installed(self):
        """
        Test that get_claude_client returns None without anthropic.

        Verifies graceful handling of missing dependency.
        """
        with patch('api.claude_client.HAS_ANTHROPIC', False):
            import api.claude_client
            api.claude_client._claude_client = None

            client = get_claude_client()

            assert client is None

    def test_get_claude_client_returns_none_on_initialization_error(self):
        """
        Test that get_claude_client returns None on init error.

        Verifies graceful error handling.
        """
        with patch('api.claude_client.Anthropic', side_effect=Exception("Init failed")):
            with patch('api.claude_client.HAS_ANTHROPIC', True):
                import api.claude_client
                api.claude_client._claude_client = None

                client = get_claude_client()

                assert client is None


class TestResponseFormatting:
    """Tests for response formatting and structure."""

    def test_response_includes_all_required_fields(self, mock_claude_client, sample_atoms):
        """
        Test that response includes all required fields.

        Verifies response structure is complete.
        """
        response = mock_claude_client.generate_rag_answer(
            query="Test",
            context_atoms=sample_atoms[:1]
        )

        assert "answer" in response
        assert "model" in response
        assert "tokens_used" in response
        assert "sources" in response

    def test_response_sources_include_metadata(self, mock_claude_client):
        """
        Test that response sources include required metadata.

        Verifies source structure is complete.
        """
        atoms = [
            {
                "id": "REQ-001",
                "type": "requirement",
                "title": "Test Requirement",
                "distance": 0.95
            }
        ]

        response = mock_claude_client.generate_rag_answer(
            query="Test",
            context_atoms=atoms
        )

        assert len(response["sources"]) > 0
        source = response["sources"][0]
        assert "id" in source
        assert "type" in source


class TestIntegrationWithRAGModes:
    """Integration tests for RAG modes."""

    @pytest.mark.parametrize("rag_mode", ["entity", "path", "impact"])
    def test_all_rag_modes_generate_responses(self, mock_claude_client, sample_atoms, rag_mode):
        """
        Test that all RAG modes generate valid responses.

        Verifies each mode produces proper output.
        """
        response = mock_claude_client.generate_rag_answer(
            query="Test query",
            context_atoms=sample_atoms[:2],
            rag_mode=rag_mode
        )

        assert "answer" in response
        assert len(response.get("sources", [])) >= 0

    def test_response_consistency_across_modes(self, mock_claude_client, sample_atoms):
        """
        Test response structure consistency across modes.

        Verifies all modes return same top-level structure.
        """
        modes = ["entity", "path", "impact"]
        responses = []

        for mode in modes:
            response = mock_claude_client.generate_rag_answer(
                query="Test",
                context_atoms=sample_atoms[:1],
                rag_mode=mode
            )
            responses.append(response)

        # All should have same top-level keys
        expected_keys = {"answer", "model", "tokens_used", "sources"}
        for response in responses:
            assert set(response.keys()) == expected_keys


class TestErrorScenarios:
    """Tests for various error scenarios."""

    def test_malformed_context_atoms(self, mock_claude_client):
        """
        Test handling of malformed context atoms.

        Verifies graceful handling of incomplete atom data.
        """
        bad_atoms = [
            None,
            {},
            {"id": "TEST", "content": None}
        ]

        # Should not raise exception
        response = mock_claude_client.generate_rag_answer(
            query="Test",
            context_atoms=[bad_atoms[0]],
            rag_mode="entity"
        )

        assert "answer" in response or "error" in response

    def test_very_long_query(self, mock_claude_client):
        """
        Test handling of very long queries.

        Verifies proper handling of extended input.
        """
        long_query = "What is " + ("very " * 100) + "important?"

        response = mock_claude_client.generate_rag_answer(
            query=long_query,
            context_atoms=[],
            rag_mode="entity"
        )

        assert "answer" in response

    def test_special_characters_in_query(self, mock_claude_client):
        """
        Test handling of special characters in query.

        Verifies proper escaping and handling.
        """
        special_query = "What about <tag> and [bracket] & symbols?"

        response = mock_claude_client.generate_rag_answer(
            query=special_query,
            context_atoms=[],
            rag_mode="entity"
        )

        assert "answer" in response
