# Piper API Documentation for Dashboards

**Generated:** 2026-03-13  
**Server:** Amajungle Dashboard (port 8789)

---

## Overview

Piper's data is now fully exposed via REST API endpoints for both dashboards:
- **Command Center** (port 8888) - Can proxy/fetch from these endpoints
- **Amajungle Dashboard** (port 8789) - Native endpoints

---

## API Endpoints

### 1. Main Dashboard Endpoint
**GET** `/api/piper/dashboard`

Returns complete dashboard data including all metrics.

```json
{
  "timestamp": "2026-03-13T06:19:23.814Z",
  "email_campaigns": {
    "total_sent": 88,
    "sent_today": 0,
    "sent_last_7_days": 88,
    "sent_last_30_days": 88,
    "score_distribution": {
      "0-30": 6,
      "31-50": 37,
      "51-70": 34,
      "71-85": 11,
      "86-100": 0
    },
    "average_score": 49.7,
    "recent_emails": [...]
  },
  "lead_pipeline": {
    "stages": [...],
    "status_counts": [...],
    "pipeline_value": 11135.90,
    "won_value": 0,
    "total_contacts": 4,
    "recent_conversions": [...],
    "lead_scores": [
      {"category": "VIP", "count": 0},
      {"category": "Hot", "count": 0},
      {"category": "Warm", "count": 4},
      {"category": "Cold", "count": 0}
    ]
  },
  "active_campaigns": {
    "active_campaigns": 0,
    "campaigns": []
  },
  "revenue": {
    "total_won": 0,
    "total_deals_won": 0,
    "pipeline_value": 11135.90,
    "avg_deal_size": 0,
    "conversion_rate": 0,
    "recent_wins": []
  }
}
```

---

### 2. Email Campaign Metrics
**GET** `/api/piper/email-metrics`

```json
{
  "timestamp": "2026-03-13T06:19:34.088Z",
  "total_sent": 88,
  "sent_today": 0,
  "sent_last_7_days": 88,
  "sent_last_30_days": 88,
  "score_distribution": {
    "0-30": 6,      // Poor (6 emails)
    "31-50": 37,    // Fair (37 emails)
    "51-70": 34,    // Good (34 emails)
    "71-85": 11,    // Very Good (11 emails)
    "86-100": 0     // Excellent (0 emails)
  },
  "average_score": 49.7,
  "recent_emails": [
    {
      "id": "audit_audit_20260312_122018_B0F854GHFB",
      "client_name": "Darwin",
      "client_email": "darwin13q91@gmail.com",
      "score": 50,
      "sent_at": "2026-03-12T12:20:32.647315",
      "store_url": "www.amazon.com"
    }
  ]
}
```

**Use for:**
- Email campaign performance charts
- Score distribution visualization
- Recent activity feed

---

### 3. Lead Pipeline
**GET** `/api/piper/pipeline`

```json
{
  "timestamp": "2026-03-13T06:19:34.157Z",
  "stages": [
    {"stage": "new_lead", "count": 19, "total_value": 11135.90}
  ],
  "status_counts": [
    {"status": "lead", "count": 4}
  ],
  "pipeline_value": 11135.90,
  "won_value": 0,
  "total_contacts": 4,
  "recent_conversions": [],
  "lead_scores": [
    {"category": "VIP", "count": 0},
    {"category": "Hot", "count": 0},
    {"category": "Warm", "count": 4},
    {"category": "Cold", "count": 0}
  ]
}
```

**Use for:**
- Pipeline stage visualization
- Revenue forecasting
- Contact count by status

---

### 4. Lead Scores
**GET** `/api/piper/lead-scores`

```json
{
  "timestamp": "2026-03-13T06:19:34.208Z",
  "lead_scores": [
    {"category": "VIP", "count": 0},
    {"category": "Hot", "count": 0},
    {"category": "Warm", "count": 4},
    {"category": "Cold", "count": 0}
  ],
  "total_contacts": 4
}
```

**Use for:**
- Lead scoring visualization (pie/donut chart)
- Priority contact filtering

**Scoring Logic:**
- **VIP** (priority_level = 0): Highest priority clients
- **Hot** (priority_level = 1): Ready to close
- **Warm** (priority_level = 2): Engaged leads
- **Cold** (priority_level = 3): New/unengaged leads

---

### 5. Revenue Metrics
**GET** `/api/piper/revenue`

```json
{
  "timestamp": "2026-03-13T06:19:34.259Z",
  "total_won": 0,
  "total_deals_won": 0,
  "pipeline_value": 11135.90,
  "avg_deal_size": 0,
  "conversion_rate": 0,
  "recent_wins": []
}
```

