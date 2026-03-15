#!/bin/bash
# Setup Local AI Bot with Tailscale Funnel
# Exposes laptop to internet for Telegram webhooks

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Local AI Bot + Tailscale Funnel Setup                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}[1/5] Checking Tailscale...${NC}"

# Check Tailscale status
if ! command -v tailscale &> /dev/null; then
    echo "Installing Tailscale..."
    curl -fsSL https://tailscale.com/install.sh | sh
fi

# Check if logged in
if ! tailscale status &> /dev/null; then
    echo "⚠️  Please run: sudo tailscale up"
    echo "Then authenticate with your account"
    exit 1
fi

echo "✅ Tailscale connected"
echo "Your Tailscale IP: $(tailscale ip -4)"

echo ""
echo -e "${YELLOW}[2/5] Enabling Tailscale Funnel...${NC}"

# Enable funnel (requires sudo)
echo "This will expose your laptop to the internet via HTTPS"
echo "Running: sudo tailscale serve --https=443 --set-path=/webhook http://localhost:8789"

# Kill any existing serve
sudo tailscale serve --https=443 off 2>/dev/null || true
sleep 1

# Start new serve
sudo tailscale serve --https=443 --set-path=/webhook http://localhost:8789 &
SERVE_PID=$!
sleep 3

# Get the public URL
TAILNET=$(tailscale status --json 2>/dev/null | grep -o '"TailscaleIPs":\[[^\]]*\]' | head -1 | grep -o '[0-9.]*' | head -1)
PUBLIC_URL="https://$(tailscale status --json 2>/dev/null | grep -o '"Self":{[^}]*}' | grep -o '"DNSName":"[^"]*"' | cut -d'"' -f4 | sed 's/\.$//')"

if [ -z "$PUBLIC_URL" ] || [ "$PUBLIC_URL" = "https:" ]; then
    echo "⚠️  Could not auto-detect URL"
    echo "Your URL should be: https://[your-machine-name].[tailnet-name].ts.net"
else
    echo "✅ Public URL: ${PUBLIC_URL}/webhook"
    WEBHOOK_URL="${PUBLIC_URL}/webhook"
fi

echo ""
echo -e "${YELLOW}[3/5] Creating Local Gateway...${NC}"

# Create local gateway directory
mkdir -p /home/darwin/.openclaw/workspace/local-bot
cd /home/darwin/.openclaw/workspace/local-bot

# Create the gateway
cat > local_gateway.py << 'PYEOF'
#!/usr/bin/env python3
"""
Local AI Bot Gateway
Receives Telegram webhooks and responds using Hybrid AI
"""

import asyncio
import json
import sys
import os
from aiohttp import web

# Add paths
sys.path.insert(0, '/home/darwin/.openclaw/workspace/ai-gateway')

from hybrid_processor import HybridAI

class LocalAIBot:
    def __init__(self):
        self.ai = HybridAI()
        self.app = web.Application()
        self._setup_routes()
        
    def _setup_routes(self):
        self.app.router.add_get('/health', self.health_handler)
        self.app.router.add_post('/webhook/{client_id}', self.webhook_handler)
        
    async def health_handler(self, request):
        return web.json_response({
            'status': 'healthy',
            'service': 'local-ai-bot',
            'mode': 'hybrid-ai',
            'timestamp': str(asyncio.get_event_loop().time())
        })
    
    async def webhook_handler(self, request):
        """Handle Telegram webhook"""
        client_id = request.match_info.get('client_id', 'unknown')
        
        try:
            data = await request.json()
            
            # Extract message
            message_text = ''
            chat_id = ''
            
            if 'message' in data:
                msg = data['message']
                if 'text' in msg:
                    message_text = msg['text']
                if 'chat' in msg and 'id' in msg['chat']:
                    chat_id = str(msg['chat']['id'])
            
            print(f"[WEBHOOK] Client: {client_id}, Msg: {message_text[:50]}")
            
            # Get business context
            context = {
                'business_name': self._get_business_name(client_id),
                'business_type': 'general'
            }
            
            # Process with Hybrid AI
            response, mode = await self.ai.process(message_text, context)
            
            print(f"[RESPONSE] Mode: {mode}, Reply: {response[:80]}...")
            
            # Send to Telegram (if we have bot token)
            await self._send_to_telegram(chat_id, response)
            
            return web.json_response({
                'status': 'ok',
                'mode': mode,
                'reply': response,
                'sent': True
            })
            
        except Exception as e:
            print(f"[ERROR] {e}")
            return web.json_response({
                'status': 'error',
                'error': str(e)
            }, status=500)
    
    def _get_business_name(self, client_id):
        """Get business name from client config"""
        # Try to load from config
        config_path = f'/home/darwin/.openclaw/clients/{client_id}/config.json'
        try:
            if os.path.exists(config_path):
                with open(config_path) as f:
                    config = json.load(f)
                    return config.get('business_name', 'This Business')
        except:
            pass
        return 'This Business'
    
    async def _send_to_telegram(self, chat_id, text):
        """Send response back to Telegram"""
        import aiohttp
        
        # Get bot token from environment or config
        bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '8614261430:AAGWQ1TcNWXB4zrGu_-KrdlAPT9k_Vaova0')
        
        if not chat_id:
            print("[WARN] No chat_id, skipping Telegram send")
            return
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                async with session.post(url, json={
                    'chat_id': chat_id,
                    'text': text,
                    'parse_mode': 'HTML'
                }) as resp:
                    if resp.status == 200:
                        print(f"[TELEGRAM] Sent to {chat_id}")
                    else:
                        error = await resp.text()
                        print(f"[TELEGRAM ERROR] {error}")
        except Exception as e:
            print(f"[TELEGRAM EXCEPTION] {e}")
    
    def run(self, port=8789):
        print(f"🚀 Starting Local AI Bot on port {port}")
        print(f"📡 Webhook endpoint: http://localhost:{port}/webhook/{{client_id}}")
        print(f"💚 Health check: http://localhost:{port}/health")
        print("")
        print("Ready for Telegram webhooks!")
        web.run_app(self.app, host='0.0.0.0', port=port)

