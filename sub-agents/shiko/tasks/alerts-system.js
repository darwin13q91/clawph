// Shiko: Real-Time Alerts System for OpenClaw Dashboard
// Adds visual notifications for important events

class DashboardAlerts {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create alert container
        this.container = document.createElement('div');
        this.container.id = 'alert-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 380px;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);

        // Start polling for events
        this.startPolling();
    }

    // Show alert with different types
    show(message, type = 'info', duration = 5000) {
        const alert = document.createElement('div');
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            trade: '💰',
            scan: '🔍',
            system: '🔧'
        };

        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            trade: '#8b5cf6',
            scan: '#06b6d4',
            system: '#6366f1'
        };

        alert.style.cssText = `
            background: var(--bg-secondary, #111);
            border-left: 4px solid ${colors[type] || colors.info};
            border-radius: 8px;
            padding: 16px 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.4);
            pointer-events: all;
            animation: slideInAlert 0.3s ease;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            font-size: 14px;
            line-height: 1.5;
        `;

        alert.innerHTML = `
            <span style="font-size: 18px; flex-shrink: 0;">${icons[type] || icons.info}</span>
            <div style="flex: 1; color: var(--text-primary, #fff);">${message}</div>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                color: var(--text-muted, #666);
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                line-height: 1;
            ">×</button>
        `;

        this.container.appendChild(alert);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                alert.style.opacity = '0';
                alert.style.transform = 'translateX(100%)';
                setTimeout(() => alert.remove(), 300);
            }, duration);
        }

        return alert;
    }

    // Specific alert types
    tradeExecuted(trade) {
        const profit = trade.pnl >= 0;
        this.show(
            `<strong>Trade ${profit ? 'Won' : 'Lost'}!</strong><br>
            ${trade.market || 'Unknown Market'}<br>
            <span style="color: ${profit ? '#22c55e' : '#ef4444'}">
                ${profit ? '+' : ''}${trade.pnl?.toFixed(2) || '0.00'} USDC
            </span>`,
            'trade',
            8000
        );
    }

    opportunityFound(market) {
        this.show(
            `<strong>💎 Opportunity Found!</strong><br>
            ${market.question || 'New market'}<br>
            <span style="color: #22c55e;">Volume: $${(market.volume || 0).toLocaleString()}</span>`,
            'scan',
            10000
        );
    }

    systemIssue(issue) {
        this.show(
            `<strong>⚠️ System Alert</strong><br>
            ${issue.message || 'Issue detected'}<br>
            <span style="color: #f59e0b;">Check Command Center</span>`,
            'warning',
            0 // Don't auto-remove
        );
    }

    morningReportReady() {
        this.show(
            `<strong>📄 Morning Report Ready!</strong><br>
            Your daily summary is available.<br>
            <a href="/reports" style="color: #6366f1;">View Report →</a>`,
            'info',
            15000
        );
    }

    // Polling for events
    async startPolling() {
        // Check every 30 seconds
        setInterval(async () => {
            await this.checkForEvents();
        }, 30000);

        // Initial check
        await this.checkForEvents();
    }

    async checkForEvents() {
        try {
            // Check for new trades
            const tradesRes = await fetch('/api/paper-trades?since=' + (this.lastTradeCheck || 0));
            if (tradesRes.ok) {
                const trades = await tradesRes.json();
                if (trades.length > 0) {
                    // Show alert for most recent trade
                    const latest = trades[trades.length - 1];
                    if (latest.timestamp !== this.lastTradeAlert) {
                        this.tradeExecuted(latest);
                        this.lastTradeAlert = latest.timestamp;
                    }
                }
                this.lastTradeCheck = Date.now();
            }

            // Check for opportunities
            const scanRes = await fetch('/api/polymarket');
            if (scanRes.ok) {
                const data = await scanRes.json();
                if (data.opportunities?.length > (this.lastOpportunityCount || 0)) {
                    const newOpps = data.opportunities.slice(0, 3);
                    newOpps.forEach(opp => this.opportunityFound(opp));
                }
                this.lastOpportunityCount = data.opportunities?.length || 0;
            }

            // Check system health
            const healthRes = await fetch('/api/summary');
            if (healthRes.ok) {
                const health = await healthRes.json();
                if (health.health?.status !== 'healthy' && health.health?.status !== this.lastHealthStatus) {
                    this.systemIssue({ message: health.health?.issues?.[0] || 'System degraded' });
                }
                this.lastHealthStatus = health.health?.status;
            }

        } catch (err) {
            console.log('Alert polling error:', err);
        }
    }
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInAlert {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new DashboardAlerts());
} else {
    new DashboardAlerts();
}

// Make globally available
window.DashboardAlerts = DashboardAlerts;
