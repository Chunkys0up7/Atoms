"""
Git Status API for Atoms

Provides git metadata for atoms including:
- Commit status (uncommitted, committed, recently changed)
- Last commit date
- Last commit author
- Commit hash
- Change summary
"""

import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class AtomGitStatus(BaseModel):
    """Git status information for an atom"""

    atom_id: str
    file_path: str
    status: str  # 'uncommitted', 'committed', 'new', 'modified'
    last_commit_hash: Optional[str] = None
    last_commit_date: Optional[str] = None
    last_commit_author: Optional[str] = None
    last_commit_message: Optional[str] = None
    is_recently_changed: bool = False
    days_since_commit: Optional[int] = None


def run_git_command(cmd: List[str]) -> str:
    """Run a git command and return output"""
    try:
        cwd_path = Path(__file__).parent.parent.parent
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,  # Don't raise exception, check return code manually
            cwd=cwd_path,
        )

        if result.returncode != 0:
            # Log error but don't crash - some files may not have history
            if result.stderr and "does not have any commits yet" not in result.stderr:
                print(f"Git command warning ({' '.join(cmd)}): {result.stderr.strip()}", file=sys.stderr)
            return ""

        return result.stdout.strip()
    except FileNotFoundError:
        print("Git not found in PATH", file=sys.stderr)
        return ""
    except Exception as e:
        print(f"Git command exception: {e}", file=sys.stderr)
        return ""


def get_uncommitted_files() -> Dict[str, str]:
    """Get map of uncommitted atom files and their status"""
    output = run_git_command(["git", "status", "--porcelain", "atoms/", "test_data/"])

    uncommitted = {}
    for line in output.split("\n"):
        if line and line.endswith(".yaml"):
            status = line[:2].strip()
            filepath = line[3:].strip()

            # Map git status codes to readable status
            if status in ("??", "A"):
                uncommitted[filepath] = "new"
            elif status == "M":
                uncommitted[filepath] = "modified"
            else:
                uncommitted[filepath] = "uncommitted"

    return uncommitted


def get_file_git_info(filepath: str) -> Dict[str, Any]:
    """Get git commit information for a specific file"""
    # Get last commit for this file
    log_output = run_git_command(["git", "log", "-1", "--format=%H|%an|%ad|%s", "--date=iso", "--", filepath])

    if not log_output:
        return {}

    parts = log_output.split("|", 3)
    if len(parts) != 4:
        return {}

    commit_hash, author, date_str, message = parts

    # Parse commit date
    try:
        commit_date = datetime.fromisoformat(date_str.replace(" +", "+").replace(" -", "-").split()[0])
        days_ago = (datetime.now() - commit_date).days
        is_recent = days_ago <= 7  # Recent if within last 7 days
    except (ValueError, AttributeError):
        commit_date = None
        days_ago = None
        is_recent = False

    return {
        "last_commit_hash": commit_hash[:8],  # Short hash
        "last_commit_author": author,
        "last_commit_date": date_str.split()[0] if date_str else None,
        "last_commit_message": message,
        "days_since_commit": days_ago,
        "is_recently_changed": is_recent,
    }


def get_atom_id_from_filepath(filepath: str) -> str:
    """Extract atom ID from file path"""
    path = Path(filepath)
    # Atom ID is typically the filename without extension
    return path.stem


