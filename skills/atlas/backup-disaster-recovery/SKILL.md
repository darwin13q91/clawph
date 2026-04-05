# Backup & Disaster Recovery Skill
# Location: ~/.openclaw/agents/atlas/skills/backup-disaster-recovery/SKILL.md

*The question is not IF something will fail. It's whether you can recover when it does.*

---

## Trigger

Activate when tasks involve:
- Setting up or running backups
- Disaster recovery planning
- Data loss incidents
- System restoration after failure
- Off-site storage configuration
- Point-in-time recovery requests

---

## Core Philosophy

**RPO and RTO first.** Before designing any backup strategy, define:
- **RPO (Recovery Point Objective):** How much data loss is acceptable? (e.g., 24 hours = daily backup is fine)
- **RTO (Recovery Time Objective):** How fast must the system be back? (e.g., 2 hours = manual restore is fine)

**3-2-1 Rule.** Non-negotiable.
- 3 copies of data
- 2 different storage media
- 1 off-site copy

**Untested backups are not backups.** Run restore drills monthly. A backup you've never restored is a hope, not a strategy.

---

## What to Back Up

| Asset | Frequency | Retention | Priority |
|-------|-----------|-----------|----------|
| CRM SQLite database | Every 6 hours | 30 days local, 90 days off-site | 🚨 CRITICAL |
| OpenClaw config.json | On every change + daily | 30 versions | 🚨 CRITICAL |
| .env file | On every change + daily | 30 versions (encrypted) | 🚨 CRITICAL |
| Memory/knowledge files | Daily | 30 days | ⭐️ HIGH |
| Agent SOUL.md files | On every change | All versions (git) | ⭐️ HIGH |
| Skill files | On every change | All versions (git) | ⭐️ HIGH |
| Website codebase | On every push | Git history | ⭐️ HIGH |
| Logs | Daily compressed | 7 days | ℹ️ MEDIUM |
| npm/pip dependencies | Weekly lockfile backup | 5 versions | ℹ️ MEDIUM |

---

## Backup Scripts

### Master Backup Script
```bash
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/backup-all.sh
# Runs everything. Called by cron.

TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
BACKUP_ROOT="$HOME/.openclaw/backups"
LOG="$BACKUP_ROOT/backup.log"

mkdir -p "$BACKUP_ROOT"/{db,config,memory,logs}

echo "[$TIMESTAMP] === Starting full backup ===" | tee -a "$LOG"

# 1. Database backup
bash ~/.openclaw/workspace/scripts/backup-db.sh "$TIMESTAMP" 2>&1 | tee -a "$LOG"

# 2. Config backup
bash ~/.openclaw/workspace/scripts/backup-config.sh "$TIMESTAMP" 2>&1 | tee -a "$LOG"

# 3. Memory/knowledge backup
bash ~/.openclaw/workspace/scripts/backup-memory.sh "$TIMESTAMP" 2>&1 | tee -a "$LOG"

echo "[$TIMESTAMP] === Backup complete ===" | tee -a "$LOG"
```

### Database Backup
```bash
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/backup-db.sh

TIMESTAMP=$1
DB_PATH="$HOME/.openclaw/workspace/crm.db"
BACKUP_DIR="$HOME/.openclaw/backups/db"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Hot backup (safe while DB is running)
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/crm-$TIMESTAMP.db'"
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "❌ CRITICAL: Database backup FAILED (exit $EXIT_CODE)"
  exit 1
fi

# Integrity check on backup
INTEGRITY=$(sqlite3 "$BACKUP_DIR/crm-$TIMESTAMP.db" "PRAGMA integrity_check;")
if [ "$INTEGRITY" != "ok" ]; then
  echo "❌ CRITICAL: Backup integrity check FAILED: $INTEGRITY"
  rm "$BACKUP_DIR/crm-$TIMESTAMP.db"
  exit 1
fi

# Get backup size
SIZE=$(du -sh "$BACKUP_DIR/crm-$TIMESTAMP.db" | cut -f1)
echo "✅ DB backup complete: crm-$TIMESTAMP.db ($SIZE)"

# Prune old backups
find "$BACKUP_DIR" -name "crm-*.db" -mtime +$RETENTION_DAYS -delete
REMAINING=$(ls "$BACKUP_DIR" | wc -l)
echo " Retained: $REMAINING backups"
```

