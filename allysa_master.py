#!/usr/bin/env python3
"""
Allysa Master Response System
Reads queue from bots and generates AI responses
"""

import json
import time
import os
from pathlib import Path

QUEUE_FILE = Path("/tmp/agent_message_queue.json")
RESPONSE_FILE = Path("/tmp/agent_responses.json")
AGENTS_DIR = Path("/home/darwin/.openclaw/agents")

def load_queue():
    """Load pending messages"""
    if QUEUE_FILE.exists():
        with open(QUEUE_FILE) as f:
            return json.load(f)
    return []

def save_queue(queue):
    """Save updated queue"""
    with open(QUEUE_FILE, 'w') as f:
        json.dump(queue, f, indent=2)

def load_responses():
    """Load current responses"""
    if RESPONSE_FILE.exists():
        with open(RESPONSE_FILE) as f:
            return json.load(f)
    return {}

def save_responses(responses):
    """Save responses"""
    with open(RESPONSE_FILE, 'w') as f:
        json.dump(responses, f, indent=2)

def get_agent_info(agent_id):
    """Get agent business info"""
    agent_dir = AGENTS_DIR / agent_id
    info = {
        'name': 'This Business',
        'type': 'general',
        'hours': '9 AM - 6 PM',
        'contact': 'Via chat'
    }
    
    config_file = agent_dir / "config.json"
    if config_file.exists():
        with open(config_file) as f:
            config = json.load(f)
            info['name'] = config.get('client_name', info['name'])
            info['type'] = config.get('business_type', info['type'])
    
    memory_file = agent_dir / "MEMORY.md"
    if memory_file.exists():
        content = memory_file.read_text()
        for line in content.split('\n'):
            if ':' in line and not line.startswith('#'):
                key, val = line.split(':', 1)
                key = key.strip().lower().replace(' ', '_')
                info[key] = val.strip()
    
    return info

def display_pending():
    """Display pending messages for Allysa"""
    queue = load_queue()
    pending = [m for m in queue if m.get('status') == 'pending']
    
    if not pending:
        print("No pending messages.")
        return []
    
    print(f"\n=== {len(pending)} PENDING MESSAGES ===\n")
    
    for i, msg in enumerate(pending[-5:], 1):  # Show last 5
        agent_info = get_agent_info(msg['agent_id'])
        
        print(f"[{i}] Agent: {agent_info['name']}")
        print(f"    Chat ID: {msg['chat_id']}")
        print(f"    Message: \"{msg['message']}\"")
        print(f"    Business: {agent_info['name']} ({agent_info['type']})")
        print(f"    Hours: {agent_info['hours']}")
        print()
    
    return pending

def submit_response(chat_id, response_text):
    """Submit response for a chat"""
    responses = load_responses()
    responses[chat_id] = response_text
    save_responses(responses)
    
    # Mark as processed in queue
    queue = load_queue()
    for msg in queue:
        if msg['chat_id'] == chat_id and msg.get('status') == 'pending':
            msg['status'] = 'responded'
            msg['response'] = response_text[:50]
    save_queue(queue)
    
    print(f"✅ Response submitted for chat {chat_id}")

def auto_mode():
    """Auto-generate responses (if you want to script it)"""
    print("Auto mode - checking for messages every 5 seconds...")
    print("Press Ctrl+C to stop\n")
    
    try:
        while True:
            pending = display_pending()
            
            if pending:
                print(f"⏳ {len(pending)} messages waiting...")
                print("Tell me: 'Respond to [number] with: [your response]'")
            
            time.sleep(5)
            
    except KeyboardInterrupt:
        print("\nStopped.")

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'auto':
        auto_mode()
    else:
        pending = display_pending()
        
        if pending:
            print("To respond, use:")
            print("  python3 allysa_master.py respond [chat_id] 'Your response here'")
            print()
            print("Or tell me (Allysa) directly:")
            print('  "Respond to chat [ID] as [Agent Name]: [message]"')
