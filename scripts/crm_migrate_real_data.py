#!/usr/bin/env python3
"""
CRM Real Data Migration Script - Enhanced Version
- Clears all dummy data from CRM
- Extracts real contacts from Echo email logs
- Creates contacts and deals from audit requests (all ASINs)
- Updates stats with real data
"""

import sqlite3
import json
import re
import os
from datetime import datetime, timedelta
from collections import defaultdict

# Paths
CRM_DB = "/home/darwin/.openclaw/workspace/apps/dashboard/data/crm.db"
ECHO_LOG = "/home/darwin/.openclaw/agents/echo/data/echo_monitor.log"
RIVER_RESULTS = "/home/darwin/.openclaw/agents/river/data/results"

def extract_all_audit_requests():
    """Extract all audit requests from Echo log with better pattern matching"""
    audit_requests = []
    
    if not os.path.exists(ECHO_LOG):
        return audit_requests
    
    with open(ECHO_LOG, 'r') as f:
        lines = f.readlines()
    
    current_email = None
    current_name = None
    
    for line in lines:
        # Check for form submission with email
        form_match = re.search(r'Extracted from form:\s+([^<]+)?\s*<([^>]+)>', line)
        if form_match:
            name_part = form_match.group(1) or ""
            email = form_match.group(2).lower().strip()
            name = name_part.strip()
            
            # Skip system emails
            if any(x in email for x in ['workspace-noreply', 'mailer-daemon', 'teamcalendly', 'ops@', 'support@', 'hello@', 'admin@leadership']):
                current_email = None
                continue
            
            current_email = email
            current_name = name if name and not name.startswith('Audit Request') else None
            
            timestamp_match = re.search(r'\[([^\]]+)\]', line)
            timestamp = timestamp_match.group(1) if timestamp_match else datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            audit_requests.append({
                'type': 'contact',
                'timestamp': timestamp,
                'email': email,
                'name': current_name,
                'url': None,
                'asin': None
            })
        
        # Check for audit request
        audit_match = re.search(r'🎯 AUDIT REQUEST DETECTED:\s+(https?://[^\s]+)', line)
        if audit_match:
            url = audit_match.group(1)
            asin = extract_asin_from_url(url)
            
            timestamp_match = re.search(r'\[([^\]]+)\]', line)
            timestamp = timestamp_match.group(1) if timestamp_match else datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            audit_requests.append({
                'type': 'audit',
                'timestamp': timestamp,
                'email': current_email,  # Associate with last seen email
                'name': current_name,
                'url': url,
                'asin': asin
            })
    
    return audit_requests

