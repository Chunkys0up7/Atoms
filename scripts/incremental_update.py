"""
Incremental RAG Update Script

Implements RAG.md Phase 3 guidance:
- 30x faster than full rebuild (hours → sub-second latency)
- Update only changed atoms in vector & graph DB
- Targeted subgraph modifications
- File modification timestamp tracking
"""

import os
import sys
import json
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Set
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import chromadb
    HAS_CHROMA = True
except ImportError:
    print("ERROR: chromadb not installed")
    sys.exit(1)

try:
    from neo4j import GraphDatabase
    HAS_NEO4J = True
except ImportError:
    HAS_NEO4J = False


class IncrementalUpdater:
    """
    Incremental update manager for RAG system.

    Following RAG.md Phase 3:
    - Detects changed atoms via file modification timestamps
    - Updates only modified atoms in vector DB
    - Updates only affected subgraph in Neo4j
    - Maintains state file for change tracking
    """

    def __init__(self, state_file: str = "rag-update-state.json"):
        """Initialize incremental updater."""
        self.state_file = Path(__file__).parent.parent / state_file
        self.state = self._load_state()
        self.atoms_dir = Path(__file__).parent.parent / "data" / "atoms"
        self.chroma_client = None
        self.neo4j_driver = None

    def _load_state(self) -> Dict[str, Any]:
        """Load previous update state."""
        if self.state_file.exists():
            with open(self.state_file, "r") as f:
                return json.load(f)
        return {
            "last_update": None,
            "atom_hashes": {},  # atom_id -> file hash
            "last_modified": {}  # atom_id -> timestamp
        }

    def _save_state(self):
        """Save update state."""
        with open(self.state_file, "w") as f:
            json.dump(self.state, f, indent=2)

    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate MD5 hash of file."""
        md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                md5.update(chunk)
        return md5.hexdigest()

    def detect_changes(self) -> Dict[str, List[str]]:
        """
        Detect changed, new, and deleted atoms.

        Returns:
            Dict with 'new', 'modified', 'deleted' lists of atom IDs
        """
        changes = {
            "new": [],
            "modified": [],
            "deleted": []
        }

        # Track current atoms
        current_atoms = set()

        # Check all atom files
        for atom_file in self.atoms_dir.glob("atom-*.json"):
            try:
                with open(atom_file, "r") as f:
                    atom = json.load(f)
                    atom_id = atom.get("id")

                if not atom_id:
                    continue

                current_atoms.add(atom_id)

                # Calculate file hash
                file_hash = self._calculate_file_hash(atom_file)

                # Check if new or modified
                if atom_id not in self.state["atom_hashes"]:
                    changes["new"].append(atom_id)
                elif self.state["atom_hashes"][atom_id] != file_hash:
                    changes["modified"].append(atom_id)

                # Update state
                self.state["atom_hashes"][atom_id] = file_hash
                self.state["last_modified"][atom_id] = datetime.utcnow().isoformat()

            except Exception as e:
                print(f"Warning: Failed to process {atom_file.name}: {e}")

        # Detect deleted atoms
        previous_atoms = set(self.state["atom_hashes"].keys())
        deleted = previous_atoms - current_atoms
        changes["deleted"] = list(deleted)

        # Clean up deleted atoms from state
        for atom_id in deleted:
            del self.state["atom_hashes"][atom_id]
            if atom_id in self.state["last_modified"]:
                del self.state["last_modified"][atom_id]

        return changes

    def update_vector_db(self, atom_ids: List[str]):
        """
        Update only specified atoms in vector database.

        30x faster than full rebuild - only re-embeds changed atoms.
        """
        if not atom_ids:
            return

        print(f"\nUpdating {len(atom_ids)} atoms in vector database...")

        # Initialize Chroma
        persist_dir = Path(__file__).parent.parent / "rag-index"
        if not persist_dir.exists():
            print("ERROR: Vector database not initialized. Run initialize_vectors.py first")
            return

        client = chromadb.PersistentClient(path=str(persist_dir))
        collection = client.get_collection(name="gndp_atoms")

        updated_count = 0

        for atom_id in atom_ids:
            atom_file = self.atoms_dir / f"{atom_id}.json"
            if not atom_file.exists():
                # Delete from vector DB
                try:
                    collection.delete(ids=[atom_id])
                    print(f"  ✓ Deleted {atom_id} from vector DB")
                    updated_count += 1
                except:
                    pass
                continue

            # Load atom
            with open(atom_file, "r") as f:
                atom = json.load(f)

            # Prepare document
            content = atom.get('content', {})
            if isinstance(content, dict):
                summary = content.get('summary', '')
                description = content.get('description', '')
            else:
                summary = ''
                description = ''

            doc_parts = [
                f"ID: {atom_id}",
                f"Name: {atom.get('name', 'Unnamed')}",
                f"Type: {atom.get('type', 'unknown')}",
                f"Domain: {atom.get('domain', atom.get('ontologyDomain', 'unknown'))}"
            ]

            if summary:
                doc_parts.append(f"Summary: {summary}")
            if description:
                doc_parts.append(f"Description: {description}")

            document = "\n".join(doc_parts)

            # Prepare metadata
            metadata = {
                "atom_id": atom_id,
                "name": atom.get("name", "Unnamed"),
                "type": atom.get("type", "unknown"),
                "domain": atom.get("domain", atom.get("ontologyDomain", "unknown")),
                "criticality": atom.get("criticality", "MEDIUM"),
                "owner": atom.get("owner", ""),
                "steward": atom.get("steward", "")
            }

            # Update in Chroma (upsert)
            try:
                collection.upsert(
                    ids=[atom_id],
                    documents=[document],
                    metadatas=[metadata]
                )
                print(f"  ✓ Updated {atom_id}")
                updated_count += 1
            except Exception as e:
                print(f"  ✗ Failed to update {atom_id}: {e}")

        print(f"✓ Updated {updated_count}/{len(atom_ids)} atoms in vector DB")

    def update_graph_db(self, atom_ids: List[str]):
        """
        Update only specified atoms in Neo4j graph database.

        Targeted subgraph updates - only touches affected nodes/relationships.
        """
        if not atom_ids:
            return

        if not HAS_NEO4J:
            print("WARNING: neo4j not installed - skipping graph update")
            return

        neo4j_uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
        neo4j_password = os.environ.get("NEO4J_PASSWORD")

        if not neo4j_password:
            print("WARNING: NEO4J_PASSWORD not set - skipping graph update")
            return

        print(f"\nUpdating {len(atom_ids)} atoms in graph database...")

        driver = GraphDatabase.driver(
            neo4j_uri,
            auth=(os.environ.get("NEO4J_USER", "neo4j"), neo4j_password)
        )

        updated_count = 0

        with driver.session() as session:
            for atom_id in atom_ids:
                atom_file = self.atoms_dir / f"{atom_id}.json"

                if not atom_file.exists():
                    # Delete node and relationships
                    try:
                        session.run(
                            "MATCH (a:Atom {id: $atom_id}) DETACH DELETE a",
                            atom_id=atom_id
                        )
                        print(f"  ✓ Deleted {atom_id} from graph DB")
                        updated_count += 1
                    except Exception as e:
                        print(f"  ✗ Failed to delete {atom_id}: {e}")
                    continue

                # Load atom
                with open(atom_file, "r") as f:
                    atom = json.load(f)

                # Extract content
                content = atom.get('content', {})
                if isinstance(content, dict):
                    summary = content.get('summary', '')
                    description = content.get('description', '')
                else:
                    summary = ''
                    description = ''

                try:
                    # Delete existing relationships
                    session.run(
                        "MATCH (a:Atom {id: $atom_id})-[r]-() DELETE r",
                        atom_id=atom_id
                    )

                    # Upsert node
                    session.run("""
                        MERGE (a:Atom {id: $id})
                        SET a.name = $name,
                            a.type = $type,
                            a.domain = $domain,
                            a.criticality = $criticality,
                            a.summary = $summary,
                            a.description = $description,
                            a.owner = $owner,
                            a.steward = $steward,
                            a.compliance_score = $compliance_score
                    """, {
                        "id": atom_id,
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

                    # Recreate relationships
                    edges = atom.get("edges", [])
                    for edge in edges:
                        edge_type = edge.get("type", "RELATED_TO")
                        target_id = edge.get("targetId")

                        if target_id:
                            session.run(f"""
                                MATCH (source:Atom {{id: $source_id}})
                                MATCH (target:Atom {{id: $target_id}})
                                CREATE (source)-[r:{edge_type}]->(target)
                            """, {
                                "source_id": atom_id,
                                "target_id": target_id
                            })

                    print(f"  ✓ Updated {atom_id}")
                    updated_count += 1

                except Exception as e:
                    print(f"  ✗ Failed to update {atom_id}: {e}")

        driver.close()
        print(f"✓ Updated {updated_count}/{len(atom_ids)} atoms in graph DB")

    def run(self, force_all: bool = False):
        """
        Run incremental update.

        Args:
            force_all: Force update all atoms (ignore change detection)
        """
        print("="*60)
        print("GNDP Incremental RAG Update")
        print("30x faster than full rebuild (RAG.md Phase 3)")
        print("="*60)
        print()

        if force_all:
            print("Force update mode: updating all atoms")
            atom_files = list(self.atoms_dir.glob("atom-*.json"))
            atom_ids = []
            for f in atom_files:
                with open(f, "r") as file:
                    atom = json.load(file)
                    if atom.get("id"):
                        atom_ids.append(atom.get("id"))
            changes = {"new": [], "modified": atom_ids, "deleted": []}
        else:
            # Detect changes
            print("Detecting changes...")
            changes = self.detect_changes()

        total_changes = len(changes["new"]) + len(changes["modified"]) + len(changes["deleted"])

        if total_changes == 0:
            print("✓ No changes detected - RAG system is up to date!")
            return

        print(f"\nChanges detected:")
        print(f"  New atoms:      {len(changes['new'])}")
        print(f"  Modified atoms: {len(changes['modified'])}")
        print(f"  Deleted atoms:  {len(changes['deleted'])}")
        print(f"  Total:          {total_changes}")

        # Combine new and modified for updates
        atoms_to_update = changes["new"] + changes["modified"]

        # Update vector database
        if atoms_to_update or changes["deleted"]:
            self.update_vector_db(atoms_to_update + changes["deleted"])

        # Update graph database
        if atoms_to_update or changes["deleted"]:
            self.update_graph_db(atoms_to_update + changes["deleted"])

        # Save state
        self.state["last_update"] = datetime.utcnow().isoformat()
        self._save_state()

        print("\n" + "="*60)
        print("✓ Incremental update complete!")
        print("="*60)
        print(f"\nUpdated: {len(atoms_to_update)} atoms")
        print(f"Deleted: {len(changes['deleted'])} atoms")
        print(f"State saved to: {self.state_file}")


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Incremental RAG update")
    parser.add_argument(
        "--force-all",
        action="store_true",
        help="Force update all atoms (ignore change detection)"
    )
    parser.add_argument(
        "--atom-id",
        type=str,
        help="Update specific atom by ID"
    )

    args = parser.parse_args()

    updater = IncrementalUpdater()

    if args.atom_id:
        print(f"Updating single atom: {args.atom_id}")
        updater.update_vector_db([args.atom_id])
        updater.update_graph_db([args.atom_id])
    else:
        updater.run(force_all=args.force_all)


if __name__ == "__main__":
    main()
