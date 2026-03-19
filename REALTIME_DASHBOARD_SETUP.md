# Real-Time Dashboard Setup Guide
# Location: ~/.openclaw/workspace/REALTIME_DASHBOARD_SETUP.md

## ✅ What's Been Set Up

### 1. Data Updater Script
**Location:** `~/.openclaw/workspace/scripts/dashboard_updater.py`

**What it does:**
- Checks actual agent process status (ps/pgrep)
- Updates timestamps every check
- Saves to JSON file
- Pushes to both dashboards

**Run manually:**
```bash
python3 ~/.openclaw/workspace/scripts/dashboard_updater.py
```

**Run continuously (updates every 5 seconds):**
```bash
watch -n 5 python3 ~/.openclaw/workspace/scripts/dashboard_updater.py
```

---

### 2. WebSocket Server
**Location:** `~/.openclaw/workspace/scripts/dashboard_websocket.py`

**What it does:**
- Provides live WebSocket feed at ws://localhost:8765
- Broadcasts updates to all connected dashboards
- Auto-reconnects clients
- Updates every 5 seconds automatically

**Start server:**
```bash
python3 ~/.openclaw/workspace/scripts/dashboard_websocket.py
```

**Run in background:**
```bash
nohup python3 ~/.openclaw/workspace/scripts/dashboard_websocket.py > /tmp/dashboard_ws.log 2>&1 &
echo $! > /tmp/dashboard_ws.pid
```

**Stop server:**
```bash
kill $(cat /tmp/dashboard_ws.pid)
```

---

### 3. Dashboard Client Library
**Location:** `~/.openclaw/workspace/dashboard/js/realtime-client.js`

**Add to your dashboard HTML:**
```html
<!-- Add this before closing </body> tag -->
<script src="/js/realtime-client.js"></script>
<script>
  const dashboard = new RealtimeDashboard();
  dashboard.connect();
</script>

<!-- Add this status indicator somewhere visible -->
<div id="connection-status" class="connection-status">Connecting...</div>
<div>
  Online: <span id="online-count">0</span> / 
  <span id="total-count">0</span>
  <span id="last-update">--</span>
</div>
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Start WebSocket Server
```bash
# Terminal 1
python3 ~/.openclaw/workspace/scripts/dashboard_websocket.py
```

### Step 2: Start Data Updater (in another terminal)
```bash
# Terminal 2
watch -n 5 python3 ~/.openclaw/workspace/scripts/dashboard_updater.py
```

### Step 3: Add Client to Dashboards
Add the JavaScript code (above) to your dashboard HTML files.

---

## 📊 What Makes It "Real-Time"

| Feature | Before | After |
|---------|--------|-------|
| Data refresh | Manual page reload | Every 5 seconds |
| Timestamps | Static/none | Live updates |
| Agent status | Cached | Real process check |
| Connection | HTTP polling | WebSocket push |
| Visual feedback | None | Live status indicator |

---

## 🔧 Integration with Existing Dashboards

### For Port 8888 (Command Center)

1. Find the HTML template (usually `index.html` or `dashboard.html`)
2. Add the JavaScript code (shown above)
3. Ensure agent elements have IDs like: `id="agent-allysa"`, `id="agent-atlas"`

### For Port 8789 (Amajungle)

1. Same process as above
2. Both dashboards can connect to the same WebSocket server
3. Each receives identical real-time data

---

## 📝 Data Format

The system generates data in this format:

```json
{
  "type": "agent_status",
  "agents": [
    {
      "id": "allysa",
      "name": "Allysa",
      "status": "online",
      "lastActive": "2026-03-19T09:50:23.123456",
      "timestamp": "2026-03-19T09:50:23.123456"
    }
  ],
  "total": 9,
  "online": 3,
  "timestamp": "2026-03-19T09:50:23.123456"
}
```

---

## 🎯 Making It Even Better

### Option 1: Add Atlas Cron Job
Add to Atlas's cron registry for automatic startup:
```bash
# Add to Atlas cron
@reboot python3 ~/.openclaw/workspace/scripts/dashboard_websocket.py &
*/1 * * * * python3 ~/.openclaw/workspace/scripts/dashboard_updater.py
```

### Option 2: Systemd Service
Create systemd service for WebSocket server:
```bash
sudo tee /etc/systemd/system/dashboard-realtime.service > /dev/null <>EOF
[Unit]
Description=Dashboard Real-time WebSocket Server
After=network.target

[Service]
Type=simple
User=darwin
ExecStart=/usr/bin/python3 /home/darwin/.openclaw/workspace/scripts/dashboard_websocket.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable dashboard-realtime
sudo systemctl start dashboard-realtime
```

### Option 3: Docker Container
Package as Docker container for easy deployment.

---

## 🔍 Monitoring

Check if services are running:
```bash
# Check WebSocket server
pgrep -f dashboard_websocket

# Check data updater
pgrep -f dashboard_updater

# Check WebSocket port
ss -tlnp | grep 8765

# View logs
tail -f /tmp/dashboard_ws.log
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Connection refused" | Start WebSocket server first |
| "Module not found" | Run: `pip install websockets` |
| No data updates | Check `dashboard-data.json` exists |
| Timestamps not updating | Verify data updater is running |
| WebSocket disconnects | Check server logs: `tail /tmp/dashboard_ws.log` |

---

## ✅ Verification Checklist

- [ ] WebSocket server running on port 8765
- [ ] Data updater running (or in watch mode)
- [ ] JavaScript client added to dashboard HTML
- [ ] Agent elements have correct IDs
- [ ] Connection status indicator visible
- [ ] Timestamps updating every 5 seconds
- [ ] Online/offline status accurate

---

*Real-time dashboard system ready — March 19, 2026*
