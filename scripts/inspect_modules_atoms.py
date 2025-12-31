import glob
import json
import os
from pathlib import Path

import yaml

mods_dir = Path("modules")
atoms_dir = Path("atoms")

# gather atom ids from atoms/*/*.yaml and test_data/atoms
atom_files = glob.glob("atoms/**/*.yaml", recursive=True) + glob.glob("test_data/atoms/*.yaml")
atom_ids = set()
for f in atom_files:
    try:
        data = yaml.safe_load(open(f, "r", encoding="utf-8"))
        if isinstance(data, dict) and data.get("id"):
            atom_ids.add(data.get("id"))
    except Exception:
        pass

modules = []
for m in sorted(mods_dir.glob("*.yaml")):
    try:
        data = yaml.safe_load(open(m, "r", encoding="utf-8"))
    except Exception:
        data = {}
    mid = data.get("module_id") or data.get("id")
    atoms = data.get("atom_ids") or data.get("atoms") or []
    present = [a for a in atoms if a in atom_ids]
    missing = [a for a in atoms if a not in atom_ids]
    modules.append(
        {"file": str(m), "id": mid, "atoms_total": len(atoms), "atoms_present": len(present), "missing": missing[:5]}
    )

print(json.dumps(modules, indent=2))
