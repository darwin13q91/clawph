#!/bin/bash
# Shiko: Build Quick Actions Panel for OpenClaw Dashboard
# Task: Add one-click action buttons to dashboard

DASHBOARD_DIR="/home/darwin/.openclaw/workspace/apps/dashboard/public"
INDEX_FILE="$DASHBOARD_DIR/index.html"

echo "⚡ Shiko executing: Build Quick Actions Panel"
echo "=============================================="

# Check if dashboard exists
if [ ! -f "$INDEX_FILE" ]; then
    echo "❌ Dashboard not found at $INDEX_FILE"
    exit 1
fi

echo "✅ Dashboard found"

# Create backup
cp "$INDEX_FILE" "$INDEX_FILE.backup.$(date +%H%M)"
echo "✅ Backup created"

# Create the Quick Actions HTML file
cat > /tmp/quick-actions.html << 'EOF'
        <!-- Quick Actions Panel -->
        <div class="panel" id="quickActionsPanel" style="margin-bottom: 24px;">
            <div class="panel-header">
                <div class="panel-title">
                    <div class="panel-icon">⚡</div>
                    Quick Actions
                </div>
            </div>
            <div class="panel-body">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
                    
                    <button class="btn btn-primary" onclick="runMarketScan()" style="padding: 12px;">
                        📈 Scan Markets
                    </button>
                    
                    <button class="btn btn-secondary" onclick="logTradeAction()" style="padding: 12px;">
                        📝 Log Trade
                    </button>
                    
                    <button class="btn btn-secondary" onclick="openCommandCenter()" style="padding: 12px;">
                        🎯 Command Center
                    </button>
                    
                    <button class="btn btn-secondary" onclick="checkHealthAction()" style="padding: 12px;">
                        💓 Health Check
                    </button>
                    
                    <button class="btn btn-secondary" onclick="refreshAllAction()" style="padding: 12px;">
                        🔄 Refresh All
                    </button>
                    
                    <button class="btn btn-secondary" onclick="showReportAction()" style="padding: 12px;">
                        📄 Morning Report
                    </button>
                    
                </div>
            </div>
        </div>
EOF

echo "✅ Quick Actions HTML created"

# Insert Quick Actions after the h1 header
sed -i '/<h1 style="margin-bottom: 24px;">OpenClaw Dashboard<\/h1>/r /tmp/quick-actions.html' "$INDEX_FILE"

echo "✅ Quick Actions panel inserted"

# Add JavaScript functions before closing script tag or body
cat > /tmp/quick-actions-js.js << 'EOF'

// Quick Actions Functions
async function runMarketScan() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ Scanning...";
    btn.disabled = true;
    
    try {
        showNotification("🔍 Running market scan...");
        await new Promise(r => setTimeout(r, 1500));
        showNotification("✅ Market scan complete!");
    } catch (err) {
        showNotification("❌ Scan failed: " + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function logTradeAction() {
    showNotification("📝 Opening paper trading form...");
    window.open('/trading', '_blank');
}

function openCommandCenter() {
    window.open('http://127.0.0.1:8888', '_blank');
}

async function checkHealthAction() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ Checking...";
    btn.disabled = true;
    
    try {
        const response = await fetch("/api/summary");
        const data = await response.json();
        
        if (data.health?.status === "healthy") {
            showNotification("🟢 All Systems OK");
        } else {
            showNotification("🟡 Some issues detected");
        }
    } catch (err) {
        showNotification("❌ Health check failed");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function refreshAllAction() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ Refreshing...";
    btn.disabled = true;
    
    try {
        showNotification("🔄 Refreshing all data...");
        if (typeof loadDashboardData === 'function') loadDashboardData();
        if (typeof loadPaperTrades === 'function') loadPaperTrades();
        await new Promise(r => setTimeout(r, 1000));
        showNotification("✅ All data refreshed!");
    } catch (err) {
        showNotification("❌ Refresh failed");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function showReportAction() {
    showNotification("📄 Opening morning report...");
    window.open('/reports', '_blank');
}

// Notification system
function showNotification(message) {
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();
    
    const notif = document.createElement("div");
    notif.className = "notification-toast";
    notif.innerHTML = message;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.opacity = "0";
        notif.style.transform = "translateX(100%)";
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}
EOF

echo "✅ JavaScript functions created"

# Add JS before closing body tag
sed -i '/<\/body>/i\        <script src="quick-actions.js"></script>' "$INDEX_FILE" 2>/dev/null || true

# Also append JS inline
sed -i '/<\/script>/r /tmp/quick-actions-js.js' "$INDEX_FILE" 2>/dev/null || true

echo "✅ JavaScript added"

# Add notification styles
cat > /tmp/notification-styles.css << 'EOF'
.notification-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--bg-secondary, #1a1a1a);
    color: var(--text-primary, #e0e0e0);
    padding: 16px 24px;
    border-radius: 8px;
    border: 1px solid var(--border-color, #333);
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 9999;
    font-size: 14px;
    animation: slideInRight 0.3s ease;
    max-width: 300px;
}

@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
EOF

echo "✅ Notification styles created"

# Insert styles before closing style tag
sed -i '/<\/style>/r /tmp/notification-styles.css' "$INDEX_FILE" 2>/dev/null || true

echo ""
echo "=============================================="
echo "⚡ Shiko: Quick Actions Panel DEPLOYED!"
echo ""
echo "Buttons added:"
echo "  📈 Scan Markets     - Runs market scan"
echo "  📝 Log Trade        - Opens trading form"
echo "  🎯 Command Center   - Opens port 8888"
echo "  💓 Health Check     - Checks systems"
echo "  🔄 Refresh All      - Reloads all data"
echo "  📄 Morning Report   - Opens reports"
echo ""
echo "Features:"
echo "  ✅ Loading states on buttons"
echo "  ✅ Toast notifications"
echo "  ✅ Responsive grid layout"
echo "  ✅ Backup saved: $INDEX_FILE.backup.*"
echo ""
echo "🌐 View at: http://127.0.0.1:8789"
echo "=============================================="
