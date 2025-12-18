#!/usr/bin/env python3
"""Minimal Neo4j sync helper.

This script is a safe stub: with `--dry-run` it will validate files and
print intended actions. With proper `NEO4J_BOLT_URI`/user/password it can be
extended to perform actual writes.
"""
import argparse
import os
import sys
import json


def validate_graph(path):
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    return len(nodes), len(edges)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--graph", required=True)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    try:
        n_nodes, n_edges = validate_graph(args.graph)
        print(f"Graph OK: {n_nodes} nodes, {n_edges} edges in {args.graph}")
    except Exception as e:
        print("Graph validation failed:", e, file=sys.stderr)
        sys.exit(1)

    if args.dry_run:
        print("Dry run: would connect to Neo4j and upsert nodes/edges if credentials provided.")
        return

    uri = os.environ.get("NEO4J_BOLT_URI")
    user = os.environ.get("NEO4J_USER")
    password = os.environ.get("NEO4J_PASSWORD")
    if not (uri and user and password):
        print("Missing Neo4j credentials; run with --dry-run for validation.", file=sys.stderr)
        sys.exit(1)

    # Lazy import to avoid requiring neo4j in dry-run cases.
    try:
        from neo4j import GraphDatabase
    except Exception as e:
        print("neo4j driver not installed:", e, file=sys.stderr)
        sys.exit(1)

    driver = GraphDatabase.driver(uri, auth=(user, password))
    with driver.session() as session:
        # Example minimal upsert: create nodes by id and label
        with open(args.graph, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        for node in data.get("nodes", []):
            nid = node.get("id")
            label = node.get("type", "Atom")
            props = {k: v for k, v in node.items() if k not in ("id", "type")}
            session.run(
                f"MERGE (n:Atom {{id: $id}}) SET n += $props, n.type = $type",
                id=nid, props=props, type=label,
            )
        for edge in data.get("edges", []):
            src = edge.get("source")
            tgt = edge.get("target")
            etype = edge.get("type", "RELATED")
            session.run(
                "MATCH (a:Atom {id:$src}), (b:Atom {id:$tgt}) MERGE (a)-[r:`" + etype + "`]->(b)",
                src=src, tgt=tgt,
            )
    print("Neo4j sync complete")


if __name__ == "__main__":
    main()
