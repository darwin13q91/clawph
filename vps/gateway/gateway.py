#!/usr/bin/env python3
"""
OpenClaw Multi-Tenant Gateway
Secure, isolated, scalable client bot hosting
"""

import os
import json
import hashlib
import hmac
import time
import secrets
from datetime import datetime
from typing import Dict, List, Optional
from flask import Flask, request, jsonify, abort
from functools import wraps
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('gateway')

app = Flask(__name__)

# Configuration
DATA_DIR = '/opt/openclaw/clients'
CONFIG_FILE = f'{DATA_DIR}/gateway_config.json'
SECRET_KEY = os.environ.get('GATEWAY_SECRET', secrets.token_hex(32))

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(f'{DATA_DIR}/logs', exist_ok=True)

class ClientManager:
    """Manages multi-tenant client isolation"""
    
    def __init__(self):
        self.clients = {}
        self.load_clients()
    
    def load_clients(self):
        """Load all client configurations"""
        for client_id in os.listdir(DATA_DIR):
            client_path = os.path.join(DATA_DIR, client_id)
            if os.path.isdir(client_path) and client_id != 'logs':
                config_path = os.path.join(client_path, 'config.json')
                if os.path.exists(config_path):
                    try:
                        with open(config_path, 'r') as f:
                            self.clients[client_id] = json.load(f)
                    except Exception as e:
                        logger.error(f"Failed to load client {client_id}: {e}")
    
    def get_client(self, client_id: str) -> Optional[Dict]:
        """Get client configuration (secure lookup)"""
        # Validate client_id format (prevent path traversal)
        if not client_id or '..' in client_id or '/' in client_id:
            return None
        return self.clients.get(client_id)
    
    def authenticate_bot_token(self, token: str) -> Optional[str]:
        """Find client by bot token (secure)"""
        # Hash token for comparison (don't store plaintext)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        for client_id, config in self.clients.items():
            stored_hash = config.get('token_hash')
            if stored_hash and hmac.compare_digest(stored_hash, token_hash):
                return client_id
        return None
    
    def create_client(self, client_data: Dict) -> str:
        """Create new client (secure setup)"""
        client_id = f"client_{secrets.token_hex(8)}"
        client_path = os.path.join(DATA_DIR, client_id)
        
        # Create isolated directory
        os.makedirs(client_path, exist_ok=True)
        os.makedirs(os.path.join(client_path, 'data'), exist_ok=True)
        os.makedirs(os.path.join(client_path, 'logs'), exist_ok=True)
        
        # Hash sensitive data
        bot_token = client_data.get('bot_token', '')
        token_hash = hashlib.sha256(bot_token.encode()).hexdigest()
        
        # Store config (without plaintext token)
        config = {
            'client_id': client_id,
            'business_name': client_data.get('business_name', 'Unknown'),
            'token_hash': token_hash,
            'chat_id': client_data.get('chat_id', ''),
            'created_at': datetime.now().isoformat(),
            'status': 'active',
            'message_count': 0,
            'last_activity': None
        }
        
        config_path = os.path.join(client_path, 'config.json')
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        # Set restrictive permissions
        os.chmod(client_path, 0o700)
        os.chmod(config_path, 0o600)
        
        # Store token securely (separate file, restricted)
        token_file = os.path.join(client_path, '.token')
        with open(token_file, 'w') as f:
            f.write(bot_token)
        os.chmod(token_file, 0o600)
        
        self.clients[client_id] = config
        logger.info(f"Created client: {client_id}")
        
        return client_id

# Initialize client manager
client_manager = ClientManager()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'clients': len(client_manager.clients)
    })

