#!/usr/bin/env python3
"""Generate embeddings for atoms and store in Chroma vector database.

This implements the dual-index RAG approach:
1. Vector index (Chroma) for semantic search
2. Graph database (Neo4j) for relational context

Following RAG.md guidance for ontology-first, production-grade RAG.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any, Dict, List

import yaml

try:
    import chromadb
    from chromadb.utils import embedding_functions

    HAS_CHROMA = True
except ImportError:
    HAS_CHROMA = False
    print("Warning: chromadb not installed. Run: pip install chromadb")


def gather_atoms(atoms_dir: str) -> List[Dict[str, Any]]:
    """Gather all atom YAML files with full content and metadata."""
    atoms: List[Dict[str, Any]] = []
    p = Path(atoms_dir)
    if not p.exists():
        print(f"Warning: atoms directory {atoms_dir} not found")
        return atoms

    for yaml_file in p.rglob("*.yaml"):
        try:
            with open(yaml_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)

            if not data:
                continue

            # Extract key fields (support both naming conventions)
            atom_id = data.get("id") or data.get("atom_id", "")
            atom_type = data.get("type", "unknown")
            title = data.get("title") or data.get("name", "")
            summary = data.get("summary") or data.get("description", "")
            content_text = data.get("content", "")

            # Build full text for embedding
            if isinstance(content_text, dict):
                content_str = summary + "\n\n"
                for key, value in content_text.items():
                    if isinstance(value, list):
                        content_str += f"{key}:\n" + "\n".join(f"- {item}" for item in value) + "\n"
                    else:
                        content_str += f"{key}: {value}\n"
            elif isinstance(content_text, str):
                content_str = summary + "\n\n" + content_text
            else:
                content_str = summary

            full_text = f"{title}\n\n{content_str}"

            # Extract metadata for filtering
            metadata = data.get("metadata", {})

            atoms.append(
                {
                    "id": atom_id,
                    "type": atom_type,
                    "title": title,
                    "summary": summary,
                    "content": full_text[:4000],
                    "metadata": {
                        "type": atom_type,
                        "owner": metadata.get("owner", "unknown"),
                        "status": metadata.get("status", "draft"),
                        "tags": ",".join(data.get("tags", [])),
                        "file_path": str(yaml_file),
                    },
                    "file_path": str(yaml_file),
                }
            )
        except Exception as e:
            print(f"Warning: Failed to load {yaml_file}: {e}")
            continue

    return atoms


def init_chroma_client(persist_dir: str):
    """Initialize Chroma client with persistent storage."""
    if not HAS_CHROMA:
        raise ImportError("chromadb not installed. Run: pip install chromadb")

    os.makedirs(persist_dir, exist_ok=True)
    client = chromadb.PersistentClient(path=persist_dir)
    return client


def create_embeddings_chroma(atoms: List[Dict[str, Any]], persist_dir: str, provider: str = "sentence-transformers"):
    """Create embeddings and store in Chroma vector database."""
    if not HAS_CHROMA:
        print("Error: chromadb not installed")
        return

    print(f"Initializing Chroma client at {persist_dir}")
    client = init_chroma_client(persist_dir)

    # Choose embedding function
    if provider == "openai":
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            print("Error: OPENAI_API_KEY not set, falling back to sentence-transformers")
            provider = "sentence-transformers"
        else:
            embedding_func = embedding_functions.OpenAIEmbeddingFunction(
                api_key=api_key, model_name="text-embedding-3-small"
            )

    if provider == "sentence-transformers":
        embedding_func = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

    collection_name = "gndp_atoms"

    try:
        client.delete_collection(name=collection_name)
        print(f"Deleted existing collection '{collection_name}'")
    except Exception:
        pass

    collection = client.create_collection(
        name=collection_name,
        embedding_function=embedding_func,
        metadata={"description": "GNDP atom embeddings for RAG"},
    )

    print(f"Created collection '{collection_name}'")

    batch_size = 100
    for i in range(0, len(atoms), batch_size):
        batch = atoms[i : i + batch_size]
        ids = [a["id"] for a in batch]
        documents = [a["content"] for a in batch]
        metadatas = [a["metadata"] for a in batch]

        try:
            collection.add(ids=ids, documents=documents, metadatas=metadatas)
            print(f"Added batch {i//batch_size + 1}: {len(batch)} atoms")
        except Exception as e:
            print(f"Error adding batch {i//batch_size + 1}: {e}")
            continue

    print(f"Successfully indexed {len(atoms)} atoms in Chroma")
    print(f"Collection stats: {collection.count()} documents")


def write_index(atoms: List[Dict], out_dir: str):
    """Write a JSON index for dry-run/testing."""
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "index.json")

    serializable_atoms = []
    for atom in atoms:
        serializable_atom = {
            "id": atom["id"],
            "type": atom["type"],
            "title": atom["title"],
            "summary": atom["summary"],
            "file_path": atom["file_path"],
            "metadata": atom["metadata"],
        }
        serializable_atoms.append(serializable_atom)

    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump({"count": len(serializable_atoms), "items": serializable_atoms}, fh, indent=2)
    print(f"Wrote local index to {out_path}")


def main():
    p = argparse.ArgumentParser(description="Generate embeddings for GNDP atoms")
    p.add_argument("--atoms", required=True, help="Path to atoms directory")
    p.add_argument("--output", required=True, help="Output directory for Chroma database")
    p.add_argument("--dry-run", action="store_true", help="Generate JSON index only")
    p.add_argument(
        "--provider",
        default="sentence-transformers",
        choices=["sentence-transformers", "openai"],
        help="Embedding provider (default: sentence-transformers)",
    )
    args = p.parse_args()

    print(f"Gathering atoms from {args.atoms}")
    atoms = gather_atoms(args.atoms)
    print(f"Found {len(atoms)} atom files")

    if len(atoms) == 0:
        print("Error: No atoms found")
        return

    if args.dry_run:
        print("Dry-run mode: generating JSON index only")
        write_index(atoms, args.output)
        return

    print(f"Generating embeddings with provider: {args.provider}")
    create_embeddings_chroma(atoms, args.output, args.provider)
    write_index(atoms, args.output)

    print("\nDone! Vector database ready for RAG queries.")
    print(f"Collection location: {args.output}")


if __name__ == "__main__":
    main()
