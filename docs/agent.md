<!--
Agent guidance for the GNDP project: how an automated agent supports CI/CD,
PR triage, impact analysis and deployment for https://github.com/Chunkys0up7/Atoms.git
-->
# Agent for GNDP — responsibilities and CI/CD integration

Purpose
- Provide a lightweight, auditable automation agent that assists with
  validation, impact analysis, risk scoring, changelog generation, and
  producing PR comments for `https://github.com/Chunkys0up7/Atoms.git`.

Agent responsibilities
- Validate atom/module schemas on PRs (YAML/JSON schema checks).
- Run impact analysis to compute downstream effects and risk scores.
- Run linters and tests that exercise documentation build scripts.
- Post summarized impact reports to PRs and raise reviewer routing suggestions.
- On merge, run `build_docs.py`, publish docs (GitHub Pages or other), and
  optionally sync graph data to Neo4j and RAG indexes.

Integration points (where the agent runs)
- GitHub Actions: primary runner for PRs and merges.
- Local CLI: developers can run the same checks locally before pushing.
- CI worker (optional): longer jobs (Neo4j sync, embeddings) run in scheduled jobs.

Recommended GitHub Actions job (high level)

name: gndp-agent

on:
  pull_request:
    paths:
      - 'atoms/**'
      - 'modules/**'
      - 'docs/**'

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install deps
        run: pip install pyyaml jsonschema
      - name: Schema validation
        run: python docs/build_docs.py --validate --quiet
      - name: Impact analysis
        run: python docs/impact_analysis.py --pr ${{ github.event.pull_request.number }}
      - name: Post PR report
        run: python scripts/post_pr_report.py --pr ${{ github.event.pull_request.number }}

Configuration & secrets
- Store any agent API keys or credentials in repository secrets (e.g., `CLAUDE_API_KEY`,
  `NEO4J_BOLT_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`).
- Use the least-privilege principle for any deploy credentials. The agent should not
  include sensitive keys in its outputs.

Local developer workflow
- Install dependencies (see `docs/README.md` top-level quick start).
- Run schema and impact checks:

```bash
python docs/build_docs.py --validate
python docs/impact_analysis.py --local --dry-run
```

Prompts & automation hooks
- Keep a small set of deterministic checks in CI (schema, linters, unit tests).
- Use the agent to generate human-readable impact reports and caller-ready
  summaries (one-paragraph, risk level, affected modules, suggested reviewers).

Security & governance
- Log agent actions to CI logs and to the PR (summaries only).
- Do not post full atom contents with PII into PR bodies; redact sensitive fields.
- Maintain audit logs (who triggered runs, their outputs, and artifacts).

When to escalate
- If risk score >= CRITICAL, require manual approval and tag the PR for executive review.

References
- Documentation system overview: see `docs/GNDP-Architecture.md` and `docs/README.md`.
