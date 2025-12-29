#!/usr/bin/env python3
"""
Local script to commit atom changes with intelligent commit messages.

This script analyzes uncommitted atom YAML files and creates detailed commit messages
showing what atoms were added/modified and their categories/types.

Usage:
    python scripts/commit_atom_changes.py              # Analyze and commit all atom changes
    python scripts/commit_atom_changes.py --dry-run    # Preview commit without executing
    python scripts/commit_atom_changes.py --message "Custom message"  # Use custom message
"""

import subprocess
import sys
import yaml
from pathlib import Path
from collections import defaultdict
from datetime import datetime
import argparse


def run_git_command(cmd, capture_output=True):
    """Run a git command and return the result"""
    try:
        result = subprocess.run(
            cmd,
            capture_output=capture_output,
            text=True,
            check=True
        )
        return result.stdout.strip() if capture_output else None
    except subprocess.CalledProcessError as e:
        print(f"Git command failed: {' '.join(cmd)}")
        print(f"Error: {e.stderr}")
        sys.exit(1)


def get_changed_atom_files():
    """Get list of modified/new atom YAML files"""
    result = run_git_command(['git', 'status', '--porcelain', 'atoms/', 'test_data/'])

    files = []
    for line in result.split('\n'):
        if line and line.endswith('.yaml'):
            status = line[:2].strip()
            filepath = line[3:].strip()
            files.append((status, filepath))

    return files


def analyze_atom_file(filepath):
    """Extract key information from an atom YAML file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)

        return {
            'id': data.get('id', 'unknown'),
            'name': data.get('name', 'Unnamed'),
            'type': data.get('type', 'unknown'),
            'category': data.get('category', 'unknown'),
            'owning_team': data.get('owning_team') or data.get('team', 'unassigned'),
            'author': data.get('author') or data.get('owner', 'unknown')
        }
    except Exception as e:
        print(f"Warning: Could not parse {filepath}: {e}")
        return None


def generate_commit_message(stats, custom_message=None):
    """Generate a detailed commit message from atom change statistics"""

    if custom_message:
        return custom_message

    # Summary line
    summary_parts = []
    if stats['new'] > 0:
        summary_parts.append(f"{stats['new']} new")
    if stats['modified'] > 0:
        summary_parts.append(f"{stats['modified']} modified")

    if not summary_parts:
        return None

    summary = f"feat(atoms): {', '.join(summary_parts)} atom(s)"

    # Detailed breakdown
    lines = [summary, ""]

    # Category breakdown
    if stats['by_category']:
        lines.append("Categories:")
        for category, count in sorted(stats['by_category'].items()):
            lines.append(f"  - {category}: {count}")
        lines.append("")

    # Type breakdown
    if stats['by_type']:
        lines.append("Types:")
        for atom_type, count in sorted(stats['by_type'].items()):
            lines.append(f"  - {atom_type}: {count}")
        lines.append("")

    # List of affected atoms (limit to 15)
    if stats['atoms']:
        lines.append("Affected atoms:")
        for atom_info in stats['atoms'][:15]:
            lines.append(f"  - {atom_info}")
        if len(stats['atoms']) > 15:
            lines.append(f"  ... and {len(stats['atoms']) - 15} more")
        lines.append("")

    # Footer
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    lines.append(f"Committed at: {timestamp}")

    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description='Commit atom changes with intelligent messages')
    parser.add_argument('--dry-run', action='store_true', help='Preview commit without executing')
    parser.add_argument('--message', '-m', type=str, help='Custom commit message')
    parser.add_argument('--push', action='store_true', help='Push changes after commit')

    args = parser.parse_args()

    print("[*] Analyzing atom changes...")

    # Get changed files
    changed_files = get_changed_atom_files()

    if not changed_files:
        print("[+] No uncommitted atom changes found")
        return 0

    print(f"\n[*] Found {len(changed_files)} changed atom file(s)")

    # Analyze changes
    stats = {
        'new': 0,
        'modified': 0,
        'by_category': defaultdict(int),
        'by_type': defaultdict(int),
        'by_team': defaultdict(int),
        'atoms': []
    }

    for status, filepath in changed_files:
        atom_info = analyze_atom_file(filepath)
        if atom_info:
            # Track status
            if status == 'M':
                stats['modified'] += 1
                status_label = "modified"
            elif status in ('A', '??'):
                stats['new'] += 1
                status_label = "new"
            else:
                status_label = status

            # Track by category/type/team
            stats['by_category'][atom_info['category']] += 1
            stats['by_type'][atom_info['type']] += 1
            stats['by_team'][atom_info['owning_team']] += 1

            # Store atom info
            atom_entry = f"{atom_info['id']} ({atom_info['type']}, {status_label})"
            stats['atoms'].append(atom_entry)

            print(f"  - {status_label.upper()}: {atom_info['name']} [{atom_info['type']}]")

    # Generate commit message
    commit_message = generate_commit_message(stats, args.message)

    if not commit_message:
        print("[-] No changes to commit")
        return 1

    print("\n[*] Commit message:")
    print("=" * 60)
    print(commit_message)
    print("=" * 60)

    if args.dry_run:
        print("\n[*] DRY RUN - No changes committed")
        return 0

    # Stage changes
    print("\n[*] Staging atom files...")
    run_git_command(['git', 'add', 'atoms/', 'test_data/'], capture_output=False)

    # Commit
    print("[*] Creating commit...")
    run_git_command(['git', 'commit', '-m', commit_message], capture_output=False)

    print("[+] Atom changes committed successfully!")

    # Push if requested
    if args.push:
        print("\n[*] Pushing to remote...")
        try:
            run_git_command(['git', 'push'], capture_output=False)
            print("[+] Changes pushed to remote!")
        except Exception as e:
            print(f"[!] Push failed: {e}")
            print("You can push manually with: git push")

    return 0


if __name__ == '__main__':
    sys.exit(main())
