const fs = require('fs');
const path = require('path');
const https = require('https');

class TelegramAlerts {
    constructor() {
        this.configPath = process.env.HOME + '/.openclaw/config/telegram.json';
        this.loadConfig();
    }

    loadConfig() {
        try {
            const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            this.botToken = config.bot_token;
            this.chatId = config.chat_id;
            this.enabled = config.enabled !== false;
        } catch (err) {
            console.log('Telegram config not found, alerts disabled');
            this.enabled = false;
        }
    }

    async sendMessage(text, options = {}) {
        if (!this.enabled || !this.botToken || !this.chatId) {
            console.log('Telegram not configured, skipping alert');
            return;
        }

        const payload = {
            chat_id: this.chatId,
            text: text,
            parse_mode: 'HTML',
            disable_notification: options.silent || false
        };

        return new Promise((resolve, reject) => {
            const data = JSON.stringify(payload);
            
            const req = https.request({
                hostname: 'api.telegram.org',
                path: `/bot${this.botToken}/sendMessage`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            }, (res) => {
                let response = '';
                res.on('data', chunk => response += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(response);
                        if (result.ok) {
                            resolve(result);
                        } else {
                            reject(new Error(result.description));
                        }
                    } catch (e) {
                        resolve(response);
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    // Alert types
    async tradeExecuted(trade) {
        const profit = trade.pnl >= 0;
        const emoji = profit ? '🟢' : '🔴';
        const sign = profit ? '+' : '';
        
        const message = `
${emoji} <b>Trade ${profit ? 'WON' : 'LOST'}!</b>

📊 Market: ${trade.market}
💰 P&L: ${sign}${trade.pnl.toFixed(2)} USDC
📈 Position: ${trade.position}
⏱️ Time: ${new Date(trade.timestamp).toLocaleString()}

${profit ? '🎉 Nice win!' : '💪 Next one will be better'}
        `.trim();

        await this.sendMessage(message);
    }

    async opportunityAlert(market) {
        const message = `
💎 <b>New Opportunity!</b>

📋 ${market.question}
💵 Volume: $${(market.volume || 0).toLocaleString()}
📊 Liquidity: $${(market.liquidity || 0).toLocaleString()}
⏰ Days left: ${market.days_left}

<a href="https://polymarket.com/event/${market.slug || ''}">View on Polymarket →</a>
        `.trim();

        await this.sendMessage(message);
    }

    async dailySummary(stats) {
        const message = `
📊 <b>Daily Trading Summary</b>

Trades today: ${stats.trades}
Win rate: ${stats.winRate}%
P&L: ${stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(2)} USDC
Open positions: ${stats.open}

${stats.pnl >= 0 ? '🟢 Profitable day!' : '🔴 Down today, but long term matters'}
        `.trim();

        await this.sendMessage(message, { silent: true });
    }

    async systemAlert(issue) {
        const message = `
⚠️ <b>System Alert</b>

${issue.message}

Check dashboard: http://127.0.0.1:8789
        `.trim();

        await this.sendMessage(message);
    }
}

// Export for use in other modules
module.exports = TelegramAlerts;

// If run directly, test connection
if (require.main === module) {
    const bot = new TelegramAlerts();
    bot.sendMessage('🤖 <b>OpenClaw Bot Online</b>\n\nAlerts are now active!')
        .then(() => console.log('Test message sent'))
        .catch(err => console.error('Failed:', err.message));
}
