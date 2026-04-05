# CI/CD & Deployment Skill
# Location: ~/.openclaw/agents/atlas/skills/cicd-deployment/SKILL.md

*Manual deployments are a liability. Every manual step is a human error waiting to happen.*

---

## Trigger

Activate when tasks involve:
- Deploying code changes to production
- GitHub push/merge events
- Rollback requests
- Environment management (dev/staging/prod)
- Restart procedures for OpenClaw or amajungle.com

---

## Core Philosophy

Automate the path to production. Human-gate the decision to deploy.
The pipeline should handle everything mechanical. A human should still approve production deploys for anything non-trivial.

Every deploy must be reversible.
If you can't roll back in under 5 minutes, the deploy process is broken.

Staging is not optional.
Nothing goes to production without running in staging first. Ever.

---

## Current Stack Deployment (OpenClaw)

### Manual Restart → Automated (systemd)
```bash
# Check current service status
systemctl --user status openclaw

# Reload config without full restart (when possible)
openclaw gateway restart

# Full service restart
systemctl --user restart openclaw

# Watch logs during restart
journalctl --user -u openclaw -f
```

### Deployment Script
```bash
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/deploy.sh
# Usage: ./deploy.sh [component] [version]
# Example: ./deploy.sh openclaw 2026.3.8

COMPONENT=$1
VERSION=$2
LOG_FILE="$HOME/.openclaw/workspace/logs/deploys.log"
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)

echo "[$TIMESTAMP] Starting deploy: $COMPONENT $VERSION" | tee -a "$LOG_FILE"

case $COMPONENT in
  openclaw)
    # Backup config before upgrade
    cp ~/.openclaw/config.json ~/.openclaw/backups/config-pre-$TIMESTAMP.json
    
    # Stop gateway
    openclaw gateway stop
    
    # Upgrade
    npm install -g openclaw@$VERSION
    
    # Verify install
    openclaw --version
    
    # Restart
    openclaw gateway start
    
    # Health check
    sleep 5
    openclaw doctor
    ;;
    
  website)
    # Pull latest
    cd ~/amajungle && git pull origin main
    
    # Install dependencies
    npm install --production
    
    # Build
    npm run build
    
    # Restart web server
    pm2 restart amajungle
    ;;
    
  *)
    echo "Unknown component: $COMPONENT"
    exit 1
    ;;
esac

echo "[$TIMESTAMP] Deploy complete: $COMPONENT $VERSION" | tee -a "$LOG_FILE"
```

### Rollback Script
```bash
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/rollback.sh
# Usage: ./rollback.sh [component]

COMPONENT=$1
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)

case $COMPONENT in
  openclaw)
    # Restore last known good config
    LAST_BACKUP=$(ls -t ~/.openclaw/backups/config-pre-*.json | head -1)
    cp "$LAST_BACKUP" ~/.openclaw/config.json
    echo "Config restored from: $LAST_BACKUP"
    
    # Restart
    openclaw gateway restart
    ;;
    
  website)
    cd ~/amajungle
    git log --oneline -5 # Show recent commits
    read -p "Enter commit hash to rollback to: " COMMIT
    git checkout $COMMIT
    npm run build
    pm2 restart amajungle
    ;;
esac
```

---

## GitHub Integration

### Webhook Handler (Auto-deploy on push)
```bash
#!/bin/bash
# Triggered by GitHub webhook on push to main

BRANCH=$1
REPO=$2

# Only auto-deploy non-production pushes
if [ "$BRANCH" = "main" ]; then
  echo "🚨 Push to main detected. Requiring manual approval before production deploy."
  # Notify Allysa via OpenClaw
  openclaw agent message master "Push to main detected on $REPO. Approve deploy? (yes/no)"
  exit 0
fi

if [ "$BRANCH" = "staging" ]; then
  echo "Auto-deploying to staging..."
  ./deploy.sh website staging
fi
```

### Deploy Log Format
```json
{
  "timestamp": "YYYY-MM-DD HH:MM:SS",
  "component": "openclaw | website | script",
  "version_before": "2026.3.6",
  "version_after": "2026.3.7",
  "deployed_by": "atlas | manual",
  "status": "SUCCESS | FAILED | ROLLED_BACK",
  "rollback_available": true,
  "notes": ""
}
```

---

## Environment Management

### Staging → Production Flow
1. Developer pushes to feature branch
2. PR reviewed and merged to staging
3. Atlas auto-deploys to staging
4. Smoke tests run on staging
5. Allysa approves production deploy
6. Atlas deploys to production
7. Health checks verify production
8. Rollback window (5 min) — Atlas monitors for errors

### Rollback Triggers
- Error rate spike (>5x baseline)
- Health check failures
- Manual request from Allysa
- Automated alert threshold breached

---

## Environment Management

| Environment | Purpose | Deploy Method | Approval Required |
|-------------|---------|---------------|-------------------|
| local | Development/testing | Manual | None |
| staging | Pre-production validation | Auto on push | None |
| production | Live system | Manual trigger | mylabs husband |

### Environment Variables
```bash
# Never hardcode. Always reference from .env
# Location: ~/.openclaw/.env

# Production flag
NODE_ENV=production

# Verify env is loaded
printenv | grep -E "KIMI|GEMINI|TELEGRAM|OPENCLAW" | sed 's/=.*/=***/'
```

---

## Escalation Rules

| Situation | Action |
|-----------|--------|
| Production deploy | Always notify Allysa first. Wait for confirmation. |
| Deploy fails | Immediate rollback. Alert Allysa with error logs. |
| Rollback fails | 🚨 CRITICAL. Alert Allysa immediately. Stop all changes. |
| Config change | Backup config before applying. Verify with openclaw doctor. |
| Dependency upgrade | Test on staging first. Never upgrade prod directly. |

---

## Pre-Deploy Checklist

- [ ] Database backed up within last hour
- [ ] Config backed up
- [ ] Staging tested and passing
- [ ] Rollback procedure confirmed and tested
- [ ] Monitoring watching during deploy window
- [ ] mylabs husband notified (for production)
- [ ] Deploy logged with version before/after