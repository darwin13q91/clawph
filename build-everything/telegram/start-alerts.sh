#!/bin/bash
# Start Telegram Alert Integration
# Add this to your startup scripts

echo "📱 Starting Telegram Alert Integration..."

node /home/darwin/.openclaw/workspace/build-everything/telegram/integration.js &

echo "✅ Telegram alerts watching in background"
echo "   PID: $!"