@app.route('/webhook/<client_id>', methods=['POST'])
def webhook_handler(client_id: str):
    """Handle incoming webhook for specific client"""
    # Security: Validate client_id
    if not client_id or '..' in client_id or '/' in client_id:
        abort(400, 'Invalid client ID')
    
    client = client_manager.get_client(client_id)
    if not client:
        abort(404, 'Client not found')
    
    if client.get('status') != 'active':
        abort(403, 'Client account inactive')
    
    # Process webhook
    data = request.get_json()
    if not data:
        abort(400, 'Invalid JSON')
    
    # Log message (isolated to client)
    log_message(client_id, data)
    
    # Update stats
    client['message_count'] = client.get('message_count', 0) + 1
    client['last_activity'] = datetime.now().isoformat()
    
    # Generate auto-reply
    reply = generate_reply(client_id, data)
    
    if reply:
        send_telegram_message(client_id, reply)
    
    return jsonify({'status': 'processed'}), 200

@app.route('/admin/clients', methods=['GET'])
def list_clients():
    """Admin: List all clients (no sensitive data)"""
    clients_summary = []
    for client_id, config in client_manager.clients.items():
        clients_summary.append({
            'client_id': client_id,
            'business_name': config.get('business_name'),
            'status': config.get('status'),
            'message_count': config.get('message_count', 0),
            'created_at': config.get('created_at'),
            'last_activity': config.get('last_activity')
        })
    
    return jsonify({
        'clients': clients_summary,
        'total': len(clients_summary)
    })

@app.route('/admin/clients', methods=['POST'])
def create_client():
    """Admin: Create new client"""
    data = request.get_json()
    
    if not data or 'business_name' not in data or 'bot_token' not in data:
        abort(400, 'Missing required fields: business_name, bot_token')
    
    client_id = client_manager.create_client(data)
    
    return jsonify({
        'client_id': client_id,
        'webhook_url': f'https://webhook.amajungle.com/webhook/{client_id}',
        'status': 'created'
    }), 201

def log_message(client_id: str, message: Dict):
    """Log message to client-specific log (isolated)"""
    log_path = os.path.join(DATA_DIR, client_id, 'logs', 'messages.log')
    
    log_entry = {
        'timestamp': datetime.now().isoformat(),
        'message': message
    }
    
    with open(log_path, 'a') as f:
        f.write(json.dumps(log_entry) + '\n')

def generate_reply(client_id: str, data: Dict) -> Optional[str]:
    """Generate auto-reply based on client config"""
    client = client_manager.get_client(client_id)
    if not client:
        return None
    
    # Get message text
    message_text = ''
    if 'message' in data and 'text' in data['message']:
        message_text = data['message']['text'].lower()
    
    # Simple keyword responses (customizable per client)
    responses = {
        'hi': f"Hello! Welcome to {client.get('business_name', 'our service')}. How can I help?",
        'hello': f"Hi there! I'm your AI assistant.",
        'help': "I can help you with:\n• General inquiries\n• Support\n• Information\n\nWhat do you need?",
        'price': "Please contact us for pricing details.",
        'contact': "You can reach us through this chat or email."
    }
    
    for keyword, response in responses.items():
        if keyword in message_text:
            return response
    
    return f"Thanks for your message! I'll get back to you soon."

def send_telegram_message(client_id: str, message: str):
    """Send message via Telegram Bot API"""
    import requests
    
    client = client_manager.get_client(client_id)
    if not client:
        return
    
    # Get token from secure storage
    token_file = os.path.join(DATA_DIR, client_id, '.token')
    try:
        with open(token_file, 'r') as f:
            bot_token = f.read().strip()
    except:
        logger.error(f"Could not read token for {client_id}")
        return
    
    # Get chat ID from message
    # This is simplified - in production, extract from incoming message
    chat_id = client.get('chat_id', '')
    
    if not chat_id:
        logger.warning(f"No chat_id for client {client_id}")
        return
    
    try:
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            'chat_id': chat_id,
            'text': message,
            'parse_mode': 'HTML'
        }
        
        response = requests.post(url, json=payload, timeout=10)
        
        if response.status_code == 200:
            logger.info(f"Message sent to {client_id}")
        else:
            logger.error(f"Failed to send message: {response.text}")
            
    except Exception as e:
        logger.error(f"Error sending message to {client_id}: {e}")

if __name__ == '__main__':
    # Production settings
    app.run(
        host='127.0.0.1',  # Bind to localhost (nginx will proxy)
        port=5000,
        debug=False  # Disable debug in production
    )
