#!/usr/bin/env python3
"""Export test_data/graph.json to CSV files usable for bulk import into Neo4j.

Outputs:
 - test_data/csv/nodes.csv (id,type,json_props)
 - test_data/csv/edges.csv (source,target,type,json_props)

Run from repo root:
  python scripts/export_graph_to_csv.py
"""
from __future__ import annotations

import csv
import json
import os
from typing import Any, Dict

ROOT = os.path.join(os.path.dirname(__file__), "..")
DATA = os.path.join(ROOT, "test_data")
OUT = os.path.join(DATA, "csv")


def ensure_out():
    os.makedirs(OUT, exist_ok=True)


def node_props(node: Dict[str, Any]) -> Dict[str, Any]:
    props = dict(node)
    props.pop("id", None)
    props.pop("type", None)
    return props


def edge_props(edge: Dict[str, Any]) -> Dict[str, Any]:
    props = dict(edge)
    props.pop("source", None)
    props.pop("target", None)
    props.pop("type", None)
    return props


def main():
    path = os.path.join(DATA, "graph.json")
    if not os.path.exists(path):
        raise SystemExit("Missing test_data/graph.json — run scripts/generate_test_data.py first")
    ensure_out()
    with open(path, "r", encoding="utf-8") as fh:
        g = json.load(fh)

    nodes = g.get("nodes", [])
    edges = g.get("edges", [])

    nodes_csv = os.path.join(OUT, "nodes.csv")
    edges_csv = os.path.join(OUT, "edges.csv")

    with open(nodes_csv, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["id", "type", "json_props"])
        for n in nodes:
            w.writerow([n.get("id"), n.get("type"), json.dumps(node_props(n), ensure_ascii=False)])

    with open(edges_csv, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["source", "target", "type", "json_props"])
        for e in edges:
            w.writerow([e.get("source"), e.get("target"), e.get("type"), json.dumps(edge_props(e), ensure_ascii=False)])

    print(f"Wrote: {nodes_csv} ({len(nodes)} rows), {edges_csv} ({len(edges)} rows)")


if __name__ == "__main__":
    main()
