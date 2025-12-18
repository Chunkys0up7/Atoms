# Claude integration notes for GNDP

Purpose
- Guidance and example snippets for using an LLM (Anthropic Claude or similar)
  to assist the GNDP agent with tasks like atom extraction, summarization,
  impact-analysis drafting, and reviewer suggestion.

Important constraints
- Never send PII or full sensitive atom contents to an external model.
- Keep model prompts deterministic when used in CI; prefer low temperature.
- Store API keys in repository/organization secrets (e.g., `CLAUDE_API_KEY`).

Recommended operational pattern
1. Build a small, deterministic context using local data:
   - atom metadata (id, type, summary)
   - key upstream/downstream node ids (truncate long lists)
   - one-line change description from PR
2. Use a short prompt template that asks for a structured JSON output
   (one-paragraph summary, risk_level, affected_modules[], suggested_reviewers[]).
3. Validate and sanitize the model output before posting to PRs.

Example prompt template
```
Context: <<INSERT TRUNCATED GRAPH CONTEXT JSON>>
Change: <<ONE-LINE DESCRIPTION>>

Task: Provide a JSON object with keys: summary (string), risk_level (LOW|MEDIUM|HIGH|CRITICAL),
affected_modules (array of module ids), suggested_reviewers (array of usernames).
Only return JSON.
```

Example shell call (curl)
```
curl https://api.anthropic.com/v1/complete \
  -H "x-api-key: $CLAUDE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-2","prompt":"<PROMPT>","max_tokens":512,"temperature":0.0}'
```

Python example (requests)
```python
import os
import requests

API_KEY = os.environ.get('CLAUDE_API_KEY')
endpoint = 'https://api.anthropic.com/v1/complete'

def call_claude(prompt: str):
    resp = requests.post(
        endpoint,
        headers={
            'x-api-key': API_KEY,
            'Content-Type': 'application/json'
        },
        json={
            'model': 'claude-2',
            'prompt': prompt,
            'max_tokens': 512,
            'temperature': 0.0
        }
    )
    resp.raise_for_status()
    return resp.json()
```

GitHub Actions snippet (calling a helper script)
```yaml
jobs:
  claus:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v4
        with: { python-version: '3.10' }
      - name: Install deps
        run: pip install requests
      - name: Call Claude helper
        env:
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
        run: python scripts/claude_helper.py --pr ${{ github.event.pull_request.number }}
```

Sanitization checklist
- Remove or redact names, emails, identifiers that are sensitive.
- Limit context size: include only top N downstream nodes and a short snippet of content.
- Validate that suggested_reviewers exist in the org before posting.

Failure modes
- If Claude returns malformed JSON, fall back to a deterministic rule-based summary.
- If the model suggests an excessively broad reviewer set, intersect with codeowners and owners lists.

References
- See `docs/agent.md` for where Claude fits into the CI flow.
