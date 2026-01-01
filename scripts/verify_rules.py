#!/usr/bin/env python3
"""Verify rules API endpoint and display all rules."""

import json

import requests


def verify_rules_api():
    try:
        print("=" * 80)
        print("RULE MANAGER VERIFICATION")
        print("=" * 80)
        print()

        # Test the API endpoint
        response = requests.get("http://localhost:8000/api/rules")

        print(f"API Endpoint: http://localhost:8000/api/rules")
        print(f"Status Code: {response.status_code}")
        print()

        if response.status_code == 200:
            rules = response.json()
            print(f"✅ API Response: Successfully retrieved {len(rules)} rules")
            print()
            print("-" * 80)
            print("REGISTERED RULES:")
            print("-" * 80)
            print()

            # Sort by priority (descending)
            rules.sort(key=lambda r: r.get("priority", 0), reverse=True)

            for i, rule in enumerate(rules, 1):
                status = "✅ ACTIVE" if rule.get("active") else "⏸️  INACTIVE"
                print(f"{i}. {rule['name']}")
                print(f"   ID: {rule['rule_id']}")
                print(f"   Description: {rule['description']}")
                print(f"   Priority: {rule['priority']}/10")
                print(f"   Status: {status}")
                print(f"   Created: {rule['created_at']}")

                # Show action type
                if rule.get("action"):
                    action = rule["action"].get("action", {})
                    action_type = rule["action"].get("type", "UNKNOWN")
                    print(f"   Action: {action_type}")

                    # Show phase details if available
                    if rule["action"].get("phase"):
                        phase = rule["action"]["phase"]
                        print(f"   Phase: {phase.get('name')} ({phase.get('id')})")

                print()

            print("-" * 80)
            print("SUMMARY")
            print("-" * 80)
            active_count = sum(1 for r in rules if r.get("active"))
            print(f"Total Rules: {len(rules)}")
            print(f"Active Rules: {active_count}")
            print(f"Inactive Rules: {len(rules) - active_count}")
            print()

            # Group by action type
            action_types = {}
            for rule in rules:
                action_type = rule.get("action", {}).get("type", "UNKNOWN")
                action_types[action_type] = action_types.get(action_type, 0) + 1

            print("Rules by Action Type:")
            for action_type, count in sorted(action_types.items()):
                print(f"  - {action_type}: {count}")

            return True
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to API server at http://localhost:8000")
        print("Make sure the backend server is running!")
        return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False


if __name__ == "__main__":
    success = verify_rules_api()
    import sys

    sys.exit(0 if success else 1)
