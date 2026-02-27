#!/bin/bash
# Add new Amazon client
# Usage: ./add-client.sh <client-name> <tier>

set -e

CLIENT_NAME=$1
TIER=$2
CLIENT_DIR="/home/darwin/.openclaw/workspace/Amazon-Client/clients/client-$CLIENT_NAME"

if [ -z "$CLIENT_NAME" ] || [ -z "$TIER" ]; then
    echo "Usage: $0 <client-name> <tier>"
    echo "Tiers: starter, growth, pro, enterprise"
    exit 1
fi

# Validate tier
if [[ ! "$TIER" =~ ^(starter|growth|pro|enterprise)$ ]]; then
    echo "Invalid tier. Use: starter, growth, pro, enterprise"
    exit 1
fi

# Check if client exists
if [ -d "$CLIENT_DIR" ]; then
    echo "❌ Client '$CLIENT_NAME' already exists"
    exit 1
fi

echo "🚀 Creating new Amazon client: $CLIENT_NAME"
echo "   Tier: $TIER"
echo ""

# Create directory structure
mkdir -p "$CLIENT_DIR"/{agents,config,data,logs}

# Copy appropriate templates based on tier
case $TIER in
    starter)
        cp -r /home/darwin/.openclaw/workspace/Amazon-Client/templates/inventory-bot "$CLIENT_DIR/agents/"
        echo "   ✅ Inventory bot added"
        ;;
    growth)
        cp -r /home/darwin/.openclaw/workspace/Amazon-Client/templates/inventory-bot "$CLIENT_DIR/agents/"
        cp -r /home/darwin/.openclaw/workspace/Amazon-Client/templates/pricing-bot "$CLIENT_DIR/agents/"
        cp -r /home/darwin/.openclaw/workspace/Amazon-Client/templates/review-bot "$CLIENT_DIR/agents/"
        echo "   ✅ Inventory + Pricing + Review bots added"
        ;;
    pro)
        cp -r /home/darwin/.openclaw/workspace/Amazon-Client/templates/* "$CLIENT_DIR/agents/"
        echo "   ✅ All bots added (5 agents)"
        ;;
    enterprise)
        cp -r /home/darwin/.openclaw/workspace/Amazon-Client/templates/* "$CLIENT_DIR/agents/"
        echo "   ✅ All bots + custom dev ready"
        ;;
esac

# Create client README
cat > "$CLIENT_DIR/README.md" << EOF
# Client: $CLIENT_NAME

**Tier:** $TIER  
**Created:** $(date +%Y-%m-%d)  
**Status:** Onboarding

## Setup Checklist

- [ ] Collect Amazon SP-API credentials
- [ ] Define monitored SKUs (ASINs)
- [ ] Configure alert thresholds
- [ ] Set up notification channels
- [ ] Test agent outputs
- [ ] Go live

## Agents

$(ls -1 "$CLIENT_DIR/agents" | sed 's/^/- /')

## Contact

- Primary: 
- Emergency: 
- Preferred channel: 

## Notes

_Add client-specific notes here_
EOF

# Create .env template
cat > "$CLIENT_DIR/config/.env.template" << 'EOF'
# Amazon Selling Partner API Credentials
AMAZON_ACCESS_KEY=
AMAZON_SECRET_KEY=
AMAZON_REFRESH_TOKEN=
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER  # US marketplace

# Notification Channels
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
SLACK_WEBHOOK_URL=
EMAIL_ALERTS=

# Agent Configuration
CHECK_INTERVAL_MINUTES=30
ALERT_THRESHOLD_LOW_STOCK=20
ALERT_THRESHOLD_CRITICAL_STOCK=5
MIN_PROFIT_MARGIN_PERCENT=15
EOF

echo ""
echo "✅ Client '$CLIENT_NAME' created successfully!"
echo ""
echo "📁 Location: $CLIENT_DIR"
echo ""
echo "📝 Next steps:"
echo "   1. cd $CLIENT_DIR"
echo "   2. cp config/.env.template config/.env"
echo "   3. Edit config/.env with API credentials"
echo "   4. Configure agents/"
echo "   5. Deploy: docker-compose up -d"
echo ""
echo "💰 Monthly fee: $TIER tier"
EOF

chmod +x "$CLIENT_DIR/../add-client.sh"

echo "✅ add-client.sh updated"
