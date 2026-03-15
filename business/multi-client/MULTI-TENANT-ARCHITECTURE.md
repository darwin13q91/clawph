# Multi-Tenant Telegram Bot Architecture
## OpenClaw-as-a-Service: 20-50 Clients

---

## 🏗️ ARCHITECTURE OPTIONS

### **Option A: Shared Gateway (Recommended for 20-50)**

```
┌─────────────────────────────────────────┐
│         OpenClaw Gateway                │
│    (Single instance, multi-tenant)      │
└─────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼───┐     ┌────▼────┐    ┌─────▼────┐
│Bot #1 │     │ Bot #2  │    │ Bot #50  │
│ClientA│     │ ClientB │    │ ClientZ  │
└───┬───┘     └────┬────┘    └─────┬────┘
    │              │               │
┌───▼───┐     ┌────▼────┐    ┌─────▼────┐
│Agent A│     │ Agent B │    │ Agent Z  │
│(AI)   │     │ (AI)    │    │ (AI)     │
└───────┘     └─────────┘    └──────────┘
```

**Pros:**
- Single server, easy management
- Shared infrastructure costs
- Central monitoring

**Cons:**
- Need careful data isolation
- Single point of failure

---

### **Option B: Container per Client (Enterprise)**

```
┌──────────────────────────────────────────┐
│           Docker/Kubernetes              │
├──────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐    ┌────────┐   │
│  │Client 1│ │Client 2│    │Client N│   │
│  │Container│ │Container│   │Container│  │
│  │+ Bot   │ │+ Bot   │    │+ Bot   │  │
│  │+ Agent │ │+ Agent │    │+ Agent │  │
│  │+ DB    │ │+ DB    │    │+ DB    │  │
│  └────────┘ └────────┘    └────────┘   │
└──────────────────────────────────────────┘
```

**Pros:**
- True isolation
- Client can scale independently
- Easier compliance

**Cons:**
- Higher resource usage
- More complex orchestration
- Expensive at scale

---

## 🎯 RECOMMENDED: Option A (Shared Gateway)

For 20-50 clients, this is most cost-effective.

---

## 📁 DIRECTORY STRUCTURE

```
~/.openclaw/
├── clients/                    # Per-client folders
│   ├── client-001-acme-corp/
│   │   ├── config/
│   │   │   ├── telegram.json   # Bot token
│   │   │   ├── openclaw.json   # Client settings
│   │   │   └── agent.json      # AI personality
│   │   ├── data/
│   │   │   ├── conversations/  # Chat history
│   │   │   ├── orders/         # Business data
│   │   │   └── analytics/      # Usage stats
│   │   ├── skills/             # Custom skills
│   │   └── logs/
│   ├── client-003-charlies-shop/
│   └── ... (up to 50)
│
├── shared/                     # Common resources
│   ├── core/                   # OpenClaw core
│   ├── channels/               # Channel adapters
│   └── templates/              # Reusable configs
│
├── gateway/                    # Main gateway
│   ├── server.js               # Multi-tenant router
│   ├── client-manager.js       # Client registry
│   └── webhook-handler.js      # Route webhooks
│
└── admin/                      # Your admin tools
    ├── dashboard/              # See all clients
    ├── billing/                # Track usage
    └── deploy-client.sh        # One-command setup
```

---

## 🔧 SETUP PROCESS (Per Client)

### **Step 1: Create Client Folder**

```bash
./add-client.sh "acme-corp" "Acme Corporation" "+63..."
```

This creates:
```
clients/client-001-acme-corp/
├── config/
│   ├── telegram.json          # Bot token placeholder
│   ├── agent.json             # Default personality
│   └── business.json          # Their specific config
├── data/
│   └── (empty, ready for data)
└── README.md                  # Client info
```

### **Step 2: Client Onboarding Form**

Send them:
```
🚀 OpenClaw Setup for [Business Name]

Please provide:
1. Business Name: ___________
2. Your Telegram Bot Token (from @BotFather): ___________
3. What should I help your customers with?
   [ ] Answer FAQs
   [ ] Take orders
   [ ] Book appointments
   [ ] Other: ___________
4. Business hours: ___________
5. Special instructions: ___________
```

### **Step 3: Configure Their Bot**

```json
// clients/client-001-acme-corp/config/telegram.json
{
  "bot_token": "123456:ABC-DEF...",
  "business_name": "Acme Corporation",
  "welcome_message": "Hi! I'm Acme's AI assistant...",
  "business_hours": {
    "open": "09:00",
    "close": "18:00",
    "timezone": "Asia/Manila"
  },
  "capabilities": ["faq", "orders", "appointments"],
  "handoff_human": true
}
```

### **Step 4: Deploy**

```bash
# Automatically:
# 1. Register bot with gateway
# 2. Start webhook listener
# 3. Create database entries
# 4. Send test message
# 5. Confirm to client

./deploy-client.sh client-001-acme-corp
```

