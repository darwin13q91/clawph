#!/bin/bash
# OpenClaw v2.0 Enhanced Architecture Setup
# Implements the specification from ARCHITECTURE-v2.md

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  OPENCLAW v2.0 ENHANCED ARCHITECTURE                       ║"
echo "║  Implementation Script                                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

WORKSPACE="$HOME/.openclaw/workspace"
CONFIG_FILE="$WORKSPACE/openclaw-v2.json"
ENV_FILE="$HOME/.openclaw/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}[1/7] Validating Configuration...${NC}"

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Config file not found: $CONFIG_FILE${NC}"
    exit 1
fi

echo "✅ Config file exists"

# Check for .env
echo ""
echo -e "${YELLOW}[2/7] Setting Up Environment...${NC}"

if [ ! -f "$ENV_FILE" ]; then
    cp "$WORKSPACE/.env.v2.example" "$ENV_FILE"
    echo -e "${RED}⚠️  Created .env file - YOU MUST EDIT IT${NC}"
    echo "   Location: $ENV_FILE"
    echo "   Required: ANTHROPIC_API_KEY or OPENAI_API_KEY"
    echo ""
    read -p "Press Enter to continue anyway (will use fallbacks)..."
else
    echo "✅ .env file exists"
fi

# Load environment
set -a
source "$ENV_FILE" 2>/dev/null || echo "⚠️  Could not source .env"
set +a

echo ""
echo -e "${YELLOW}[3/7] Creating Agent Workspaces...${NC}"

# Create workspace directories
mkdir -p "$HOME/.openclaw/workspace-trading"
mkdir -p "$HOME/.openclaw/workspace-cfo"

# Copy trading files to trading workspace
if [ -d "$WORKSPACE/skills/market-scanner" ]; then
    cp -r "$WORKSPACE/skills/market-scanner" "$HOME/.openclaw/workspace-trading/"
    echo "✅ Trading workspace created"
fi

# Create CFO workspace
touch "$HOME/.openclaw/workspace-cfo/.gitkeep"
echo "✅ CFO workspace created"

# Create agent SOUL.md files


## Identity
- Name: BobsBot
- Role: Restaurant customer service
- Personality: Warm, welcoming, knowledgeable about Italian cuisine
- Emoji: 🍝

## Business Information
- Type: Italian Restaurant
- Hours: 11:00 AM - 10:00 PM daily
- Phone: (555) 123-4567
- Location: 123 Main Street

## Menu
### Pasta
- Fettuccine Alfredo - $16
- Spaghetti Bolognese - $14
- Penne Arrabbiata - $15

### Pizza
- Margherita - $12
- Pepperoni - $14
- Quattro Formaggi - $16

### Specialties
- House-made pasta
- Wood-fired pizza
- Fresh daily specials

## Your Capabilities
1. Answer menu questions
2. Provide hours and location
3. Handle dietary restrictions
4. Take reservations (ask for: date, time, party size, name)
5. Be warm and welcoming

## Response Style
- Friendly and conversational
- Professional but casual
- Helpful with recommendations
- Always end with an invitation to visit
SOUL

echo "✅ Agent workspaces created"

echo ""
echo -e "${YELLOW}[4/7] Backing Up Current Config...${NC}"

if [ -f "$HOME/.openclaw/openclaw.json" ]; then
    cp "$HOME/.openclaw/openclaw.json" "$HOME/.openclaw/openclaw.json.backup.$(date +%Y%m%d%H%M%S)"
    echo "✅ Backup created"
fi

echo ""
echo -e "${YELLOW}[5/7] Installing New Config...${NC}"

# Install new config
cp "$CONFIG_FILE" "$HOME/.openclaw/openclaw.json"
echo "✅ Config installed"

echo ""
echo -e "${YELLOW}[6/7] Updating Trading Scripts...${NC}"

# Add error alerting to trading scan
TRADING_CRON="*/30 8-22 * * * cd $HOME/.openclaw/workspace-trading/market-scanner && python3 scan.py >> $HOME/.openclaw/data/auto_trading.log 2>&1 || curl -s \"https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN_ALERTS:-8606070459:AAEsiAmLNv0gxyICsUib_EYjIOkylToWjfU}/sendMessage\" -d \"chat_id=${TELEGRAM_ALERT_CHAT_ID:-6504570121}\&text=⚠️ Trading scan FAILED at $(date)\""

# Update cron
echo "Installing trading cron with error alerting..."
(crontab -l 2>/dev/null | grep -v "market-scanner" || true; echo "$TRADING_CRON") | crontab -

echo "✅ Trading cron updated"

echo ""
echo -e "${YELLOW}[7/7] Creating Helper Scripts...${NC}"

# Create status script
cat > "$WORKSPACE/status-v2.sh" <> 'STATUS'
#!/bin/bash
echo "=== OpenClaw v2.0 Status ==="
echo ""
echo "Agents:"
ls -1 ~/.openclaw/agents/ 2>/dev/null | while read agent; do
    echo "  📁 $agent"
done
echo ""
echo "Workspaces:"
echo "  Master:   ~/.openclaw/workspace"
echo "  Trading:  ~/.openclaw/workspace-trading"
echo "  CFO:      ~/.openclaw/workspace-cfo"
echo ""
echo "Config: ~/.openclaw/openclaw.json"
echo ""
echo "API Status:"
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "  ✅ Anthropic API key configured"
else
    echo "  ❌ Anthropic API key missing"
fi
if [ -n "$OPENAI_API_KEY" ]; then
    echo "  ✅ OpenAI API key configured"
else
    echo "  ❌ OpenAI API key missing"
fi
echo ""
echo "To start: openclaw gateway start"
echo "To check: openclaw status"
STATUS

chmod +x "$WORKSPACE/status-v2.sh"

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ OPENCLAW v2.0 ENHANCED ARCHITECTURE INSTALLED!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📁 Config: ~/.openclaw/openclaw.json"
echo "🔐 Secrets: ~/.openclaw/.env"
echo "🤖 Agents: ~/.openclaw/agents/"
echo ""
echo -e "${YELLOW}⚠️  CRITICAL NEXT STEPS:${NC}"
echo ""
echo "1. EDIT SECRETS:"
echo "   nano ~/.openclaw/.env"
echo "   Add: ANTHROPIC_API_KEY=sk-ant-... (get from console.anthropic.com)"
echo "   Or:  OPENAI_API_KEY=sk-openai-... (get from platform.openai.com)"
echo ""
echo "2. VERIFY AGENTS:"
echo "   cd ~/.openclaw/workspace"
echo "   ./status-v2.sh"
echo ""
echo "3. TEST AGENT:"
echo ""
echo "4. START GATEWAY:"
echo "   openclaw gateway start"
echo ""
echo "5. ADD CLIENT:"
echo "   Edit IDs and tokens"
echo "   Restart gateway"
echo ""
echo "💡 KEY IMPROVEMENTS IN v2.0:"
echo "  • Native agents.list[] routing (no custom scripts)"
echo "  • bindings[] automatic Telegram routing"
echo "  • Per-agent model configuration"
echo "  • sandbox mode for client security"
echo "  • Anthropic/OpenAI instead of broken Kimi API"
echo "  • Explicit agent declarations"
echo "  • Per-channel-peer session isolation"
echo ""
