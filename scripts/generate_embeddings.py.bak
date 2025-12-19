#!/usr/bin/env python3
"""Generate embeddings for atoms to build a RAG index.

If `EMBEDDINGS_API_KEY` and `EMBEDDINGS_PROVIDER=openai` are set, this will
call OpenAI embeddings API. Otherwise it writes a local index in the output
directory for dry-run/testing.
"""
from __future__ import annotations

import argparse
import os
import json
from pathlib import Path
from typing import List, Dict


def gather_atoms(atoms_dir: str) -> List[Dict]:
    atoms: List[Dict] = []
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


def write_index(atoms: List[Dict], out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'index.json')
    with open(out_path, 'w', encoding='utf-8') as fh:
        json.dump({'count': len(atoms), 'items': atoms}, fh, indent=2)
    print('Wrote local index to', out_path)


def generate_openai_embeddings(atoms: List[Dict], out_dir: str):
    try:
        import openai
    except Exception as e:
        print('OpenAI client not installed:', e)
        return

    api_key = os.environ.get('EMBEDDINGS_API_KEY')
    model = os.environ.get('EMBEDDINGS_MODEL', 'text-embedding-3-small')
    if not api_key:
        print('Missing EMBEDDINGS_API_KEY')
        return
    openai.api_key = api_key

    vectors = []
    for a in atoms:
        text = a.get('content', '')[:2000]
        try:
            resp = openai.Embedding.create(model=model, input=text)
            emb = resp['data'][0]['embedding']
        except Exception as e:
            print('Embedding call failed for', a.get('path'), e)
            emb = []
        vectors.append({'path': a.get('path'), 'embedding': emb})

    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'embeddings.json')
    with open(out_path, 'w', encoding='utf-8') as fh:
        json.dump({'items': vectors}, fh)
    print('Wrote embeddings to', out_path)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--atoms', required=True)
    p.add_argument('--output', required=True)
    p.add_argument('--dry-run', action='store_true')
    args = p.parse_args()

    atoms = gather_atoms(args.atoms)
    print(f'Found {len(atoms)} atom files')

    if args.dry_run:
        write_index(atoms, args.output)
        return

    provider = os.environ.get('EMBEDDINGS_PROVIDER', 'openai')
    if provider == 'openai':
        generate_openai_embeddings(atoms, args.output)
    else:
        print('Unknown provider', provider)
        write_index(atoms, args.output)


if __name__ == '__main__':
    main()
