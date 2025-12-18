#!/usr/bin/env python3
"""Create an embeddings-ready JSONL file from `test_data/atoms` and `test_data/docs`.

Each line is: {"id": <id>, "text": <text>, "metadata": {...}}

Run:
  python scripts/generate_embeddings_jsonl.py --out test_data/embeddings.jsonl
"""
from __future__ import annotations

import argparse
import json
import os
from glob import glob
from typing import Dict

try:
    import yaml
except Exception:
    yaml = None

ROOT = os.path.join(os.path.dirname(__file__), "..")
DATA = os.path.join(ROOT, "test_data")
ATOMS = os.path.join(DATA, "atoms")
DOCS = os.path.join(DATA, "docs")


def load_atom(path: str) -> Dict:
    if yaml:
        with open(path, "r", encoding="utf-8") as fh:
            return yaml.safe_load(fh)
    else:
        with open(path, "r", encoding="utf-8") as fh:
            try:
                return json.load(fh)
            except Exception:
                # fallback: treat as text
                return {"id": os.path.splitext(os.path.basename(path))[0], "raw": fh.read()}


def build_text_from_atom(atom: Dict) -> str:
    parts = []
    for k in ("name", "title", "description", "note", "email", "address"):
        v = atom.get(k)
        if v:
            parts.append(str(v))
    # include any remaining simple props
    for k, v in atom.items():
        if k in ("id", "type", "name", "title", "description", "note", "email", "address"):
            continue
        if isinstance(v, (str, int, float)):
            parts.append(f"{k}: {v}")
    return "\n".join(parts)


def main(out: str):
    entries = []
    # atoms
    for p in glob(os.path.join(ATOMS, "*.yaml")) + glob(os.path.join(ATOMS, "*.yml")) + glob(os.path.join(ATOMS, "*.json")):
        atom = load_atom(p)
        aid = atom.get("id") or os.path.splitext(os.path.basename(p))[0]
        text = build_text_from_atom(atom)
        metadata = {"type": atom.get("type"), "source": os.path.relpath(p, DATA)}
        entries.append({"id": aid, "text": text, "metadata": metadata})

    # docs
    for p in glob(os.path.join(DOCS, "*.txt")):
        with open(p, "r", encoding="utf-8") as fh:
            txt = fh.read()
        aid = f"doc-{os.path.splitext(os.path.basename(p))[0]}"
        entries.append({"id": aid, "text": txt, "metadata": {"type": "document", "source": os.path.relpath(p, DATA)}})

    # write JSONL
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        for e in entries:
            fh.write(json.dumps(e, ensure_ascii=False) + "\n")

    print(f"Wrote embeddings JSONL: {out} ({len(entries)} items)")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--out", default=os.path.join(DATA, "embeddings.jsonl"))
    args = p.parse_args()
    main(args.out)
