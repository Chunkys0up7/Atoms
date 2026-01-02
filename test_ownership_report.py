#!/usr/bin/env python3
"""Test ownership report generation."""

from api.routes.ownership import get_ownership_report

try:
    print("Generating ownership report...")
    report = get_ownership_report()
    print(f"✅ Report generated successfully!")
    print(f"   Total atoms: {report.coverage.total_atoms}")
    print(f"   Owner coverage: {report.coverage.owner_coverage_pct:.1f}%")
    print(f"   Steward coverage: {report.coverage.steward_coverage_pct:.1f}%")
    print(f"   Top owners: {len(report.top_owners)}")
    print(f"   Top stewards: {len(report.top_stewards)}")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
