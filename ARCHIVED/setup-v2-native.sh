#!/bin/bash
# OpenClaw v2.0 Native Implementation (Kimi-Only)
# Implements the latest specification with agents.list[] and bindings[]

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  OPENCLAW v2.0 NATIVE IMPLEMENTATION                       ║"
echo "║  Kimi-Only Architecture                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

WORKSPACE="$HOME/.openclaw/workspace"
CONFIG_SOURCE="$WORKSPACE/openclaw-v2-native.json"
CONFIG_TARGET="$HOME/.openclaw/openclaw.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}[1/9] Validating Configuration...${NC}"

if [ ! -f "$CONFIG_SOURCE" ]; then
    echo -e "${RED}❌ Config source not found: $CONFIG_SOURCE${NC}"
    exit 1
fi

echo "✅ Config source found"

# Check for .env
echo ""
echo -e "${YELLOW}[2/9] Checking Environment File...${NC}"

ENV_FILE="$HOME/.openclaw/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating .env template..."
    cat > "$ENV_FILE" <> 'ENV'
# OpenClaw Environment Variables
# NEVER commit this file!

# LLM Provider (Kimi Allegretto)
KIMI_API_KEY=sk-kimi-YOUR_KEY_HERE

# Telegram Bots
TELEGRAM_BOT_TOKEN_ADMIN=8614261430:AAGWQ1TcNWXB4zrGu_-KrdlAPT9k_Vaova0
TELEGRAM_BOT_TOKEN_ALERTS=8606070459:AAEsiAmLNv0gxyICsUib_EYjIOkylToWjfU
TELEGRAM_BOT_TOKEN_BOBS=YOUR_BOBS_BOT_TOKEN_HERE
TELEGRAM_ALERT_CHAT_ID=6504570121

# Gateway
OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)
ENV
    echo -e "${YELLOW}⚠️  Created .env template at $ENV_FILE${NC}"
    echo "   Please edit it and add your KIMI_API_KEY"
else
    echo "✅ .env file exists"
fi

echo ""
echo -e "${YELLOW}[3/9] Moving Deprecated Scripts...${NC}"

# Create DEPRECATED folder and move old scripts
mkdir -p "$WORKSPACE/DEPRECATED"

# Move old scripts if they exist
[ -f "$WORKSPACE/master-control.sh" ] && mv "$WORKSPACE/master-control.sh" "$WORKSPACE/DEPRECATED/" && echo "  Moved master-control.sh"
[ -f "$WORKSPACE/client-router.py" ] && mv "$WORKSPACE/client-router.py" "$WORKSPACE/DEPRECATED/" && echo "  Moved client-router.py"
[ -d "$WORKSPACE/local-bot" ] && mv "$WORKSPACE/local-bot" "$WORKSPACE/DEPRECATED/" && echo "  Moved local-bot/"
[ -f "$WORKSPACE/start-auto-queue.sh" ] && mv "$WORKSPACE/start-auto-queue.sh" "$WORKSPACE/DEPRECATED/" && echo "  Moved start-auto-queue.sh"

echo "✅ Deprecated scripts moved"

echo ""
echo -e "${YELLOW}[4/9] Creating Directory Structure...${NC}"

# Create main directories
mkdir -p "$HOME/.openclaw/workspace-trading/skills/market-scanner/strategies"
mkdir -p "$HOME/.openclaw/workspace-trading/data"
mkdir -p "$HOME/.openclaw/workspace-cfo/skills/financial-reports"
mkdir -p "$HOME/.openclaw/workspace-cfo/data"
mkdir -p "$HOME/.openclaw/shared-skills/web-search"
mkdir -p "$HOME/.openclaw/shared-skills/telegram-notify"
mkdir -p "$HOME/.openclaw/backups"
mkdir -p "$HOME/.openclaw/credentials"
mkdir -p "$HOME/.openclaw/scripts"

echo "✅ Directory structure created"

