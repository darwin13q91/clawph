# Monitoring & Alerting Skill
# Location: ~/.openclaw/agents/atlas/skills/monitoring-alerting/SKILL.md

*You can't fix what you don't know is broken. Monitor everything. Alert on what matters.*

---

## Trigger

Activate when tasks involve:
- System health checks
- Performance degradation
- Error rate spikes
- Disk/memory/CPU issues
- API response time monitoring
- Dashboard and reporting setup

---

## Core Philosophy

**Alert on symptoms, not causes.**
Don't alert when CPU hits 80%. Alert when response time degrades or errors spike — those are what users feel.

**Every alert must be actionable.**
If you can't do something about an alert, it's not an alert — it's noise. Noise kills alerting culture.

**Measure baselines first.**
You can't know when something is wrong until you know what normal looks like. Establish baselines before setting thresholds.

---

## System Metrics to Monitor

### Critical (Alert Immediately)
| Metric | Threshold | Why |
|--------|-----------|-----|
| OpenClaw gateway down | Any downtime | Core system offline |
| Disk space | >90% full | Prevents writes, crashes agents |
| Memory | >95% used | System instability, crashes |
| API error rate | >10% in 5min window | Agents failing tasks |
| Database locked | >30 seconds | CRM operations blocked |
| Telegram bot offline | >5 minutes | Primary interface down |

### Warning (Alert Within 1 Hour)
| Metric | Threshold | Why |
|--------|-----------|-----|
| Disk space | >75% full | Time to plan cleanup |
| Memory | >85% used | Getting close to critical |
| API response time | >5 seconds avg | Agents running slow |
| Failed cron jobs | 2+ consecutive | Automation breaking down |
| Kimi API quota | <20% remaining | Risk of hitting limit |

### Informational (Daily Digest)
| Metric | Purpose |
|--------|---------|
| Total API calls used | Track Kimi quota consumption |
| Agent session count | Usage patterns |
| Memory files indexed | Knowledge base growth |
| Backup status | Confirm last successful backup |

---

## Monitoring Scripts

### System Health Check
```bash
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/health-check.sh
# Run every 5 minutes via cron

ALERT_LOG="$HOME/.openclaw/workspace/logs/alerts.log"
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
ALERTS=()

# Disk space check
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
  ALERTS+=("🚨 CRITICAL: Disk usage at ${DISK_USAGE}%")
elif [ "$DISK_USAGE" -gt 75 ]; then
  ALERTS+=("⚠️ WARNING: Disk usage at ${DISK_USAGE}%")
fi

# Memory check
MEM_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2*100}')
if [ "$MEM_USAGE" -gt 95 ]; then
  ALERTS+=("🚨 CRITICAL: Memory usage at ${MEM_USAGE}%")
elif [ "$MEM_USAGE" -gt 85 ]; then
  ALERTS+=("⚠️ WARNING: Memory usage at ${MEM_USAGE}%")
fi

# OpenClaw gateway check
if ! systemctl --user is-active --quiet openclaw; then
  ALERTS+=("🚨 CRITICAL: OpenClaw gateway is DOWN")
fi

# Send alerts
if [ ${#ALERTS[@]} -gt 0 ]; then
  for alert in "${ALERTS[@]}"; do
    echo "[$TIMESTAMP] $alert" | tee -a "$ALERT_LOG"
  done
fi
```

### Agent Performance Monitor
```bash
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/agent-monitor.sh

LOG_DIR="$HOME/.openclaw/workspace/logs"
ALERT_LOG="$LOG_DIR/alerts.log"
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)

# Check recent agent errors
ERROR_COUNT=$(grep -c "ERROR" "$LOG_DIR/openclaw.log" 2>/dev/null || echo 0)
if [ "$ERROR_COUNT" -gt 10 ]; then
  echo "[$TIMESTAMP] ⚠️ WARNING: $ERROR_COUNT errors in last check" | tee -a "$ALERT_LOG"
fi

# Check API response times
AVG_RESPONSE=$(tail -100 "$LOG_DIR/api.log" | grep -oP 'response_time=\K[0-9.]+' | awk '{sum+=$1; count++} END {if(count>0) printf "%.0f", sum/count}')
if [ -n "$AVG_RESPONSE" ] && [ "$AVG_RESPONSE" -gt 5000 ]; then
  echo "[$TIMESTAMP] ⚠️ WARNING: API avg response ${AVG_RESPONSE}ms" | tee -a "$ALERT_LOG"
fi
```

---

## Alert Routing

