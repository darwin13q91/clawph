#!/bin/bash
# Add New Client to Multi-Tenant Gateway
# Usage: ./add-client.sh "Business Name" "BOT_TOKEN" "CHAT_ID"

API_URL="https://webhook.amajungle.com"

BUSINESS_NAME="$1"
BOT_TOKEN="$2"
CHAT_ID="$3"

if [ -z "$BUSINESS_NAME" ] || [ -z "$BOT_TOKEN" ] || [ -z "$CHAT_ID" ]; then
    echo "Usage: $0 'Business Name' 'BOT_TOKEN' 'CHAT_ID'"
    echo ""
    echo "Get BOT_TOKEN from @BotFather"
    echo "Get CHAT_ID from @userinfobot"
    exit 1
fi

echo "🚀 Adding new client to OpenClaw Gateway..."
echo "   Business: $BUSINESS_NAME"

# Create client via API
RESPONSE=$(curl -s -X POST "$API_URL/admin/clients" \
    -H "Content-Type: application/json" \
    -d "{
        \"business_name\": \"$BUSINESS_NAME\",
        \"bot_token\": \"$BOT_TOKEN\",
        \"chat_id\": \"$CHAT_ID\"
    }")

# Parse response
CLIENT_ID=$(echo $RESPONSE | grep -o '"client_id":"[^"]*"' | cut -d'"' -f4)
WEBHOOK_URL=$(echo $RESPONSE | grep -o '"webhook_url":"[^"]*"' | cut -d'"' -f4)

if [ -n "$CLIENT_ID" ]; then
    echo ""
    echo "✅ Client Created Successfully!"
    echo ""
    echo "📋 Client Details:"
    echo "   Client ID: $CLIENT_ID"
    echo "   Webhook URL: $WEBHOOK_URL"
    echo ""
    echo "🔗 Setup Instructions for Client:"
    echo "   1. Go to Facebook Dev Console → Messenger → Webhooks"
    echo "   2. Callback URL: $WEBHOOK_URL"
    echo "   3. Verify Token: (will be provided separately)"
    echo "   4. Subscribe to: messages, messaging_postbacks"
    echo ""
    echo "📊 Monitor at: https://webhook.amajungle.com/admin/clients"
else
    echo "❌ Failed to create client"
    echo "Response: $RESPONSE"
    exit 1
fi
