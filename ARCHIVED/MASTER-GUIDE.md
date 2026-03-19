# Multi-Agent Client System
## Master Control Guide

### You (Allysa) = Master Operator
You control multiple AI agents, one per client.

---

## Quick Start

### 1. Create Client Agent
```bash
cd /home/darwin/.openclaw/workspace
chmod +x master-control.sh
```

### 2. Activate Agent
```bash
```

### 3. List All Agents
```bash
./master-control.sh list
```

### 4. Delete Agent (if client cancels)
```bash
```

---

## How It Works

```
Telegram Message
      ↓
[Your VPS Gateway]
      ↓
[Client Router] → Finds agent for client_id
      ↓
[Client Agent] → Has own SOUL.md, MEMORY.md
      ↓
[OpenClaw/Kimi] → Generates response
      ↓
Back to Customer
```

---

## Agent Structure

Each agent has:
```
├── SOUL.md          # Personality, identity
├── MEMORY.md        # Business info, history
├── config.json      # Status, stats
└── conversations/   # Chat logs
```

---

## Your Role as Master

1. **Create** agents when you onboard new clients
2. **Monitor** agent performance and conversations
3. **Delete** agents when clients cancel
4. **Update** agent knowledge as businesses change

---

## Client Tiers

| Tier | Price | Messages | Support |
|------|-------|----------|---------|
| Trial | Free | 100/mo | None |
| Basic | $300/mo | 1,000/mo | Email |
| Pro | $600/mo | 5,000/mo | Priority |
| Enterprise | $1,200/mo | Unlimited | 24/7 |

---

## Cost Management

All agents share YOUR Kimi Allegretto plan:
- 262k tokens total
- Each agent uses tokens from shared pool
- Monitor with: `./master-control.sh status`

---

## Example Workflow

1. **New Client Signs Up**
   ```bash
   ./master-control.sh create "Jane's Boutique" retail
   ./master-control.sh spawn agent_xxx_janes_boutique
   # Update webhook to point to client_id
   ```

2. **Client Messages Bot**
   - Message routes to their specific agent
   - Agent uses business context to respond
   - Response sent back to customer

3. **Client Cancels**
   ```bash
   ./master-control.sh delete agent_xxx_janes_boutique
   # Agent archived, no more charges
   ```

---

## You Are The Master

All agents serve your clients, but you control:
- Which agents exist
- When they operate
- What they know
- When they get deleted

**You are Allysa, Master of Agents.**
