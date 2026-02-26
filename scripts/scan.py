#!/usr/bin/env python3
"""
Simplified market scanner for paper trading.
Fast, lightweight, logs to console and file.
"""

import requests
import json
import os
from datetime import datetime, timezone

API = "https://gamma-api.polymarket.com"

def scan():
    """Quick scan of top 100 markets."""
    print("🔍 Scanning Polymarket...")
    
    resp = requests.get(f"{API}/markets", params={
        "limit": 100,
        "offset": 0,
        "active": True,
        "closed": False,
    }, timeout=30)
    resp.raise_for_status()
    markets = resp.json()
    
    opportunities = []
    
    for m in markets:
        try:
            # Basic filters
            volume = float(m.get("volume24hr", 0))
            if volume < 100:  # $100 min volume (relaxed for testing)
                continue
            
            # Check for price data
            prices_str = m.get("outcomePrices", "")
            if not prices_str or prices_str == "null":
                continue
            
            try:
                prices = json.loads(prices_str)
                if len(prices) < 2:
                    continue
                yes_price = float(prices[0])  # Yes is usually first
            except (json.JSONDecodeError, ValueError, IndexError):
                continue
            
            if yes_price < 0.05 or yes_price > 0.95:
                continue
            
            # Check resolution date
            end = m.get("endDate", "")
            if end:
                from datetime import datetime
                days = (datetime.fromisoformat(end.replace("Z", "+00:00")) - 
                       datetime.now(timezone.utc)).days
                if days < 1 or days > 365:  # Relaxed filters
                    continue
            
            opportunities.append({
                "question": m.get("question", "")[:60],
                "yes_price": round(yes_price, 2),
                "volume": round(volume, 0),
                "liquidity": round(float(m.get("liquidityClob", 0)), 0),
                "category": m.get("category", "unknown"),
                "days_left": days if end else "?",
            })
        except:
            continue
    
    # Sort by volume
    opportunities.sort(key=lambda x: x["volume"], reverse=True)
    return opportunities

def main():
    opps = scan()
    
    print(f"\n📊 TOP {min(10, len(opps))} OPPORTUNITIES:\n")
    print(f"{'Market':<45} {'YES':>5} {'Vol':>10} {'Days':>5}")
    print("-" * 70)
    
    for o in opps[:10]:
        q = o['question'][:42] + "..." if len(o['question']) > 45 else o['question']
        print(f"{q:<45} ${o['yes_price']:<4.2f} ${o['volume']:>8,.0f} {o['days_left']:>5}")
    
    # Save
    os.makedirs(os.path.expanduser("~/.openclaw/data"), exist_ok=True)
    with open(os.path.expanduser("~/.openclaw/data/scan.json"), "w") as f:
        json.dump({
            "scanned_at": datetime.now(timezone.utc).isoformat(),
            "count": len(opps),
            "opportunities": opps,
        }, f, indent=2)
    
    print(f"\n✅ Found {len(opps)} opportunities")
    print("📁 Saved to ~/.openclaw/data/scan.json")

if __name__ == "__main__":
    main()
