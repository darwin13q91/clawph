#!/bin/bash
# Morning Report Telegram Delivery
# Bot #2: 8606070459:AAEsiAmLNv0gxyICsUib_EYjIOkylToWjfU

CONFIG_FILE="$HOME/.openclaw/config/telegram-alerts.json"
BOT_TOKEN="8606070459:AAEsiAmLNv0gxyICsUib_EYjIOkylToWjfU"
CHAT_ID="6504570121"
REPORT_FILE="$HOME/.openclaw/data/morning_report.txt"

# Check if report exists
if [ ! -f "$REPORT_FILE" ]; then
    echo "Error: Morning report not found at $REPORT_FILE"
    exit 1
fi

# Read report content
REPORT_CONTENT=$(cat "$REPORT_FILE")

# Send to Telegram
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d "chat_id=${CHAT_ID}" \
    -d "text=${REPORT_CONTENT}" \
    -d "parse_mode=HTML" > /tmp/telegram_send.log 2>&1

if [ $? -eq 0 ]; then
    echo "Morning report sent successfully at $(date)"
else
    echo "Failed to send morning report at $(date)"
    cat /tmp/telegram_send.log
fi
