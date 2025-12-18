#!/usr/bin/env python3
"""Claude helper updated to use Messages-style API and robust parsing.

This script fetches PR metadata from GitHub, builds a compact context,
calls the modern Anthropic/Claude messages endpoint (tries chat/completions
first, then falls back), and writes a JSON artifact with the parsed model
output.
"""
import argparse
import os
import sys
import json
import requests
from typing import Optional

GITHUB_API = "https://api.github.com"
ANTHROPIC_CHAT = "https://api.anthropic.com/v1/chat/completions"
ANTHROPIC_COMPLETE = "https://api.anthropic.com/v1/complete"


def get_pr(repo: str, pr_number: str, token: str) -> dict:
    url = f"{GITHUB_API}/repos/{repo}/pulls/{pr_number}"
    resp = requests.get(url, headers={"Authorization": f"token {token}"}, timeout=15)
    resp.raise_for_status()
    return resp.json()


def build_context(pr: dict) -> dict:
    title = pr.get("title", "")
    body = pr.get("body", "") or ""
    changed_files = pr.get("changed_files", 0)
    context = {
        "title": title,
        "body": (body[:2000] + "...") if len(body) > 2000 else body,
        "changed_files": changed_files,
    }
    return context


def call_anthropic_chat(api_key: str, system: str, user: str) -> dict:
    payload = {
        "model": "claude-2.1",  # prefer a modern Claude model name
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.0,
        "max_tokens": 512,
    }
    headers = {"x-api-key": api_key, "Content-Type": "application/json"}
    resp = requests.post(ANTHROPIC_CHAT, json=payload, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()


def call_anthropic_complete(api_key: str, prompt: str) -> dict:
    payload = {
        "model": "claude-2",
        "prompt": prompt,
        "max_tokens": 512,
        "temperature": 0.0,
    }
    headers = {"x-api-key": api_key, "Content-Type": "application/json"}
    resp = requests.post(ANTHROPIC_COMPLETE, json=payload, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()


def extract_text_from_response(resp: dict) -> Optional[str]:
    # Chat-style (choices[].message.content)
    try:
        choices = resp.get("choices") or []
        if choices and isinstance(choices, list):
            first = choices[0]
            msg = first.get("message") or first.get("delta") or {}
            if isinstance(msg, dict):
                content = msg.get("content")
                if content:
                    return content
            # older style
            text = first.get("text") or first.get("content")
            if text:
                return text
    except Exception:
        pass

    # Fallbacks
    for key in ("completion", "text", "response"):
        if key in resp and isinstance(resp[key], str):
            return resp[key]
    return None


def parse_json_or_fallback(text: str) -> dict:
    if not text:
        return {"summary": ""}
    text = text.strip()
    # try to find JSON substring
    try:
        return json.loads(text)
    except Exception:
        # attempt heuristic: find first '{' and last '}'
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end+1])
            except Exception:
                pass
    return {"summary": text}


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
    context = build_context(pr)
    system_msg = (
        "You are GNDP Assistant. Produce a compact JSON object with keys: summary (string), "
        "risk_level (LOW|MEDIUM|HIGH|CRITICAL), affected_modules (array), suggested_reviewers (array)."
    )
    user_msg = f"Context: {json.dumps(context)}\nTask: Return only JSON as described."

    os.makedirs(os.path.dirname(args.out), exist_ok=True)

    if not api_key:
        # No API key: write a deterministic fallback
        fallback = {"pr": args.pr, "model_output": {"summary": "No CLAUDE_API_KEY provided"}}
        with open(args.out, "w", encoding="utf-8") as fh:
            json.dump(fallback, fh, indent=2)
        print("Wrote fallback claude output (no API key)")
        return

    # Try chat completions first, then fallback to complete endpoint
    resp = None
    text = None
    try:
        resp = call_anthropic_chat(api_key, system_msg, user_msg)
        text = extract_text_from_response(resp)
    except Exception:
        try:
            prompt = "Context: " + json.dumps(context) + "\nTask: Return JSON only."
            resp = call_anthropic_complete(api_key, prompt)
            text = extract_text_from_response(resp)
        except Exception as e:
            print("Claude API calls failed:", e, file=sys.stderr)

    parsed = parse_json_or_fallback(text) if text else {"summary": "Model call failed or returned empty"}
    out = {"pr": args.pr, "model_output": parsed}
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2)
    print(f"Wrote claude output to {args.out}")


if __name__ == "__main__":
    main()
