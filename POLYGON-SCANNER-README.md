# Polymarket Paper Trading Scanner

A minimal market scanner for Polymarket that identifies trading opportunities WITHOUT risking real money.

## What This Does

✅ Scans Polymarket markets every 15 minutes  
✅ Filters for liquid, active markets  
✅ Logs opportunities to console + JSON file  
❌ **NO REAL TRADES** - paper trading only  

## Quick Start

```bash
# Run manually
python3 scan.py

# Check results
cat ~/.openclaw/data/scan.json

# View logs
tail -f ~/.openclaw/data/scan.log
```

## Filters Applied

| Filter | Value | Why |
|--------|-------|-----|
| Min Volume | $100 daily | Ensures some liquidity |
| Price Range | $0.05 - $0.95 | Skip decided markets |
| Resolution | 1-365 days | Reasonable time horizon |

## Output

Console shows top 10 opportunities by volume:
```
Market                                          YES    Vol      Days
----------------------------------------------------------------------
Will Bitcoin hit $100k in 2025?                $0.62 $523,411    45
Will Trump win 2024 election?                  $0.48 $412,832     2
...
```

JSON file contains full data for analysis.

## Validate Your Edge

Before risking real money, run this for **2-4 weeks** and track:

1. **Opportunity frequency** - How many signals per day?
2. **Price movement** - Do prices move in your predicted direction?
3. **Win rate** - What % of your "paper" predictions are correct?
4. **Expected value** - Average profit/loss per trade

Only after positive EV is confirmed should you consider live trading.

## Going Live (Future)

If you validate edge and want to trade live:

1. Increase bankroll to $1,000+ (recommended)
2. Get Polymarket API credentials
3. Set up Polygon wallet with USDC
4. Build order execution skill
5. Add risk management (position sizing, stop losses)

## Files

| File | Purpose |
|------|---------|
| `scan.py` | Main scanner script |
| `~/.openclaw/data/scan.json` | Latest scan results |
| `~/.openclaw/data/scan.log` | Historical scan logs |

## Cron Schedule

Runs automatically every 15 minutes:
```
*/15 * * * * python3 scan.py
```

## Disclaimer

This is for **educational purposes only**. Past performance does not guarantee future results. Prediction markets carry real financial risk. Never trade with money you cannot afford to lose.
