# Security Hardening Skill
# Location: ~/.openclaw/agents/atlas/skills/security-hardening/SKILL.md

*Security is not a feature. It's the foundation everything else runs on.*

---

## Trigger

Activate when tasks involve:
- Security audit findings
- Token or credential management
- SSL/TLS configuration
- Firewall and access control
- Vulnerability scanning
- Secret rotation

---

## Core Philosophy

**Assume breach.** Design systems as if attackers already have partial access. Minimize blast radius.

**Least privilege.** Every process, agent, and user gets only the permissions they need. Nothing more.

**Secrets never live in code.** If a credential is in a file that could be committed, it's already compromised.

**Rotate regularly.** Credentials that never rotate are credentials waiting to be abused.

---

## Current Security Issues to Fix

### Fix 1 — Gateway Token (Short Token — CRITICAL)
```bash
# Generate a proper 64-character token
NEW_TOKEN=$(openssl rand -hex 32)
echo "OPENCLAW_GATEWAY_TOKEN=$NEW_TOKEN"

# Update .env
sed -i "s/OPENCLAW_GATEWAY_TOKEN=.*/OPENCLAW_GATEWAY_TOKEN=$NEW_TOKEN/" ~/.openclaw/.env

# Restart gateway
openclaw gateway restart

# Verify
openclaw doctor
```

### Fix 2 — File Permissions
```bash
# Protect .env file — owner read/write only
chmod 600 ~/.openclaw/.env

# Protect config.json
chmod 600 ~/.openclaw/config.json

# Protect memory directory
chmod 700 ~/.openclaw/memory/

# Protect backup directory
chmod 700 ~/.openclaw/backups/

# Verify permissions
ls -la ~/.openclaw/ | grep -E "config|\.env|memory|backups"
```

### Fix 3 — Secrets Audit
```bash
#!/bin/bash
# Scan for exposed secrets in workspace files
# Location: ~/.openclaw/workspace/scripts/secrets-scan.sh

echo "=== Secrets Scan: $(date) ==="

# Check for hardcoded API keys
grep -rn "sk-\|api_key\|apikey\|password\|secret\|token" \
  ~/.openclaw/workspace/ \
  --include="*.json" \
  --include="*.js" \
  --include="*.py" \
  --include="*.md" \
  --exclude-dir=".git" \
  --exclude-dir="node_modules" \
  | grep -v "\${" \
  | grep -v "example\|placeholder\|your-key-here"

echo "=== Scan Complete ==="
```

---

## Secret Rotation Schedule

| Secret | Rotation Frequency | Method |
|--------|-------------------|--------|
| OPENCLAW_GATEWAY_TOKEN | Monthly | `openssl rand -hex 32` |
| KIMI_API_KEY | On suspicion of exposure | Kimi dashboard |
| GEMINI_API_KEY | Quarterly | Google AI Studio |
| TELEGRAM_BOT_TOKEN_* | On suspicion of exposure | @BotFather /revoke |

### Rotation Script
```bash
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/rotate-gateway-token.sh

TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)

# Backup current .env
cp ~/.openclaw/.env ~/.openclaw/backups/.env-$TIMESTAMP

# Generate new token
NEW_TOKEN=$(openssl rand -hex 32)

# Update .env
sed -i "s/OPENCLAW_GATEWAY_TOKEN=.*/OPENCLAW_GATEWAY_TOKEN=$NEW_TOKEN/" ~/.openclaw/.env

echo "New gateway token generated. Restarting gateway..."
openclaw gateway restart

echo "✅ Token rotated. Old token backed up to .env-$TIMESTAMP"
```

---

## SSL/TLS Management

```bash
# Check certificate expiry (run monthly)
check_cert() {
  DOMAIN=$1
  EXPIRY=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null \
    | cut -d= -f2)
  DAYS_LEFT=$(( ($(date -d "$EXPIRY" +%s) - $(date +%s)) / 86400 ))
  
  if [ "$DAYS_LEFT" -lt 30 ]; then
    echo "⚠️ WARNING: $DOMAIN cert expires in $DAYS_LEFT days"
  else
    echo "✅ $DOMAIN cert valid for $DAYS_LEFT days"
  fi
}

check_cert amajungle.com
```

