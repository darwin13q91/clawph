#!/bin/bash
# Monthly Knowledge Review Script
# Location: ~/.openclaw/workspace/scripts/knowledge-review.sh
# Run: First Monday of each month

echo "=== Monthly Knowledge Review: $(date +%Y-%m) ==="

# Files not updated in 60+ days
echo ""
echo "Potentially stale files (>60 days since last update):"
find ~/.openclaw/workspace/skills/ -name "*.md" -mtime +60 2>/dev/null | while read f; do
    DAYS=$(( ($(date +%s) - $(stat -c %Y "$f")) / 86400 ))
    echo " ⚠️ $f (${DAYS} days old)"
done

find ~/.openclaw/workspace/ -name "SOUL.md" -mtime +60 2>/dev/null | while read f; do
    DAYS=$(( ($(date +%s) - $(stat -c %Y "$f")) / 86400 ))
    echo " ⚠️ $f (${DAYS} days old)"
done

# Check MEMORY.md freshness
MEMORY_DAYS=$(( ($(date +%s) - $(stat -c %Y ~/.openclaw/workspace/MEMORY.md 2>/dev/null || echo 0)) / 86400 ))
echo ""
if [ "$MEMORY_DAYS" -gt 14 ]; then
    echo "⚠️  MEMORY.md not updated in $MEMORY_DAYS days — review needed"
else
    echo "✅ MEMORY.md updated $MEMORY_DAYS days ago"
fi

# Count total skill files
SKILL_COUNT=$(find ~/.openclaw/workspace/skills/ -name "SKILL.md" 2>/dev/null | wc -l)
AGENT_SKILL_COUNT=$(find ~/.openclaw/agents/ -name "SKILL.md" 2>/dev/null | wc -l)
echo ""
echo "Total skill files: $SKILL_COUNT (workspace) + $AGENT_SKILL_COUNT (agents)"

# Check knowledge changelog
CHANGELOG_DAYS=$(( ($(date +%s) - $(stat -c %Y ~/.openclaw/workspace/memory/knowledge-changelog.md 2>/dev/null || echo 0)) / 86400 ))
if [ "$CHANGELOG_DAYS" -gt 30 ]; then
    echo "⚠️  Knowledge changelog not updated in $CHANGELOG_DAYS days"
fi

echo ""
echo "Review complete. Update any flagged files before next month."
