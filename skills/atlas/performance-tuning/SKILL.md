# Performance Tuning Skill
# Location: ~/.openclaw/agents/atlas/skills/performance-tuning/SKILL.md

*Fast is a feature. Slow is a bug. Crashing is a disaster.*

---

## Trigger

Activate when tasks involve:
- Slow dashboards or API responses
- Agent crashes (especially Echo)
- High memory or CPU usage
- Caching strategies
- Database query slowness
- System feeling sluggish

---

## Core Philosophy

**Measure before you optimize.** Never guess where the bottleneck is. Profile first, fix second. Optimizing the wrong thing wastes time and adds complexity.

**The 80/20 rule.** 80% of performance problems come from 20% of the code. Find that 20%.

**Caching is a trade-off, not a free lunch.** Every cache adds complexity and a new failure mode. Cache only what's proven slow.

**Don't fix symptoms. Fix causes.** Echo crashing is a symptom. Memory leak, connection pool exhaustion, runaway query — those are causes.

---

## Known Issues to Fix

Based on current system state:
- Echo crashes under load
- Dashboards respond slowly
- No caching layer in place

---

## Step 1: Diagnose Before Fixing

### System Resource Snapshot
```bash
#!/bin/bash
# Quick system performance snapshot

echo "=== Performance Snapshot: $(date) ==="

echo ""
echo "🔥 CPU Usage (top 5 processes):"
ps aux --sort=-%cpu | head -6 | awk '{print $1, $2, $3, $4, $11}'

echo ""
echo "💾 Memory Usage (top 5 processes):"
ps aux --sort=-%mem | head -6 | awk '{print $1, $2, $3, $4, $11}'

echo ""
echo "📊 System Load:"
uptime

echo ""
echo "🗄 Disk I/O:"
iostat -x 1 1 2>/dev/null | grep -v "^$\|^Linux\|^avg"

echo ""
echo "🔗 Open Connections:"
ss -s

echo ""
echo "🦞 OpenClaw Process:"
ps aux | grep openclaw | grep -v grep
```

### Echo Crash Diagnosis
```bash
# Find what's causing Echo to crash

# 1. Check crash logs
journalctl --user -u openclaw -p err -n 100 | grep -i echo

# 2. Check memory at time of crash
cat ~/.openclaw/agents/echo/memory/*.log 2>/dev/null | tail -50

# 3. Monitor Echo in real time
watch -n 2 'ps aux | grep echo | grep -v grep | awk "{print \"CPU:\", \$3\"%\", \"MEM:\", \$4\"%\", \"RSS:\", \$6/1024\"MB\"}"'

# 4. Check if it's connection-related
openclaw agent status echo --verbose
```

### Dashboard Slowness Diagnosis
```bash
# Time specific operations to find bottleneck

# Time a database query
time sqlite3 ~/.openclaw/workspace/crm.db "SELECT * FROM clients ORDER BY created_at DESC LIMIT 100;"

# Check slow queries
sqlite3 ~/.openclaw/workspace/crm.db "
 EXPLAIN QUERY PLAN
 SELECT c.*, COUNT(o.id) as order_count
 FROM clients c
 LEFT JOIN orders o ON c.id = o.client_id
 GROUP BY c.id
 ORDER BY c.created_at DESC;
"

# Check missing indexes
sqlite3 ~/.openclaw/workspace/crm.db "
 SELECT name FROM sqlite_master
 WHERE type='table'
 AND name NOT LIKE 'sqlite_%';
"
```

---

## Fix 1: SQLite Performance

### Add Missing Indexes
```sql
-- Run this after profiling which queries are slow

-- Common slow queries fixed with indexes:
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Analyze to update query planner statistics
ANALYZE;
```

### SQLite Performance PRAGMAs
```sql
-- Add to database connection initialization
-- (Put in OpenClaw db config or startup script)

PRAGMA journal_mode = WAL; -- Better concurrent reads
PRAGMA synchronous = NORMAL; -- Faster writes, still safe
PRAGMA cache_size = -64000; -- 64MB cache
PRAGMA temp_store = MEMORY; -- Temp tables in memory
PRAGMA mmap_size = 268435456; -- 256MB memory-mapped I/O
PRAGMA optimize; -- Auto-optimize query plans
```

### Script to apply PRAGMAs
```bash
#!/bin/bash
DB_PATH="$HOME/.openclaw/workspace/crm.db"

sqlite3 "$DB_PATH" "
 PRAGMA journal_mode = WAL;
 PRAGMA synchronous = NORMAL;
 PRAGMA cache_size = -64000;
 PRAGMA temp_store = MEMORY;
 PRAGMA mmap_size = 268435456;
 ANALYZE;
 PRAGMA optimize;
"
echo "✅ SQLite performance settings applied"
```

---

## Fix 2: Echo Crash — Connection Pool

Echo likely crashes due to too many concurrent tool calls exhausting connections.

