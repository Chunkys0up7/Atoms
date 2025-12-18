# Contributing to GNDP

Thank you for your interest in contributing to the Graph-Native Documentation Platform!

## Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a branch** for your changes
4. **Make your changes** following the guidelines below
5. **Test your changes** with validation scripts
6. **Submit a pull request**

## Adding Atoms

Atoms are the fundamental units of documentation. Here's how to create one:

### 1. Choose the Right Category

Place your atom in the appropriate directory:

- `atoms/requirements/` - System requirements
- `atoms/designs/` - Design specifications
- `atoms/procedures/` - Operational procedures
- `atoms/validations/` - Test specifications
- `atoms/policies/` - Governance policies
- `atoms/risks/` - Risk documentation

### 2. Create the YAML File

Use this template for your atom:

```yaml
id: YOUR-CATEGORY-###
type: requirement  # or design, procedure, validation, policy, risk
title: Brief Title
summary: One-line description of what this atom represents

content: |
  Detailed content goes here.

  ## Sections
  Use markdown formatting for rich content.

  - Bullet points
  - Code blocks
  - Tables

metadata:
  owner: team_name
  status: draft  # draft, active, deprecated
  version: 1.0.0
  created: 2025-12-18
  updated: 2025-12-18
  criticality: high  # low, medium, high, critical

# Define relationships to other atoms
relationships:
  upstream:  # Atoms this depends on
    - id: REQ-001
      type: requires
      description: Depends on authentication system
  downstream:  # Atoms that depend on this
    - id: VAL-001
      type: validates
      description: Validated by security tests

# Tags for searchability
tags:
  - authentication
  - security
  - oauth
```

### 3. ID Naming Convention

Follow these patterns:

- Requirements: `REQ-###`
- Designs: `DES-###`
- Procedures: `PROC-###`
- Validations: `VAL-###`
- Policies: `POL-###`
- Risks: `RISK-###`

Numbers should be zero-padded to 3 digits (e.g., `REQ-001`, `REQ-042`).

### 4. Relationship Types

Use these standard relationship types:

| Type | Meaning | Example |
|------|---------|---------|
| `requires` | Hard dependency | DES-001 requires REQ-001 |
| `implements` | Realizes a requirement | PROC-001 implements DES-001 |
| `validates` | Tests or verifies | VAL-001 validates PROC-001 |
| `mitigates` | Controls a risk | POL-001 mitigates RISK-001 |
| `triggers` | Sequential flow | PROC-001 triggers PROC-002 |
| `references` | Informational link | Any soft reference |

## Adding Modules

Modules group atoms into cohesive workflows or systems.

### Module Template

```yaml
module_id: your-module-name
name: "Module Display Name"
description: Brief description of what this module does

type: workflow  # workflow, system, process
status: active

# List all atoms in this module
atoms:
  - REQ-001
  - DES-001
  - PROC-001
  - VAL-001

# Define entry and exit points
entry_points:
  - REQ-001  # Where workflows begin

exit_points:
  - VAL-001  # Where workflows end

# External dependencies
external_dependencies:
  - name: OAuth Provider
    type: external_system
    description: Third-party authentication

metadata:
  owner: team_name
  version: 1.0.0
  created: 2025-12-18
  updated: 2025-12-18
```

## Validation Before Committing

**Always** run validation before committing:

```bash
# Validate schemas
python scripts/validate_schemas.py

# Check graph integrity
python scripts/check_orphans.py

# Run full validation and build
python builder.py validate
python builder.py build
```

Fix any errors before proceeding.

## Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature or atom
- `fix`: Bug fix or correction
- `docs`: Documentation changes
- `refactor`: Restructuring without behavior change
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(atoms): add OAuth 2.0 requirement specification

Add REQ-001 detailing OAuth 2.0 authentication requirements
including supported providers and token management.

Relates to authentication system module.
```

```
fix(relationships): correct validation links in PROC-002

Update downstream relationships to properly reference VAL-002
instead of VAL-001.
```

## Pull Request Process

1. **Update documentation** if you're adding new patterns or categories
2. **Add tests** if applicable (e.g., new validation scripts)
3. **Run the full validation suite**:
   ```bash
   python builder.py validate
   python builder.py build
   ```
4. **Fill out the PR template** with:
   - What changed
   - Why it changed
   - How to test it
   - Impact analysis (run `python docs/impact_analysis.py --changed-files <files>`)

### PR Title Format

Use the same format as commit messages:

```
feat(atoms): add data encryption requirements
fix(build): correct UTF-8 encoding in build_docs.py
```

## Impact Analysis

For changes to existing atoms, run impact analysis:

```bash
python docs/impact_analysis.py \
  --changed-files atoms/requirements/REQ-001.yaml \
  --output-format markdown
```

Include the output in your PR description to help reviewers understand downstream effects.

## Code Style

### Python

- Follow PEP 8
- Use type hints
- Add docstrings for functions and classes
- Use UTF-8 encoding explicitly for file operations

### YAML

- Use 2-space indentation
- Quote strings with special characters
- Include comments for complex sections

### Markdown

- Use ATX-style headers (`#` not underlines)
- One sentence per line for easier diffs
- Include code fences with language identifiers

## Testing

### Running Tests

```bash
# Run all tests
python scripts/run_tests.py

# Run specific test
python -m pytest tests/test_claude_helper.py

# Run with coverage
python -m pytest --cov=. tests/
```

### Writing Tests

Place test files in `tests/` with the naming pattern `test_*.py`.

Example:

```python
def test_atom_validation():
    """Test that atom YAML validates against schema."""
    from scripts.validate_schemas import GNDPValidator

    validator = GNDPValidator()
    errors = validator.validate_file("atoms/requirements/REQ-001.yaml")

    assert len(errors) == 0, f"Validation errors: {errors}"
```

## Documentation

### Building Docs Locally

```bash
# Install MkDocs
pip install mkdocs mkdocs-material mkdocs-awesome-pages-plugin

# Build and serve
mkdocs serve
```

Then open http://localhost:8000

### Updating Architecture

Major architectural changes should update:

1. `docs/GNDP-Architecture.md` - System design
2. `docs/ACTION_PLAN.md` - Implementation roadmap
3. `CURRENT_ACTION_PLAN.md` - Current sprint plan

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Security**: Email security@example.com (do not open public issues)

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Assume good intentions
- Keep discussions professional

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

*Thank you for contributing to GNDP!*
*For more details, see [README.md](README.md) and [docs/GNDP-Architecture.md](docs/GNDP-Architecture.md)*
