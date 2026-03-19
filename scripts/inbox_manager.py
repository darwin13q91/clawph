#!/usr/bin/env python3
"""
Email Inbox Manager for PrivateEmail (Namecheap)
Usage: python3 inbox_manager.py [list|read|unread|delete] [options]
"""

import imaplib
import ssl
import email
import os
import argparse
from email.header import decode_header
from datetime import datetime

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

def connect_imap(account_name='hello'):
    """Connect to IMAP server"""
    if account_name not in EMAIL_ACCOUNTS:
        raise ValueError(f"Unknown account: {account_name}")
    
    account = EMAIL_ACCOUNTS[account_name]
    context = ssl.create_default_context()
    
    mail = imaplib.IMAP4_SSL(account['imap'], account['port'], ssl_context=context)
    mail.login(account['address'], account['password'])
    
    return mail, account['address']

def decode_subject(subject):
    """Decode email subject"""
    if subject is None:
        return "No Subject"
    decoded = decode_header(subject)
    subject_str = ""
    for part, charset in decoded:
        if isinstance(part, bytes):
            subject_str += part.decode(charset or 'utf-8', errors='ignore')
        else:
            subject_str += part
    return subject_str

def get_sender(msg):
    """Extract sender email"""
    from_header = msg.get('From', 'Unknown')
    return from_header

def get_date(msg):
    """Extract email date"""
    date_str = msg.get('Date', '')
    try:
        # Parse various date formats
        return date_str
    except:
        return date_str

def list_emails(account='hello', folder='INBOX', limit=10, unread_only=False):
    """List emails in inbox"""
    try:
        mail, address = connect_imap(account)
        mail.select(folder)
        
        # Search criteria
        if unread_only:
            status, messages = mail.search(None, 'UNSEEN')
        else:
            status, messages = mail.search(None, 'ALL')
        
        if status != 'OK':
            print(f"❌ Failed to search emails")
            return
        
        email_ids = messages[0].split()
        
        if not email_ids:
            print(f"📭 No emails found in {address}")
            return
        
        # Get last N emails (reversed = newest first)
        email_ids = email_ids[-limit:][::-1]
        
        print(f"\n📬 {address} — {len(email_ids)} emails")
        print("=" * 70)
        
        for idx, email_id in enumerate(email_ids, 1):
            status, msg_data = mail.fetch(email_id, '(RFC822)')
            
            if status != 'OK':
                continue
                
            msg = email.message_from_bytes(msg_data[0][1])
            
            subject = decode_subject(msg['Subject'])
            sender = get_sender(msg)
            date = get_date(msg)
            
            # Check if unread
            flags_status, flags_data = mail.fetch(email_id, '(FLAGS)')
            is_unread = b'\\Seen' not in flags_data[0]
            
            read_marker = "🔴" if is_unread else "📧"
            
            print(f"{idx}. {read_marker} {subject}")
            print(f"   From: {sender}")
            print(f"   Date: {date}")
            print()
        
        mail.close()
        mail.logout()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def read_email(account='hello', email_num=1, folder='INBOX'):
    """Read full content of an email"""
    try:
        mail, address = connect_imap(account)
        mail.select(folder)
        
        status, messages = mail.search(None, 'ALL')
        email_ids = messages[0].split()
        
        if not email_ids or email_num > len(email_ids):
            print(f"❌ Email #{email_num} not found")
            return
        
        # Get email by index (newest first)
        email_id = email_ids[-email_num]
        
        status, msg_data = mail.fetch(email_id, '(RFC822)')
        msg = email.message_from_bytes(msg_data[0][1])
        
        subject = decode_subject(msg['Subject'])
        sender = get_sender(msg)
        date = get_date(msg)
        
        print(f"\n{'='*70}")
        print(f"📧 FROM: {sender}")
        print(f"📌 SUBJECT: {subject}")
        print(f"📅 DATE: {date}")
        print(f"{'='*70}\n")
        
        # Get body
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                if content_type == "text/plain":
                    try:
                        body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                        break
                    except:
                        pass
        else:
            try:
                body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
            except:
                body = "Could not decode message body"
        
        print(body[:2000] if len(body) > 2000 else body)
        
        if len(body) > 2000:
            print(f"\n... [truncated, total length: {len(body)} chars]")
        
        # Mark as read
        mail.store(email_id, '+FLAGS', '\\Seen')
        print(f"\n✅ Marked as read")
        
        mail.close()
        mail.logout()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def count_unread(account='hello'):
    """Count unread emails"""
    try:
        mail, address = connect_imap(account)
        mail.select('INBOX')
        
        status, messages = mail.search(None, 'UNSEEN')
        count = len(messages[0].split())
        
        print(f"📬 {address}: {count} unread emails")
        
        mail.close()
        mail.logout()
        
        return count
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Email Inbox Manager')
    parser.add_argument('action', choices=['list', 'read', 'count', 'unread'], 
                       help='Action to perform')
    parser.add_argument('--account', '-a', default='hello', 
                       choices=['hello', 'ops', 'support'],
                       help='Email account to use')
    parser.add_argument('--limit', '-l', type=int, default=10,
                       help='Number of emails to list (default: 10)')
    parser.add_argument('--num', '-n', type=int, default=1,
                       help='Email number to read (1 = newest)')
    parser.add_argument('--unread-only', '-u', action='store_true',
                       help='Show only unread emails')
    
    args = parser.parse_args()
    
    if args.action == 'list':
        list_emails(args.account, limit=args.limit, unread_only=args.unread_only)
    elif args.action == 'read':
        read_email(args.account, email_num=args.num)
    elif args.action == 'count':
        count_unread(args.account)
    elif args.action == 'unread':
        list_emails(args.account, unread_only=True, limit=args.limit)
