#!/bin/bash
# Install Local AI Handler as Systemd Service
# Run this on your laptop

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Local AI Handler - Systemd Install                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

cd /home/darwin/.openclaw/workspace/ai-gateway

# 1. Check dependencies
echo "[1/4] Checking dependencies..."
python3 -c "import aiohttp" 2>/dev/null || {
    echo "Installing aiohttp..."
    pip3 install aiohttp --user 2>/dev/null || pip3 install aiohttp --break-system-packages
}
echo -e "${GREEN}✅ Dependencies OK${NC}"

# 2. Fix logging handler
echo ""
echo "[2/4] Fixing logging..."
sed -i 's/logging.FileHandler/logging.handlers.RotatingFileHandler/g' tunnel-server/ai_handler.py
grep -q "import logging.handlers" tunnel-server/ai_handler.py || sed -i '1a import logging.handlers' tunnel-server/ai_handler.py
echo -e "${GREEN}✅ Fixed${NC}"

# 3. Install systemd service
echo ""
echo "[3/4] Installing service..."
cp ai-handler.service /tmp/ai-handler.service
sed -i "s|/home/darwin|$HOME|g" /tmp/ai-handler.service

# Try system install (may need sudo) or user install
if sudo cp /tmp/ai-handler.service /etc/systemd/system/ 2>/dev/null; then
    sudo systemctl daemon-reload
    sudo systemctl enable ai-handler
    sudo systemctl start ai-handler
    echo -e "${GREEN}✅ System service installed${NC}"
else
    # User service
    mkdir -p ~/.config/systemd/user/
    cp /tmp/ai-handler.service ~/.config/systemd/user/ai-handler.service
    systemctl --user daemon-reload
    systemctl --user enable ai-handler
    systemctl --user start ai-handler
    echo -e "${GREEN}✅ User service installed${NC}"
    echo "   (Run: systemctl --user status ai-handler)"
fi

# 4. Check status
echo ""
echo "[4/4] Checking status..."
sleep 2
if netstat -tlnp 2>/dev/null | grep -q ":9999"; then
    echo -e "${GREEN}✅ Handler listening on port 9999${NC}"
else
    echo -e "${RED}⚠️  Port 9999 not ready yet (check logs)${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ LOCAL HANDLER INSTALLED!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Commands:"
echo "  Check status: sudo systemctl status ai-handler"
echo "  View logs:    sudo journalctl -u ai-handler -f"
echo "  Restart:      sudo systemctl restart ai-handler"
echo ""
echo "Now run deploy-vps.sh on your VPS"
echo ""