---

## 🌐 GATEWAY ROUTER LOGIC

```javascript
// gateway/webhook-handler.js

async function routeWebhook(botToken, message) {
  // 1. Find which client owns this bot
  const client = await findClientByBotToken(botToken);
  
  if (!client) {
    console.error("Unknown bot token");
    return;
  }
  
  // 2. Load client's AI agent
  const agent = await loadClientAgent(client.id);
  
  // 3. Load client's conversation history
  const history = await loadConversation(client.id, message.chat.id);
  
  // 4. Process message (ISOLATED per client)
  const response = await agent.process(message, history);
  
  // 5. Send response
  await sendTelegramMessage(client.config.bot_token, message.chat.id, response);
  
  // 6. Log analytics
  await logInteraction(client.id, message, response);
}
```

---

## 🛡️ DATA ISOLATION

**Critical:** Each client's data must NEVER mix.

```javascript
// Data access rules
const dataIsolation = {
  // Each client gets their own namespace
  conversations: (clientId) => `clients/${clientId}/data/conversations/`,
  orders: (clientId) => `clients/${clientId}/data/orders/`,
  analytics: (clientId) => `clients/${clientId}/data/analytics/`,
  
  // Enforce: No cross-client access
  validateAccess: (requestingClient, targetData) => {
    return requestingClient === extractClientId(targetData);
  }
};
```

---

## 📊 ADMIN DASHBOARD (Your View)

```
┌─────────────────────────────────────────┐
│     OpenClaw Multi-Client Dashboard     │
├─────────────────────────────────────────┤
│                                         │
│  Active Clients: 23/50                 │
│  Messages Today: 1,247                 │
│  Revenue This Month: $4,600            │
│                                         │
├─────────────────────────────────────────┤
│  CLIENT LIST                           │
│  ─────────────────────────────────────  │
│  🟢 Acme Corp      | 45 msgs | $200   │
│  🟢 Bob's Bistro   | 128 msgs | $300  │
│  🟡 Charlie's Shop | 12 msgs  | $200  │
│  🔴 Dave's Diner   | 0 msgs   | $0    │ [ALERT]
│  ...                                   │
│                                         │
│  [+ Add New Client]  [Billing] [Logs]  │
└─────────────────────────────────────────┘
```

---

## 💰 PRICING MODEL

| Tier | Clients | Price/Client | Your Cost | Your Profit |
|------|---------|--------------|-----------|-------------|
| Starter | 1-10 | $200/mo | $50 | $150/client |
| Growth | 11-25 | $150/mo | $40 | $110/client |
| Scale | 26-50 | $100/mo | $30 | $70/client |

**Your VPS Cost:** ~$50-100/month (handles all 50)

---

## 🚀 DEPLOYMENT SCRIPT

```bash
#!/bin/bash
# add-client.sh

CLIENT_ID="client-$(printf '%03d' $(ls -1 clients/ | wc -l))"
BUSINESS_NAME="$1"
CONTACT="$2"

echo "🚀 Creating client: $CLIENT_ID"

# Create folder structure
mkdir -p clients/$CLIENT_ID/{config,data/{conversations,orders,analytics},skills,logs}

# Copy templates
cp templates/telegram.json clients/$CLIENT_ID/config/
cp templates/agent.json clients/$CLIENT_ID/config/
cp templates/business.json clients/$CLIENT_ID/config/

# Create README
cat > clients/$CLIENT_ID/README.md << EOF
# $BUSINESS_NAME
**ID:** $CLIENT_ID  
**Contact:** $CONTACT  
**Created:** $(date)

## Status
- [ ] Bot token received
- [ ] Configured
- [ ] Deployed
- [ ] Tested

## Notes
_Add notes here_
EOF

echo "✅ Client $CLIENT_ID created"
echo "📁 Location: clients/$CLIENT_ID/"
echo ""
echo "Next steps:"
echo "1. Get their Telegram bot token"
echo "2. Configure in clients/$CLIENT_ID/config/telegram.json"
echo "3. Run: ./deploy-client.sh $CLIENT_ID"
```

---

## 📋 CLIENT ONBOARDING CHECKLIST

For each new client:

- [ ] Signed contract
- [ ] Payment received (setup fee)
- [ ] Bot token provided
- [ ] Business requirements documented
- [ ] Config files created
- [ ] Bot deployed
- [ ] Test conversation completed
- [ ] Client trained (30 min call)
- [ ] Handoff to support

---

## 🎯 SUMMARY

**For 20-50 clients:**

1. **One VPS** handles all (shared gateway)
2. **Folder per client** with strict isolation
3. **Admin dashboard** to manage all
4. **One-command setup** for new clients
5. **Template-based** configs (fast deployment)

**Time to onboard new client:** 15 minutes

**Want me to build this multi-tenant system?** 🚀
