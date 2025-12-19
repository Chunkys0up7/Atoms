"""
Neo4j Client for Graph-Native Documentation Platform (GNDP)

This module provides a client for querying and traversing the Neo4j graph database,
implementing traversal patterns defined in the ontology.yaml file.
"""

from neo4j import GraphDatabase
try:
    # Older driver versions exposed ConnectionError/DatabaseError names
    from neo4j.exceptions import ConnectionError, DatabaseError
except Exception:
    # Newer drivers use different exception classes; map common names for compatibility
    from neo4j.exceptions import ServiceUnavailable, Neo4jError
    ConnectionError = ServiceUnavailable
    DatabaseError = Neo4jError
import os
from typing import List, Dict, Any, Optional, Tuple


class Neo4jClient:
    """
    Neo4j client implementing graph traversal patterns from ontology.yaml

    Supports queries for:
    - Upstream dependencies (what an atom requires)
    - Downstream impacts (what depends on an atom)
    - Full bidirectional context
    - Implementation chains (requirement → design → procedure → validation)
    - Type-based searches
    - Health checks and connection management
    """

    def __init__(
        self,
        uri: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
    ):
        """
        Initialize Neo4j client with connection parameters.

        Args:
            uri: Neo4j connection URI (default: env var NEO4J_URI or "neo4j://localhost:7687")
            user: Neo4j username (default: env var NEO4J_USER or "neo4j")
            password: Neo4j password (default: env var NEO4J_PASSWORD)
        """
        self.uri = uri or os.environ.get("NEO4J_URI", "neo4j://localhost:7687")
        self.user = user or os.environ.get("NEO4J_USER", "neo4j")
        self.password = password or os.environ.get("NEO4J_PASSWORD")

        if not self.password:
            raise ValueError(
                "Neo4j password required. Set NEO4J_PASSWORD environment variable or "
                "pass password parameter to Neo4jClient()"
            )

        self.driver = None
        self._connect()

    def _connect(self) -> None:
        """
        Establish connection to Neo4j database.

        Raises:
            ConnectionError: If connection cannot be established
        """
        try:
            self.driver = GraphDatabase.driver(
                self.uri,
                auth=(self.user, self.password),
                encrypted=False,
            )
            # Test the connection
            with self.driver.session() as session:
                session.run("RETURN 1")
        except Exception as e:
            raise ConnectionError(f"Failed to connect to Neo4j at {self.uri}: {e}")

    def is_connected(self) -> bool:
        """
        Check if client is connected to Neo4j database.

        Returns:
            True if connected, False otherwise
        """
        if self.driver is None:
            return False
        try:
            with self.driver.session() as session:
                session.run("RETURN 1")
            return True
        except Exception:
            return False

    def find_upstream_dependencies(
        self,
        atom_id: str,
        max_depth: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Find upstream dependencies for an atom (what this atom requires).

        Traverses outgoing 'requires' and 'depends_on' relationships up to max_depth.

        Args:
            atom_id: ID of the atom to search from
            max_depth: Maximum relationship depth to traverse (default: 3)

        Returns:
            List of upstream atoms with relationship information
        """
        if not self.driver:
            raise ConnectionError("Not connected to Neo4j")

        query = f"""
        MATCH (a:Atom {{id: $atom_id}})
        -[r:requires|depends_on*1..{max_depth}]->(upstream)
        RETURN DISTINCT upstream,
               relationships(r) as rel_path,
               length(r) as depth
        ORDER BY depth ASC
        """

        try:
            with self.driver.session() as session:
                result = session.run(query, atom_id=atom_id)
                return [self._serialize_record(record) for record in result]
        except DatabaseError as e:
            raise DatabaseError(
                f"Error finding upstream dependencies for {atom_id}: {e}"
            )

    def find_downstream_impacts(
        self,
        atom_id: str,
        max_depth: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Find downstream impacts for an atom (what depends on this atom).

        Traverses incoming 'requires', 'depends_on', and 'affects' relationships
        up to max_depth.

        Args:
            atom_id: ID of the atom to search from
            max_depth: Maximum relationship depth to traverse (default: 3)

        Returns:
            List of downstream atoms with relationship information
        """
        if not self.driver:
            raise ConnectionError("Not connected to Neo4j")

        query = f"""
        MATCH (a:Atom {{id: $atom_id}})
        <-[r:requires|depends_on|affects*1..{max_depth}]-(downstream)
        RETURN DISTINCT downstream,
               relationships(r) as rel_path,
               length(r) as depth
        ORDER BY depth ASC
        """

        try:
            with self.driver.session() as session:
                result = session.run(query, atom_id=atom_id)
                return [self._serialize_record(record) for record in result]
        except DatabaseError as e:
            raise DatabaseError(
                f"Error finding downstream impacts for {atom_id}: {e}"
            )

    def find_full_context(
        self,
        atom_id: str,
        max_depth: int = 2,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """
        Get comprehensive bidirectional context for an atom.

        Retrieves both upstream and downstream connections within max_depth,
        providing complete graph context around the atom.

        Args:
            atom_id: ID of the atom to search from
            max_depth: Maximum relationship depth (default: 2)
            limit: Maximum number of related atoms to return (default: 20)

        Returns:
            Dictionary containing the atom, its upstream deps, and downstream impacts
        """
        if not self.driver:
            raise ConnectionError("Not connected to Neo4j")

        query = f"""
        MATCH (a:Atom {{id: $atom_id}})
        -[r*0..{max_depth}]-(related)
        RETURN DISTINCT related, count(*) as connection_count
        ORDER BY connection_count DESC
        LIMIT $limit
        """

        try:
            with self.driver.session() as session:
                # Get the center atom
                center_result = session.run(
                    "MATCH (a:Atom {id: $atom_id}) RETURN a",
                    atom_id=atom_id
                )
                center_records = center_result.data()
                if not center_records:
                    return {"error": f"Atom {atom_id} not found", "atom": None}

                center_atom = self._serialize_record(center_records[0])

                # Get related atoms
                result = session.run(query, atom_id=atom_id, limit=limit)
                related_atoms = [self._serialize_record(record) for record in result]

                return {
                    "center": center_atom,
                    "related": related_atoms,
                    "total_related": len(related_atoms),
                }
        except DatabaseError as e:
            raise DatabaseError(
                f"Error finding full context for {atom_id}: {e}"
            )

    def find_implementation_chain(
        self,
        requirement_id: str,
    ) -> Dict[str, Any]:
        """
        Follow the implementation chain from requirement through design, procedure,
        and validation.

        Maps: Requirement -> Design -> Procedure -> Validation
        Follows 'implements' and 'validates' relationships.

        Args:
            requirement_id: ID of the requirement to trace

        Returns:
            Dictionary with chain structure: requirement → design → procedure → validation
        """
        if not self.driver:
            raise ConnectionError("Not connected to Neo4j")

        try:
            with self.driver.session() as session:
                # Find the requirement
                req_result = session.run(
                    "MATCH (r:Atom {id: $id}) RETURN r",
                    id=requirement_id
                )
                req_data = req_result.data()
                if not req_data:
                    return {"error": f"Requirement {requirement_id} not found"}

                # Find designs that implement this requirement
                design_result = session.run(
                    """MATCH (d:Atom)-[impl:implements]->(r:Atom {id: $id})
                       RETURN DISTINCT d""",
                    id=requirement_id
                )

                # Find procedures that implement the designs
                proc_result = session.run(
                    """MATCH (p:Atom)-[impl:implements]->(d:Atom)
                       -[impl2:implements]->(r:Atom {id: $id})
                       RETURN DISTINCT p""",
                    id=requirement_id
                )

                # Find validations that validate the procedures
                val_result = session.run(
                    """MATCH (v:Atom)-[val:validates]->(p:Atom)
                       -[impl:implements]->(d:Atom)
                       -[impl2:implements]->(r:Atom {id: $id})
                       RETURN DISTINCT v""",
                    id=requirement_id
                )

                return {
                    "requirement": self._serialize_record(req_data[0]) if req_data else None,
                    "designs": [self._serialize_record(r) for r in design_result.data()],
                    "procedures": [self._serialize_record(r) for r in proc_result.data()],
                    "validations": [self._serialize_record(r) for r in val_result.data()],
                }
        except DatabaseError as e:
            raise DatabaseError(
                f"Error tracing implementation chain for {requirement_id}: {e}"
            )

    def find_by_type(
        self,
        atom_type: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Find all atoms of a specific type.

        Args:
            atom_type: Type of atom to search for (e.g., 'requirement', 'design',
                      'procedure', 'validation', 'policy', 'risk')
            limit: Maximum number of atoms to return (default: 50)

        Returns:
            List of atoms of the specified type
        """
        if not self.driver:
            raise ConnectionError("Not connected to Neo4j")

        try:
            with self.driver.session() as session:
                query = """
                MATCH (a:Atom)
                WHERE a.type = $atom_type
                RETURN a
                LIMIT $limit
                """
                result = session.run(query, atom_type=atom_type.lower(), limit=limit)
                return [self._serialize_record(record) for record in result]
        except DatabaseError as e:
            raise DatabaseError(
                f"Error finding atoms of type {atom_type}: {e}"
            )

    def count_atoms(self) -> Dict[str, int]:
        """
        Count total atoms in the database and by type.

        Returns:
            Dictionary with total count and breakdown by atom type
        """
        if not self.driver:
            raise ConnectionError("Not connected to Neo4j")

        try:
            with self.driver.session() as session:
                # Total count
                total_result = session.run("MATCH (a:Atom) RETURN count(a) as total")
                total = total_result.single()["total"] if total_result else 0

                # Count by type
                by_type_result = session.run(
                    "MATCH (a:Atom) RETURN a.type as type, count(a) as count "
                    "ORDER BY count DESC"
                )
                by_type = {record["type"]: record["count"] for record in by_type_result}

                return {
                    "total": total,
                    "by_type": by_type,
                }
        except DatabaseError as e:
            raise DatabaseError(f"Error counting atoms: {e}")

    def health_check(self) -> Dict[str, Any]:
        """
        Check Neo4j connection and retrieve graph statistics.

        Returns:
            Dictionary with connection status, database info, and graph statistics
        """
        if not self.driver:
            return {
                "status": "disconnected",
                "connected": False,
            }

        try:
            with self.driver.session() as session:
                # Check connection
                session.run("RETURN 1")

                # Get database info
                db_info = session.run("CALL dbms.components()").data()

                # Get graph stats
                atom_count = session.run("MATCH (a:Atom) RETURN count(a) as count").single()
                rel_count = session.run("MATCH ()-[r]->() RETURN count(r) as count").single()

                return {
                    "status": "connected",
                    "connected": True,
                    "database": db_info[0] if db_info else None,
                    "graph_stats": {
                        "atom_count": atom_count["count"] if atom_count else 0,
                        "relationship_count": rel_count["count"] if rel_count else 0,
                    },
                }
        except Exception as e:
            return {
                "status": "error",
                "connected": False,
                "error": str(e),
            }

    def close(self) -> None:
        """Close the Neo4j driver connection."""
        if self.driver:
            self.driver.close()
            self.driver = None

    @staticmethod
    def _serialize_record(record: Any) -> Dict[str, Any]:
        """
        Convert a Neo4j record to a serializable dictionary.

        Args:
            record: Neo4j record or node object

        Returns:
            Serializable dictionary representation
        """
        if hasattr(record, 'items'):
            # It's a dictionary-like record
            result = {}
            for key, value in record.items():
                if hasattr(value, 'items'):
                    # It's a node
                    result[key] = dict(value)
                elif isinstance(value, (list, tuple)):
                    result[key] = [
                        dict(v) if hasattr(v, 'items') else v
                        for v in value
                    ]
                else:
                    result[key] = value
            return result
        elif hasattr(record, '_properties'):
            # It's a Neo4j Node
            return dict(record)
        else:
            return {"value": str(record)}

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()


# Global singleton instance
_neo4j_client: Optional[Neo4jClient] = None


def get_neo4j_client() -> Neo4jClient:
    """
    Get or create a singleton Neo4j client instance.

    This function provides a convenient way to access a single, reusable Neo4j
    client connection throughout the application.

    Returns:
        Neo4jClient instance

    Raises:
        ValueError: If Neo4j password is not configured
        ConnectionError: If connection to Neo4j cannot be established

    Example:
        >>> client = get_neo4j_client()
        >>> deps = client.find_upstream_dependencies("REQ-001")
        >>> client.close()
    """
    global _neo4j_client

    if _neo4j_client is None:
        _neo4j_client = Neo4jClient()

    return _neo4j_client


def close_neo4j_client() -> None:
    """
    Close the global Neo4j client instance.

    This should be called during application shutdown.
    """
    global _neo4j_client

    if _neo4j_client is not None:
        _neo4j_client.close()
        _neo4j_client = None
