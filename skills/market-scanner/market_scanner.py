"""
market-scanner.skill
Paper trading market scanner for Polymarket.
Fetches markets, filters for opportunities, logs to Google Sheets.
NO REAL TRADES - educational/diagnostic only.
"""

import os
import requests
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict

# API Endpoints
GAMMA_API = "https://gamma-api.polymarket.com"
CLOB_API = "https://clob.polymarket.com"

# Default filters (conservative for small bankroll)
DEFAULT_MIN_VOLUME = 1000      # $1,000 daily volume
DEFAULT_MAX_SPREAD = 0.10      # 10 cent spread
DEFAULT_MIN_DAYS = 7           # At least 1 week to resolution
DEFAULT_MAX_DAYS = 60          # Max 2 months

def market_scan(
    min_volume: float = DEFAULT_MIN_VOLUME,
    max_spread: float = DEFAULT_MAX_SPREAD,
    min_days: int = DEFAULT_MIN_DAYS,
    max_days: int = DEFAULT_MAX_DAYS,
) -> List[Dict]:
    """
    Scan all active Polymarket markets and return opportunities.
    
    Returns list of dicts with:
    - condition_id, question, category
    - yes_price, no_price, spread
    - volume_24h, liquidity, traders
    - days_to_resolution
    """
    opportunities = []
    offset = 0
    limit = 100
    
    print(f"🔍 Scanning Polymarket markets...")
    
    while True:
        try:
            resp = requests.get(
                f"{GAMMA_API}/markets",
                params={
                    "limit": limit,
                    "offset": offset,
                    "active": True,
                    "closed": False,
                },
                timeout=30,
            )
            resp.raise_for_status()
            batch = resp.json()
            
            if not batch:
                break
            
            for m in batch:
                try:
                    # Parse resolution date
                    end_date_str = m.get("endDate", "")
                    if not end_date_str:
                        continue
                    
                    end_date = datetime.fromisoformat(
                        end_date_str.replace("Z", "+00:00")
                    )
                    days_to_res = (end_date - datetime.now(timezone.utc)).days
                    
                    # Extract token prices
                    tokens = m.get("tokens", [])
                    yes_token = next((t for t in tokens if t.get("outcome") == "Yes"), None)
                    no_token = next((t for t in tokens if t.get("outcome") == "No"), None)
                    
                    if not yes_token or not no_token:
                        continue
                    
                    yes_price = float(yes_token.get("price", 0))
                    no_price = float(no_token.get("price", 0))
                    spread = abs(1.0 - yes_price - no_price)
                    volume = float(m.get("volume24hr", 0))
                    liquidity = float(m.get("liquidityClob", 0))
                    
                    # Apply filters
                    if volume < min_volume:
                        continue
                    if spread > max_spread:
                        continue
                    if days_to_res < min_days or days_to_res > max_days:
                        continue
                    
                    # Skip extreme prices (already decided)
                    if yes_price > 0.95 or yes_price < 0.05:
                        continue
                    
                    opportunities.append({
                        "condition_id": m.get("conditionId", ""),
                        "market_slug": m.get("slug", ""),
                        "question": m.get("question", ""),
                        "description": m.get("description", "")[:200],
                        "category": m.get("category", "unknown").lower(),
                        "yes_price": round(yes_price, 4),
                        "no_price": round(no_price, 4),
                        "spread": round(spread, 4),
                        "volume_24h": round(volume, 2),
                        "liquidity": round(liquidity, 2),
                        "days_to_resolution": days_to_res,
                        "end_date": end_date.isoformat(),
                        "scanned_at": datetime.now(timezone.utc).isoformat(),
                    })
                    
                except (KeyError, ValueError, TypeError) as e:
                    continue
            
            offset += limit
            if len(batch) < limit:
                break
                
        except requests.RequestException as e:
            print(f"❌ API error: {e}")
            break
    
    # Sort by volume (highest first)
    opportunities.sort(key=lambda x: x["volume_24h"], reverse=True)
    
    print(f"✅ Found {len(opportunities)} opportunities")
    return opportunities


def market_details(condition_id: str) -> Dict:
    """Get detailed info for a specific market."""
    try:
        resp = requests.get(
            f"{GAMMA_API}/markets/{condition_id}",
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        return {"error": str(e)}


def log_to_console(opportunities: List[Dict], max_display: int = 10):
    """Print opportunities to console (for testing)."""
    print(f"\n📊 TOP {min(max_display, len(opportunities))} OPPORTUNITIES:\n")
    print(f"{'Market':<50} {'YES':>6} {'Spread':>7} {'Volume':>12} {'Days':>5}")
    print("=" * 85)
    
    for opp in opportunities[:max_display]:
        question = opp['question'][:47] + "..." if len(opp['question']) > 50 else opp['question']
        print(f"{question:<50} ${opp['yes_price']:<5.2f} ${opp['spread']:<6.2f} ${opp['volume_24h']:>10,.0f} {opp['days_to_resolution']:>4}")


def save_to_json(opportunities: List[Dict], filename: str = "scan_results.json"):
    """Save scan results to JSON file."""
    filepath = os.path.expanduser(f"~/.openclaw/data/{filename}")
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    with open(filepath, 'w') as f:
        json.dump({
            "scanned_at": datetime.now(timezone.utc).isoformat(),
            "count": len(opportunities),
            "opportunities": opportunities,
        }, f, indent=2)
    
    print(f"💾 Saved to {filepath}")


# Simple test when run directly
if __name__ == "__main__":
    print("🚀 Polymarket Paper Trading Scanner")
    print("=" * 50)
    
    # Run scan
    opps = market_scan(
        min_volume=1000,   # $1k volume
        max_spread=0.10,   # 10c spread
        min_days=7,        # 1 week min
        max_days=60,       # 2 months max
    )
    
    # Display
    log_to_console(opps)
    
    # Save
    save_to_json(opps)
    
    print(f"\n✨ Done! Found {len(opps)} markets matching criteria.")
    print("📋 Review these opportunities before paper trading.")
