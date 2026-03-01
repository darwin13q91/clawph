#!/bin/bash
# Deliver overnight report at 6AM
REPORT="/home/darwin/.openclaw/workspace/brain/overnight/reports/20260301_report.txt"
if [ -f "$REPORT" ]; then
    cat "$REPORT"
    # Mark as delivered
    mv "$REPORT" "$REPORT.delivered"
fi
