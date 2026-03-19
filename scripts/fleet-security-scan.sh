#!/bin/bash
# Fleet Security Scan Script
# Location: ~/.openclaw/workspace/scripts/fleet-security-scan.sh
# Run: Monthly or on demand

TIMESTAMP=$(date +%Y-%m-%d)
REPORT="$HOME/.openclaw/workspace/memory/security-$TIMESTAMP.md"
ISSUES=0

echo "# Security Scan — $TIMESTAMP" > "$REPORT"
echo "" >> "$REPORT"

# 1. Check for exposed credentials in skill files
echo "## Credential Exposure Check" >> "$REPORT"
EXPOSED=$(grep -rn "sk-\|AIza\|SG\.\|Bearer [a-zA-Z0-9]" \
  ~/.openclaw/workspace/skills/ ~/.openclaw/agents/*/skills/ \
  --include="*.md" --include="*.py" 2>/dev/null | grep -v "\${" | grep -v "# " | wc -l)
if [ "$EXPOSED" -gt 0 ]; then
  echo "❌ $EXPOSED potential credential exposures found" >> "$REPORT"
  ISSUES=$((ISSUES+1))
else
  echo "✅ No credentials found in skill files" >> "$REPORT"
fi

# 2. Check .env file permissions
echo "" >> "$REPORT"
echo "## File Permission Check" >> "$REPORT"
for f in "$HOME/.openclaw/.env" "$HOME/.openclaw/config.json"; do
  if [ -f "$f" ]; then
    PERMS=$(stat -c "%a" "$f" 2>/dev/null)
    if [ "$PERMS" = "600" ]; then
      echo "✅ $f: 600 (owner only)" >> "$REPORT"
    else
      echo "❌ $f: $PERMS (should be 600)" >> "$REPORT"
      ISSUES=$((ISSUES+1))
    fi
  fi
done

# 3. Check for world-readable files in workspace
echo "" >> "$REPORT"
echo "## World-Readable Files Check" >> "$REPORT"
WORLD_READABLE=$(find ~/.openclaw/workspace/ -type f -perm -004 2>/dev/null | grep -v ".git" | wc -l)
if [ "$WORLD_READABLE" -gt 0 ]; then
  echo "⚠️ $WORLD_READABLE files are world-readable" >> "$REPORT"
else
  echo "✅ No world-readable files found" >> "$REPORT"
fi

echo "" >> "$REPORT"
echo "## Summary" >> "$REPORT"
echo "Issues found: $ISSUES" >> "$REPORT"
echo "" >> "$REPORT"
echo "Scan completed: $(date)" >> "$REPORT"

echo "Security scan complete: $REPORT"
echo "Issues: $ISSUES"
