#!/usr/bin/env python3
"""Builder orchestrator for GNDP project.

Provides a small CLI to run common pipeline steps locally or in CI:
- validate (calls docs/build_docs.py --validate)
- build (calls docs/build_docs.py --build)
- sync (calls scripts/sync_neo4j.py)
- embeddings (calls scripts/generate_embeddings.py)
- all (runs validate->build->sync->embeddings)

This is intentionally lightweight: it shells out to existing scripts so CI
and local runs reuse the same logic.
"""
import argparse
import subprocess
import sys
import os


def run(cmd, check=True):
    print(f"$ {cmd}")
    res = subprocess.run(cmd, shell=True)
    if check and res.returncode != 0:
        raise SystemExit(res.returncode)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("action", choices=["validate", "build", "sync", "embeddings", "all"], default="all")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    if args.action in ("validate", "build", "all"):
        # Prefer calling python module directly
        if args.action == "validate" or args.action == "all":
            print("Running validation: docs/build_docs.py --validate")
            run("python docs/build_docs.py --validate")
        if args.action == "build" or args.action == "all":
            print("Running build: docs/build_docs.py --build")
            run("python docs/build_docs.py --build")

    if args.action in ("sync", "all"):
        dry = "--dry-run" if args.dry_run else ""
        print("Syncing graph to Neo4j")
        run(f"python scripts/sync_neo4j.py --graph docs/api/graph/full.json {dry}")

    if args.action in ("embeddings", "all"):
        dry = "--dry-run" if args.dry_run else ""
        print("Generating embeddings")
        run(f"python scripts/generate_embeddings.py --atoms atoms/ --output rag-index/ {dry}")


if __name__ == "__main__":
    main()