def extract_asin_from_url(url):
    """Extract ASIN from Amazon URL"""
    patterns = [
        r'/dp/([A-Z0-9]{10})',
        r'lp_asin=([A-Z0-9]{10})',
        r'lp_context_asin=([A-Z0-9]{10})',
        r'asin=([A-Z0-9]{10})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None

def get_price_from_river_results(asin):
    """Try to find price from River audit results"""
    if not asin:
        return None
    
    try:
        files = os.listdir(RIVER_RESULTS)
        for filename in sorted(files, reverse=True):  # Check newest first
            if asin in filename:
                filepath = os.path.join(RIVER_RESULTS, filename)
                try:
                    with open(filepath, 'r') as f:
                        data = json.load(f)
                        price = data.get('price')
                        if price:
                            try:
                                return float(price)
                            except:
                                pass
                except:
                    continue
    except Exception as e:
        pass
    
    return None

def organize_contacts_and_audits(audit_requests):
    """Organize audit requests by contact email"""
    contacts = {}
    
    # First pass: collect all contacts
    for req in audit_requests:
        if req['type'] == 'contact':
            email = req['email']
            if email not in contacts:
                contacts[email] = {
                    'name': req['name'],
                    'email': email,
                    'first_contact': req['timestamp'],
                    'audits': []
                }
            else:
                # Keep earliest contact time
                if req['timestamp'] < contacts[email]['first_contact']:
                    contacts[email]['first_contact'] = req['timestamp']
    
    # Second pass: associate audits with contacts
    for req in audit_requests:
        if req['type'] == 'audit':
            email = req['email']
            if email and email in contacts:
                contacts[email]['audits'].append({
                    'timestamp': req['timestamp'],
                    'url': req['url'],
                    'asin': req['asin']
                })
            elif email:
                # Create contact entry if not exists (shouldn't happen often)
                contacts[email] = {
                    'name': None,
                    'email': email,
                    'first_contact': req['timestamp'],
                    'audits': [{
                        'timestamp': req['timestamp'],
                        'url': req['url'],
                        'asin': req['asin']
                    }]
                }
    
    return contacts

def clear_crm_data(conn):
    """Clear all existing contacts, deals, and interactions"""
    cursor = conn.cursor()
    print("🗑️ Clearing existing CRM data...")
    
    cursor.execute("PRAGMA foreign_keys = OFF")
    cursor.execute("DELETE FROM interactions")
    cursor.execute("DELETE FROM deals")
    cursor.execute("DELETE FROM contacts")
    cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('contacts', 'deals', 'interactions')")
    conn.commit()
    cursor.execute("PRAGMA foreign_keys = ON")
    
    print("✅ CRM data cleared")

def create_contacts_and_deals(conn, contacts):
    """Create contacts and deals from organized data"""
    cursor = conn.cursor()
    
    total_pipeline_value = 0
    contacts_created = 0
    deals_created = 0
    
    default_names = {
        'darwin13q91@gmail.com': 'Darwin Estardo',
        'darwin13q91@outlook.com': 'Darwin Estardo (Outlook)',
        'allysa02kate@gmail.com': 'Allysa Kate',
    }
    
    for email, data in contacts.items():
        # Determine name
        name = data['name']
        if not name:
            name = default_names.get(email, email.split('@')[0].title())
        if name.startswith('Audit Request'):
            name = default_names.get(email, email.split('@')[0].title())
        
        first_contact = datetime.strptime(data['first_contact'], '%Y-%m-%d %H:%M:%S')
        audit_count = len(data['audits'])
        
        # Create contact
        cursor.execute('''
            INSERT INTO contacts (name, email, company, source, status, tags, 
                                first_contact_date, last_interaction_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            name,
            email,
            '',
            'echo_form',
            'lead',
            'from_email',
            first_contact.isoformat(),
            first_contact.isoformat(),
            f"Contact from website form. Total audit requests: {audit_count}"
        ))
        
        contact_id = cursor.lastrowid
        contacts_created += 1
        
        # Create initial contact interaction
        cursor.execute('''
            INSERT INTO interactions (contact_id, type, source, subject, content, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            contact_id,
            'email_received',
            'echo',
            'Contact Form Submission',
            f"Email: {email}\nName: {name}",
            first_contact.isoformat()
        ))
        
        # Create a deal for each unique ASIN (limit to avoid spam)
        unique_asins = list({a['asin']: a for a in data['audits'] if a['asin']}.values())
        
        for audit in unique_asins[:10]:  # Max 10 deals per contact
            asin = audit['asin']
            price = get_price_from_river_results(asin)
            
            if price and price > 0:
                deal_value = min(price * 0.15, 5000)  # 15% of price, capped at $5k
            else:
                deal_value = 997  # Default AI Automation package
            
            expected_close = first_contact + timedelta(days=30)
            
            cursor.execute('''
                INSERT INTO deals (contact_id, title, stage, value, currency, 
                                 expected_close_date, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                contact_id,
                f"Audit Request - ASIN {asin}",
                'new_lead',
                deal_value,
                'USD',
                expected_close.strftime('%Y-%m-%d'),
                f"ASIN: {asin}\nSource: Echo form submission\nResearched Price: ${price if price else 'N/A'}",
                first_contact.isoformat()
            ))
            
            deals_created += 1
            total_pipeline_value += deal_value
            
            # Create audit interaction
            cursor.execute('''
                INSERT INTO interactions (contact_id, type, source, subject, content, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                contact_id,
                'audit_request',
                'river',
                f'Audit Request - {asin}',
                f"ASIN: {asin}\nURL: {audit['url'][:100]}...",
                first_contact.isoformat()
            ))
        
        # If no specific ASIN deals, create one generic deal
        if not unique_asins:
            cursor.execute('''
                INSERT INTO deals (contact_id, title, stage, value, currency, 
                                 expected_close_date, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                contact_id,
                "AI Automation Consultation",
                'new_lead',
                997,
                'USD',
                (first_contact + timedelta(days=30)).strftime('%Y-%m-%d'),
                "General inquiry from website form",
                first_contact.isoformat()
            ))
            deals_created += 1
            total_pipeline_value += 997
    
    conn.commit()
    return contacts_created, deals_created, total_pipeline_value

def main():
    print("=" * 60)
    print("CRM REAL DATA MIGRATION - ENHANCED")
    print("=" * 60)
    
    # Extract all audit requests
    print("\n📧 Extracting all audit requests from Echo logs...")
    audit_requests = extract_all_audit_requests()
    
    # Organize by contact
    contacts = organize_contacts_and_audits(audit_requests)
    
    audit_count = sum(len(c['audits']) for c in contacts.values())
    print(f"Found {len(contacts)} unique contacts with {audit_count} total audit requests")
    
    # Connect to CRM
    print(f"\n💾 Connecting to CRM database...")
    conn = sqlite3.connect(CRM_DB)
    
    try:
        # Clear and rebuild
        clear_crm_data(conn)
        
        print("\n📝 Creating real contacts and deals...")
        contacts_created, deals_created, pipeline_value = create_contacts_and_deals(conn, contacts)
        
        # Final stats
        print("\n" + "=" * 60)
        print("✅ MIGRATION COMPLETE")
        print("=" * 60)
        print(f"\n📊 FINAL STATISTICS:")
        print(f"   Total contacts: {contacts_created}")
        print(f"   Total deals: {deals_created}")
        print(f"   Pipeline value: ${pipeline_value:,.2f}")
        
        print(f"\n📋 CONTACTS IMPORTED:")
        for email, data in sorted(contacts.items()):
            name = data['name'] or email.split('@')[0].title()
            unique_asins = len(set(a['asin'] for a in data['audits'] if a['asin']))
            print(f"   • {name}")
            print(f"     Email: {email}")
            print(f"     Audit requests: {len(data['audits'])} (unique ASINs: {unique_asins})")
            print()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    main()
