#!/bin/bash
# Simplified Setup Script for OpenClaw v2.0

echo "=== OpenClaw v2.0 Setup ==="
echo ""

# Check config
if [ ! -f "$HOME/.openclaw/workspace/openclaw-v2-native.json" ]; then
    echo "❌ Config not found"
    exit 1
fi

echo "✅ Config found"

# Create directories
echo "Creating directories..."
mkdir -p "$HOME/.openclaw/workspace-trading/data"
mkdir -p "$HOME/.openclaw/workspace-cfo/data"
mkdir -p "$HOME/.openclaw/scripts"
mkdir -p "$HOME/.openclaw/backups"

# Move deprecated scripts
mkdir -p "$HOME/.openclaw/workspace/DEPRECATED"
[ -f "$HOME/.openclaw/workspace/master-control.sh" ] && mv "$HOME/.openclaw/workspace/master-control.sh" "$HOME/.openclaw/workspace/DEPRECATED/"
[ -f "$HOME/.openclaw/workspace/client-router.py" ] && mv "$HOME/.openclaw/workspace/client-router.py" "$HOME/.openclaw/workspace/DEPRECATED/"
[ -d "$HOME/.openclaw/workspace/local-bot" ] && mv "$HOME/.openclaw/workspace/local-bot" "$HOME/.openclaw/workspace/DEPRECATED/"

echo "✅ Directories created"

# Install config
echo "Installing config..."
cp "$HOME/.openclaw/workspace/openclaw-v2-native.json" "$HOME/.openclaw/openclaw.json"
echo "✅ Config installed"

# Create simple agent files
echo "Creating agent files..."
echo "# Allysa Master Agent" > "$HOME/.openclaw/workspace/AGENTS.md"
echo "# TradeBot" > "$HOME/.openclaw/workspace-trading/AGENTS.md"
echo "# CFO Agent" > "$HOME/.openclaw/workspace-cfo/AGENTS.md"

echo "✅ Agent files created"

# Create health check script
cat > "$HOME/.openclaw/scripts/health-check.sh" <> 'EOF'
#!/bin/bash
# Health check
curl -s "https://api.telegram.org/bot8606070459:AAEsiAmLNv0gxyICsUib_EYjIOkylToWjfU/sendMessage" \
    -d "chat_id=6504570121" \
    -d "text=Health check: $(date)" 2>/dev/null || true
EOF
chmod +x "$HOME/.openclaw/scripts/health-check.sh"

echo "✅ Scripts created"

# Create .env if missing
if [ ! -f "$HOME/.openclaw/.env" ]; then
    echo "Creating .env template..."
    echo "KIMI_API_KEY=your-key-here" > "$HOME/.openclaw/.env"
    echo "TELEGRAM_BOT_TOKEN_ADMIN=8614261430:AAGWQ1TcNWXB4zrGu_-KrdlAPT9k_Vaova0" >> "$HOME/.openclaw/.env"
    echo "TELEGRAM_BOT_TOKEN_ALERTS=8606070459:AAEsiAmLNv0gxyICsUib_EYjIOkylToWjfU" >> "$HOME/.openclaw/.env"
fi

echo ""
echo "=== SETUP COMPLETE ==="
echo ""
echo "Next steps:"
echo "1. Edit ~/.openclaw/.env and add your KIMI_API_KEY"
echo "2. Run: openclaw gateway start"
echo "3. Test: openclaw agent --message 'Hello' --agent master"
