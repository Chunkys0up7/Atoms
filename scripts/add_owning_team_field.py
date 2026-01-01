"""
Add owning_team field to atoms that are missing it.

Uses the 'team' field value as the owning_team value.
"""

import sys
from pathlib import Path

import yaml


def add_owning_team_to_atoms():
    """Add owning_team field to all atoms missing it."""
    atoms_dir = Path(__file__).parent.parent / "atoms"
    updated_count = 0
    skipped_count = 0

    for atom_file in atoms_dir.rglob("*.yaml"):
        try:
            # Read atom
            with open(atom_file, "r", encoding="utf-8") as f:
                atom_data = yaml.safe_load(f)

            # Skip if already has owning_team
            if "owning_team" in atom_data:
                skipped_count += 1
                continue

            # Use team field as owning_team, or default to "Unassigned"
            owning_team = atom_data.get("team", "Unassigned")
            atom_data["owning_team"] = owning_team

            # Write back
            with open(atom_file, "w", encoding="utf-8") as f:
                yaml.dump(atom_data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

            print(f"OK {atom_file.name}: Added owning_team={owning_team}")
            updated_count += 1

        except Exception as e:
            print(f"ERR {atom_file.name}: Error - {e}", file=sys.stderr)

    print(f"\nSummary:")
    print(f"  Updated: {updated_count}")
    print(f"  Skipped (already has owning_team): {skipped_count}")
    print(f"  Total: {updated_count + skipped_count}")


if __name__ == "__main__":
    add_owning_team_to_atoms()
