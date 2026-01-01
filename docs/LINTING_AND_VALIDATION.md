# Atom Linting and Validation

This document explains the linting and validation system for atom YAML files.

## Overview

The project includes comprehensive validation for atom YAML files to ensure:
- **Syntax correctness** - Valid YAML formatting
- **Schema compliance** - All required fields present with correct types
- **Naming conventions** - Atom IDs follow the required pattern
- **Data quality** - Relationships are valid, content is meaningful
- **Consistency** - Uniform structure across all atoms

## Components

### 1. JSON Schema (`schemas/atom.schema.json`)

Defines the required structure for atom files:

**Required Fields:**
- `id` - Atom identifier (pattern: `atom-{category}-{name}`)
- `category` - One of: CUSTOMER_FACING, BACK_OFFICE, SYSTEM, COMPLIANCE, RISK
- `type` - One of: PROCESS, POLICY, CONTROL, DOCUMENT, DECISION, SYSTEM, ROLE, DATA
- `name` - Human-readable name
- `version` - Semantic version (e.g., "1.0.0")
- `status` - One of: ACTIVE, DRAFT, DEPRECATED, ARCHIVED
- `owning_team` - Team responsible for the atom

**Optional Fields:**
- `author` - Creator of the atom
- `steward` - Maintainer of the atom
- `ontologyDomain` - Domain classification
- `criticality` - Business criticality (CRITICAL, HIGH, MEDIUM, LOW)
- `content` - Detailed content object
- `edges` - Relationships to other atoms
- `metadata` - Additional metadata

### 2. Python Validator (`scripts/validate_atoms.py`)

Validates atoms against the JSON schema and performs additional checks:

```bash
# Validate all atoms
python scripts/validate_atoms.py atoms

# Validate specific directory
python scripts/validate_atoms.py atoms/policies/

# Validate single file with warnings
python scripts/validate_atoms.py atoms/policies/atom-pol-trid-compliance.yaml --verbose

# Validate test atoms
python scripts/validate_atoms.py test_data/atoms
```

**What it checks:**
- JSON Schema compliance
- Atom ID naming convention (`atom-category-name`)
- Duplicate atom IDs
- Filename matches atom ID
- Edge relationships validity
- Content quality (summary length, step counts)
- Version format (semantic versioning)

### 3. YAML Linter (`.yamllint`)

Checks YAML syntax and style:

```bash
# Lint all atom files
yamllint atoms/

# Lint specific directory
yamllint atoms/policies/

# Lint with strict mode
yamllint --strict atoms/
```

**What it checks:**
- Proper indentation (2 spaces)
- Line length (max 120 characters)
- Trailing whitespace
- Document structure
- Key duplicates
- Truthy values format

### 4. Pre-commit Hooks (`.pre-commit-config.yaml`)

Automatically runs validation before git commits:

```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Run manually on all files
pre-commit run --all-files

# Run on specific files
pre-commit run --files atoms/policies/*.yaml
```

**What it does:**
- Lints YAML files
- Validates atom schema
- Formats Python code
- Fixes trailing whitespace
- Checks for merge conflicts
- Prevents committing large files

## NPM Scripts

Convenient commands added to `package.json`:

```bash
# Lint YAML files only
npm run lint:yaml

# Validate atoms against schema
npm run validate:atoms

# Validate with verbose output (shows warnings)
npm run validate:atoms:verbose

# Validate test atoms
npm run validate:test-atoms

# Validate everything (atoms + test atoms)
npm run validate:all

# Full validation (YAML lint + schema validation)
npm run validate
```

## Common Validation Errors

### Missing Required Field

```
[ERROR] Schema error at root: 'owning_team' is a required property
```

**Fix:** Add the missing field to your atom YAML file.

### Invalid Atom ID Format

```
[ERROR] Atom ID must follow pattern 'atom-category-name': ATOM-001
```

**Fix:** Ensure atom ID:
- Starts with `atom-`
- Is lowercase
- Uses hyphens (no underscores or spaces)
- Follows pattern: `atom-{category}-{descriptive-name}`

### Invalid Enum Value

```
[ERROR] Schema error at status: 'pending' is not one of ['ACTIVE', 'DRAFT', 'DEPRECATED', 'ARCHIVED']
```

**Fix:** Use one of the allowed enum values.

### Filename Mismatch

```
[WARNING] Filename 'my-atom.yaml' doesn't match atom ID 'atom-pol-trid-compliance' (expected: atom-pol-trid-compliance.yaml)
```

**Fix:** Rename the file to match the atom ID.

### Invalid Version Format

```
[ERROR] Invalid version format: 1.0 (expected semver like 1.0.0)
```

**Fix:** Use semantic versioning with three components: `major.minor.patch`

## Integration with CI/CD

The validation can be integrated into your CI/CD pipeline:

### GitHub Actions Example

```yaml
name: Validate Atoms

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install jsonschema pyyaml yamllint

      - name: Lint YAML files
        run: yamllint atoms/ test_data/atoms/

      - name: Validate atom schema
        run: python scripts/validate_atoms.py atoms
```

## Best Practices

1. **Run validation before committing**
   - Use pre-commit hooks to catch issues early
   - Fix validation errors before pushing

2. **Keep atom IDs consistent**
   - Follow the naming convention: `atom-{category}-{name}`
   - Use lowercase with hyphens
   - Make IDs descriptive but concise

3. **Document your atoms thoroughly**
   - Provide meaningful summaries (minimum 10 characters)
   - Include clear steps for processes
   - Define inputs and outputs

4. **Use semantic versioning**
   - Increment patch for bug fixes (1.0.0 → 1.0.1)
   - Increment minor for new features (1.0.1 → 1.1.0)
   - Increment major for breaking changes (1.1.0 → 2.0.0)

5. **Validate relationships**
   - Ensure edge targets point to existing atoms
   - Use appropriate edge types (REQUIRES, ENABLES, etc.)
   - Avoid circular dependencies

## Troubleshooting

### Pre-commit hook not running

```bash
# Reinstall hooks
pre-commit uninstall
pre-commit install
```

### Python dependencies missing

```bash
# Install required packages
pip install jsonschema pyyaml
```

### YAML linter not found

```bash
# Install yamllint
pip install yamllint
```

### Validation passing but UI showing issues

The schema validation catches structure issues, but the runtime API may have additional business logic validations. Check the API logs for details.

## Support

For questions or issues with the validation system:
1. Check this documentation
2. Review the JSON schema: [schemas/atom.schema.json](../schemas/atom.schema.json)
3. Run validation with `--verbose` flag for detailed output
4. Check the validation script: [scripts/validate_atoms.py](../scripts/validate_atoms.py)
