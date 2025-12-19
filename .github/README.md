# GitHub Actions Configuration

Automated CI/CD pipeline for the Graph-Native Documentation Platform (GNDP).

## Workflows

### CI Pipeline (workflows/ci.yml)
Comprehensive testing and validation on every push and PR.

**Jobs:**
- Lint and Validate: Code quality and schema validation
- Test: Unit and integration tests with Neo4j
- Build Docs: Documentation generation and validation
- Docker Build: Container image build and health check
- Security Scan: Vulnerability and secret detection

**Required Secrets:**
- `ANTHROPIC_API_KEY` - Claude API key for tests

### Deploy Pipeline (workflows/deploy.yml)
Automated deployment to GitHub Pages on main branch.

**Jobs:**
- Build: Generate documentation site
- Deploy: Publish to GitHub Pages

**Required Setup:**
- Enable GitHub Pages in repository settings
- Source: GitHub Actions

### PR Analysis (workflows/pr-analysis.yml)
Claude-powered pull request analysis and reporting.

**Jobs:**
- Analyze: AI-powered code review and impact analysis

**Required Secrets:**
- `ANTHROPIC_API_KEY` - Claude API key for analysis
- `GITHUB_TOKEN` - Automatically provided

## Scripts

### post_pr_report.py
Analyzes pull requests using Claude API and posts comprehensive reports.

**Features:**
- Summary of changes
- Risk assessment (LOW/MEDIUM/HIGH)
- Key changes and impacts
- Testing recommendations
- Review focus areas

**Usage:**
```bash
python .github/scripts/post_pr_report.py \
  --pr-number 123 \
  --repo owner/repo \
  --github-token $GITHUB_TOKEN \
  --anthropic-api-key $ANTHROPIC_API_KEY
```

## Setup Instructions

### 1. Configure Secrets

Go to repository Settings → Secrets and variables → Actions:

```
ANTHROPIC_API_KEY = sk-ant-api03-xxxxx
```

### 2. Enable GitHub Pages

Go to repository Settings → Pages:
- Source: GitHub Actions
- No branch selection needed

### 3. Verify Workflows

Push to a branch and check Actions tab:
- CI pipeline should run automatically
- All jobs should pass
- Security scans should report no issues

### 4. Test PR Analysis

Create a pull request:
- PR Analysis workflow should trigger
- Claude analysis report should be posted as comment
- Risk level and recommendations should appear

## Monitoring

**View pipeline status:**
- Actions tab in GitHub
- Check workflow runs
- Review logs for failures

**Status badges:**
Add to README.md:
```markdown
[![CI](https://github.com/YOUR_ORG/FullSystem/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/FullSystem/actions/workflows/ci.yml)
```

## Documentation

See [CICD.md](../CICD.md) for complete documentation including:
- Detailed workflow descriptions
- Troubleshooting guide
- Security best practices
- Performance optimization
- Local testing procedures

## Support

For issues:
1. Check workflow logs in Actions tab
2. Review CICD.md documentation
3. Verify secrets are configured
4. Open issue with workflow run URL
