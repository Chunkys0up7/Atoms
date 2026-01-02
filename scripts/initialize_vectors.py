"""
Vector Database Initialization Script

Implements RAG.md guidance for semantic indexing:
- Loads all atoms from data/atoms/
- Generates embeddings using OpenAI API
- Stores in Chroma vector database with metadata
- Creates semantic search foundation for dual-index RAG
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import chromadb
    from chromadb.utils import embedding_functions

    HAS_CHROMA = True
except ImportError:
    print("ERROR: chromadb not installed. Run: pip install chromadb")
    sys.exit(1)

try:
    import openai

    HAS_OPENAI = True
except ImportError:
    print("WARNING: openai not installed. Install with: pip install openai")
    print("Will use default embeddings (less accurate)")
    HAS_OPENAI = False


def init_chroma_client(persist_dir: str = "rag-index"):
    """
    Initialize and return Chroma client.

    Args:
        persist_dir: Directory path for persistent storage

    Returns:
        chromadb.Client: Initialized Chroma client
    """
    return chromadb.PersistentClient(path=persist_dir)


try:
    import yaml
except ImportError:
    print("ERROR: PyYAML not installed. Run: pip install PyYAML")
    # Don't exit yet, might be standard lib in some envs (unlikely but safe)
    # Actually, it is required.
    pass

def load_atoms_from_disk() -> List[Dict[str, Any]]:
    """Load all atom YAML files from atoms/ directory (recursive)."""
    # Fix path: parent.parent is project root
    atoms_dir = Path(__file__).parent.parent / "atoms"

    if not atoms_dir.exists():
        print(f"ERROR: Atoms directory not found at {atoms_dir}")
        sys.exit(1)

    print(f"Scanning {atoms_dir} for atom definitions...")
    atoms = []
    # Recursively find all .yaml files
    for file_path in sorted(atoms_dir.rglob("*.yaml")):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                atom = yaml.safe_load(f)
                if atom:
                    # Inject file path for metadata
                    atom["file_path"] = str(file_path)
                    atoms.append(atom)
        except Exception as e:
            print(f"WARNING: Failed to load {file_path.name}: {e}")
            continue

    print(f"✓ Loaded {len(atoms)} atoms from disk")
    return atoms


def prepare_atom_documents(atoms: List[Dict[str, Any]]) -> tuple:
    """
    Prepare atoms for vector indexing.

    Returns:
        tuple: (ids, documents, metadatas)
    """
    ids = []
    documents = []
    metadatas = []

    for atom in atoms:
        atom_id = atom.get("id", "unknown")

        # Build searchable document text (following RAG.md semantic chunking principles)
        doc_parts = [
            f"ID: {atom_id}",
            f"Name: {atom.get('name', 'Unnamed')}",
            f"Type: {atom.get('type', 'unknown')}",
            f"Domain: {atom.get('domain', atom.get('ontologyDomain', 'unknown'))}",
        ]

        # Add content fields
        content = atom.get("content", {})
        if isinstance(content, dict):
            summary = content.get("summary", "")
            description = content.get("description", "")

            if summary:
                doc_parts.append(f"Summary: {summary}")
            if description:
                doc_parts.append(f"Description: {description}")

        # Add tags if present
        tags = atom.get("tags", [])
        if tags:
            doc_parts.append(f"Tags: {', '.join(tags)}")

        # Combine into searchable document
        document = "\n".join(doc_parts)

        # Build metadata (for filtering during retrieval)
        metadata = {
            "atom_id": atom_id,
            "name": atom.get("name", "Unnamed"),
            "type": atom.get("type", "unknown"),
            "domain": atom.get("domain", atom.get("ontologyDomain", "unknown")),
            "criticality": atom.get("criticality", "MEDIUM"),
            "owner": atom.get("owner", ""),
            "steward": atom.get("steward", ""),
            "file_path": str(atom.get("file_path", "")),
        }

        # Add compliance score if present
        if "compliance_score" in atom:
            metadata["compliance_score"] = float(atom["compliance_score"])

        ids.append(atom_id)
        documents.append(document)
        metadatas.append(metadata)

    print(f"✓ Prepared {len(documents)} documents for indexing")
    return ids, documents, metadatas


def initialize_chroma_collection(persist_dir: str = "rag-index", use_openai: bool = True) -> chromadb.Collection:
    """
    Initialize Chroma collection with embeddings.

    Following RAG.md guidance:
    - Use OpenAI embeddings initially (fine-tune later if 500K+ docs)
    - Persistent storage for production use
    """
    # Create persistent client
    client = chromadb.PersistentClient(path=persist_dir)

    # Configure embedding function
    if use_openai and HAS_OPENAI:
        # Check for API key
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            print("WARNING: OPENAI_API_KEY not set. Using default embeddings.")
            embedding_fn = embedding_functions.DefaultEmbeddingFunction()
        else:
            print("✓ Using OpenAI embeddings (text-embedding-3-small)")
            embedding_fn = embedding_functions.OpenAIEmbeddingFunction(
                api_key=api_key, model_name="text-embedding-3-small"
            )
    else:
        print("Using default SentenceTransformer embeddings")
        embedding_fn = embedding_functions.DefaultEmbeddingFunction()

    # Delete existing collection if present (fresh start)
    try:
        client.delete_collection(name="gndp_atoms")
        print("✓ Deleted existing collection")
    except:
        pass

    # Create new collection
    collection = client.create_collection(
        name="gndp_atoms",
        embedding_function=embedding_fn,
        metadata={
            "description": "GNDP Atom Registry - Semantic Search Index",
            "created_at": datetime.utcnow().isoformat(),
            "version": "1.0",
        },
    )

    print(f"✓ Created Chroma collection: gndp_atoms")
    return collection


def index_atoms(
    collection: chromadb.Collection,
    ids: List[str],
    documents: List[str],
    metadatas: List[Dict[str, Any]],
    batch_size: int = 100,
):
    """
    Index atoms in batches for efficient processing.

    Following RAG.md guidance for scale:
    - Batch processing to avoid memory issues
    - Progress tracking for large datasets
    """
    total = len(ids)

    print(f"\nIndexing {total} atoms in batches of {batch_size}...")

    for i in range(0, total, batch_size):
        batch_end = min(i + batch_size, total)
        batch_ids = ids[i:batch_end]
        batch_docs = documents[i:batch_end]
        batch_meta = metadatas[i:batch_end]

        try:
            collection.add(ids=batch_ids, documents=batch_docs, metadatas=batch_meta)
            print(f"  ✓ Indexed batch {i//batch_size + 1} ({batch_end}/{total} atoms)")
        except Exception as e:
            print(f"  ✗ Error indexing batch {i//batch_size + 1}: {e}")
            continue

    print(f"\n✓ Successfully indexed {collection.count()} atoms")


def verify_index(collection: chromadb.Collection):
    """Verify index by running test queries."""
    print("\n" + "=" * 60)
    print("Testing Vector Index")
    print("=" * 60)

    test_queries = ["loan application process", "credit score verification", "compliance controls", "risk assessment"]

    for query in test_queries:
        results = collection.query(query_texts=[query], n_results=3)

        if results and results["ids"] and len(results["ids"]) > 0:
            print(f"\nQuery: '{query}'")
            print(f"  Found {len(results['ids'][0])} results:")
            for i, atom_id in enumerate(results["ids"][0][:3]):
                distance = results["distances"][0][i] if results.get("distances") else 0
                print(f"    {i+1}. {atom_id} (distance: {distance:.3f})")
        else:
            print(f"\nQuery: '{query}' - No results")

    print("\n✓ Index verification complete")


def main():
    """Main initialization workflow."""
    print("=" * 60)
    print("GNDP Vector Database Initialization")
    print("Following RAG.md Dual-Index Architecture")
    print("=" * 60)
    print()

    # Step 1: Load atoms from disk
    atoms = load_atoms_from_disk()

    if not atoms:
        print("ERROR: No atoms found. Cannot initialize vector database.")
        sys.exit(1)

    # Step 2: Prepare documents for indexing
    ids, documents, metadatas = prepare_atom_documents(atoms)

    # Step 3: Initialize Chroma collection
    persist_dir = Path(__file__).parent.parent / "rag-index"
    persist_dir.mkdir(exist_ok=True)

    # Force disable OpenAI due to quota limits
    use_openai = False # HAS_OPENAI and os.environ.get("OPENAI_API_KEY")
    collection = initialize_chroma_collection(persist_dir=str(persist_dir), use_openai=bool(use_openai))

    # Step 4: Index atoms
    index_atoms(collection, ids, documents, metadatas)

    # Step 5: Verify index
    verify_index(collection)

    print("\n" + "=" * 60)
    print("✓ Vector database initialization complete!")
    print("=" * 60)
    print(f"\nLocation: {persist_dir}")
    print(f"Collection: gndp_atoms")
    print(f"Atom count: {collection.count()}")
    print(f"Embedding model: {'OpenAI text-embedding-3-small' if use_openai else 'SentenceTransformer (default)'}")
    print("\nNext steps:")
    print("  1. Run scripts/sync_graph_to_neo4j.py to populate graph database")
    print("  2. Test RAG API: curl http://localhost:8001/api/rag/health")
    print("  3. Update AIAssistant.tsx to use /api/rag/query endpoint")


if __name__ == "__main__":
    main()
