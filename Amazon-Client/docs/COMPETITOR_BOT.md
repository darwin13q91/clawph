# Amazon-Client Competitor-Bot Documentation

## Overview

The Competitor-Bot is an automated pricing intelligence agent that monitors competitor prices on Amazon and executes automated repricing strategies to maximize Buy Box win rate while maintaining profit margins.

---

## How It Tracks Competitor Prices

### 1. Data Collection Methods

#### ASIN-Based Monitoring
The bot tracks specific ASINs (Amazon Standard Identification Numbers) that the client is selling:

```
Input: Client's product catalog (ASINs + Seller SKUs)
Process: Query SP-API Pricing endpoints
Output: Competitor price data every 15-60 minutes
```

#### Key SP-API Endpoints Used
- `getCompetitivePricing` - Get lowest prices and Buy Box winners
- `getItemOffers` - Get all offers for an ASIN
- `getListingOffers` - Get Buy Box eligible offers

### 2. Tracking Frequency by Tier

| Tier | Check Frequency | ASINs Tracked | Competitors/ASIN |
|------|-----------------|---------------|------------------|
| Starter | Manual only | N/A | N/A |
| Growth | Every 60 min | Up to 100 | Top 10 |
| Pro | Every 30 min | Up to 500 | Top 20 |
| Enterprise | Every 15 min | Up to 2000 | All visible |

### 3. Data Points Collected

For each competitor offer, the bot captures:
- **Price**: Listing price + shipping
- **Condition**: New, Used, Like New, etc.
- **Fulfillment**: FBA (Fulfillment by Amazon) vs FBM (Fulfillment by Merchant)
- **Rating**: Seller rating percentage
- **Feedback Count**: Total customer feedback
- **Delivery Promise**: Estimated delivery date
- **IsBuyBoxWinner**: Whether this offer currently holds the Buy Box

### 4. Competitor Identification

```javascript
// Competitor matching logic
function identifyCompetitors(offers, clientSellerId) {
  return offers.filter(offer => 
    offer.SellerId !== clientSellerId &&
    offer.IsFulfilledByAmazon === true && // Focus on FBA competitors
    offer.SellerFeedbackRating >= 90 // Filter out low-rated sellers
  );
}
```

---

## Automated Repricing Strategy

### 1. Repricing Rules Engine

The bot uses a configurable rules-based engine:

#### Rule Types

**a) Buy Box Target**
- Goal: Win the Buy Box
- Strategy: Match or slightly undercut current Buy Box price
- Constraint: Never go below minimum profit margin

**b) Lowest Price Target**
- Goal: Be the lowest price (not necessarily Buy Box)
- Strategy: Undercut lowest competitor by configured amount
- Risk: May trigger price wars

**c) Position Target**
- Goal: Maintain specific position (e.g., 2nd lowest)
- Strategy: Price relative to position
- Benefit: Balanced visibility and margin

**d) MAP Compliance**
- Goal: Maintain Minimum Advertised Price
- Strategy: Never price below MAP, match if competitors violate
- Use case: Brand compliance

### 2. Repricing Algorithm

```
FUNCTION CalculateNewPrice(product, strategy):
    
    currentPrice = product.ourPrice
    minPrice = product.minPrice  // Cost + min margin
    maxPrice = product.maxPrice  // Ceiling
    
    // Get competitor data
    buyBoxPrice = product.competitors.buyBox?.price
    lowestPrice = product.competitors.lowest?.price
    
    // Calculate target based on strategy
    SWITCH strategy.type:
        CASE "buy_box":
            IF buyBoxPrice EXISTS:
                target = buyBoxPrice - strategy.undercut
            ELSE:
                target = lowestPrice - strategy.undercut
                
        CASE "lowest":
            target = lowestPrice - strategy.undercut
            
        CASE "position":
            sortedPrices = SORT(product.competitors.prices)
            target = sortedPrices[strategy.position] - strategy.offset
    
    // Apply constraints
    newPrice = CLAMP(target, minPrice, maxPrice)
    
    // Round to Amazon's pricing format (2 decimals)
    newPrice = ROUND(newPrice, 2)
    
    RETURN {
        newPrice: newPrice,
        oldPrice: currentPrice,
        changed: ABS(newPrice - currentPrice) > 0.01,
        reason: strategy.type,
        competitorPrice: buyBoxPrice || lowestPrice
    }
END FUNCTION
```

### 3. Price Change Thresholds

To avoid excessive price changes:
- Minimum change: $0.05 or 0.5% (whichever is greater)
- Maximum changes per day: 10 per SKU
- Cooldown period: 15 minutes between changes

### 4. Profit Protection

