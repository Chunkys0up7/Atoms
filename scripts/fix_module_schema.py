#!/usr/bin/env python3
"""Add missing required fields to module YAML files."""

import sys
from pathlib import Path
import yaml

def fix_module_schemas():
    """Add missing version and id fields to modules."""
    modules_dir = Path("modules")
    updated_count = 0
    skipped_count = 0

    for module_file in modules_dir.glob("*.yaml"):
        try:
            with open(module_file, 'r', encoding='utf-8') as f:
                module_data = yaml.safe_load(f)

            if not module_data:
                print(f"SKIP {module_file.name}: Empty file")
                skipped_count += 1
                continue

            needs_update = False

            # Add version if missing
            if 'version' not in module_data:
                module_data['version'] = '1.0.0'
                needs_update = True
                print(f"  Adding version to {module_file.name}")

            # Add id if missing (use filename without extension)
            if 'id' not in module_data:
                module_id = module_file.stem  # filename without .yaml
                module_data['id'] = module_id
                needs_update = True
                print(f"  Adding id={module_id} to {module_file.name}")

            if needs_update:
                # Write back with version and id at the top
                ordered_data = {}
                if 'id' in module_data:
                    ordered_data['id'] = module_data.pop('id')
                if 'version' in module_data:
                    ordered_data['version'] = module_data.pop('version')
                ordered_data.update(module_data)

                with open(module_file, 'w', encoding='utf-8') as f:
                    yaml.dump(ordered_data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

                print(f"OK {module_file.name}: Updated")
                updated_count += 1
            else:
                print(f"OK {module_file.name}: Already has required fields")
                skipped_count += 1

        except Exception as e:
            print(f"ERR {module_file.name}: {e}", file=sys.stderr)

    print(f"\nSummary:")
    print(f"  Updated: {updated_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Total: {updated_count + skipped_count}")

if __name__ == "__main__":
    fix_module_schemas()
