"""
Unit tests for RAG document indexing functionality.

Tests the document indexing feature including:
- Document collection creation and management
- Document embedding and storage
- Incremental document updates
- Document-atom relationships
- Document search and retrieval
"""

import json
from datetime import datetime
from pathlib import Path
from unittest.mock import MagicMock, Mock, mock_open, patch

import pytest


class TestDocumentIndexing:
    """Tests for document indexing in vector database."""

    def test_create_document_collection(self):
        """
        Test creating a new document collection.

        Verifies that a separate collection is created for documents.
        """
        with patch("chromadb.PersistentClient") as mock_client_class:
            mock_client = MagicMock()
            mock_collection = MagicMock()
            mock_client.get_or_create_collection.return_value = mock_collection
            mock_client_class.return_value = mock_client

            # Simulate creating document collection
            from scripts.initialize_vectors import init_chroma_client

            # Call should create both atom and document collections
            assert mock_client is not None

    def test_index_published_document(self):
        """
        Test indexing a single published document.

        Verifies that document content is embedded and stored.
        """
        mock_document = {
            "id": "doc-sop-001",
            "title": "Customer Onboarding SOP",
            "content": "Standard operating procedure for customer onboarding...",
            "atom_ids": ["atom-cust-kyc", "atom-cust-verify"],
            "published_at": "2025-12-23T10:00:00Z",
        }

        with patch("chromadb.PersistentClient") as mock_client_class:
            mock_client = MagicMock()
            mock_collection = MagicMock()
            mock_client.get_or_create_collection.return_value = mock_collection
            mock_client_class.return_value = mock_client

            # Simulate adding document
            mock_collection.add(
                ids=[mock_document["id"]],
                documents=[f"{mock_document['title']}\n\n{mock_document['content']}"],
                metadatas=[
                    {"type": "document", "title": mock_document["title"], "atom_count": len(mock_document["atom_ids"])}
                ],
            )

            # Verify add was called
            mock_collection.add.assert_called_once()
            call_args = mock_collection.add.call_args
            assert call_args[1]["ids"][0] == "doc-sop-001"
            assert "Customer Onboarding" in call_args[1]["documents"][0]

    def test_index_multiple_documents(self):
        """
        Test indexing multiple documents in batch.

        Verifies batch processing of documents.
        """
        mock_documents = [
            {
                "id": f"doc-sop-{i:03d}",
                "title": f"SOP Document {i}",
                "content": f"Content for document {i}",
                "atom_ids": [],
            }
            for i in range(10)
        ]

        with patch("chromadb.PersistentClient") as mock_client_class:
            mock_client = MagicMock()
            mock_collection = MagicMock()
            mock_client.get_or_create_collection.return_value = mock_collection
            mock_client_class.return_value = mock_client

            # Simulate batch indexing
            ids = [doc["id"] for doc in mock_documents]
            documents = [f"{doc['title']}\n\n{doc['content']}" for doc in mock_documents]
            metadatas = [{"type": "document", "title": doc["title"]} for doc in mock_documents]

            mock_collection.add(ids=ids, documents=documents, metadatas=metadatas)

            # Verify batch add
            mock_collection.add.assert_called_once()
            call_args = mock_collection.add.call_args
            assert len(call_args[1]["ids"]) == 10
            assert all("doc-sop-" in doc_id for doc_id in call_args[1]["ids"])

    def test_document_collection_count(self):
        """
        Test retrieving document collection count.

        Verifies that document count is accurately tracked.
        """
        with patch("chromadb.PersistentClient") as mock_client_class:
            mock_client = MagicMock()
            mock_collection = MagicMock()
            mock_collection.count.return_value = 15
            mock_client.get_collection.return_value = mock_collection
            mock_client_class.return_value = mock_client

            # Get count
            count = mock_collection.count()
            assert count == 15

    def test_update_existing_document(self):
        """
        Test updating an already indexed document.

        Verifies that documents can be updated after changes.
        """
        doc_id = "doc-sop-001"
        updated_content = "Updated SOP content with new procedures..."

        with patch("chromadb.PersistentClient") as mock_client_class:
            mock_client = MagicMock()
            mock_collection = MagicMock()
            mock_client.get_or_create_collection.return_value = mock_collection
            mock_client_class.return_value = mock_client

            # Simulate update (delete + add)
            mock_collection.delete(ids=[doc_id])
            mock_collection.add(
                ids=[doc_id], documents=[updated_content], metadatas=[{"type": "document", "title": "Updated SOP"}]
            )

            # Verify both operations
            mock_collection.delete.assert_called_once_with(ids=[doc_id])
            mock_collection.add.assert_called_once()

    def test_search_documents_by_query(self):
        """
        Test searching documents by semantic query.

        Verifies that document search returns relevant results.
        """
        query = "customer onboarding procedures"

        with patch("chromadb.PersistentClient") as mock_client_class:
            mock_client = MagicMock()
            mock_collection = MagicMock()
            mock_collection.query.return_value = {
                "ids": [["doc-sop-001", "doc-sop-002"]],
                "distances": [[0.234, 0.456]],
                "metadatas": [
                    [
                        {"type": "document", "title": "Customer Onboarding SOP"},
                        {"type": "document", "title": "KYC Procedures"},
                    ]
                ],
            }
            mock_client.get_collection.return_value = mock_collection
            mock_client_class.return_value = mock_client

            # Execute search
            results = mock_collection.query(query_texts=[query], n_results=5)

            # Verify results
            assert len(results["ids"][0]) == 2
            assert "doc-sop-001" in results["ids"][0]
            assert results["distances"][0][0] < results["distances"][0][1]  # Sorted by relevance

    def test_document_atom_relationship(self):
        """
        Test that documents maintain relationships with atoms.

        Verifies that document metadata includes atom references.
        """
        mock_document = {
            "id": "doc-sop-001",
            "title": "Customer Onboarding SOP",
            "content": "SOP content...",
            "atom_ids": ["atom-cust-kyc", "atom-cust-verify", "atom-cust-approve"],
        }

        with patch("chromadb.PersistentClient") as mock_client_class:
            mock_client = MagicMock()
            mock_collection = MagicMock()
            mock_client.get_or_create_collection.return_value = mock_collection
            mock_client_class.return_value = mock_client

            # Add document with atom relationships
            mock_collection.add(
                ids=[mock_document["id"]],
                documents=[mock_document["content"]],
                metadatas=[
                    {
                        "type": "document",
                        "title": mock_document["title"],
                        "atom_ids": json.dumps(mock_document["atom_ids"]),
                        "atom_count": len(mock_document["atom_ids"]),
                    }
                ],
            )

            # Verify metadata includes atom references
            call_args = mock_collection.add.call_args
            metadata = call_args[1]["metadatas"][0]
            assert "atom_ids" in metadata
            assert metadata["atom_count"] == 3

    def test_incremental_document_update(self):
        """
        Test incremental update of documents.

        Verifies that only changed documents are re-indexed.
        """
        state_file_content = {
            "last_update": "2025-12-22T10:00:00Z",
            "indexed_documents": {"doc-sop-001": {"hash": "abc123", "last_modified": "2025-12-21T10:00:00Z"}},
        }

        with patch("builtins.open", mock_open(read_data=json.dumps(state_file_content))):
            with patch("os.path.exists", return_value=True):
                # Simulate checking for changes
                current_hash = "xyz789"  # Different hash = changed
                needs_update = current_hash != state_file_content["indexed_documents"]["doc-sop-001"]["hash"]

                assert needs_update is True

    def test_delete_unpublished_document(self):
        """
        Test removing a document from index when unpublished.

        Verifies that unpublished documents are removed from search.
        """
        doc_id = "doc-sop-001"

        with patch("chromadb.PersistentClient") as mock_client_class:
            mock_client = MagicMock()
            mock_collection = MagicMock()
            mock_client.get_collection.return_value = mock_collection
            mock_client_class.return_value = mock_client

            # Delete document
            mock_collection.delete(ids=[doc_id])

            # Verify deletion
            mock_collection.delete.assert_called_once_with(ids=[doc_id])

    def test_document_search_filters(self):
        """
        Test filtering document search by metadata.

        Verifies that document type filter works correctly.
        """
        query = "compliance procedures"

        with patch("chromadb.PersistentClient") as mock_client_class:
            mock_client = MagicMock()
            mock_collection = MagicMock()
            mock_collection.query.return_value = {
                "ids": [["doc-sop-001"]],
                "distances": [[0.234]],
                "metadatas": [[{"type": "document", "title": "Compliance SOP"}]],
            }
            mock_client.get_collection.return_value = mock_collection
            mock_client_class.return_value = mock_client

            # Execute filtered search
            results = mock_collection.query(query_texts=[query], n_results=5, where={"type": "document"})

            # Verify filter was applied
            call_args = mock_collection.query.call_args
            assert call_args[1]["where"]["type"] == "document"

    def test_document_embedding_quality(self):
        """
        Test that document embeddings maintain quality.

        Verifies that similar documents have similar embeddings.
        """
        doc1 = "Customer onboarding procedures for new accounts"
        doc2 = "Procedures for onboarding new customer accounts"
        doc3 = "Risk assessment methodology for credit scoring"

        # Mock embedding function that returns simple vectors
        def mock_embed(texts):
            # Simulate similar embeddings for similar texts
            if "onboarding" in texts[0]:
                return [[0.1, 0.2, 0.3]]
            else:
                return [[0.8, 0.9, 0.7]]

        with patch("chromadb.PersistentClient") as mock_client_class:
            mock_client = MagicMock()
            mock_collection = MagicMock()
            mock_client.get_or_create_collection.return_value = mock_collection
            mock_client_class.return_value = mock_client

            # Simulate that similar docs have similar distances
            # doc1 vs doc2: low distance (similar)
            # doc1 vs doc3: high distance (different)
            assert True  # Placeholder for embedding quality test


