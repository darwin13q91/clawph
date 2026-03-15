# OpenClaw AI Gateway - Quick Reference

## Installation (One-Time)

### VPS Setup
```bash
# Copy files to VPS
./scripts/copy-to-vps.sh YOUR_VPS_IP root

# SSH to VPS and install
ssh root@YOUR_VPS_IP
cd /root/ai-gateway
sudo ./scripts/setup-tailscale-vps.sh    # Install Tailscale
sudo ./scripts/deploy-gateway.sh         # Deploy gateway
sudo ./scripts/verify-tunnel.sh          # Verify connection
```

### Local Machine Setup
```bash
cd ~/.openclaw/workspace/ai-gateway
./scripts/setup-local.sh                 # Setup local handler
python3 tunnel-server/ai_handler.py      # Start handler
```

---

## Daily Operations

### Start/Stop Services

**VPS (Gateway):**
```bash
sudo systemctl start ai-gateway
sudo systemctl stop ai-gateway
sudo systemctl restart ai-gateway
sudo systemctl status ai-gateway
```

**Local (Handler):**
```bash
# As user service
systemctl --user start openclaw-ai-handler
systemctl --user stop openclaw-ai-handler

# Or manually
python3 tunnel-server/ai_handler.py
```

### View Logs

```bash
# VPS Gateway logs
sudo /opt/openclaw/scripts/view-logs.sh
sudo tail -f /opt/openclaw/logs/ai_gateway.log

# Local Handler logs
tail -f ~/.openclaw/workspace/logs/ai_handler.log

# Systemd logs
sudo journalctl -u ai-gateway -f
```

---

## Client Management

### Add New Client

```bash
sudo /opt/openclaw/scripts/add-client.sh client-id "Business Name"

# Example:
sudo /opt/openclaw/scripts/add-client.sh joes-pizza "Joe's Pizza"
```

### Configure Client

```bash
# Edit context
sudo nano /opt/openclaw/clients/client-id/context.json

# Set bot token
echo "YOUR_BOT_TOKEN" | sudo tee /opt/openclaw/secrets/client-id.token
```

### Set Telegram Webhook

```bash
CLIENT_ID="your-client-id"
TOKEN="your-bot-token"
VPS_IP="your-vps-ip"

curl -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  -d "url=https://${VPS_IP}:8000/webhook/${CLIENT_ID}"

# Verify webhook
curl "https://api.telegram.org/bot${TOKEN}/getWebhookInfo"
```

---

## Monitoring

### Check Health

```bash
# Gateway health
curl http://localhost:8000/health

# Handler health (from VPS)
curl http://openclaw-local:8080/health
```

### View Stats

```bash
# Client stats
curl http://localhost:8000/stats/client-id

# All clients
ls -la /opt/openclaw/clients/
```

### Test Connectivity

```bash
# From VPS
sudo /opt/openclaw/scripts/verify-tunnel.sh
sudo /opt/openclaw/scripts/test-ai-gateway.sh

# Manual tunnel test
tailscale ping openclaw-local
nc -zv openclaw-local 8080
```

---

## Troubleshooting

### Gateway Won't Start

```bash
# Check for errors
sudo journalctl -u ai-gateway -n 50

# Check Python dependencies
sudo pip3 install aiohttp

# Verify config
python3 -c "import json; json.load(open('/opt/openclaw/gateway/ai_config.json'))"
```

### Tunnel Down

```bash
# Check Tailscale
sudo tailscale status

# Restart Tailscale
sudo systemctl restart tailscaled

# Re-authenticate if needed
sudo tailscale up --authkey=$(cat /opt/openclaw/secrets/tailscale-auth-key)
```

### Telegram Not Receiving Messages

```bash
# Check webhook
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# Delete and re-set webhook
curl https://api.telegram.org/bot<TOKEN>/deleteWebhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://VPS_IP:8000/webhook/CLIENT_ID"

# Check gateway is receiving
curl http://localhost:8000/health
```

### High Token Usage

```bash
# Check per-client stats
for client in /opt/openclaw/clients/*/; do
    echo "=== $(basename $client) ==="
    cat "$client/stats.json"
done

# Adjust rate limits in context.json
# Set ai_settings.enabled = false for simple-only responses
```

---

## File Locations

| Component | Path |
|-----------|------|
| Gateway config | `/opt/openclaw/gateway/ai_config.json` |
| Client contexts | `/opt/openclaw/clients/{id}/context.json` |
| Client memory | `/opt/openclaw/clients/{id}/memory.json` |
| Client stats | `/opt/openclaw/clients/{id}/stats.json` |
| Bot tokens | `/opt/openclaw/secrets/{id}.token` |
| Gateway logs | `/opt/openclaw/logs/ai_gateway.log` |
| Scripts | `/opt/openclaw/scripts/` |

---

## Useful Commands

```bash
# Reload gateway after config changes
sudo systemctl restart ai-gateway

# Check all clients
ls /opt/openclaw/clients/

# View a client's conversation history
sudo cat /opt/openclaw/clients/client-id/memory.json | python3 -m json.tool

# Reset client stats
sudo echo '{"message_count":0,"ai_calls":0,"simple_responses":0,"errors":0,"tokens_used":0,"estimated_cost":0}' \
  > /opt/openclaw/clients/client-id/stats.json

# Monitor live logs
sudo tail -f /opt/openclaw/logs/ai_gateway.log | grep "client-id"

# Test webhook locally
curl -X POST http://localhost:8000/webhook/client-id \
  -H "Content-Type: application/json" \
  -d '{"message":{"text":"hello","chat":{"id":123},"from":{"id":456}}}'
```
