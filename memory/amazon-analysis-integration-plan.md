# Real Amazon Store Analysis - Integration Plan

**Date:** March 6, 2026  
**Status:** Research Phase  
**Goal:** Replace simulated analysis with real Amazon data

---

## Current State (Simulated)
- Random findings from template pool
- Hash-based "variety" 
- No actual Amazon data
- Score: Random (43-78)

## Target State (Real Data)
- Actual product listings
- Real competitor pricing
- Live review data
- Inventory status
- SEO/keyword rankings

---

## Integration Options

### Option 1: Keepa API ⭐ RECOMMENDED
**What:** Historical Amazon data API  
**Data Available:**
- Price history
- Sales rank (BSR)
- Review counts
- Inventory levels
- Buy Box status
- Product variations

**Pricing:**
- Free tier: 100 requests/day
- Paid: €19/month (10,000 requests/day)

**Pros:**
- ✅ Reliable, established API
- ✅ Historical data
- ✅ No scraping needed
- ✅ Fast response times

**Cons:**
- ❌ Requires API key
- ❌ Limited to data Keepa tracks
- ❌ No live keyword rankings

**Implementation:**
```python
import requests

def get_keepa_data(asin):
    api_key = "YOUR_KEEPA_API_KEY"
    url = f"https://api.keepa.com/product?key={api_key}&domain=1&asin={asin}"
    response = requests.get(url)
    return response.json()
```

---

### Option 2: Amazon Product Advertising API (PA API)
**What:** Official Amazon API for affiliates  
**Data Available:**
- Product details
- Prices
- Images
- Reviews (limited)
- Search results

**Pricing:**
- Free with Amazon Associates account
- Rate limits apply

**Pros:**
- ✅ Official Amazon API
- ✅ Real-time data
- ✅ Free

**Cons:**
- ❌ Requires Amazon Associates approval
- ❌ Limited endpoints
- ❌ No BSR/historical data
- ❌ No competitor analysis

---

### Option 3: Helium 10 / Jungle Scout APIs
**What:** Third-party Amazon seller tools  
**Data Available:**
- Keyword rankings
- Competitor analysis
- Product research
- Listing optimization scores

**Pricing:**
- Helium 10: $39-279/month
- Jungle Scout: $49-129/month

**Pros:**
- ✅ Comprehensive data
- ✅ Seller-focused metrics
- ✅ Keyword research

**Cons:**
- ❌ Expensive
- ❌ API access often enterprise-only
- ❌ Rate limits

---

### Option 4: Web Scraping (Selenium/Playwright)
**What:** Direct Amazon page scraping  
**Data Available:**
- Anything visible on page
- Live prices
- Review text
- Search rankings
- Buy Box status

**Pricing:**
- Free (infrastructure costs only)

**Pros:**
- ✅ Most comprehensive
- ✅ Real-time data
- ✅ No API limits

**Cons:**
- ❌ Violates Amazon ToS (risk of blocking)
- ❌ Requires proxy rotation
- ❌ Fragile (breaks when Amazon changes layout)
- ❌ Slow
- ❌ Legal grey area

**Not recommended for production**

---

## Recommended Implementation: Keepa API

### Phase 1: Basic Integration (Week 1)

**1. Sign up for Keepa API key**
- Register at keepa.com
- Get API token

