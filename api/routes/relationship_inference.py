"""
Relationship Inference API

LLM-powered semantic analysis to suggest missing relationships between atoms.
Uses dual-index approach:
- ChromaDB for semantic similarity
- Neo4j for structural patterns
- Claude for reasoning about relationship types
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    import chromadb

    HAS_CHROMA = True
except ImportError:
    HAS_CHROMA = False

try:
    from ..claude_client import get_claude_client
    from ..neo4j_client import get_neo4j_client
except ImportError:
    # Fallback for direct execution
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from claude_client import get_claude_client
    from neo4j_client import get_neo4j_client

router = APIRouter()


class SemanticRelationshipSuggestion(BaseModel):
    """Semantic relationship suggestion from LLM analysis"""

    source_atom_id: str
    source_name: str
    target_atom_id: str
    target_name: str
    suggested_edge_type: str
    confidence: float
    reasoning: str
    semantic_similarity: float
    structural_support: Optional[str] = None


class InferenceRequest(BaseModel):
    """Request for relationship inference"""

    atom_id: Optional[str] = None  # Infer for specific atom
    limit: int = 10
    min_confidence: float = 0.6
    include_reasoning: bool = True


def get_chroma_client():
    """Get ChromaDB client for semantic search"""
    if not HAS_CHROMA:
        raise HTTPException(status_code=503, detail="ChromaDB not available. Install with: pip install chromadb")

    persist_dir = Path(__file__).parent.parent.parent / "rag-index"
    if not persist_dir.exists():
        raise HTTPException(status_code=503, detail="Vector database not initialized. Run indexing first.")

    return chromadb.PersistentClient(path=str(persist_dir))


def get_atom_embedding_context(atom_id: str, chroma_client) -> Optional[Dict[str, Any]]:
    """Get atom's content and embedding from ChromaDB"""
    try:
        collection = chroma_client.get_collection(name="gndp_atoms")
        results = collection.get(ids=[atom_id], include=["embeddings", "documents", "metadatas"])

        if not results["ids"]:
            return None

        return {
            "id": results["ids"][0],
            "content": results["documents"][0] if results["documents"] else "",
            "metadata": results["metadatas"][0] if results["metadatas"] else {},
            "embedding": results["embeddings"][0] if results.get("embeddings") else None,
        }
    except Exception as e:
        print(f"Error getting atom embedding: {e}", file=sys.stderr)
        return None


def find_semantically_similar_atoms(atom_id: str, chroma_client, n_results: int = 20) -> List[Dict[str, Any]]:
    """Find atoms semantically similar to the given atom"""
    try:
        collection = chroma_client.get_collection(name="gndp_atoms")

        # Get the source atom's embedding
        source = get_atom_embedding_context(atom_id, chroma_client)
        if not source or not source.get("embedding"):
            return []

        # Find similar atoms
        results = collection.query(
            query_embeddings=[source["embedding"]],
            n_results=n_results + 1,  # +1 because source will be in results
            include=["documents", "metadatas", "distances"],
        )

        similar = []
        if results and results["ids"] and len(results["ids"]) > 0:
            for i, similar_id in enumerate(results["ids"][0]):
                # Skip the source atom itself
                if similar_id == atom_id:
                    continue

                similar.append(
                    {
                        "id": similar_id,
                        "content": results["documents"][0][i] if results["documents"] else "",
                        "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                        "distance": results["distances"][0][i] if results.get("distances") else 1.0,
                    }
                )

        return similar

    except Exception as e:
        print(f"Error finding similar atoms: {e}", file=sys.stderr)
        return []


def check_existing_relationship(source_id: str, target_id: str, neo4j_client) -> bool:
    """Check if relationship already exists between atoms"""
    try:
        with neo4j_client.driver.session() as session:
            result = session.run(
                """
                MATCH (a:Atom {id: $source_id})-[r]-(b:Atom {id: $target_id})
                RETURN count(r) as count
            """,
                source_id=source_id,
                target_id=target_id,
            )

            record = result.single()
            return record["count"] > 0 if record else False
    except Exception:
        return False


def get_structural_context(source_id: str, target_id: str, neo4j_client) -> Optional[str]:
    """Get structural evidence for potential relationship"""
    try:
        with neo4j_client.driver.session() as session:
            # Check for common neighbors
            result = session.run(
                """
                MATCH (a:Atom {id: $source_id})-[r1]-(c:Atom)-[r2]-(b:Atom {id: $target_id})
                RETURN c.id as common_neighbor, type(r1) as r1_type, type(r2) as r2_type
                LIMIT 3
            """,
                source_id=source_id,
                target_id=target_id,
            )

            neighbors = list(result)
            if neighbors:
                return f"Share {len(neighbors)} common neighbor(s)"

            # Check for transitive path
            result = session.run(
                """
                MATCH path = (a:Atom {id: $source_id})-[*2..3]-(b:Atom {id: $target_id})
                RETURN length(path) as path_length
                LIMIT 1
            """,
                source_id=source_id,
                target_id=target_id,
            )

            record = result.single()
            if record:
                return f"Connected via {record['path_length']}-hop path"

            return None
    except Exception:
        return None


