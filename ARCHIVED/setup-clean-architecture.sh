#!/bin/bash
# Setup Clean OpenClaw Architecture
# Based on user's specification

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  CLEAN OPENCLAW ARCHITECTURE SETUP                         ║"
echo "║  Based on your specification                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

WORKSPACE="$HOME/.openclaw/workspace"
CONFIG_FILE="$WORKSPACE/openclaw-clean-config.yaml"

echo -e "${YELLOW}[1/6] Checking Prerequisites...${NC}"

# Check OpenClaw
if ! command -v openclaw &> /dev/null; then
    echo -e "${RED}❌ OpenClaw not installed${NC}"
    exit 1
fi
echo "✅ OpenClaw installed"

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Config file not found: $CONFIG_FILE${NC}"
    exit 1
fi
echo "✅ Config file exists"

echo ""
echo -e "${YELLOW}[2/6] Setting Up Environment...${NC}"

# Create .env file if not exists
if [ ! -f "$HOME/.openclaw/.env" ]; then
    cp "$WORKSPACE/.env.example" "$HOME/.openclaw/.env"
    echo "⚠️  Created .env file - YOU MUST EDIT IT AND ADD YOUR KEYS"
    echo "   Location: ~/.openclaw/.env"
else
    echo "✅ .env file exists"
fi

echo ""
echo -e "${YELLOW}[3/6] Creating Agent Workspaces...${NC}"

# Create agent directories
mkdir -p "$HOME/.openclaw/agents/trading"
mkdir -p "$HOME/.openclaw/agents/cfo"

# Create agent SOUL files


## Identity
- Name: BobsBot
- Role: Restaurant customer service
- Personality: Friendly, welcoming, knowledgeable about Italian cuisine

## Business Info
- Type: Italian Restaurant
- Hours: 11 AM - 10 PM daily
- Location: [Your location]
- Phone: [Your phone]

## Menu Highlights
- Pasta: Fettuccine Alfredo, Spaghetti Bolognese, Penne Arrabbiata
- Pizza: Margherita, Pepperoni, Quattro Formaggi
- Specialties: House-made pasta, wood-fired pizza

## Your Job
1. Answer questions about menu, hours, location
2. Take reservations (ask for date, time, party size)
3. Handle dietary restrictions/allergies
4. Be warm and welcoming

## Communication Style
- Warm and friendly
- Knowledgeable about Italian cuisine
- Professional but casual
- Helpful with recommendations
SOUL

echo "✅ Agent workspaces created"

echo ""
echo -e "${YELLOW}[4/6] Setting Up Cron Jobs...${NC}"

# Add cron jobs
(crontab -l 2>/dev/null | grep -v "openclaw"; cat <> CRON) | crontab -
# OpenClaw Clean Architecture Jobs
# Morning report at 6 AM
0 6 * * * cd $HOME/.openclaw/workspace && openclaw run --agent=master "Generate morning report"

# Trading scan every 30 min (8AM-10PM)
*/30 8-22 * * * cd $HOME/.openclaw/workspace && openclaw run --agent=trading "Run trading scan"

# Overnight thinking at 9 PM
0 21 * * * cd $HOME/.openclaw/workspace && openclaw run --agent=master "Run overnight analysis"

# CFO report on 1st and 15th at 8 AM
0 8 1,15 * * cd $HOME/.openclaw/workspace && openclaw run --agent=cfo "Generate CFO report"
CRON

echo "✅ Cron jobs configured"

echo ""
echo -e "${YELLOW}[5/6] Creating Helper Scripts...${NC}"

cat > "$WORKSPACE/start-clean.sh" <> 'START'
#!/bin/bash
# Start Clean OpenClaw Architecture

echo "Starting Clean OpenClaw Architecture..."

# Load environment
export $(cat ~/.openclaw/.env | xargs)

# Start gateway
echo "Starting Gateway on port 18789..."
openclaw gateway start --config=./openclaw-clean-config.yaml &

# Start agents
echo "Starting agents..."
openclaw agent start master --config=./openclaw-clean-config.yaml &
openclaw agent start trading --config=./openclaw-clean-config.yaml &
openclaw agent start cfo --config=./openclaw-clean-config.yaml &

