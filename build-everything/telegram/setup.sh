#!/bin/bash
# Setup Telegram Alerts for OpenClaw

echo "📱 Setting up Telegram Alerts..."
echo ""

# Create config directory
mkdir -p ~/.openclaw/config

# Check if already configured
if [ -f ~/.openclaw/config/telegram.json ]; then
    echo "⚠️  Telegram config already exists"
    echo "   Edit: ~/.openclaw/config/telegram.json"
    exit 0
fi

# Copy template
cp /home/darwin/.openclaw/workspace/build-everything/telegram/telegram.json.template ~/.openclaw/config/telegram.json

echo "✅ Template created at: ~/.openclaw/config/telegram.json"
echo ""
echo "📝 To activate alerts:"
echo ""
echo "1. Message @BotFather on Telegram"
echo "   → Create new bot → Copy the token"
echo ""
echo "2. Message @userinfobot on Telegram"  
echo "   → Copy your Chat ID"
echo ""
echo "3. Edit the config file:"
echo "   nano ~/.openclaw/config/telegram.json"
echo ""
echo "4. Set enabled: true and add your credentials"
echo ""
echo "5. Test it:"
echo "   node /home/darwin/.openclaw/workspace/build-everything/telegram/telegram-alerts.js"