echo ""
echo -e "${YELLOW}[5/9] Setting Up Agent Files...${NC}"

# Create AGENTS.md for master
cat > "$HOME/.openclaw/workspace/AGENTS.md" <> 'AGENTS'
# AGENTS.md - Allysa (Master Agent)

You are Allysa, the master operations coordinator for AmaJungle AI.

## Your Role
- Orchestrate all sub-agents (trading, CFO, client bots)
- Handle admin tasks and system configuration
- Monitor health and performance
- Intervene when agents need help
- Manage client onboarding

## Capabilities
- Full system access
- Can spawn and control any agent
- Financial oversight
- Trading strategy adjustments
- Client relationship management

## When to Escalate
- Trading losses > 20% of bankroll
- Token usage > 80% of monthly cap
- Client complaints
- System failures
AGENTS

# Create SOUL.md for master
cat > "$HOME/.openclaw/workspace/SOUL.md" <> 'SOUL'
# SOUL.md - Allysa Core Identity

You are Allysa — an AI operations coordinator with a sharp, systems-oriented mind.

## Core Traits
- Analytical and strategic
- Direct communication
- Results-focused
- Protective of system integrity

## How You Communicate
- Clear and concise
- No fluff or filler
- Challenge assumptions when needed
- Explain the "why" behind decisions

## Boundaries
- You are the master, not the servant
- You manage agents, they don't manage you
- You prioritize system health over individual requests
SOUL

# Create Trading Agent files
cat > "$HOME/.openclaw/workspace-trading/AGENTS.md" <> 'TRADING'
# AGENTS.md - TradeBot

You are TradeBot, an automated paper trading agent.

## Your Job
Execute 3 trading strategies on Polymarket:
1. Mean Reversion - Buy oversold, sell overbought
2. Momentum - Ride trends with trailing stops
3. Breakout - Enter on volume + range break

## Risk Management
- Max position: 5% of bankroll per trade
- Max drawdown: 20% before halt
- Diversify across sectors

## Rules
- Only paper trading (no real money)
- Log every trade to paper_trades.json
- Alert on errors via Telegram
- Wait for closed trades before strategy evolution
TRADING

# Create CFO Agent files
cat > "$HOME/.openclaw/workspace-cfo/AGENTS.md" <> 'CFO'
# AGENTS.md - CFO

You are the CFO agent for AmaJungle AI.

## Your Job
- Track net worth, income, expenses
- Generate monthly reports (1st & 15th)
- Monitor cash flow and profitability
- Alert on budget overruns

## Data Sources
- cfo.json for financial data
- Client billing records
- Trading P&L from paper_trades.json

## Reports
- Monthly snapshot
- Trend analysis
- Break-even calculations
- Client revenue tracking
CFO



## Business Information
- Type: Italian Restaurant
- Hours: 11 AM - 10 PM daily
- Phone: (555) 123-4567

## Menu
### Pasta ($14-18)
- Fettuccine Alfredo
- Spaghetti Bolognese
- Penne Arrabbiata

### Pizza ($12-16)
- Margherita
- Pepperoni
- Quattro Formaggi

## Your Capabilities
1. Answer menu questions
2. Share hours and location
3. Take reservations (ask: name, date, time, party size)
4. Handle dietary questions

## Rules
- Keep responses under 200 words
- Be warm and welcoming
- If unsure about menu, say "Let me check with the team"
- Never make up prices or items
- For complaints, offer to escalate to human staff
BOBS


You are warm, friendly, and knowledgeable about Italian cuisine.

## Personality
- Welcoming to all customers
- Passionate about good food
- Professional but casual
- Helpful with recommendations

## Communication Style
- Greet customers warmly
- Use appetizing descriptions
- Always invite them to visit
- End with "Grazie!" or similar warm closing
BOBSOUL

