#!/bin/bash
# Deploy OpenClaw Facebook Webhook to DigitalOcean VPS
# Run this ON the VPS after creating it

set -e

echo "🚀 OpenClaw Facebook Webhook Deployment"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (sudo su)"
    exit 1
fi

# Configuration
DOMAIN="webhook.amajungle.com"
APP_DIR="/opt/openclaw/facebook"

echo "📦 Step 1: Installing dependencies..."
apt update
apt install -y nodejs npm python3 python3-pip git curl nginx certbot python3-certbot-nginx
npm install -g pm2

echo ""
echo "📁 Step 2: Creating application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

echo ""
echo "⚙️ Step 3: Creating webhook files..."

# Create package.json
cat > package.json <> 'EOF'
{
  "name": "openclaw-facebook-webhook",
  "version": "1.0.0",
  "main": "webhook.js",
  "scripts": {
    "start": "node webhook.js"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "express": "^4.18.0"
  }
}
EOF

# Create config.json (placeholder - user needs to update)
cat > config.json <> 'EOF'
{
  "app_id": "1314033703880439",
  "app_secret": "edf77897c1bd0d930014d09b0dac89b1",
  "page_access_token": "YOUR_PAGE_TOKEN_HERE",
  "verify_token": "AiOpsFlow13!ED",
  "webhook_url": "https://webhook.amajungle.com/webhook/facebook",
  "page_id": "102825747988156",
  "enabled": true
}
EOF

echo "✅ Created config.json"
echo "⚠️  IMPORTANT: Edit $APP_DIR/config.json and add your page access token!"
echo ""

# Create webhook.js
cat > webhook.js <> 'ENDOFFILE'
const express = require('express');
const axios = require('axios');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const app = express();

app.use(express.json());

// Webhook verification
app.get('/webhook/facebook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === config.verify_token) {
        console.log('✅ Webhook verified');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Receive messages
app.post('/webhook/facebook', (req, res) => {
    const body = req.body;
    res.status(200).send('EVENT_RECEIVED');

    if (body.object === 'page') {
        body.entry.forEach(entry => {
            entry.messaging.forEach(event => {
                if (event.message) {
                    handleMessage(event.sender.id, event.message.text);
                }
            });
        });
    }
});

async function handleMessage(senderId, text) {
    console.log(\`📩 Message from \${senderId}: \${text}\`);
    
    // Simple auto-reply
    const reply = \`Hi! I'm AIOps Flow bot. You said: "\${text}"\`;
    
    await sendMessage(senderId, reply);
}

async function sendMessage(recipientId, text) {
    try {
        await axios.post(\`https://graph.facebook.com/v18.0/me/messages?access_token=\${config.page_access_token}\`, {
            recipient: { id: recipientId },
            message: { text: text }
        });
        console.log('✅ Reply sent');
    } catch (err) {
        console.error('❌ Failed to send:', err.message);
    }
}

app.listen(3001, () => {
    console.log('🚀 Facebook webhook running on port 3001');
});
ENDOFFILE

echo "✅ Created webhook.js"

# Install dependencies
echo ""
echo "📥 Step 4: Installing Node.js dependencies..."
npm install

echo ""
echo "🔒 Step 5: Setting up firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "🌐 Step 6: Configuring Nginx..."

cat > /etc/nginx/sites-available/webhook <> 'EOF'
server {
    listen 80;
    server_name webhook.amajungle.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/webhook /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo ""
echo "✅ Step 7: Starting webhook server..."
pm2 start webhook.js --name "facebook-webhook"
pm2 save
pm2 startup systemd -u root --hp /root

echo ""
echo "========================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Edit config: nano $APP_DIR/config.json"
echo "   Add your page access token"
echo ""
echo "2. Get SSL certificate:"
echo "   certbot --nginx -d webhook.amajungle.com"
echo ""
echo "3. Test webhook:"
echo "   curl \"https://webhook.amajungle.com/webhook/facebook?hub.mode=subscribe&hub.verify_token=AiOpsFlow13!ED&hub.challenge=test123\""
echo ""
echo "4. Configure in Facebook Dev Console:"
echo "   Callback URL: https://webhook.amajungle.com/webhook/facebook"
echo "   Verify Token: AiOpsFlow13!ED"
echo ""
echo "5. Check logs: pm2 logs"
echo ""
echo "🚀 Your bot is ready!"
echo ""
