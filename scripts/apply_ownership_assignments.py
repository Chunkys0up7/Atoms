import yaml
from pathlib import Path

assignments_file = Path("test_data/ownership/ownership-assignments.yaml")
atoms_dir = Path("atoms")

if not assignments_file.exists():
    print(f"Assignments file not found: {assignments_file}")
    raise SystemExit(1)

with open(assignments_file, "r", encoding="utf-8") as fh:
    data = yaml.safe_load(fh)

assignments = data.get("assignments", [])
found = 0
updated = 0

# Build lookup by atomId
assign_map = {a['atomId']: a for a in assignments if 'atomId' in a}

for atom_file in atoms_dir.rglob("*.yaml"):
    try:
        with open(atom_file, "r", encoding="utf-8") as fh:
            atom = yaml.safe_load(fh)
    except Exception:
        continue

    if not atom or 'id' not in atom:
        continue

    atom_id = atom.get('id')
    if atom_id in assign_map:
        found += 1
        assignment = assign_map[atom_id]
        steward = assignment.get('steward')
        owner = assignment.get('owner')
        changed = False
        if steward and atom.get('steward') != steward:
            atom['steward'] = steward
            changed = True
        if owner and atom.get('owner') != owner:
            atom['owner'] = owner
            changed = True
        if changed:
            with open(atom_file, "w", encoding="utf-8") as fh:
                yaml.safe_dump(atom, fh, sort_keys=False, allow_unicode=True)
            updated += 1

print(f"Assignments processed: {len(assign_map)}, found in atoms: {found}, files updated: {updated}")
