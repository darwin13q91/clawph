# Amajungle Dashboard - Real-Time Audit Integration

## Overview
Real-time data monitoring for Amazon Store Audit service has been successfully integrated into the Amajungle Dashboard (port 8789).

## Features Implemented

### 1. Real-Time Data Section
- **Total Audits Counter**: Displays total completed audits
- **Today's Audits**: Shows audits completed today
- **Queue Status**: Displays pending audit requests
- **Conversion Rate**: Tracks email sent / audit completion ratio

### 2. Visual Indicators
- **Status Badges**: 
  - 🟢 Pipeline Active (normal operation)
  - 🟡 Warning (errors detected)
  - 🔴 Connection Error (API failure)
  
- **Score Distribution Bar**: Color-coded segments showing:
  - 🟢 Excellent (80-100)
  - 🔵 Good (60-79)
  - 🟡 Needs Work (40-59)
  - 🔴 Poor (<40)

- **Progress Bars**:
  - API usage tracker (RapidAPI rate limits)
  - Average processing time
  - Queue wait time estimate

- **Error Alerts**: Shows error count when pipeline issues detected

### 3. Live Updates
- **Polling**: 15-second interval for audit data
- **Queue Status**: 30-second interval
- **Server-Sent Events (SSE)**: Real-time stream at `/api/audits/stream`
- **Auto-refresh**: Timestamp shows last update time

### 4. Integration with River's Audit Framework
- Reads from `/home/darwin/.openclaw/agents/river/data/results/`
- Tracks Piper's email sends from `/home/darwin/.openclaw/agents/piper/data/sent/`
- Monitors pending jobs in River's jobs directory
- Calculates conversion metrics from actual data

## API Endpoints

| Endpoint | Description | Refresh Rate |
|----------|-------------|--------------|
| `GET /api/audits` | Full audit data (results, pending, sent, stats) | 15s |
| `GET /api/audits/stats` | Statistics only | 15s |
| `GET /api/audits/queue` | Queue status and processing times | 30s |
| `GET /api/audits/health` | Pipeline health check | On demand |
| `GET /api/audits/usage` | API usage tracking | On demand |
| `GET /api/audits/stream` | SSE real-time stream | Real-time |

## Current Stats (as of deploy)
```json
{
  "total_audits": 16,
  "today_audits": 16,
  "conversion_rate": 94,
  "avg_score": 47,
  "pending_jobs": 0,
  "errors": 1
}
```

## Mobile Responsive
- Grid adapts to 2 columns on tablets
- Single column on mobile devices
- Stats grid switches to 2x2 on mobile
- Touch-friendly interface

## Error Handling
- Graceful fallback when data directories missing
- Cached data served if live fetch fails
- Visual error indicators in dashboard
- Automatic retry on connection failures

## Files Modified/Created
1. `/server/audit-api.js` - New audit API module
2. `/server/index.js` - Updated to include audit routes
3. `/public/index.html` - Added audit dashboard section + JavaScript

## Running the Dashboard
```bash
cd /home/darwin/.openclaw/workspace/apps/dashboard
node server/index.js
```

Access at: http://localhost:8789

## Next Steps / Future Enhancements
1. Connect actual RapidAPI usage tracking (currently placeholder)
2. Add drill-down views for individual audit results
3. Add client conversion funnel visualization
4. Implement WebSocket for true real-time updates
5. Add audit quality scoring metrics
6. Export audit reports to CSV/PDF