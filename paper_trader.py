#!/usr/bin/env python3
"""
Paper trade tracker for Polymarket scanner.
Logs hypothetical trades and tracks outcomes.
"""

import json
import os
from datetime import datetime, timezone
from typing import List, Dict, Optional

DATA_DIR = os.path.expanduser("~/.openclaw/data")
PAPER_TRADES_FILE = os.path.join(DATA_DIR, "paper_trades.json")


def load_paper_trades() -> List[Dict]:
    """Load all paper trades from disk."""
    try:
        with open(PAPER_TRADES_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save_paper_trades(trades: List[Dict]):
    """Save paper trades to disk."""
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(PAPER_TRADES_FILE, 'w') as f:
        json.dump(trades, f, indent=2, default=str)


def log_paper_trade(
    market_id: str,
    market_question: str,
    direction: str,  # 'YES' or 'NO'
    entry_price: float,
    shares: int,
    reasoning: str = "",
) -> Dict:
    """
    Log a hypothetical paper trade.
    
    Args:
        market_id: Unique market identifier
        market_question: Market question text
        direction: 'YES' or 'NO'
        entry_price: Price entered (0.01 to 0.99)
        shares: Number of shares to buy
        reasoning: Why you're taking this trade
    
    Returns:
        Trade record with calculated fields
    """
    trades = load_paper_trades()
    
    trade = {
        "id": f"paper_{len(trades) + 1}",
        "market_id": market_id,
        "market_question": market_question,
        "direction": direction.upper(),
        "entry_price": round(entry_price, 4),
        "shares": shares,
        "position_size": round(shares * entry_price, 2),
        "potential_profit": round(shares * (1.0 - entry_price), 2) if direction.upper() == "YES" else round(shares * entry_price, 2),
        "potential_loss": round(shares * entry_price, 2) if direction.upper() == "YES" else round(shares * (1.0 - entry_price), 2),
        "reasoning": reasoning,
        "status": "OPEN",  # OPEN, CLOSED, EXPIRED
        "exit_price": None,
        "pnl": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "closed_at": None,
    }
    
    trades.append(trade)
    save_paper_trades(trades)
    
    return trade


def close_paper_trade(trade_id: str, exit_price: float, reason: str = "") -> Optional[Dict]:
    """
    Close a paper trade at a given exit price.
    
    Args:
        trade_id: The trade ID to close
        exit_price: Price at which position is closed
        reason: Why closing (e.g., "take_profit", "stop_loss", "expired")
    
    Returns:
        Updated trade record or None if not found
    """
    trades = load_paper_trades()
    
    for trade in trades:
        if trade["id"] == trade_id and trade["status"] == "OPEN":
            trade["exit_price"] = round(exit_price, 4)
            trade["closed_at"] = datetime.now(timezone.utc).isoformat()
            trade["close_reason"] = reason
            
            # Calculate P&L
            if trade["direction"] == "YES":
                # Bought YES at entry, sell at exit
                trade["pnl"] = round(trade["shares"] * (exit_price - trade["entry_price"]), 2)
            else:
                # Bought NO at entry (same as selling YES), sell at exit
                trade["pnl"] = round(trade["shares"] * (trade["entry_price"] - exit_price), 2)
            
            trade["status"] = "CLOSED"
            trade["pnl_pct"] = round((trade["pnl"] / trade["position_size"]) * 100, 2) if trade["position_size"] > 0 else 0
            
            save_paper_trades(trades)
            return trade
    
    return None


def get_paper_stats() -> Dict:
    """Get statistics on paper trading performance."""
    trades = load_paper_trades()
    
    closed_trades = [t for t in trades if t["status"] == "CLOSED"]
    open_trades = [t for t in trades if t["status"] == "OPEN"]
    
    if not closed_trades:
        return {
            "total_trades": len(trades),
            "closed_trades": 0,
            "open_trades": len(open_trades),
            "win_rate": 0,
            "total_pnl": 0,
            "avg_pnl": 0,
            "message": "No completed trades yet. Start paper trading!"
        }
    
    wins = [t for t in closed_trades if t.get("pnl", 0) > 0]
    losses = [t for t in closed_trades if t.get("pnl", 0) <= 0]
    
    total_pnl = sum(t.get("pnl", 0) for t in closed_trades)
    avg_pnl = total_pnl / len(closed_trades)
    
    return {
        "total_trades": len(trades),
        "closed_trades": len(closed_trades),
        "open_trades": len(open_trades),
        "wins": len(wins),
        "losses": len(losses),
        "win_rate": round((len(wins) / len(closed_trades)) * 100, 1),
        "total_pnl": round(total_pnl, 2),
        "avg_pnl": round(avg_pnl, 2),
        "best_trade": max(closed_trades, key=lambda x: x.get("pnl", 0))["pnl"] if closed_trades else 0,
        "worst_trade": min(closed_trades, key=lambda x: x.get("pnl", 0))["pnl"] if closed_trades else 0,
    }


def get_open_positions() -> List[Dict]:
    """Get all open paper trade positions."""
    trades = load_paper_trades()
    return [t for t in trades if t["status"] == "OPEN"]


# Simple CLI for testing
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Paper Trade Tracker")
        print("===================")
        print(f"Total trades: {len(load_paper_trades())}")
        print(f"Stats: {get_paper_stats()}")
        print()
        print("Usage:")
        print("  python paper_trader.py log <market_id> <question> <YES/NO> <price> <shares>")
        print("  python paper_trader.py close <trade_id> <exit_price>")
        print("  python paper_trader.py stats")
        sys.exit(0)
    
    cmd = sys.argv[1]
    
    if cmd == "log" and len(sys.argv) >= 6:
        trade = log_paper_trade(
            market_id=sys.argv[2],
            market_question=sys.argv[3],
            direction=sys.argv[4],
            entry_price=float(sys.argv[5]),
            shares=int(sys.argv[6]) if len(sys.argv) > 6 else 1,
        )
        print(f"✅ Logged paper trade: {trade['id']}")
        print(f"   {trade['direction']} {trade['shares']} shares at ${trade['entry_price']}")
        print(f"   Potential profit: ${trade['potential_profit']}, Loss: ${trade['potential_loss']}")
    
    elif cmd == "close" and len(sys.argv) >= 4:
        trade = close_paper_trade(sys.argv[2], float(sys.argv[3]))
        if trade:
            print(f"✅ Closed trade: {trade['id']}")
            print(f"   P&L: ${trade['pnl']} ({trade['pnl_pct']}%)")
        else:
            print("❌ Trade not found or already closed")
    
    elif cmd == "stats":
        stats = get_paper_stats()
        print(json.dumps(stats, indent=2))
    
    else:
        print("Unknown command")
