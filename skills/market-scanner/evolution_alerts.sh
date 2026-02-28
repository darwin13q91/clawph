#!/bin/bash
# Evolution Alerts - Send Telegram notifications for strategy events
# Called by trading system when significant events occur

TELEGRAM_BOT="8606070459:AAEsiAmLNv0gxyICsUib_EYjIOkylToWjfU"
CHAT_ID="6504570121"

echo "📱 Sending Evolution Alert..."

# Check for newly promoted strategies
EVOLVED_FILE="/home/darwin/.openclaw/data/evolved_strategies.json"

if [ ! -f "$EVOLVED_FILE" ]; then
    echo "No evolved strategies yet"
    exit 0
fi

# Check for strategies ready for promotion
python3 <> 'PYEOF'
import json
import sys

with open('/home/darwin/.openclaw/data/evolved_strategies.json', 'r') as f:
    strategies = json.load(f)

alerts = []

for strategy in strategies:
    status = strategy.get('status')
    results = strategy.get('test_results', {})
    trades = results.get('trades', 0)
    win_rate = results.get('win_rate', 0)
    
    # Alert if ready for promotion
    if status == 'testing' and trades >= 10 and win_rate >= 55:
        alerts.append({
            'type': 'promotion',
            'id': strategy['id'],
            'win_rate': win_rate,
            'trades': trades
        })
    
    # Alert if performing poorly
    if status == 'testing' and trades >= 10 and win_rate < 40:
        alerts.append({
            'type': 'retirement',
            'id': strategy['id'],
            'win_rate': win_rate,
            'trades': trades
        })

for alert in alerts:
    print(json.dumps(alert))
PYEOF
