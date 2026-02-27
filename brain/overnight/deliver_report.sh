#!/bin/bash
# Deliver overnight report at 6AM

REPORT_DIR="/home/darwin/.openclaw/workspace/brain/overnight/reports"
TODAY=$(date +%Y%m%d)
REPORT_FILE="$REPORT_DIR/${TODAY}_report.txt"
DELIVERED_FILE="$REPORT_FILE.delivered"

echo "Checking for overnight report..."

if [ -f "$REPORT_FILE" ]; then
    echo ""
    cat "$REPORT_FILE"
    echo ""
    
    # Mark as delivered
    mv "$REPORT_FILE" "$DELIVERED_FILE"
    echo "✅ Report delivered and archived"
elif [ -f "$DELIVERED_FILE" ]; then
    echo "✅ Report already delivered today (check .delivered file)"
else
    echo "⚠️  No overnight report found for today."
    echo "The thinking script may not have run at 9 PM."
fi
