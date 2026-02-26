#!/bin/bash
# Automated Paper Trading Strategy
# Runs every 30 minutes during market hours
# Logs trades to paper_trader.py system

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="/home/darwin/.openclaw/workspace"
DATA_DIR="/home/darwin/.openclaw/data"
LOG_FILE="$DATA_DIR/auto_trading.log"
DATE=$(date +%Y-%m-%d)

echo "[$(date '+%H:%M:%S')] Starting automated paper trading scan..." >> "$LOG_FILE"

# Fetch current opportunities
python3 "$WORKSPACE/scripts/scan.py" > /dev/null 2>&1

# Read opportunities
SCAN_FILE="$DATA_DIR/scan.json"
if [ ! -f "$SCAN_FILE" ]; then
    echo "[$(date '+%H:%M:%S')] ❌ No scan data available" >> "$LOG_FILE"
    exit 1
fi

# Simple trading strategy:
# 1. Look for markets with high volume (>$10k)
# 2. Price between $0.30-$0.70 (not decided)
# 3. Days to resolution: 7-30 (near term)
# 4. Log paper trade if conditions met

python3 << PYTHON_SCRIPT
import json
import sys
import os
from datetime import datetime

scan_file = "/home/darwin/.openclaw/data/scan.json"
log_file = "/home/darwin/.openclaw/data/auto_trading.log"

# Trading criteria
MIN_VOLUME = 10000      # $10k volume
MIN_PRICE = 0.30        # Not too certain
MAX_PRICE = 0.70        # Not too uncertain
MIN_DAYS = 7           # At least 1 week
MAX_DAYS = 30          # Max 1 month
TRADE_AMOUNT = 10      # $10 paper trades

try:
    with open(scan_file, 'r') as f:
        data = json.load(f)
    
    opportunities = data.get('opportunities', [])
    trades_logged = 0
    
    for opp in opportunities[:5]:  # Check top 5
        volume = opp.get('volume', 0)
        price = opp.get('yes_price', 0)
        days = opp.get('days_left', 999)
        question = opp.get('question', '')
        
        # Apply filters
        if volume < MIN_VOLUME:
            continue
        if price < MIN_PRICE or price > MAX_PRICE:
            continue
        if days < MIN_DAYS or days > MAX_DAYS:
            continue
        
        # Simple strategy: Buy YES if price < 0.5, NO if price > 0.5
        # (mean reversion assumption)
        if price < 0.50:
            direction = "YES"
            reasoning = f"Mean reversion play. Price ${price} below 0.50, high volume ${volume:,.0f}. Auto-traded by strategy."
        else:
            direction = "NO"
            reasoning = f"Mean reversion play. Price ${price} above 0.50, high volume ${volume:,.0f}. Auto-traded by strategy."
        
        # Calculate shares
        shares = int(TRADE_AMOUNT / price)
        if shares < 1:
            shares = 1
        
        # Log the paper trade using paper_trader.py
        import subprocess
        result = subprocess.run([
            'python3', '/home/darwin/.openclaw/workspace/scripts/paper_trader.py',
            'log',
            opp.get('condition_id', f"market_{datetime.now().timestamp()}"),
            question[:100],  # Limit length
            direction,
            str(price),
            str(shares)
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            with open(log_file, 'a') as f:
                f.write(f"[{datetime.now().strftime('%H:%M:%S')}] ✅ PAPER TRADE: {direction} {shares} shares @ ${price} - {question[:60]}...\n")
            trades_logged += 1
        else:
            with open(log_file, 'a') as f:
                f.write(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Failed to log trade: {result.stderr}\n")
        
        # Only take 1 trade per scan to limit exposure
        if trades_logged >= 1:
            break
    
    with open(log_file, 'a') as f:
        f.write(f"[{datetime.now().strftime('%H:%M:%S')}] Scan complete. Trades logged: {trades_logged}\n")
        
except Exception as e:
    with open(log_file, 'a') as f:
        f.write(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Error: {str(e)}\n")
PYTHON_SCRIPT

echo "[$(date '+%H:%M:%S')] Automated scan complete." >> "$LOG_FILE"
