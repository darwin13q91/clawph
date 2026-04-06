#!/bin/bash
# ClawPH Overnight Report Implementation
# Sets up all the new features for VIP clients, followups, and analytics

echo "🚀 ClawPH Overnight Report Implementation"
echo "============================================"
echo ""

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p /home/darwin/.openclaw/agents/echo/data
mkdir -p /home/darwin/.openclaw/agents/piper/data/followups
mkdir -p /home/darwin/.openclaw/agents/piper/logs
mkdir -p /home/darwin/.openclaw/workspace/scripts

echo "✅ Directories created"
echo ""

# Set permissions
echo "🔐 Setting permissions..."
chmod +x /home/darwin/.openclaw/workspace/scripts/followup_cron.sh
chmod +x /home/darwin/.openclaw/workspace/scripts/calendly_webhook_handler.py
chmod +x /home/darwin/.openclaw/agents/echo/scripts/vip_client_system.py
chmod +x /home/darwin/.openclaw/agents/piper/scripts/followup_system.py

echo "✅ Permissions set"
echo ""

# Initialize VIP tracking file
echo "📝 Initializing tracking files..."
if [ ! -f "/home/darwin/.openclaw/agents/echo/data/vip_clients.json" ]; then
    echo '{}' > /home/darwin/.openclaw/agents/echo/data/vip_clients.json
fi

if [ ! -f "/home/darwin/.openclaw/agents/echo/data/followup_tracking.json" ]; then
    echo '{}' > /home/darwin/.openclaw/agents/echo/data/followup_tracking.json
fi

echo "✅ Tracking files initialized"
echo ""

# Test VIP system
echo "🧪 Testing VIP system..."
cd /home/darwin/.openclaw/agents/echo/scripts
python3 vip_client_system.py --stats

echo ""
echo "🧪 Testing followup system..."
cd /home/darwin/.openclaw/agents/piper/scripts
python3 followup_system.py --test darwin13q91@gmail.com --name "Test User" --score 72

echo ""
echo "✅ Implementation complete!"
echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Add cron job for followup system:"
echo "   crontab -e"
echo "   0 * * * * /home/darwin/.openclaw/workspace/scripts/followup_cron.sh"
echo ""
echo "2. Set up Calendly webhook:"
echo "   - Go to Calendly > Integrations > Webhooks"
echo "   - Add webhook URL: https://your-server.com/webhook/calendly"
echo "   - Events: invitee.created, invitee.canceled"
echo ""
echo "3. Update Echo monitor to use VIP system:"
echo "   The echo_monitor.py has been updated with VIP detection"
echo ""
echo "4. Test VIP workflow:"
echo "   python3 /home/darwin/.openclaw/agents/echo/scripts/vip_client_system.py --add-vip test@example.com --name 'Test VIP'"
echo ""
echo "5. Update CRM schema:"
echo "   The new schema is at: /home/darwin/.openclaw/workspace/apps/dashboard/data/crm_schema_v2.sql"
echo ""
echo "📊 Features Implemented:"
echo "========================"
echo "✅ Calendly VIP Flagging - Clients who book are auto-flagged as VIP"
echo "✅ Priority Queue - VIPs get TIER_0 priority (immediate response)"
echo "✅ Auto-Followup Sequences - 48h followup with case studies"
echo "✅ Test vs Real Analytics - Distinguish husband's tests from real clients"
echo "✅ Visual VIP indicators in notifications and CRM"
echo ""