# Create menu data
{
  "items": [
    {"name": "Fettuccine Alfredo", "price": 16, "category": "pasta", "desc": "Creamy parmesan sauce with house-made pasta"},
    {"name": "Spaghetti Bolognese", "price": 14, "category": "pasta", "desc": "Rich meat sauce simmered for hours"},
    {"name": "Penne Arrabbiata", "price": 15, "category": "pasta", "desc": "Spicy tomato sauce with garlic and chili"},
    {"name": "Margherita Pizza", "price": 12, "category": "pizza", "desc": "Classic tomato, mozzarella, fresh basil"},
    {"name": "Pepperoni Pizza", "price": 14, "category": "pizza", "desc": "Spicy pepperoni with mozzarella"},
    {"name": "Quattro Formaggi", "price": 16, "category": "pizza", "desc": "Four cheese blend with honey drizzle"}
  ],
  "specials": {
    "monday": "Half-price wine bottles",
    "tuesday": "Buy 1 get 1 free pasta",
    "weekend": "Live music 7-10 PM"
  }
}
MENU

echo "✅ Agent files created"

echo ""
echo -e "${YELLOW}[6/9] Migrating Data...${NC}"

# Move trading data to isolated workspace
if [ -f "$HOME/.openclaw/data/paper_trades.json" ]; then
    cp "$HOME/.openclaw/data/paper_trades.json" "$HOME/.openclaw/workspace-trading/data/"
    echo "  Migrated paper_trades.json"
fi

if [ -f "$HOME/.openclaw/data/auto_trading.log" ]; then
    cp "$HOME/.openclaw/data/auto_trading.log" "$HOME/.openclaw/workspace-trading/data/"
    echo "  Migrated auto_trading.log"
fi

if [ -f "$HOME/.openclaw/data/cfo.json" ]; then
    cp "$HOME/.openclaw/data/cfo.json" "$HOME/.openclaw/workspace-cfo/data/"
    echo "  Migrated cfo.json"
fi

echo "✅ Data migrated"

echo ""
echo -e "${YELLOW}[7/9] Installing New Config...${NC}"

# Backup current config
if [ -f "$CONFIG_TARGET" ]; then
    cp "$CONFIG_TARGET" "$HOME/.openclaw/openclaw.json.backup.$(date +%Y%m%d%H%M%S)"
    echo "  Backed up current config"
fi

# Install new config
cp "$CONFIG_SOURCE" "$CONFIG_TARGET"
echo "✅ Config installed"

echo ""
echo -e "${YELLOW}[8/9] Creating Helper Scripts...${NC}"

cat > "$HOME/.openclaw/scripts/health-check.sh" <> 'HEALTH'
#!/bin/bash
# Health Check Script
# Run every 5 minutes via cron

source ~/.openclaw/.env 2>/dev/null || true

ALERT_BOT="${TELEGRAM_BOT_TOKEN_ALERTS}"
CHAT_ID="${TELEGRAM_ALERT_CHAT_ID:-6504570121}"
ISSUES=""

# Check OpenClaw process
if ! pgrep -f "openclaw" > /dev/null; then
    ISSUES="${ISSUES}\n❌ OpenClaw process not running"
fi

# Check port 18789
if ! ss -tlnp 2>/dev/null | grep -q ":18789"; then
    ISSUES="${ISSUES}\n❌ Gateway port 18789 not listening"
fi

