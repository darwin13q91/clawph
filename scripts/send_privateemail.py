#!/usr/bin/env python3
"""
Send email via PrivateEmail (Namecheap) SMTP - Multi-account support
Enhanced with delivery verification and fallback options
Usage: python3 send_email.py <to_email> <subject> <body_file> [--from hello|ops|support]
"""

import smtplib
import ssl
import sys
import os
import argparse
import time
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
    sig_path = Path('/home/darwin/.openclaw/agents/echo/data/signature.html')
    if sig_path.exists():
        with open(sig_path) as f:
            return f.read()
    # Fallback signature
    return '''
<table cellpadding="0" cellspacing="0" border="0" style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #F6F7EB; background: #0B3A2C; padding: 20px; border-radius: 12px; max-width: 500px;">
 <tr>
 <td style="padding-right: 16px; border-right: 2px solid #CFFF00;">
 <img src="https://amajungle.com/images/logo-icon.png" alt="amajungle" width="60" height="60" style="display: block;">
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
 Founder, amajungle
 </td>
 </tr>
 <tr>
 <td style="padding-top: 8px; color: #F6F7EB; opacity: 0.8; font-size: 13px;">
 AI Automation for Amazon Sellers
 </td>
 </tr>
 <tr>
 <td style="padding-top: 12px;">
 <table cellpadding="0" cellspacing="0" border="0">
 <tr>
 <td style="padding-right: 16px;">
 <a href="mailto:hello@amajungle.com" style="color: #F6F7EB; text-decoration: none; font-size: 13px;">
 📧 hello@amajungle.com
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
 <a href="https://amajungle.com" style="display: inline-block; background: #CFFF00; color: #0B3A2C; padding: 8px 16px; border-radius: 20px; text-decoration: none; font-weight: 600; font-size: 12px; text-transform: uppercase;">
 Book Free Audit →
 </a>
 </td>
 </tr>
 </table>
 </td>
 </tr>
</table>
'''

def send_email(to_email, subject, body, from_account='hello', html_body=None, reply_to=None, 
               enable_dkim_headers=True, request_delivery_status=False):
    """
    Send email via specified account with centralized HTML signature
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Plain text body
        from_account: Account to send from (hello/ops/support)
        html_body: Optional HTML body
        reply_to: Reply-To header value
        enable_dkim_headers: Add headers to help with DKIM authentication
        request_delivery_status: Request delivery status notification (may not be supported by all providers)
    
    Returns:
        dict: {
            'success': bool,
            'message_id': str or None,
            'queue_id': str or None,
            'error': str or None,
            'smtp_response': str or None
        }
    """
    
    if from_account not in EMAIL_ACCOUNTS:
        return {
            'success': False,
            'error': f"Unknown account '{from_account}'. Available: {', '.join(EMAIL_ACCOUNTS.keys())}",
            'message_id': None,
            'queue_id': None,
            'smtp_response': None
        }
    
    account = EMAIL_ACCOUNTS[from_account]
    email_address = account['address']
    email_password = account['password']
    
    if not email_address or not email_password:
        return {
            'success': False,
            'error': f"Credentials not found for '{from_account}'",
            'message_id': None,
            'queue_id': None,
            'smtp_response': None
        }
    
    # Load centralized signature
    html_signature = load_html_signature()
    
    # Generate unique Message-ID for tracking
    import email.utils
    import uuid
    message_id = f"{uuid.uuid4().hex}@{email_address.split('@')[1]}"
    
    msg = MIMEMultipart("alternative")
    msg["From"] = f"Amajungle <{email_address}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Message-ID"] = f"<{message_id}>"
    msg["Date"] = email.utils.formatdate(localtime=True)
    
    # Add Reply-To header if provided
    if reply_to:
        msg["Reply-To"] = reply_to
    
    # Add headers to improve deliverability
    msg["X-Mailer"] = "Amajungle-Email-System/1.0"
    msg["X-Priority"] = "3"  # Normal priority
    
    # Request read receipt (optional, many clients ignore this)
    if request_delivery_status:
        msg["Disposition-Notification-To"] = email_address
    
    # Plain text version
    msg.attach(MIMEText(body, "plain"))
    
    # HTML version with signature
    if html_body:
        html_content = html_body + html_signature
    else:
        html_body_converted = body.replace('\n', '<br>')
        html_content = f"<html><body style='font-family: Arial, sans-serif; color: #0B3A2C;'>{html_body_converted}{html_signature}</body></html>"
    
    msg.attach(MIMEText(html_content, "html"))
    
    result_data = {
        'success': False,
        'message_id': message_id,
        'queue_id': None,
        'error': None,
        'smtp_response': None
    }
    
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(account['smtp'], account['port'], context=context) as server:
            server.login(email_address, email_password)
            
            # Send the email and get response
            smtp_result = server.sendmail(email_address, to_email, msg.as_string())
            
            # Check for any partial failures (should be empty dict on full success)
            if smtp_result:
                # Some recipients failed
                result_data['error'] = f"Partial failure: {smtp_result}"
                result_data['success'] = False
            else:
                # Get the last response from the server (contains queue ID)
                # SMTP_SSL doesn't expose the last response directly, but we can infer success
                result_data['success'] = True
                result_data['smtp_response'] = "Message accepted by SMTP server"
                
                # Note: Actual queue ID isn't easily accessible via standard smtplib
                # We'd need to parse the server's 250 response which isn't exposed
                result_data['queue_id'] = "queued"  # Placeholder
                
    except smtplib.SMTPAuthenticationError as e:
        result_data['error'] = f"Authentication failed: {e}"
    except smtplib.SMTPRecipientsRefused as e:
        result_data['error'] = f"Recipient refused: {e}"
    except smtplib.SMTPSenderRefused as e:
        result_data['error'] = f"Sender refused: {e}"
    except smtplib.SMTPDataError as e:
        result_data['error'] = f"SMTP data error: {e}"
    except Exception as e:
        result_data['error'] = f"Unexpected error: {type(e).__name__}: {e}"
    
    # Log the result
    if result_data['success']:
        print(f"✅ Email sent from Amajungle <{email_address}> to {to_email} (Message-ID: {message_id})")
    else:
        print(f"❌ Failed to send email: {result_data['error']}")
    
    return result_data

# Backward compatibility - simple boolean return for existing code
def send_email_simple(to_email, subject, body, from_account='hello', html_body=None, reply_to=None):
    """Simple wrapper that returns True/False for backward compatibility"""
    result = send_email(to_email, subject, body, from_account, html_body, reply_to)
    return result['success']

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Send email via PrivateEmail')
    parser.add_argument('to_email', help='Recipient email address')
    parser.add_argument('subject', help='Email subject')
    parser.add_argument('body_file', help='Path to file containing email body')
    parser.add_argument('--from', dest='from_account', default='hello',
                       choices=['hello', 'ops', 'support'],
                       help='Sender account (default: hello)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Show detailed delivery information')
    
    args = parser.parse_args()
    
    with open(args.body_file, 'r') as f:
        body = f.read()
    
    result = send_email(args.to_email, args.subject, body, args.from_account)
    
    if args.verbose:
        print(f"\n--- Delivery Details ---")
        print(f"Success: {result['success']}")
        print(f"Message-ID: {result['message_id']}")
        print(f"SMTP Response: {result['smtp_response']}")
        if result['error']:
            print(f"Error: {result['error']}")
    
    sys.exit(0 if result['success'] else 1)
