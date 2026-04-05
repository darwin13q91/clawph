#!/bin/bash
# Status Checker for AI Gateway System
# Run this on your laptop

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  AI Gateway - Status Check                                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ALL_OK=true

# 1. Check Local Handler
echo -e "${YELLOW}LOCAL SYSTEM${NC}"
echo "────────────────────────────────────"
if netstat -tlnp 2>/dev/null | grep -q ":9999"; then
    echo -e "${GREEN}✅ AI Handler${NC}          Running on port 9999"
else
    echo -e "${RED}❌ AI Handler${NC}          Not running"
    echo "   Fix: ./install-local.sh"
    ALL_OK=false
fi

if pgrep -f "ai_handler.py" > /dev/null; then
    echo -e "${GREEN}✅ Handler Process${NC}     Active"
else
    echo -e "${RED}❌ Handler Process${NC}     Not found"
    ALL_OK=false
fi

# Check Tailscale locally
if command -v tailscale > /dev/null 2>&1; then
    if tailscale status 2>/dev/null | grep -q "Connected"; then
        LOCAL_IP=$(tailscale ip -4 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✅ Tailscale${NC}           Connected ($LOCAL_IP)"
    else
        echo -e "${YELLOW}⚠️  Tailscale${NC}           Not connected"
        echo "   Run: sudo tailscale up"
    fi
else
    echo -e "${YELLOW}⚠️  Tailscale${NC}           Not installed"
fi

echo ""
echo -e "${YELLOW}VPS SYSTEM (webhook.amajungle.com)${NC}"
echo "────────────────────────────────────"

# Check VPS via curl
VPS_HEALTH=$(curl -s https://webhook.amajungle.com/health 2>/dev/null || echo "{}")
if echo "$VPS_HEALTH" | grep -q "healthy"; then
    VPS_VERSION=$(echo "$VPS_HEALTH" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✅ VPS Gateway${NC}         $VPS_VERSION"
else
    echo -e "${RED}❌ VPS Gateway${NC}         Not responding"
    ALL_OK=false
fi

VPS_ROOT=$(curl -s https://webhook.amajungle.com/ 2>/dev/null || echo "{}")
if echo "$VPS_ROOT" | grep -q "clients"; then
    CLIENTS=$(echo "$VPS_ROOT" | grep -o '"clients":[0-9]*' | cut -d: -f2)
    echo -e "${GREEN}✅ Client Count${NC}        $CLIENTS clients"
else
    echo -e "${YELLOW}⚠️  Client Info${NC}         Unavailable"
fi

echo ""
echo -e "${YELLOW}TELEGRAM BOT${NC}"
echo "────────────────────────────────────"
echo "Client ID: client_0b70f519a29c45c1"
echo "Webhook:   https://webhook.amajungle.com/webhook/client_0b70f519a29c45c1"
echo ""
echo "To enable AI: sudo /opt/openclaw/scripts/enable-ai-for-client.sh client_0b70f519a29c45c1"

echo ""
echo "════════════════════════════════════════════════════════════"
if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}✅ ALL SYSTEMS OPERATIONAL${NC}"
    echo ""
    echo "Test: Message your bot 'Tell me about your business'"
else
    echo -e "${RED}⚠️  SOME ISSUES FOUND${NC}"
    echo ""
    echo "Run ./install-local.sh to fix local issues"
    echo "Run ./deploy-vps.sh on VPS to fix gateway issues"
fi
echo "════════════════════════════════════════════════════════════"
echo ""
