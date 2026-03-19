# OpenClaw AI-Enabled Multi-Tenant Gateway System

Phase 1 Implementation - Connects VPS Telegram bots to local OpenClaw with per-client sub-agents.

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Telegram   │────▶│  VPS Gateway │────▶│  Tailscale      │
│   Users     │     │  ai_gateway  │     │   Tunnel        │
└─────────────┘     └──────────────┘     └─────────────────┘
                            │                       │
                            ▼                       ▼
                   ┌──────────────┐      ┌─────────────────┐
                   │ Per-Client   │      │  Local OpenClaw │
                   │   Context    │      │   ai_handler    │
                   └──────────────┘      └─────────────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │  AI Sub-Agent   │
                                          │  (Per Client)   │
                                          └─────────────────┘
```

## Components

### 1. VPS Components (Remote)

| File | Purpose |
|------|---------|
| `gateway/ai_gateway.py` | Main webhook receiver, message classifier, tunnel client |
| `gateway/ai_config.json` | Gateway configuration |
| `clients/{id}/context.json` | Per-client business info, personality |
| `clients/{id}/memory.json` | Conversation history (last 50 messages) |
| `clients/{id}/stats.json` | Usage statistics, token costs |
| `scripts/setup-tailscale-vps.sh` | Install Tailscale on VPS |
| `scripts/verify-tunnel.sh` | Verify tunnel connection |
| `scripts/deploy-gateway.sh` | Deploy the AI Gateway service |

### 2. Local Components (Your Machine)

| File | Purpose |
|------|---------|
| `tunnel-server/ai_handler.py` | Receives messages from VPS, spawns sub-agents |
| `logs/ai_handler.log` | Processing logs |

## Quick Start

### Step 1: VPS Setup

On your VPS, run:

```bash
# 1. Copy the ai-gateway folder to your VPS
scp -r ai-gateway/ root@your-vps-ip:/root/

# 2. SSH into VPS and run setup
ssh root@your-vps-ip
cd /root/ai-gateway

# 3. Install Tailscale and setup tunnel
sudo ./scripts/setup-tailscale-vps.sh

# 4. Deploy the AI Gateway
sudo ./scripts/deploy-gateway.sh

# 5. Verify tunnel connection
sudo ./scripts/verify-tunnel.sh
```

### Step 2: Local Machine Setup

On your local machine (where OpenClaw runs):

```bash
# 1. Ensure Tailscale is installed and connected
tailscale status

# 2. Start the AI Handler
cd ~/.openclaw/workspace/ai-gateway
python3 tunnel-server/ai_handler.py --port 8080
```

### Step 3: Add a Client

```bash
# On VPS:
sudo /opt/openclaw/scripts/add-client.sh mybusiness "My Business Name"

# Edit the context:
sudo nano /opt/openclaw/clients/mybusiness/context.json

# Set the bot token:
echo "YOUR_BOT_TOKEN" | sudo tee /opt/openclaw/secrets/mybusiness.token

# Set Telegram webhook:
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-vps-ip:8000/webhook/mybusiness"
```

## Client Context Configuration

Each client has a `context.json` with:

```json
{
  "client_id": "mybusiness",
  "business_name": "My Business",
  "business_type": "restaurant",
  "personality": "friendly, professional",
  
  "knowledge_base": {
    "hours": "Mon-Sat 9AM-9PM",
    "address": "123 Main St",
    "phone": "(555) 123-4567"
  },
  
  "common_qa": {
    "greeting": "Hello! Welcome!",
    "hours": "We're open Mon-Sat 9AM-9PM"
  },
  
  "ai_settings": {
    "enabled": true,
    "model": "kimi-coding/k2p5"
  }
}
```

## Message Flow

1. **User sends message** → Telegram
2. **Webhook triggered** → VPS Gateway
3. **Intent classification** → Simple or Complex?
4. **Simple query** → Respond from context immediately
5. **Complex query** → Forward via Tailscale tunnel
6. **Local handler** → Spawn AI sub-agent
7. **AI processing** → Generate response
8. **Response returned** → VPS → Telegram user

## Cost Control

- Simple queries (greetings, hours, location) use pre-defined responses
- AI only invoked for complex queries
- Per-client token tracking in `stats.json`
- Configurable rate limiting per client

## Monitoring

```bash
# View gateway logs
sudo /opt/openclaw/scripts/view-logs.sh

# Check service status
sudo systemctl status ai-gateway

# View client stats
curl http://localhost:8000/stats/mybusiness

# Test the gateway
sudo /opt/openclaw/scripts/test-ai-gateway.sh
```

## File Structure

```
/opt/openclaw/
├── gateway/
│   ├── ai_gateway.py       # Main gateway script
│   └── ai_config.json      # Gateway config
├── clients/
│   ├── template_context.json
│   └── {client_id}/
│       ├── context.json    # Business config
│       ├── memory.json     # Chat history
│       └── stats.json      # Usage stats
├── logs/
│   └── ai_gateway.log
├── secrets/
│   ├── tailscale-auth-key
│   └── {client_id}.token   # Bot tokens
└── scripts/
    ├── setup-tailscale-vps.sh
    ├── verify-tunnel.sh
    ├── deploy-gateway.sh
    ├── add-client.sh
    ├── view-logs.sh
    └── test-*.sh
```

## Security Considerations

- Bot tokens stored in `/opt/openclaw/secrets/` (mode 600)
- Tailscale provides encrypted tunnel
- No PII in logs (configurable)
- Client isolation enforced
- Rate limiting per client

## Troubleshooting

### Tunnel Connection Issues

```bash
# Check Tailscale status
tailscale status

# Ping local machine from VPS
tailscale ping openclaw-local

# Test TCP connection
nc -zv openclaw-local 8080
```

### Gateway Not Responding

```bash
# Check logs
sudo journalctl -u ai-gateway -n 50

# Restart service
sudo systemctl restart ai-gateway

# Test locally
curl http://localhost:8000/health
```

### Telegram Webhook Issues

```bash
# Check webhook status
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# Delete and reset webhook
curl https://api.telegram.org/bot<TOKEN>/deleteWebhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-vps:8000/webhook/client-id"
```

## License

MIT License - See LICENSE file for details.
