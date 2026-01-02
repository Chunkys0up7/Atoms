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
from datetime import datetime
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


def run_git_command(cmd: List[str]) -> str:
    """Run a git command and return output"""
    try:
        cwd_path = Path(__file__).parent.parent.parent
        # On Windows, we might need to be explicit about encoding if check=False doesn't fail
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            check=False,
            cwd=cwd_path,
        )

        if result.returncode != 0:
            if result.stderr and "does not have any commits yet" not in result.stderr:
                # Suppress harmless warnings for non-git users
                pass
            return ""

        return result.stdout.strip()
    except FileNotFoundError:
        print("Git not found in PATH", file=sys.stderr)
        return ""
    except Exception as e:
        print(f"Git command exception: {e}", file=sys.stderr)
        return ""


def get_uncommitted_files(directory: str = "atoms/") -> Dict[str, str]:
    """Get map of uncommitted files in a directory and their status"""
    output = run_git_command(["git", "status", "--porcelain", directory])

    uncommitted = {}
    for line in output.split("\n"):
        if not line:
            continue
            
        # Porcelain format: XY PATH
        # XY are status codes.
        status_code = line[:2]
        filepath = line[3:].strip()
        
        # We only care about matching files
        status = status_code.strip()
        
        # Map git status codes to readable status
        if "A" in status or "?" in status:
            uncommitted[filepath] = "new"
        elif "M" in status:
            uncommitted[filepath] = "modified"
        else:
            uncommitted[filepath] = "uncommitted"

    return uncommitted


def parse_git_date(date_str: str) -> tuple[Optional[str], Optional[int], bool]:
    """Parse git iso date string into (date_str, days_ago, is_recent)"""
    try:
        if not date_str:
            return None, None, False
            
        commit_date = datetime.fromisoformat(date_str.replace(" +", "+").replace(" -", "-").split()[0])
        days_ago = (datetime.now() - commit_date).days
        is_recent = days_ago <= 7
        return date_str.split()[0], days_ago, is_recent
    except (ValueError, AttributeError):
        return None, None, False


def get_bulk_git_info(directory: str, limit: int = 1000) -> Dict[str, Dict[str, Any]]:
    """
    Get git info for all files in a directory efficiently using a single git log command.
    Returns a dict mapping filepath -> git info dict.
    """
    cmd = [
        "git",
        "log",
        f"-n {limit}",
        "--name-only",
        "--format=COMMIT_Start:%H|%an|%ad|%s",
        "--date=iso",
        directory
    ]
    
    output = run_git_command(cmd)
    
    file_info = {}
    current_commit = None
    
    for line in output.split("\n"):
        line = line.strip()
        if not line:
            continue
            
        if line.startswith("COMMIT_Start:"):
            # Parse new commit header
            parts = line[13:].split("|", 3)
            if len(parts) == 4:
                hash_str, author, date_str, message = parts
                
                # Pre-calculate date info
                parsed_date, days_ago, is_recent = parse_git_date(date_str)
                
                current_commit = {
                    "last_commit_hash": hash_str[:8],
                    "last_commit_author": author,
                    "last_commit_date": parsed_date,
                    "last_commit_message": message,
                    "days_since_commit": days_ago,
                    "is_recently_changed": is_recent,
                }
            else:
                current_commit = None
        elif current_commit:
            # This is a filename line associated with the current commit
            # Git always uses forward slashes in output
            filepath = line
            
            # Since we traverse from newest to oldest, if we've already seen this file,
            # we skip it (as we already have the latest commit info).
            # Note: This doesn't handle file renames perfectly without --follow, but --follow isn't supported with --name-only list.
            if filepath not in file_info:
                file_info[filepath] = current_commit.copy()
                
    return file_info


def get_file_git_info(filepath: str) -> Dict[str, Any]:
    """Get git commit information for a specific file (fallback/single use)"""
    log_output = run_git_command(["git", "log", "-1", "--format=%H|%an|%ad|%s", "--date=iso", "--", filepath])

    if not log_output:
        return {}

    parts = log_output.split("|", 3)
    if len(parts) != 4:
        return {}

    commit_hash, author, date_str, message = parts
    parsed_date, days_ago, is_recent = parse_git_date(date_str)

    return {
        "last_commit_hash": commit_hash[:8],
        "last_commit_author": author,
        "last_commit_date": parsed_date,
        "last_commit_message": message,
        "days_since_commit": days_ago,
        "is_recently_changed": is_recent,
    }


def get_atom_id_from_filepath(filepath: str) -> str:
    path = Path(filepath)
    return path.stem


def get_module_id_from_filepath(filepath: str) -> str:
    path = Path(filepath)
    return path.stem


