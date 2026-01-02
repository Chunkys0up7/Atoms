import os
import yaml

# Fix modules with validation errors
fixes = {
    'modules/api-gateway.yaml': {'atoms': ['atom-api-gateway']},
    'modules/knowledge-graph.yaml': {'atoms': ['atom-knowledge-graph']},
    'modules/ai-agent.yaml': {'atoms': ['atom-ai-agent']},
    'modules/data-layer.yaml': {'atoms': ['atom-data-layer']},
    'modules/authentication-system.yaml': {'id': 'module-authentication-system'},
}

# Fix MOD-* files with invalid type
mod_files = [
    'modules/MOD-001.yaml', 'modules/MOD-002.yaml', 'modules/MOD-003.yaml',
    'modules/MOD-004.yaml', 'modules/MOD-005.yaml', 'modules/MOD-006.yaml',
    'modules/MOD-007.yaml', 'modules/MOD-008.yaml', 'modules/MOD-009.yaml',
    'modules/MOD-010.yaml', 'modules/MOD-011.yaml', 'modules/MOD-012.yaml'
]

for file in mod_files:
    if os.path.exists(file):
        with open(file, 'r') as f:
            data = yaml.safe_load(f)

        # Fix type field
        if 'type' in data and data['type'] not in ['business', 'technical', 'compliance', 'operational']:
            data['type'] = 'business'

        with open(file, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)
        print(f'Fixed {file}')

# Fix files with missing atoms or wrong id pattern
for file, fix in fixes.items():
    if os.path.exists(file):
        with open(file, 'r') as f:
            data = yaml.safe_load(f)

        data.update(fix)

        with open(file, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)
        print(f'Fixed {file}')

print('All modules fixed!')
