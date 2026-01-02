import glob
import json
import os

import yaml

mods = glob.glob("modules/*.yaml")
empty = []
for m in mods:
    with open(m, "r", encoding="utf-8") as f:
        try:
            data = yaml.safe_load(f)
        except Exception as e:  # noqa: F841
            data = None
    atoms = data.get("atoms") if isinstance(data, dict) else None
    if not atoms:
        empty.append(os.path.basename(m))
print(json.dumps({"empty_modules": empty}, indent=2))
