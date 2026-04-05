#!/bin/bash
# setup-local.sh - Setup local OpenClaw machine to receive AI requests
# Run this on your LOCAL machine (not VPS)

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "OpenClaw AI Handler - Local Setup"
echo "==========================================${NC}"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is required${NC}"
    exit 1
fi

if ! command -v tailscale &> /dev/null; then
    echo -e "${YELLOW}Tailscale not found. Installing...${NC}"
    curl -fsSL https://tailscale.com/install.sh | sh
fi

# Check Tailscale status
echo ""
echo "Checking Tailscale connection..."
if ! tailscale status >/dev/null 2>&1; then
    echo -e "${YELLOW}Tailscale not connected. Starting...${NC}"
    sudo tailscale up
else
    echo -e "${GREEN}✓ Tailscale connected${NC}"
    tailscale status | head -5
fi

# Setup directories
WORKSPACE_DIR="$HOME/.openclaw/workspace"
TUNNEL_DIR="$WORKSPACE_DIR/ai-gateway"

mkdir -p "$TUNNEL_DIR"/{tunnel-server,logs,usage}

# Check if ai_handler.py exists
if [ ! -f "$TUNNEL_DIR/tunnel-server/ai_handler.py" ]; then
    echo ""
    echo -e "${YELLOW}ai_handler.py not found in $TUNNEL_DIR/tunnel-server/${NC}"
    echo "Please copy the ai-gateway folder to $WORKSPACE_DIR first"
    exit 1
fi

# Create systemd service for AI Handler
echo ""
echo "Creating systemd service..."

SERVICE_FILE="$HOME/.config/systemd/user/openclaw-ai-handler.service"
mkdir -p "$HOME/.config/systemd/user"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=OpenClaw AI Handler
After=network.target

[Service]
Type=simple
WorkingDirectory=$TUNNEL_DIR
Environment="PYTHONUNBUFFERED=1"
ExecStart=/usr/bin/python3 $TUNNEL_DIR/tunnel-server/ai_handler.py --port 8080 --host 0.0.0.0
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload

echo ""
echo -e "${GREEN}=========================================="
echo "Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "To start the AI Handler:"
echo ""
echo "  Option 1 - Run manually:"
echo "    python3 $TUNNEL_DIR/tunnel-server/ai_handler.py"
echo ""
echo "  Option 2 - Run as user service:"
echo "    systemctl --user enable openclaw-ai-handler"
echo "    systemctl --user start openclaw-ai-handler"
echo ""
echo "  Option 3 - Run with screen/tmux:"
echo "    screen -S ai-handler -d -m python3 $TUNNEL_DIR/tunnel-server/ai_handler.py"
echo ""
echo "To test:"
echo "  curl http://localhost:8080/health"
echo ""
echo "Make sure your VPS can connect via Tailscale:"
echo "  - Your Tailscale IP: $(tailscale ip -4 2>/dev/null || echo 'run: tailscale ip -4')"
echo "  - Your Tailscale hostname: $(tailscale status --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('Self',{}).get('HostName','unknown'))" 2>/dev/null || hostname)"
echo ""
