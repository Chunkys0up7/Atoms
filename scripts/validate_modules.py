#!/usr/bin/env python3
"""
Module Validation Script for GNDP

Validates module YAML files against the JSON schema and checks:
- Schema compliance
- Required fields presence
- Cross-references (atoms, phases, dependencies exist)
- Approval workflow configuration
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import jsonschema
import yaml
from jsonschema import ValidationError, validate


def load_schema() -> Dict[str, Any]:
    """Load the module JSON schema."""
    schema_path = Path(__file__).parent.parent / "schemas" / "module.schema.json"

    if not schema_path.exists():
        print(f"ERROR: Schema file not found at {schema_path}")
        sys.exit(1)

    with open(schema_path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def load_module(module_path: Path) -> Dict[str, Any]:
    """Load a module YAML file."""
    with open(module_path, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def validate_module_schema(module_data: Dict[str, Any], schema: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate module against JSON schema."""
    errors = []

    try:
        validate(instance=module_data, schema=schema)
        return True, []
    except ValidationError as e:
        # Format validation error
        error_path = " -> ".join(str(p) for p in e.path) if e.path else "root"
        error_msg = f"Schema validation failed at '{error_path}': {e.message}"
        errors.append(error_msg)
        return False, errors


def check_atom_references(module_data: Dict[str, Any], atoms_dir: Path) -> List[str]:
    """Check that all referenced atoms exist."""
    warnings = []
    atoms = module_data.get("atoms", []) or module_data.get("atom_ids", [])

    if not atoms:
        warnings.append("Module has no atoms defined")
        return warnings

    # Get list of existing atom IDs
    existing_atoms = set()
    if atoms_dir.exists():
        for atom_file in atoms_dir.glob("*.yaml"):
            try:
                with open(atom_file, "r", encoding="utf-8") as fh:
                    atom_data = yaml.safe_load(fh)
                    if atom_data and "id" in atom_data:
                        existing_atoms.add(atom_data["id"])
            except (yaml.YAMLError, IOError):
                continue

    # Check each atom reference
    for atom_id in atoms:
        if atom_id not in existing_atoms:
            warnings.append(f"Referenced atom '{atom_id}' not found in atoms directory")

    return warnings


def check_entry_exit_points(module_data: Dict[str, Any]) -> List[str]:
    """Check that entry/exit points reference atoms in the module."""
    warnings = []
    module_atoms = set(module_data.get("atoms", []) or module_data.get("atom_ids", []))

    # Check entry points
    entry_points = module_data.get("entry_points", [])
    for entry_point in entry_points:
        if entry_point not in module_atoms:
            warnings.append(f"Entry point '{entry_point}' is not in module atoms")

    # Check exit points
    exit_points = module_data.get("exit_points", [])
    for exit_point in exit_points:
        atom_id = exit_point if isinstance(exit_point, str) else exit_point.get("atom")
        if atom_id and atom_id not in module_atoms:
            warnings.append(f"Exit point '{atom_id}' is not in module atoms")

    return warnings


def check_approval_workflow(module_data: Dict[str, Any]) -> List[str]:
    """Check approval workflow configuration."""
    warnings = []
    approval = module_data.get("approval", {})

    if not approval:
        warnings.append("No approval workflow configured - will use defaults")
        return warnings

    # Check if stages are defined
    stages = approval.get("stages", [])
    if stages:
        stage_names = [s.get("name") for s in stages]

        # Ensure draft and approved stages exist
        if "draft" not in stage_names:
            warnings.append("Approval workflow missing 'draft' stage")
        if "approved" not in stage_names:
            warnings.append("Approval workflow missing 'approved' stage")

        # Check stage order makes sense
        if "draft" in stage_names and "approved" in stage_names:
            if stage_names.index("draft") >= stage_names.index("approved"):
                warnings.append("'draft' stage should come before 'approved' stage")

    return warnings


def check_criticality_alignment(module_data: Dict[str, Any]) -> List[str]:
    """Check that criticality aligns with approval requirements."""
    warnings = []
    criticality = module_data.get("criticality")
    approval = module_data.get("approval", {})

    if criticality in ["HIGH", "CRITICAL"] and not approval.get("required", True):
        warnings.append(f"Module has {criticality} criticality but approval not required - this may be incorrect")

    return warnings


def validate_all_modules(modules_dirs: List[Path], schema: Dict[str, Any], atoms_dir: Path) -> Tuple[int, int, int]:
    """
    Validate all modules in given directories.

    Returns:
        Tuple of (valid_count, invalid_count, warning_count)
    """
    valid_count = 0
    invalid_count = 0
    warning_count = 0

    all_module_files = []
    for modules_dir in modules_dirs:
        if modules_dir.exists():
            all_module_files.extend(modules_dir.glob("*.yaml"))

    if not all_module_files:
        print("WARNING: No module files found to validate")
        return 0, 0, 0

    print(f"\n{'='*80}")
    print(f"Validating {len(all_module_files)} module(s)...")
    print(f"{'='*80}\n")

    for module_file in sorted(all_module_files):
        module_id = module_file.stem
        print(f"Validating: {module_id}")

        try:
            module_data = load_module(module_file)

            # Schema validation
            is_valid, schema_errors = validate_module_schema(module_data, schema)

            if not is_valid:
                print(f"  [X] INVALID - Schema validation failed")
                for error in schema_errors:
                    print(f"     - {error}")
                invalid_count += 1
                continue

            # Additional checks (warnings)
            all_warnings = []
            all_warnings.extend(check_atom_references(module_data, atoms_dir))
            all_warnings.extend(check_entry_exit_points(module_data))
            all_warnings.extend(check_approval_workflow(module_data))
            all_warnings.extend(check_criticality_alignment(module_data))

            if all_warnings:
                print(f"  [!] VALID with warnings:")
                for warning in all_warnings:
                    print(f"     - {warning}")
                warning_count += len(all_warnings)
            else:
                print(f"  [OK] VALID")

            valid_count += 1

        except yaml.YAMLError as e:
            print(f"  [X] INVALID - YAML parsing error: {e}")
            invalid_count += 1
        except (IOError, OSError) as e:
            print(f"  [X] INVALID - File error: {e}")
            invalid_count += 1
        except Exception as e:
            print(f"  [X] INVALID - Unexpected error: {e}")
            invalid_count += 1

        print()

    return valid_count, invalid_count, warning_count


def main():
    """Main validation function."""
    base_path = Path(__file__).parent.parent

    # Load schema
    print("Loading module schema...")
    schema = load_schema()
    print(f"[OK] Schema loaded: {schema.get('title', 'Unknown')}\n")

    # Define paths
    modules_dirs = [base_path / "modules", base_path / "test_data" / "modules"]
    atoms_dir = base_path / "atoms"

    # Validate all modules
    valid_count, invalid_count, warning_count = validate_all_modules(modules_dirs, schema, atoms_dir)

    # Print summary
    print(f"{'='*80}")
    print(f"VALIDATION SUMMARY")
    print(f"{'='*80}")
    print(f"[OK] Valid modules:   {valid_count}")
    print(f"[ERROR] Invalid modules: {invalid_count}")
    print(f"[WARNING] Total warnings:  {warning_count}")
    print(f"{'='*80}\n")

    # Exit with appropriate code
    if invalid_count > 0:
        print("[ERROR] Validation FAILED - some modules have schema errors")
        sys.exit(1)
    elif warning_count > 0:
        print("[WARNING] Validation PASSED with warnings - review warnings above")
        sys.exit(0)
    else:
        print("[OK] Validation PASSED - all modules are valid")
        sys.exit(0)


if __name__ == "__main__":
    main()
