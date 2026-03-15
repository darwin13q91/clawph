#!/usr/bin/env python3
"""
Calendly Webhook Handler
========================
Receives Calendly webhooks and:
1. Flags client as VIP in CRM
2. Cancels any pending followups
3. Sends notification to Allysa
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime

# Add paths
sys.path.insert(0, '/home/darwin/.openclaw/workspace')
sys.path.insert(0, '/home/darwin/.openclaw/agents/echo/scripts')
sys.path.insert(0, '/home/darwin/.openclaw/agents/piper/scripts')

# Import VIP system
try:
    from vip_client_system import add_vip_client, mark_calendly_booked
    VIP_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ VIP system not available: {e}")
    VIP_AVAILABLE = False

# Import CRM service
try:
    sys.path.insert(0, '/home/darwin/.openclaw/workspace/apps/dashboard/server')
    from crm_service_v2 import CRMService
    CRM_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ CRM service not available: {e}")
    CRM_AVAILABLE = False

LOG_FILE = Path('/home/darwin/.openclaw/agents/echo/data/calendly_webhooks.log')


def log_event(event_type, data):
    """Log webhook event"""
    entry = {
        'timestamp': datetime.now().isoformat(),
        'event_type': event_type,
        'data': data
    }
    with open(LOG_FILE, 'a') as f:
        f.write(json.dumps(entry) + '\n')


def send_telegram_notification(name, email, event_type):
    """Send Telegram notification about Calendly event"""
    try:
        import urllib.request
        import urllib.parse
        
        TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
        TELEGRAM_CHAT_ID = '6504570121'
        
        if not TELEGRAM_BOT_TOKEN:
            return
        
        if event_type == 'booking':
            emoji = '📅'
            message = f"""{emoji} <b>Calendly Booking Received!</b>

👤 Name: {name}
📧 Email: {email}
⭐ Status: VIP CLIENT

The client has been flagged as VIP in the CRM and will receive priority handling."""
        elif event_type == 'cancellation':
            emoji = '❌'
            message = f"""{emoji} <b>Calendly Booking Cancelled</b>

👤 Name: {name}
📧 Email: {email}

The client cancelled their appointment."""
        else:
            emoji = 'ℹ️'
            message = f"""{emoji} Calendly Update

👤 Name: {name}
📧 Email: {email}
Event: {event_type}"""
        
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = urllib.parse.urlencode({
            'chat_id': TELEGRAM_CHAT_ID,
            'text': message,
            'parse_mode': 'HTML'
        }).encode()
        
        req = urllib.request.Request(url, data=data, method='POST')
        with urllib.request.urlopen(req, timeout=10) as response:
            pass
            
    except Exception as e:
        print(f"⚠️ Telegram notification failed: {e}")


def handle_webhook(payload):
    """Process Calendly webhook payload"""
    try:
        event_type = payload.get('event')
        
        if event_type == 'invitee.created':
            # New booking
            invitee = payload.get('payload', {})
            email = invitee.get('email', '').lower().strip()
            name = invitee.get('name', '')
            
            print(f"📅 Calendly booking: {name} ({email})")
            
            # Mark in followup system
            if VIP_AVAILABLE:
                mark_calendly_booked(email, invitee)
                add_vip_client(email, name, 'calendly', invitee)
            
            # Update CRM
            if CRM_AVAILABLE:
                try:
                    crm = CRMService()
                    crm.markCalendlyBooked(email, invitee)
                    crm.close()
                except Exception as e:
                    print(f"⚠️ CRM update failed: {e}")
            
            # Send notification
            send_telegram_notification(name, email, 'booking')
            
            # Log event
            log_event('invitee.created', {
                'name': name,
                'email': email,
                'payload': invitee
            })
            
            return {'success': True, 'action': 'vip_added'}
        
        elif event_type == 'invitee.canceled':
            # Booking cancelled
            invitee = payload.get('payload', {})
            email = invitee.get('email', '').lower().strip()
            name = invitee.get('name', '')
            
            print(f"❌ Calendly cancellation: {name} ({email})")
            
            send_telegram_notification(name, email, 'cancellation')
            
            log_event('invitee.canceled', {
                'name': name,
                'email': email,
                'payload': invitee
            })
            
            return {'success': True, 'action': 'logged'}
        
        else:
            # Unknown event type - log it
            log_event(event_type, payload)
            return {'success': True, 'action': 'logged_unknown'}
            
    except Exception as e:
        print(f"❌ Error handling webhook: {e}")
        log_event('error', {'error': str(e), 'payload': payload})
        return {'success': False, 'error': str(e)}


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Calendly Webhook Handler')
    parser.add_argument('--test-booking', help='Test with email')
    parser.add_argument('--test-cancel', help='Test cancellation with email')
    parser.add_argument('--name', default='Test User', help='Test name')
    
    args = parser.parse_args()
    
    if args.test_booking:
        test_payload = {
            'event': 'invitee.created',
            'payload': {
                'email': args.test_booking,
                'name': args.name,
                'event_type': 'test'
            }
        }
        result = handle_webhook(test_payload)
        print(json.dumps(result, indent=2))
    
    elif args.test_cancel:
        test_payload = {
            'event': 'invitee.canceled',
            'payload': {
                'email': args.test_cancel,
                'name': args.name,
                'event_type': 'test'
            }
        }
        result = handle_webhook(test_payload)
        print(json.dumps(result, indent=2))
    
    else:
        # Read from stdin (for webhook receiver)
        try:
            payload = json.load(sys.stdin)
            result = handle_webhook(payload)
            print(json.dumps(result))
        except json.JSONDecodeError as e:
            print(json.dumps({'success': False, 'error': f'Invalid JSON: {e}'}))
        except Exception as e:
            print(json.dumps({'success': False, 'error': str(e)}))
