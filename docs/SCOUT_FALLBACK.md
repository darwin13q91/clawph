# Scout Fallback System Documentation

## Overview

The Scout Fallback System automatically switches to Scout (browser-based research) when RapidAPI hits its monthly rate limits (500 + 500 = 1000 total requests).

## How It Works

### 1. RapidAPI Rate Limit Detection

When a product data request is made:
1. System checks RapidAPI usage stats
2. If usage is below limits → uses RapidAPI (fast)
3. If 429 error or limit exceeded → triggers Scout fallback

### 2. Scout Fallback Process

```
RapidAPI 429 Error
        ↓
Scout Spawned (Browser Agent)
        ↓
"Deep Research In Progress" Email to Client
        ↓
Scout Performs Browser Research (2-3 min)
        ↓
River Analyzes Results
        ↓
Piper Sends Enhanced Report Email
```

### 3. Key Components

#### Backend (Dashboard Server)
- **File**: `~/.openclaw/workspace/apps/dashboard/server/rapidapi-with-scout-fallback.js`
- **Main Function**: `getProductDataWithFallback(asin, options)`
- **API Endpoints**:
  - `GET /api/rapidapi/status` - RapidAPI usage stats
  - `GET /api/rapidapi/fallback-stats` - Scout fallback statistics
  - `GET /api/rapidapi/product-with-fallback?asin=XXX&client_email=XXX` - API with automatic fallback

#### Async Job Handler (Echo)
- **File**: `~/.openclaw/agents/echo/scripts/scout_async_handler.py`
- **Purpose**: Process Scout jobs asynchronously
- **Usage**: `python3 scout_async_handler.py --daemon`

#### Pipeline Bridge
- **File**: `~/.openclaw/agents/echo/scripts/pipeline_bridge.py`
- **Integration**: Updated to support Scout result files

## Configuration

### Environment Variables

```bash
# Scout fallback enabled by default
SCOUT_FALLBACK_ENABLED=true

# Scout script path (default)
SCOUT_SCRIPT_PATH=/home/darwin/.openclaw/agents/scout/scripts/deep-audit.sh
```

### Data Directories

```
~/.openclaw/workspace/apps/dashboard/data/
├── scout_fallback_log.json       # Fallback event log
├── rapidapi_usage.json           # RapidAPI usage tracking
└── axesso_usage.json             # Axesso usage tracking

~/.openclaw/agents/echo/data/
├── scout_queue/                  # Pending Scout jobs
├── scout_results/                # Completed Scout jobs
├── scout_notifications/          # Client notification queue
└── scout_async.log               # Async handler log

~/.openclaw/agents/scout/reports/ # Scout analysis reports
~/.openclaw/agents/scout/screenshots/ # Scout screenshots
```

## Usage

### Testing the Fallback

```bash
# Run test script
~/.openclaw/workspace/scripts/test-scout-fallback.sh
```

### Manual API Call with Fallback

```bash
# Get product data with automatic fallback
curl "http://localhost:8789/api/rapidapi/product-with-fallback?\
  asin=B08N5WRWNW&\
  client_email=client@example.com&\
  client_name=John%20Doe"
```

### Response Format

```json
{
  "success": true,
  "source": "scout",
  "fallbackUsed": true,
  "data": {
    "asin": "B08N5WRWNW",
    "product": {
      "title": "Product Name",
      "price": "$19.99",
      "rating": 4.5,
      "reviews_count": 1234,
      ...
    },
    "scout": {
      "screenshotFile": "/path/to/screenshot.png",
      "extractionMethod": "browser_agent"
    }
  }
}
```

## Monitoring

### Dashboard Endpoints

1. **RapidAPI Status**: `/api/rapidapi/status`
   - Shows usage for both Amazon and Axesso providers
   - Monthly/daily limits and remaining requests

2. **Fallback Stats**: `/api/rapidapi/fallback-stats`
   - Total fallbacks recorded
   - Recent fallback events (24h)
   - RapidAPI vs Scout usage comparison

### Log Files

```bash
# Fallback events
tail -f ~/.openclaw/workspace/apps/dashboard/data/scout_fallback_log.json

# Async job handler
tail -f ~/.openclaw/agents/echo/data/scout_async.log

# Dashboard server
journalctl -u openclaw-dashboard -f
```

### Telegram Alerts

Fallback events trigger Telegram notifications to:
- Notify when fallback occurs
- Track Scout job completion
- Alert on pipeline completion (Scout → River → Piper)

## Architecture

### Sequence Diagram

```
Client → Dashboard Server → RapidAPI Proxy
                              ↓ (429 error)
                        Scout Fallback Module
                              ↓
                        Scout Async Handler
                              ↓
                        Scout Browser Agent
                              ↓
                        Pipeline Bridge
                              ↓
                        River Analysis
                              ↓
                        Piper Email
                              ↓
                        Client Notification
```

### File Structure

```
workspace/apps/dashboard/server/
├── index.js                           # Main server (updated)
├── rapidapi-proxy.js                  # Original RapidAPI proxy
├── rapidapi-with-scout-fallback.js    # New fallback wrapper
└── ...

agents/echo/scripts/
├── scout_async_handler.py             # Async job processor
├── pipeline_bridge.py                 # Updated for Scout integration
└── ...

agents/scout/scripts/
├── deep-audit.sh                      # Scout analysis script
└── ...
```

## Troubleshooting

### Scout Not Spawning

1. Check Scout script exists:
   ```bash
   ls -la ~/.openclaw/agents/scout/scripts/deep-audit.sh
   ```

2. Check agent-browser is available:
   ```bash
   which agent-browser
   ```

3. Check fallback log:
   ```bash
   cat ~/.openclaw/workspace/apps/dashboard/data/scout_fallback_log.json
   ```

### Async Handler Not Processing

1. Check if daemon is running:
   ```bash
   ps aux | grep scout_async_handler
   ```

2. Start daemon manually:
   ```bash
   python3 ~/.openclaw/agents/echo/scripts/scout_async_handler.py --daemon
   ```

3. Check queue directory:
   ```bash
   ls ~/.openclaw/agents/echo/data/scout_queue/
   ```

### Email Notifications Not Sending

1. Check email credentials in `.env`
2. Verify Piper's email sender is working
3. Check notification queue:
   ```bash
   ls ~/.openclaw/agents/echo/data/scout_notifications/
   ```

## Testing

### Unit Tests

```bash
# Test Scout script directly
~/.openclaw/agents/scout/scripts/deep-audit.sh B08N5WRWNW

# Test async handler
python3 ~/.openclaw/agents/echo/scripts/scout_async_handler.py --status

# Test pipeline bridge
python3 ~/.openclaw/agents/echo/scripts/pipeline_bridge.py --test-asin "https://amazon.com/dp/B08N5WRWNW"
```

### Integration Test

```bash
# Full system test
~/.openclaw/workspace/scripts/test-scout-fallback.sh
```

## Future Enhancements

1. **Smart Fallback**: Preemptively switch to Scout before hitting limits (at 90% usage)
2. **Scout Caching**: Cache Scout results for frequently requested ASINs
3. **Parallel Processing**: Run RapidAPI and Scout simultaneously for fastest response
4. **Fallback Metrics**: Dashboard visualization of RapidAPI vs Scout usage
5. **Auto-scaling**: Spawn multiple Scout agents for high-volume periods