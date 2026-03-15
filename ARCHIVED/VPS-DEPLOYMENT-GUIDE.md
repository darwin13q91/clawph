# OpenClaw VPS Deployment Guide
## Complete File Manifest for mylabs husband Setup

### 📁 DIRECTORY STRUCTURE
```
~/.openclaw/
├── workspace/           # Main workspace (git repo)
│   ├── skills/          # Agent skills
│   ├── scripts/         # Automation scripts
│   ├── apps/            # Dashboards & servers
│   ├── CFO/             # Financial tracking
│   ├── sub-agents/      # Shiko, Aishi, Namie
│   ├── build-everything/# Built systems
│   ├── brain/           # Knowledge & overnight reports
│   ├── core/            # Token guardian & critical systems
│   ├── memory/          # Session archives
│   └── personal/        # Personal configs
├── data/                # Runtime data
│   ├── paper_trades.json
│   ├── scan.json
│   ├── morning_report.txt
│   └── auto_trading.log
└── config/              # Configurations
    ├── telegram-alerts.json
    └── openclaw.json
```

---

### 📦 REQUIRED FILES (Copy These)

#### **1. CORE SYSTEM FILES**
```
workspace/
├── SOUL.md                    # My personality
├── USER.md                    # Your profile
├── AGENTS.md                  # Workspace rules
├── WORKFLOW_AUTO.md           # Startup protocol
├── HEARTBEAT.md              # Periodic tasks
├── IDENTITY.md               # My identity
├── TOOLS.md                  # Local tool configs
├── skill-creator/SKILL.md    # Skill building guide
└── core/
    ├── token-guardian.sh     # Prevents crashes
    └── TOKEN-MANAGEMENT.md   # Token protocol
```

#### **2. TRADING SYSTEM**
```
workspace/
├── skills/market-scanner/
│   ├── scan.py              # Market scanner
│   ├── strategy_selector.py # Multi-strategy picker
│   ├── auto_trade_multi.py  # Auto-trading engine
│   └── strategies/
│       ├── mean_reversion.py
│       ├── momentum.py
│       └── breakout.py
├── scripts/
│   ├── auto-trade-paper.sh  # Trading cron job
│   └── paper_trader.py      # Trade logger
└── scan.py                  # Main scanner entry
```

#### **3. DASHBOARDS**
```
workspace/
├── apps/dashboard/
│   └── public/index.html    # Main dashboard
├── apps/command-center/
│   ├── public/index.html    # Unified view
│   ├── server/index.js      # Backend
│   ├── server/aggregator.py # Data aggregator
│   └── keepalive.sh         # Auto-restart
```

#### **4. TELEGRAM BOTS**
```
workspace/build-everything/telegram/
├── telegram-alerts.js       # Bot #2 client
├── integration.js           # Trade alerts
├── setup.sh                 # Setup script
└── telegram.json.template   # Config template
```

#### **5. CFO SYSTEM**
```
workspace/CFO/
├── data/financial-foundation.md  # Your finances
├── config/CFO_CONFIG.md          # Settings
└── generate-report.sh            # Report generator
```

#### **6. SUB-AGENTS**
```
workspace/sub-agents/
├── ARCHITECTURE.md          # How agents work
├── README.md               # Usage guide
├── route-task.sh           # Task router
├── shiko/
│   ├── SOUL.md            # Shiko personality
│   └── AGENTS.md          # Execution role
├── aishi/
│   ├── SOUL.md            # Aishi personality
│   └── AGENTS.md          # Analysis role
└── namie/
    ├── SOUL.md            # Namie personality
    └── AGENTS.md          # Strategy role
```

#### **7. AUTOMATION**
```
workspace/
├── bot-maintenance/scripts/
│   ├── quick-update.sh     # Daily updates
│   ├── health-monitor.sh   # Health checks
│   └── maintenance.sh      # Weekly maintenance
└── personal/scripts/
    └── telegram-morning.sh # Morning report sender
```

#### **8. BUSINESS**
```
workspace/Amazon-Client/
├── README.md              # Service offering
├── add-client.sh          # Client onboarding
├── templates/             # Agent templates
│   ├── inventory-bot/
│   ├── pricing-bot/
│   ├── review-bot/
│   └── competitor-bot/
└── infra/
    └── docker-compose.yml
```

---

### 🔧 SYSTEM DEPENDENCIES

#### **Required Packages:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y \
    nodejs npm python3 python3-pip \
    curl git cron jq \
    htop iotop iftop

# Python packages
pip3 install requests pandas numpy

# Node packages (in workspace dirs)
npm install  # for dashboard servers
```

#### **Required Services:**
```bash
# Enable cron
sudo systemctl enable cron
sudo systemctl start cron