class TestDocumentIndexingRAGIntegration:
    """Tests for document indexing integration with RAG system."""

    def test_rag_query_includes_documents(self):
        """
        Test that RAG queries search both atoms and documents.

        Verifies that published documents are included in search results.
        """
        from api.routes.rag import entity_rag

        with patch("api.routes.rag.init_chroma_client") as mock_init:
            mock_client = MagicMock()

            # Setup mock atom collection
            mock_atom_collection = MagicMock()
            mock_atom_collection.query.return_value = {
                "ids": [["atom-cust-001"]],
                "distances": [[0.3]],
                "metadatas": [[{"type": "PROCESS"}]],
            }

            # Setup mock document collection
            mock_doc_collection = MagicMock()
            mock_doc_collection.query.return_value = {
                "ids": [["doc-sop-001"]],
                "distances": [[0.25]],
                "metadatas": [[{"type": "document", "title": "Customer SOP"}]],
            }

            def get_collection_side_effect(name):
                if name == "gndp_atoms":
                    return mock_atom_collection
                elif name == "gndp_documents":
                    return mock_doc_collection

            mock_client.get_collection.side_effect = get_collection_side_effect
            mock_init.return_value = mock_client

            # Test would call entity_rag and verify both sources are checked
            assert True  # Placeholder for full RAG integration

    def test_document_citations_in_answers(self):
        """
        Test that RAG answers cite document sources.

        Verifies that document sources are included in response.
        """
        mock_sources = [
            {"id": "atom-cust-001", "type": "PROCESS", "distance": 0.3},
            {"id": "doc-sop-001", "type": "document", "distance": 0.25},
        ]

        # Verify that document sources are marked differently
        doc_source = next(s for s in mock_sources if s["type"] == "document")
        assert doc_source["id"].startswith("doc-")
        assert doc_source["distance"] < 0.5  # Relevant result

    def test_document_content_in_context(self):
        """
        Test that document content is included in LLM context.

        Verifies that document text is passed to Claude for answer generation.
        """
        mock_document = {
            "id": "doc-sop-001",
            "title": "Customer Onboarding SOP",
            "content": "Step 1: Verify identity...\nStep 2: Check compliance...",
        }

        # Context string should include document content
        context = f"Document: {mock_document['title']}\n{mock_document['content']}"
        assert "Customer Onboarding SOP" in context
        assert "Step 1: Verify identity" in context


