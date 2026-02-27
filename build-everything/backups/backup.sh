#!/bin/bash
# Automated Backup Script for OpenClaw
# Backs up all critical data daily

BACKUP_DIR="$HOME/.openclaw/backups"
DATA_DIR="$HOME/.openclaw/data"
WORKSPACE="/home/darwin/.openclaw/workspace"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_NAME="openclaw-backup-${DATE}"
RETENTION_DAYS=30

echo "💾 Starting backup: $BACKUP_NAME"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create temp backup folder
TEMP_DIR=$(mktemp -d)
mkdir -p "$TEMP_DIR/$BACKUP_NAME"

# 1. Backup paper trades
echo "  📊 Backing up paper trades..."
if [ -f "$DATA_DIR/paper_trades.json" ]; then
    cp "$DATA_DIR/paper_trades.json" "$TEMP_DIR/$BACKUP_NAME/"
fi

# 2. Backup scan data
echo "  🔍 Backing up market scans..."
if [ -f "$DATA_DIR/scan.json" ]; then
    cp "$DATA_DIR/scan.json" "$TEMP_DIR/$BACKUP_NAME/"
fi

# 3. Backup morning reports
echo "  📄 Backing up reports..."
if [ -f "$DATA_DIR/morning_report.txt" ]; then
    cp "$DATA_DIR/morning_report.txt" "$TEMP_DIR/$BACKUP_NAME/"
fi

# 4. Backup auto-trading logs
echo "  🤖 Backing up trading logs..."
if [ -f "$DATA_DIR/auto_trading.log" ]; then
    cp "$DATA_DIR/auto_trading.log" "$TEMP_DIR/$BACKUP_NAME/"
fi

# 5. Backup configs
echo "  ⚙️  Backing up configs..."
mkdir -p "$TEMP_DIR/$BACKUP_NAME/configs"
cp -r "$HOME/.openclaw/config" "$TEMP_DIR/$BACKUP_NAME/" 2>/dev/null || true
cp "$WORKSPACE/CFO/data/financial-foundation.md" "$TEMP_DIR/$BACKUP_NAME/" 2>/dev/null || true

# 6. Backup trading strategies
echo "  📈 Backing up strategies..."
cp -r "$WORKSPACE/skills" "$TEMP_DIR/$BACKUP_NAME/" 2>/dev/null || true

# 7. Backup Amazon-Client configs (if any)
if [ -d "$WORKSPACE/Amazon-Client/clients" ]; then
    echo "  🛒 Backing up Amazon-Client data..."
    mkdir -p "$TEMP_DIR/$BACKUP_NAME/amazon-client"
    find "$WORKSPACE/Amazon-Client/clients" -name "config" -type d -exec cp -r {} "$TEMP_DIR/$BACKUP_NAME/amazon-client/" \; 2>/dev/null || true
fi

# Create manifest
cat > "$TEMP_DIR/$BACKUP_NAME/manifest.txt" <> EOF
OpenClaw Backup Manifest
========================
Date: $(date)
Hostname: $(hostname)
User: $(whoami)

Contents:
EOF

ls -la "$TEMP_DIR/$BACKUP_NAME/" >> "$TEMP_DIR/$BACKUP_NAME/manifest.txt"

# Compress backup
echo "  📦 Compressing backup..."
cd "$TEMP_DIR"
tar -czf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"

# Cleanup temp
rm -rf "$TEMP_DIR"

# Clean old backups (keep last 30 days)
echo "  🧹 Cleaning old backups..."
find "$BACKUP_DIR" -name "openclaw-backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete

BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)
TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)

echo ""
echo "✅ Backup complete!"
echo "   File: ${BACKUP_NAME}.tar.gz"
echo "   Size: $BACKUP_SIZE"
echo "   Location: $BACKUP_DIR"
echo "   Total backups: $TOTAL_BACKUPS"
echo ""

# Optional: Send notification if Telegram is configured
if [ -f "$HOME/.openclaw/config/telegram.json" ]; then
    echo "   📱 Telegram notification available"
fi
