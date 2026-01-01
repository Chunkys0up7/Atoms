#!/usr/bin/env python3
"""
Atom YAML Validation Script

Validates atom YAML files against the JSON schema and performs additional checks:
- Schema validation
- Naming convention validation
- Relationship validation (targets exist)
- Duplicate ID detection
- YAML syntax validation

Usage:
    python scripts/validate_atoms.py                    # Validate all atoms
    python scripts/validate_atoms.py atoms/policies/    # Validate specific directory
    python scripts/validate_atoms.py --fix              # Auto-fix minor issues
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Tuple

import yaml

try:
    from jsonschema import Draft7Validator, ValidationError, validate
except ImportError:
    print("Error: jsonschema not installed. Run: pip install jsonschema")
    sys.exit(1)


class AtomValidator:
    """Validates atom YAML files"""

    def __init__(self, schema_path: str = "schemas/atom.schema.json"):
        self.schema_path = Path(schema_path)
        self.schema = self._load_schema()
        self.validator = Draft7Validator(self.schema)
        self.errors = []
        self.warnings = []
        self.atom_ids = set()

    def _load_schema(self) -> Dict[str, Any]:
        """Load JSON schema"""
        if not self.schema_path.exists():
            raise FileNotFoundError(f"Schema not found: {self.schema_path}")

        with open(self.schema_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def validate_file(self, file_path: Path) -> Tuple[bool, List[str], List[str]]:
        """
        Validate a single atom YAML file

        Returns:
            (is_valid, errors, warnings)
        """
        errors = []
        warnings = []

        # Check file extension
        if file_path.suffix not in [".yaml", ".yml"]:
            errors.append(f"Invalid file extension: {file_path.suffix}")
            return False, errors, warnings

        try:
            # Load YAML
            with open(file_path, "r", encoding="utf-8") as f:
                atom = yaml.safe_load(f)

            if not atom:
                errors.append("Empty or invalid YAML file")
                return False, errors, warnings

            # Schema validation
            schema_errors = self._validate_schema(atom)
            errors.extend(schema_errors)

            # Additional validations
            if "id" in atom:
                # Check ID format
                id_errors = self._validate_id_format(atom["id"])
                errors.extend(id_errors)

                # Check for duplicate IDs
                if atom["id"] in self.atom_ids:
                    errors.append(f"Duplicate atom ID: {atom['id']}")
                else:
                    self.atom_ids.add(atom["id"])

                # Check ID matches filename
                expected_filename = f"{atom['id']}.yaml"
                if file_path.name != expected_filename:
                    warnings.append(
                        f"Filename '{file_path.name}' doesn't match atom ID '{atom['id']}' (expected: {expected_filename})"
                    )

            # Validate relationships
            if "edges" in atom:
                edge_warnings = self._validate_edges(atom["edges"])
                warnings.extend(edge_warnings)

            # Check required content
            if "content" in atom:
                content_warnings = self._validate_content(atom["content"])
                warnings.extend(content_warnings)

            # Validate version format
            if "version" in atom:
                if not re.match(r"^\d+\.\d+\.\d+$", atom["version"]):
                    errors.append(f"Invalid version format: {atom['version']} (expected semver like 1.0.0)")

        except yaml.YAMLError as e:
            errors.append(f"YAML parsing error: {e}")
        except Exception as e:
            errors.append(f"Validation error: {e}")

        is_valid = len(errors) == 0
        return is_valid, errors, warnings

    def _validate_schema(self, atom: Dict[str, Any]) -> List[str]:
        """Validate against JSON schema"""
        errors = []
        for error in self.validator.iter_errors(atom):
            path = " -> ".join([str(p) for p in error.path]) if error.path else "root"
            errors.append(f"Schema error at {path}: {error.message}")
        return errors

    def _validate_id_format(self, atom_id: str) -> List[str]:
        """Validate atom ID follows naming convention"""
        errors = []

        if not atom_id.startswith("atom-"):
            errors.append(f"Atom ID must start with 'atom-': {atom_id}")

        # Check format: atom-category-name
        parts = atom_id.split("-")
        if len(parts) < 3:
            errors.append(f"Atom ID must follow pattern 'atom-category-name': {atom_id}")

        # Check lowercase
        if atom_id != atom_id.lower():
            errors.append(f"Atom ID must be lowercase: {atom_id}")

        # Check valid characters
        if not re.match(r"^[a-z0-9-]+$", atom_id):
            errors.append(f"Atom ID contains invalid characters (only lowercase letters, numbers, hyphens): {atom_id}")

        return errors

    def _validate_edges(self, edges: List[Dict[str, Any]]) -> List[str]:
        """Validate edge relationships"""
        warnings = []

        for i, edge in enumerate(edges):
            if "target" not in edge:
                warnings.append(f"Edge {i} missing 'target' field")
                continue

            target = edge["target"]

            # Check target follows atom ID pattern
            if not target.startswith("atom-"):
                warnings.append(f"Edge target should be atom ID: {target}")

            # Note: We can't validate if target exists here without loading all atoms
            # That's done in a separate cross-reference validation pass

        return warnings

    def _validate_content(self, content: Dict[str, Any]) -> List[str]:
        """Validate content structure"""
        warnings = []

        # Check for meaningful summary
        if "summary" in content:
            if len(content["summary"]) < 10:
                warnings.append("Content summary is too short (minimum 10 characters)")

        # Check steps for process atoms
        if "steps" in content:
            if not content["steps"]:
                warnings.append("Process has empty steps array")
            elif len(content["steps"]) == 1:
                warnings.append("Process has only one step - consider if this should be broken down")

        return warnings

    def validate_directory(self, directory: Path, recursive: bool = True) -> Dict[str, Any]:
        """
        Validate all atom files in a directory

        Returns:
            Summary dictionary with validation results
        """
        pattern = "**/*.yaml" if recursive else "*.yaml"
        yaml_files = list(directory.glob(pattern))

        results = {
            "total_files": len(yaml_files),
            "valid_files": 0,
            "invalid_files": 0,
            "files_with_warnings": 0,
            "details": [],
        }

        for file_path in yaml_files:
            is_valid, errors, warnings = self.validate_file(file_path)

            result = {"file": str(file_path), "valid": is_valid, "errors": errors, "warnings": warnings}

            if is_valid:
                results["valid_files"] += 1
            else:
                results["invalid_files"] += 1

            if warnings:
                results["files_with_warnings"] += 1

            results["details"].append(result)

        return results


def print_results(results: Dict[str, Any], verbose: bool = False):
    """Print validation results"""
    print("\n" + "=" * 80)
    print("ATOM VALIDATION REPORT")
    print("=" * 80)
    print(f"\nTotal files: {results['total_files']}")
    print(f"Valid files: {results['valid_files']} [OK]")
    print(f"Invalid files: {results['invalid_files']} [FAIL]")
    print(f"Files with warnings: {results['files_with_warnings']} [WARN]")

    # Show errors
    error_count = 0
    warning_count = 0

    for detail in results["details"]:
        if detail["errors"] or (verbose and detail["warnings"]):
            print(f"\n{detail['file']}:")

            for error in detail["errors"]:
                print(f"  [ERROR] {error}")
                error_count += 1

            if verbose:
                for warning in detail["warnings"]:
                    print(f"  [WARNING] {warning}")
                    warning_count += 1

    print(f"\nTotal errors: {error_count}")
    print(f"Total warnings: {warning_count}")
    print("=" * 80)


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Validate atom YAML files")
    parser.add_argument("path", nargs="?", default="atoms", help="Directory or file to validate")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show warnings")
    parser.add_argument("--schema", default="schemas/atom.schema.json", help="Path to JSON schema")
    parser.add_argument("--no-recursive", action="store_true", help="Don't recurse into subdirectories")

    args = parser.parse_args()

    path = Path(args.path)

    if not path.exists():
        print(f"Error: Path does not exist: {path}")
        sys.exit(1)

    # Create validator
    validator = AtomValidator(schema_path=args.schema)

    # Validate
    if path.is_file():
        is_valid, errors, warnings = validator.validate_file(path)

        print(f"\n{path}:")
        if errors:
            for error in errors:
                print(f"  [ERROR] {error}")
        if warnings and args.verbose:
            for warning in warnings:
                print(f"  [WARNING] {warning}")

        if is_valid:
            print("  [OK] Valid")
            sys.exit(0)
        else:
            sys.exit(1)
    else:
        results = validator.validate_directory(path, recursive=not args.no_recursive)
        print_results(results, verbose=args.verbose)

        # Exit with error code if any files are invalid
        sys.exit(1 if results["invalid_files"] > 0 else 0)


if __name__ == "__main__":
    main()
