#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/process-health.sh
# Full process health check for the AmaJungle fleet

echo "=== Process Health: $(date) ==="
echo ""

echo "OpenClaw Gateway:"
if pgrep -f "openclaw" > /dev/null; then
    PID=$(pgrep -f 'openclaw' | head -1)
    echo " ✅ Running (PID: $PID)"
    UPTIME=$(ps -p $PID -o etime= 2>/dev/null | tr -d ' ')
    echo " Uptime: $UPTIME"
else
    echo " ❌ NOT running"
fi

echo ""
echo "Node processes:"
ps aux | grep node | grep -v grep | awk '{print " PID:" $2, "CPU:" $3"%" , "MEM:" $4"%", $11}'

echo ""
echo "Python processes:"
ps aux | grep python3 | grep -v grep | awk '{print " PID:" $2, "CPU:" $3"%" , "MEM:" $4"%", $11}'

echo ""
echo "Stale lock files:"
FOUND_STALE=false
for lockfile in /tmp/*.lock; do
    [ -f "$lockfile" ] || continue
    PID=$(cat "$lockfile" 2>/dev/null)
    if [ -n "$PID" ] && ! kill -0 "$PID" 2>/dev/null; then
        echo " ⚠️  STALE: $lockfile (PID $PID no longer running)"
        FOUND_STALE=true
    fi
done
[ "$FOUND_STALE" = false ] && echo " ✅ No stale lock files"

echo ""
echo "Zombie processes:"
ZOMBIES=$(ps aux | awk '$8 == "Z"' | grep -v "STAT")
[ -n "$ZOMBIES" ] && echo "$ZOMBIES" || echo " ✅ None"

echo ""
echo "Recent cron failures (last 24h):"
LOG_FILE="$HOME/.openclaw/workspace/logs/cron.log"
if [ -f "$LOG_FILE" ]; then
    grep "FAILED\|ERROR" "$LOG_FILE" 2>/dev/null | tail -5 | sed 's/^/  /' || echo " ✅ None"
else
    echo " — Log file not found"
fi

echo ""
echo "=== End of Report ==="
