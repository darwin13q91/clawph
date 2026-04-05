# Multi-Tenant Agent Platform — Pi 500 Architecture

**Device:** Raspberry Pi 500 (16GB RAM, 256GB NVMe)
**Goal:** Serve 20–50+ clients on a single Pi 500 at 500–3,000 PHP/month
**Revenue potential:** 50 clients × 500 PHP = 25,000 PHP/month

---

## The Core Idea

One Pi 500 runs **one OpenClaw node** with **isolated client workspaces**.
Each client gets their own agent namespace — they don't see each other's data.
API keys are per-client (self-brought or Amajungle-passed).

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Raspberry Pi 500 (16GB)                                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  OpenClaw Node (single process)                            │ │
│  │                                                            │ │
│  │  ┌──────────┐  ┌──────────┐       ┌──────────┐           │ │
│  │  │ Client 1 │  │ Client 2 │  ...  │ Client N │           │ │
│  │  │ namespace│  │ namespace│       │ namespace│           │ │
│  │  │          │  │          │       │          │           │ │
│  │  │ ·agent   │  │ ·agent   │       │ ·agent   │           │ │
│  │  │ ·memory/ │  │ ·memory/ │       │ ·memory/ │           │ │
│  │  │ ·skills  │  │ ·skills  │       │ ·skills  │           │ │
│  │  │ ·.env    │  │ ·.env    │       │ ·.env    │           │ │
│  │  └──────────┘  └──────────┘       └──────────┘           │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Ollama (local)        Telegram Bot (multi-client)              │
│  qwen2.5:14b           Piper (outbound)                          │
│  phi4:14b              Echo (inbound)                            │
│                        Scout (research)                          │
│                                                                  │
│  NVMe: 256GB                                                     │
│  /clients/client_001/ /clients/client_002/ ... /clients/client_N/
└──────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
    Client 1 Telegram      Client 2 Telegram    Client N Telegram
    (有自己的bot)            (有自己的bot)         (有自己的bot)
```

---

## Per-Client Namespace Structure

```
/home/pi/clients/
└── {client_slug}/
    ├── .env              # Client's API keys (Tavily, Gemini, etc.)
    ├── SOUL.md           # Their agent's personality (customized)
    ├── AGENTS.md         # Their agent's capabilities
    ├── memory/
    │   └── YYYY-MM-DD.md # Their conversation history
    ├── skills/           # Their specific skills (e.g., real estate, e-com)
    └── data/
        └── crm.db        # Their leads, deals, contacts (optional)
```

---

## Multi-Client Telegram Setup

### Option A: One Bot Per Client (Recommended for 1–20 clients)

Each client gets their own Telegram bot:
- Bot A → handles @ClientAFinder → routes to `clients/client_a/`
- Bot B → handles @ClientBFinder → routes to `clients/client_b/`
- OpenClaw supports multiple Telegram bots via multiple `telegram.bot_token` configs

**Pros:** Full isolation, clean separation
**Cons:** Each bot needs its own token from @BotFather

### Option B: Single Bot + Client Verification (For 20+ clients)

One bot handles all clients. On first DM:
1. Client enters their **client code** (e.g., `AMACLI-001`)
2. Bot validates against client registry
3. Routes conversation to that client's namespace

**Pros:** One bot to manage
**Cons:** More complex routing logic, slightly worse UX

---

## Onboarding Flow (New Client)

```
1. Client signs up (Google Form / WhatsApp)
   ↓
