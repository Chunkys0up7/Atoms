#!/usr/bin/env python3
"""
GNDP Schema Validator

Validates all atom and module YAML files against JSON schemas.
Follows agent.md integration patterns for CI/CD usage.

Usage:
    python scripts/validate_schemas.py              # Validate all files
    python scripts/validate_schemas.py --quiet      # Minimal output
    python scripts/validate_schemas.py --file atoms/requirements/REQ-001.yaml
"""

import argparse
import json
import sys
from pathlib import Path
from typing import List, Dict, Tuple

try:
    import yaml
    import jsonschema
    from jsonschema import validate, ValidationError
except ImportError:
    print("Error: Required dependencies not installed.")
    print("Run: pip install pyyaml jsonschema")
    sys.exit(1)


class GNDPValidator:
    """Validator for GNDP atoms and modules."""

    def __init__(self, root_dir: Path = None):
        self.root_dir = root_dir or Path(__file__).parent.parent
        self.schemas = self._load_schemas()
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def _load_schemas(self) -> Dict[str, dict]:
        """Load JSON schemas from schemas/ directory."""
        schemas = {}
        schema_dir = self.root_dir / "schemas"

        if not schema_dir.exists():
            raise FileNotFoundError(f"Schemas directory not found: {schema_dir}")

        for schema_file in schema_dir.glob("*.json"):
            with open(schema_file, 'r', encoding='utf-8') as f:
                schema_name = schema_file.stem  # e.g., 'atom-schema'
                schemas[schema_name] = json.load(f)

        return schemas

    def validate_atom(self, atom_path: Path) -> bool:
        """Validate a single atom file."""
        try:
            with open(atom_path, 'r', encoding='utf-8') as f:
                atom_data = yaml.safe_load(f)

            # Convert date objects to strings (YAML automatically parses dates)
            if 'metadata' in atom_data:
                for key in ['created', 'updated']:
                    if key in atom_data['metadata']:
                        atom_data['metadata'][key] = str(atom_data['metadata'][key])

            # Validate against schema
            validate(instance=atom_data, schema=self.schemas['atom-schema'])

            # Additional business logic validations
            self._validate_atom_business_rules(atom_data, atom_path)

            return len(self.errors) == 0

        except yaml.YAMLError as e:
            self.errors.append(f"{atom_path}: Invalid YAML - {e}")
            return False
        except ValidationError as e:
            self.errors.append(f"{atom_path}: Schema validation failed - {e.message}")
            return False
        except KeyError as e:
            self.errors.append(f"{atom_path}: Missing required field - {e}")
            return False

    def validate_module(self, module_path: Path) -> bool:
        """Validate a single module file."""
        try:
            with open(module_path, 'r', encoding='utf-8') as f:
                module_data = yaml.safe_load(f)

            # Convert date objects to strings (YAML automatically parses dates)
            if 'metadata' in module_data:
                for key in ['created', 'updated']:
                    if key in module_data['metadata']:
                        module_data['metadata'][key] = str(module_data['metadata'][key])

            # Validate against schema
            validate(instance=module_data, schema=self.schemas['module-schema'])

            # Additional business logic validations
            self._validate_module_business_rules(module_data, module_path)

            return len(self.errors) == 0

        except yaml.YAMLError as e:
            self.errors.append(f"{module_path}: Invalid YAML - {e}")
            return False
        except ValidationError as e:
            self.errors.append(f"{module_path}: Schema validation failed - {e.message}")
            return False
        except KeyError as e:
            self.errors.append(f"{module_path}: Missing required field - {e}")
            return False

    def _validate_atom_business_rules(self, atom: dict, path: Path):
        """Additional business logic validations for atoms."""
        atom_id = atom.get('id', 'UNKNOWN')

        # 1. ID prefix must match type
        prefix_map = {
            'requirement': 'REQ',
            'design': 'DES',
            'procedure': 'PROC',
            'validation': 'VAL',
            'policy': 'POL',
            'risk': 'RISK'
        }
        expected_prefix = prefix_map.get(atom['type'])
        if expected_prefix and not atom_id.startswith(expected_prefix):
            self.errors.append(
                f"{path}: Atom ID '{atom_id}' should start with '{expected_prefix}' for type '{atom['type']}'"
            )

        # 2. Created date should not be after updated date
        created = atom.get('metadata', {}).get('created', '')
        updated = atom.get('metadata', {}).get('updated', '')
        if created and updated and created > updated:
            self.errors.append(
                f"{path}: Created date ({created}) is after updated date ({updated})"
            )

        # 3. Self-references not allowed
        upstream = atom.get('upstream_ids', [])
        downstream = atom.get('downstream_ids', [])
        if atom_id in upstream or atom_id in downstream:
            self.errors.append(
                f"{path}: Atom {atom_id} references itself"
            )

        # 4. Warn if no relationships
        if not upstream and not downstream:
            self.warnings.append(
                f"{path}: Atom {atom_id} has no upstream or downstream relationships (orphaned)"
            )

        # 5. Compliance tags should match between requirement and policy
        compliance_tags = atom.get('metadata', {}).get('compliance_tags', [])
        if compliance_tags and atom['type'] not in ['requirement', 'policy', 'risk']:
            self.warnings.append(
                f"{path}: Compliance tags found on non-requirement/policy/risk atom"
            )

    def _validate_module_business_rules(self, module: dict, path: Path):
        """Additional business logic validations for modules."""
        module_id = module.get('module_id', 'unknown')

        # 1. Module ID should be kebab-case
        if not module_id.replace('-', '').isalnum() or module_id != module_id.lower():
            self.errors.append(
                f"{path}: Module ID '{module_id}' should be lowercase kebab-case"
            )

        # 2. Check for duplicate atom IDs
        atom_ids = module.get('atom_ids', [])
        if len(atom_ids) != len(set(atom_ids)):
            duplicates = [aid for aid in atom_ids if atom_ids.count(aid) > 1]
            self.errors.append(
                f"{path}: Module contains duplicate atom IDs: {duplicates}"
            )

        # 3. Warn if module has very few atoms
        if len(atom_ids) < 2:
            self.warnings.append(
                f"{path}: Module '{module_id}' has fewer than 2 atoms"
            )

        # 4. Warn if module has circular dependency on itself
        dependencies = module.get('metadata', {}).get('dependencies', [])
        if module_id in dependencies:
            self.errors.append(
                f"{path}: Module '{module_id}' depends on itself"
            )

    def validate_all_atoms(self) -> Tuple[int, int]:
        """Validate all atom files. Returns (success_count, error_count)."""
        atoms_dir = self.root_dir / "atoms"
        if not atoms_dir.exists():
            self.errors.append(f"Atoms directory not found: {atoms_dir}")
            return 0, 1

        atom_files = list(atoms_dir.rglob("*.yaml")) + list(atoms_dir.rglob("*.yml"))
        success_count = 0

        for atom_file in atom_files:
            if self.validate_atom(atom_file):
                success_count += 1

        return success_count, len(atom_files) - success_count

    def validate_all_modules(self) -> Tuple[int, int]:
        """Validate all module files. Returns (success_count, error_count)."""
        modules_dir = self.root_dir / "modules"
        if not modules_dir.exists():
            self.errors.append(f"Modules directory not found: {modules_dir}")
            return 0, 1

        module_files = list(modules_dir.glob("*.yaml")) + list(modules_dir.glob("*.yml"))
        success_count = 0

        for module_file in module_files:
            if self.validate_module(module_file):
                success_count += 1

        return success_count, len(module_files) - success_count

    def print_results(self, quiet: bool = False):
        """Print validation results."""
        if self.errors:
            print("\n[ERROR] Validation Errors:")
            for error in self.errors:
                print(f"  {error}")

        if self.warnings and not quiet:
            print("\n[WARN] Warnings:")
            for warning in self.warnings:
                print(f"  {warning}")

        if not self.errors and not quiet:
            print("\n[OK] All validations passed!")