def infer_relationship_with_llm(
    source: Dict[str, Any], target: Dict[str, Any], similarity: float, structural_context: Optional[str]
) -> Optional[Dict[str, Any]]:
    """Use Claude to infer relationship type and reasoning"""
    try:
        claude = get_claude_client()

        prompt = f"""Analyze these two business process atoms and determine if they should be related:

SOURCE ATOM:
ID: {source['id']}
Name: {source['metadata'].get('name', 'Unknown')}
Type: {source['metadata'].get('type', 'Unknown')}
Description: {source['content'][:500]}

TARGET ATOM:
ID: {target['id']}
Name: {target['metadata'].get('name', 'Unknown')}
Type: {target['metadata'].get('type', 'Unknown')}
Description: {target['content'][:500]}

Semantic Similarity: {similarity:.2f}
{f"Structural Context: {structural_context}" if structural_context else ""}

Available relationship types:
- DEPENDS_ON: Source requires target to complete
- ENABLES: Source makes target possible
- GOVERNED_BY: Source is governed by target policy/rule
- PERFORMED_BY: Process is performed by role
- USES: Source uses target document/system
- PRODUCES: Source creates/generates target
- VALIDATES: Source validates target
- RELATED_TO: General relationship

Respond ONLY with a JSON object (no markdown, no explanation):
{{
  "should_relate": true/false,
  "edge_type": "EDGE_TYPE" or null,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}}"""

        response = claude.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = response.content[0].text.strip()

        # Parse JSON response
        result = json.loads(response_text)

        if result.get("should_relate") and result.get("edge_type"):
            return {
                "edge_type": result["edge_type"],
                "confidence": float(result.get("confidence", 0.5)),
                "reasoning": result.get("reasoning", "LLM suggested relationship"),
            }

        return None

    except json.JSONDecodeError as e:
        print(f"Failed to parse LLM response as JSON: {e}", file=sys.stderr)
        print(f"Response was: {response_text}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Error in LLM inference: {e}", file=sys.stderr)
        return None


@router.post("/api/relationships/infer")
def infer_relationships(request: InferenceRequest) -> List[SemanticRelationshipSuggestion]:
    """
    Infer missing relationships using semantic analysis and LLM reasoning.

    Combines:
    1. Vector similarity (ChromaDB)
    2. Structural patterns (Neo4j)
    3. Semantic reasoning (Claude)

    Args:
        request: Inference configuration

    Returns:
        List of suggested relationships with reasoning
    """
    try:
        chroma_client = get_chroma_client()
        neo4j_client = get_neo4j_client()

        if not neo4j_client.is_connected():
            raise HTTPException(status_code=503, detail="Neo4j database not connected")

        suggestions = []

        if request.atom_id:
            # Infer for specific atom
            atom_ids = [request.atom_id]
        else:
            # Infer for all atoms (sample top N by centrality)
            with neo4j_client.driver.session() as session:
                result = session.run(
                    """
                    MATCH (a:Atom)
                    OPTIONAL MATCH (a)-[r]-()
                    WITH a, count(r) as degree
                    RETURN a.id as atom_id
                    ORDER BY degree DESC
                    LIMIT 50
                """
                )
                atom_ids = [record["atom_id"] for record in result]

        for source_id in atom_ids:
            # Get semantically similar atoms
            similar_atoms = find_semantically_similar_atoms(source_id, chroma_client, n_results=10)

            if not similar_atoms:
                continue

            # Get source atom context
            source = get_atom_embedding_context(source_id, chroma_client)
            if not source:
                continue

            for target in similar_atoms:
                target_id = target["id"]

                # Skip if relationship already exists
                if check_existing_relationship(source_id, target_id, neo4j_client):
                    continue

                # Calculate semantic similarity (inverse of distance)
                distance = target.get("distance", 1.0)
                similarity = 1.0 - min(distance, 1.0)

                # Skip if similarity too low
                if similarity < 0.4:
                    continue

                # Get structural context
                structural = get_structural_context(source_id, target_id, neo4j_client)

                # Use LLM to infer relationship
                if request.include_reasoning:
                    inference = infer_relationship_with_llm(source, target, similarity, structural)

                    if not inference:
                        continue

                    edge_type = inference["edge_type"]
                    confidence = inference["confidence"]
                    reasoning = inference["reasoning"]
                else:
                    # Heuristic-based inference (faster, no LLM)
                    edge_type = infer_edge_type_heuristic(
                        source["metadata"].get("type"), target["metadata"].get("type")
                    )
                    confidence = similarity * 0.8
                    reasoning = f"Semantic similarity: {similarity:.2f}"

                # Apply confidence threshold
                if confidence < request.min_confidence:
                    continue

                suggestions.append(
                    SemanticRelationshipSuggestion(
                        source_atom_id=source_id,
                        source_name=source["metadata"].get("name", source_id),
                        target_atom_id=target_id,
                        target_name=target["metadata"].get("name", target_id),
                        suggested_edge_type=edge_type,
                        confidence=round(confidence, 3),
                        reasoning=reasoning,
                        semantic_similarity=round(similarity, 3),
                        structural_support=structural,
                    )
                )

                # Limit results
                if len(suggestions) >= request.limit:
                    break

            if len(suggestions) >= request.limit:
                break

        # Sort by confidence
        suggestions.sort(key=lambda x: x.confidence, reverse=True)

        return suggestions[: request.limit]

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in relationship inference: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Relationship inference failed: {str(e)}")


