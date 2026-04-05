# RapidAPI Integration Documentation

## Overview
RapidAPI Amazon Data API has been securely integrated into the OpenClaw Dashboard with backend proxy, rate limiting, and usage tracking.

## Configuration

### API Credentials (Secure)
- **Location:** `server/config/.env`
- **API Key:** Stored securely server-side (never exposed to frontend)
- **Host:** `real-time-amazon-data.p.rapidapi.com`
- **Plan:** Basic (Free Tier)

### Rate Limits
- **Daily:** 100 requests
- **Monthly:** 500 requests

## Endpoints

### Status Endpoint
```
GET /api/rapidapi/status
```
Returns current usage statistics and rate limit status.

### Proxy Endpoints
All Amazon API requests go through the secure backend proxy:

```
GET /api/rapidapi/amazon/search?query=<query>&category=<category>
GET /api/rapidapi/amazon/product?asin=<asin>&country=<country>
GET /api/rapidapi/amazon/reviews?asin=<asin>&page=<page>
GET /api/rapidapi/amazon/deals?category=<category>
GET /api/rapidapi/amazon/bestsellers?category=<category>
```

## Security Features

1. **Server-Side Only:** API key never exposed to frontend/browser
2. **Backend Proxy:** All requests proxied through dashboard server
3. **Rate Limiting:** Automatic tracking against free tier limits
4. **Error Handling:** Graceful degradation when limits are hit
5. **Request Logging:** All requests logged for monitoring

## Usage Tracking

Usage data is stored in `data/rapidapi_usage.json`:
- Total requests made
- Daily/Monthly counters
- Request history (last 1000)
- Error history (last 100)

## Status Codes

- `200` - Success
- `429` - Rate limit exceeded
- `404` - Unknown endpoint
- `405` - Method not allowed
- `500` - Server error
- `503` - API not configured

## Testing

Check status:
```bash
curl http://127.0.0.1:8789/api/rapidapi/status
```

Test search:
```bash
curl "http://127.0.0.1:8789/api/rapidapi/amazon/search?query=laptop&page=1"
```

## Files Modified/Created

1. `server/config/.env` - Secure API credentials
2. `server/rapidapi-proxy.js` - Proxy module with rate limiting
3. `server/index.js` - Integrated proxy handler
4. `start-detached.sh` - Updated to load environment variables
5. `RAPIDAPI_INTEGRATION.md` - This documentation
