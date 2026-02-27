# Command Center Service Configuration

## Auto-Restart Setup

**Keepalive script:** `/apps/command-center/keepalive.sh`
- Runs in background
- Checks every 10 seconds if server is alive
- Auto-restarts if crashed

**Health check:** `/apps/command-center/check-and-restart.sh`
- Run manually to check status
- Restarts if down

**Cron job:** Every minute
```
* * * * * /apps/command-center/check-and-restart.sh
```

## Manual Commands

```bash
# Check status
./check-and-restart.sh

# Start keepalive (background)
nohup bash keepalive.sh &

# Stop everything
pkill -f "command-center"
```

## Logs

Server logs: `apps/command-center/logs/server.log`

## Status

Current: Auto-restart enabled ✅
