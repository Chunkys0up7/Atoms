#!/usr/bin/env python3
"""
Fix module ID patterns to match schema requirements.
Schema pattern: ^module-[a-z0-9-]+$
"""

import yaml
import sys

# MOD-* modules: Fix 'id' field
mod_files = [
    ('modules/MOD-001.yaml', 'module-mod-001'),
    ('modules/MOD-002.yaml', 'module-mod-002'),
    ('modules/MOD-003.yaml', 'module-mod-003'),
    ('modules/MOD-004.yaml', 'module-mod-004'),
    ('modules/MOD-005.yaml', 'module-mod-005'),
    ('modules/MOD-006.yaml', 'module-mod-006'),
    ('modules/MOD-007.yaml', 'module-mod-007'),
    ('modules/MOD-008.yaml', 'module-mod-008'),
    ('modules/MOD-009.yaml', 'module-mod-009'),
    ('modules/MOD-010.yaml', 'module-mod-010'),
    ('modules/MOD-011.yaml', 'module-mod-011'),
    ('modules/MOD-012.yaml', 'module-mod-012'),
]

# System modules: Fix 'module_id' field
system_modules = [
    ('modules/ai-agent.yaml', 'module-ai-agent'),
    ('modules/api-gateway.yaml', 'module-api-gateway'),
    ('modules/authentication-system.yaml', 'module-auth-system'),
    ('modules/data-layer.yaml', 'module-data-layer'),
    ('modules/knowledge-graph.yaml', 'module-knowledge-graph'),
]

print("Fixing MOD-* module IDs...")
for file_path, new_id in mod_files:
    try:
        with open(file_path, 'r') as f:
            data = yaml.safe_load(f)

        data['id'] = new_id

        with open(file_path, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)

        print(f"  [OK] Fixed {file_path}: id = {new_id}")
    except Exception as e:
        print(f"  [ERROR] Error fixing {file_path}: {e}")
        sys.exit(1)

print("\nFixing system module IDs...")
for file_path, new_module_id in system_modules:
    try:
        with open(file_path, 'r') as f:
            data = yaml.safe_load(f)

        # Fix both 'id' and 'module_id' fields
        data['id'] = new_module_id
        data['module_id'] = new_module_id

        with open(file_path, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)

        print(f"  [OK] Fixed {file_path}: id = {new_module_id}, module_id = {new_module_id}")
    except Exception as e:
        print(f"  [ERROR] Error fixing {file_path}: {e}")
        sys.exit(1)

print("\n[SUCCESS] All module IDs fixed successfully!")
