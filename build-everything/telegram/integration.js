const TelegramAlerts = require('./telegram-alerts.js');
const fs = require('fs');
const path = require('path');

// Initialize Telegram bot for alerts
const telegram = new TelegramAlerts();

// Watch for new trades and send alerts
function watchTrades() {
    const tradesFile = process.env.HOME + '/.openclaw/data/paper_trades.json';
    let lastCheck = 0;
    
    setInterval(async () => {
        try {
            if (!fs.existsSync(tradesFile)) return;
            
            const data = JSON.parse(fs.readFileSync(tradesFile, 'utf8'));
            const trades = data.trades || [];
            
            // Find new completed trades
            const newTrades = trades.filter(t => {
                const tradeTime = new Date(t.timestamp).getTime();
                return tradeTime > lastCheck && t.status === 'closed';
            });
            
            for (const trade of newTrades) {
                await telegram.tradeExecuted(trade);
                console.log(`[Telegram] Alert sent for trade: ${trade.market}`);
            }
            
            lastCheck = Date.now();
        } catch (err) {
            console.error('[Telegram] Watch error:', err.message);
        }
    }, 30000); // Check every 30 seconds
}

// Watch for opportunities
function watchOpportunities() {
    const scanFile = process.env.HOME + '/.openclaw/data/scan.json';
    let lastCount = 0;
    
    setInterval(async () => {
        try {
            if (!fs.existsSync(scanFile)) return;
            
            const data = JSON.parse(fs.readFileSync(scanFile, 'utf8'));
            const opps = data.opportunities || [];
            
            if (opps.length > lastCount) {
                // New opportunities found
                const newOpps = opps.slice(0, opps.length - lastCount);
                for (const opp of newOpps.slice(0, 3)) { // Max 3 alerts
                    await telegram.opportunityAlert(opp);
                }
            }
            
            lastCount = opps.length;
        } catch (err) {
            console.error('[Telegram] Opportunity watch error:', err.message);
        }
    }, 60000); // Check every minute
}

// Daily summary at 6:30 AM
function scheduleDailySummary() {
    const now = new Date();
    const target = new Date();
    target.setHours(6, 30, 0, 0);
    
    if (target <= now) {
        target.setDate(target.getDate() + 1);
    }
    
    const msUntil = target - now;
    
    setTimeout(() => {
        sendDailySummary();
        // Then every 24 hours
        setInterval(sendDailySummary, 24 * 60 * 60 * 1000);
    }, msUntil);
    
    console.log(`[Telegram] Daily summary scheduled for ${target.toLocaleString()}`);
}

async function sendDailySummary() {
    try {
        const tradesFile = process.env.HOME + '/.openclaw/data/paper_trades.json';
        
        if (!fs.existsSync(tradesFile)) {
            await telegram.sendMessage('📊 Daily Summary\n\nNo trades yet today.');
            return;
        }
        
        const data = JSON.parse(fs.readFileSync(tradesFile, 'utf8'));
        const trades = data.trades || [];
        
        const today = new Date().toDateString();
        const todayTrades = trades.filter(t => 
            new Date(t.timestamp).toDateString() === today
        );
        
        const stats = {
            trades: todayTrades.length,
            wins: todayTrades.filter(t => t.pnl > 0).length,
            pnl: todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
            open: trades.filter(t => t.status === 'open').length
        };
        
        const winRate = stats.trades > 0 ? Math.round((stats.wins / stats.trades) * 100) : 0;
        
        await telegram.dailySummary({
            trades: stats.trades,
            winRate: winRate,
            pnl: stats.pnl,
            open: stats.open
        });
        
    } catch (err) {
        console.error('[Telegram] Daily summary error:', err.message);
    }
}

// Start all watchers
function startTelegramIntegration() {
    if (!telegram.enabled) {
        console.log('[Telegram] Alerts disabled or not configured');
        return;
    }
    
    console.log('[Telegram] Starting alert integration...');
    watchTrades();
    watchOpportunities();
    scheduleDailySummary();
    
    // Send startup confirmation
    telegram.sendMessage('🤖 <b>Alert system activated</b>\n\nWatching for:\n• New trades\n• Opportunities\n• Daily summaries\n\nStay tuned! 📈');
}

module.exports = { startTelegramIntegration, telegram };

// If run directly
if (require.main === module) {
    startTelegramIntegration();
}