def infer_edge_type_heuristic(source_type: Optional[str], target_type: Optional[str]) -> str:
    """Heuristic-based edge type inference without LLM"""
    if not source_type or not target_type:
        return "RELATED_TO"

    source_type = source_type.upper()
    target_type = target_type.upper()

    # Process-based rules
    if source_type == "PROCESS":
        if target_type == "ROLE":
            return "PERFORMED_BY"
        elif target_type == "SYSTEM":
            return "USES"
        elif target_type == "DOCUMENT":
            return "PRODUCES"
        elif target_type == "POLICY":
            return "GOVERNED_BY"
        elif target_type == "PROCESS":
            return "ENABLES"

    # Document-based rules
    if source_type == "DOCUMENT":
        if target_type == "PROCESS":
            return "CREATED_BY"
        elif target_type == "SYSTEM":
            return "STORED_IN"

    # Control-based rules
    if source_type == "CONTROL":
        if target_type == "PROCESS":
            return "VALIDATES"
        elif target_type == "POLICY":
            return "IMPLEMENTS"

    # Default
    return "RELATED_TO"


@router.get("/api/relationships/infer/stats")
def get_inference_stats() -> Dict[str, Any]:
    """
    Get statistics about relationship inference capabilities.

    Returns:
        Statistics about indexed atoms and inference readiness
    """
    try:
        stats = {
            "chroma_available": HAS_CHROMA,
            "neo4j_connected": False,
            "claude_available": False,
            "indexed_atoms": 0,
            "inference_ready": False,
        }

        # Check Neo4j
        try:
            neo4j_client = get_neo4j_client()
            stats["neo4j_connected"] = neo4j_client.is_connected()
        except Exception:
            pass

        # Check Claude
        try:
            _claude = get_claude_client()  # noqa: F841
            stats["claude_available"] = True
        except Exception:
            pass

        # Check ChromaDB
        if HAS_CHROMA:
            try:
                chroma_client = get_chroma_client()
                collection = chroma_client.get_collection(name="gndp_atoms")
                stats["indexed_atoms"] = collection.count()
            except Exception:
                pass

        # Overall readiness
        stats["inference_ready"] = (
            stats["chroma_available"]
            and stats["neo4j_connected"]
            and stats["claude_available"]
            and stats["indexed_atoms"] > 0
        )

        return stats

    except Exception as e:
        print(f"Error getting inference stats: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@router.post("/api/relationships/apply-suggestion")
def apply_relationship_suggestion(source_id: str, target_id: str, edge_type: str) -> Dict[str, Any]:
    """
    Apply a suggested relationship to the graph.

    Creates the relationship in Neo4j and updates the source atom's YAML file.

    Args:
        source_id: Source atom ID
        target_id: Target atom ID
        edge_type: Type of relationship

    Returns:
        Success status
    """
    import yaml

    try:
        neo4j_client = get_neo4j_client()

        # Create relationship in Neo4j
        with neo4j_client.driver.session() as session:
            session.run(
                """
                MATCH (a:Atom {id: $source_id}), (b:Atom {id: $target_id})
                CREATE (a)-[r:"""
                + edge_type
                + """]->(b)
                RETURN r
            """,
                source_id=source_id,
                target_id=target_id,
            )

        # Update YAML file
        atoms_base = Path(__file__).parent.parent.parent / "atoms"
        yaml_file = None

        for candidate in atoms_base.rglob(f"{source_id}.yaml"):
            yaml_file = candidate
            break

        if yaml_file and yaml_file.exists():
            with open(yaml_file, "r", encoding="utf-8") as f:
                atom_data = yaml.safe_load(f)

            if "edges" not in atom_data:
                atom_data["edges"] = []

            # Add new edge
            atom_data["edges"].append(
                {"type": edge_type, "target": target_id, "description": f"Inferred relationship: {edge_type}"}
            )

            with open(yaml_file, "w", encoding="utf-8") as f:
                yaml.dump(atom_data, f, default_flow_style=False, sort_keys=False)

        return {
            "status": "success",
            "message": f"Created {edge_type} relationship from {source_id} to {target_id}",
            "neo4j_updated": True,
            "yaml_updated": yaml_file is not None,
        }

    except Exception as e:
        print(f"Error applying suggestion: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to apply suggestion: {str(e)}")
