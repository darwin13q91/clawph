#!/usr/bin/env python3
"""
Email Campaign Sender
Usage: python3 send_campaign.py --csv contacts.csv --template initial_outreach --from hello --limit 10 [--dry-run]
"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add workspace to path
sys.path.insert(0, '/home/darwin/.openclaw/workspace/scripts')
from send_privateemail import send_email, EMAIL_ACCOUNTS

def load_template(template_name):
    """Load email template - both text and HTML versions"""
    # Load plain text version
    text_path = Path(__file__).parent.parent / 'templates' / f'{template_name}.txt'
    html_path = Path(__file__).parent.parent / 'templates' / f'{template_name}.html'
    
    if not text_path.exists():
        print(f"❌ Template not found: {text_path}")
        sys.exit(1)
    
    templates = {
        'text': text_path.read_text(),
        'html': None
    }
    
    # Load HTML version if available
    if html_path.exists():
        templates['html'] = html_path.read_text()
    else:
        print(f"⚠️ HTML template not found: {html_path}")
    
    return templates

def personalize_template(template, contact):
    """Replace template variables with contact data"""
    if isinstance(template, dict):
        # Handle both text and HTML templates
        result = {}
        for fmt, tmpl in template.items():
            if tmpl:
                result[fmt] = tmpl
                for key, value in contact.items():
                    placeholder = f'{{{{{key}}}}}'
                    result[fmt] = result[fmt].replace(placeholder, str(value))
        return result
    else:
        # Single template (backward compatibility)
        result = template
        for key, value in contact.items():
            placeholder = f'{{{{{key}}}}}'
            result = result.replace(placeholder, str(value))
        return result

def load_csv(csv_path):
    """Load contacts from CSV"""
    contacts = []
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            contacts.append(row)
    return contacts

def log_result(campaign_id, contact, status, error=None):
    """Log campaign result"""
    result_dir = Path(__file__).parent.parent / 'results'
    result_dir.mkdir(exist_ok=True)
    
    log_file = result_dir / f'{campaign_id}.jsonl'
    
    entry = {
        'timestamp': datetime.now().isoformat(),
        'email': contact.get('email'),
        'name': contact.get('name'),
        'company': contact.get('company'),
        'status': status,
        'error': error
    }
    
    with open(log_file, 'a') as f:
        f.write(json.dumps(entry) + '\n')

def main():
    parser = argparse.ArgumentParser(description='Send email campaign')
    parser.add_argument('--csv', required=True, help='Path to contacts CSV')
    parser.add_argument('--template', required=True, help='Template name')
    parser.add_argument('--from', dest='from_account', default='hello', 
                       choices=['hello', 'ops', 'support'],
                       help='Sender account')
    parser.add_argument('--limit', type=int, default=10, help='Max emails to send')
    parser.add_argument('--dry-run', action='store_true', help='Preview only')
    parser.add_argument('--subject', default='Quick question about your Amazon store', 
                       help='Email subject')
    
    args = parser.parse_args()
    
    # Load data
    template = load_template(args.template)
    contacts = load_csv(args.csv)
    
    # Generate campaign ID
    campaign_id = datetime.now().strftime('campaign_%Y_%m_%d_%H%M')
    
    print(f"📧 Campaign: {campaign_id}")
    print(f"📊 Contacts: {len(contacts)} total, sending max {args.limit}")
    print(f"📝 Template: {args.template}")
    print(f"📤 From: {EMAIL_ACCOUNTS[args.from_account]['address']}")
    print(f"🧪 Dry run: {args.dry_run}")
    print("=" * 50)
    
    sent = 0
    failed = 0
    
    for i, contact in enumerate(contacts[:args.limit], 1):
        email = contact.get('email', '').strip()
        name = contact.get('name', '').strip()
        
        if not email:
            print(f"{i}. ⚠️ Skipping: no email for {name}")
            continue
        
        # Personalize email
        bodies = personalize_template(template, contact)
        subject = args.subject.replace('{{company}}', contact.get('company', 'your store'))
        
        if args.dry_run:
            print(f"{i}. [DRY RUN] Would send to: {email}")
            print(f"   Subject: {subject}")
            print(f"   Text preview: {bodies['text'][:100]}...")
            if bodies.get('html'):
                print(f"   HTML template: ✓ loaded")
            print()
            continue
        
        # Create temp body file
        temp_file = f'/tmp/campaign_email_{i}.txt'
        with open(temp_file, 'w') as f:
            f.write(bodies['text'])
        
        try:
            success = send_email(email, subject, bodies['text'], args.from_account, html_body=bodies.get('html'))
            if success:
                print(f"{i}. ✅ Sent to: {email}")
                log_result(campaign_id, contact, 'sent')
                sent += 1
            else:
                print(f"{i}. ❌ Failed: {email}")
                log_result(campaign_id, contact, 'failed', 'Send returned False')
                failed += 1
        except Exception as e:
            print(f"{i}. ❌ Error: {email} - {str(e)}")
            log_result(campaign_id, contact, 'error', str(e))
            failed += 1
        finally:
            if os.path.exists(temp_file):
                os.remove(temp_file)
    
    print("=" * 50)
    print(f"📊 Results: {sent} sent, {failed} failed")
    print(f"📁 Logged to: results/{campaign_id}.jsonl")

if __name__ == '__main__':
    main()
