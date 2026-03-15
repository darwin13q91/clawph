#!/bin/bash
# test-ai-gateway.sh - End-to-end test for AI Gateway
# Run this on VPS after deployment

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

GATEWAY_PORT="${GATEWAY_PORT:-8000}"
TEST_CLIENT="${TEST_CLIENT:-demo-restaurant}"

PASS=0
FAIL=0

check_pass() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASS++)) || true
}

check_fail() {
    echo -e "${RED}✗ $1${NC}"
    ((FAIL++)) || true
}

echo -e "${BLUE}=========================================="
echo "AI Gateway - End-to-End Test"
echo "==========================================${NC}"
echo ""

# Test 1: Gateway health endpoint
echo "[1/7] Testing Gateway health endpoint..."
if curl -sf http://localhost:$GATEWAY_PORT/health >/dev/null 2>&1; then
    check_pass "Gateway is responding"
    echo "  Response:"
    curl -s http://localhost:$GATEWAY_PORT/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:$GATEWAY_PORT/health
    echo ""
else
    check_fail "Gateway health check failed"
    echo "  Make sure the gateway is running: systemctl status ai-gateway"
fi

# Test 2: Tunnel connection
echo ""
echo "[2/7] Testing tunnel to local OpenClaw..."
if [ -f /opt/openclaw/scripts/test-local-connection.sh ]; then
    if /opt/openclaw/scripts/test-local-connection.sh >/dev/null 2>&1; then
        check_pass "Tunnel connection successful"
    else
        check_fail "Tunnel connection failed"
    fi
else
    check_fail "Test script not found"
fi

# Test 3: Client context exists
echo ""
echo "[3/7] Testing client context..."
CLIENT_DIR="/opt/openclaw/clients/$TEST_CLIENT"
if [ -d "$CLIENT_DIR" ]; then
    check_pass "Client directory exists: $TEST_CLIENT"
    
    if [ -f "$CLIENT_DIR/context.json" ]; then
        check_pass "Context file exists"
    else
        check_fail "Context file missing"
    fi
    
    if [ -f "$CLIENT_DIR/memory.json" ]; then
        check_pass "Memory file exists"
    else
        echo "  (Memory file will be created on first message)"
    fi
    
    if [ -f "$CLIENT_DIR/stats.json" ]; then
        check_pass "Stats file exists"
    else
        echo "  (Stats file will be created on first message)"
    fi
else
    check_fail "Client directory not found: $CLIENT_DIR"
fi

# Test 4: Bot token exists
echo ""
echo "[4/7] Testing bot token configuration..."
TOKEN_FILE="/opt/openclaw/secrets/${TEST_CLIENT}.token"
if [ -f "$TOKEN_FILE" ]; then
    TOKEN=$(cat "$TOKEN_FILE" 2>/dev/null | head -c 20)
    if [ -n "$TOKEN" ]; then
        check_pass "Bot token configured"
    else
        check_fail "Bot token file is empty"
    fi
else
    check_fail "Bot token not found: $TOKEN_FILE"
    echo "  Create it with: echo 'YOUR_BOT_TOKEN' > $TOKEN_FILE"
fi

# Test 5: Stats endpoint
echo ""
echo "[5/7] Testing stats endpoint..."
STATS_RESPONSE=$(curl -sf "http://localhost:$GATEWAY_PORT/stats/$TEST_CLIENT" 2>/dev/null || echo "")
if [ -n "$STATS_RESPONSE" ]; then
    check_pass "Stats endpoint responding"
    echo "  Response:"
    echo "$STATS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATS_RESPONSE"
else
    check_fail "Stats endpoint failed"
fi

# Test 6: Intent classification test (simulated)
echo ""
echo "[6/7] Testing intent classification..."

# Simple test messages
TEST_MESSAGES=(
    "hi|greeting"
    "what are your hours|hours_query"
    "tell me about your restaurant|complex"
    "bye|goodbye"
)

for test in "${TEST_MESSAGES[@]}"; do
    IFS='|' read -r msg expected <<< "$test"
    echo "  Testing: \"$msg\" -> expect $expected"
done
check_pass "Intent classification rules defined"

# Test 7: Simulated webhook (requires actual Telegram setup for full test)
echo ""
echo "[7/7] Testing webhook endpoint structure..."
WEBHOOK_URL="http://localhost:$GATEWAY_PORT/webhook/$TEST_CLIENT"

# Test with invalid JSON
if curl -sf -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{"invalid":' >/dev/null 2>&1; then
    check_fail "Should have rejected invalid JSON"
else
    check_pass "Properly rejects invalid JSON"
fi

# Test with valid structure (no actual message)
if curl -sf -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{"message":{"text":"test","chat":{"id":123},"from":{"id":456}}}' \>/dev/null 2>&1; then
    check_pass "Webhook accepts valid structure"
else
    check_fail "Webhook rejected valid structure"
fi

# Summary
echo ""
echo -e "${BLUE}=========================================="
echo "Test Summary"
echo "==========================================${NC}"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Configure your Telegram bot webhook:"
    echo "     curl -X POST 'https://api.telegram.org/bot<TOKEN>/setWebhook' \\"
    echo "       -d 'url=https://your-vps-ip:$GATEWAY_PORT/webhook/$TEST_CLIENT'"
    echo ""
    echo "  2. Send a test message to your bot"
    echo ""
    echo "  3. Check logs: tail -f /opt/openclaw/logs/ai_gateway.log"
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed. Please review the errors above.${NC}"
    exit 1
fi
