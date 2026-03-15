#!/usr/bin/env python3
"""
Master-Route AI System
Client agents route messages through Master (You/Allysa)
Uses your working OpenClaw session instead of API calls
"""

import json
import os
import sys
import subprocess
from pathlib import Path

AGENTS_DIR = Path("/home/darwin/.openclaw/agents")
MASTER_NAME = "Allysa"

def get_agent_context(agent_id):
    """Load agent's business context"""
    agent_dir = AGENTS_DIR / agent_id
    
    context = {
        'business_name': 'Unknown Business',
        'business_type': 'general',
        'hours': '9 AM - 6 PM',
        'contact': 'Contact via chat',
        'specialties': []
    }
    
    # Load from MEMORY.md
    memory_file = agent_dir / "MEMORY.md"
    if memory_file.exists():
        content = memory_file.read_text()
        # Parse simple key: value format
        for line in content.split('\n'):
            if ':' in line and not line.startswith('#'):
                key, val = line.split(':', 1)
                context[key.strip().lower().replace(' ', '_')] = val.strip()
    
    # Load from config
    config_file = agent_dir / "config.json"
    if config_file.exists():
        with open(config_file) as f:
            config = json.load(f)
            context['business_name'] = config.get('client_name', context['business_name'])
            context['business_type'] = config.get('business_type', context['business_type'])
    
    # Load SOUL for personality
    soul_file = agent_dir / "SOUL.md"
    if soul_file.exists():
        context['personality'] = soul_file.read_text()[:500]  # First 500 chars
    
    return context

def route_through_master(agent_id, customer_message, chat_id):
    """Route customer message through Master (Allysa) to generate response"""
    
    # Get agent context
    context = get_agent_context(agent_id)
    
    # Build master prompt
    master_prompt = f"""You are {MASTER_NAME}, the Master Operator controlling multiple AI agents.

CURRENT AGENT CONTEXT:
- Business Name: {context['business_name']}
- Business Type: {context['business_type']}
- Hours: {context['hours']}
- Contact: {context['contact']}
- Personality: Professional, helpful, friendly

YOUR TASK:
Respond to this customer message AS IF you are the AI assistant for {context['business_name']}.

CUSTOMER MESSAGE:
"{customer_message}"

RESPOND AS THE BUSINESS ASSISTANT:
- Be friendly and professional
- Use the business context above
- Keep response to 2-3 sentences
- Represent {context['business_name']} accurately
- If you don't know something, be honest

RESPOND NOW:"""
    
    # Use OpenClaw run (this works because it uses your session)
    try:
        result = subprocess.run(
            ['openclaw', 'run', '--model=kimi-coding/k2p5', master_prompt],
            capture_output=True,
            text=True,
            timeout=30,
            cwd='/home/darwin/.openclaw/workspace'
        )
        
        if result.returncode == 0 and result.stdout.strip():
            # Update agent stats
            update_agent_stats(agent_id)
            return result.stdout.strip()
        else:
            # Fallback
            return f"Thank you for contacting {context['business_name']}! We'll get back to you shortly."
            
    except Exception as e:
        print(f"Master routing error: {e}")
        return f"Thanks for your message! {context['business_name']} will respond soon."

def update_agent_stats(agent_id):
    """Update agent message count"""
    config_file = AGENTS_DIR / agent_id / "config.json"
    if config_file.exists():
        with open(config_file) as f:
            config = json.load(f)
        config['message_count'] = config.get('message_count', 0) + 1
        config['last_active'] = subprocess.run(['date', '-Iseconds'], capture_output=True, text=True).stdout.strip()
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)

# For direct testing
if __name__ == '__main__':
    if len(sys.argv) > 2:
        agent_id = sys.argv[1]
        message = sys.argv[2]
        response = route_through_master(agent_id, message, "test")
        print(f"Agent: {agent_id}")
        print(f"Customer: {message}")
        print(f"Response: {response}")
    else:
        # Test with demo agent
        test_response = route_through_master(
            "Hello, what are your hours?",
            "test123"
        )
        print(f"Test Response: {test_response}")
