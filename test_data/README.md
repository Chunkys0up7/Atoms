Test data for Home-Loan / Banking demo

This folder is produced by `scripts/generate_test_data.py` and contains:

- `atoms/` — YAML files representing entities (Applicant, LoanApplication, Property, Lender, MortgageProduct, Employment, Document)
- `graph.json` — consolidated nodes + edges usable by `scripts/sync_neo4j.py`
- `docs/` — example small documents (plain text)

Run the generator from the repository root:

```bash
python scripts/generate_test_data.py --count 200
```

Notes:
- The generator includes deliberate anomalies (missing SSNs, duplicate atom IDs, orphan edges) to exercise integrations and error handling.
- Use `scripts/sync_neo4j.py --dry-run --graph test_data/graph.json` to validate the graph before syncing to Neo4j.