@router.get("/api/git/atoms/status")
def get_all_atoms_git_status() -> List[AtomGitStatus]:
    """
    Get git status for all atoms in the repository.

    Returns:
        List of AtomGitStatus objects with git metadata for each atom
    """
    base = Path(__file__).parent.parent.parent / "atoms"

    if not base.exists():
        raise HTTPException(status_code=404, detail="atoms directory not found")

    # Get uncommitted files
    uncommitted = get_uncommitted_files()

    # Get all atom YAML files
    atom_files = list(base.rglob("*.yaml"))

    # Also check test_data
    test_data_base = Path(__file__).parent.parent.parent / "test_data"
    if test_data_base.exists():
        atom_files.extend(test_data_base.rglob("*.yaml"))

    statuses = []

    for yaml_file in atom_files:
        try:
            # Get relative path from repo root
            relative_path = str(yaml_file.relative_to(Path(__file__).parent.parent.parent))

            # Normalize path separators for git (always use forward slashes)
            git_path = relative_path.replace("\\", "/")

            atom_id = get_atom_id_from_filepath(relative_path)

            # Check if uncommitted
            if git_path in uncommitted:
                status = uncommitted[git_path]
                # Modified files still have git history from previous commits
                # Only new files should have empty git info
                if status == "new":
                    git_info = {}
                else:
                    git_info = get_file_git_info(git_path)
            else:
                status = "committed"
                git_info = get_file_git_info(git_path)

            statuses.append(AtomGitStatus(atom_id=atom_id, file_path=git_path, status=status, **git_info))

        except Exception as e:
            print(f"Warning: Could not get git status for {yaml_file}: {e}", file=sys.stderr)
            continue

    return statuses


@router.get("/api/git/atoms/{atom_id}/status")
def get_atom_git_status(atom_id: str) -> AtomGitStatus:
    """
    Get git status for a specific atom.

    Args:
        atom_id: The atom ID to get status for

    Returns:
        AtomGitStatus with git metadata
    """
    # Find the atom file
    base = Path(__file__).parent.parent.parent

    # Search in both atoms/ and test_data/
    search_paths = [base / "atoms", base / "test_data"]

    atom_file = None
    for search_path in search_paths:
        if search_path.exists():
            matches = list(search_path.rglob(f"{atom_id}.yaml"))
            if matches:
                atom_file = matches[0]
                break

    if not atom_file:
        raise HTTPException(status_code=404, detail=f"Atom file not found for ID: {atom_id}")

    # Get relative path
    relative_path = str(atom_file.relative_to(base))
    git_path = relative_path.replace("\\", "/")

    # Check uncommitted status
    uncommitted = get_uncommitted_files()

    if git_path in uncommitted:
        status = uncommitted[git_path]
        # Modified files still have git history from previous commits
        # Only new files should have empty git info
        if status == "new":
            git_info = {}
        else:
            git_info = get_file_git_info(git_path)
    else:
        status = "committed"
        git_info = get_file_git_info(git_path)

    return AtomGitStatus(atom_id=atom_id, file_path=git_path, status=status, **git_info)


@router.get("/api/git/atoms/recent")
def get_recently_changed_atoms(days: int = 7) -> List[AtomGitStatus]:
    """
    Get atoms that have been changed recently.

    Args:
        days: Number of days to look back (default: 7)

    Returns:
        List of recently changed atoms with git metadata
    """
    all_statuses = get_all_atoms_git_status()

    # Filter for recently changed
    recent = [
        status
        for status in all_statuses
        if status.is_recently_changed or status.status in ("new", "modified", "uncommitted")
    ]

    # Sort by most recent first
    recent.sort(key=lambda s: s.days_since_commit if s.days_since_commit is not None else 999, reverse=False)

    return recent


@router.get("/api/git/atoms/uncommitted")
def get_uncommitted_atoms() -> List[AtomGitStatus]:
    """
    Get all atoms that have uncommitted changes.

    Returns:
        List of atoms with uncommitted changes
    """
    all_statuses = get_all_atoms_git_status()

    # Filter for uncommitted
    uncommitted = [status for status in all_statuses if status.status in ("new", "modified", "uncommitted")]

    return uncommitted


# Module Git Status Endpoints


class ModuleGitStatus(BaseModel):
    """Git status information for a module"""

    module_id: str
    file_path: str
    status: str  # 'uncommitted', 'committed', 'new', 'modified'
    last_commit_hash: Optional[str] = None
    last_commit_date: Optional[str] = None
    last_commit_author: Optional[str] = None
    last_commit_message: Optional[str] = None
    is_recently_changed: bool = False
    days_since_commit: Optional[int] = None