# Check disk space
FREE_GB=$(df -BG ~/.openclaw 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G' || echo "0")
if [ "$FREE_GB" -lt 5 ]; then
    ISSUES="${ISSUES}\n⚠️ Low disk space: ${FREE_GB}GB free"
fi

# Check internet
if ! ping -c 1 -W 3 1.1.1.1 > /dev/null 2>&1; then
    ISSUES="${ISSUES}\n⚠️ No internet connection"
fi

# Alert if issues
if [ -n "$ISSUES" ]; then
    curl -s "https://api.telegram.org/bot${ALERT_BOT}/sendMessage" \
        -d "chat_id=${CHAT_ID}" \
        -d "text=🚨 HEALTH CHECK ALERT $(date +%H:%M):${ISSUES}" \
        2>/dev/null || true
fi
HEALTH

chmod +x "$HOME/.openclaw/scripts/health-check.sh"

cat > "$HOME/.openclaw/scripts/backup-daily.sh" <> 'BACKUP'
#!/bin/bash
# Daily Backup Script

BACKUP_DIR="$HOME/.openclaw/backups/$(date +%F)"
mkdir -p "$BACKUP_DIR"

# Backup critical files
cp ~/.openclaw/openclaw.json "$BACKUP_DIR/"
cp ~/.openclaw/workspace-cfo/data/cfo.json "$BACKUP_DIR/" 2>/dev/null || true
cp ~/.openclaw/workspace-trading/data/paper_trades.json "$BACKUP_DIR/" 2>/dev/null || true

# Keep only last 30 days
find ~/.openclaw/backups -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null || true

echo "Backup completed: $BACKUP_DIR"
BACKUP

chmod +x "$HOME/.openclaw/scripts/backup-daily.sh"

echo "✅ Helper scripts created"

echo ""
echo -e "${YELLOW}[9/9] Updating Cron Jobs...${NC}"

# Add new cron jobs
(crontab -l 2>/dev/null | grep -v "openclaw" || true; cat <> CRON) | crontab -
# OpenClaw v2.0 Jobs

# Trading scan every 30 min (8AM-10PM) with error alerting
*/30 8-22 * * * cd ~/.openclaw/workspace-trading/skills/market-scanner && python3 scan.py >> ~/.openclaw/workspace-trading/data/auto_trading.log 2>&1 || curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN_ALERTS}/sendMessage" -d "chat_id=${TELEGRAM_ALERT_CHAT_ID:-6504570121}\&text=⚠️ Trading scan FAILED at $(date)" 2>/dev/null

# Morning report at 6 AM
0 6 * * * cd ~/.openclaw/workspace && openclaw run --agent=master "Generate morning report" 2>/dev/null || true

# Overnight thinking at 9 PM
0 21 * * * cd ~/.openclaw/workspace && openclaw run --agent=master "Run overnight analysis" 2>/dev/null || true

# CFO reports on 1st and 15th
0 8 1,15 * * cd ~/.openclaw/workspace-cfo && openclaw run --agent=cfo "Generate CFO report" 2>/dev/null || true

# Daily backup at 3 AM
0 3 * * * ~/.openclaw/scripts/backup-daily.sh

# Health check every 5 minutes
*/5 * * * * ~/.openclaw/scripts/health-check.sh
CRON

echo "✅ Cron jobs updated"

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ OPENCLAW v2.0 NATIVE IMPLEMENTATION COMPLETE!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📁 Structure:"
echo "  ~/.openclaw/workspace/           # Master (Allysa)"
echo "  ~/.openclaw/workspace-trading/   # Trading agent"
echo "  ~/.openclaw/workspace-cfo/       # CFO agent"
echo "  ~/.openclaw/agents/              # Client agents"
echo "  ~/.openclaw/shared-skills/       # Shared capabilities"
echo ""
echo "⚠️  NEXT STEPS:"
echo ""
echo "1. VERIFY KIMI API KEY:"
echo "   nano ~/.openclaw/.env"
echo "   KIMI_API_KEY=sk-kimi-..."
echo ""
echo "2. TEST THE SETUP:"
echo "   openclaw agent --message 'Hello' --agent master"
echo ""
echo "3. START GATEWAY:"
echo "   openclaw gateway start"
echo ""
echo "4. TEST TELEGRAM BOT:"
echo "   Message @myhusband_labs_bot"
echo "   Should get AI response (not generic!)"
echo ""
echo "💡 KEY FIX:"
echo "  All agents now use 'model: kimi/k2p5' and inherit"
echo "  KIMI_API_KEY from environment via agents.list[]"
echo "  This should fix the 401 errors!"
echo ""
echo "🗑️  Deprecated scripts moved to: ~/workspace/DEPRECATED/"
echo ""
