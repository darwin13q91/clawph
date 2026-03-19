#!/usr/bin/env python3
# Monthly Decision Review Script
# Location: ~/.openclaw/workspace/scripts/monthly-decision-review.py
# Run: First Monday of each month

import json
import glob
from pathlib import Path
from datetime import datetime, timedelta
from collections import Counter

DECISIONS_DIR = Path.home() / ".openclaw" / "workspace" / "memory" / "decisions"

def run_monthly_review():
    """Generate monthly decision review report."""
    
    # Load all decisions from last month
    last_month = (datetime.now().replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
    decisions_file = DECISIONS_DIR / f"{last_month}.json"
    
    if not decisions_file.exists():
        print(f"=== Decision Review: {last_month} ===\n")
        print(f"No decisions logged for {last_month}")
        return
    
    with open(decisions_file) as f:
        decisions = json.load(f)
    
    print(f"=== Decision Review: {last_month} ===\n")
    print(f"Total decisions logged: {len(decisions)}\n")
    
    # By category
    categories = Counter(d.get("category", "uncategorized") for d in decisions)
    print("By category:")
    for cat, count in categories.most_common():
        print(f"  {cat}: {count}")
    
    # By risk level
    risks = Counter(d.get("risk_level", "unknown") for d in decisions)
    print("\nBy risk level:")
    for risk, count in risks.most_common():
        print(f"  {risk}: {count}")
    
    # By outcome
    outcomes = Counter(d.get("outcome", "pending") for d in decisions)
    print("\nBy outcome:")
    for outcome, count in outcomes.most_common():
        print(f"  {outcome}: {count}")
    
    # Open follow-ups
    print("\nOpen follow-up actions:")
    has_followups = False
    for d in decisions:
        follow_up = d.get("follow_up", "")
        if follow_up and "complete" not in follow_up.lower():
            print(f"  [{d['id']}] {follow_up}")
            has_followups = True
    if not has_followups:
        print("  None — all follow-ups complete!")
    
    # Decisions needing outcome update
    print("\nDecisions still marked 'pending':")
    has_pending = False
    for d in decisions:
        if d.get("outcome", "").lower() in ["pending", ""]:
            print(f"  [{d['id']}] {d['title']}")
            has_pending = True
    if not has_pending:
        print("  None — all outcomes recorded!")
    
    # Recommendations
    print("\n=== Recommendations ===")
    
    # Check for patterns
    critical_count = sum(1 for d in decisions if d.get("risk_level") == "critical")
    if critical_count > 3:
        print(f"⚠️  High number of Critical decisions ({critical_count}). Review if systemic issues exist.")
    
    # Check for failed decisions
    failed_count = sum(1 for d in decisions if d.get("outcome", "").lower() == "failed")
    if failed_count > 0:
        print(f"⚠️  {failed_count} decisions had 'failed' outcome. Consider post-mortems.")
    
    # Check for policy candidates
    repeated_categories = [cat for cat, count in categories.items() if count >= 3]
    if repeated_categories:
        print(f"💡 Categories with 3+ decisions: {', '.join(repeated_categories)}")
        print("   Consider if any should graduate to policies.")
    
    print("\n=== End of Review ===")
    print(f"Next review: {(datetime.now().replace(day=1) + timedelta(days=32)).strftime('%Y-%m')}")

if __name__ == "__main__":
    run_monthly_review()
