#!/usr/bin/env python3
"""Generate embeddings for atoms to build a RAG index.

This script is a safe stub that walks the `atoms/` directory, extracts
short summaries, and (with `--dry-run`) writes a small JSON index. With
an embeddings API key it can call a provider to persist vectors.
"""
import argparse
import os
import json
from pathlib import Path


def gather_atoms(atoms_dir):
    atoms = []
    p = Path(atoms_dir)
    if not p.exists():
        return atoms
    for f in p.rglob('*.yaml'):
        try:
            text = f.read_text(encoding='utf-8')
        except Exception:
            text = ''
        atoms.append({'path': str(f), 'content': text[:2000]})
    return atoms


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--atoms', required=True)
    p.add_argument('--output', required=True)
    p.add_argument('--dry-run', action='store_true')
    args = p.parse_args()

    atoms = gather_atoms(args.atoms)
    print(f'Found {len(atoms)} atom files')

    if args.dry_run:
        os.makedirs(args.output, exist_ok=True)
        out_path = os.path.join(args.output, 'index.json')
        with open(out_path, 'w', encoding='utf-8') as fh:
            json.dump({'count': len(atoms), 'items': atoms}, fh, indent=2)
        print('Dry run: wrote', out_path)
        return

    api_key = os.environ.get('EMBEDDINGS_API_KEY')
    if not api_key:
        print('Missing EMBEDDINGS_API_KEY; run with --dry-run to validate', )
        return

    # Placeholder: integrate with a real embeddings provider here.
    print('Embedding generation would run here (provider integration required)')


if __name__ == '__main__':
    main()
