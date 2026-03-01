#!/bin/bash
# Fix System Issues

echo "=== FIXING SYSTEM ISSUES ==="

echo ""
echo "1. Copying cfo.json to correct location..."
cp /home/darwin/.openclaw/workspace/data/cfo.json /home/darwin/.openclaw/data/cfo.json
echo "✅ cfo.json copied"

echo ""
echo "2. Committing git changes..."
cd /home/darwin/.openclaw/workspace
git add -A
git commit -m "Update: Dashboard, Amazon-Client, fixes - $(date '+%Y-%m-%d %H:%M')"
echo "✅ Changes committed"

echo ""
echo "3. Checking disk space..."
df -h /home | tail -1

echo ""
echo "4. Verifying fixes..."
ls -la /home/darwin/.openclaw/data/cfo.json
git log --oneline -1

echo ""
echo "=== ALL FIXES COMPLETE ==="
