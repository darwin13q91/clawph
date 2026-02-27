# Agent: Pricing Optimizer

Monitors competitor prices and suggests dynamic pricing adjustments.

## Capabilities

- Track competitor prices
- Monitor Buy Box status
- Dynamic pricing rules
- Profit margin protection
- Price change alerts

## Pricing Strategies

### 1. Buy Box Hunter
```
Goal: Win Buy Box
Rule: Match lowest FBA price + $0.01
Min margin: 15%
Max price drop: 5%
```

### 2. Profit Maximizer
```
Goal: Maximize margin
Rule: Price at Buy Box + 2% if still competitive
Min margin: 20%
```

### 3. Aggressive Growth
```
Goal: Increase sales velocity
Rule: Match lowest price (even if breakeven)
Duration: 7 days
Purpose: Boost ranking
```

## Configuration

```yaml
agent:
  name: "Pricing Optimizer"
  id: pricing-bot

pricing:
  check_interval: 60  # minutes
  min_margin_percent: 15
  max_price_change_percent: 10
  
  strategies:
    - name: buy_box_hunter
      enabled: true
      priority: high
    - name: profit_maximizer
      enabled: true
      priority: medium

competitors:
  track_top: 10  # top 10 sellers per ASIN
  price_history_days: 30

alerts:
  buy_box_lost: true
  competitor_low_price: true
  margin_below_threshold: true
```

## Alerts

**Buy Box Lost:**
```
🔴 BUY BOX LOST: B08N5WRWNW
Your price: $29.99
Winner price: $28.99
Competitor: XYZ Store
Suggestion: Lower to $28.95
Impact: -5% margin but wins Buy Box
```

**Competitor Price Drop:**
```
📉 PRICE DROP ALERT
ASIN: B08N5WRWNW
Competitor: ABC Corp
Old price: $34.99 → New: $27.99 (-20%)
Your price: $29.99
Action: Consider matching or monitoring
```

## API Endpoints

- GET /products/pricing/v0/price
- GET /products/pricing/v0/competitivePrice
- GET /sellers/v1/marketplaceParticipations
- GET /reports/2021-06-30/documents

## Safety Guards

- Never price below cost + 10%
- Max 3 price changes per day per SKU
- Manual approval for drops > 10%
- Pause during Prime Day/holidays
