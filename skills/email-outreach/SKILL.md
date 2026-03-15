---
name: email-outreach
description: Automated B2B email outreach system for amajungle with campaign tracking, segmentation, and follow-up management
---

# Email Outreach

Automated email outreach system for amajungle — B2B cold email campaigns with tracking and follow-ups.

## When to Use

- Sending cold outreach emails to B2B prospects
- Following up on previous email campaigns
- Tracking email performance (opens, replies, conversions)
- Managing segmented email lists

## Requirements

- PrivateEmail credentials configured in `.env`
- CSV contact list with: Name, Email, Company, Store_URL, Revenue, SKU_Count
- Helium 10 or similar B2B data source (legally obtained)

## Usage

### 1. Load Contact List

Upload CSV to workspace first. Format:
```csv
name,email,company,store_url,revenue,sku_count,category
John Doe,john@store.com,ABC Store,https://amazon.com/shops/abc,50000,150,electronics
```

### 2. Segment Contacts

```bash
# By revenue (high-value sellers)
python3 skills/email-outreach/scripts/segment.py \
  --csv contacts.csv \
  --revenue-min 50000 \
  --output high_value.csv

# By SKU count (complex operations)
python3 skills/email-outreach/scripts/segment.py \
  --csv contacts.csv \
  --skus-min 100 \
  --output complex_ops.csv

# By category
python3 skills/email-outreach/scripts/segment.py \
  --csv contacts.csv \
  --category "electronics" \
  --output electronics.csv
```

### 3. Send Campaign

```bash
# Test batch (dry run)
python3 skills/email-outreach/scripts/send_campaign.py \
  --csv high_value.csv \
  --template initial_outreach \
  --from hello \
  --limit 10 \
  --dry-run

# Live send
python3 skills/email-outreach/scripts/send_campaign.py \
  --csv high_value.csv \
  --template initial_outreach \
  --from hello \
  --limit 50 \
  --subject "Quick question about {{company}}'s Amazon operations"
```

### 4. Track Results

```bash
# View campaign stats
python3 skills/email-outreach/scripts/stats.py \
  --campaign campaign_2026_03_05_1430
```

## Templates

### initial_outreach
First contact email referencing their store, SKU count, and offering value.

### follow_up_1
3-day follow-up for non-responders.

### follow_up_2
7-day final follow-up.

## Tracking Metrics

| Metric | Description |
|--------|-------------|
| Sent | Emails successfully delivered |
| Failed | Bounces or errors |
| Replies | Manual responses |
| Meetings | Calls booked |
| Conversions | Clients signed |

## Best Practices

1. **Start small**: Test 10-20 emails first
2. **Segment**: Different message for different seller sizes
3. **Personalize**: Use store name, SKU count, category
4. **Follow up**: 2-3 touches max
5. **Track everything**: Log all results
6. **Respect opt-outs**: Remove unsubscribes immediately

## Compliance

- B2B outreach only
- Legally obtained contact data
- Clear opt-out in every email
- Honest about source of contact info

## Files

- `templates/` — Email templates
- `scripts/` — Python automation
- `results/` — Campaign tracking data
