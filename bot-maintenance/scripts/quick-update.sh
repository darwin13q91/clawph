#!/bin/bash
# Quick System Update
# Run this for fast security/critical updates

set -e

echo "🚀 Quick System Update"
echo "======================"
echo ""

echo "[1/4] Updating package lists..."
sudo apt update -qq

echo "[2/4] Upgrading packages..."
sudo apt upgrade -y -qq

echo "[3/4] Cleaning up..."
sudo apt autoremove -y -qq
sudo apt autoclean -qq

echo "[4/4] Checking Docker..."
if command -v docker >/dev/null; then
    docker system prune -f >/dev/null 2>&1 || true
fi

echo ""
echo "✅ Quick update complete!"
echo "Run 'maintenance.sh' for full maintenance."