**Use for:**
- Revenue dashboard
- Pipeline vs closed comparison
- Conversion rate tracking

---

### 6. Active Campaigns
**GET** `/api/piper/campaigns`

```json
{
  "timestamp": "2026-03-13T06:19:34.307Z",
  "active_campaigns": 0,
  "campaigns": []
}
```

**Use for:**
- Active sequence tracking
- Campaign status overview

---

### 7. Recent Conversions
**GET** `/api/piper/conversions`

```json
{
  "timestamp": "2026-03-13T06:19:34.356Z",
  "recent_conversions": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "company": "Acme Inc",
      "status": "qualified",
      "source": "echo_form",
      "converted_at": "2026-03-12T10:30:00Z",
      "deal_value": 997
    }
  ]
}
```

**Use for:**
- Recent wins feed
- Conversion tracking
- Sales activity log

---

## CRM Endpoints (Existing)

### Contacts
- **GET** `/api/crm/contacts` - List all contacts
- **GET** `/api/crm/contacts?status=lead` - Filter by status
- **GET** `/api/crm/contacts?search=keyword` - Search
- **POST** `/api/crm/contacts` - Create contact
- **GET** `/api/crm/contacts/:id` - Get single contact
- **PUT** `/api/crm/contacts/:id` - Update contact
- **DELETE** `/api/crm/contacts/:id` - Delete contact

### Deals
- **GET** `/api/crm/deals` - List all deals
- **GET** `/api/crm/deals?stage=new_lead` - Filter by stage
- **POST** `/api/crm/deals` - Create deal
- **PUT** `/api/crm/deals/:id` - Update deal
- **POST** `/api/crm/deals/:id/stage` - Move deal stage

### Stats
- **GET** `/api/crm/stats` - Full CRM statistics
- **GET** `/api/crm/pipeline` - Pipeline summary

---

## Data Flow for Dashboards

### Command Center (Port 8888)
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Command Center │────▶│  Proxy/API Call  │────▶│  Dashboard API  │
│    (Port 8888)  │     │  (Port 8789)     │     │  (Port 8789)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │                           │
                              ▼                           ▼
                        ┌──────────┐               ┌──────────┐
                        │  Piper   │               │   CRM    │
                        │  Data    │               │  (SQLite)│
                        │  (JSON)  │               └──────────┘
                        └──────────┘
```

### Amajungle Dashboard (Port 8789)
Native access to all Piper endpoints directly.

---

## Sample Frontend Integration

### Fetching Dashboard Data
```javascript
// Fetch all Piper data
const response = await fetch('http://localhost:8789/api/piper/dashboard');
const data = await response.json();

// Access specific sections
const emailMetrics = data.email_campaigns;
const pipeline = data.lead_pipeline;
const revenue = data.revenue;
```

### Lead Score Chart (Chart.js example)
```javascript
const leadScores = await fetch('/api/piper/lead-scores').then(r => r.json());

new Chart(ctx, {
  type: 'doughnut',
  data: {
    labels: leadScores.lead_scores.map(s => s.category),
    datasets: [{
      data: leadScores.lead_scores.map(s => s.count),
      backgroundColor: ['#gold', '#red', '#orange', '#blue']
    }]
  }
});
```

### Email Score Distribution (Bar Chart)
```javascript
const metrics = await fetch('/api/piper/email-metrics').then(r => r.json());
const distribution = metrics.score_distribution;

new Chart(ctx, {
  type: 'bar',
  data: {
    labels: Object.keys(distribution),
    datasets: [{
      label: 'Emails Sent',
      data: Object.values(distribution)
    }]
  }
});
```

---

## Notes for Atlas

1. **All endpoints return JSON** with a `timestamp` field
2. **CORS enabled** - Can be called from any origin
3. **Graceful degradation** - Returns empty arrays/zeros if no data
4. **Schema-agnostic** - Works with both old and new CRM schemas
5. **Real-time data** - Fetches from live Piper data files and CRM database

### Data Refresh Strategy
- Email metrics: Real-time (reads from JSON files)
- Pipeline/CRM: Real-time (reads from SQLite)
- Recommended refresh: Every 30-60 seconds for live feel

### Error Handling
All endpoints return 500 status with error message on failure:
```json
{"error": "Database connection failed"}
```

---

## Current Data Snapshot (2026-03-13)

| Metric | Value |
|--------|-------|
| Total Emails Sent | 88 |
| Active Contacts | 4 |
| Pipeline Value | $11,135.90 |
| Won Revenue | $0 |
| Avg Email Score | 49.7/100 |
| Lead Distribution | 100% Warm |

---

**Contact:** Piper (Email Manager)  
**File Location:** `/home/darwin/.openclaw/workspace/apps/dashboard/server/piper-api.js`
