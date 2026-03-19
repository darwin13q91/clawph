#!/usr/bin/env python3
# Location: ~/.openclaw/workspace/scripts/trade_logger.py

import json
from datetime import datetime
from pathlib import Path

JOURNAL_DIR = Path.home() / ".openclaw/agents/trader/memory/trades"
JOURNAL_DIR.mkdir(parents=True, exist_ok=True)
JOURNAL_FILE = JOURNAL_DIR / "journal.jsonl"


def log_entry(
    symbol: str,
    direction: str,
    trade_type: str,
    entry: float,
    stop_loss: float,
    take_profit: float,
    lot_size: float,
    risk_usd: float,
    rationale: str,
    session: str = "London",
    setup_type: str = "",
    macro_context: str = "",
    confluence_factors: list = None,
    weaknesses: list = None,
    emotional_state: str = "calm",
    fear_greed: int = 0,
    funding_rate: float = None,
) -> str:
    """Log a new trade entry. Returns trade ID."""
    
    # Count existing trades for ID
    trade_count = sum(1 for _ in open(JOURNAL_FILE)) if JOURNAL_FILE.exists() else 0
    trade_id = f"TRD-{datetime.now().strftime('%Y')}-{trade_count + 1:03d}"
    
    stop_distance = abs(entry - stop_loss)
    tp_distance = abs(take_profit - entry)
    rr_ratio = tp_distance / stop_distance if stop_distance > 0 else 0
    
    record = {
        "id": trade_id,
        "timestamp": datetime.now().isoformat(),
        "symbol": symbol,
        "direction": direction,
        "trade_type": trade_type,
        "session": session,
        "entry": entry,
        "stop_loss": stop_loss,
        "take_profit": take_profit,
        "lot_size": lot_size,
        "risk_usd": risk_usd,
        "risk_pct": round(risk_usd / 10000 * 100, 2),  # assumes $10k account
        "rr_ratio": round(rr_ratio, 2),
        "rationale": rationale,
        "setup_type": setup_type,
        "macro_context": macro_context,
        "fear_greed": fear_greed,
        "funding_rate": funding_rate,
        "confluence_factors": confluence_factors or [],
        "weaknesses": weaknesses or [],
        "emotional_state": emotional_state,
        "followed_rules": True,
        "exit_price": None,
        "exit_time": None,
        "exit_type": None,
        "outcome": None,
        "pnl_usd": None,
        "r_multiple": None,
        "exit_notes": None,
        "lesson": None,
        "status": "open",
    }
    
    with open(JOURNAL_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")
    
    print(f"Trade logged: {trade_id} | {direction.upper()} {symbol} @ {entry}")
    return trade_id


def log_exit(
    trade_id: str,
    exit_price: float,
    exit_type: str,
    pnl_usd: float,
    exit_notes: str = "",
    lesson: str = "",
):
    """Update an existing trade record with exit data."""
    
    records = []
    updated = False
    
    with open(JOURNAL_FILE, "r") as f:
        for line in f:
            record = json.loads(line.strip())
            if record["id"] == trade_id:
                entry = record["entry"]
                sl = record["stop_loss"]
                risk = abs(entry - sl)
                r_multiple = (pnl_usd / record["risk_usd"]) if record["risk_usd"] > 0 else 0
                
                record.update({
                    "exit_price": exit_price,
                    "exit_time": datetime.now().isoformat(),
                    "exit_type": exit_type,
                    "outcome": "win" if pnl_usd > 0 else "loss" if pnl_usd < 0 else "breakeven",
                    "pnl_usd": pnl_usd,
                    "r_multiple": round(r_multiple, 2),
                    "exit_notes": exit_notes,
                    "lesson": lesson,
                    "status": "closed",
                })
                updated = True
            records.append(record)
    
    with open(JOURNAL_FILE, "w") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")
    
    if updated:
        print(f"Trade {trade_id} closed | P&L: ${pnl_usd:+.2f} | R: {r_multiple:+.2f}R")
    else:
        print(f"Trade {trade_id} not found")


def get_open_trades() -> list:
    """Return all open trades."""
    if not JOURNAL_FILE.exists():
        return []
    trades = []
    with open(JOURNAL_FILE) as f:
        for line in f:
            t = json.loads(line.strip())
            if t.get("status") == "open":
                trades.append(t)
    return trades


# Example usage
if __name__ == "__main__":
    # Example: Log a new trade
    # Example: Log a new trade
    trade_id = log_entry(
        symbol="XAUUSD",
        direction="buy",
        trade_type="swing",
        entry=2185.50,
        stop_loss=2172.00,
        take_profit=2226.00,
        lot_size=0.05,
        risk_usd=67.50,
        rationale="4H bullish engulfing at key support",
        session="London",
        setup_type="engulfing_at_support",
        macro_context="Risk-on, DXY -0.4%",
        confluence_factors=["4H engulfing", "50 EMA support"],
    )
    
    # Example: Close the trade
    log_exit(
        trade_id=trade_id,
        exit_price=2221.00,
        exit_type="partial_tp_then_trail",
        pnl_usd=175.00,
        exit_notes="Took 60% at 2.5R, trailed remainder",
        lesson="Good execution, should have trailed tighter",
    )
