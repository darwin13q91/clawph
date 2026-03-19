# AMAJUNGLE ARCHITECTURE
## March 18, 2026

## LAYER 1: USER INTERFACE
- Telegram (Primary) → Allysa-telegram session
- Signal, Discord, WhatsApp (Multi-channel support)
- Web Dashboard (Command Center) → Port 8888
- Amajungle Dashboard → Port 8789

## LAYER 2: MASTER ORCHESTRATOR
🤖 ALLYSA (Master Agent)
- SOUL: /workspace/SOUL.md (contrarian strategist)
- Skills: 9 (pipeline, risk, decision-tracking, knowledge, etc.)
- Spawns sub-agents for specialized tasks
- Reports to: mylabs husband (6504570121)

## LAYER 3: SUB-AGENT FLEET (10 Agents, 95 Skills, ~22,000 lines)

### 🔧 ATLAS (Infrastructure)
- 19 Skills
- SOUL: DEV_SOUL.md
- Cron: 50+ automation jobs
- Maintains: Dashboards, backups, health checks

### 📧 ECHO (Support)
- 7 Skills
- SOUL: SUPPORT_SOUL.md
- Cron: Every 5 min (email monitor)
- Monitors: hello@, support@, ops@amajungle.com

### 📨 PIPER (Email Systems)
- 9 Skills
- SOUL: EMAIL_SOUL.md
- Sends: Audit emails, campaigns
- IMAP/SMTP: PrivateEmail integration

### 🎯 RIVER (Amazon Specialist)
- 36 Skills
- SOUL: AMAZON_SOUL.md
- Analyzes: Amazon stores/ASINs
- Uses: RapidAPI (primary), Scout (backup)
- Status: Fixed to not send empty emails

### 🔍 SCOUT (Web Research)
- 5 Skills
- SOUL: SCOUT_SOUL.md
- Browser automation
- Status: CAPTCHA blocked by Amazon

### 📈 TRADER (Trading)
- 5 Skills
- SOUL: TRADER_SOUL.md
- Position monitoring

### 🎨 PIXEL (UX/UI)
- 5 Skills
- Design systems

### 💰 CFO (Financial)
- No skills yet
- Financial reporting

### 🔧 SHIKO (Technical)
- Technical implementation

## LAYER 4: DATA STORAGE

### AGENT DATA STRUCTURE (per agent)
```
/agents/[agent]/
├── skills/[skill]/SKILL.md      ← Expertise documentation
├── scripts/*.py                 ← Operational code
├── data/                        ← Working data
│   ├── jobs/                    ← Pending tasks
│   ├── results/                 ← Completed outputs
│   ├── queue/                   ← Processing queue
│   └── completed/               ← Archive
└── logs/                        ← Activity logs
```

### WORKSPACE DATA
```
/workspace/
├── SOUL.md                      ← Allysa's personality
├── MEMORY.md                    ← System memory
├── AGENTS.md                    ← Agent registry
├── AGENT_FLEET_MANIFEST.md      ← Complete inventory
└── memory/                      ← Daily logs, decisions
```

### CREDENTIALS
- /.env → API keys, passwords (600 permissions)
- /config.json → OpenClaw configuration

## LAYER 5: EXTERNAL INTEGRATIONS

### EMAIL (PrivateEmail)
- SMTP: mail.privateemail.com
- IMAP: mail.privateemail.com
- Accounts: hello@, support@, ops@amajungle.com
- Used by: Echo (inbound), Piper (outbound)

### AMAZON APIs
- RapidAPI (primary) → Rate limited (HTTP 429)
- Scout browser (backup) → CAPTCHA blocked
- Status: Both down until April 1

### TELEGRAM
- Bot: @AmaJungleAI_bot
- Channel: allysa-telegram
- Used for: Alerts, notifications

### WEB
- Command Center: localhost:8888
- Amajungle Dashboard: localhost:8789
- Gateway: localhost:18789 (loopback only)

## AUDIT PIPELINE FLOW

1. CLIENT submits form → hello@amajungle.com
2. ECHO monitors inbox (every 5 min)
   └─ Extracts ASIN from email
3. ECHO → SCOUT (via pipeline_bridge.py)
   └─ Creates job: scout_20260318_HHMMSS_[ASIN].json
4. SCOUT attempts browser capture
   └─ Currently failing (CAPTCHA)
5. SCOUT creates River job with error data
6. RIVER processes job
   ├─ Try RapidAPI first (primary) → Rate limited
   ├─ Try Scout data as backup → Has error flag
   └─ Detect both failed → Return status: 'failed'
7. RIVER decision
   ├─ If data good → Create handoff for Piper → Send email
   └─ If failed → NO handoff created → NO email sent
8. PIPER (if handoff exists)
   ├─ Formats audit report
   ├─ Sends via PrivateEmail SMTP
   └─ Notifies Allysa (Telegram)

CURRENT STATUS: Pipeline blocked (RapidAPI quota)
FIX APPLIED: Won't send empty emails when both sources fail

## SECURITY ARCHITECTURE

- File permissions: 644 (skills/SOUL), 600 (.env credentials)
- Gateway: Loopback only (127.0.0.1:18789) - no external access
- No hardcoded credentials - all via .env
- Agent isolation: Each agent has own directory/permissions
- Audit trail: All activities logged to agent-specific logs
- Automated backups: Daily snapshots via cron

## TECHNOLOGY STACK

- Runtime: OpenClaw (Node.js + Python)
- Agents: Python 3.12
- Storage: Filesystem (JSON, Markdown)
- Gateway: WebSocket (ws://127.0.0.1:18789)
- Cron: systemd timers + crontab
- Email: PrivateEmail (SMTP/IMAP)
- APIs: RapidAPI, Amazon SP-API (planned)

## CURRENT STATUS

✅ All 10 agents secure and operational
✅ 101 SKILL.md files secured
✅ 14 SOUL files secured
⚠️ RapidAPI rate limited (reset April 1)
⚠️ Scout CAPTCHA blocked
✅ River fixed to handle failures gracefully
