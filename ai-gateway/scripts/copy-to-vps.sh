#!/bin/bash
# copy-to-vps.sh - Helper script to copy ai-gateway files to VPS
# Run this from your local machine

if [ $# -lt 1 ]; then
    echo "Usage: $0 <VPS_IP> [SSH_USER] [SSH_KEY]"
    echo "Example: $0 192.168.1.100 root ~/.ssh/id_rsa"
    exit 1
fi

VPS_IP="$1"
SSH_USER="${2:-root}"
SSH_KEY="${3:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
if [ -n "$SSH_KEY" ]; then
    SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
fi

echo "Copying AI Gateway files to $SSH_USER@$VPS_IP..."
echo ""

# Create archive
cd "$PARENT_DIR"
tar czf /tmp/ai-gateway.tar.gz --exclude='*.pyc' --exclude='__pycache__' --exclude='.git' .

# Copy to VPS
scp $SSH_OPTS /tmp/ai-gateway.tar.gz "$SSH_USER@$VPS_IP:/tmp/"

# Extract on VPS
echo "Extracting on VPS..."
ssh $SSH_OPTS "$SSH_USER@$VPS_IP" "mkdir -p /root/ai-gateway && cd /root/ai-gateway && tar xzf /tmp/ai-gateway.tar.gz && rm /tmp/ai-gateway.tar.gz"

# Cleanup
rm /tmp/ai-gateway.tar.gz

echo ""
echo "✓ Files copied to /root/ai-gateway on VPS"
echo ""
echo "Next steps on VPS:"
echo "  ssh $SSH_USER@$VPS_IP"
echo "  cd /root/ai-gateway"
echo "  sudo ./scripts/setup-tailscale-vps.sh"
echo "  sudo ./scripts/deploy-gateway.sh"
