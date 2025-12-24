"""
Neo4j Graph Database Population Script

Implements RAG.md guidance for graph-based RAG:
- Loads atoms, modules, phases, and journeys
- Creates Neo4j nodes and relationships
- Enables 2-3 hop traversal for context expansion
- Supports dual-index RAG architecture
"""

import os
import sys
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))

try:
    from neo4j import GraphDatabase
    HAS_NEO4J = True
except ImportError:
    print("ERROR: neo4j driver not installed. Run: pip install neo4j")
    sys.exit(1)


class Neo4jGraphPopulator:
    """Populates Neo4j graph database with GNDP ontology."""

    def __init__(self, uri: str, user: str, password: str):
        """Initialize Neo4j connection."""
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.stats = {
            "atoms_created": 0,
            "modules_created": 0,
            "phases_created": 0,
            "journeys_created": 0,
            "relationships_created": 0
        }

    def close(self):
        """Close Neo4j connection."""
        self.driver.close()

    def clear_database(self):
        """Clear all nodes and relationships (fresh start)."""
        print("Clearing existing graph data...")
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
        print("✓ Database cleared")

    def create_indexes(self):
        """Create indexes for faster queries (following RAG.md performance guidance)."""
        print("Creating indexes...")
        with self.driver.session() as session:
            # Index on Atom ID for fast lookups
            session.run("CREATE INDEX atom_id_index IF NOT EXISTS FOR (a:Atom) ON (a.id)")

            # Index on Module ID
            session.run("CREATE INDEX module_id_index IF NOT EXISTS FOR (m:Module) ON (m.id)")

            # Index on Phase ID
            session.run("CREATE INDEX phase_id_index IF NOT EXISTS FOR (p:Phase) ON (p.id)")

            # Index on Journey ID
            session.run("CREATE INDEX journey_id_index IF NOT EXISTS FOR (j:Journey) ON (j.id)")

            # Index on atom type for filtering
            session.run("CREATE INDEX atom_type_index IF NOT EXISTS FOR (a:Atom) ON (a.type)")

            # Index on domain for domain-specific queries
            session.run("CREATE INDEX atom_domain_index IF NOT EXISTS FOR (a:Atom) ON (a.domain)")

        print("✓ Indexes created")

    def create_atom_node(self, atom: Dict[str, Any]):
        """Create Atom node in Neo4j."""
        with self.driver.session() as session:
            # Extract content fields
            content = atom.get('content', {})
            if isinstance(content, dict):
                summary = content.get('summary', '')
                description = content.get('description', '')
            else:
                summary = ''
                description = ''

            # Create atom node with properties
            session.run("""
                CREATE (a:Atom {
                    id: $id,
                    name: $name,
                    type: $type,
                    domain: $domain,
                    criticality: $criticality,
                    summary: $summary,
                    description: $description,
                    owner: $owner,
                    steward: $steward,
                    compliance_score: $compliance_score
                })
            """, {
                "id": atom.get("id", "unknown"),
                "name": atom.get("name", "Unnamed"),
                "type": atom.get("type", "unknown"),
                "domain": atom.get("domain", atom.get("ontologyDomain", "unknown")),
                "criticality": atom.get("criticality", "MEDIUM"),
                "summary": summary,
                "description": description,
                "owner": atom.get("owner", ""),
                "steward": atom.get("steward", ""),
                "compliance_score": atom.get("compliance_score", 0.0)
            })

            self.stats["atoms_created"] += 1

    def create_atom_relationships(self, atom: Dict[str, Any]):
        """Create relationships from atom edges."""
        atom_id = atom.get("id", "unknown")
        edges = atom.get("edges", [])

        if not edges:
            return

        with self.driver.session() as session:
            for edge in edges:
                edge_type = edge.get("type", "RELATED_TO")
                target_id = edge.get("targetId")

                if not target_id:
                    continue

                # Create relationship (using edge type as relationship name)
                try:
                    session.run(f"""
                        MATCH (source:Atom {{id: $source_id}})
                        MATCH (target:Atom {{id: $target_id}})
                        CREATE (source)-[r:{edge_type}]->(target)
                    """, {
                        "source_id": atom_id,
                        "target_id": target_id
                    })
                    self.stats["relationships_created"] += 1
                except Exception as e:
                    print(f"  Warning: Failed to create edge {atom_id} -> {target_id}: {e}")

    def create_module_node(self, module: Dict[str, Any]):
        """Create Module node in Neo4j."""
        with self.driver.session() as session:
            session.run("""
                CREATE (m:Module {
                    id: $id,
                    name: $name,
                    description: $description,
                    owner: $owner
                })
            """, {
                "id": module.get("id", module.get("module_id", "unknown")),
                "name": module.get("name", "Unnamed Module"),
                "description": module.get("description", ""),
                "owner": module.get("owner", module.get("metadata", {}).get("owner", ""))
            })

            self.stats["modules_created"] += 1

    def link_module_atoms(self, module: Dict[str, Any]):
        """Link module to its constituent atoms."""
        module_id = module.get("id", module.get("module_id"))
        atom_ids = module.get("atoms", module.get("atom_ids", []))

        with self.driver.session() as session:
            for atom_id in atom_ids:
                try:
                    session.run("""
                        MATCH (m:Module {id: $module_id})
                        MATCH (a:Atom {id: $atom_id})
                        CREATE (m)-[:CONTAINS]->(a)
                    """, {
                        "module_id": module_id,
                        "atom_id": atom_id
                    })
                    self.stats["relationships_created"] += 1
                except Exception as e:
                    print(f"  Warning: Failed to link module {module_id} -> atom {atom_id}: {e}")

    def create_phase_node(self, phase: Dict[str, Any]):
        """Create Phase node in Neo4j."""
        with self.driver.session() as session:
            session.run("""
                CREATE (p:Phase {
                    id: $id,
                    name: $name,
                    sequence: $sequence,
                    criticality: $criticality,
                    owner: $owner
                })
            """, {
                "id": phase.get("id", "unknown"),
                "name": phase.get("name", "Unnamed Phase"),
                "sequence": phase.get("sequence", 0),
                "criticality": phase.get("criticality", "MEDIUM"),
                "owner": phase.get("owner", "")
            })

            self.stats["phases_created"] += 1

    def link_phase_modules(self, phase: Dict[str, Any]):
        """Link phase to its modules."""
        phase_id = phase.get("id")
        module_ids = phase.get("modules", [])

        with self.driver.session() as session:
            for module_id in module_ids:
                try:
                    session.run("""
                        MATCH (p:Phase {id: $phase_id})
                        MATCH (m:Module {id: $module_id})
                        CREATE (p)-[:INCLUDES]->(m)
                    """, {
                        "phase_id": phase_id,
                        "module_id": module_id
                    })
                    self.stats["relationships_created"] += 1
                except Exception as e:
                    print(f"  Warning: Failed to link phase {phase_id} -> module {module_id}: {e}")

    def create_journey_node(self, journey: Dict[str, Any]):
        """Create Journey node in Neo4j."""
        with self.driver.session() as session:
            session.run("""
                CREATE (j:Journey {
                    id: $id,
                    name: $name,
                    description: $description,
                    owner: $owner
                })
            """, {
                "id": journey.get("id", "unknown"),
                "name": journey.get("name", "Unnamed Journey"),
                "description": journey.get("description", ""),
                "owner": journey.get("owner", "")
            })

            self.stats["journeys_created"] += 1

    def link_journey_phases(self, journey: Dict[str, Any]):
        """Link journey to its phases in sequence."""
        journey_id = journey.get("id")
        phase_ids = journey.get("phases", [])

        with self.driver.session() as session:
            for seq, phase_id in enumerate(phase_ids):
                try:
                    session.run("""
                        MATCH (j:Journey {id: $journey_id})
                        MATCH (p:Phase {id: $phase_id})
                        CREATE (j)-[:HAS_PHASE {sequence: $sequence}]->(p)
                    """, {
                        "journey_id": journey_id,
                        "phase_id": phase_id,
                        "sequence": seq + 1
                    })
                    self.stats["relationships_created"] += 1
                except Exception as e:
                    print(f"  Warning: Failed to link journey {journey_id} -> phase {phase_id}: {e}")


