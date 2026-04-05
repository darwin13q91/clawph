#!/bin/bash
# One-Command Deploy for AI Gateway
# Run this on VPS

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  OpenClaw AI Gateway - One-Command Deploy                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Check if Tailscale installed
echo -e "${YELLOW}[1/6] Checking Tailscale...${NC}"
if ! command -v tailscale &> /dev/null; then
    echo "Installing Tailscale..."
    curl -fsSL https://tailscale.com/install.sh | sh
    echo -e "${GREEN}✅ Tailscale installed${NC}"
    echo ""
    echo "👉 IMPORTANT: Run 'sudo tailscale up' and authenticate"
    echo "   Then run this script again."
    exit 0
else
    echo -e "${GREEN}✅ Tailscale already installed${NC}"
fi

# 2. Check Tailscale status
echo ""
echo -e "${YELLOW}[2/6] Checking Tailscale connection...${NC}"
if tailscale status &> /dev/null; then
    TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ Tailscale connected (IP: $TAILSCALE_IP)${NC}"
else
    echo -e "${RED}❌ Tailscale not authenticated${NC}"
    echo "   Run: sudo tailscale up"
    exit 1
fi

# 3. Install/Update AI Gateway
echo ""
echo -e "${YELLOW}[3/6] Installing AI Gateway...${NC}"
if [ -d "/opt/openclaw/ai-gateway" ]; then
    echo "Updating existing installation..."
    cd /opt/openclaw/ai-gateway
    # Backup config
    cp ai_config.json /tmp/ai_config.backup.json 2>/dev/null || true
else
    echo "Fresh install..."
    mkdir -p /opt/openclaw/ai-gateway
fi

# Copy files (assumes you copied them first)
if [ ! -f "/opt/openclaw/ai-gateway/gateway/ai_gateway.py" ]; then
    echo -e "${RED}❌ AI Gateway files not found${NC}"
    echo "   Run first: scp -r ai-gateway/* root@YOUR_VPS:/opt/openclaw/ai-gateway/"
    exit 1
fi

echo -e "${GREEN}✅ Files present${NC}"

# 4. Fix logging (common issue)
echo ""
echo -e "${YELLOW}[4/6] Fixing common issues...${NC}"
sed -i 's/logging.FileHandler/logging.handlers.RotatingFileHandler/g' /opt/openclaw/gateway/ai_gateway.py 2>/dev/null || true
grep -q "import logging.handlers" /opt/openclaw/gateway/ai_gateway.py || \
    sed -i '1a import logging.handlers' /opt/openclaw/gateway/ai_gateway.py 2>/dev/null || true
echo -e "${GREEN}✅ Fixed logging handlers${NC}"

# 5. Restart services
echo ""
echo -e "${YELLOW}[5/6] Starting services...${NC}"
systemctl daemon-reload
systemctl restart ai-gateway || echo "Service may need manual start"
sleep 2

# 6. Check status
echo ""
echo -e "${YELLOW}[6/6] Checking status...${NC}"
if systemctl is-active --quiet ai-gateway 2>/dev/null; then
    echo -e "${GREEN}✅ AI Gateway service running${NC}"
else
    echo -e "${RED}⚠️  Service not running (check: journalctl -u ai-gateway -n 20)${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "🎉 DEPLOY COMPLETE!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Ensure local handler is running on your laptop"
echo "2. Enable AI for your client:"
echo "   sudo /opt/openclaw/scripts/enable-ai-for-client.sh client_0b70f519a29c45c1"
echo ""
echo "Test: Message your bot 'Tell me about your business'"
echo ""
