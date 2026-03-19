#!/bin/bash
# setup-tailscale-vps.sh - Install and configure Tailscale on VPS for OpenClaw AI Gateway
# Run this on your VPS

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/openclaw-tailscale-setup.log"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARN: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root (use sudo)"
fi

log "Starting Tailscale setup for OpenClaw AI Gateway..."

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    error "Cannot detect OS"
fi

log "Detected OS: $OS $VERSION"

# Install Tailscale if not present
if command -v tailscale &> /dev/null; then
    log "Tailscale is already installed: $(tailscale version | head -1)"
else
    log "Installing Tailscale..."
    case $OS in
        ubuntu|debian)
            curl -fsSL https://pkgs.tailscale.com/stable/${ID}/${VERSION_ID}.noarmor.gpg | tee /usr/share/keyrings/tailscale-archive-keyring.gpg > /dev/null
            curl -fsSL https://pkgs.tailscale.com/stable/${ID}/${VERSION_ID}.tailscale-keyring.list | tee /etc/apt/sources.list.d/tailscale.list
            apt-get update
            apt-get install -y tailscale
            ;;
        centos|rhel|fedora|rocky|almalinux)
            if [ "$OS" = "fedora" ]; then
                dnf config-manager --add-repo https://pkgs.tailscale.com/stable/fedora/tailscale.repo
            else
                yum-config-manager --add-repo https://pkgs.tailscale.com/stable/centos/tailscale.repo
            fi
            dnf install -y tailscale
            ;;
        *)
            error "Unsupported OS: $OS"
            ;;
    esac
    log "Tailscale installed successfully"
fi

# Create OpenClaw directories
log "Creating OpenClaw directory structure..."
mkdir -p /opt/openclaw/{gateway,clients,logs,secrets}
chmod 750 /opt/openclaw/secrets

# Check for auth key
AUTH_KEY_FILE="/opt/openclaw/secrets/tailscale-auth-key"
if [ -f "$AUTH_KEY_FILE" ]; then
    log "Found existing auth key file"
    AUTH_KEY=$(cat "$AUTH_KEY_FILE")
else
    warn "No auth key file found at $AUTH_KEY_FILE"
    echo ""
    echo "=========================================="
    echo "ACTION REQUIRED: Generate Tailscale Auth Key"
    echo "=========================================="
    echo "1. Go to https://login.tailscale.com/admin/settings/keys"
    echo "2. Click 'Generate auth key'"
    echo "3. Enable: Reusable, Ephemeral (optional)"
    echo "4. Copy the key (starts with 'tskey-auth-')"
    echo ""
    read -sp "Paste your Tailscale auth key: " AUTH_KEY
    echo ""
    
    if [ -z "$AUTH_KEY" ]; then
        error "No auth key provided"
    fi
    
    echo "$AUTH_KEY" > "$AUTH_KEY_FILE"
    chmod 600 "$AUTH_KEY_FILE"
    log "Auth key saved to $AUTH_KEY_FILE"
fi

# Determine hostname
HOSTNAME="${TAILSCALE_HOSTNAME:-openclaw-gateway}"
log "Using hostname: $HOSTNAME"

# Start and authenticate Tailscale
log "Starting Tailscale..."
systemctl enable --now tailscaled

log "Authenticating with Tailscale..."
if tailscale up --authkey="$AUTH_KEY" --hostname="$HOSTNAME" --accept-routes 2>&1 | tee -a "$LOG_FILE"; then
    log "Tailscale authenticated successfully"
else
    error "Failed to authenticate Tailscale"
fi

# Wait for connection
log "Waiting for Tailscale connection..."
sleep 3

# Get Tailscale IP
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "")
if [ -n "$TAILSCALE_IP" ]; then
    log "Tailscale IP: $TAILSCALE_IP"
    echo "$TAILSCALE_IP" > /opt/openclaw/secrets/tailscale-ip
else
    warn "Could not get Tailscale IP immediately"
fi

# Create systemd override for persistent connection
log "Creating systemd service configuration..."
mkdir -p /etc/systemd/system/tailscaled.service.d/
cat > /etc/systemd/system/tailscaled.service.d/openclaw-override.conf << 'EOF'
[Service]
# Ensure Tailscale reconnects on boot
Restart=always
RestartSec=5

# Increase timeout for slow networks
TimeoutStartSec=60

# Environment for OpenClaw
Environment="TAILSCALE_DAEMON_ARGS=--tun=userspace-networking"
EOF

systemctl daemon-reload
systemctl restart tailscaled

# Create status check script
cat > /opt/openclaw/scripts/check-tailscale.sh << 'EOF'
#!/bin/bash
# Check Tailscale status

if systemctl is-active --quiet tailscaled; then
    echo "✓ Tailscale service is running"
    tailscale status
    echo ""
    echo "Tailscale IP: $(tailscale ip -4)"
else
    echo "✗ Tailscale service is not running"
    exit 1
fi
EOF
chmod +x /opt/openclaw/scripts/check-tailscale.sh

# Create connection test script
cat > /opt/openclaw/scripts/test-local-connection.sh << 'EOF'
#!/bin/bash
# Test connection to local OpenClaw via Tailscale

LOCAL_HOST="${1:-openclaw-local}"
LOCAL_PORT="${2:-8080}"

echo "Testing connection to local OpenClaw at ${LOCAL_HOST}:${LOCAL_PORT}..."

if timeout 5 bash -c "</dev/tcp/${LOCAL_HOST}/${LOCAL_PORT}" 2>/dev/null; then
    echo "✓ Connection successful!"
    exit 0
else
    echo "✗ Connection failed"
    echo "Make sure:"
    echo "  1. Local machine is connected to Tailscale"
    echo "  2. Local OpenClaw tunnel-server is running"
    echo "  3. Firewall allows port ${LOCAL_PORT}"
    exit 1
fi
EOF
chmod +x /opt/openclaw/scripts/test-local-connection.sh

# Create cron job for health check
log "Setting up health check cron job..."
echo "*/5 * * * * root /opt/openclaw/scripts/check-tailscale.sh >/dev/null 2>&1 || systemctl restart tailscaled" > /etc/cron.d/openclaw-tailscale

log "=========================================="
log "Tailscale Setup Complete!"
log "=========================================="
echo ""
echo "Next steps:"
echo "  1. Approve this machine in your Tailscale admin console"
echo "  2. Note your Tailscale IP: $(tailscale ip -4 2>/dev/null || echo 'run: tailscale ip -4')"
echo "  3. Run ./verify-tunnel.sh to test the connection"
echo "  4. Deploy the AI Gateway: ./deploy-gateway.sh"
echo ""
echo "Useful commands:"
echo "  - Check status: tailscale status"
echo "  - View logs: journalctl -u tailscaled -f"
echo "  - Test connection: /opt/openclaw/scripts/test-local-connection.sh <local-hostname>"