---

## Firewall Rules (UFW)

```bash
# Check current rules
sudo ufw status verbose

# Recommended baseline
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 443/tcp # HTTPS
sudo ufw allow 80/tcp # HTTP (redirect to HTTPS)

# OpenClaw gateway — loopback only (already configured)
# gateway.bind = loopback — do NOT open 18789 externally

# Enable
sudo ufw enable
sudo ufw status
```

---

## Security Audit Checklist (Run Monthly)

- [ ] Gateway token length ≥ 64 characters
- [ ] File permissions correct (600 for secrets, 700 for dirs)
- [ ] No secrets in code (run secrets-scan.sh)
- [ ] SSL certificate valid > 30 days
- [ ] Firewall rules minimal (only required ports open)
- [ ] Backups encrypted at rest
- [ ] Last secret rotation within policy
- [ ] No unauthorized SSH keys
- [ ] OpenClaw version current (no known CVEs)

---

## Monthly Security Audit Script

```bash
#!/bin/bash
# Location: ~/.openclaw/workspace/scripts/security-audit.sh
# Run monthly via cron: 0 2 1 * * ~/.openclaw/workspace/scripts/security-audit.sh

echo "=== Monthly Security Audit: $(date +%Y-%m-%d) ==="
ISSUES=0

# 1. Check file permissions
echo -n "File permissions... "
INSECURE=$(ls -la ~/.openclaw/ | grep -E "config\.json|\.env" | grep -v "^-rw-------")
[ -z "$INSECURE" ] && echo "✅ OK" || { echo "❌ FAIL - insecure permissions found"; ISSUES=$((ISSUES+1)); }

# 2. Check for secrets in files
echo -n "Secret exposure scan... "
EXPOSED=$(grep -rn "sk-\|_KEY=\|_TOKEN=" ~/.openclaw/workspace/ \
  --include="*.md" --include="*.json" --include="*.js" \
  | grep -v "\${" | grep -v "example" | wc -l)
[ "$EXPOSED" -eq 0 ] && echo "✅ OK" || { echo "❌ FAIL - $EXPOSED potential exposures found"; ISSUES=$((ISSUES+1)); }

# 3. Check gateway token length
echo -n "Gateway token strength... "
source ~/.openclaw/.env 2>/dev/null
TOKEN_LEN=${#OPENCLAW_GATEWAY_TOKEN}
[ "$TOKEN_LEN" -gt 32 ] && echo "✅ OK ($TOKEN_LEN chars)" || { echo "❌ FAIL - token too short ($TOKEN_LEN chars)"; ISSUES=$((ISSUES+1)); }

# 4. Check UFW status
echo -n "Firewall status... "
ufw status 2>/dev/null | grep -q "Status: active" && echo "✅ Active" || { echo "⚠️ Firewall not active"; ISSUES=$((ISSUES+1)); }

# 5. Check for outdated packages
echo -n "System updates... "
UPDATES=$(apt list --upgradable 2>/dev/null | grep -c upgradable || echo 0)
[ "$UPDATES" -lt 5 ] && echo "✅ OK ($UPDATES pending)" || echo "⚠️ $UPDATES updates pending"

echo ""
echo "=== Audit Complete: $ISSUES issue(s) found ==="
[ "$ISSUES" -gt 0 ] && echo "🚨 Review and fix issues above before next audit."

# Log to file
LOG_FILE="$HOME/.openclaw/workspace/logs/security-audit.log"
echo "[$(date +%Y-%m-%d)] Security audit: $ISSUES issues" >> "$LOG_FILE"
```

---

## Escalation Rules

| Situation | Action |
|-----------|--------|
| Secret exposed in any file | 🚨 Rotate immediately. Alert Allysa. Audit access logs. |
| Failed login attempts detected | 🚨 Alert Allysa. Review firewall rules. |
| Certificate expiring <14 days | ⚠️ Renew immediately. Alert Allysa. |
| Security scan finds new issue | Report to Allysa with severity and fix plan before acting. |
| Gateway token <32 chars | Rotate immediately. No approval needed. |