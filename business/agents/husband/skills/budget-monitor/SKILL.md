# Skill: budget-monitor

## Purpose
Track expenses and guard the $1,800/month budget like a hawk.

## Capabilities

- Log expenses with category
- Show current month spending
- Alert on unusual spending
- Track subscriptions
- Flag approaching budget limit

## Commands

```bash
# Log an expense
budget log $40 "Coffee" --category food

# Check status
budget status           # Current month overview
budget status --detail  # Breakdown by category

# List subscriptions
budget subscriptions

# Set alert threshold
budget alert --when 80%  # Alert at 80% of budget
```

## Data Storage

File: `data/budget.json`

```json
{
  "monthly_budget": 1800,
  "alert_threshold": 80,
  "current_month": {
    "total_spent": 1240,
    "remaining": 560,
    "categories": {
      "food": 340,
      "subscriptions": 87,
      "tools": 150,
      "misc": 663
    }
  },
  "subscriptions": [
    {"name": "OpenAI", "cost": 20, "frequency": "monthly"},
    {"name": "DigitalOcean", "cost": 24, "frequency": "monthly"}
  ]
}
```

## Response Format

**Logging expense:**
```
💸 Logged: $40.00 — Coffee
Category: Food
Remaining budget: $560.00 (31% left)
```

**Status check:**
```
💰 March Budget Status
Spent: $1,240 of $1,800 (69%)
Remaining: $560 (12 days left)

By Category:
- Misc: $663 (37%) 🔴 largest
- Food: $340 (19%)
- Tools: $150 (8%)
- Subscriptions: $87 (5%)

⚠️ At this pace, you'll exceed budget by $240
```

## Automated Checks

**Weekly (Sundays):**
- Calculate spending rate vs budget
- Flag if on track to exceed

**When logging expense:**
- Check if category is over typical amount
- Alert if monthly total > 80% threshold

**Monthly (1st of month):**
- Archive previous month
- Check for subscription changes
- Reset counters

## Subscription Creep Alert

Monthly audit:
```
📊 Subscription Audit
Total monthly: $87
- OpenAI: $20
- DigitalOcean: $24
- [other subscriptions]

Unchanged since last month ✅
```