def load_atoms_from_disk() -> List[Dict[str, Any]]:
    """Load all atom JSON files."""
    atoms_dir = Path(__file__).parent.parent / "data" / "atoms"
    atoms = []

    if not atoms_dir.exists():
        print(f"WARNING: Atoms directory not found at {atoms_dir}")
        return atoms

    for file_path in sorted(atoms_dir.glob("atom-*.json")):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                atom = json.load(f)
                atoms.append(atom)
        except Exception as e:
            print(f"WARNING: Failed to load {file_path.name}: {e}")

    print(f"✓ Loaded {len(atoms)} atoms from disk")
    return atoms


def load_modules_from_api() -> List[Dict[str, Any]]:
    """Load modules from JSON file (fallback if API unavailable)."""
    modules_file = Path(__file__).parent.parent / "data" / "modules.json"

    if not modules_file.exists():
        print("WARNING: modules.json not found")
        return []

    try:
        with open(modules_file, "r", encoding="utf-8") as f:
            modules = json.load(f)
        print(f"✓ Loaded {len(modules)} modules from file")
        return modules
    except Exception as e:
        print(f"WARNING: Failed to load modules: {e}")
        return []


def load_phases_from_constants() -> List[Dict[str, Any]]:
    """Load phases from constants file."""
    # For now, return empty list - phases would come from constants.ts or backend
    print("✓ Phase loading skipped (would load from MOCK_PHASES)")
    return []


