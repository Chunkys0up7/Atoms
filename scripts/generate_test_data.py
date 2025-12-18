#!/usr/bin/env python3
"""Generate synthetic test data for a home-loan / banking integration demo.

Creates:
 - test_data/atoms/*.yaml  (one file per entity)
 - test_data/graph.json    (nodes + edges suitable for `scripts/sync_neo4j.py`)
 - test_data/docs/*.txt    (example documents)

Usage:
  python scripts/generate_test_data.py --count 50

The generator intentionally includes some edge cases (missing fields,
conflicting states, duplicate identifiers, and broken relationships)
to exercise integrations and error handling.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import random
import string
import uuid
from datetime import datetime, timedelta
from typing import Dict, List

try:
    import yaml
except Exception:
    yaml = None


ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "test_data")
ATOMS = os.path.join(OUT, "atoms")
DOCS = os.path.join(OUT, "docs")


def ensure_dirs() -> None:
    os.makedirs(ATOMS, exist_ok=True)
    os.makedirs(DOCS, exist_ok=True)


FIRST_NAMES = [
    "Alex",
    "Jordan",
    "Taylor",
    "Morgan",
    "Casey",
    "Riley",
    "Jamie",
    "Cameron",
]

STREETS = [
    "Maple St", "Oak Ave", "Pine Rd", "Cedar Lane", "Elm St", "Birch Blvd"
]

EMPLOYERS = ["Acme Bank", "First Horizon Finance", "Trustline Mortgage", "HomeCore LLC"]


def rand_ssn() -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(9))


def rand_phone() -> str:
    return f"+1-555-{random.randint(100,999)}-{random.randint(1000,9999)}"


def rand_address() -> str:
    return f"{random.randint(100,9999)} {random.choice(STREETS)}, {random.choice(['Springfield','Rivertown','Lakeview'])}, ST {random.randint(10000,99999)}"


def make_applicant(i: int) -> Dict:
    fname = random.choice(FIRST_NAMES)
    lname = random.choice(["Smith", "Johnson", "Lee", "Garcia", "Brown"])
    aid = f"app-{i:04d}"
    app = {
        "id": aid,
        "type": "Applicant",
        "name": f"{fname} {lname}",
        "ssn": rand_ssn() if random.random() > 0.05 else "",  # some missing
        "phone": rand_phone(),
        "email": f"{fname.lower()}.{lname.lower()}{i}@example.com",
        "address": rand_address(),
        "created_at": datetime.utcnow().isoformat(),
    }
    return app


def make_employment(app_id: str) -> Dict:
    eid = str(uuid.uuid4())
    emp = {
        "id": eid,
        "type": "Employment",
        "employer": random.choice(EMPLOYERS),
        "title": random.choice(["Analyst", "Manager", "Loan Officer", "Developer"]),
        "start_date": (datetime.utcnow() - timedelta(days=random.randint(365, 3650))).date().isoformat(),
        "salary": random.randint(40000, 200000),
    }
    return emp


def make_property(i: int) -> Dict:
    pid = f"prop-{i:04d}"
    return {
        "id": pid,
        "type": "Property",
        "address": rand_address(),
        "estimated_value": random.randint(150000, 1200000),
    }


def make_loan(applicant_id: str, prop_id: str) -> Dict:
    lid = f"loan-{uuid.uuid4().hex[:8]}"
    amount = random.randint(80000, 800000)
    status = random.choices(["submitted", "underwriting", "approved", "declined", "funded"], [0.25,0.3,0.2,0.15,0.1])[0]
    return {
        "id": lid,
        "type": "LoanApplication",
        "applicant_id": applicant_id,
        "property_id": prop_id,
        "amount": amount,
        "term_years": random.choice([15, 20, 30]),
        "interest_rate": round(random.uniform(2.5, 6.5), 3),
        "status": status,
        "created_at": datetime.utcnow().isoformat(),
    }


def write_atom(obj: Dict) -> None:
    fname = f"{obj['id']}.yaml"
    path = os.path.join(ATOMS, fname)
    if yaml:
        with open(path, "w", encoding="utf-8") as fh:
            yaml.safe_dump(obj, fh, sort_keys=False)
    else:
        # best-effort YAML-like file
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(obj, fh, indent=2)


def generate(count: int = 50) -> None:
    ensure_dirs()

    nodes: List[Dict] = []
    edges: List[Dict] = []

    # create a small set of lenders and mortgage products
    lenders = []
    for j in range(3):
        lid = f"lender-{j}"
        lender = {"id": lid, "type": "Lender", "name": f"Lender {j}", "contact": rand_phone()}
        write_atom(lender)
        nodes.append({"id": lid, "type": "Lender"})
        lenders.append(lender)

    products = []
    for j in range(6):
        pid = f"product-{j}"
        prod = {"id": pid, "type": "MortgageProduct", "name": f"30yr Fixed {3+j}%", "rate": round(2.5 + j*0.25, 2)}
        write_atom(prod)
        nodes.append({"id": pid, "type": "MortgageProduct"})
        products.append(prod)

    # Generate applicants, properties, loans
    for i in range(1, count + 1):
        applicant = make_applicant(i)
        write_atom(applicant)
        nodes.append({"id": applicant["id"], "type": "Applicant"})

        # employment
        emp = make_employment(applicant["id"])
        write_atom(emp)
        nodes.append({"id": emp["id"], "type": "Employment"})
        edges.append({"source": applicant["id"], "target": emp["id"], "type": "EMPLOYED_AT"})

        prop = make_property(i)
        write_atom(prop)
        nodes.append({"id": prop["id"], "type": "Property"})

        loan = make_loan(applicant["id"], prop["id"])
        write_atom(loan)
        nodes.append({"id": loan["id"], "type": "LoanApplication"})

        # relationships
        edges.append({"source": applicant["id"], "target": loan["id"], "type": "APPLIED_FOR"})
        edges.append({"source": loan["id"], "target": prop["id"], "type": "SECURES"})

        # Connect to a random lender and product
        lender = random.choice(lenders)
        edges.append({"source": loan["id"], "target": lender["id"], "type": "OFFERED_BY"})

        product_id = random.choice(products)["id"]
        edges.append({"source": loan["id"], "target": product_id, "type": "PRODUCT"})

        # Add occasional anomalies
        if random.random() < 0.06:
            # missing income: write a partial applicant file with missing ssn
            applicant_anom = dict(applicant)
            applicant_anom.pop("ssn", None)
            applicant_anom["note"] = "missing_ssn"
            write_atom(applicant_anom)

        if random.random() < 0.03:
            # duplicate ID edge case (duplicate node id intentionally)
            dup = dict(applicant)
            dup_id = applicant["id"]
            dup["id"] = dup_id  # same id
            dup["note"] = "duplicate"
            write_atom(dup)

    # Add a few orphan nodes and broken relations to exercise error handling
    orphan = {"id": "orphan-1", "type": "Document", "name": "missing-target.pdf"}
    write_atom(orphan)
    nodes.append({"id": orphan["id"], "type": orphan["type"]})
    edges.append({"source": "orphan-1", "target": "non-existent-node", "type": "LINKS_TO"})

    graph = {"nodes": nodes, "edges": edges}
    with open(os.path.join(OUT, "graph.json"), "w", encoding="utf-8") as fh:
        json.dump(graph, fh, indent=2)

    # create a couple example docs
    for k in range(1, 4):
        with open(os.path.join(DOCS, f"doc-{k}.txt"), "w", encoding="utf-8") as fh:
            fh.write(f"Example doc {k} for loan demo. Generated: {datetime.utcnow().isoformat()}\n")

    print(f"Generated {count} applicant/applications + graph at {OUT}")


def cli():
    p = argparse.ArgumentParser()
    p.add_argument("--count", type=int, default=50)
    args = p.parse_args()
    generate(args.count)


if __name__ == "__main__":
    cli()
