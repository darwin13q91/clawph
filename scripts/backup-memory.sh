#!/bin/bash
# MEMORY.md Backup Script
# Runs every hour to backup MEMORY.md with timestamp

SOURCE="/home/darwin/.openclaw/workspace/MEMORY.md"
BACKUP_DIR="/home/darwin/.openclaw/workspace/memory/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/MEMORY_$DATE.md"

# Create backup
cp "$SOURCE" "$BACKUP_FILE"

# Keep only last 24 backups (1 day)
cd "$BACKUP_DIR"
ls -t MEMORY_*.md | tail -n +25 | xargs -r rm

echo "[$(date)] MEMORY.md backed up to $BACKUP_FILE"