### Config Backup
```bash
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/backup-config.sh

TIMESTAMP=$1
BACKUP_DIR="$HOME/.openclaw/backups/config"

mkdir -p "$BACKUP_DIR"

# Config.json
cp ~/.openclaw/config.json "$BACKUP_DIR/config-$TIMESTAMP.json"

# .env (encrypt before backup — never store plaintext secrets off-site)
# Requires GPG key setup (see off-site section)
cp ~/.openclaw/.env "$BACKUP_DIR/.env-$TIMESTAMP"
chmod 600 "$BACKUP_DIR/.env-$TIMESTAMP"

echo "✅ Config backed up: config-$TIMESTAMP.json"

# Keep last 30 config versions
ls -t "$BACKUP_DIR"/config-*.json | tail -n +31 | xargs rm -f 2>/dev/null
ls -t "$BACKUP_DIR"/.env-* | tail -n +31 | xargs rm -f 2>/dev/null
```

### Memory Backup
```bash
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/backup-memory.sh

TIMESTAMP=$1
BACKUP_DIR="$HOME/.openclaw/backups/memory"
MEMORY_DIR="$HOME/.openclaw/memory"

mkdir -p "$BACKUP_DIR"

# Tar the entire memory directory
tar -czf "$BACKUP_DIR/memory-$TIMESTAMP.tar.gz" -C "$HOME/.openclaw" memory/

SIZE=$(du -sh "$BACKUP_DIR/memory-$TIMESTAMP.tar.gz" | cut -f1)
echo "✅ Memory backed up: memory-$TIMESTAMP.tar.gz ($SIZE)"

# Keep last 14 days
find "$BACKUP_DIR" -name "memory-*.tar.gz" -mtime +14 -delete
```

---

## Restore Procedures

### Point-in-Time Database Restore
```bash
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/restore-db.sh
# USAGE: ./restore-db.sh YYYY-MM-DD-HHMM

TIMESTAMP=$1
BACKUP_FILE="$HOME/.openclaw/backups/db/crm-$TIMESTAMP.db"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup not found: $BACKUP_FILE"
  echo "Available backups:"
  ls -lt ~/.openclaw/backups/db/ | head -10
  exit 1
fi

# Stop services using DB
echo "Stopping services..."
pkill -f "node.*dashboard"

# Backup current DB before restore
cp ~/.openclaw/workspace/crm.db ~/.openclaw/workspace/crm.db.pre-restore-$TIMESTAMP

# Restore
cp "$BACKUP_FILE" ~/.openclaw/workspace/crm.db

# Verify integrity
INTEGRITY=$(sqlite3 ~/.openclaw/workspace/crm.db "PRAGMA integrity_check;")
if [ "$INTEGRITY" = "ok" ]; then
  echo "✅ Restore complete. Database verified."
  echo "Starting services..."
  cd ~/.openclaw/workspace/apps/dashboard && nohup node server/index.js > /dev/null 2>&1 &
else
  echo "❌ Restore FAILED - integrity check: $INTEGRITY"
  echo "Restoring from pre-restore backup..."
  cp ~/.openclaw/workspace/crm.db.pre-restore-$TIMESTAMP ~/.openclaw/workspace/crm.db
fi
```

---

## Cron Schedule

```json
{
  "cron": [
    {
      "name": "backup-db-6h",
      "schedule": "0 */6 * * *",
      "task": "Database backup (every 6 hours)"
    },
    {
      "name": "backup-config-daily",
      "schedule": "0 2 * * *",
      "task": "Config backup (daily at 2am)"
    },
    {
      "name": "backup-memory-daily",
      "schedule": "0 3 * * *",
      "task": "Memory/knowledge backup (daily at 3am)"
    },
    {
      "name": "backup-test-monthly",
      "schedule": "0 4 1 * *",
      "task": "Restore drill - test backup integrity"
    }
  ]
}
```

---

## Off-Site Backup (rclone → Backblaze B2 or Google Drive)

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure remote (run once)
rclone config
# Choose: Backblaze B2 or Google Drive
# Name it: "backup-remote"

# Sync backups to off-site
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/offsite-sync.sh

BACKUP_ROOT="$HOME/.openclaw/backups"
REMOTE="backup-remote:amajungle-backups"

echo "Syncing backups off-site..."

# Sync database backups
rclone sync "$BACKUP_ROOT/db" "$REMOTE/db" \
  --min-age 1h \
  --transfers 2 \
  --log-file="$BACKUP_ROOT/rclone.log"