@router.get("/api/git/atoms/status")
def get_all_atoms_git_status() -> List[AtomGitStatus]:
    """Get git status for all atoms."""
    base = Path(__file__).parent.parent.parent
    atoms_dir = base / "atoms"

    if not atoms_dir.exists():
        return []

    # 1. Get uncommitted files (Fast)
    uncommitted = get_uncommitted_files("atoms/")
    # Also check test_data if needed, but primary focus is atoms/
    
    # 2. Get bulk history (Fast)
    # We fetch history for 'atoms/' directory
    history_map = get_bulk_git_info("atoms/")

    # 3. List all files
    statuses = []
    # We use rglob to find all atomic yaml files
    atom_files = list(atoms_dir.rglob("*.yaml"))
    
    # Handle test_data atoms if they exist
    test_data_dir = base / "test_data"
    if test_data_dir.exists():
        test_files = list(test_data_dir.rglob("*.yaml"))
        if test_files:
            atom_files.extend(test_files)
            # We might miss history for test_data if we only queried atoms/, 
            # but usually test_data changes are less critical for this view.
            # We can optionally query test_data history too.
            test_history = get_bulk_git_info("test_data/")
            history_map.update(test_history)

    for yaml_file in atom_files:
        try:
            relative_path = str(yaml_file.relative_to(base)).replace("\\", "/")
            atom_id = get_atom_id_from_filepath(relative_path)
            
            git_info = {}
            status = "committed"
            
            # Check uncommitted status
            if relative_path in uncommitted:
                status = uncommitted[relative_path]
                if status == "new":
                    # No history for new files
                    pass
                else:
                    # Modified files use history
                    git_info = history_map.get(relative_path, {})
            else:
                # Committed files use history
                git_info = history_map.get(relative_path, {})
                
            statuses.append(AtomGitStatus(
                atom_id=atom_id, 
                file_path=relative_path, 
                status=status, 
                **git_info
            ))

        except Exception as e:
            print(f"Error processing atom {yaml_file}: {e}", file=sys.stderr)
            continue

    return statuses


@router.get("/api/git/atoms/{atom_id}/status")
def get_atom_git_status(atom_id: str) -> AtomGitStatus:
    """Get git status for a specific atom."""
    base = Path(__file__).parent.parent.parent
    
    # Locate file (checking atoms/ an test_data/)
    search_paths = [base / "atoms", base / "test_data"]
    atom_file = None
    
    for search_path in search_paths:
        if search_path.exists():
            matches = list(search_path.rglob(f"{atom_id}.yaml"))
            if matches:
                atom_file = matches[0]
                break
                
    if not atom_file:
        raise HTTPException(status_code=404, detail=f"Atom {atom_id} not found")

    relative_path = str(atom_file.relative_to(base)).replace("\\", "/")
    
    # Check uncommitted
    uncommitted = get_uncommitted_files("atoms/") # Simpler to check broadly
    if "test_data" in relative_path:
        uncommitted.update(get_uncommitted_files("test_data/"))
        
    status = "committed"
    git_info = {}
    
    if relative_path in uncommitted:
        status = uncommitted[relative_path]
        if status != "new":
            git_info = get_file_git_info(relative_path)
    else:
        git_info = get_file_git_info(relative_path)
        
    return AtomGitStatus(atom_id=atom_id, file_path=relative_path, status=status, **git_info)


@router.get("/api/git/atoms/recent")
def get_recently_changed_atoms(days: int = 7) -> List[AtomGitStatus]:
    """Get recently changed atoms."""
    # Re-use optimized bulk fetch
    all_statuses = get_all_atoms_git_status()
    
    recent = [
        s for s in all_statuses 
        if s.is_recently_changed or s.status in ("new", "modified")
    ]
    
    recent.sort(key=lambda s: s.days_since_commit if s.days_since_commit is not None else -1)
    return recent


@router.get("/api/git/atoms/uncommitted")
def get_uncommitted_atoms() -> List[AtomGitStatus]:
    """Get uncommitted atoms."""
    all_statuses = get_all_atoms_git_status()
    return [s for s in all_statuses if s.status in ("new", "modified", "uncommitted")]


@router.get("/api/git/modules/status")
def get_all_modules_git_status() -> List[ModuleGitStatus]:
    """Get git status for all modules."""
    base = Path(__file__).parent.parent.parent
    modules_dir = base / "modules"
    
    if not modules_dir.exists():
        return []

    uncommitted = get_uncommitted_files("modules/")
    history_map = get_bulk_git_info("modules/")
    
    statuses = []
    for yaml_file in modules_dir.glob("*.yaml"):
        try:
            relative_path = str(yaml_file.relative_to(base)).replace("\\", "/")
            module_id = get_module_id_from_filepath(relative_path)
            
            git_info = {}
            status = "committed"
            
            if relative_path in uncommitted:
                status = uncommitted[relative_path]
                if status != "new":
                    git_info = history_map.get(relative_path, {})
            else:
                git_info = history_map.get(relative_path, {})
                
            statuses.append(ModuleGitStatus(
                module_id=module_id,
                file_path=relative_path,
                status=status,
                **git_info
            ))
        except Exception:
            continue
            
    return statuses


@router.get("/api/git/modules/{module_id}/status")
def get_module_git_status(module_id: str) -> ModuleGitStatus:
    """Get status for specific module."""
    base = Path(__file__).parent.parent.parent / "modules"
    
    module_file = None
    if base.exists():
        for f in base.glob("*.yaml"):
            if f.stem == module_id or f.stem.replace("-", "_") == module_id:
                module_file = f
                break
                
    if not module_file:
         raise HTTPException(status_code=404, detail=f"Module {module_id} not found")

    relative_path = str(module_file.relative_to(base.parent)).replace("\\", "/")
    
    uncommitted = get_uncommitted_files("modules/")
    
    status = "committed"
    git_info = {}
    
    if relative_path in uncommitted:
        status = uncommitted[relative_path]
        if status != "new":
            git_info = get_file_git_info(relative_path)
    else:
        git_info = get_file_git_info(relative_path)
        
    return ModuleGitStatus(module_id=module_id, file_path=relative_path, status=status, **git_info)
