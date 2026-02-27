# Agent: Inventory Monitor

Monitors Amazon FBA/FBM inventory levels and alerts on low stock.

## Capabilities

- Track inventory levels across all SKUs
- Alert when stock below threshold
- Predict stockout dates
- Suggest reorder quantities
- Monitor inbound shipments

## Configuration

```yaml
agent:
  name: "Inventory Monitor"
  id: inventory-bot
  
inventory:
  check_interval: 30  # minutes
  low_stock_threshold: 20  # units
  critical_threshold: 5   # units
  
alerts:
  channels:
    - telegram
    - email
  
  templates:
    low_stock: "⚠️ LOW STOCK: {sku} has {quantity} units left. Reorder suggested."
    critical: "🚨 CRITICAL: {sku} has {quantity} units! Stockout imminent!"
    stockout: "❌ STOCKOUT: {sku} is out of stock!"
```

## Skills Required

- seller-central-api
- inventory-monitor
- alert-notifier

## Data Sources

- Amazon Selling Partner API (FBA Inventory)
- Client SKU database
- Supplier lead times

## Example Alerts

**Low Stock:**
```
⚠️ LOW STOCK: B08N5WRWNW (Wireless Earbuds)
Current: 18 units | Threshold: 20
Suggested reorder: 200 units
Estimated stockout: 5 days
```

**Critical:**
```
🚨 CRITICAL: B08N5M7S6K (Phone Case)
Current: 3 units!
Last sale: 2 hours ago
Estimated stockout: TONIGHT
Action: Urgent reorder or pause ads
```

## API Endpoints Needed

- GET /fba/inventory/v1/summaries
- GET /sales/v1/orderMetrics
- GET /reports/2021-06-30/documents

## Reports

**Daily Inventory Report:**
- Total SKUs monitored
- Low stock count
- Critical stock count
- Estimated revenue at risk
- Recommended reorders
