#!/bin/bash
# Self-Improving Trading Bot - Evolution Runner
# Analyzes performance, generates improvements, tests them

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="/home/darwin/.openclaw/data"
LOG_FILE="$DATA_DIR/evolution.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🧬 Strategy Evolution Starting..." >> "$LOG_FILE"

# Run evolution cycle
cd "$SCRIPT_DIR"
python3 strategy_evolution.py >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Evolution cycle completed successfully" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Evolution cycle failed" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