# Sync config backups
rclone sync "$BACKUP_ROOT/config" "$REMOTE/config" \
  --exclude ".env-*" \
  --transfers 2

echo "✅ Off-site sync complete"
```

---

## Disaster Recovery Runbook

### Scenario 1: OpenClaw Won't Start
```bash
# 1. Check logs
journalctl --user -u openclaw -n 50

# 2. Validate config
openclaw config validate

# 3. If config corrupt — restore last known good
ls -lt ~/.openclaw/backups/config/config-*.json | head -5
cp ~/.openclaw/backups/config/config-TIMESTAMP.json ~/.openclaw/config.json

# 4. Restart
openclaw gateway start
openclaw doctor
```

### Scenario 2: Database Corrupted
```bash
# 1. Stop all agents immediately
openclaw gateway stop

# 2. Find last good backup
ls -lt ~/.openclaw/backups/db/ | head -5

# 3. Verify backup integrity
sqlite3 ~/.openclaw/backups/db/crm-TIMESTAMP.db "PRAGMA integrity_check;"

# 4. Restore
cp ~/.openclaw/workspace/crm.db ~/.openclaw/workspace/crm.db.corrupted
cp ~/.openclaw/backups/db/crm-TIMESTAMP.db ~/.openclaw/workspace/crm.db

# 5. Restart and verify
openclaw gateway start
sqlite3 ~/.openclaw/workspace/crm.db "SELECT COUNT(*) FROM clients;"
```

### Scenario 3: Complete System Rebuild
```bash
# 1. Install OpenClaw fresh
npm install -g openclaw

# 2. Restore config
cp <backup-location>/config-TIMESTAMP.json ~/.openclaw/config.json
cp <backup-location>/.env-TIMESTAMP ~/.openclaw/.env

# 3. Restore database
mkdir -p ~/.openclaw/workspace
cp <backup-location>/crm-TIMESTAMP.db ~/.openclaw/workspace/crm.db

# 4. Restore memory
tar -xzf <backup-location>/memory-TIMESTAMP.tar.gz -C ~/.openclaw/

# 5. Restore agent workspaces
mkdir -p ~/.openclaw/agents/{river,atlas,piper,echo,pixel}/memory

# 6. Start system
openclaw gateway start
openclaw memory index --force
openclaw doctor
```

---

## Cron Schedule

```json
{
  "cron": [
    {
      "name": "backup-db",
      "schedule": "0 */6 * * *",
      "task": "Database backup every 6 hours"
    },
    {
      "name": "backup-all",
      "schedule": "0 2 * * *",
      "task": "Full system backup at 2am daily"
    },
    {
      "name": "offsite-sync",
      "schedule": "0 3 * * *",
      "task": "Sync backups to off-site storage"
    },
    {
      "name": "restore-drill",
      "schedule": "0 4 1 * *",
      "task": "Monthly: Test restore from latest backup to verify integrity"
    }
  ]
}
```

---

## Monthly Restore Drill

```bash
#!/bin/bash
# Verify last backup can actually be restored
# Run on a copy, never on production

LATEST_BACKUP=$(ls -t ~/.openclaw/backups/db/crm-*.db | head -1)
TEST_PATH="/tmp/crm-restore-test.db"

cp "$LATEST_BACKUP" "$TEST_PATH"

# Verify integrity
RESULT=$(sqlite3 "$TEST_PATH" "PRAGMA integrity_check;")

if [ "$RESULT" = "ok" ]; then
  ROW_COUNT=$(sqlite3 "$TEST_PATH" "SELECT COUNT(*) FROM clients;")
  echo "✅ Restore drill passed: $LATEST_BACKUP | $ROW_COUNT client rows"
else
  echo "❌ CRITICAL: Restore drill FAILED: $RESULT"
  echo "Immediate action required — last backup may be unusable"
fi

rm "$TEST_PATH"
```

---

## Escalation Rules

| Situation | Action |
|-----------|--------|
| Any backup failure | Alert Allysa immediately. Retry once. Escalate if second failure. |
| Restore drill fails | 🚨 CRITICAL. Alert Allysa. Do not wait for next scheduled run. |
| Off-site sync fails 3x | Alert Allysa. Check storage quota and credentials. |
| Database corruption detected | Stop all agents immediately. Alert Allysa before any restore. |
| >24 hours since last backup | Alert Allysa. Investigate cron failure. |