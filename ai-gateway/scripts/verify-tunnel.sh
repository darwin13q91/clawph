#!/bin/bash
# verify-tunnel.sh - Verify Tailscale tunnel between VPS and local OpenClaw
# Run this on your VPS after setup-tailscale-vps.sh

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "OpenClaw AI Gateway - Tunnel Verification"
echo "==========================================${NC}"
echo ""

# Configuration
LOCAL_HOSTNAME="${1:-openclaw-local}"
LOCAL_PORT="${2:-8080}"
TEST_TIMEOUT=10

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

check_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Test 1: Tailscale service
echo "[1/6] Checking Tailscale service..."
if systemctl is-active --quiet tailscaled; then
    check_pass "Tailscale service is running"
else
    check_fail "Tailscale service is not running"
    echo "  Run: sudo systemctl start tailscaled"
fi

# Test 2: Tailscale IP
echo ""
echo "[2/6] Checking Tailscale IP..."
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "")
if [ -n "$TAILSCALE_IP" ]; then
    check_pass "Tailscale IP assigned: $TAILSCALE_IP"
    echo "$TAILSCALE_IP" > /opt/openclaw/secrets/tailscale-ip 2>/dev/null || true
else
    check_fail "No Tailscale IP assigned"
fi

# Test 3: Tailscale connectivity
echo ""
echo "[3/6] Checking Tailscale network connectivity..."
if tailscale status 2>/dev/null | grep -q "Connected"; then
    check_pass "Connected to Tailscale network"
else
    check_warn "Tailscale status unclear, checking ping..."
    if tailscale ping "$LOCAL_HOSTNAME" -c 1 -t 5 >/dev/null 2>&1; then
        check_pass "Can ping local machine"
    else
        check_fail "Cannot reach local machine via Tailscale"
    fi
fi

# Test 4: DNS resolution
echo ""
echo "[4/6] Checking DNS resolution..."
if host "$LOCAL_HOSTNAME" >/dev/null 2>&1 || nslookup "$LOCAL_HOSTNAME" >/dev/null 2>&1; then
    check_pass "Can resolve $LOCAL_HOSTNAME"
else
    check_warn "DNS resolution failed, will try IP directly"
fi

# Test 5: TCP connection to local OpenClaw
echo ""
echo "[5/6] Testing TCP connection to local OpenClaw..."
echo "  Target: ${LOCAL_HOSTNAME}:${LOCAL_PORT}"

# Try Tailscale Magic DNS first, then try to find IP
if timeout $TEST_TIMEOUT bash -c "</dev/tcp/${LOCAL_HOSTNAME}/${LOCAL_PORT}" 2>/dev/null; then
    check_pass "TCP connection to local OpenClaw successful"
    
    # Save working configuration
    cat > /opt/openclaw/secrets/tunnel-config.json << EOF
{
    "local_hostname": "$LOCAL_HOSTNAME",
    "local_port": $LOCAL_PORT,
    "vps_tailscale_ip": "$TAILSCALE_IP",
    "status": "connected",
    "verified_at": "$(date -Iseconds)"
}
EOF
else
    check_fail "Cannot connect to local OpenClaw"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Is the local machine connected to Tailscale?"
    echo "     Run on local: tailscale status"
    echo ""
    echo "  2. Is the tunnel-server running on local?"
    echo "     Run on local: curl http://localhost:$LOCAL_PORT/health"
    echo ""
    echo "  3. Check Tailscale ACLs - is the VPS allowed to connect?"
    echo "     Visit: https://login.tailscale.com/admin/acls"
    echo ""
    echo "  4. Try using IP instead of hostname:"
    LOCAL_IP=$(tailscale status | grep -v "^#" | grep -v "^$" | head -1 | awk '{print $1}' 2>/dev/null || echo "")
    if [ -n "$LOCAL_IP" ]; then
        echo "     Found potential local IP: $LOCAL_IP"
        echo "     Test: ./verify-tunnel.sh $LOCAL_IP $LOCAL_PORT"
    fi
fi

# Test 6: HTTP health check (if AI Gateway is deployed)
echo ""
echo "[6/6] Checking AI Gateway health..."
GATEWAY_PORT="${GATEWAY_PORT:-8000}"
if curl -sf http://localhost:$GATEWAY_PORT/health >/dev/null 2>&1; then
    check_pass "AI Gateway is responding"
    echo ""
    echo "Gateway health:"
    curl -s http://localhost:$GATEWAY_PORT/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:$GATEWAY_PORT/health
else
    check_warn "AI Gateway not responding (may not be deployed yet)"
    echo "  To deploy: ./deploy-gateway.sh"
fi

# Summary
echo ""
echo -e "${BLUE}=========================================="
echo "Verification Summary"
echo "==========================================${NC}"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo ""
    echo "Your tunnel is ready. Next:"
    echo "  1. Deploy the AI Gateway: ./deploy-gateway.sh"
    echo "  2. Add client configurations to /opt/openclaw/clients/"
    echo "  3. Configure Telegram webhooks to point to this VPS"
    exit 0
else
    echo -e "${YELLOW}⚠ Some checks failed. Please review the errors above.${NC}"
    exit 1
fi