# Node.js for dashboards
# Python3 for trading scripts
```

---

### 📋 CONFIGURATION FILES

#### **~/.openclaw/config/telegram-alerts.json**
```json
{
  "enabled": true,
  "bot_token": "8606070459:AAEsiAmLNv0gxyICsUib_EYjIOkylToWjfU",
  "chat_id": "6504570121",
  "alerts": {
    "trades": true,
    "opportunities": true,
    "daily_summary": true,
    "system_errors": true
  }
}
```

#### **~/.openclaw/config/openclaw.json**
```json
{
  "user": {
    "name": "mylabs husband",
    "timezone": "Asia/Manila"
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "8021500636:AAEqZlUXESmzwE5vxvazokYw-_lc3_TfMmo"
    }
  }
}
```

---

### ⏰ CRON JOBS (Copy These)

```bash
# Morning report + updates
0 6 * * * cd ~/.openclaw/workspace/scripts && bash morning-report.sh
0 6 * * * cd ~/.openclaw/workspace/personal/scripts && bash telegram-morning.sh

# Trading (8AM-10PM every 30 min)
*/30 8-22 * * * cd ~/.openclaw/workspace/scripts && bash auto-trade-paper.sh

# Market scanning (every 15 min)
*/15 * * * * cd ~/.openclaw/workspace && python3 scan.py

# Health checks (every 5 min)
*/5 * * * * cd ~/.openclaw/workspace/bot-maintenance/scripts && bash health-monitor.sh

# Daily backup (3AM)
0 3 * * * ~/.openclaw/workspace/build-everything/backups/backup.sh

# Overnight thinking (9PM)
0 21 * * * cd ~/.openclaw/workspace/brain/overnight && bash think.sh

# Token guardian (every 10 min)
*/10 * * * * ~/.openclaw/workspace/core/token-guardian.sh
```

---

### 🚀 DEPLOYMENT STEPS

```bash
# 1. Clone/copy workspace to VPS
git clone <your-repo> ~/.openclaw/workspace
cd ~/.openclaw/workspace

# 2. Create directories
mkdir -p ~/.openclaw/{data,config,backups}
mkdir -p ~/.openclaw/workspace/{logs,personal/logs}

# 3. Install dependencies
sudo apt install -y nodejs npm python3-pip curl git cron
pip3 install requests pandas numpy

# 4. Set permissions
chmod +x ~/.openclaw/workspace/scripts/*.sh
chmod +x ~/.openclaw/workspace/skills/market-scanner/*.py
chmod +x ~/.openclaw/workspace/core/*.sh

# 5. Create configs
cp ~/.openclaw/workspace/build-everything/telegram/telegram.json.template \
   ~/.openclaw/config/telegram-alerts.json
# Edit with your bot token/chat ID

# 6. Install cron jobs
crontab ~/.openclaw/workspace/config/crontab.txt

# 7. Start services
cd ~/.openclaw/workspace/apps/dashboard && npm install && node server.js &
cd ~/.openclaw/workspace/apps/command-center && node server/index.js &

# 8. Verify
curl http://localhost:8789  # Dashboard
curl http://localhost:8888  # Command Center
```

---

### 📦 PORTS TO OPEN (If needed)

```
8789  # Main Dashboard
8888  # Command Center
```

**For local-only (recommended):**
```bash
# Bind to localhost only (safer)
# Dashboard: 127.0.0.1:8789
# Command Center: 127.0.0.1:8888
# Use SSH tunnel to access remotely
```

---

### 🔒 SECURITY CHECKLIST

- [ ] Change default passwords
- [ ] Set up firewall (ufw)
- [ ] Use SSH keys (not passwords)
- [ ] Encrypt API keys (optional)
- [ ] Regular updates (cron handles this)
- [ ] Log monitoring

---

### 🧪 VERIFICATION

After deployment, check:
```bash
# Test trading
cd ~/.openclaw/workspace/skills/market-scanner
python3 strategy_selector.py

# Test Telegram
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -d "chat_id=<CHAT_ID>" \
  -d "text=Deployment test"

# Check cron
crontab -l
tail -f ~/.openclaw/data/auto_trading.log
```

---

### 💾 BACKUP STRATEGY

On VPS, also set up:
```bash
# Cloud backup (optional)
# rclone to Google Drive/Dropbox
# Or rsync to another server
```

---

**Total Size:** ~50MB (mostly text/code files)
**Deploy Time:** ~15 minutes
**Services:** 2 (dashboard, command center)
**Cron Jobs:** 7

Ready to deploy! 🚀