def main():
    parser = argparse.ArgumentParser(
        description="Validate GNDP atom and module YAML files"
    )
    parser.add_argument(
        '--file',
        type=Path,
        help='Validate a specific file'
    )
    parser.add_argument(
        '--quiet',
        action='store_true',
        help='Minimal output (errors only)'
    )
    parser.add_argument(
        '--root',
        type=Path,
        default=Path(__file__).parent.parent,
        help='Root directory of GNDP project'
    )

    args = parser.parse_args()

    validator = GNDPValidator(root_dir=args.root)

    try:
        if args.file:
            # Validate single file
            if 'atoms' in str(args.file):
                success = validator.validate_atom(args.file)
            elif 'modules' in str(args.file):
                success = validator.validate_module(args.file)
            else:
                print(f"Error: Cannot determine file type for {args.file}")
                sys.exit(1)

            validator.print_results(quiet=args.quiet)
            sys.exit(0 if success else 1)

        else:
            # Validate all files
            if not args.quiet:
                print("Validating GNDP atoms and modules...\n")

            atom_success, atom_errors = validator.validate_all_atoms()
            module_success, module_errors = validator.validate_all_modules()

            if not args.quiet:
                print(f"\nResults:")
                print(f"  Atoms: {atom_success} passed, {atom_errors} failed")
                print(f"  Modules: {module_success} passed, {module_errors} failed")

            validator.print_results(quiet=args.quiet)

            sys.exit(0 if (atom_errors == 0 and module_errors == 0) else 1)

    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
