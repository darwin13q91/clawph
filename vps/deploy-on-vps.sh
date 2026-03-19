#!/bin/bash
# Deploy Secure Gateway - Run this ON the VPS

echo "🚀 OpenClaw Secure Multi-Tenant Gateway Deployment"
echo "==================================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (sudo su)"
    exit 1
fi

# Create directories
echo "📁 Setting up directories..."
mkdir -p /opt/openclaw/gateway
mkdir -p /opt/openclaw/clients
mkdir -p /var/log/openclaw

# Set secure permissions
chmod 700 /opt/openclaw/clients
chmod 755 /opt/openclaw/gateway

echo "✅ Directories created"

# Install Python dependencies
echo "📦 Installing dependencies..."
pip3 install flask gunicorn requests -q

echo "✅ Dependencies installed"

# Check if gateway files exist
if [ ! -f "/opt/openclaw/gateway/gateway.py" ]; then
    echo "❌ Gateway files not found!"
    echo "Please copy files from laptop first:"
    echo "  scp -r ~/.openclaw/workspace/vps/gateway/* root@157.245.152.57:/opt/openclaw/gateway/"
    exit 1
fi

# Generate secret key
echo "🔐 Generating secure key..."
SECRET_KEY=$(openssl rand -hex 32)
echo "GATEWAY_SECRET=$SECRET_KEY" > /opt/openclaw/gateway/.env
chmod 600 /opt/openclaw/gateway/.env
echo "✅ Secret key secured"

# Create systemd service
echo "⚙️  Creating service..."
cat > /etc/systemd/system/openclaw-gateway.service <> 'EOF'
[Unit]
Description=OpenClaw Multi-Tenant Gateway
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/openclaw/gateway
Environment="PATH=/usr/local/bin"
EnvironmentFile=/opt/openclaw/gateway/.env
ExecStart=/usr/local/bin/gunicorn -w 2 -b 127.0.0.1:5000 gateway:app
Restart=always
RestartSec=10
StandardOutput=append:/var/log/openclaw/gateway.log
StandardError=append:/var/log/openclaw/gateway.error.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable openclaw-gateway

echo "✅ Service created"

# Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/gateway << 'EOF'
server {
    listen 80;
    server_name webhook.amajungle.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/gateway /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl restart nginx

echo "✅ Nginx configured"

# Start service
echo "🚀 Starting gateway..."
systemctl start openclaw-gateway
sleep 3

# Test
echo "🧪 Testing..."
if curl -s http://localhost:5000/health | grep -q "healthy"; then
    echo ""
    echo "✅✅✅ SUCCESS! Gateway is running! ✅✅✅"
    echo ""
    echo "📊 Endpoints:"
    echo "  Health:    https://webhook.amajungle.com/health"
    echo "  Admin:     https://webhook.amajungle.com/admin/clients"
    echo ""
    echo "📋 Create first client:"
    echo "  curl -X POST https://webhook.amajungle.com/admin/clients \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"business_name\":\"Test\",\"bot_token\":\"TOKEN\",\"chat_id\":\"ID\"}'"
    echo ""
    echo "📜 View logs:"
    echo "  journalctl -u openclaw-gateway -f"
else
    echo "⚠️  Gateway may have issues. Check logs:"
    echo "  journalctl -u openclaw-gateway -n 50"
fi

echo ""
echo "==================================================="
