# OpenClaw Workspace

Personal AI workspace for Darwin, managed by Allysa (AI Agent).

## 🗂️ Structure

```
workspace/
├── apps/                    # Applications
│   └── dashboard/           # OpenClaw Systems Dashboard (Node.js)
│       ├── server/          # Backend API
│       ├── public/          # Frontend UI
│       └── package.json
│
├── core/                    # OpenClaw core configuration
│   ├── AGENTS.md            # Agent behavior rules
│   ├── SOUL.md              # My personality & principles
│   ├── USER.md              # Your preferences
│   ├── IDENTITY.md          # My identity (Allysa)
│   ├── BOOTSTRAP.md         # First-run guide
│   ├── HEARTBEAT.md         # Periodic tasks
│   └── TOOLS.md             # Local tool configs
│
├── skills/                  # OpenClaw skills
│   └── market-scanner/      # Polymarket scanner skill
│       ├── SKILL.md
│       └── market_scanner.py
│
├── scripts/                 # Utility scripts
│   ├── scan.py              # Polymarket market scanner
│   ├── paper_trader.py      # Paper trading tracker
│   └── test_scanner.py      # Test utilities
│
├── docs/                    # Documentation
│   └── POLYGON-SCANNER-README.md
│
├── agent-paper-trader/      # Agent configuration
│   └── AGENTS.md
│
├── .openclaw/               # OpenClaw runtime data
│   ├── workspace-state.json
│   └── data/                # Generated data
│       ├── scan.json        # Market scan results
│       └── paper_trades.json
│
└── README.md                # This file
```

## 🚀 Quick Start

### Dashboard
```bash
cd apps/dashboard
npm start
# Open http://127.0.0.1:8789
```

### Market Scanner
```bash
# Run manually
python3 scripts/scan.py

# View results
cat ~/.openclaw/data/scan.json
```

### Paper Trading
```bash
# Log a paper trade
python3 scripts/paper_trader.py log "market_id" "question" YES 0.60 1

# View stats
python3 scripts/paper_trader.py stats
```

## 📊 What's Running

| Component | Status | URL |
|-----------|--------|-----|
| OpenClaw Gateway | Active | ws://127.0.0.1:18789 |
| Dashboard | Active | http://127.0.0.1:8789 |
| Market Scanner | Cron (15min) | - |

## 🔄 Git Workflow

```bash
# Check status
git status

# Add changes
git add .

# Commit
git commit -m "Description"
```

## 🧠 Memory

- **Daily logs**: `~/.openclaw/memory/YYYY-MM-DD.md`
- **Long-term**: `core/SOUL.md`, `core/USER.md`
- **Session continuity**: Files persist between restarts

## ⚠️ Paper Trading Only

All trading tools are for **paper trading** (simulated). No real money at risk.

## 🔒 Security

- Dashboard binds to `127.0.0.1` only (localhost)
- No secrets in git
- API keys in `~/.openclaw/.env` (not tracked)
