#!/bin/bash
# Deploy Gateway v2 to VPS

# Copy file to VPS (run from laptop)
# sshpass -p 'aiopsflow13!ED' scp /home/darwin/.openclaw/workspace/vps/gateway/gateway_v2_final.py root@157.245.152.57:/opt/openclaw/gateway/gateway.py

# OR - Create directly on VPS:
cd /opt/openclaw/gateway

# Backup current
cp gateway.py gateway_v1_final.py

# Create v2 using Python (clean method)
python3 << 'PYEOF'
code = '''from flask import Flask, request, jsonify
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
        
        default_responses = {
            'greeting': f"Hello! Welcome to {name}. How can I help you today?",
            'hours': "Our business hours are 9 AM - 6 PM, Monday to Saturday.",
            'contact': "You can reach us through this chat or email.",
            'help': "I can help you with general inquiries and support.",
            'menu': "Please check our website for our full menu/products.",
            'pricing': "Please contact us for pricing information.",
            'fallback': "Thanks for your message! I'll get back to you soon."
        }
        
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        cfg = {
            'client_id': cid,
            'business_name': name,
            'token_hash': token_hash,
            'chat_id': chat_id,
            'created_at': datetime.now().isoformat(),
            'status': 'active',
            'message_count': 0,
            'custom_responses': default_responses
        }
        
        with open(os.path.join(p, 'config.json'), 'w') as f:
            json.dump(cfg, f, indent=2)
        with open(os.path.join(p, '.token'), 'w') as f:
            f.write(token)
        
        os.chmod(p, 0o700)
        self.clients[cid] = cfg
        return cid
    
    def update_responses(self, cid, responses):
        client = self.get(cid)
        if not client:
            return False
        client['custom_responses'].update(responses)
        client['updated_at'] = datetime.now().isoformat()
        p = os.path.join(DATA_DIR, cid)
        with open(os.path.join(p, 'config.json'), 'w') as f:
            json.dump(client, f, indent=2)
        return True

client_manager = ClientManager()

def generate_reply(client, msg_text):
    msg = msg_text.lower()
    responses = client.get('custom_responses', {})
    
    if any(word in msg for word in ['hi', 'hello', 'hey']):
        return responses.get('greeting', "Hello!")
    if any(word in msg for word in ['hour', 'open', 'time', 'when']):
        return responses.get('hours', "Contact us for hours.")
    if any(word in msg for word in ['contact', 'call', 'email', 'phone']):
        return responses.get('contact', "Contact us here.")
    if any(word in msg for word in ['menu', 'food', 'dish', 'product']):
        return responses.get('menu', "Check our website.")
    if any(word in msg for word in ['price', 'cost', 'how much']):
        return responses.get('pricing', "Contact for pricing.")
    if any(word in msg for word in ['help', 'support', 'assist']):
        return responses.get('help', "How can I help?")
    return responses.get('fallback', "Thanks! Will reply soon.")

@app.route('/')
def root():
    return jsonify({
        'service': 'OpenClaw Multi-Tenant Gateway',
        'status': 'running',
        'version': 'v2',
        'features': ['custom-responses', 'multi-tenant', 'client-isolation'],
        'endpoints': {
            'health': '/health',
            'admin': '/admin/clients',
            'webhook': '/webhook/<client_id>',
            'config': '/admin/clients/<client_id>/config'
        },
        'clients': len(client_manager.clients),
        'ssl': True
    })

@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'version': 'v2', 'clients': len(client_manager.clients)})

@app.route('/webhook/<cid>', methods=['POST'])
def webhook(cid):
    client = client_manager.get(cid)
    if not client:
        return jsonify({'error': 'not found'}), 404
    data = request.get_json() or {}
    msg_text = ''
    if 'message' in data and 'text' in data['message']:
        msg_text = data['message']['text']
    reply = generate_reply(client, msg_text)
    client['message_count'] = client.get('message_count', 0) + 1
    return jsonify({'status': 'processed', 'reply': reply, 'client': client['business_name']})

@app.route('/admin/clients', methods=['GET'])
def list_clients():
    return jsonify({'clients': [{'id': k, 'name': v['business_name'], 'status': v['status'], 'messages': v.get('message_count', 0)} for k, v in client_manager.clients.items()]})

@app.route('/admin/clients', methods=['POST'])
def create_client():
    data = request.get_json()
    if not data or 'business_name' not in data or 'bot_token' not in data:
        return jsonify({'error': 'missing fields'}), 400
    cid = client_manager.create(data['business_name'], data['bot_token'], data.get('chat_id', ''))
    return jsonify({'client_id': cid, 'webhook_url': f'https://webhook.amajungle.com/webhook/{cid}', 'config_url': f'https://webhook.amajungle.com/admin/clients/{cid}/config', 'status': 'created'})

@app.route('/admin/clients/<cid>/config', methods=['GET'])
def get_client_config(cid):
    client = client_manager.get(cid)
    if not client:
        return jsonify({'error': 'not found'}), 404
    return jsonify({'client_id': cid, 'business_name': client['business_name'], 'custom_responses': client.get('custom_responses', {}), 'message_count': client.get('message_count', 0)})

@app.route('/admin/clients/<cid>/config', methods=['POST'])
def update_client_config(cid):
    client = client_manager.get(cid)
    if not client:
        return jsonify({'error': 'not found'}), 404
    data = request.get_json()
    if 'custom_responses' in data:
        client_manager.update_responses(cid, data['custom_responses'])
        return jsonify({'status': 'updated', 'client': cid, 'responses_updated': list(data['custom_responses'].keys())})
    return jsonify({'error': 'no updates provided'}), 400

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
'''

with open('gateway.py', 'w') as f:
    f.write(code)
print('gateway.py v2 created!')
PYEOF

# Restart
systemctl restart openclaw-gateway
sleep 2

# Test
echo "=== Testing v2 ==="
curl -s https://webhook.amajungle.com/ | head -20
