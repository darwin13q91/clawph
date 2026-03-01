#!/bin/bash
# Start Dashboard in a detached way

cd /home/darwin/.openclaw/workspace/apps/dashboard || exit 1

# Kill existing
pkill -f "node.*dashboard/server" 2>/dev/null || true
sleep 1

# Start with setsid to detach from terminal
setsid node server/index.js > dashboard.log 2>&1 &

sleep 2

# Check
if netstat -tlnp 2>/dev/null | grep -q ":8789"; then
    echo "✅ Dashboard RUNNING on http://127.0.0.1:8789"
else
    echo "❌ Failed to start"
    tail -10 dashboard.log
fi
