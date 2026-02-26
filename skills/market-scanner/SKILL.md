# Skill: Market Scanner

Scans Polymarket markets for trading opportunities. Paper trading only - logs opportunities to Google Sheets, no real orders.

## What It Does

1. Fetches all active Polymarket markets via Gamma API
2. Filters by: volume ≥ $1,000, spread ≤ $0.10, resolution 7-60 days
3. Identifies potential edges (price vs. estimated probability)
4. Logs opportunities to Google Sheets for tracking

## Tools

- `market_scan() -> list[dict]` - Scan all markets, return opportunities
- `market_details(market_id: str) -> dict` - Get detailed market info
- `log_opportunity(market: dict, sheet_id: str) -> dict` - Log to Google Sheets

## Configuration

Set in your `.env`:
```
GOOGLE_SHEETS_CREDENTIALS_JSON=~/.openclaw/secrets/gsheets-creds.json
SCANNER_SHEET_ID=your_google_sheet_id
```

## Usage

```python
from market_scanner import market_scan, log_opportunity

# Run scan
opportunities = market_scan(min_volume=1000, max_spread=0.10)

# Log each opportunity
for opp in opportunities[:5]:  # Top 5 only
    log_opportunity(opp, sheet_id="your_sheet_id")
```
