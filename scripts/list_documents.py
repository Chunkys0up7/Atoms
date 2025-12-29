#!/usr/bin/env python3
"""List all registered documents."""

from pathlib import Path
import json

docs_dir = Path('data/documents')
json_files = list(docs_dir.glob('*.json'))

print(f'JSON Document Files in data/documents/:')
print(f'Total: {len(json_files)}')
print()

for json_file in sorted(json_files):
    with open(json_file, 'r', encoding='utf-8') as f:
        doc = json.load(f)
    print(f'{json_file.name}')
    print(f'  Title: {doc["title"]}')
    print(f'  Type: {doc["template_type"]}')
    print(f'  Module: {doc["module_id"]}')
    print(f'  Atoms: {len(doc["atom_ids"])}')
    print()
