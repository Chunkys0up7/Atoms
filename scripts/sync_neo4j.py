#!/usr/bin/env python3
"""Neo4j sync helper.

This script validates a graph JSON and optionally upserts nodes and
relationships to a Neo4j instance using the official `neo4j` driver.
Use `--dry-run` to only validate inputs. Relationship types are sanitized
to alphanumeric/underscore to avoid injection into Cypher.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from typing import Tuple


def validate_graph(path: str) -> Tuple[int, int]:
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    return len(nodes), len(edges)


def sanitize_relation_type(t: str) -> str:
    if not t:
        return "RELATED"
    s = re.sub(r"[^A-Za-z0-9_]+", "_", t)
    s = s.strip("_")
    return s[:64] or "RELATED"


def upsert_to_neo4j(path: str, uri: str, user: str, password: str) -> None:
    from neo4j import GraphDatabase

    driver = GraphDatabase.driver(uri, auth=(user, password))
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    with driver.session() as session:
        for n in nodes:
            nid = n.get("id")
            label = n.get("type") or "Atom"
            props = {k: v for k, v in n.items() if k not in ("id", "type")}
            cypher = (
                "MERGE (x:Atom {id:$id}) SET x.type=$type, x += $props, x.label = $label"
            )
            session.run(cypher, id=nid, type=label, props=props, label=label)

        for e in edges:
            src = e.get("source")
            tgt = e.get("target")
            etype = sanitize_relation_type(e.get("type", "RELATED"))
            props = {k: v for k, v in e.items() if k not in ("source", "target", "type")}
            cypher = (
                f"MATCH (a:Atom {{id:$src}}), (b:Atom {{id:$tgt}}) MERGE (a)-[r:`{etype}`]->(b) SET r += $props"
            )
            session.run(cypher, src=src, tgt=tgt, props=props)


def main() -> None:
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
        print("Dry run: validated graph, no DB actions performed")
        return

    uri = os.environ.get("NEO4J_BOLT_URI")
    user = os.environ.get("NEO4J_USER")
    password = os.environ.get("NEO4J_PASSWORD")
    if not (uri and user and password):
        print("Missing Neo4j credentials; run with --dry-run for validation.", file=sys.stderr)
        sys.exit(1)

    try:
        upsert_to_neo4j(args.graph, uri, user, password)
        print("Neo4j sync complete")
    except Exception as e:
        print("Neo4j sync failed:", e, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
