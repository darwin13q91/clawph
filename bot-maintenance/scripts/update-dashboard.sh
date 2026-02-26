#!/bin/bash
# Update all Node.js packages in dashboard

cd /home/darwin/.openclaw/workspace/apps/dashboard

echo "📦 Dashboard Package Update"
echo "==========================="
echo ""

echo "Current versions:"
npm list --depth=0 2>&1 | head -20

echo ""
echo "Checking for outdated packages..."
npm outdated

echo ""
read -p "Update all packages? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Updating packages..."
    npm update
    
    echo ""
    echo "Running security audit..."
    npm audit
    
    echo ""
    read -p "Fix security issues automatically? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm audit fix
    fi
    
    echo ""
    echo "Testing build..."
    if npm start &
echo $! > /tmp/dashboard_test.pid
    sleep 3
    if curl -s http://localhost:8789 >/dev/null; then
        echo "✅ Dashboard starts successfully"
        kill $(cat /tmp/dashboard_test.pid) 2>/dev/null || true
    else
        echo "❌ Dashboard failed to start - check manually"
        kill $(cat /tmp/dashboard_test.pid) 2>/dev/null || true
    fi
    
    echo ""
    echo "✅ Update complete!"
else
    echo "Update cancelled"
fi