def get_uncommitted_module_files() -> Dict[str, str]:
    """Get map of uncommitted module files and their status"""
    output = run_git_command(["git", "status", "--porcelain", "modules/"])

    uncommitted = {}
    for line in output.split("\n"):
        if line and line.endswith(".yaml"):
            status = line[:2].strip()
            filepath = line[3:].strip()

            # Map git status codes to readable status
            if status in ("??", "A"):
                uncommitted[filepath] = "new"
            elif status == "M":
                uncommitted[filepath] = "modified"
            else:
                uncommitted[filepath] = "uncommitted"

    return uncommitted


def get_module_id_from_filepath(filepath: str) -> str:
    """Extract module ID from file path"""
    path = Path(filepath)
    # Module ID is typically the filename without extension
    return path.stem


@router.get("/api/git/modules/status")
def get_all_modules_git_status() -> List[ModuleGitStatus]:
    """
    Get git status for all modules in the repository.

    Returns:
        List of ModuleGitStatus objects with git metadata for each module
    """
    base = Path(__file__).parent.parent.parent / "modules"

    if not base.exists():
        raise HTTPException(status_code=404, detail="modules directory not found")

    # Get uncommitted files
    uncommitted = get_uncommitted_module_files()

    # Get all module YAML files
    module_files = list(base.glob("*.yaml"))

    statuses = []

    for yaml_file in module_files:
        try:
            # Get relative path from repo root
            relative_path = str(yaml_file.relative_to(Path(__file__).parent.parent.parent))

            # Normalize path separators for git (always use forward slashes)
            git_path = relative_path.replace("\\", "/")

            module_id = get_module_id_from_filepath(relative_path)

            # Check if uncommitted
            if git_path in uncommitted:
                status = uncommitted[git_path]
                # Modified files still have git history from previous commits
                # Only new files should have empty git info
                if status == "new":
                    git_info = {}
                else:
                    git_info = get_file_git_info(git_path)
            else:
                status = "committed"
                git_info = get_file_git_info(git_path)

            statuses.append(ModuleGitStatus(module_id=module_id, file_path=git_path, status=status, **git_info))

        except Exception as e:
            print(f"Warning: Could not get git status for {yaml_file}: {e}", file=sys.stderr)
            continue

    return statuses


@router.get("/api/git/modules/{module_id}/status")
def get_module_git_status(module_id: str) -> ModuleGitStatus:
    """
    Get git status for a specific module.

    Args:
        module_id: The module ID to get status for

    Returns:
        ModuleGitStatus with git metadata
    """
    # Find the module file
    base = Path(__file__).parent.parent.parent / "modules"

    if not base.exists():
        raise HTTPException(status_code=404, detail="modules directory not found")

    # Search for module file
    module_file = None
    for yaml_file in base.glob("*.yaml"):
        if yaml_file.stem == module_id or yaml_file.stem.replace("-", "_") == module_id:
            module_file = yaml_file
            break

    if not module_file:
        raise HTTPException(status_code=404, detail=f"Module file not found for ID: {module_id}")

    # Get relative path
    relative_path = str(module_file.relative_to(Path(__file__).parent.parent.parent))
    git_path = relative_path.replace("\\", "/")

    # Check uncommitted status
    uncommitted = get_uncommitted_module_files()

    if git_path in uncommitted:
        status = uncommitted[git_path]
        # Modified files still have git history from previous commits
        # Only new files should have empty git info
        if status == "new":
            git_info = {}
        else:
            git_info = get_file_git_info(git_path)
    else:
        status = "committed"
        git_info = get_file_git_info(git_path)

    return ModuleGitStatus(module_id=module_id, file_path=git_path, status=status, **git_info)
