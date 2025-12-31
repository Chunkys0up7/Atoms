#!/usr/bin/env python3
"""Generate extensive demo atoms and modules for GNDP.

Writes YAML/JSON files into the repository `atoms/` subfolders and `modules/`.
Also emits `test_data/graph.json` suitable for `scripts/sync_neo4j.py`.

Usage:
  python scripts/generate_demo_data.py --count 500
"""
from __future__ import annotations

import argparse
import json
import os
import random
import string
import uuid
from datetime import datetime
from typing import Dict, List

try:
    import yaml
except Exception:
    yaml = None

ROOT = os.path.join(os.path.dirname(__file__), "..")
REPO_ROOT = os.path.abspath(ROOT)
ATOMS_ROOT = os.path.join(REPO_ROOT, "atoms")
MODULES_ROOT = os.path.join(REPO_ROOT, "modules")
TEST_OUT = os.path.join(REPO_ROOT, "test_data")

ATOM_TYPES = [
    ("requirements", "requirement"),
    ("designs", "design"),
    ("procedures", "procedure"),
    ("validations", "validation"),
    ("policies", "policy"),
    ("risks", "risk"),
]


def ensure_dirs():
    os.makedirs(TEST_OUT, exist_ok=True)
    os.makedirs(MODULES_ROOT, exist_ok=True)
    for subdir, _ in ATOM_TYPES:
        d = os.path.join(ATOMS_ROOT, subdir)
        os.makedirs(d, exist_ok=True)


def rand_id(prefix: str, i: int) -> str:
    return f"{prefix.upper()}-{i:05d}"


def make_atom(atom_type: str, idx: int) -> Dict:
    aid = rand_id(atom_type[:3], idx)
    atom = {
        "id": aid,
        "type": atom_type,
        "title": f"{atom_type.title()} {idx}",
        "summary": f"Auto-generated {atom_type} #{idx} for demo",
        "owner": random.choice(["team-a", "team-b", "security", "ops"]),
        "created_at": datetime.utcnow().isoformat(),
        "metadata": {"priority": random.choice(["low", "medium", "high"])},
    }
    return atom


def write_atom_file(obj: Dict, subdir: str) -> None:
    fname = f"{obj['id']}.yaml"
    path = os.path.join(ATOMS_ROOT, subdir, fname)
    if yaml:
        with open(path, "w", encoding="utf-8") as fh:
            yaml.safe_dump(obj, fh, sort_keys=False)
    else:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(obj, fh, indent=2)


def write_module(mod: Dict) -> None:
    fname = f"{mod['id']}.yaml"
    path = os.path.join(MODULES_ROOT, fname)
    if yaml:
        with open(path, "w", encoding="utf-8") as fh:
            yaml.safe_dump(mod, fh, sort_keys=False)
    else:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(mod, fh, indent=2)


def generate(count: int = 500) -> None:
    ensure_dirs()

    nodes: List[Dict] = []
    edges: List[Dict] = []

    # create modules
    n_modules = max(5, count // 50)
    modules = []
    for m in range(1, n_modules + 1):
        mid = f"MOD-{m:03d}"
        mod = {
            "id": mid,
            "type": "Module",
            "name": f"Module {m}",
            "description": f"Demo module {m}",
            "owner": random.choice(["team-a", "team-b", "platform"]),
        }
        write_module(mod)
        modules.append(mod)
        nodes.append({"id": mid, "type": "Module"})

    # distribute atoms across types roughly equally
    per_type = max(1, count // len(ATOM_TYPES))
    idx = 1
    for subdir, tname in ATOM_TYPES:
        for i in range(1, per_type + 1):
            atom = make_atom(tname, idx)
            write_atom_file(atom, subdir)
            nodes.append({"id": atom["id"], "type": atom["type"]})

            # randomly attach to a module
            mod = random.choice(modules)
            edges.append({"source": atom["id"], "target": mod["id"], "type": "BELONGS_TO"})

            # create links between requirement -> design -> procedure -> validation
            if tname == "requirement":
                # create a design node referencing this requirement
                d_id = f"DES-{idx:05d}"
                design = {
                    "id": d_id,
                    "type": "design",
                    "title": f"Design for {atom['id']}",
                }
                write_atom_file(design, "designs")
                nodes.append({"id": d_id, "type": "design"})
                edges.append({"source": d_id, "target": atom["id"], "type": "IMPLEMENTS"})

                # procedure
                p_id = f"PROC-{idx:05d}"
                proc = {"id": p_id, "type": "procedure", "title": f"Procedure for {atom['id']}"}
                write_atom_file(proc, "procedures")
                nodes.append({"id": p_id, "type": "procedure"})
                edges.append({"source": p_id, "target": d_id, "type": "IMPLEMENTS"})

                # validation
                v_id = f"VAL-{idx:05d}"
                val = {"id": v_id, "type": "validation", "title": f"Validation for {atom['id']}"}
                write_atom_file(val, "validations")
                nodes.append({"id": v_id, "type": "validation"})
                edges.append({"source": v_id, "target": p_id, "type": "VALIDATES"})

            idx += 1

    # add a few policies and risks linking to random requirements
    for r in range(1, max(3, count // 100) + 1):
        rid = f"POL-{r:03d}"
        policy = {"id": rid, "type": "policy", "title": f"Policy {r}", "owner": "compliance"}
        write_atom_file(policy, "policies")
        nodes.append({"id": rid, "type": "policy"})
        # link to some requirements
        req_ids = [n["id"] for n in nodes if n["type"] == "requirement"]
        if req_ids:
            for _ in range(3):
                target = random.choice(req_ids)
                edges.append({"source": rid, "target": target, "type": "GOVERN"})

    # write graph.json
    graph = {"nodes": nodes, "edges": edges}
    with open(os.path.join(TEST_OUT, "graph.json"), "w", encoding="utf-8") as fh:
        json.dump(graph, fh, indent=2)

    print(
        f"Generated demo data: {len(nodes)} nodes, {len(edges)} edges. Atoms in {ATOMS_ROOT}, modules in {MODULES_ROOT}, graph at {TEST_OUT}/graph.json"
    )


def cli():
    p = argparse.ArgumentParser()
    p.add_argument("--count", type=int, default=300, help="Approx number of atoms to generate")
    args = p.parse_args()
    generate(args.count)


if __name__ == "__main__":
    cli()
