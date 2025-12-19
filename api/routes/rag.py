from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from typing import List, Dict, Any, Optional
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.neo4j_client import get_neo4j_client
from api.claude_client import get_claude_client

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
    """Path RAG: Relationship traversal using Neo4j.

    This implements graph-aware RAG following RAG.md dual-index approach:
    1. Find seed atoms via vector search (Chroma)
    2. Traverse relationships to find connected atoms (Neo4j)
    3. Return expanded context with relationship metadata
    """
    # First, get seed atoms from vector search
    seed_atoms = entity_rag(query, top_k=3)

    if not seed_atoms:
        return []

    # Try Neo4j graph traversal first
    neo4j_client = get_neo4j_client()

    if neo4j_client and neo4j_client.is_connected():
        # Use Neo4j for graph traversal (bounded 2-3 hops)
        expanded_atoms = seed_atoms.copy()

        for seed_atom in seed_atoms:
            atom_id = seed_atom.get('id')
            if not atom_id:
                continue

            # Get full context (2-hop bidirectional traversal)
            try:
                related_atoms = neo4j_client.find_full_context(atom_id, max_depth=2, limit=10)
                for related in related_atoms:
                    # Avoid duplicates
                    if not any(a.get('id') == related['id'] for a in expanded_atoms):
                        expanded_atoms.append({
                            'id': related['id'],
                            'type': related.get('type', 'unknown'),
                            'title': related.get('title', ''),
                            'source': 'neo4j_graph',
                            'relationship': 'connected'
                        })
            except Exception as e:
                print(f"Neo4j traversal error for {atom_id}: {e}")
                continue

        return expanded_atoms

    # Fallback to graph.json if Neo4j not available
    expanded_atoms = seed_atoms.copy()
    graph_path = Path("docs/generated/api/graph/full.json")
    if not graph_path.exists():
        graph_path = Path("docs/api/graph/full.json")

    if graph_path.exists():
        import json
        with open(graph_path, 'r', encoding='utf-8') as f:
            graph_data = json.load(f)

        seed_ids = {a['id'] for a in seed_atoms}
        for edge in graph_data.get('edges', []):
            if edge['source'] in seed_ids or edge['target'] in seed_ids:
                related_id = edge['target'] if edge['source'] in seed_ids else edge['source']
                if related_id not in seed_ids:
                    expanded_atoms.append({
                        'id': related_id,
                        'relationship': edge.get('type', 'related'),
                        'source': 'graph_json'
                    })

    return expanded_atoms


