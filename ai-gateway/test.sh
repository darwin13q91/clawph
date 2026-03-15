#!/bin/bash
# Quick test of AI Gateway

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Testing AI Gateway                                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: VPS Gateway
echo "[1/3] Testing VPS Gateway..."
if curl -s https://webhook.amajungle.com/health | grep -q "healthy"; then
    echo "✅ VPS Gateway OK"
else
    echo "❌ VPS Gateway not responding"
    exit 1
fi

# Test 2: Local Handler
echo ""
echo "[2/3] Testing Local Handler..."
if netstat -tlnp 2>/dev/null | grep -q ":9999"; then
    echo "✅ Local Handler OK (port 9999)"
else
    echo "❌ Local Handler not running"
    echo "   Run: ./install-local.sh"
    exit 1
fi

# Test 3: Simulate message
echo ""
echo "[3/3] Simulating AI message..."
RESPONSE=$(curl -s -X POST https://webhook.amajungle.com/webhook/client_0b70f519a29c45c1 \
    -H "Content-Type: application/json" \
    -d '{"message": {"text": "Tell me about your business", "chat": {"id": "6911459418"}}}')

if echo "$RESPONSE" | grep -q "reply"; then
    echo "✅ Message processed!"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "🎉 AI GATEWAY IS WORKING!"
    echo ""
    echo "Now test on Telegram:"
    echo "Message your bot: 'Tell me about your business'"
else
    echo "⚠️  Message processed but may not have AI reply"
    echo "Response: $RESPONSE"
fi

echo ""
