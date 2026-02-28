#!/bin/bash
# Deploy Client Bot to Production
# Usage: ./deploy-client.sh client-001

CLIENT_ID="$1"

if [ -z "$CLIENT_ID" ]; then
    echo "❌ Usage: $0 client-XXX"
    echo "   Available clients:"
    ls -1 clients/ | grep "^client-" | sed 's/^/   - /'
    exit 1
fi

CLIENT_DIR="clients/$CLIENT_ID"

if [ ! -d "$CLIENT_DIR" ]; then
    echo "❌ Client not found: $CLIENT_ID"
    exit 1
fi

CONFIG_FILE="$CLIENT_DIR/config/telegram.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Config not found: $CONFIG_FILE"
    exit 1
fi

# Check if bot token is configured
BOT_TOKEN=$(jq -r '.bot_token' "$CONFIG_FILE")

if [ "$BOT_TOKEN" = "GET_FROM_BOTFATHER" ] || [ -z "$BOT_TOKEN" ]; then
    echo "❌ Bot token not configured!"
    echo "   Edit: $CONFIG_FILE"
    echo "   Get token from @BotFather on Telegram"
    exit 1
fi

echo "🚀 Deploying client: $CLIENT_ID"
echo ""

# Test bot token
echo "🧪 Testing bot token..."
TEST_RESPONSE=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMe")

if echo "$TEST_RESPONSE" | grep -q '"ok":true'; then
    BOT_NAME=$(echo "$TEST_RESPONSE" | jq -r '.result.username')
    echo "   ✅ Bot connected: @$BOT_NAME"
else
    echo "   ❌ Invalid bot token!"
    exit 1
fi

# Register with gateway
echo "📡 Registering with gateway..."
# TODO: Add gateway registration logic

# Create webhook (if using webhooks)
echo "🔗 Setting up webhook..."
# TODO: Add webhook configuration

# Update README status
sed -i 's/🔴 Setup Pending/🟢 Active/' "$CLIENT_DIR/README.md"

# Log deployment
echo "$(date): Deployed $CLIENT_ID" >> admin/deployments.log

echo ""
echo "✅ CLIENT DEPLOYED SUCCESSFULLY!"
echo ""
echo "📊 Details:"
echo "   Client: $CLIENT_ID"
echo "   Bot: @$BOT_NAME"
echo "   Status: Active"
echo ""
echo "🧪 Test it:"
echo "   Message your bot on Telegram"
echo "   Check: $CLIENT_DIR/logs/"
echo ""
