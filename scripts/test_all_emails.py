#!/usr/bin/env python3
"""Test multiple email SMTP connections"""

import smtplib
import ssl
import os

# Load from .env
def load_env():
    env_path = '/home/darwin/.openclaw/workspace/.env'
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, val = line.strip().split('=', 1)
                    os.environ.setdefault(key, val)

load_env()

# Email configs
EMAILS = [
    {
        'name': 'HELLO',
        'address': os.getenv('HELLO_EMAIL'),
        'password': os.getenv('HELLO_PASS'),
        'smtp': 'mail.privateemail.com',
        'port': 465
    },
    {
        'name': 'OPS', 
        'address': os.getenv('OPS_EMAIL'),
        'password': os.getenv('OPS_PASS'),
        'smtp': 'mail.privateemail.com',
        'port': 465
    },
    {
        'name': 'SUPPORT',
        'address': os.getenv('SUPPORT_EMAIL'),
        'password': os.getenv('SUPPORT_PASS'),
        'smtp': 'mail.privateemail.com',
        'port': 465
    }
]

def test_email(email_config):
    name = email_config['name']
    address = email_config['address']
    password = email_config['password']
    
    if not address or not password:
        print(f"❌ {name}: Missing credentials")
        return False
    
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(email_config['smtp'], email_config['port'], context=context) as server:
            server.login(address, password)
            print(f"✅ {name}: {address} — Connection OK")
            return True
    except Exception as e:
        print(f"❌ {name}: {address} — {str(e)}")
        return False

print("Testing SMTP Connections...")
print("=" * 50)

results = []
for email in EMAILS:
    results.append(test_email(email))
    print()

print("=" * 50)
print(f"Results: {sum(results)}/{len(results)} connections successful")
