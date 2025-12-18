#!/usr/bin/env python3
"""Builder orchestrator for GNDP project.

Provides a small CLI to run common pipeline steps locally or in CI:
- validate (runs schema validation + integrity checks)
- build (generates documentation from atoms/modules)
- sync (syncs graph to Neo4j)
- embeddings (generates embeddings for RAG)
- all (runs validate->build->sync->embeddings)

This is intentionally lightweight: it shells out to existing scripts so CI
and local runs reuse the same logic.

Following agent.md and claude.md CI/CD integration patterns.
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
            print("Running schema validation")
            run("python scripts/validate_schemas.py")
            print("Running integrity check")
            run("python scripts/check_orphans.py", check=False)  # Non-critical warnings
        if args.action == "build" or args.action == "all":
            print("Running documentation build")
            run("python docs/build_docs.py --source . --output docs/generated")

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