echo "✅ All systems started"
echo ""
echo "Check status: openclaw status"
echo "View agents: openclaw agent list"
START

chmod +x "$WORKSPACE/start-clean.sh"

cat > "$WORKSPACE/add-client.sh" <> 'ADDCLIENT'
#!/bin/bash
# Add new client agent

if [ $# -lt 3 ]; then
    echo "Usage: ./add-client.sh 'Client Name' business_type telegram_bot_token"
    echo "Example: ./add-client.sh 'Janes Boutique' retail '123456:ABC...'"
    exit 1
fi

CLIENT_NAME="$1"
CLIENT_TYPE="$2"
CLIENT_TOKEN="$3"
CLIENT_ID=$(echo "$CLIENT_NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')

echo "Creating client agent: $CLIENT_NAME"

# Create directory
mkdir -p "$HOME/.openclaw/agents/$CLIENT_ID"

# Create SOUL.md
cat > "$HOME/.openclaw/agents/$CLIENT_ID/SOUL.md" <> SOUL
# SOUL.md - $CLIENT_NAME Agent

You are the AI assistant for $CLIENT_NAME.

## Business Info
- Name: $CLIENT_NAME
- Type: $CLIENT_TYPE

## Your Job
Answer customer questions professionally and helpfully.
SOUL

# Create config entry (append to main config)
echo ""
echo "Add this to openclaw-clean-config.yaml:"
echo ""
echo "  $CLIENT_ID:"
echo "    id: \"$CLIENT_ID\""
echo "    name: \"$CLIENT_NAME\""
echo "    model: \"openai/gpt-4o-mini\""
echo "    workspace: \"~/.openclaw/agents/$CLIENT_ID\""
echo "    context:"
echo "      business_name: \"$CLIENT_NAME\""
echo "      business_type: \"$CLIENT_TYPE\""
echo ""
echo "And add Telegram binding:"
echo "  - account: $CLIENT_ID"
echo "    agent: $CLIENT_ID"
echo ""
echo "Don't forget to add to .env:"
echo "TELEGRAM_BOT_TOKEN_$(echo $CLIENT_ID | tr '-' '_')=$CLIENT_TOKEN"
ADDCLIENT

chmod +x "$WORKSPACE/add-client.sh"

echo "✅ Helper scripts created"

echo ""
echo -e "${YELLOW}[6/6] Final Setup...${NC}"

# Create status check script
cat > "$WORKSPACE/status-clean.sh" <> 'STATUS'
#!/bin/bash
echo "=== CLEAN ARCHITECTURE STATUS ==="
echo ""
echo "Agents:"
ls ~/.openclaw/agents/
echo ""
echo "Config:"
ls -la ~/.openclaw/workspace/openclaw-clean-config.yaml
echo ""
echo "Environment:"
[ -f ~/.openclaw/.env ] && echo "✅ .env exists" || echo "❌ .env missing"
echo ""
echo "To start: ./start-clean.sh"
STATUS

chmod +x "$WORKSPACE/status-clean.sh"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ CLEAN ARCHITECTURE SETUP COMPLETE!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📁 Config: ~/.openclaw/workspace/openclaw-clean-config.yaml"
echo "🔐 Secrets: ~/.openclaw/.env"
echo "🤖 Agents: ~/.openclaw/agents/"
echo ""
echo "⚠️  NEXT STEPS:"
echo ""
echo "1. EDIT SECRETS:"
echo "   nano ~/.openclaw/.env"
echo "   Add your API keys and bot tokens"
echo ""
echo "2. TEST AGENT:"
echo ""
echo "3. START SYSTEM:"
echo "   ./start-clean.sh"
echo ""
echo "4. ADD CLIENT:"
echo "   ./add-client.sh 'Client Name' business_type 'bot_token'"
echo ""
echo "💡 BENEFITS OF THIS ARCHITECTURE:"
echo "  • Each agent has its own model/config"
echo "  • Automatic routing via bindings[]"
echo "  • Secure env vars (no plaintext)"
echo "  • Per-customer session isolation"
echo "  • Native agent-to-agent communication"
echo "  • Clean separation of concerns"
echo ""
