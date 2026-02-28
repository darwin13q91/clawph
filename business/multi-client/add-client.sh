#!/bin/bash
# Add New Client to OpenClaw Multi-Tenant System
# Usage: ./add-client.sh "Business Name" "Contact Email" "Phone"

set -e

BUSINESS_NAME="$1"
CONTACT_EMAIL="$2"
CONTACT_PHONE="$3"

if [ -z "$BUSINESS_NAME" ]; then
    echo "❌ Usage: $0 'Business Name' 'email@example.com' '+63...'"
    exit 1
fi

# Generate client ID
CLIENT_NUM=$(ls -1 clients/ 2>/dev/null | grep -c "^client-" || echo "0")
CLIENT_NUM=$((CLIENT_NUM + 1))
CLIENT_ID=$(printf "client-%03d" $CLIENT_NUM)
CLIENT_DIR="clients/$CLIENT_ID"

# Clean business name for folder
CLEAN_NAME=$(echo "$BUSINESS_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
CLIENT_DIR="clients/$CLIENT_ID-$CLEAN_NAME"

echo "🚀 Adding new client..."
echo "   Business: $BUSINESS_NAME"
echo "   Contact: $CONTACT_EMAIL"
echo "   ID: $CLIENT_ID"
echo ""

# Create directory structure
mkdir -p "$CLIENT_DIR"/{config,data/{conversations,orders,analytics,knowledge},skills,logs}

# Copy templates
cp templates/telegram.json.template "$CLIENT_DIR/config/telegram.json"
cp templates/agent.json.template "$CLIENT_DIR/config/agent.json"
cp templates/business.json.template "$CLIENT_DIR/config/business.json"

# Update business.json with provided info
jq --arg name "$BUSINESS_NAME" \
   --arg email "$CONTACT_EMAIL" \
   --arg phone "$CONTACT_PHONE" \
   '.business_name = $name | .contact_info.email = $email | .contact_info.phone = $phone' \
   "$CLIENT_DIR/config/business.json" > "$CLIENT_DIR/config/business.json.tmp" && \
   mv "$CLIENT_DIR/config/business.json.tmp" "$CLIENT_DIR/config/business.json"

# Create README
cat > "$CLIENT_DIR/README.md" <> EOF
# $BUSINESS_NAME

**Client ID:** $CLIENT_ID  
**Created:** $(date +%Y-%m-%d)  
**Status:** 🔴 Setup Pending

## Contact
- Email: $CONTACT_EMAIL
- Phone: $CONTACT_PHONE

## Onboarding Checklist
- [ ] Contract signed
- [ ] Setup fee paid
- [ ] Telegram bot token received
- [ ] Business requirements documented
- [ ] Configured
- [ ] Deployed
- [ ] Tested
- [ ] Training completed

## Configuration Files
- \`config/telegram.json\` - Bot settings
- \`config/agent.json\` - AI personality
- \`config/business.json\` - Business info

## Notes
_Add notes here_
EOF

echo "✅ Client folder created: $CLIENT_DIR"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Get Telegram bot token from @BotFather"
echo "2. Edit: $CLIENT_DIR/config/telegram.json"
echo "3. Add business details to: $CLIENT_DIR/config/business.json"
echo "4. Run: ./deploy-client.sh $CLIENT_ID"
echo ""
echo "🎯 Client is ready for configuration!"