def impact_rag(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Impact RAG: Change impact analysis using Neo4j.

    This implements impact-aware RAG following RAG.md guidance:
    1. Find target atom(s) via vector search (Chroma)
    2. Find all downstream dependencies (Neo4j traversal)
    3. Return comprehensive impact chain with affected atoms
    """
    # Get target atoms from vector search
    target_atoms = entity_rag(query, top_k=2)

    if not target_atoms:
        return []

    # Try Neo4j for impact analysis
    neo4j_client = get_neo4j_client()

    if neo4j_client and neo4j_client.is_connected():
        impact_chain = []

        for target_atom in target_atoms:
            atom_id = target_atom.get('id')
            if not atom_id:
                continue

            # Find downstream impacts (what depends on this atom)
            try:
                downstream_atoms = neo4j_client.find_downstream_impacts(atom_id, max_depth=3)

                impact_chain.append({
                    **target_atom,
                    'impact_scope': 'downstream',
                    'affected_count': len(downstream_atoms),
                    'affected_atoms': [a['id'] for a in downstream_atoms[:10]],  # Limit to top 10
                    'source': 'neo4j_graph'
                })

                # Add affected atoms to the chain
                for affected in downstream_atoms[:5]:  # Top 5 most impacted
                    impact_chain.append({
                        'id': affected['id'],
                        'type': affected.get('type', 'unknown'),
                        'title': affected.get('title', ''),
                        'relationship_path': affected.get('relationship_path', []),
                        'impact_level': 'affected',
                        'source': 'neo4j_graph'
                    })

            except Exception as e:
                print(f"Neo4j impact analysis error for {atom_id}: {e}")
                # Fallback: return target with no impact data
                impact_chain.append({
                    **target_atom,
                    'impact_scope': 'unknown',
                    'affected_count': 0,
                    'error': str(e)
                })

        return impact_chain

    # Fallback: return targets with basic impact data
    impact_chain = []
    for atom in target_atoms:
        impact_chain.append({
            **atom,
            'impact_scope': 'downstream',
            'affected_count': 0,
            'source': 'fallback',
            'note': 'Neo4j not available - install and configure for full impact analysis'
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

    # Try to generate natural language answer with Claude
    claude_client = get_claude_client()

    if claude_client:
        try:
            # Generate context-grounded answer using Claude
            claude_response = claude_client.generate_rag_answer(
                query=request.query,
                context_atoms=results,
                rag_mode=request.rag_mode,
                max_tokens=1024
            )

            answer = claude_response.get("answer", "Error generating answer")
            sources = claude_response.get("sources", [])

            # Extract context atom IDs
            context_ids = [s["id"] for s in sources if s.get("id")]

            return RAGResponse(
                answer=answer,
                sources=sources,
                context_atoms=context_ids
            )
        except Exception as e:
            print(f"Claude API error: {e}")
            # Fall through to fallback answer

    # Fallback: Simple answer without Claude
    answer = f"Found {len(results)} relevant atoms. "
    if request.rag_mode == "entity":
        answer += "These atoms are semantically related to your query."
    elif request.rag_mode == "path":
        answer += "These atoms are connected through relationships in the knowledge graph."
    elif request.rag_mode == "impact":
        answer += "These atoms would be impacted by changes to the queried entity."

    answer += "\n\nNote: Claude API unavailable - install anthropic package for natural language answers."

    sources = []
    context_ids = []
    for result in results:
        sources.append({
            'id': result.get('id', ''),
            'type': result.get('metadata', {}).get('type', result.get('type', 'unknown')),
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
    """Check RAG system health (vector DB, graph DB, and LLM)."""
    status = {
        'chromadb_installed': HAS_CHROMA,
        'vector_db_exists': False,
        'collection_count': 0,
        'neo4j_connected': False,
        'graph_atom_count': 0,
        'claude_api_available': False
    }

    # Check Chroma vector database
    if HAS_CHROMA:
        try:
            client = init_chroma_client()
            collection = client.get_collection(name="gndp_atoms")
            status['vector_db_exists'] = True
            status['collection_count'] = collection.count()
        except Exception as e:
            status['chroma_error'] = str(e)

    # Check Neo4j graph database
    neo4j_client = get_neo4j_client()
    if neo4j_client:
        neo4j_health = neo4j_client.health_check()
        status['neo4j_connected'] = neo4j_health.get('connected', False)
        if neo4j_health.get('connected'):
            status['graph_atom_count'] = neo4j_health.get('atom_count', 0)
            status['graph_relationship_count'] = neo4j_health.get('relationship_count', 0)
            status['neo4j_uri'] = neo4j_health.get('uri', '')
        else:
            status['neo4j_error'] = neo4j_health.get('error', 'Unknown error')

    # Check Claude API
    claude_client = get_claude_client()
    if claude_client:
        status['claude_api_available'] = True
        status['claude_model'] = claude_client.model
    else:
        status['claude_error'] = 'Claude client not initialized - check ANTHROPIC_API_KEY'

    # Overall system status
    status['dual_index_ready'] = status['vector_db_exists'] and status['neo4j_connected']
    status['full_rag_ready'] = (
        status['vector_db_exists'] and
        status['neo4j_connected'] and
        status['claude_api_available']
    )

    return status
