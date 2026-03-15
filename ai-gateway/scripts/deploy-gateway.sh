#!/bin/bash
# deploy-gateway.sh - Deploy AI Gateway to VPS
# Run this on your VPS after setup-tailscale-vps.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run as root (use sudo)"
fi

echo -e "${BLUE}=========================================="
echo "OpenClaw AI Gateway - Deployment"
echo "==========================================${NC}"
echo ""

# Configuration
INSTALL_DIR="/opt/openclaw"
GATEWAY_PORT="${GATEWAY_PORT:-8000}"
SOURCE_DIR="${1:-/root/ai-gateway}"

# Step 1: Check prerequisites
log "[1/8] Checking prerequisites..."

# Check Python
if ! command -v python3 &> /dev/null; then
    error "Python 3 is required but not installed"
fi

PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1-2)
log "  Python version: $PYTHON_VERSION"

# Check pip
if ! command -v pip3 &> /dev/null; then
    log "Installing pip3..."
    apt-get update &>/dev/null
    apt-get install -y python3-pip &>/dev/null
fi

# Step 2: Create directory structure
log "[2/8] Creating directory structure..."
mkdir -p "$INSTALL_DIR"/{gateway,clients,logs,secrets,scripts}

# Step 3: Install Python dependencies
log "[3/8] Installing Python dependencies..."
pip3 install aiohttp >/dev/null 2>&1 || pip3 install aiohttp --break-system-packages >/dev/null 2>&1

# Step 4: Copy gateway files
log "[4/8] Copying gateway files..."

if [ -d "$SOURCE_DIR/gateway" ]; then
    cp "$SOURCE_DIR/gateway/ai_gateway.py" "$INSTALL_DIR/gateway/"
    cp "$SOURCE_DIR/gateway/ai_config.json" "$INSTALL_DIR/gateway/"
    chmod +x "$INSTALL_DIR/gateway/ai_gateway.py"
else
    # Look in current directory
    if [ -f "gateway/ai_gateway.py" ]; then
        cp gateway/ai_gateway.py "$INSTALL_DIR/gateway/"
        cp gateway/ai_config.json "$INSTALL_DIR/gateway/"
        chmod +x "$INSTALL_DIR/gateway/ai_gateway.py"
    else
        error "Gateway files not found. Please run from ai-gateway directory."
    fi
fi

# Copy scripts
if [ -d "$SOURCE_DIR/scripts" ]; then
    cp "$SOURCE_DIR/scripts/"*.sh "$INSTALL_DIR/scripts/"
    chmod +x "$INSTALL_DIR/scripts/"*.sh
fi

# Copy tests
if [ -d "$SOURCE_DIR/tests" ]; then
    cp "$SOURCE_DIR/tests/"*.sh "$INSTALL_DIR/scripts/"
    chmod +x "$INSTALL_DIR/scripts/"*.sh
fi

# Step 5: Copy client templates
log "[5/8] Setting up client templates..."
if [ -d "$SOURCE_DIR/clients" ]; then
    cp "$SOURCE_DIR/clients/template_context.json" "$INSTALL_DIR/clients/"
    
    # Copy demo client if exists
    if [ -d "$SOURCE_DIR/clients/demo-restaurant" ]; then
        cp -r "$SOURCE_DIR/clients/demo-restaurant" "$INSTALL_DIR/clients/"
    fi
fi

# Step 6: Create systemd service
log "[6/8] Creating systemd service..."

cat > /etc/systemd/system/ai-gateway.service << EOF
[Unit]
Description=OpenClaw AI Gateway
After=network.target tailscaled.service
Wants=tailscaled.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/gateway
Environment="PYTHONUNBUFFERED=1"
Environment="GATEWAY_PORT=$GATEWAY_PORT"
ExecStart=/usr/bin/python3 $INSTALL_DIR/gateway/ai_gateway.py --port $GATEWAY_PORT
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

# Step 7: Create helper scripts
log "[7/8] Creating helper scripts..."

# Add client script
cat > "$INSTALL_DIR/scripts/add-client.sh" << 'EOF'
#!/bin/bash
# Add a new client to the AI Gateway

