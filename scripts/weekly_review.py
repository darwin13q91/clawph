#!/usr/bin/env python3
# Location: ~/.openclaw/workspace/scripts/weekly_review.py
# Run: Every Monday morning

import json
from pathlib import Path
from datetime import datetime, timedelta
from collections import Counter

JOURNAL_FILE = Path.home() / ".openclaw/agents/trader/memory/trades/journal.jsonl"
REVIEWS_DIR = Path.home() / ".openclaw/agents/trader/memory/trades"

def weekly_review():
    if not JOURNAL_FILE.exists():
        print("No trades logged yet.")
        return

    # Load trades from last 7 days
    cutoff = (datetime.now() - timedelta(days=7)).isoformat()
    all_trades = [json.loads(l) for l in open(JOURNAL_FILE)]
    week_trades = [t for t in all_trades if t["timestamp"] >= cutoff and t["status"] == "closed"]

    if not week_trades:
        print("No closed trades this week.")
        return

    wins = [t for t in week_trades if t["outcome"] == "win"]
    losses = [t for t in week_trades if t["outcome"] == "loss"]
    breakevens = [t for t in week_trades if t["outcome"] == "breakeven"]

    total_pnl = sum(t["pnl_usd"] or 0 for t in week_trades)
    win_rate = len(wins) / len(week_trades) * 100 if week_trades else 0
    avg_win_r = sum(t["r_multiple"] for t in wins) / len(wins) if wins else 0
    avg_loss_r = sum(t["r_multiple"] for t in losses) / len(losses) if losses else 0
    expectancy = (win_rate/100 * avg_win_r) + ((1 - win_rate/100) * avg_loss_r)

    # Setup type performance
    setup_counts = Counter(t.get("setup_type", "unknown") for t in week_trades)
    setup_pnl = {}
    for t in week_trades:
        st = t.get("setup_type", "unknown")
        setup_pnl[st] = setup_pnl.get(st, 0) + (t["pnl_usd"] or 0)

    # Emotional state performance
    emotion_pnl = {}
    for t in week_trades:
        em = t.get("emotional_state", "unknown")
        emotion_pnl[em] = emotion_pnl.get(em, 0) + (t["pnl_usd"] or 0)

    report = f"""
WEEKLY TRADING REVIEW — Week of {datetime.now().strftime('%Y-%m-%d')}
{'='*55}

SUMMARY:
Total trades: {len(week_trades)} | Wins: {len(wins)} | Losses: {len(losses)} | BE: {len(breakevens)}
Win rate: {win_rate:.1f}%
Total P&L: ${total_pnl:+,.2f}
Avg win: +{avg_win_r:.2f}R | Avg loss: {avg_loss_r:.2f}R
Expectancy per trade: {expectancy:+.3f}R
{'✅ Profitable week' if total_pnl > 0 else '❌ Losing week' if total_pnl < 0 else '➖ Breakeven week'}

SETUP PERFORMANCE:
{chr(10).join(f"  {st}: ${pnl:+.2f}" for st, pnl in sorted(setup_pnl.items(), key=lambda x: -x[1]))}

EMOTIONAL STATE PERFORMANCE:
{chr(10).join(f"  {em}: ${pnl:+.2f}" for em, pnl in sorted(emotion_pnl.items(), key=lambda x: -x[1]))}

RULE COMPLIANCE:
Trades following rules: {sum(1 for t in week_trades if t.get("followed_rules", True))}/{len(week_trades)}

LESSONS FROM THIS WEEK:
{chr(10).join(f"  • [{t['id']}] {t.get('lesson', 'No lesson recorded')}" for t in week_trades if t.get('lesson'))}

QUESTIONS TO ANSWER:
□ What was my best trade and why?
□ What was my worst trade and why?
□ Did I follow my rules? Where did I deviate?
□ What emotional patterns affected my trading?
□ What one thing will I improve next week?
"""
    print(report)
    
    # Save review
    REVIEWS_DIR.mkdir(parents=True, exist_ok=True)
    review_file = REVIEWS_DIR / f"weekly-{datetime.now().strftime('%Y-%W')}.md"
    review_file.write_text(report)
    print(f"Review saved: {review_file}")

if __name__ == "__main__":
    weekly_review()
