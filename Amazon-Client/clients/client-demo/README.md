# Client: Demo Corp (Example)

**Status:** Active  
**Tier:** Growth ($600/mo)  
**Start Date:** 2026-02-27

## Contact
- Primary: john@democorp.com
- Emergency: +1-555-0123
- Telegram: @democorp_admin

## Account Details
- Marketplace: US (ATVPDKIKX0DER)
- Monthly Revenue: ~$75k
- SKU Count: 42
- Primary Category: Electronics

## Agents Deployed

| Agent | Status | Purpose |
|-------|--------|---------|
| inventory-bot | 🟢 Active | Stock monitoring |
| pricing-bot | 🟢 Active | Buy Box optimization |
| review-bot | 🟢 Active | Review monitoring |
| analytics-bot | 🟡 Setup | Daily reports |

## Monitored SKUs

```
B08N5WRWNW - Wireless Earbuds (Hero product)
B08N5M7S6K - Phone Case Bundle
B08N5VNPTC - Bluetooth Speaker
... (39 more)
```

## Alert Configuration

**Critical (Immediate SMS):**
- Stockout on hero products
- Buy Box lost > 2 hours
- Account health drops below 200

**High (Telegram + Email):**
- Inventory < 20 units
- Competitor price drops 10%+
- 3+ star rating drops

**Medium (Email digest):**
- Daily sales reports
- Weekly competitor analysis

## Custom Rules

```yaml
# Pricing rules
pricing:
  hero_products:
    never_below_cost: true
    buy_box_priority: high
    max_discount: 10%
  
# Inventory rules  
inventory:
  hero_products:
    reorder_point: 50
    reorder_quantity: 500
  
# Review rules
reviews:
  auto_respond: false  # Manual approval required
  escalate_keywords: ["defective", "dangerous"]
```

## API Credentials

**Stored in:** `config/.env` (not committed to git)

```bash
AMAZON_ACCESS_KEY=AKIA...
AMAZON_SECRET_KEY=...
AMAZON_REFRESH_TOKEN=...
```

## Monthly Report

**Last Month (Jan 2026):**
- Revenue: $73,420 (+12% MoM)
- Stockouts prevented: 3
- Buy Box win rate: 87% (+5%)
- Reviews responded: 24
- Time saved: ~15 hours

**ROI:**
- Service cost: $600
- Value delivered: ~$8,000
- **ROI: 13.3x**

## Notes

- Client prefers Telegram over email
- Wants weekly calls every Monday
- Competitor ABC Electronics closely watched
- Planning Q2 product launch (new SKU)

---

This is a TEMPLATE. Copy this folder for each new client.