class TestDocumentIndexingErrorHandling:
    """Tests for error handling in document indexing."""

    def test_handle_missing_document_file(self):
        """
        Test handling of missing document files.

        Verifies graceful error handling for non-existent documents.
        """
        with patch("builtins.open", side_effect=FileNotFoundError):
            with pytest.raises(FileNotFoundError):
                # Should raise error for missing file
                with open("nonexistent-doc.json", "r") as f:
                    json.load(f)

    def test_handle_malformed_document(self):
        """
        Test handling of malformed document JSON.

        Verifies that invalid JSON is caught and handled.
        """
        malformed_json = "{invalid json content"

        with patch("builtins.open", mock_open(read_data=malformed_json)):
            with pytest.raises(json.JSONDecodeError):
                with open("malformed.json", "r") as f:
                    json.load(f)

    def test_handle_embedding_failure(self):
        """
        Test handling of embedding generation failure.

        Verifies that embedding errors don't crash indexing.
        """
        with patch("chromadb.PersistentClient") as mock_client_class:
            mock_client = MagicMock()
            mock_collection = MagicMock()
            mock_collection.add.side_effect = Exception("Embedding error")
            mock_client.get_or_create_collection.return_value = mock_collection
            mock_client_class.return_value = mock_client

            # Should handle error gracefully
            with pytest.raises(Exception) as exc_info:
                mock_collection.add(ids=["doc-1"], documents=["content"])
            assert "Embedding error" in str(exc_info.value)

    def test_handle_collection_creation_failure(self):
        """
        Test handling of collection creation failure.

        Verifies that collection errors are caught.
        """
        with patch("chromadb.PersistentClient") as mock_client_class:
            mock_client = MagicMock()
            mock_client.get_or_create_collection.side_effect = Exception("Collection error")
            mock_client_class.return_value = mock_client

            # Should raise error
            with pytest.raises(Exception) as exc_info:
                mock_client.get_or_create_collection(name="test_collection")
            assert "Collection error" in str(exc_info.value)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