if [ $# -lt 2 ]; then
    echo "Usage: $0 <client-id> <business-name>"
    echo "Example: $0 joes-coffee \"Joe's Coffee Shop\""
    exit 1
fi

CLIENT_ID="$1"
BUSINESS_NAME="$2"
CLIENT_DIR="/opt/openclaw/clients/$CLIENT_ID"

if [ -d "$CLIENT_DIR" ]; then
    echo "Error: Client '$CLIENT_ID' already exists"
    exit 1
fi

mkdir -p "$CLIENT_DIR"

# Create context.json from template
cat > "$CLIENT_DIR/context.json" << EOJSON
{
  "client_id": "$CLIENT_ID",
  "business_name": "$BUSINESS_NAME",
  "business_type": "general",
  "description": "",
  "personality": "friendly, professional, helpful",
  "language": "en",
  "timezone": "UTC",
  
  "knowledge_base": {
    "hours": "",
    "address": "",
    "phone": "",
    "email": "",
    "website": "",
    "specialties": [],
    "services": [],
    "policies": ""
  },
  
  "common_qa": {
    "greeting": "Hello! Welcome to $BUSINESS_NAME! How can I help you today?",
    "goodbye": "Thank you for chatting with us! Have a great day!",
    "thanks_response": "You're welcome! Is there anything else I can help with?"
  },
  
  "ai_settings": {
    "enabled": true,
    "model": "kimi-coding/k2p5",
    "temperature": 0.7,
    "max_tokens": 2000
  },
  
  "escalation": {
    "enabled": true,
    "human_handoff_phrases": ["speak to human", "talk to person", "real person"],
    "escalation_message": "I'll connect you with a team member. Please hold on..."
  }
}
EOJSON

# Create empty memory.json
echo "[]" > "$CLIENT_DIR/memory.json"

# Create stats.json
cat > "$CLIENT_DIR/stats.json" << EOJSON
{
  "message_count": 0,
  "ai_calls": 0,
  "simple_responses": 0,
  "errors": 0,
  "last_message_at": null,
  "tokens_used": 0,
  "estimated_cost": 0.0
}
EOJSON

echo "✓ Client '$CLIENT_ID' created successfully!"
echo ""
echo "Next steps:"
echo "  1. Edit context: nano $CLIENT_DIR/context.json"
echo "  2. Set bot token: echo 'YOUR_BOT_TOKEN' > /opt/openclaw/secrets/${CLIENT_ID}.token"
echo "  3. Set webhook: curl -X POST 'https://api.telegram.org/bot<TOKEN>/setWebhook' \\"
echo "       -d 'url=https://$(curl -s ifconfig.io):8000/webhook/$CLIENT_ID'"
EOF
chmod +x "$INSTALL_DIR/scripts/add-client.sh"

# View logs script
cat > "$INSTALL_DIR/scripts/view-logs.sh" << 'EOF'
#!/bin/bash
# View AI Gateway logs

if [ "$1" == "-f" ]; then
    tail -f /opt/openclaw/logs/ai_gateway.log
else
    tail -n 100 /opt/openclaw/logs/ai_gateway.log
fi
EOF
chmod +x "$INSTALL_DIR/scripts/view-logs.sh"

# Step 8: Start service
log "[8/8] Starting AI Gateway service..."

systemctl enable ai-gateway

if systemctl start ai-gateway; then
    log "✓ Service started successfully"
else
    error "Failed to start service. Check: journalctl -u ai-gateway -n 50"
fi

# Wait for startup
sleep 2

# Verify
if systemctl is-active --quiet ai-gateway; then
    log "✓ AI Gateway is running"
else
    error "Service failed to start. Check logs: journalctl -u ai-gateway -n 50"
fi

# Summary
echo ""
echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "AI Gateway is running on port $GATEWAY_PORT"
echo ""
echo "Useful commands:"
echo "  - Check status:  systemctl status ai-gateway"
echo "  - View logs:     /opt/openclaw/scripts/view-logs.sh"
echo "  - Restart:       systemctl restart ai-gateway"
echo "  - Stop:          systemctl stop ai-gateway"
echo ""
echo "To add a new client:"
echo "  /opt/openclaw/scripts/add-client.sh <client-id> <business-name>"
echo ""
echo "To run tests:"
echo "  /opt/openclaw/scripts/test-ai-gateway.sh"
echo "  /opt/openclaw/scripts/test-client-context.sh"
echo ""
