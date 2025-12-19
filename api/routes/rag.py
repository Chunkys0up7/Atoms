from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from typing import List, Dict, Any, Optional
import os

router = APIRouter()

try:
    import chromadb
    from chromadb.utils import embedding_functions
    HAS_CHROMA = True
except ImportError:
    HAS_CHROMA = False


class RAGQuery(BaseModel):
    """RAG query request model."""
    query: str
    top_k: int = 5
    atom_type: Optional[str] = None  # Filter by atom type
    rag_mode: str = "entity"  # entity, path, or impact


class RAGResponse(BaseModel):
    """RAG query response model."""
    answer: str
    sources: List[Dict[str, Any]]
    context_atoms: List[str]


def init_chroma_client(persist_dir: str = "rag-index"):
    """Initialize Chroma client for vector search."""
    if not HAS_CHROMA:
        raise ImportError("chromadb not installed")

    if not Path(persist_dir).exists():
        raise FileNotFoundError(f"Vector database not found at {persist_dir}")

    client = chromadb.PersistentClient(path=persist_dir)
    return client


def entity_rag(query: str, top_k: int = 5, atom_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """Entity RAG: Vector search + graph metadata.

    This implements the basic RAG pattern:
    1. Embed the query
    2. Find similar atoms via vector search
    3. Return atoms with metadata
    """
    try:
        client = init_chroma_client()
        collection = client.get_collection(name="gndp_atoms")

        # Build where clause for filtering
        where_clause = None
        if atom_type:
            where_clause = {"type": atom_type}

        # Query the vector database
        results = collection.query(
            query_texts=[query],
            n_results=top_k,
            where=where_clause
        )

        # Format results
        atoms = []
        if results and results['ids'] and len(results['ids']) > 0:
            for i, atom_id in enumerate(results['ids'][0]):
                atom = {
                    'id': atom_id,
                    'content': results['documents'][0][i] if results['documents'] else "",
                    'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                    'distance': results['distances'][0][i] if results.get('distances') else None
                }
                atoms.append(atom)

        return atoms
    except Exception as e:
        print(f"Entity RAG error: {e}")
        return []


def path_rag(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Path RAG: Relationship traversal.

    This implements graph-aware RAG:
    1. Find seed atoms via vector search
    2. Traverse relationships to find connected atoms
    3. Return expanded context
    """
    # First, get seed atoms
    seed_atoms = entity_rag(query, top_k=3)

    if not seed_atoms:
        return []

    # TODO: Integrate with Neo4j or graph.json to traverse relationships
    # For now, return seed atoms (placeholder for full graph traversal)
    expanded_atoms = seed_atoms.copy()

    # Read graph data to find related atoms
    graph_path = Path("docs/generated/api/graph/full.json")
    if not graph_path.exists():
        graph_path = Path("docs/api/graph/full.json")

    if graph_path.exists():
        import json
        with open(graph_path, 'r', encoding='utf-8') as f:
            graph_data = json.load(f)

        # For each seed atom, find connected nodes
        seed_ids = {a['id'] for a in seed_atoms}
        for edge in graph_data.get('edges', []):
            if edge['source'] in seed_ids or edge['target'] in seed_ids:
                # Add related atom IDs
                related_id = edge['target'] if edge['source'] in seed_ids else edge['source']
                if related_id not in seed_ids:
                    expanded_atoms.append({'id': related_id, 'relationship': edge.get('type', 'related')})

    return expanded_atoms


def impact_rag(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Impact RAG: Change analysis.

    This implements impact-aware RAG:
    1. Find target atom(s) via vector search
    2. Find all downstream dependencies
    3. Return impact chain
    """
    # Get target atoms
    target_atoms = entity_rag(query, top_k=2)

    if not target_atoms:
        return []

    # TODO: Use impact_analysis.py or Neo4j to compute full impact chain
    # For now, return targets with placeholder impact data
    impact_chain = []
    for atom in target_atoms:
        impact_chain.append({
            **atom,
            'impact_scope': 'downstream',  # Placeholder
            'affected_count': 0  # Placeholder
        })

    return impact_chain


@router.post("/api/rag/query", response_model=RAGResponse)
async def query_rag(request: RAGQuery):
    """Query the RAG system with multiple modes.

    Modes:
    - entity: Basic vector search + metadata
    - path: Relationship-aware search
    - impact: Change impact analysis
    """
    if not HAS_CHROMA:
        raise HTTPException(
            status_code=500,
            detail="RAG system not available. Install chromadb: pip install chromadb"
        )

    # Route to appropriate RAG mode
    if request.rag_mode == "entity":
        results = entity_rag(request.query, request.top_k, request.atom_type)
    elif request.rag_mode == "path":
        results = path_rag(request.query, request.top_k)
    elif request.rag_mode == "impact":
        results = impact_rag(request.query, request.top_k)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown RAG mode: {request.rag_mode}")

    if not results:
        return RAGResponse(
            answer="No relevant atoms found for your query.",
            sources=[],
            context_atoms=[]
        )

    # Build response
    # TODO: Integrate with Claude API to generate natural language answer
    answer = f"Found {len(results)} relevant atoms. "
    if request.rag_mode == "entity":
        answer += "These atoms are semantically related to your query."
    elif request.rag_mode == "path":
        answer += "These atoms are connected through relationships in the knowledge graph."
    elif request.rag_mode == "impact":
        answer += "These atoms would be impacted by changes to the queried entity."

    sources = []
    context_ids = []
    for result in results:
        sources.append({
            'id': result.get('id', ''),
            'type': result.get('metadata', {}).get('type', 'unknown'),
            'file_path': result.get('metadata', {}).get('file_path', ''),
            'distance': result.get('distance'),
        })
        context_ids.append(result.get('id', ''))

    return RAGResponse(
        answer=answer,
        sources=sources,
        context_atoms=context_ids
    )


@router.get("/api/rag/health")
def rag_health():
    """Check RAG system health."""
    status = {
        'chromadb_installed': HAS_CHROMA,
        'vector_db_exists': False,
        'collection_count': 0
    }

    if HAS_CHROMA:
        try:
            client = init_chroma_client()
            collection = client.get_collection(name="gndp_atoms")
            status['vector_db_exists'] = True
            status['collection_count'] = collection.count()
        except Exception as e:
            status['error'] = str(e)

    return status
