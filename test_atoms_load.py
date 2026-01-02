#!/usr/bin/env python3
"""Test atoms loading."""

from pathlib import Path
import yaml

base = Path(__file__).parent / "atoms"
print(f"Base path: {base}")
print(f"Base exists: {base.exists()}")

yaml_files = list(base.rglob("*.yaml"))
print(f"YAML files found: {len(yaml_files)}")

if yaml_files:
    print("\nFirst 5 files:")
    for f in yaml_files[:5]:
        print(f"  - {f.name}")
