#!/bin/bash
# Simple Hybrid AI Setup for Client Bots
# Fast: Kimi Direct API | Complex: OpenClaw Sub-agents

echo "=== Setting Up Hybrid AI for Client Bots ==="

GATEWAY_DIR="/home/darwin/.openclaw/workspace/ai-gateway"
mkdir -p "$GATEWAY_DIR"

# Create hybrid processor
cat > "$GATEWAY_DIR/hybrid_processor.py" <> 'PYEOF'
#!/usr/bin/env python3
"""Hybrid AI - Fast responses via Kimi API, complex via sub-agents"""

import os
import json
import subprocess
import asyncio
import aiohttp
from typing import Dict, Tuple

class HybridAI:
    def __init__(self):
        self.kimi_api_key = os.environ.get('KIMI_API_KEY', '')
        
    def analyze_message(self, message: str) -> str:
        """Determine if message needs fast or complex processing"""
        msg_lower = message.lower()
        
        # Simple indicators
        simple_keywords = ['hello', 'hi', 'hours', 'open', 'price', 'cost', 'contact', 'menu', 'location']
        complex_indicators = ['analyze', 'research', 'strategy', 'why', 'how does', 'explain', 'compare', 'detailed']
        
        # Check for complex patterns
        if len(message) > 80:
            return 'complex'
        
        if any(word in msg_lower for word in complex_indicators):
            return 'complex'
        
        if message.count('?') > 1:
            return 'complex'
        
        # Default to fast for simple queries
        if any(word in msg_lower for word in simple_keywords):
            return 'fast'
        
        return 'fast'  # Default
    
    async def process_fast(self, message: str, context: Dict) -> str:
        """Quick response via Kimi API"""
        system = f"You are a helpful assistant for {context.get('business_name', 'this business')}. Be concise (2-3 sentences)."
        
        # If no API key, use context-based response
        if not self.kimi_api_key:
            return self._context_response(message, context)
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'https://api.kimi.com/coding/v1/chat/completions',
                    headers={'Authorization': f'Bearer {self.kimi_api_key}', 'Content-Type': 'application/json'},
                    json={
                        'model': 'k2p5',
                        'messages': [
                            {'role': 'system', 'content': system},
                            {'role': 'user', 'content': message}
                        ],
                        'max_tokens': 200,
                        'temperature': 0.7
                    },
                    timeout=aiohttp.ClientTimeout(total=8)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data['choices'][0]['message']['content']
        except Exception as e:
            print(f"Fast mode error: {e}")
        
        return self._context_response(message, context)
    
    def process_complex(self, message: str, context: Dict) -> str:
        """Deep processing via OpenClaw sub-agent"""
        task = f"""Business: {context.get('business_name', 'this business')}
Customer: "{message}"

Provide a thoughtful, detailed response (3-5 sentences)."""
        
        try:
            result = subprocess.run(
                ['openclaw', 'run', '--model=kimi-coding/k2p5', task],
                capture_output=True,
                text=True,
                timeout=45,
                cwd='/home/darwin/.openclaw/workspace'
            )
            
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
        except Exception as e:
            print(f"Complex mode error: {e}")
        
        # Fallback to fast mode
        return asyncio.run(self.process_fast(message, context))
    
    def _context_response(self, message: str, context: Dict) -> str:
        """Generate response based on business context"""
        msg_lower = message.lower()
        business = context.get('business_name', 'We')
        
        if any(word in msg_lower for word in ['hour', 'open', 'time']):
            return f"{business} is typically open 9 AM to 6 PM, Monday through Saturday. Would you like to confirm today's hours?"
        
        if any(word in msg_lower for word in ['contact', 'phone', 'call']):
            return f"You can reach {business} through this chat, or I can provide direct contact information if needed."
        
        if any(word in msg_lower for word in ['price', 'cost', 'how much']):
            return f"I'd be happy to provide pricing information for {business}. What specific product or service are you interested in?"
        
        if any(word in msg_lower for word in ['menu', 'food', 'service']):
            return f"{business} offers a variety of options. What type of {context.get('business_type', 'service')} are you looking for?"
        
        return f"Thank you for reaching out to {business}! I'm here to help. What can I assist you with today?"
    
    async def process(self, message: str, context: Dict) -> Tuple[str, str]:
        """Route and process message"""
        mode = self.analyze_message(message)
        
        if mode == 'complex':
            response = self.process_complex(message, context)
        else:
            response = await self.process_fast(message, context)
        
        return response, mode

# For testing
if __name__ == '__main__':
    import asyncio
    
    ai = HybridAI()
    context = {'business_name': 'Test Business', 'business_type': 'retail'}
    
    tests = [
        'Hello!',
        'What are your hours?',
        'How much does it cost?',
        'Analyze my business strategy for growth'
    ]
    
    async def run_tests():
        for msg in tests:
            mode = ai.analyze_message(msg)
            print(f"'{msg}' -> {mode}")
            
            if mode == 'fast':
                reply, _ = await ai.process(msg, context)
                print(f"  Reply: {reply[:60]}...")
            print()
    
    asyncio.run(run_tests())
PYEOF

echo "✅ Hybrid processor created"

# Create integration for VPS gateway
cat > "$GATEWAY_DIR/integrate-hybrid.sh" <> 'EOF'
#!/bin/bash
# Integrate hybrid AI with VPS gateway

echo "Integrating Hybrid AI with VPS Gateway..."

# Check if we can SSH to VPS
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@157.245.152.57 'echo OK' 2>/dev/null | grep -q OK; then
    echo "✅ VPS accessible"
    
    # Copy hybrid processor to VPS
    scp -o StrictHostKeyChecking=no "$GATEWAY_DIR/hybrid_processor.py" root@157.245.152.57:/opt/openclaw/gateway/
    
    echo "✅ Files copied to VPS"
    echo ""
    echo "Next: Update VPS gateway to use hybrid processor"
    echo "SSH to VPS and modify ai_gateway.py to import and use HybridAI"
else
    echo "❌ Cannot reach VPS via SSH"
    echo "Manual deploy required:"
    echo "  1. Copy hybrid_processor.py to VPS"
    echo "  2. Update gateway code to use it"
fi
EOF

chmod +x "$GATEWAY_DIR/integrate-hybrid.sh"

echo ""
echo "=== Hybrid AI System Ready ==="
echo ""
echo "Location: $GATEWAY_DIR/"
echo ""
echo "Files created:"
ls -la "$GATEWAY_DIR/hybrid*" 2>/dev/null || echo "  hybrid_processor.py"
echo "  integrate-hybrid.sh"
echo ""
echo "To test locally:"
echo "  cd $GATEWAY_DIR"
echo "  python3 hybrid_processor.py"
echo ""
echo "To deploy to VPS:"
echo "  ./integrate-hybrid.sh"
echo ""
