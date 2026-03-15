# OpenClaw Client Management System

Complete multi-tenant client management system with AI integration for OpenClaw.

## Quick Start

```bash
# Set your OpenAI API key
export OPENAI_API_KEY='your-key-here'

# Start the AI Gateway
./gateway-service.sh start

# Create your first client
./manage-clients.sh add "My Business"

# Check status
./gateway-service.sh status
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Telegram User  │────▶│  AI Gateway      │────▶│  OpenAI API │
└─────────────────┘     └──────────────────┘     └─────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  Client Mgmt │
                        │  - Config    │
                        │  - Billing   │
                        │  - Usage     │
                        └──────────────┘
```

## Business Tiers

| Tier    | Price    | Messages/Day | Features                          |
|---------|----------|--------------|-----------------------------------|
| Trial   | Free     | 100          | AI for 30 days, basic support     |
| Starter | $300/mo  | 1,000        | AI, basic support, analytics      |
| Growth  | $600/mo  | 5,000        | Priority support, custom responses|
| Pro     | $1,200/mo| Unlimited    | Custom training, dedicated model  |

## Commands

### Client Management

```bash
# List all clients
./manage-clients.sh list

# Add a new client (starts with 30-day trial)
./manage-clients.sh add "Business Name"

# Show client details
./manage-clients.sh show client_abc123

# Upgrade client to paid tier
./manage-clients.sh upgrade client_abc123 starter
# Options: starter, growth, pro

# Edit client configuration
./manage-clients.sh edit client_abc123

# View usage statistics
./manage-clients.sh usage client_abc123

# Disable client (soft delete)
./manage-clients.sh disable client_abc123

# Delete client (permanent)
./manage-clients.sh delete client_abc123

# Show expiring trials
./manage-clients.sh trials          # Next 7 days
./manage-clients.sh trials 3        # Next 3 days
```

### Billing & Reports

```bash
# Generate monthly billing report
./billing-report.sh generate
./billing-report.sh generate 2026-02  # Specific month

# Export to CSV
./billing-report.sh csv
./billing-report.sh csv 2026-02

# Generate invoice for client
./billing-report.sh invoice client_abc123

# Show billing summary
./billing-report.sh summary

# Show AI usage costs
./billing-report.sh usage-costs
```

### Trial Monitoring

```bash
# Run full trial monitoring (check reminders + generate report)
./trial-monitor.sh

# Report only (no reminders sent)
./trial-monitor.sh --report-only

# Check reminders only
./trial-monitor.sh --check-only

# Dry run (see what would happen)
./trial-monitor.sh --dry-run
```

### Gateway Service

```bash
# Start the gateway
./gateway-service.sh start

# Stop the gateway
./gateway-service.sh stop

# Restart the gateway
./gateway-service.sh restart

# Check status
./gateway-service.sh status

# View logs
./gateway-service.sh logs
```

## Configuration

### AI Configuration (`config/ai_config.json`)

```json
{
  "ai_provider": "openai",
  "openai_api_key": "${OPENAI_API_KEY}",
  "model": "gpt-4o-mini",
  "max_tokens": 500,
  "temperature": 0.7,
  "system_prompt": "You are a helpful assistant for {business_name}."
}
```

### Per-Client Customization

Each client has a `config.json` in their data directory:

```json
{
  "business_name": "My Restaurant",
  "tier": "starter",
  "ai_settings": {
    "enabled": true,
    "model": "gpt-4o-mini",
    "max_tokens": 500,
    "temperature": 0.7,
    "system_prompt": "You are a helpful assistant for My Restaurant. Be friendly and professional."
  },
  "customization": {
    "greeting_message": "Welcome to My Restaurant!",
    "business_hours": "Mon-Sat: 9AM-9PM",
    "contact_info": "Call us at (555) 123-4567"
  }
}
```

## API Endpoints

The gateway exposes these HTTP endpoints:

| Endpoint                   | Method | Description                    |
|---------------------------|--------|--------------------------------|
| `/health`                 | GET    | Health check                   |
| `/webhook/{client_id}`    | POST   | Telegram webhook               |
| `/stats/{client_id}`      | GET    | Client statistics              |
| `/clients`                | GET    | List all clients (admin)       |

## Webhook Setup

1. Create a Telegram bot with [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Set the webhook URL:
   ```
   https://your-server.com/webhook/{client_id}
   ```
4. Add the token to the client's config:
   ```bash
   ./manage-clients.sh edit {client_id}
   # Add telegram_bot_token and telegram_chat_id
   ```

## Cron Setup

Set up daily trial monitoring:

```bash
# Edit crontab
crontab -e

# Add this line for daily monitoring at 9 AM
0 9 * * * /home/darwin/.openclaw/workspace/client-management/trial-monitor.sh

# Add this line for weekly billing reports (Mondays at 8 AM)
0 8 * * 1 /home/darwin/.openclaw/workspace/client-management/billing-report.sh generate
```

## Environment Variables

| Variable            | Required | Description                     |
|---------------------|----------|---------------------------------|
| `OPENAI_API_KEY`    | Yes      | Your OpenAI API key             |
| `ALERT_EMAIL`       | No       | Email for trial alerts          |
| `TELEGRAM_ALERT_BOT`| No       | Bot token for Telegram alerts   |
| `TELEGRAM_ALERT_CHAT`| No      | Chat ID for Telegram alerts     |

## Testing

Run the full test suite:

```bash
./test-system.sh
```

## Directory Structure

```
client-management/
├── manage-clients.sh      # Main CLI
├── billing-report.sh      # Billing system
├── trial-monitor.sh       # Trial monitoring
├── gateway.py             # AI Gateway (Python)
├── gateway-service.sh     # Service control script
├── test-system.sh         # Test suite
├── requirements.txt       # Python dependencies
├── config/
│   ├── ai_config.json     # AI configuration
│   └── tiers.json         # Tier definitions
├── data/
│   └── clients/           # Client data directories
├── logs/                  # Application logs
└── reports/               # Generated reports
```

## Troubleshooting

### Gateway won't start

```bash
# Check dependencies
pip3 install -r requirements.txt

# Check logs
tail -f logs/gateway-service.log

# Verify OpenAI key is set
echo $OPENAI_API_KEY
```

### Webhook not receiving messages

1. Check gateway is running: `./gateway-service.sh status`
2. Verify webhook URL is correct in Telegram
3. Check gateway logs for errors
4. Ensure client_id in URL matches client config

### Rate limit errors

Clients are limited by their tier:
- Trial/Starter: Check messages_per_day in config
- Pro tier has unlimited (-1) messages

## Data Storage

All data is stored locally in JSON files:
- Client configs: `data/clients/{client_id}/config.json`
- Usage stats: `data/clients/{client_id}/usage.json`
- Conversation memory: `data/clients/{client_id}/memory_{user_id}.json`

## Security Notes

1. Keep `OPENAI_API_KEY` secure - use environment variables
2. Bot tokens are stored per-client in their config files
3. Deleted clients are backed up to `logs/deleted/` before removal
4. No PII is logged by default

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Run `./test-system.sh` to verify setup
3. Review this README
