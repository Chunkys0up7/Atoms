#!/usr/bin/env python3
"""Run unit tests reliably inside CI.

This script ensures the repository root is on `sys.path`, sets the
start directory for discovery to the `tests` folder inside the repo,
and runs unittest discovery programmatically. It respects
`GITHUB_WORKSPACE` when available (in GitHub Actions).
"""
from __future__ import annotations

import os
import sys
import unittest


def main() -> int:
    # Determine repo root. In GH Actions this is GITHUB_WORKSPACE.
    repo_root = os.environ.get("GITHUB_WORKSPACE") or os.getcwd()

    # Ensure repo root is on sys.path so imports like 'scripts/...' work.
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)

    tests_dir = os.path.join(repo_root, "tests")
    if not os.path.isdir(tests_dir):
        print("No tests directory found at", tests_dir, file=sys.stderr)
        return 0

    loader = unittest.TestLoader()
    suite = loader.discover(start_dir=tests_dir, pattern="test_*.py")
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
