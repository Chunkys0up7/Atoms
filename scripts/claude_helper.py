#!/usr/bin/env python3
"""Simple helper to call Claude-like API and produce a structured JSON
for a PR. Writes output to a file path provided by --out.

This is intentionally minimal: it builds a small context from the PR title
and body (via GitHub API) and asks the model for a JSON summary.
"""
import argparse
import os
import sys
import json
import requests

GITHUB_API = "https://api.github.com"
CLAUDE_ENDPOINT = "https://api.anthropic.com/v1/complete"


def get_pr(repo, pr_number, token):
    url = f"{GITHUB_API}/repos/{repo}/pulls/{pr_number}"
    resp = requests.get(url, headers={"Authorization": f"token {token}"})
    resp.raise_for_status()
    return resp.json()


def call_claude(api_key, prompt):
    if not api_key:
        raise RuntimeError("Missing CLAUDE_API_KEY")
    resp = requests.post(
        CLAUDE_ENDPOINT,
        headers={"x-api-key": api_key, "Content-Type": "application/json"},
        json={
            "model": "claude-2",
            "prompt": prompt,
            "max_tokens": 512,
            "temperature": 0.0,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def build_prompt(pr):
    title = pr.get("title", "")
    body = pr.get("body", "") or ""
    changed_files = pr.get("changed_files", 0)
    context = {
        "title": title,
        "body": (body[:2000] + "...") if len(body) > 2000 else body,
        "changed_files": changed_files,
    }
    prompt = (
        "Context: " + json.dumps(context) + "\n"
        "Task: Return a JSON object with keys: summary (string), risk_level (LOW|MEDIUM|HIGH|CRITICAL), "
        "affected_modules (array of module ids), suggested_reviewers (array of usernames). Only return JSON."
    )
    return prompt


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--pr", required=True)
    p.add_argument("--out", required=True)
    args = p.parse_args()

    repo = os.environ.get("GITHUB_REPOSITORY")
    token = os.environ.get("GITHUB_TOKEN")
    api_key = os.environ.get("CLAUDE_API_KEY")

    if not repo or not token:
        print("Missing GITHUB_REPOSITORY or GITHUB_TOKEN environment variables", file=sys.stderr)
        sys.exit(1)

    pr = get_pr(repo, args.pr, token)
    prompt = build_prompt(pr)
    try:
        resp = call_claude(api_key, prompt)
        # Extract text from Claude response — model APIs vary; try common fields
        text = resp.get("completion", resp.get("text", None))
        if text is None:
            # fallback: stringify entire response
            text = json.dumps(resp)

        # try to parse JSON from the response text
        try:
            parsed = json.loads(text)
        except Exception:
            parsed = {"summary": text}

        os.makedirs(os.path.dirname(args.out), exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as fh:
            json.dump({"pr": args.pr, "model_output": parsed}, fh, indent=2)
        print(f"Wrote claude output to {args.out}")
    except Exception as e:
        print("Claude call failed:", e, file=sys.stderr)
        # Write a minimal fallback
        with open(args.out, "w", encoding="utf-8") as fh:
            json.dump({"pr": args.pr, "model_output": {"summary": "Model call failed"}}, fh)
        sys.exit(0)


if __name__ == "__main__":
    main()
