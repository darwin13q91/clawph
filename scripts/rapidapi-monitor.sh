#!/bin/bash
#
# RapidAPI Usage Monitor
# Checks daily usage and alerts if approaching limits
#

set -e

# Configuration
ALERT_THRESHOLD=400  # 80% of 500 monthly limit
USAGE_FILE="$HOME/.openclaw/data/rapidapi_usage.jsonl"
LOG_FILE="$HOME/.openclaw/data/rapidapi_monitor.log"
ALERT_SENT_FILE="$HOME/.openclaw/data/.rapidapi_alert_sent"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Ensure directories exist
mkdir -p "$HOME/.openclaw/logs"

log() {
    echo "[$(date -Iseconds)] $1" | tee -a "$LOG_FILE"
}

# Check if usage file exists
if [ ! -f "$USAGE_FILE" ]; then
    log "ℹ️ Usage file not found: $USAGE_FILE"
    log "No requests logged yet."
    exit 0
fi

log "📊 Checking RapidAPI usage..."

# Count RapidAPI requests in last 24 hours
ONE_DAY_AGO=$(date -d '24 hours ago' -Iseconds 2>/dev/null || date -v-1d -Iseconds)

RAPIDAPI_COUNT=$(grep '"source":"rapidapi"' "$USAGE_FILE" 2>/dev/null | \
    awk -F'"timestamp":"' '{print $2}' | \
    awk -F'"' '{print $1}' | \
    while read -r ts; do
        if [[ "$ts" > "$ONE_DAY_AGO" ]]; then
            echo 1
        fi
    done | wc -l)

SCOUT_COUNT=$(grep '"source":"scout"' "$USAGE_FILE" 2>/dev/null | \
    awk -F'"timestamp":"' '{print $2}' | \
    awk -F'"' '{print $1}' | \
    while read -r ts; do
        if [[ "$ts" > "$ONE_DAY_AGO" ]]; then
            echo 1
        fi
    done | wc -l)

TOTAL_COUNT=$((RAPIDAPI_COUNT + SCOUT_COUNT))

log "📈 Last 24h Usage:"
log "   RapidAPI: $RAPIDAPI_COUNT requests"
log "   Scout (fallback): $SCOUT_COUNT requests"
log "   Total: $TOTAL_COUNT requests"

# Calculate percentage of monthly limit (approximation)
PERCENTAGE=$((RAPIDAPI_COUNT * 100 / 500))
log "   Monthly usage estimate: ~$PERCENTAGE%"

# Check if we need to alert
if [ "$RAPIDAPI_COUNT" -gt "$ALERT_THRESHOLD" ]; then
    log "${RED}⚠️ ALERT: RapidAPI usage ($RAPIDAPI_COUNT) exceeds threshold ($ALERT_THRESHOLD)${NC}"
    
    # Check if we already sent alert today
    TODAY=$(date +%Y-%m-%d)
    if [ -f "$ALERT_SENT_FILE" ] && [ "$(cat "$ALERT_SENT_FILE")" = "$TODAY" ]; then
        log "ℹ️ Alert already sent today, skipping..."
    else
        # Send alert via message tool (will be picked up by main agent)
        echo "$TODAY" > "$ALERT_SENT_FILE"
        
        # Create alert notification
        cat > "$HOME/.openclaw/data/rapidapi_alert.json" << EOF
{
  "type": "rapidapi_usage_alert",
  "timestamp": "$(date -Iseconds)",
  "severity": "warning",
  "message": "RapidAPI usage alert: $RAPIDAPI_COUNT requests in last 24h (threshold: $ALERT_THRESHOLD)",
  "details": {
    "rapidapi_requests_24h": $RAPIDAPI_COUNT,
    "scout_fallback_24h": $SCOUT_COUNT,
    "threshold": $ALERT_THRESHOLD,
    "percent_of_limit": $PERCENTAGE
  }
}
EOF
        
        log "🚨 Alert notification created for Allysa"
    fi
else
    log "${GREEN}✅ Usage within normal limits${NC}"
fi

# Report fallback usage if any
if [ "$SCOUT_COUNT" -gt 0 ]; then
    FALLBACK_RATE=$((SCOUT_COUNT * 100 / TOTAL_COUNT))
    log "${YELLOW}📢 Scout fallback used $SCOUT_COUNT times ($FALLBACK_RATE% of requests)${NC}"
    
    if [ "$FALLBACK_RATE" -gt 20 ]; then
        log "${YELLOW}⚠️ High fallback rate detected - consider monitoring RapidAPI quota${NC}"
    fi
fi

log "✅ Monitor check complete"
exit 0
