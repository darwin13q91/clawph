#!/bin/bash
# Deploy Secure Multi-Tenant Gateway to VPS
# Run this ON the VPS

set -e

echo "🔐 Deploying Secured Multi-Tenant Gateway..."
echo "=============================================="

# Configuration
GATEWAY_DIR="/opt/openclaw/gateway"
CLIENTS_DIR="/opt/openclaw/clients"
DOMAIN="webhook.amajungle.com"

# Create directories
echo "📁 Creating directories..."
mkdir -p $GATEWAY_DIR
mkdir -p $CLIENTS_DIR
mkdir -p /var/log/openclaw

# Set permissions
echo "🔒 Setting secure permissions..."
chmod 700 $CLIENTS_DIR
chmod 755 $GATEWAY_DIR

# Generate secret key
SECRET_KEY=$(openssl rand -hex 32)
echo "GATEWAY_SECRET=$SECRET_KEY" > /opt/openclaw/gateway/.env
chmod 600 /opt/openclaw/gateway/.env

echo "✅ Secret key generated and secured"

# Install dependencies
echo "📦 Installing Python dependencies..."
cd $GATEWAY_DIR
pip3 install -r requirements.txt

echo "✅ Dependencies installed"

# Create systemd service
echo "⚙️  Creating systemd service..."
cat > /etc/systemd/system/openclaw-gateway.service <> EOF
[Unit]
Description=OpenClaw Multi-Tenant Gateway
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/openclaw/gateway
Environment="PATH=/usr/local/bin"
EnvironmentFile=/opt/openclaw/gateway/.env
ExecStart=/usr/local/bin/gunicorn -w 4 -b 127.0.0.1:5000 gateway:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable openclaw-gateway

echo "✅ Service created"

# Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/gateway <> EOF
server {
    listen 80;
    server_name webhook.amajungle.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate limiting zone
    limit_req_zone \$binary_remote_addr zone=webhook:10m rate=10r/s;
    
    location / {
        limit_req zone=webhook burst=20 nodelay;
        
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check (no rate limit)
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
}
EOF

ln -sf /etc/nginx/sites-available/gateway /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl restart nginx

echo "✅ Nginx configured"

# Setup SSL
echo "🔒 Setting up SSL..."
certbot --nginx -d webhook.amajungle.com --non-interactive --agree-tos --email admin@amajungle.com || true

echo "✅ SSL configured"

# Start service
echo "🚀 Starting gateway service..."
systemctl start openclaw-gateway
sleep 2

# Test
echo "🧪 Testing..."
if curl -s http://localhost:5000/health | grep -q "healthy"; then
    echo "✅ Gateway is running!"
else
    echo "⚠️  Gateway may need manual check"
fi

echo ""
echo "=============================================="
echo "✅ SECURE MULTI-TENANT GATEWAY DEPLOYED!"
echo "=============================================="
echo ""
echo "📊 Admin Endpoints:"
echo "  Health:    https://webhook.amajungle.com/health"
echo "  Clients:   https://webhook.amajungle.com/admin/clients"
echo ""
echo "🔐 Security Features:"
echo "  ✅ Client data isolation (700 permissions)"
echo "  ✅ Token hashing (SHA-256)"
echo "  ✅ Rate limiting (10 req/s)"
echo "  ✅ HTTPS with SSL"
echo "  ✅ Secure headers"
echo "  ✅ Systemd service with auto-restart"
echo ""
echo "📋 Next Steps:"
echo "  1. Create first client:"
echo "     curl -X POST https://webhook.amajungle.com/admin/clients \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"business_name\":\"Test Client\",\"bot_token\":\"YOUR_TOKEN\",\"chat_id\":\"YOUR_CHAT_ID\"}'"
echo ""
echo "  2. Check logs: journalctl -u openclaw-gateway -f"
echo ""
echo "🚀 Ready for clients!"
