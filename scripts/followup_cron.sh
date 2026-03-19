#!/bin/bash
# Followup System Cron Job
# Checks for pending followups and sends them
# Run this every hour via cron

LOG_FILE="/home/darwin/.openclaw/agents/piper/logs/followup_cron.log"

echo "[$(date)] Starting followup check..." >> "$LOG_FILE"

# Process pending followups
cd /home/darwin/.openclaw/agents/piper/scripts
python3 followup_system.py --process >> "$LOG_FILE" 2>&1

# Also check VIP system for any overdue items
cd /home/darwin/.openclaw/agents/echo/scripts
python3 vip_client_system.py --check-followups >> "$LOG_FILE" 2>&1

echo "[$(date)] Followup check complete" >> "$LOG_FILE"
