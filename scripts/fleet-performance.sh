#!/bin/bash
# Daily Fleet Performance Snapshot
# Location: ~/.openclaw/workspace/scripts/fleet-performance.sh
# Run: Daily at 6:00 AM PHT

TIMESTAMP=$(date +%Y-%m-%d)
REPORT="$HOME/.openclaw/workspace/memory/performance/$TIMESTAMP.md"
mkdir -p "$(dirname $REPORT)"

echo "# Fleet Performance — $TIMESTAMP" > "$REPORT"
echo "" >> "$REPORT"
echo "Generated: $(date)" >> "$REPORT"
echo "" >> "$REPORT"

# System health
echo "## System Health" >> "$REPORT"
if command -v openclaw >/dev/null 2>&1; then
  openclaw status 2>&1 | head -10 | sed 's/^/- /' >> "$REPORT"
else
  echo "- OpenClaw status unavailable" >> "$REPORT"
fi

# Error count from logs
echo "" >> "$REPORT"
echo "## Recent Errors (last 24h)" >> "$REPORT"
LOG_DIR="$HOME/.openclaw/workspace/logs"
if [ -d "$LOG_DIR" ]; then
  ERROR_COUNT=$(find "$LOG_DIR" -name "*.log" -mtime -1 -exec grep -H "ERROR\|CRITICAL" {} + 2>/dev/null | wc -l)
  echo "- Total errors: $ERROR_COUNT" >> "$REPORT"
else
  echo "- Log directory not found" >> "$REPORT"
fi

# Disk usage
echo "" >> "$REPORT"
echo "## Disk Usage" >> "$REPORT"
df -h "$HOME" | tail -1 | awk '{print "- Usage: "$5" ("$3"/"$2")"}' >> "$REPORT"

# Memory files count
echo "" >> "$REPORT"
echo "## Memory Files" >> "$REPORT"
MEMORY_COUNT=$(find "$HOME/.openclaw/workspace/memory/" -type f 2>/dev/null | wc -l)
echo "- Total memory files: $MEMORY_COUNT" >> "$REPORT"

echo "" >> "$REPORT"
echo "---" >> "$REPORT"
echo "Report saved: $REPORT"
