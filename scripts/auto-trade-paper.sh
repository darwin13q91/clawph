#!/bin/bash
# Multi-Strategy Automated Paper Trading
# Uses Mean Reversion + Momentum + Breakout strategies
# Runs every 30 minutes during market hours

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="/home/darwin/.openclaw/workspace"
DATA_DIR="/home/darwin/.openclaw/data"
LOG_FILE="$DATA_DIR/auto_trading.log"
DATE=$(date +%Y-%m-%d)

echo "[$(date '+%H:%M:%S')] Starting multi-strategy paper trading scan..." >> "$LOG_FILE"

# Run scan
python3 "$WORKSPACE/skills/market-scanner/scan.py" > /dev/null 2>&1

# Run multi-strategy selector
python3 "$WORKSPACE/skills/market-scanner/auto_trade_multi.py" >> "$LOG_FILE" 2>&1

echo "[$(date '+%H:%M:%S')] Multi-strategy scan complete." >> "$LOG_FILE"
