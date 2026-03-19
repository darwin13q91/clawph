# Skill: Market Scanner

General market research and competitive intelligence tool. Originally for Polymarket, now repurposed for business market analysis.

## What It Does

1. **Market Research** - Track market trends and opportunities
2. **Competitor Monitoring** - Watch competitor pricing and positioning  
3. **Trend Analysis** - Identify emerging patterns in your industry
4. **Data Collection** - Gather market data from various sources

## Current Capabilities

- Polymarket API (for prediction market trends - optional)
- Helium 10 data analysis (Amazon market research)
- Web scraping for competitor data
- Google Sheets integration for tracking

## Tools

- `scan_markets(source: str) -> list[dict]` - Scan markets from specified source
- `analyze_trends(data: list) -> dict` - Analyze patterns in data
- `log_research(findings: dict, sheet_id: str)` - Log to Google Sheets
- `competitor_watch(url: str) -> dict` - Monitor competitor changes

## Configuration

Set in your `.env`:
```
# For Google Sheets logging
GOOGLE_SHEETS_CREDENTIALS_JSON=~/.openclaw/secrets/gsheets-creds.json
SCANNER_SHEET_ID=your_google_sheet_id

# For Helium 10 (Amazon research)
HELIUM10_API_KEY=your_key

# For Polymarket (optional - trend analysis only)
POLYMARKET_API_KEY=your_key
```

## Usage Examples

```python
from market_scanner import scan_markets, analyze_trends

# Amazon market research via Helium 10
amazon_data = scan_markets(source="helium10", category="electronics")
trends = analyze_trends(amazon_data)

# Competitor monitoring
competitor = competitor_watch("https://competitor-store.com")

# Log findings
log_research(trends, sheet_id="your_sheet_id")
```

## Repurposed From
Originally a Polymarket trading scanner. Now focused on business intelligence and market research for amajungle.

## Security Note
No trading capabilities. Read-only market research only.
