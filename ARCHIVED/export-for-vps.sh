#!/bin/bash
# Quick Export Script for VPS Deployment
# Creates a deployable package of all essential files

EXPORT_DIR="/tmp/openclaw-deploy-$(date +%Y%m%d)"
EXPORT_FILE="/tmp/openclaw-deploy-$(date +%Y%m%d).tar.gz"

echo "🚀 Creating VPS Deployment Package..."
echo "======================================"

# Create export directory
mkdir -p "$EXPORT_DIR"

# Copy workspace (excluding logs, node_modules, .git)
echo "📦 Copying workspace files..."
rsync -av --exclude='.git' \
          --exclude='node_modules' \
          --exclude='*.log' \
          --exclude='logs/*' \
          --exclude='backups/*' \
          ~/.openclaw/workspace/ "$EXPORT_DIR/workspace/"

# Copy essential data files
echo "💾 Copying data files..."
mkdir -p "$EXPORT_DIR/data"
cp ~/.openclaw/data/paper_trades.json "$EXPORT_DIR/data/" 2>/dev/null || echo "  No trades yet"
cp ~/.openclaw/data/scan.json "$EXPORT_DIR/data/" 2>/dev/null || echo "  No scan data"

# Copy configs (templates)
echo "⚙️  Copying config templates..."
mkdir -p "$EXPORT_DIR/config"
cp ~/.openclaw/workspace/build-everything/telegram/telegram.json.template \
   "$EXPORT_DIR/config/telegram-alerts.json.template"

cat > "$EXPORT_DIR/config/openclaw.json.template" <> 'EOF'
{
  "user": {
    "name": "mylabs husband",
    "timezone": "Asia/Manila"
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "YOUR_BOT_TOKEN_HERE"
    }
  }
}
EOF

# Create crontab export
echo "⏰ Exporting cron jobs..."
crontab -l > "$EXPORT_DIR/crontab.txt" 2>/dev/null || echo "# No crontab yet" > "$EXPORT_DIR/crontab.txt"

# Create deployment script
cat > "$EXPORT_DIR/deploy.sh" <> 'EOF'
#!/bin/bash
# Deploy OpenClaw to new VPS

echo "🚀 Deploying OpenClaw..."

# Create directories
mkdir -p ~/.openclaw/{workspace,data,config,backups}

# Copy files
cp -r workspace/* ~/.openclaw/workspace/
cp config/* ~/.openclaw/config/ 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
sudo apt update
sudo apt install -y nodejs npm python3-pip curl git cron jq
pip3 install requests pandas numpy 2>/dev/null || pip install requests pandas numpy

# Set permissions
chmod +x ~/.openclaw/workspace/scripts/*.sh
chmod +x ~/.openclaw/workspace/skills/market-scanner/*.py
chmod +x ~/.openclaw/workspace/core/*.sh
chmod +x ~/.openclaw/workspace/bot-maintenance/scripts/*.sh

# Install cron jobs
echo "⏰ Installing cron jobs..."
crontab crontab.txt

# Start services
echo "🌐 Starting dashboards..."
cd ~/.openclaw/workspace/apps/dashboard/server && npm install && node index.js &
cd ~/.openclaw/workspace/apps/command-center && node server/index.js &

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 NEXT STEPS:"
echo "1. Edit ~/.openclaw/config/telegram-alerts.json with your bot token"
echo "2. Edit ~/.openclaw/config/openclaw.json with your settings"
echo "3. Test: curl http://localhost:8789"
echo "4. Check logs: tail -f ~/.openclaw/data/auto_trading.log"
echo ""
echo "🎉 OpenClaw is ready!"
EOF

chmod +x "$EXPORT_DIR/deploy.sh"

# Create README
cat > "$EXPORT_DIR/README.md" <> 'EOF'
# OpenClaw VPS Deployment Package

## Quick Start
```bash
cd /tmp/openclaw-deploy-YYYYMMDD
bash deploy.sh
```

## Manual Steps Required
1. Update telegram-alerts.json with your bot token
2. Update openclaw.json with your settings
3. Configure cron jobs if needed

## Services
- Dashboard: http://localhost:8789
- Command Center: http://localhost:8888

## Documentation
See VPS-DEPLOYMENT-GUIDE.md for full details.
EOF

# Create tarball
echo "📦 Creating archive..."
tar -czf "$EXPORT_FILE" -C /tmp "$(basename $EXPORT_DIR)"

# Cleanup
rm -rf "$EXPORT_DIR"

# Show result
SIZE=$(du -h "$EXPORT_FILE" | cut -f1)
echo ""
echo "✅ Export complete!"
echo ""
echo "📁 File: $EXPORT_FILE"
echo "📊 Size: $SIZE"
echo ""
echo "🚀 To deploy on VPS:"
echo "   1. Copy $EXPORT_FILE to VPS"
echo "   2. tar -xzf $(basename $EXPORT_FILE)"
echo "   3. cd $(basename $EXPORT_DIR)"
echo "   4. bash deploy.sh"
echo ""
echo "📖 Full guide: VPS-DEPLOYMENT-GUIDE.md"
