#!/bin/bash
# Quick status check for Command Center

curl -s http://127.0.0.1:8888/api/status > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Command Center is running on http://127.0.0.1:8888"
    exit 0
else
    echo "❌ Command Center is DOWN"
    echo "   Restarting..."
    /home/darwin/.openclaw/workspace/apps/command-center/keepalive.sh &
    sleep 2
    curl -s http://127.0.0.1:8888 > /dev/null && echo "✅ Restarted successfully" || echo "❌ Restart failed"
fi