**Add to Echo's agent config in config.json:**
```json
{
  "id": "echo",
  "performance": {
    "maxConcurrentTools": 3,
    "toolTimeoutMs": 30000,
    "maxMemoryMB": 512,
    "restartOnCrash": true,
    "restartDelayMs": 5000,
    "maxRestarts": 3
  }
}
```

**And in agents.defaults:**
```json
{
  "contextPruning": {
    "enabled": true,
    "strategy": "summarize",
    "keepRecentTurns": 20,
    "maxContextTokens": 80000
  }
}
```

---

## Fix 3: Redis Caching (If Volume Justifies It)

Only add Redis if dashboard queries are measurably slow after SQLite optimization.

```bash
# Install Redis
sudo apt install redis-server

# Configure for low memory (not a primary data store)
# /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save "" # Disable persistence — cache only

# Start Redis
sudo systemctl enable --now redis
redis-cli ping # Should return PONG
```

### Caching Pattern for Dashboards
```javascript
// Cache expensive dashboard queries for 5 minutes

const redis = require('redis');
const client = redis.createClient();

async function getCachedDashboard(key, ttlSeconds, queryFn) {
  // Try cache first
  const cached = await client.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Cache miss — run actual query
  const result = await queryFn();
  
  // Cache result with TTL
  await client.setEx(key, ttlSeconds, JSON.stringify(result));
  
  return result;
}

// Usage
const dashboardData = await getCachedDashboard(
  'dashboard:overview',
  300, // 5 minute TTL
  () => db.query('SELECT ... expensive query ...')
);
```

---

## Fix 4: Resource Limits Per Agent

Prevent one crashed agent from taking down the whole fleet.

```json
{
  "agents": {
    "defaults": {
      "resources": {
        "maxMemoryMB": 512,
        "maxCpuPercent": 50,
        "maxConcurrentRequests": 3
      }
    },
    "list": [
      {
        "id": "echo",
        "resources": {
          "maxMemoryMB": 256,
          "maxConcurrentRequests": 2,
          "restartOnCrash": true
        }
      },
      {
        "id": "atlas",
        "resources": {
          "maxMemoryMB": 768,
          "maxConcurrentRequests": 5
        }
      }
    ]
  }
}
```

---

## Performance Baselines to Establish

Run these weekly and log results. Alerts trigger when 2x baseline.

```bash
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/perf-baseline.sh

echo "=== Performance Baseline: $(date) ==="

# 1. Database query time
echo -n "DB simple query: "
time sqlite3 ~/.openclaw/workspace/crm.db "SELECT COUNT(*) FROM clients;" 2>&1

echo -n "DB complex query: "
time sqlite3 ~/.openclaw/workspace/crm.db \
  "SELECT c.id, COUNT(*) FROM clients c LEFT JOIN orders o ON c.id = o.client_id GROUP BY c.id LIMIT 100;" 2>&1

# 2. Memory index search
echo -n "Memory search time: "
time openclaw memory search "test query" 2>&1

# 3. Gateway health check
echo -n "Gateway response: "
time curl -s http://127.0.0.1:18789/health -o /dev/null 2>&1

# 4. Website response time
echo -n "Website response: "
time curl -s https://amajungle.com -o /dev/null 2>&1

echo "=== Baseline complete ==="
```

---

## Performance Monitoring Dashboard

Add to daily digest output:

```bash
# Response time trend
echo "📈 Performance Trend (last 7 runs):"
grep "DB simple query" ~/.openclaw/workspace/logs/perf-baseline.log | \
  tail -7 | awk '{print $1, $NF}'
```

---

## CDN Setup (When amajungle.com needs it)

Only necessary when static asset load time becomes measurable user pain.

**Cloudflare (recommended — free tier sufficient)**
1. Add site to Cloudflare
2. Update nameservers at domain registrar
3. Enable caching rules:

```
# Page rules:
*.amajungle.com/static/* → Cache Everything, Edge TTL: 1 month
amajungle.com/api/* → Bypass Cache
amajungle.com/ → Cache Level: Standard
```

---

## Cron Schedule

```json
{
  "cron": [
    {
      "name": "perf-baseline",
      "schedule": "0 6 * * 1",
      "task": "Weekly performance baseline measurement"
    },
    {
      "name": "db-optimize",
      "schedule": "0 4 * * 0",
      "task": "Weekly SQLite ANALYZE and optimize"
    }
  ]
}
```

---

## Escalation Rules

| Situation | Action |
|-----------|--------|
| Echo crashes >3x in 24h | Alert Allysa. Review connection limits and memory config. |
| Dashboard response >10s | Alert Allysa. Trigger performance baseline immediately. |
| Memory usage >85% sustained | Alert Allysa. Kill non-critical processes. |
| Database query >5s | Capture EXPLAIN QUERY PLAN. Report to Allysa with findings. |
| Adding Redis | Requires mylabs husband approval — new dependency. |
| CDN setup | Requires mylabs husband approval — touches DNS. |