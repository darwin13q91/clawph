# Phase 1 AI Gateway - Setup Instructions

## 🎉 Phase 1 Complete!

All components of the AI-Enabled Multi-Tenant Gateway System have been built.

---

## 📁 Deliverables Created

```
/home/darwin/.openclaw/workspace/ai-gateway/
├── README.md              # Full documentation
├── QUICKREF.md            # Quick reference guide
├── install.sh             # One-command installer
│
├── gateway/               # VPS Components
│   ├── ai_gateway.py      # Main webhook receiver & classifier (27KB)
│   └── ai_config.json     # Gateway configuration
│
├── tunnel-server/         # Local Components
│   └── ai_handler.py      # AI processing handler (16KB)
│
├── clients/               # Per-Client Context System
│   ├── template_context.json
│   └── demo-restaurant/
│       ├── context.json   # Business configuration
│       ├── memory.json    # Conversation history
│       └── stats.json     # Token usage & costs
│
├── scripts/               # Setup & Utilities
│   ├── setup-tailscale-vps.sh    # Tailscale installation
│   ├── verify-tunnel.sh          # Tunnel verification
│   ├── deploy-gateway.sh         # Deploy AI Gateway
│   ├── setup-local.sh            # Local machine setup
│   ├── copy-to-vps.sh            # Helper to copy files
│   └── add-client.sh (created by deploy)
│
└── tests/                 # Testing Scripts
    ├── test-ai-gateway.sh        # End-to-end tests
    └── test-client-context.sh    # Context system tests
```

---

## 🚀 Setup Instructions

### Step 1: Copy Files to VPS

From your local machine:
```bash
cd ~/.openclaw/workspace/ai-gateway
./scripts/copy-to-vps.sh YOUR_VPS_IP root
```

### Step 2: Setup VPS

SSH into your VPS:
```bash
ssh root@YOUR_VPS_IP
cd /root/ai-gateway

# Install Tailscale and setup tunnel
./scripts/setup-tailscale-vps.sh

# Deploy the AI Gateway
./scripts/deploy-gateway.sh

# Verify tunnel connection
./scripts/verify-tunnel.sh
```

### Step 3: Setup Local Machine

On your local OpenClaw machine:
```bash
cd ~/.openclaw/workspace/ai-gateway
./scripts/setup-local.sh

# Start the AI Handler
python3 tunnel-server/ai_handler.py --port 8080
```

### Step 4: Add a Client

On VPS:
```bash
# Create new client
/opt/openclaw/scripts/add-client.sh mybusiness "My Business Name"

# Edit configuration
nano /opt/openclaw/clients/mybusiness/context.json

# Set bot token
echo "YOUR_BOT_TOKEN" > /opt/openclaw/secrets/mybusiness.token

# Set Telegram webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://YOUR_VPS_IP:8000/webhook/mybusiness"
```

---

## 🔧 Key Features Implemented

### 1. Tailscale Tunnel Setup ✅
- Automated Tailscale installation
- Headless auth key setup
- Systemd service for persistence
- Health check cron jobs
- Connection verification tools

### 2. AI Gateway Module ✅
- Webhook receiver for Telegram
- Intent classifier (simple vs complex)
- Tunnel client for local forwarding
- Per-client sub-agent spawning
- Error handling & graceful fallback
- Rate limiting per client

### 3. Per-Client Context System ✅
- Directory: `/opt/openclaw/clients/{client_id}/`
- `context.json` - Business info, FAQ, personality
- `memory.json` - Last 50 conversation messages
- `stats.json` - Message count, token usage, costs
- Full client isolation

### 4. Local OpenClaw Connector ✅
- Receives messages via Tailscale
- Loads client context
- Spawns AI sub-agents
- Returns replies to VPS
- Token usage tracking per client

### 5. Cost Control ✅
- Simple queries use pre-defined responses
- AI only for complex queries
- Configurable thresholds
- Per-client token tracking
- Rate limiting

---

## 📊 Architecture

```
User ──▶ Telegram ──▶ VPS Gateway ──▶ Tailscale ──▶ Local Handler ──▶ AI
                          │                                    │
                          ▼                                    ▼
                   ┌─────────────┐                    ┌─────────────┐
                   │   Context   │                    │  Sub-Agent  │
                   │   Memory    │                    │   Spawned   │
                   │   Stats     │                    │   Per Client│
                   └─────────────┘                    └─────────────┘
```

---

## 🧪 Testing

Run tests on VPS:
```bash
# End-to-end test
/opt/openclaw/scripts/test-ai-gateway.sh

# Context system test
/opt/openclaw/scripts/test-client-context.sh
```

---

## 📈 Monitoring

```bash
# Gateway health
curl http://localhost:8000/health

# Client stats
curl http://localhost:8000/stats/demo-restaurant

# View logs
/opt/openclaw/scripts/view-logs.sh
```

---

## 🔐 Security

- Bot tokens stored in `/opt/openclaw/secrets/` (mode 600)
- Tailscale provides encrypted tunnel
- Client isolation enforced
- Rate limiting prevents abuse
- No PII in logs (configurable)

---

## 📝 Next Steps (Phase 2)

1. **Integration with actual AI model** - Currently uses placeholder
2. **Web dashboard** - Visual client management
3. **Advanced analytics** - Usage graphs, cost projections
4. **Auto-scaling** - Handle high traffic
5. **Multi-model support** - Choose model per query type

---

## 📚 Documentation

- **README.md** - Full documentation
- **QUICKREF.md** - Quick reference for daily operations
- **Code comments** - Extensive inline documentation

All files are ready for deployment! 🚀
