#!/bin/bash
# Send Morning Report via Telegram (Bot #2 - Alerts)

REPORT_FILE="$HOME/.openclaw/data/morning_report.txt"
CONFIG_FILE="$HOME/.openclaw/config/telegram-alerts.json"
LOG_FILE="$HOME/.openclaw/workspace/personal/logs/morning-updates.log"

mkdir -p "$(dirname "$LOG_FILE")"

# Check if report exists
if [ ! -f "$REPORT_FILE" ]; then
    echo "[$(date)] No morning report found" >> "$LOG_FILE"
    exit 1
fi

# Check if Telegram is configured
if [ ! -f "$CONFIG_FILE" ]; then
    echo "[$(date)] Telegram not configured" >> "$LOG_FILE"
    exit 1
fi

# Extract bot token and chat ID
BOT_TOKEN=$(grep '"bot_token"' "$CONFIG_FILE" | cut -d'"' -f4)
CHAT_ID=$(grep '"chat_id"' "$CONFIG_FILE" | cut -d'"' -f4)

if [ -z "$BOT_TOKEN" ] || [ -z "$CHAT_ID" ]; then
    echo "[$(date)] Missing bot token or chat ID" >> "$LOG_FILE"
    exit 1
fi

# Send simple message
MESSAGE="🌅 <b>Good Morning!</b>%0A%0A📅 $(date '+%A, %B %d')%0A%0AYour morning report is ready.%0A%0A📊 Check your trades today! 🚀"

# Send to Telegram
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d "chat_id=${CHAT_ID}" \
    -d "text=${MESSAGE}" \
    -d "parse_mode=HTML" \
    -d "disable_notification=true" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date)] Morning report sent to Telegram" >> "$LOG_FILE"
else
    echo "[$(date)] Failed to send morning report" >> "$LOG_FILE"
fi