def load_journeys_from_constants() -> List[Dict[str, Any]]:
    """Load journeys from constants file."""
    # For now, return empty list - journeys would come from constants.ts or backend
    print("✓ Journey loading skipped (would load from MOCK_JOURNEYS)")
    return []


def main():
    """Main graph population workflow."""
    print("="*60)
    print("GNDP Neo4j Graph Population")
    print("Following RAG.md Dual-Index Architecture")
    print("="*60)
    print()

    # Get Neo4j credentials from environment
    neo4j_uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user = os.environ.get("NEO4J_USER", "neo4j")
    neo4j_password = os.environ.get("NEO4J_PASSWORD")

    if not neo4j_password:
        print("ERROR: NEO4J_PASSWORD environment variable not set")
        print("\nUsage:")
        print("  export NEO4J_URI=bolt://localhost:7687")
        print("  export NEO4J_USER=neo4j")
        print("  export NEO4J_PASSWORD=your_password")
        print("  python scripts/sync_graph_to_neo4j.py")
        sys.exit(1)

    # Initialize populator
    print(f"Connecting to Neo4j at {neo4j_uri}...")
    try:
        populator = Neo4jGraphPopulator(neo4j_uri, neo4j_user, neo4j_password)
        print("✓ Connected to Neo4j")
    except Exception as e:
        print(f"ERROR: Failed to connect to Neo4j: {e}")
        print("\nMake sure Neo4j is running:")
        print("  docker run -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:latest")
        sys.exit(1)

    try:
        # Step 1: Clear existing data
        populator.clear_database()

        # Step 2: Create indexes
        populator.create_indexes()

        # Step 3: Load data
        atoms = load_atoms_from_disk()
        modules = load_modules_from_api()
        phases = load_phases_from_constants()
        journeys = load_journeys_from_constants()

        # Step 4: Create atom nodes
        print(f"\nCreating {len(atoms)} atom nodes...")
        for i, atom in enumerate(atoms):
            populator.create_atom_node(atom)
            if (i + 1) % 25 == 0:
                print(f"  ✓ Created {i + 1}/{len(atoms)} atoms")

        # Step 5: Create atom relationships
        print(f"\nCreating atom relationships...")
        for atom in atoms:
            populator.create_atom_relationships(atom)

        # Step 6: Create module nodes
        if modules:
            print(f"\nCreating {len(modules)} module nodes...")
            for module in modules:
                populator.create_module_node(module)
                populator.link_module_atoms(module)

        # Step 7: Create phase nodes
        if phases:
            print(f"\nCreating {len(phases)} phase nodes...")
            for phase in phases:
                populator.create_phase_node(phase)
                populator.link_phase_modules(phase)

        # Step 8: Create journey nodes
        if journeys:
            print(f"\nCreating {len(journeys)} journey nodes...")
            for journey in journeys:
                populator.create_journey_node(journey)
                populator.link_journey_phases(journey)

        # Print statistics
        print("\n" + "="*60)
        print("✓ Graph population complete!")
        print("="*60)
        print(f"\nStatistics:")
        print(f"  Atoms created:         {populator.stats['atoms_created']}")
        print(f"  Modules created:       {populator.stats['modules_created']}")
        print(f"  Phases created:        {populator.stats['phases_created']}")
        print(f"  Journeys created:      {populator.stats['journeys_created']}")
        print(f"  Relationships created: {populator.stats['relationships_created']}")

        print(f"\nNeo4j Browser: http://localhost:7474")
        print(f"\nNext steps:")
        print("  1. Test graph queries in Neo4j Browser")
        print("  2. Verify RAG API: curl http://localhost:8001/api/rag/health")
        print("  3. Test path_rag mode with graph traversal")

    finally:
        populator.close()


if __name__ == "__main__":
    main()
