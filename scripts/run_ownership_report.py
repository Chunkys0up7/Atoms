import json
import sys
from pathlib import Path

# Ensure project root is on sys.path so `api` package can be imported
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.routes import ownership

try:
    atoms = ownership.load_atoms()
    coverage = ownership.calculate_coverage(atoms)
    top_owners = ownership.get_owner_stats(atoms, "owner")
    top_stewards = ownership.get_owner_stats(atoms, "steward")
    domain_coverage = ownership.get_domain_coverage(atoms)
    unassigned = ownership.get_unassigned_atoms(atoms)
    gaps = ownership.identify_gaps(coverage, domain_coverage)

    report = {
        "coverage": coverage.dict(),
        "top_owners": [o.dict() for o in top_owners],
        "top_stewards": [s.dict() for s in top_stewards],
        "domain_coverage": {k: v.dict() for k, v in domain_coverage.items()},
        "unassigned_atoms": [a.dict() for a in unassigned],
        "ownership_gaps": gaps,
    }

    print(json.dumps(report, indent=2))
except Exception as e:
    print(json.dumps({"error": str(e)}))