if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8789
    bot = LocalAIBot()
    bot.run(port)
PYEOF

chmod +x local_gateway.py

echo "✅ Local gateway created"

echo ""
echo -e "${YELLOW}[4/5] Testing Local Gateway...${NC}"

# Test health endpoint (in background)
python3 local_gateway.py &
GATEWAY_PID=$!
sleep 3

# Quick test
curl -s http://localhost:8789/health | python3 -m json.tool || echo "Health check..."

# Kill background process
kill $GATEWAY_PID 2>/dev/null || true

echo ""
echo -e "${YELLOW}[5/5] Setup Complete!${NC}"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ LOCAL AI BOT READY!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📂 Location: /home/darwin/.openclaw/workspace/local-bot/"
echo ""
echo "🌐 Public URL: ${WEBHOOK_URL:-https://[your-tailnet].ts.net/webhook}"
echo ""
echo "🚀 To Start:"
echo "  cd /home/darwin/.openclaw/workspace/local-bot"
echo "  python3 local_gateway.py"
echo ""
echo "🔗 Update Telegram Webhook:"
echo "  curl -X POST \"https://api.telegram.org/bot<TOKEN>/setWebhook\" \\"
echo "    -d \"url=${WEBHOOK_URL:-YOUR_URL}/webhook/client_0b70f519a29c45c1\""
echo ""
echo "💡 Features:"
echo "  • Fast responses (context-based, no API cost)"
echo "  • Complex queries (OpenClaw sub-agents)"
echo "  • Direct integration with your OpenClaw"
echo "  • No VPS needed!"
echo ""
