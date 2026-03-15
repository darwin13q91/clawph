#!/usr/bin/env python3
"""
Inbox API for Dashboard - Returns JSON data
Usage: python3 inbox_api.py [all|hello|ops|support]
"""

import imaplib
import ssl
import email
import os
import sys
import json
import socket
import signal
from email.header import decode_header
from email.utils import formatdate

# Timeout handler
def timeout_handler(signum, frame):
    raise TimeoutError("IMAP connection timed out")

# Set global timeout
signal.signal(signal.SIGALRM, timeout_handler)

def load_env():
    env_path = '/home/darwin/.openclaw/workspace/.env'
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, val = line.strip().split('=', 1)
                    os.environ.setdefault(key, val)

load_env()

EMAIL_ACCOUNTS = {
    'hello': {
        'address': os.getenv('HELLO_EMAIL'),
        'password': os.getenv('HELLO_PASS'),
        'imap': 'mail.privateemail.com',
        'port': 993
    },
    'ops': {
        'address': os.getenv('OPS_EMAIL'),
        'password': os.getenv('OPS_PASS'),
        'imap': 'mail.privateemail.com',
        'port': 993
    },
    'support': {
        'address': os.getenv('SUPPORT_EMAIL'),
        'password': os.getenv('SUPPORT_PASS'),
        'imap': 'mail.privateemail.com',
        'port': 993
    }
}

def decode_subject(subject):
    if subject is None:
        return "No Subject"
    decoded = decode_header(subject)
    subject_str = ""
    for part, charset in decoded:
        if isinstance(part, bytes):
            subject_str += part.decode(charset or 'utf-8', errors='ignore')
        else:
            subject_str += part
    return subject_str[:60]

def get_inbox_data(account_name):
    """Get inbox data for a single account with timeout"""
    if account_name not in EMAIL_ACCOUNTS:
        return None
    
    account = EMAIL_ACCOUNTS[account_name]
    
    if not account['address'] or not account['password']:
        return {'unread': 0, 'error': 'No credentials', 'recent': []}
    
    try:
        # Set alarm for 5 seconds
        signal.alarm(5)
        
        # Create socket with timeout
        context = ssl.create_default_context()
        mail = imaplib.IMAP4_SSL(account['imap'], account['port'], ssl_context=context)
        mail.login(account['address'], account['password'])
        mail.select('INBOX')
        
        # Count unread
        status, messages = mail.search(None, 'UNSEEN')
        unread_count = len(messages[0].split()) if status == 'OK' else 0
        
        # Get recent emails (last 3)
        status, all_messages = mail.search(None, 'ALL')
        recent = []
        
        if status == 'OK' and all_messages[0]:
            email_ids = all_messages[0].split()[-3:]
            
            for email_id in reversed(email_ids):
                try:
                    status, msg_data = mail.fetch(email_id, '(RFC822)')
                    if status == 'OK':
                        msg = email.message_from_bytes(msg_data[0][1])
                        subject = decode_subject(msg['Subject'])
                        from_addr = msg['From'][:40] if msg['From'] else 'Unknown'
                        
                        # Check if unread
                        flags_status, flags_data = mail.fetch(email_id, '(FLAGS)')
                        is_unread = b'\\Seen' not in flags_data[0] if flags_status == 'OK' else False
                        
                        recent.append({
                            'subject': subject,
                            'from': from_addr,
                            'unread': is_unread
                        })
                except:
                    pass
        
        mail.close()
        mail.logout()
        
        # Cancel alarm
        signal.alarm(0)
        
        return {'unread': unread_count, 'recent': recent}
        
    except TimeoutError:
        return {'unread': 0, 'error': 'Connection timeout', 'recent': []}
    except Exception as e:
        return {'unread': 0, 'error': str(e)[:50], 'recent': []}
    finally:
        signal.alarm(0)

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else 'all'
    
    result = {
        'timestamp': None,
        'accounts': {},
        'total_unread': 0
    }
    
    if target == 'all':
        for account_name in EMAIL_ACCOUNTS:
            data = get_inbox_data(account_name)
            if data:
                result['accounts'][account_name] = data
                result['total_unread'] += data.get('unread', 0)
    else:
        data = get_inbox_data(target)
        if data:
            result['accounts'][target] = data
            result['total_unread'] = data.get('unread', 0)
    
    result['timestamp'] = formatdate(localtime=True)
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()