```javascript
// Margin protection
const calculateMinPrice = (cost, fees, minMarginPercent) => {
  const totalCost = cost + fees.amazonFee + fees.fbaFee;
  const minPrice = totalCost / (1 - minMarginPercent / 100);
  return Math.ceil(minPrice * 100) / 100; // Round up
};

// FBA fee calculator integration
const estimateFees = async (asin, price) => {
  // Use SP-API fees estimate endpoint
  const fees = await spApi.getFeesEstimate(asin, price);
  return fees;
};
```

---

## Alert System for Price Changes

### 1. Alert Types

| Alert | Trigger | Priority | Channel |
|-------|---------|----------|---------|
| Price Drop Alert | Competitor drops price > 10% | High | Email + Webhook |
| Buy Box Lost | No longer Buy Box winner | Critical | SMS + Email + Webhook |
| New Competitor | New seller on ASIN | Medium | Dashboard + Webhook |
| MAP Violation | Competitor below MAP | High | Email + Webhook |
| Price Floor Hit | Our price at minimum | Medium | Dashboard |
| Repricing Error | Failed to update price | Critical | SMS + Email |

### 2. Alert Configuration

```json
{
  "alerts": {
    "priceDrop": {
      "enabled": true,
      "threshold": 10,
      "thresholdType": "percent",
      "cooldownMinutes": 60
    },
    "buyBoxLost": {
      "enabled": true,
      "consecutiveChecks": 2,
      "channels": ["email", "sms", "webhook"]
    },
    "newCompetitor": {
      "enabled": true,
      "minFeedbackCount": 100,
      "channels": ["webhook"]
    }
  }
}
```

### 3. Webhook Payload Format

```json
{
  "event": "price_alert",
  "timestamp": "2025-01-15T10:30:00Z",
  "clientId": "client-001",
  "alertType": "buy_box_lost",
  "priority": "critical",
  "data": {
    "asin": "B08N5WRWNW",
    "sku": "PROD-12345",
    "productName": "Wireless Headphones",
    "ourPrice": 29.99,
    "competitorPrice": 27.99,
    "buyBoxWinner": "SELLER-XYZ",
    "previousBuyBoxWinner": "US",
    "lostAt": "2025-01-15T10:25:00Z"
  }
}
```

### 4. Notification Channels

#### Email Notifications
- Daily summary: All price changes, Buy Box win rate
- Immediate alerts: Critical events only
- Weekly report: Performance analytics

#### SMS/Push Notifications
- Buy Box lost on high-value products
- System errors affecting repricing

#### Webhook Integration
```
POST https://client-domain.com/amazon/alerts
Headers:
  X-AC-Signature: sha256=abc123... (HMAC verification)
  Content-Type: application/json
```

---

## Configuration Example

### Client Configuration File

```json
{
  "competitorTracking": {
    "enabled": true,
    "checkIntervalMinutes": 30,
    "trackedAsins": ["B08N5WRWNW", "B08N5M7S6K"],
    "maxCompetitorsPerAsin": 10
  },
  "repricingRules": [
    {
      "name": "Standard FBA",
      "condition": " fulfillment == 'FBA' ",
      "strategy": "buy_box",
      "undercut": 0.01,
      "minMarginPercent": 15,
      "maxChangesPerDay": 10
    },
    {
      "name": "Low Stock",
      "condition": "inventory < 10",
      "strategy": "position",
      "position": 2,
      "offset": 0.50
    }
  ],
  "alerts": {
    "email": "owner@business.com",
    "webhookUrl": "https://business.com/api/amazon-alerts",
    "webhookSecret": "whsec_..."
  }
}
```

---

## Performance Metrics

The bot tracks and reports:

1. **Buy Box Win Rate** - Percentage of ASINs with Buy Box
2. **Average Position** - Average price position vs competitors
3. **Price Change Count** - Number of repricing actions
4. **Margin Protection** - Incidents of price floor enforcement
5. **Response Time** - Average time to react to competitor changes

---

## Best Practices

1. **Start Conservative**: Begin with manual review mode before auto-repricing
2. **Set Floor Prices**: Always configure minimum prices to protect margins
3. **Monitor MAP**: Ensure compliance with supplier pricing agreements
4. **Review Weekly**: Analyze repricing effectiveness and adjust strategies
5. **Test Changes**: Use A/B testing for different repricing approaches

---

## Troubleshooting

### Common Issues

**Issue**: Prices not updating
- Check SP-API credentials are valid
- Verify rate limits not exceeded
- Confirm product has "offers" permission

**Issue**: Losing Buy Box despite lowest price
- Check seller metrics (rating, shipping time)
- Verify FBA vs FBM status
- Review product condition matching

**Issue**: Too many price changes
- Increase minimum change threshold
- Add longer cooldown periods
- Review competitor volatility