**2. Update River analyzer:**
```python
# /agents/river/scripts/store_analyzer.py

import requests
import os

KEEPA_API_KEY = os.environ.get('KEEPA_API_KEY', '')

def get_asin_from_url(store_url):
    """Extract ASIN from Amazon URL"""
    # Handle /dp/ASIN format
    match = re.search(r'/dp/([A-Z0-9]{10})', store_url)
    if match:
        return match.group(1)
    # Handle /gp/product/ASIN format  
    match = re.search(r'/gp/product/([A-Z0-9]{10})', store_url)
    if match:
        return match.group(1)
    return None

def fetch_keepa_data(asin):
    """Fetch real Amazon data from Keepa"""
    if not KEEPA_API_KEY:
        log("⚠️ No Keepa API key, using simulated data")
        return None
    
    url = f"https://api.keepa.com/product"
    params = {
        'key': KEEPA_API_KEY,
        'domain': '1',  # US Amazon
        'asin': asin,
        'stats': '90'  # 90 days of stats
    }
    
    try:
        response = requests.get(url, params=params, timeout=30)
        if response.status_code == 200:
            return response.json()
        else:
            log(f"⚠️ Keepa API error: {response.status_code}")
            return None
    except Exception as e:
        log(f"⚠️ Keepa request failed: {e}")
        return None

def analyze_with_keepa(store_url):
    """Analyze store using real Keepa data"""
    asin = get_asin_from_url(store_url)
    if not asin:
        log("⚠️ Could not extract ASIN, using simulated analysis")
        return generate_simulated_analysis(store_url)
    
    data = fetch_keepa_data(asin)
    if not data or 'products' not in data or not data['products']:
        log("⚠️ No Keepa data available, using simulated analysis")
        return generate_simulated_analysis(store_url)
    
    product = data['products'][0]
    
    # Extract real metrics
    findings = []
    
    # Check reviews
    if 'csv' in product:
        review_count = product.get('csv', [0])[0] if product.get('csv') else 0
        if review_count < 50:
            findings.append({
                'category': 'Reviews',
                'issue': f'Low review count ({review_count} reviews)',
                'severity': 'high'
            })
    
    # Check BSR (Best Seller Rank)
    if 'stats' in product:
        stats = product['stats']
        current_bsr = stats.get('current', [0, 0, 0])[2]  # BSR is 3rd element
        if current_bsr > 100000:
            findings.append({
                'category': 'Sales Rank',
                'issue': f'High BSR ({current_bsr:,}) - low sales velocity',
                'severity': 'medium'
            })
    
    # Check price history for competitiveness
    if 'stats' in product and 'avg90' in product['stats']:
        avg_price = product['stats']['avg90'][0]
        current_price = product['stats']['current'][0]
        if current_price > avg_price * 1.2:
            findings.append({
                'category': 'Pricing',
                'issue': f'Price ${current_price/100:.2f} is 20% above 90-day average',
                'severity': 'medium'
            })
    
    # If no specific findings, add generic ones based on data quality
    if not findings:
        findings = generate_generic_findings(product)
    
    # Calculate score based on data
    score = calculate_real_score(product, findings)
    
    return {
        'store_url': store_url,
        'store_id': asin,
        'findings': findings,
        'recommendations': generate_recommendations(findings),
        'overall_score': score,
        'analyzed_at': datetime.now().isoformat(),
        'data_source': 'keepa_api',  # Mark as real data
        'product_data': {
            'title': product.get('title', 'Unknown'),
            'brand': product.get('brand', 'Unknown'),
            'current_price': product.get('stats', {}).get('current', [0])[0] / 100 if product.get('stats') else 0,
            'review_count': product.get('csv', [0])[0] if product.get('csv') else 0,
        }
    }
```

**3. Add API key to environment:**
```bash
# Add to ~/.openclaw/workspace/.env
KEEPA_API_KEY=your_actual_keepa_api_key_here
```

**4. Update Piper email template to show data source:**
```
Hi {first_name},

Thanks for your audit request! I analyzed your Amazon store using real-time market data:

🔍 Key Findings (from actual Amazon data):
...

📊 Store Score: {score}/100
Data source: Keepa API (real Amazon data)
```

---

### Phase 2: Advanced Analysis (Week 2-3)

**Add more metrics:**
- Price history charts
- Competitor comparison
- Review sentiment analysis
- Inventory tracking
- Keyword suggestions

**Integration:**
- Jungle Scout API for keywords
- Review scraping for sentiment
- Competitor ASIN comparison

---

### Phase 3: Automation & Monitoring (Week 4)

**Continuous monitoring:**
- Daily price tracking
- Review alerts
- Competitor changes
- Buy Box notifications

---

## Cost Estimate

| Component | Monthly Cost |
|-----------|--------------|
| Keepa API | €19 (~$21) |
| Server (existing) | $0 |
| **Total** | **~$21/month** |

---

## Next Steps

1. **Sign up for Keepa API key**
2. **Implement Phase 1 (basic integration)**
3. **Test with real Amazon URLs**
4. **Update email templates**
5. **Deploy and monitor**

---

## Files to Modify

| File | Changes |
|------|---------|
| `/agents/river/scripts/store_analyzer.py` | Add Keepa API integration |
| `/.env` | Add KEEPA_API_KEY |
| `/agents/piper/scripts/audit_handler.py` | Update email template with data source |

---

*Document created: March 6, 2026*  
*Status: Ready for implementation*
