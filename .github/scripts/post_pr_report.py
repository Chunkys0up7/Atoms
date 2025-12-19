#!/usr/bin/env python3
"""
Post PR Report with Claude-powered analysis.

Analyzes pull request changes and posts a comprehensive report as a GitHub comment.
Uses Claude API for intelligent analysis of code changes, impact assessment, and recommendations.

Usage:
    python .github/scripts/post_pr_report.py --pr-number 123 --repo owner/repo

Environment Variables:
    GITHUB_TOKEN: GitHub API token for posting comments
    ANTHROPIC_API_KEY: Claude API key for analysis
"""

import argparse
import json
import os
import sys
from typing import Dict, List, Any
import requests
from anthropic import Anthropic


class PRAnalyzer:
    """Analyzes pull requests using Claude API and GitHub API."""

    def __init__(self, repo: str, pr_number: int, github_token: str, anthropic_api_key: str):
        self.repo = repo
        self.pr_number = pr_number
        self.github_token = github_token
        self.github_api_base = f"https://api.github.com/repos/{repo}"
        self.headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }

        self.anthropic_client = Anthropic(api_key=anthropic_api_key)
        self.model = "claude-sonnet-4-20250514"

    def get_pr_details(self) -> Dict[str, Any]:
        """Fetch PR details from GitHub API."""
        url = f"{self.github_api_base}/pulls/{self.pr_number}"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def get_pr_files(self) -> List[Dict[str, Any]]:
        """Fetch list of changed files in the PR."""
        url = f"{self.github_api_base}/pulls/{self.pr_number}/files"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def get_pr_diff(self) -> str:
        """Fetch the full diff for the PR."""
        url = f"{self.github_api_base}/pulls/{self.pr_number}"
        headers = {**self.headers, "Accept": "application/vnd.github.v3.diff"}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.text

    def analyze_with_claude(self, pr_details: Dict, files: List[Dict], diff: str) -> Dict[str, Any]:
        """Use Claude to analyze the PR changes."""

        # Build analysis prompt
        file_summary = "\n".join([
            f"- {f['filename']} (+{f['additions']} -{f['deletions']})"
            for f in files
        ])

        prompt = f"""Analyze this pull request and provide a comprehensive report.

PR Title: {pr_details['title']}
PR Description: {pr_details.get('body', 'No description provided')}

Changed Files ({len(files)} total):
{file_summary}

Diff Preview (first 10000 chars):
{diff[:10000]}

Please provide:

1. Summary: Brief overview of what this PR does (2-3 sentences)

2. Risk Assessment: Rate the risk level (LOW/MEDIUM/HIGH) and explain why
   - Consider: scope of changes, critical systems affected, test coverage

3. Key Changes: List the 3-5 most important changes
   - Focus on what changed and why it matters

4. Potential Impacts: What systems/features might be affected
   - Consider: dependencies, downstream services, data models

5. Testing Recommendations: What should be tested thoroughly
   - Specific test scenarios based on the changes

6. Review Focus Areas: What reviewers should pay special attention to
   - Security concerns, edge cases, performance implications

Format your response as valid JSON with these exact keys:
{{
  "summary": "...",
  "risk_level": "LOW|MEDIUM|HIGH",
  "risk_explanation": "...",
  "key_changes": ["...", "..."],
  "potential_impacts": ["...", "..."],
  "testing_recommendations": ["...", "..."],
  "review_focus_areas": ["...", "..."]
}}
"""

        system_prompt = """You are an expert code reviewer for the Graph-Native Documentation Platform (GNDP).

GNDP is a FastAPI-based system with:
- Neo4j graph database for storing documentation atoms and relationships
- Chroma vector database for semantic search
- Claude API for natural language query answering
- React frontend for visualization

Focus on:
- Data integrity and graph consistency
- API correctness and error handling
- Security best practices
- Performance implications for graph queries
- Breaking changes to APIs or schemas

Be concise, specific, and actionable in your analysis."""

        try:
            message = self.anthropic_client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text

            # Extract JSON from response (handle markdown code blocks)
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end].strip()
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end].strip()

            analysis = json.loads(response_text)

            # Add token usage
            analysis["tokens_used"] = {
                "input": message.usage.input_tokens,
                "output": message.usage.output_tokens,
                "total": message.usage.input_tokens + message.usage.output_tokens
            }

            return analysis

        except Exception as e:
            print(f"Error during Claude analysis: {e}")
            # Fallback to basic analysis
            return {
                "summary": f"PR updates {len(files)} files with {sum(f['additions'] for f in files)} additions and {sum(f['deletions'] for f in files)} deletions.",
                "risk_level": "MEDIUM",
                "risk_explanation": "Automated analysis unavailable. Manual review recommended.",
                "key_changes": [f['filename'] for f in files[:5]],
                "potential_impacts": ["Manual impact assessment required"],
                "testing_recommendations": ["Run full test suite", "Manual testing of affected features"],
                "review_focus_areas": ["Code correctness", "Test coverage", "Breaking changes"],
                "error": str(e)
            }

    def format_report(self, pr_details: Dict, files: List[Dict], analysis: Dict) -> str:
        """Format the analysis into a GitHub comment."""

        # Risk badge
        risk_badges = {
            "LOW": "🟢 LOW RISK",
            "MEDIUM": "🟡 MEDIUM RISK",
            "HIGH": "🔴 HIGH RISK"
        }
        risk_badge = risk_badges.get(analysis['risk_level'], "⚪ UNKNOWN RISK")

        # File categories
        file_categories = {
            "API": [],
            "Tests": [],
            "Documentation": [],
            "Configuration": [],
            "Other": []
        }

        for file in files:
            filename = file['filename']
            if filename.startswith('api/'):
                file_categories["API"].append(filename)
            elif filename.startswith('tests/'):
                file_categories["Tests"].append(filename)
            elif filename.endswith('.md') or filename.startswith('docs/'):
                file_categories["Documentation"].append(filename)
            elif filename in ['.github/workflows', 'docker-compose.yml', 'Dockerfile', 'requirements.txt']:
                file_categories["Configuration"].append(filename)
            else:
                file_categories["Other"].append(filename)

        # Build report
        report = f"""## Pull Request Analysis Report

### Summary
{analysis['summary']}

### Risk Assessment
**Risk Level:** {risk_badge}

{analysis['risk_explanation']}

### Key Changes
"""
        for i, change in enumerate(analysis['key_changes'], 1):
            report += f"{i}. {change}\n"

        report += f"""
### Potential Impacts
"""
        for impact in analysis['potential_impacts']:
            report += f"- {impact}\n"

        report += f"""
### Testing Recommendations
"""
        for rec in analysis['testing_recommendations']:
            report += f"- {rec}\n"

        report += f"""
### Review Focus Areas
"""
        for area in analysis['review_focus_areas']:
            report += f"- {area}\n"

        report += f"""
---

### Files Changed ({len(files)} total)
"""

        for category, category_files in file_categories.items():
            if category_files:
                report += f"\n**{category}** ({len(category_files)} files)\n"
                for file in category_files[:10]:  # Limit to 10 per category
                    report += f"- `{file}`\n"
                if len(category_files) > 10:
                    report += f"- ... and {len(category_files) - 10} more\n"

        # Stats
        total_additions = sum(f['additions'] for f in files)
        total_deletions = sum(f['deletions'] for f in files)

        report += f"""
---

### Statistics
- **Files changed:** {len(files)}
- **Lines added:** +{total_additions}
- **Lines deleted:** -{total_deletions}
- **Net change:** {total_additions - total_deletions:+d}
"""

        if "tokens_used" in analysis:
            report += f"\n*Analysis powered by Claude Sonnet 4.5 ({analysis['tokens_used']['total']} tokens)*\n"

        return report

    def post_comment(self, comment: str):
        """Post the analysis report as a PR comment."""
        url = f"{self.github_api_base}/issues/{self.pr_number}/comments"
        data = {"body": comment}
        response = requests.post(url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()

    def run(self):
        """Run the full analysis and post report."""
        print(f"Analyzing PR #{self.pr_number} in {self.repo}...")

        # Fetch PR data
        pr_details = self.get_pr_details()
        print(f"PR Title: {pr_details['title']}")

        files = self.get_pr_files()
        print(f"Files changed: {len(files)}")

        diff = self.get_pr_diff()
        print(f"Diff size: {len(diff)} characters")

        # Analyze with Claude
        print("Running Claude analysis...")
        analysis = self.analyze_with_claude(pr_details, files, diff)

        # Format report
        report = self.format_report(pr_details, files, analysis)

        # Post comment
        print("Posting report to PR...")
        comment = self.post_comment(report)
        print(f"Comment posted: {comment['html_url']}")

        return analysis


def main():
    parser = argparse.ArgumentParser(description="Analyze and report on a GitHub pull request")
    parser.add_argument("--pr-number", type=int, required=True, help="Pull request number")
    parser.add_argument("--repo", type=str, required=True, help="Repository in format 'owner/repo'")
    parser.add_argument("--github-token", type=str, help="GitHub API token (or set GITHUB_TOKEN env var)")
    parser.add_argument("--anthropic-api-key", type=str, help="Anthropic API key (or set ANTHROPIC_API_KEY env var)")

    args = parser.parse_args()

    # Get tokens from args or environment
    github_token = args.github_token or os.environ.get("GITHUB_TOKEN")
    anthropic_api_key = args.anthropic_api_key or os.environ.get("ANTHROPIC_API_KEY")

    if not github_token:
        print("Error: GitHub token required (--github-token or GITHUB_TOKEN env var)")
        sys.exit(1)

    if not anthropic_api_key:
        print("Error: Anthropic API key required (--anthropic-api-key or ANTHROPIC_API_KEY env var)")
        sys.exit(1)

    # Run analysis
    analyzer = PRAnalyzer(
        repo=args.repo,
        pr_number=args.pr_number,
        github_token=github_token,
        anthropic_api_key=anthropic_api_key
    )

    try:
        analysis = analyzer.run()
        print("\nAnalysis complete!")
        print(f"Risk Level: {analysis['risk_level']}")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
