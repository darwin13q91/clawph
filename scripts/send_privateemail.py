#!/usr/bin/env python3
"""
Send email via PrivateEmail (Namecheap) SMTP - Multi-account support
Usage: python3 send_email.py <to_email> <subject> <body_file> [--from hello|ops|support]
"""

import smtplib
import ssl
import sys
import os
import argparse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path

# Load credentials from .env file
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, val = line.strip().split('=', 1)
                    os.environ.setdefault(key, val)

load_env()

# Available email accounts
EMAIL_ACCOUNTS = {
    'hello': {
        'address': os.getenv('HELLO_EMAIL'),
        'password': os.getenv('HELLO_PASS'),
        'smtp': 'mail.privateemail.com',
        'port': 465
    },
    'ops': {
        'address': os.getenv('OPS_EMAIL'),
        'password': os.getenv('OPS_PASS'),
        'smtp': 'mail.privateemail.com',
        'port': 465
    },
    'support': {
        'address': os.getenv('SUPPORT_EMAIL'),
        'password': os.getenv('SUPPORT_PASS'),
        'smtp': 'mail.privateemail.com',
        'port': 465
    }
}

def load_html_signature():
    """Load centralized HTML signature"""
    sig_path = Path(__file__).resolve().parent / 'clawph_signature.html'
    if sig_path.exists():
        with open(sig_path) as f:
            return f.read()
    # Fallback signature (original with image)
    return '''
<table cellpadding="0" cellspacing="0" border="0" style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #F6F7EB; background: #0B3A2C; padding: 20px; border-radius: 12px; max-width: 500px;">
 <tr>
 <td style="padding-right: 16px; border-right: 2px solid #CFFF00;">
 <img src="https://clawph.com/images/logo-icon.png" alt="clawph" width="60" height="60" style="display: block;">
 </td>
 <td style="padding-left: 16px;">
 <table cellpadding="0" cellspacing="0" border="0">
 <tr>
 <td style="font-weight: 700; font-size: 18px; color: #F6F7EB;">
 Allysa Kate Estardo
 </td>
 </tr>
 <tr>
 <td style="color: #CFFF00; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
 Founder, ClawPH
 </td>
 </tr>
 <tr>
 <td style="padding-top: 8px; color: #F6F7EB; opacity: 0.8; font-size: 13px;">
 OpenClaw setup for Philippine businesses
 </td>
 </tr>
 <tr>
 <td style="padding-top: 12px;">
 <table cellpadding="0" cellspacing="0" border="0">
 <tr>
 <td style="padding-right: 16px;">
 <a href="mailto:hello@clawph.com" style="color: #F6F7EB; text-decoration: none; font-size: 13px;">
 📧 hello@clawph.com
 </a>
 </td>
 <td>
 <a href="tel:+639954505206" style="color: #F6F7EB; text-decoration: none; font-size: 13px;">
 📱 +63 0995 450 5206
 </a>
 </td>
 </tr>
 </table>
 </td>
 </tr>
 <tr>
 <td style="padding-top: 12px;">
 <a href="https://clawph.com" style="display: inline-block; background: #CFFF00; color: #0B3A2C; padding: 8px 16px; border-radius: 20px; text-decoration: none; font-weight: 600; font-size: 12px; text-transform: uppercase;">
 Visit ClawPH →
 </a>
 </td>
 </tr>
 </table>
 </td>
 </tr>
</table>
'''

def send_email(to_email, subject, body, from_account='hello', html_body=None, reply_to=None):
    """Send email via specified account with centralized HTML signature"""
    
    if from_account not in EMAIL_ACCOUNTS:
        print(f"❌ Error: Unknown account '{from_account}'")
        print(f"Available: {', '.join(EMAIL_ACCOUNTS.keys())}")
        return False
    
    account = EMAIL_ACCOUNTS[from_account]
    email_address = account['address']
    email_password = account['password']
    
    if not email_address or not email_password:
        print(f"❌ Error: Credentials not found for '{from_account}'")
        return False
    
    # Load centralized signature
    html_signature = load_html_signature()
    
    # Plain text signature removed - using HTML signature only
    
    msg = MIMEMultipart("alternative")
    msg["From"] = f"ClawPH <{email_address}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    
    # Add Reply-To header if provided (for client reply forwarding)
    if reply_to:
        msg["Reply-To"] = reply_to
    
    # Plain text version - no signature (HTML signature is the primary one)
    msg.attach(MIMEText(body, "plain"))
    
    # HTML version with signature (or use provided html_body)
    if html_body:
        html_content = html_body + html_signature
    else:
        # Convert plain text to simple HTML
        html_body_converted = body.replace('\n', '<br>')
        html_content = f"<html><body style='font-family: Arial, sans-serif; color: #0B3A2C;'>{html_body_converted}{html_signature}</body></html>"
    
    msg.attach(MIMEText(html_content, "html"))
    
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(account['smtp'], account['port'], context=context) as server:
        server.login(email_address, email_password)
        # CRITICAL: Use email_address ONLY for SMTP envelope (no display name)
        # The display name "ClawPH" is already in msg["From"] header
        # Using display name in envelope can cause Gmail/Outlook to show only the mailbox name instead of "ClawPH"
        server.sendmail(email_address, to_email, msg.as_string())
    
    print(f"✅ Email sent from ClawPH <{email_address}> to {to_email}")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Send email via PrivateEmail')
    parser.add_argument('to_email', help='Recipient email address')
    parser.add_argument('subject', help='Email subject')
    parser.add_argument('body_file', help='Path to file containing email body')
    parser.add_argument('--from', dest='from_account', default='hello',
                       choices=['hello', 'ops', 'support'],
                       help='Sender account (default: hello)')
    
    args = parser.parse_args()
    
    with open(args.body_file, 'r') as f:
        body = f.read()
    
    send_email(args.to_email, args.subject, body, args.from_account)
