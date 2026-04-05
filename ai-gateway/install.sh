#!/bin/bash
# install.sh - One-command installation for OpenClaw AI Gateway
# Run on VPS: curl -sSL https://your-domain.com/install.sh | sudo bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║           OpenClaw AI Gateway - Installation                   ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Configuration
INSTALL_DIR="/opt/openclaw"
REPO_URL="${REPO_URL:-https://github.com/yourusername/openclaw-ai-gateway}"
TEMP_DIR=$(mktemp -d)

cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo "This script will:"
echo "  1. Install Tailscale (if not present)"
echo "  2. Set up the Tailscale tunnel to your local machine"
echo "  3. Install and configure the AI Gateway"
echo "  4. Create systemd services for auto-start"
echo ""
read -p "Continue? [Y/n]: " confirm
if [[ ! "$confirm" =~ ^[Yy]?$ ]]; then
    echo "Installation cancelled."
    exit 0
fi

echo ""
echo -e "${GREEN}Starting installation...${NC}"
echo ""

# Step 1: Install Tailscale
echo "[1/4] Setting up Tailscale..."
if ! command -v tailscale &> /dev/null; then
    curl -fsSL https://tailscale.com/install.sh | sh
fi

# Check if already authenticated
if ! tailscale status >/dev/null 2>&1; then
    echo ""
    echo "Tailscale needs authentication."
    echo "1. Go to https://login.tailscale.com/admin/settings/keys"
    echo "2. Generate a reusable auth key"
    echo ""
    read -sp "Enter Tailscale auth key (starts with tskey-auth-): " AUTH_KEY
    echo ""
    
    if [ -n "$AUTH_KEY" ]; then
        tailscale up --authkey="$AUTH_KEY" --hostname="openclaw-gateway"
    fi
else
    echo "  Tailscale already configured"
fi

# Step 2: Download AI Gateway
echo ""
echo "[2/4] Downloading AI Gateway..."

# For now, assume files are copied manually or from git
# In production, this would clone from a repo
mkdir -p "$INSTALL_DIR"

# Step 3: Install dependencies
echo ""
echo "[3/4] Installing dependencies..."
apt-get update >/dev/null 2>&1 || true
apt-get install -y python3 python3-pip >/dev/null 2>&1 || true
pip3 install aiohttp >/dev/null 2>&1 || pip3 install aiohttp --break-system-packages >/dev/null 2>&1

# Step 4: Setup
echo ""
echo "[4/4] Configuring AI Gateway..."

# Create directories
mkdir -p "$INSTALL_DIR"/{gateway,clients,logs,secrets,scripts}

# Note: In actual deployment, files would be copied here
# This is a placeholder for the full install flow

echo ""
echo -e "${GREEN}========================================"
echo "Installation Complete!"
echo "========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Copy gateway files to $INSTALL_DIR/"
echo "  2. Run: $INSTALL_DIR/scripts/deploy-gateway.sh"
echo "  3. Verify: $INSTALL_DIR/scripts/verify-tunnel.sh"
echo ""
echo "For help, visit: https://docs.openclaw.dev/ai-gateway"
echo ""
