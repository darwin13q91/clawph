# Database Administration Skill
# Location: ~/.openclaw/agents/atlas/skills/database-administration/SKILL.md

*A database that isn't backed up isn't a database. It's a time bomb.*

---

## Trigger

Activate when tasks involve:
- SQLite, PostgreSQL, or any database operations
- Backups, migrations, schema changes
- Query performance issues
- Data integrity checks
- CRM database maintenance

---

## Core Philosophy

Data is the only thing that can't be recreated. Code can be rewritten. Servers can be rebuilt. Data lost is gone forever. Treat every database operation as irreversible until proven otherwise.

Migrations are one-way doors. Always write rollback scripts before running forward migrations. Never run migrations directly on production without testing on a copy first.

Backups are worthless until tested. A backup you've never restored is not a backup — it's a hope.

---

## SQLite Operations (Primary — CRM)

### Automated Backup Script
```bash
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/db-backup.sh

DB_PATH="$HOME/.openclaw/workspace/crm.db"
BACKUP_DIR="$HOME/.openclaw/backups/db"
DATE=$(date +%Y-%m-%d-%H%M)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Hot backup using SQLite online backup API
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/crm-$DATE.db'"

# Verify backup integrity
sqlite3 "$BACKUP_DIR/crm-$DATE.db" "PRAGMA integrity_check;" | grep -q "ok" \
 && echo "✅ Backup verified: crm-$DATE.db" \
 || echo "❌ Backup FAILED integrity check: crm-$DATE.db"

# Prune old backups
find "$BACKUP_DIR" -name "*.db" -mtime +$RETENTION_DAYS -delete

echo "Backup complete. $(ls $BACKUP_DIR | wc -l) backups retained."
```

### Schema Migration Pattern
```sql
# Always version migrations
# Location: ~/.openclaw/workspace/migrations/

# Migration file naming: YYYYMMDD-HHMMSS-description.sql
# Example: 20260309-120000-add-client-status.sql

# Forward migration
-- migrate:up
ALTER TABLE clients ADD COLUMN status TEXT DEFAULT 'active';
CREATE INDEX idx_clients_status ON clients(status);

-- migrate:down
DROP INDEX idx_clients_status;
-- SQLite doesn't support DROP COLUMN directly — recreate table
```

### Query Optimization
```sql
-- Check slow queries
EXPLAIN QUERY PLAN SELECT * FROM clients WHERE email = 'test@example.com';

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);

-- Analyze table statistics
ANALYZE clients;

-- Check database size and fragmentation
SELECT page_count * page_size / 1024 / 1024 AS size_mb FROM pragma_page_count(), pragma_page_size();

-- Reclaim space after deletions
VACUUM;
```

### Integrity Checks
```bash
#!/bin/bash
# Run daily via cron

DB_PATH="$HOME/.openclaw/workspace/crm.db"

echo "=== Database Integrity Check: $(date) ==="

# Full integrity check
sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 

# Foreign key check
sqlite3 "$DB_PATH" "PRAGMA foreign_key_check;"

# Quick stats
sqlite3 "$DB_PATH" "
 SELECT 'clients' as table_name, COUNT(*) as rows FROM clients
 UNION ALL
 SELECT 'orders', COUNT(*) FROM orders;
"
```

---

## Cron Schedule (Add to OpenClaw)

```json
{
  "cron": [
    {
      "name": "db-backup-daily",
      "schedule": "0 2 * * *",
      "task": "Run database backup and integrity check",
      "script": "~/.openclaw/workspace/scripts/db-backup.sh"
    },
    {
      "name": "db-integrity-weekly",
      "schedule": "0 3 * * 0",
      "task": "Full database integrity check and VACUUM",
      "script": "~/.openclaw/workspace/scripts/db-integrity.sh"
    }
  ]
}
```

---

## Escalation Rules

| Situation | Action |
|-----------|--------|
| Integrity check fails | 🚨 Immediate alert to Allysa. Do not run any writes until resolved. |
| Backup fails 2x in a row | 🚨 Alert Allysa. Investigate storage and permissions. |
| Database size >500MB | ⚠️ Alert Allysa. Plan archival or optimization. |
| Migration on production | Require explicit mylabs husband approval before running. |
| Schema change affects CRM | Notify Echo — support flows may be affected. |

---

## Pre-Migration Checklist

Before any schema change:
- [ ] Backup taken and verified within last hour
- [ ] Rollback script written and tested
- [ ] Tested on copy of production data
- [ ] Estimated execution time assessed (long migrations lock the DB)
- [ ] mylabs husband notified of maintenance window
- [ ] Monitoring watching for errors during migration