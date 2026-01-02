# GitHub Actions Workflows

This directory contains automated workflows for managing the GNDP (Graph-Native Documentation Platform) repository.

## Atom Management Workflows

### 🤖 `auto-commit-atoms.yml` - Automatic Atom Commits

**Triggers:**
- Every 5 minutes (scheduled)
- When atom YAML files are pushed
- Manual dispatch

**Purpose:**
Automatically commits any uncommitted atom changes to maintain git history and enable version tracking.

**What it does:**
1. Checks for uncommitted changes in `atoms/` and `test_data/` directories
2. Creates a descriptive commit message listing changed atoms
3. Commits and pushes changes automatically

**Use case:** Ensures atoms created via the UI are automatically committed without manual intervention.

---

### 📝 `commit-atom-changes.yml` - On-Demand Atom Commits

**Triggers:**
- Manual dispatch only (via GitHub Actions UI)

**Purpose:**
Provides intelligent, detailed commit messages for atom changes with full analysis.

**What it does:**
1. Analyzes all uncommitted atom YAML files
2. Categorizes changes (new vs modified)
3. Groups by category, type, and owning team
4. Generates comprehensive commit message
5. Commits and pushes with detailed metadata

**Use case:** When you want more control over commit messages or prefer manual commit timing.

**How to use:**
1. Go to GitHub Actions → "Commit Atom Changes (On-Demand)"
2. Click "Run workflow"
3. Optionally provide a custom commit message
4. Click "Run workflow" to execute

---

### 🔄 `refresh-fixtures.yml` - Fixture Generation

**Triggers:**
- Daily at 02:00 UTC (scheduled)
- Manual dispatch

**Purpose:**
Refreshes test fixtures and demo data.

**What it does:**
1. Runs the fixture generator script
2. Creates/updates test atoms
3. Runs atom validation tests

---

## Local Development

### Manual Atom Commits (Local Script)

For local development, use the `commit_atom_changes.py` script:

```bash
# Preview changes without committing
python scripts/commit_atom_changes.py --dry-run

# Commit atom changes with auto-generated message
python scripts/commit_atom_changes.py

# Commit and push in one step
python scripts/commit_atom_changes.py --push

# Use custom commit message
python scripts/commit_atom_changes.py --message "feat(atoms): add compliance workflow atoms"
```

**Features:**
- ✅ Analyzes atom changes intelligently
- ✅ Generates detailed commit messages
- ✅ Shows category/type breakdowns
- ✅ Lists affected atoms
- ✅ Dry-run mode for previewing
- ✅ Optional auto-push

---

## Workflow Architecture

### When Atoms Are Created

1. **Via UI (AtomExplorer):**
   - User creates atom → API writes YAML file → File is uncommitted
   - GitHub Actions `auto-commit-atoms.yml` runs every 5 minutes
   - Detects uncommitted atoms and commits them automatically

2. **Via Direct File Edit:**
   - Developer edits YAML file locally
   - Developer runs `python scripts/commit_atom_changes.py`
   - Script analyzes changes and creates intelligent commit
   - Commit is pushed (if `--push` flag used)

3. **Via Bulk Operations:**
   - Scripts generate multiple atoms
   - Run `commit-atom-changes.yml` workflow manually
   - Comprehensive analysis and single commit for all changes

### Git History Benefits

With automated commits, each atom now has:
- ✅ **Creation timestamp** (from git commit)
- ✅ **Modification history** (git log)
- ✅ **Author tracking** (commit author)
- ✅ **Version control** (git diff, revert)
- ✅ **Change attribution** (who changed what when)
- ✅ **Audit trail** (compliance requirement)

---

## Configuration

### Required Permissions

Workflows need the following permissions (already configured):
```yaml
permissions:
  contents: write  # To commit and push changes
```

### Secrets

Uses the default `GITHUB_TOKEN` - no additional secrets required.

---

## Troubleshooting

### Atoms Not Being Committed Automatically

**Check:**
1. Workflow is enabled: Go to Actions → Check "auto-commit-atoms" is not disabled
2. Schedule is running: Look for runs in the Actions tab
3. Permissions are correct: Workflow should have `contents: write`

**Manual trigger:**
```bash
# Via GitHub UI
Actions → "Auto-commit Atom Changes" → Run workflow

# Via local script
python scripts/commit_atom_changes.py --push
```

### Commit Messages Not Detailed Enough

Use the on-demand workflow instead:
```bash
# GitHub UI
Actions → "Commit Atom Changes (On-Demand)" → Run workflow
```

Or locally:
```bash
python scripts/commit_atom_changes.py --dry-run  # Preview first
python scripts/commit_atom_changes.py --push     # Commit with detailed message
```

---

## Best Practices

1. **Let automation handle UI-created atoms** - The 5-minute schedule ensures atoms created via the UI are committed automatically

2. **Use the local script for bulk changes** - When editing multiple atoms locally, use `commit_atom_changes.py` for better commit messages

3. **Use on-demand workflow for releases** - Before merging PRs, run the on-demand workflow to ensure all atoms are committed with proper metadata

4. **Review commit history regularly** - Check `git log -- atoms/` to ensure atoms are being tracked properly

---

## Future Enhancements

Potential improvements:
- [ ] Add atom schema validation before commit
- [ ] Auto-generate changelog from atom commits
- [ ] Trigger documentation rebuild on atom changes
- [ ] Add PR comments with atom change summaries
- [ ] Integration with issue tracking (link atoms to issues)
