/**
 * Real-time Dashboard Client
 * Add this to dashboard HTML/JS for live updates
 */

class RealtimeDashboard {
    constructor(wsUrl = 'ws://localhost:8765') {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.reconnectInterval = 5000;
        this.callbacks = {};
    }

    connect() {
        console.log('🔌 Connecting to real-time server...');
        
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.onopen = () => {
            console.log('✅ Connected to real-time dashboard server');
            this.showConnectionStatus('connected');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleUpdate(data);
        };
        
        this.ws.onclose = () => {
            console.log('⚠️ Disconnected. Reconnecting...');
            this.showConnectionStatus('disconnected');
            setTimeout(() => this.connect(), this.reconnectInterval);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    handleUpdate(data) {
        // Update agent status displays
        if (data.type === 'agent_status') {
            this.updateAgentStatus(data.agents);
            this.updateStats(data);
        }
        
        // Trigger custom callbacks
        if (this.callbacks[data.type]) {
            this.callbacks[data.type](data);
        }
    }

    updateAgentStatus(agents) {
        agents.forEach(agent => {
            const element = document.getElementById(`agent-${agent.id}`);
            if (element) {
                // Update status indicator
                const statusEl = element.querySelector('.status-indicator');
                if (statusEl) {
                    statusEl.className = `status-indicator ${agent.status}`;
                }
                
                // Update last active
                const lastActiveEl = element.querySelector('.last-active');
                if (lastActiveEl && agent.lastActive) {
                    const time = new Date(agent.lastActive).toLocaleTimeString();
                    lastActiveEl.textContent = `Last active: ${time}`;
                }
            }
        });
    }

    updateStats(data) {
        const onlineEl = document.getElementById('online-count');
        const totalEl = document.getElementById('total-count');
        const lastUpdateEl = document.getElementById('last-update');
        
        if (onlineEl) onlineEl.textContent = data.online;
        if (totalEl) totalEl.textContent = data.total;
        if (lastUpdateEl && data.timestamp) {
            lastUpdateEl.textContent = new Date(data.timestamp).toLocaleTimeString();
        }
    }

    showConnectionStatus(status) {
        const indicator = document.getElementById('connection-status');
        if (indicator) {
            indicator.className = `connection-status ${status}`;
            indicator.textContent = status === 'connected' ? '🟢 Live' : '🔴 Offline';
        }
    }

    on(eventType, callback) {
        this.callbacks[eventType] = callback;
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Usage in dashboard HTML:
// 
// <script src="/js/realtime-client.js"></script>
// <script>
//   const dashboard = new RealtimeDashboard();
//   dashboard.connect();
//   
//   // Optional: handle custom events
//   dashboard.on('agent_status', (data) => {
//     console.log('Agent status updated:', data);
//   });
// </script>
