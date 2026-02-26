#!/usr/bin/env python3
"""
Quick test script for the market scanner.
Run this to verify everything works before setting up cron.
"""

import sys
sys.path.insert(0, '/home/darwin/.openclaw/workspace/skills/market-scanner')

from market_scanner import market_scan, log_to_console, save_to_json

print("🧪 Testing Market Scanner")
print("=" * 50)

# Run scan with conservative filters
opportunities = market_scan(
    min_volume=1000,    # $1k daily volume
    max_spread=0.10,    # 10c spread
    min_days=7,         # 1 week to resolution
    max_days=60,        # 2 months max
)

# Display results
log_to_console(opportunities, max_display=10)

# Save to file
save_to_json(opportunities)

print(f"\n✅ Test complete!")
print(f"📊 Found {len(opportunities)} opportunities")
print(f"📁 Results saved to ~/.openclaw/data/scan_results.json")