| Severity | Channel | Response Time |
|----------|---------|---------------|
| 🚨 CRITICAL | Telegram + Email (immediate) | < 5 minutes |
| ⚠️ WARNING | Telegram (within hour) | < 1 hour |
| ℹ️ INFO | Daily digest only | End of day |

### Telegram Alert Format
```
🚨 CRITICAL: OpenClaw Gateway DOWN
Time: 2026-03-13 14:32:15 UTC
Impact: All agents offline
Action: Restarting gateway automatically...

[View Dashboard] [Acknowledge] [Escalate]
```

---

## Baseline Establishment

Before setting alerts, measure for 7 days:

```bash
# Daily metrics collection
# Run via cron at 23:59

echo "$(date +%Y-%m-%d) $(df / | awk 'NR==2 {print $5}') $(free | awk 'NR==2 {printf "%.0f", $3/$2*100}') $(wc -l < ~/.openclaw/workspace/logs/openclaw.log)" >> ~/.openclaw/workspace/logs/baseline.log
```

**After 7 days, calculate:**
- Average disk usage (set warning at average + 15%)
- Average memory usage (set warning at average + 10%)
- Normal error rate (set alert at 2x normal)

### API Response Time Monitor
```bash
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/api-monitor.sh

ENDPOINTS=(
  "http://127.0.0.1:18789/health"
  "https://amajungle.com"
)

for url in "${ENDPOINTS[@]}"; do
  RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" "$url")
  HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}" "$url")
  
  echo "$(date +%H:%M:%S) | $url | ${HTTP_CODE} | ${RESPONSE_TIME}s"
  
  if (( $(echo "$RESPONSE_TIME > 5.0" | bc -l) )); then
    echo "⚠️ WARNING: Slow response from $url: ${RESPONSE_TIME}s"
  fi
  
  if [ "$HTTP_CODE" != "200" ]; then
    echo "🚨 CRITICAL: $url returned HTTP $HTTP_CODE"
  fi
done
```

### Daily Digest Report
```bash
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/daily-digest.sh
# Run at 7am daily

echo "=== Daily System Digest: $(date +%Y-%m-%d) ==="
echo ""

# System resources
echo "📊 System Resources:"
echo "  Disk: $(df / | awk 'NR==2 {print $5}') used"
echo "  Memory: $(free -h | awk 'NR==2 {print $3"/"$2}')"
echo "  Load: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

# OpenClaw status
echo "🦞 OpenClaw Status:"
openclaw doctor 2>&1 | grep -E "Gateway|Agents|Memory|Sessions"
echo ""

# API quota
echo "🔑 Kimi API Quota:"
curl -s -H "Authorization: Bearer $KIMI_API_KEY" \
  https://api.kimi.com/coding/v1/usages | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
u = d['usage']
print(f\" Used: {u['used']}/{u['limit']} | Remaining: {u['remaining']} | Resets: {u['resetTime'][:10]}\")
"
echo ""

# Last backup status
echo "💾 Last Backup:"
ls -lt ~/.openclaw/backups/db/*.db 2>/dev/null | head -3 | awk '{print "  "$6" "$7" "$8" "$9}'
echo ""

echo "=== End Digest ==="
```

---

## Cron Schedule

```json
{
  "cron": [
    {
      "name": "health-check",
      "schedule": "*/5 * * * *",
      "task": "Run system health check and alert on critical issues"
    },
    {
      "name": "api-monitor",
      "schedule": "*/10 * * * *",
      "task": "Check API endpoints response time and availability"
    },
    {
      "name": "daily-digest",
      "schedule": "0 7 * * *",
      "task": "Send daily system digest to Allysa"
    }
  ]
}
```

---

## Alert Routing

| Severity | Channel | Response Time |
|----------|---------|---------------|
| 🚨 CRITICAL | Telegram (immediate) | Acknowledge within 15 minutes |
| ⚠️ WARNING | Daily digest + Telegram | Address within 24 hours |
| ℹ️ INFO | Daily digest only | Review weekly |

---

## Escalation Rules

| Situation | Action |
|-----------|--------|
| Gateway down >5 minutes | Alert Allysa immediately via all channels |
| Disk >90% | Alert Allysa. Begin cleanup immediately. |
| 3+ consecutive cron failures | Alert Allysa. Diagnose before next scheduled run. |
| API quota <10% | Alert Allysa. Suspend non-critical agent tasks. |
| Echo crashes (per history) | Auto-restart attempt once. If fails again — alert Allysa. |