#!/usr/bin/env python3
"""Generate a variety of status examples: git, UI atom ownership, CI workflows.

This prints sample outputs and writes `STATUS_OUTPUT.json` and `STATUS_EXAMPLES.md`.
"""
import json
import subprocess
import sys
from pathlib import Path

out = {"git_status": None, "git_recent_atom_commits": None, "ui_atom_status_examples": [], "ci_workflow_examples": []}

root = Path(__file__).parent.parent

# Git status
try:
    g = subprocess.check_output(["git", "status", "--porcelain"], cwd=str(root), stderr=subprocess.STDOUT).decode(
        errors="replace"
    )
    out["git_status"] = g.strip().splitlines()[:100]
except Exception as e:
    out["git_status"] = f"ERROR: {e}"

# Recent commits touching atoms
try:
    lg = subprocess.check_output(
        ["git", "log", "--oneline", "-n", "20", "--", "atoms"], cwd=str(root), stderr=subprocess.STDOUT
    ).decode(errors="replace")
    out["git_recent_atom_commits"] = lg.strip().splitlines()
except Exception as e:
    out["git_recent_atom_commits"] = f"ERROR: {e}"

# UI Atom/Ownership status examples (home lending themed)
ui_examples = [
    {
        "atom_id": "atom-cust-pre-approval-letter",
        "name": "Pre-Approval Letter",
        "status": "PUBLISHED",
        "owner": "Sarah Chen",
        "steward": "Amanda White",
        "criticality": "HIGH",
        "compliance_score": 95,
    },
    {
        "atom_id": "atom-bo-w2-review",
        "name": "W2 Review",
        "status": "DRAFT",
        "owner": "James Martinez",
        "steward": None,
        "criticality": "CRITICAL",
        "compliance_score": 74,
    },
    {
        "atom_id": "atom-sys-income-calculation",
        "name": "Income Calculation Service",
        "status": "ACTIVE",
        "owner": "David Thompson",
        "steward": "David Thompson",
        "criticality": "MEDIUM",
        "compliance_score": 88,
    },
    {
        "atom_id": "atom-closing-esign-integration",
        "name": "eSign Integration",
        "status": "IN_REVIEW",
        "owner": None,
        "steward": None,
        "criticality": "HIGH",
        "compliance_score": None,
    },
    {
        "atom_id": "atom-uw-auto-approve",
        "name": "Underwriting Auto-Approve",
        "status": "ACTIVE",
        "owner": "Underwriting Team",
        "steward": "Sarah Chen",
        "criticality": "CRITICAL",
        "compliance_score": 92,
    },
]
out["ui_atom_status_examples"] = ui_examples

# CI workflow examples (simulate recent runs)
ci_examples = [
    {
        "workflow": "CI",
        "run_id": 1024,
        "status": "completed",
        "conclusion": "success",
        "branch": "main",
        "started_at": "2025-12-26T02:10:00Z",
    },
    {
        "workflow": "tests.yml",
        "run_id": 1027,
        "status": "completed",
        "conclusion": "failure",
        "branch": "feature/add-rules",
        "started_at": "2025-12-25T20:30:00Z",
    },
    {
        "workflow": "refresh-fixtures",
        "run_id": 1033,
        "status": "in_progress",
        "conclusion": None,
        "branch": "chore/refresh-data",
        "started_at": "2025-12-26T05:00:00Z",
    },
    {
        "workflow": "deploy.yml",
        "run_id": 1012,
        "status": "completed",
        "conclusion": "success",
        "branch": "main",
        "started_at": "2025-12-24T18:00:00Z",
    },
]
out["ci_workflow_examples"] = ci_examples

# Write JSON output
with open(root / "STATUS_OUTPUT.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)

# Create a human readable markdown
md = []
md.append("# Status Examples\n")
md.append("## Git Status (porcelain sample)\n")
if isinstance(out["git_status"], list):
    md.extend([f"- `{line}`" for line in out["git_status"][:50]])
else:
    md.append(f'- {out["git_status"]}')

md.append("\n## Recent Atom Commits\n")
if isinstance(out["git_recent_atom_commits"], list):
    for c in out["git_recent_atom_commits"][:20]:
        md.append(f"- {c}")
else:
    md.append(f'- {out["git_recent_atom_commits"]}')

md.append("\n## UI Atom / Ownership Status Examples\n")
for a in out["ui_atom_status_examples"]:
    md.append(
        f"- **{a['atom_id']}** — {a['name']} — Status: **{a['status']}** — Owner: `{a.get('owner')}` — Steward: `{a.get('steward')}` — Criticality: {a['criticality']} — Compliance: {a.get('compliance_score')}"
    )

md.append("\n## CI Workflow Examples\n")
for w in out["ci_workflow_examples"]:
    md.append(
        f"- **{w['workflow']}** (run {w['run_id']}) — Status: {w['status']} — Conclusion: {w.get('conclusion')} — Branch: {w['branch']} — Started: {w['started_at']}"
    )

with open(root / "STATUS_EXAMPLES.md", "w", encoding="utf-8") as f:
    f.write("\n".join(md))

print("Wrote STATUS_OUTPUT.json and STATUS_EXAMPLES.md")
print("Summary:")
print("  Git status lines:", len(out["git_status"]) if isinstance(out["git_status"], list) else "error")
print(
    "  Atom commits:",
    len(out["git_recent_atom_commits"]) if isinstance(out["git_recent_atom_commits"], list) else "error",
)
print("  UI examples:", len(out["ui_atom_status_examples"]))
print("  CI examples:", len(out["ci_workflow_examples"]))
