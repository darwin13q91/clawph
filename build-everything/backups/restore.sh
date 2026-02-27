#!/bin/bash
# Restore from backup
# Usage: ./restore.sh backup-file.tar.gz

BACKUP_FILE=$1
RESTORE_DIR="$HOME/.openclaw"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 backup-file.tar.gz"
    echo ""
    echo "Available backups:"
    ls -lh "$RESTORE_DIR/backups/"/*.tar.gz 2>/dev/null || echo "  No backups found"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  This will restore data from: $BACKUP_FILE"
echo "   Current data will be backed up first."
echo ""
read -p "Continue? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled."
    exit 0
fi

# Create safety backup of current state
echo "🛡️  Creating safety backup of current state..."
bash "$(dirname "$0")/backup.sh" > /dev/null 2>&1

# Extract backup
TEMP_DIR=$(mktemp -d)
echo "📦 Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

BACKUP_FOLDER=$(ls "$TEMP_DIR")
echo "   Source: $BACKUP_FOLDER"

# Restore files
echo "🔄 Restoring files..."

# Paper trades
if [ -f "$TEMP_DIR/$BACKUP_FOLDER/paper_trades.json" ]; then
    cp "$TEMP_DIR/$BACKUP_FOLDER/paper_trades.json" "$RESTORE_DIR/data/"
    echo "  ✅ Paper trades restored"
fi

# Scan data
if [ -f "$TEMP_DIR/$BACKUP_FOLDER/scan.json" ]; then
    cp "$TEMP_DIR/$BACKUP_FOLDER/scan.json" "$RESTORE_DIR/data/"
    echo "  ✅ Market scans restored"
fi

# Reports
if [ -f "$TEMP_DIR/$BACKUP_FOLDER/morning_report.txt" ]; then
    cp "$TEMP_DIR/$BACKUP_FOLDER/morning_report.txt" "$RESTORE_DIR/data/"
    echo "  ✅ Reports restored"
fi

# Configs
if [ -d "$TEMP_DIR/$BACKUP_FOLDER/config" ]; then
    cp -r "$TEMP_DIR/$BACKUP_FOLDER/config/"* "$RESTORE_DIR/config/" 2>/dev/null || true
    echo "  ✅ Configs restored"
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Restore complete!"
echo "   Restart services if needed."
