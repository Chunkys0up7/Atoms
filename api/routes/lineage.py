"""
Git Lineage & Ownership Tracking
Extracts git history for atoms to show who created/modified documentation and when
"""

import os
import subprocess
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/lineage", tags=["lineage"])


# Response Models
class CommitInfo(BaseModel):
    """Single commit in an atom's history"""

    commit_hash: str
    author_name: str
    author_email: str
    timestamp: datetime
    message: str
    changes_summary: Optional[str] = None


class AtomLineage(BaseModel):
    """Complete lineage information for an atom"""

    atom_id: str
    file_path: str
    created_by: str
    created_at: datetime
    last_modified_by: str
    last_modified_at: datetime
    total_commits: int
    commits: List[CommitInfo]


class OwnershipSummary(BaseModel):
    """Ownership statistics across atoms"""

    author_name: str
    author_email: str
    atoms_created: int
    atoms_modified: int
    total_commits: int


# Helper functions
def get_git_root() -> str:
    """Find the git repository root"""
    try:
        result = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=500, detail="Not a git repository")


def get_atom_file_path(atom_id: str) -> Optional[str]:
    """
    Find the YAML file path for an atom ID
    Searches in atoms/ and test_data/ directories
    """
    git_root = get_git_root()

    # Search in multiple locations
    search_dirs = [
        os.path.join(git_root, "atoms"),
        os.path.join(git_root, "test_data", "atoms"),
        os.path.join(git_root, "test_data"),
    ]

    for base_dir in search_dirs:
        if not os.path.exists(base_dir):
            continue

        # Walk through all subdirectories
        for root, dirs, files in os.walk(base_dir):
            for file in files:
                # Match exact atom ID with .yaml or .yml extension
                if file == f"{atom_id}.yaml" or file == f"{atom_id}.yml":
                    full_path = os.path.join(root, file)
                    # Return relative path from git root
                    return os.path.relpath(full_path, git_root).replace("\\", "/")

    return None


def get_file_commits(file_path: str) -> List[CommitInfo]:
    """
    Get all commits that modified a file
    Uses git log with --follow to track renames
    """
    try:
        git_root = get_git_root()

        # Git log command with custom format
        # Format: hash|author name|author email|timestamp|commit message
        cmd = ["git", "log", "--follow", "--pretty=format:%H|%an|%ae|%aI|%s", "--", file_path]  # Track renames

        result = subprocess.run(cmd, capture_output=True, text=True, cwd=git_root, check=False)

        if result.returncode != 0:
            return []

        commits = []
        for line in result.stdout.strip().split("\n"):
            if not line:
                continue

            parts = line.split("|", 4)
            if len(parts) < 5:
                continue

            commit_hash, author_name, author_email, timestamp, message = parts

            # Get stats for this commit
            stats_cmd = ["git", "show", "--stat", "--oneline", "--pretty=format:", commit_hash, "--", file_path]

            stats_result = subprocess.run(stats_cmd, capture_output=True, text=True, cwd=git_root, check=False)

            changes_summary = None
            if stats_result.returncode == 0:
                # Parse stats output (e.g., "1 file changed, 5 insertions(+), 2 deletions(-)")
                stats_lines = [l for l in stats_result.stdout.strip().split("\n") if l]
                if stats_lines:
                    changes_summary = stats_lines[-1].strip()

            commits.append(
                CommitInfo(
                    commit_hash=commit_hash[:8],  # Short hash
                    author_name=author_name,
                    author_email=author_email,
                    timestamp=datetime.fromisoformat(timestamp),
                    message=message,
                    changes_summary=changes_summary,
                )
            )

        return commits

    except Exception as e:
        print(f"Error getting commits: {e}")
        return []


@router.get("/atom/{atom_id}", response_model=AtomLineage)
async def get_atom_lineage(atom_id: str):
    """
    Get complete git lineage for an atom

    Returns:
    - Who created it and when
    - Who last modified it and when
    - Full commit history
    """
    # Find the file
    file_path = get_atom_file_path(atom_id)

    if not file_path:
        raise HTTPException(
            status_code=404,
            detail=f"Atom file not found for {atom_id}. Make sure the atom exists in atoms/ or test_data/ directories.",
        )

    # Get all commits
    commits = get_file_commits(file_path)

    if not commits:
        raise HTTPException(
            status_code=404, detail=f"No git history found for {atom_id}. File may not be committed yet."
        )

    # First commit = creation
    created_commit = commits[-1]

    # Last commit = most recent modification
    last_commit = commits[0]

    return AtomLineage(
        atom_id=atom_id,
        file_path=file_path,
        created_by=created_commit.author_name,
        created_at=created_commit.timestamp,
        last_modified_by=last_commit.author_name,
        last_modified_at=last_commit.timestamp,
        total_commits=len(commits),
        commits=commits,
    )


@router.get("/ownership-summary", response_model=List[OwnershipSummary])
async def get_ownership_summary():
    """
    Get ownership statistics across all atoms
    Shows which authors have created/modified the most atoms
    """
    git_root = get_git_root()

    # Search in multiple locations
    search_dirs = [
        os.path.join(git_root, "atoms"),
        os.path.join(git_root, "test_data", "atoms"),
        os.path.join(git_root, "test_data"),
    ]

    # Track author statistics
    author_stats = {}

    # Walk through all atom files in all search directories
    for atoms_dir in search_dirs:
        if not os.path.exists(atoms_dir):
            continue

        for root, dirs, files in os.walk(atoms_dir):
            for file in files:
                if not (file.endswith(".yaml") or file.endswith(".yml")):
                    continue

                file_path = os.path.relpath(os.path.join(root, file), git_root).replace("\\", "/")
                commits = get_file_commits(file_path)

                if not commits:
                    continue

                # Track creator
                creator = commits[-1]  # First commit
                creator_key = (creator.author_name, creator.author_email)

                if creator_key not in author_stats:
                    author_stats[creator_key] = {"atoms_created": 0, "atoms_modified": 0, "total_commits": 0}

                author_stats[creator_key]["atoms_created"] += 1

                # Track all contributors
                for commit in commits:
                    author_key = (commit.author_name, commit.author_email)

                    if author_key not in author_stats:
                        author_stats[author_key] = {"atoms_created": 0, "atoms_modified": 0, "total_commits": 0}

                    author_stats[author_key]["atoms_modified"] += 1
                    author_stats[author_key]["total_commits"] += 1

    # Convert to response format
    summaries = [
        OwnershipSummary(
            author_name=name,
            author_email=email,
            atoms_created=stats["atoms_created"],
            atoms_modified=stats["atoms_modified"],
            total_commits=stats["total_commits"],
        )
        for (name, email), stats in author_stats.items()
    ]

    # Sort by total commits (most active first)
    summaries.sort(key=lambda s: s.total_commits, reverse=True)

    return summaries


@router.get("/diff/{atom_id}/{commit_hash}")
async def get_commit_diff(atom_id: str, commit_hash: str):
    """
    Get the diff for a specific commit of an atom
    Shows what changed in that commit
    """
    file_path = get_atom_file_path(atom_id)

    if not file_path:
        raise HTTPException(status_code=404, detail=f"Atom file not found for {atom_id}")

    try:
        git_root = get_git_root()

        # Get the diff for this commit
        cmd = ["git", "show", "--pretty=format:", commit_hash, "--", file_path]  # No commit message

        result = subprocess.run(cmd, capture_output=True, text=True, cwd=git_root, check=True)

        return {"atom_id": atom_id, "commit_hash": commit_hash, "diff": result.stdout}

    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Failed to get diff: {e.stderr}")