2. Amajungle creates namespace:
   sudo mkdir /home/pi/clients/{slug}
   cp -r /home/pi/templates/client_template/* /home/pi/clients/{slug}/
   ↓
3. Generate SOUL.md based on client's industry:
   - Real estate agent → real estate SOUL
   - E-com seller → amazon FBA SOUL
   - VA → general VA SOUL
   ↓
4. Client provides their own API keys (Tavily, Gemini, etc.)
   → OR ←
   Amajungle provisions shared MiniMax key pool
   ↓
5. Client connects via their Telegram bot
   → Agent greets: "Hi! I'm {ClientName}'s agent. What can I help you with?"
```

---

## API Key Strategy

### Option 1: Client-Brings-Their-Own (500 PHP/mo)
- Client provides: Tavily key, Gemini key, etc.
- Amajungle provides: OpenClaw orchestration only
- Margin: 500 PHP = ~$9纯利润 (Pi electricity, management)
- Risk: None — client's own keys

### Option 2: Amajungle Pass-Through (1,500 PHP/mo)
- Amajungle provides MiniMax API key (~$0.50/1000 requests)
- Pass through at cost + margin
- Monitor usage per client namespace
- Risk: Client overuse → need hard limits

### Option 3: Dedicated Instance (3,000 PHP/mo)
- Ollama on Pi runs `qwen2.5:14b` exclusively for this client
- No sharing CPU with others
- Slower but guaranteed resources
- Works because most clients are idle most of the time

---

## Resource Allocation (16GB RAM)

| Resource | Usage |
|----------|-------|
| Ollama (qwen2.5:14b Q4) | ~6GB (if loaded) |
| Ollama (phi4:14b Q4) | ~6GB (if loaded) |
| OpenClaw + system | ~1.5GB |
| 30 idle client agents | ~1.5GB (50MB each) |
| Buffer | ~1GB |
| **Total** | ~16GB |

**Key insight:** Ollama models load on-demand, not all at once. Most of the time only one model is active. Clients share the model capacity — they're queued, not parallel-loaded.

---

## Pricing Tiers

| Tier | Price | Hardware | API Keys | Model |
|------|-------|---------|----------|-------|
| **Starter** | 500 PHP/mo | Shared Pi 500 | Client's own | Shared Ollama + MiniMax |
| **Growth** | 1,500 PHP/mo | Shared Pi 500 | Amajungle provided | Shared Ollama + MiniMax |
| **Pro** | 3,000 PHP/mo | Shared Pi 500 | Amajungle provided | Priority queue + local Ollama |
| **Business** | 5,000 PHP/mo | Dedicated Pi 500 | Amajungle provided | Exclusive Ollama instance |

---

## Management Tools

### Client Dashboard (Simple)
```bash
# List all clients
ls /home/pi/clients/

# Check client's agent status
openclaw agents list --namespace clients/client_slug

# View client's memory
cat /home/pi/clients/{slug}/memory/YYYY-MM-DD.md

# Kill stuck agent
openclaw agents kill --namespace clients/{slug} --agent echo
```

### Billing Tracker
```bash
# Each client namespace has a usage counter
/home/pi/scripts/billing.sh  # outputs CSV: client, messages_today, api_calls
```

### Automated Reports
- Weekly: Send each client their usage summary via Telegram
- Monthly: Generate invoice based on tier + usage

---

## Launch Checklist

### Before Launch
- [ ] Pi 500 set up and validated (per pi500-setup-plan.md)
- [ ] Client namespace template created
- [ ] 3 SOUL templates ready: Real Estate, E-com/Amazon, General VA
- [ ] Onboarding automation script written
- [ ] Telegram bot tokens obtained from @BotFather (one per client or one routing bot)
- [ ] Billing script ready
- [ ] Test with 3 beta clients (free or 250 PHP)

### Beta Launch (First 3 clients)
- [ ] Onboard 3 beta clients at 250 PHP
- [ ] Monitor RAM, CPU, latency for 2 weeks
- [ ] Adjust pricing or resource allocation

### Full Launch
- [ ] Landing page: "Get your own AI agent for 500 PHP/month"
- [ ] Payment via GCash/UnionBank
- [ ] Automated onboarding: pay → receive Telegram bot → done

---

## Revenue Model

| Clients | Tier Mix | Monthly Revenue | Annual Revenue |
|---------|----------|-----------------|----------------|
| 10 | 7× Starter, 3× Growth | 13,500 PHP | 162,000 PHP |
| 25 | 15× Starter, 7× Growth, 3× Pro | 36,000 PHP | 432,000 PHP |
| 50 | 30× Starter, 15× Growth, 5× Pro | 82,500 PHP | 990,000 PHP |

**At 50 clients: ~$1,800 USD/month** (Php 990K annual)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Pi 500 goes down | All clients lose agent | UPS battery backup; laptop fallback |
| Client uses keys for abuse | Reputation risk | Rate limits; AUP in contract |
| RAM exhaustion | All agents freeze | cgroups limit per namespace; monitor |
| API costs exceed revenue | Financial loss | Per-client quotas; monthly caps |
| Too many clients → slow | Quality drops | Hard cap at 50; second Pi at 51 |
