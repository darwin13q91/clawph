#!/bin/bash
# SIMPLE GATEWAY DEPLOY - Copy this to VPS and run

cd /root

# Step 1: Setup
echo "📦 Installing..."
pip3 install flask gunicorn -q 2>/dev/null
mkdir -p /opt/openclaw/gateway /opt/openclaw/clients
chmod 700 /opt/openclaw/clients

# Step 2: Create gateway
echo "📝 Creating gateway..."
cat > /opt/openclaw/gateway/gateway.py <> 'EOF'
from flask import Flask, request, jsonify
import os, json, hashlib, secrets
from datetime import datetime

app = Flask(__name__)
DATA_DIR = '/opt/openclaw/clients'
os.makedirs(DATA_DIR, exist_ok=True)
os.chmod(DATA_DIR, 0o700)

class ClientManager:
    def __init__(self):
        self.clients = {}
        self.load()
    
    def load(self):
        if not os.path.exists(DATA_DIR):
            return
        for cid in os.listdir(DATA_DIR):
            p = os.path.join(DATA_DIR, cid)
            if os.path.isdir(p) and cid != 'logs':
                cfg_path = os.path.join(p, 'config.json')
                if os.path.exists(cfg_path):
                    try:
                        with open(cfg_path) as f:
                            self.clients[cid] = json.load(f)
                    except:
                        pass
    
    def get(self, cid):
        if not cid or '..' in cid or '/' in cid:
            return None
        return self.clients.get(cid)
    
    def create(self, name, token, chat_id):
        cid = f"client_{secrets.token_hex(8)}"
        p = os.path.join(DATA_DIR, cid)
        os.makedirs(p, exist_ok=True)
        os.makedirs(os.path.join(p, 'logs'), exist_ok=True)
        
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        cfg = {
            'client_id': cid,
            'business_name': name,
            'token_hash': token_hash,
            'chat_id': chat_id,
            'created_at': datetime.now().isoformat(),
            'status': 'active',
            'message_count': 0
        }
        
        with open(os.path.join(p, 'config.json'), 'w') as f:
            json.dump(cfg, f)
        with open(os.path.join(p, '.token'), 'w') as f:
            f.write(token)
        
        os.chmod(p, 0o700)
        self.clients[cid] = cfg
        return cid

client_manager = ClientManager()

@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'clients': len(client_manager.clients)})

@app.route('/webhook/<cid>', methods=['POST'])
def webhook(cid):
    client = client_manager.get(cid)
    if not client:
        return jsonify({'error': 'not found'}), 404
    
    data = request.get_json() or {}
    msg = data.get('message', {}).get('text', '').lower() if 'message' in data else ''
    
    reply = "Thanks for your message!"
    if 'hi' in msg or 'hello' in msg:
        reply = f"Hello! Welcome to {client['business_name']}. How can I help?"
    elif 'help' in msg:
        reply = "I can help with:\n• General inquiries\n• Support\n• Information"
    
    return jsonify({'status': 'processed', 'reply': reply})

@app.route('/admin/clients', methods=['GET'])
def list_clients():
    return jsonify({'clients': [
        {'id': k, 'name': v['business_name'], 'status': v['status']}
        for k, v in client_manager.clients.items()
    ]})

@app.route('/admin/clients', methods=['POST'])
def create_client():
    data = request.get_json()
    if not data or 'business_name' not in data or 'bot_token' not in data:
        return jsonify({'error': 'missing fields'}), 400
    
    cid = client_manager.create(
        data['business_name'],
        data['bot_token'],
        data.get('chat_id', '')
    )
    return jsonify({
        'client_id': cid,
        'webhook_url': f'https://webhook.amajungle.com/webhook/{cid}',
        'status': 'created'
    })

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
EOF

# Step 3: Service
echo "⚙️  Creating service..."
cat > /etc/systemd/system/openclaw-gateway.service <> 'EOF'
[Unit]
Description=OpenClaw Gateway
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/openclaw/gateway
ExecStart=/usr/local/bin/gunicorn -w 2 -b 127.0.0.1:5000 gateway:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable openclaw-gateway

# Step 4: Nginx
echo "🌐 Configuring nginx..."
cat > /etc/nginx/sites-available/gateway <> 'EOF'
server {
    listen 80;
    server_name webhook.amajungle.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

ln -sf /etc/nginx/sites-available/gateway /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null
nginx -t && systemctl restart nginx

# Step 5: Start
echo "🚀 Starting..."
systemctl start openclaw-gateway
sleep 2

# Test
if curl -s http://localhost:5000/health | grep -q healthy; then
    echo ""
    echo "✅ GATEWAY DEPLOYED!"
    echo "Health: https://webhook.amajungle.com/health"
    echo "Admin: https://webhook.amajungle.com/admin/clients"
else
    echo "⚠️  Check: systemctl status openclaw-gateway"
fi
