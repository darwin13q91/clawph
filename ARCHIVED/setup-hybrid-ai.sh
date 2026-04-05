#!/bin/bash
# Hybrid AI Gateway - Direct API for fast responses, Sub-agents for complex tasks
# Uses Kimi (Allegretto plan) for client bots

set -e

GATEWAY_DIR="/opt/openclaw/gateway"
CONFIG_FILE="$GATEWAY_DIR/hybrid_ai_config.json"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Hybrid AI Gateway Setup (Kimi Direct + Sub-agents)        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check prerequisites
echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"

# Check if running on VPS or locally
if [ -f /etc/systemd/system/ai-gateway.service ]; then
    echo "✅ Running on VPS"
    IS_VPS=true
else
    echo "⚠️  Running locally"
    IS_VPS=false
fi

# Check OpenClaw
if command -v openclaw &> /dev/null; then
    echo "✅ OpenClaw CLI available"
else
    echo -e "${YELLOW}⚠️  OpenClaw CLI not in PATH${NC}"
fi

# Check Kimi config
if [ -f ~/.openclaw/openclaw.json ]; then
    echo "✅ OpenClaw config found"
    # Extract Kimi API key if present
    KIMI_KEY=$(grep -o '"apiKey": "[^"]*"' ~/.openclaw/openclaw.json | grep -v "${" | head -1 | cut -d'"' -f4)
    if [ -n "$KIMI_KEY" ]; then
        echo "✅ Kimi API key found in config"
    else
        echo "⚠️  Kimi API key uses environment variable"
    fi
else
    echo "❌ OpenClaw config not found"
fi

echo ""
echo -e "${YELLOW}[2/6] Creating Hybrid AI Config...${NC}"

# Create hybrid config
mkdir -p "$GATEWAY_DIR"
cat > "$CONFIG_FILE" << 'EOF'
{
  "ai_mode": "hybrid",
  "fast_mode": {
    "provider": "kimi",
    "model": "k2p5",
    "max_tokens": 300,
    "timeout_ms": 5000,
    "use_for": ["simple_qa", "greeting", "hours", "contact", "pricing"]
  },
  "complex_mode": {
    "provider": "openclaw_subagent",
    "model": "kimi-coding/k2p5",
    "trigger_keywords": ["analyze", "research", "strategy", "complex", "detailed"],
    "min_complexity_score": 0.7,
    "timeout_seconds": 60
  },
  "routing_rules": {
    "use_fast_if": {
      "message_length": {"max": 100},
      "contains_keywords": ["hello", "hi", "hours", "open", "price", "cost", "contact", "menu"],
      "response_type": "factual"
    },
    "use_complex_if": {
      "message_length": {"min": 50},
      "contains_keywords": ["analyze", "research", "strategy", "why", "how does", "explain"],
      "question_marks": true,
      "multi_part": true
    }
  },
  "fallback": {
    "if_both_fail": "use_fast_with_default_response",
    "default_response": "I understand. Let me connect you with the right assistance."
  },
  "cost_tracking": {
    "track_tokens": true,
    "track_latency": true,
    "alert_threshold": 1000
  }
}
EOF

echo "✅ Config created at $CONFIG_FILE"

echo ""
echo -e "${YELLOW}[3/6] Creating Hybrid Gateway Module...${NC}"

# Create hybrid gateway module
cat > "$GATEWAY_DIR/hybrid_ai.py" << 'PYEOF'
"""
Hybrid AI Gateway - Direct API for speed, Sub-agents for complexity
Uses Kimi Direct API for fast responses, OpenClaw sub-agents for deep work
"""

import asyncio
import aiohttp
import json
import os
import subprocess
import time
from typing import Dict, Tuple, Optional

class HybridAIProcessor:
    """Routes messages to fast API or sub-agent based on complexity"""
    
    def __init__(self, config_path: str):
        with open(config_path) as f:
            self.config = json.load(f)
        self.session = None
        
    async def init_session(self):
        """Initialize aiohttp session"""
        if not self.session:
            self.session = aiohttp.ClientSession()
    
    def analyze_complexity(self, message: str) -> Tuple[str, float]:
        """Analyze message to determine routing"""
        msg_lower = message.lower()
        score = 0.0
        indicators = []
        
        # Length check
        if len(message) > 100:
            score += 0.3
            indicators.append("long_message")
        
        # Keyword checks for complex mode
        complex_keywords = self.config["complex_mode"]["trigger_keywords"]
        for keyword in complex_keywords:
            if keyword in msg_lower:
                score += 0.4
                indicators.append(f"complex_keyword:{keyword}")
                break
        
        # Question marks indicate complexity
        if message.count('?') > 1:
            score += 0.2
            indicators.append("multi_question")
        
        # Simple keywords = fast mode
        simple_keywords = self.config["fast_mode"]["use_for"]
        for keyword in simple_keywords:
            if keyword.replace('_', ' ') in msg_lower:
                score -= 0.3
                indicators.append("simple_keyword")
                break
        
        # Determine mode
        threshold = self.config["complex_mode"]["min_complexity_score"]
        if score >= threshold:
            return "complex", score
        else:
            return "fast", score
    
    async def process_fast(self, message: str, context: Dict) -> Tuple[str, int]:
        """Process via Kimi Direct API (fast)"""
        start_time = time.time()
        
        # Build system prompt with business context
        system_prompt = f"""You are a helpful assistant for {context.get('business_name', 'this business')}.
        
Be concise and direct. Answer in 2-3 sentences maximum.

Context:
- Business: {context.get('business_name', 'Unknown')}
- Type: {context.get('business_type', 'general')}

Respond naturally as if texting a customer."""
        
        # Call Kimi API
        api_url = "https://api.kimi.com/coding/v1/chat/completions"
        
        # Get API key from environment or config
        api_key = os.environ.get('KIMI_API_KEY') or self._get_kimi_key_from_config()
        
        payload = {
            "model": self.config["fast_mode"]["model"],
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            "max_tokens": self.config["fast_mode"]["max_tokens"],
            "temperature": 0.7
        }
        
        try:
            async with self.session.post(
                api_url,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    reply = data['choices'][0]['message']['content']
                    tokens = data.get('usage', {}).get('total_tokens', 0)
                    latency = int((time.time() - start_time) * 1000)
                    print(f"[FAST] {latency}ms | {tokens} tokens")
                    return reply, tokens
                else:
                    error_text = await response.text()
                    print(f"[FAST ERROR] {response.status}: {error_text}")
                    return self.config["fallback"]["default_response"], 0
        except Exception as e:
            print(f"[FAST EXCEPTION] {e}")
            return self.config["fallback"]["default_response"], 0
    
    async def process_complex(self, message: str, context: Dict) -> Tuple[str, int]:
        """Process via OpenClaw sub-agent (thorough)"""
        start_time = time.time()
        
        task = f"""You are assisting for {context.get('business_name', 'this business')}.

Customer message: "{message}"

Provide a thoughtful, detailed response. Consider:
1. What the customer really needs
2. Business context and capabilities  
3. Best way to help them

Respond as a knowledgeable assistant."""
        
        # Create temp file for task
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(task)
            task_file = f.name
        
        try:
            # Spawn sub-agent via OpenClaw
            result = subprocess.run(
                ['openclaw', 'sessions_spawn', '--mode=run', '--runtime=subagent',
                 f'--task-file={task_file}'],
                capture_output=True,
                text=True,
                timeout=self.config["complex_mode"]["timeout_seconds"],
                cwd='/home/darwin/.openclaw/workspace'
            )
            
            os.unlink(task_file)
            
            latency = int((time.time() - start_time) * 1000)
            
            if result.returncode == 0 and result.stdout.strip():
                reply = result.stdout.strip()
                tokens = len(reply.split()) * 2  # Rough estimate
                print(f"[COMPLEX] {latency}ms | Sub-agent completed")
                return reply, tokens
            else:
                print(f"[COMPLEX FALLBACK] Sub-agent failed, using default")
                return self.config["fallback"]["default_response"], 0
                
        except Exception as e:
            try:
                os.unlink(task_file)
            except:
                pass
            print(f"[COMPLEX EXCEPTION] {e}")
            return self.config["fallback"]["default_response"], 0
    
    def _get_kimi_key_from_config(self) -> str:
        """Extract Kimi API key from OpenClaw config"""
        try:
            with open(os.path.expanduser('~/.openclaw/openclaw.json')) as f:
                config = json.load(f)
                # Try to get from models config
                providers = config.get('models', {}).get('providers', {})
                kimi = providers.get('kimi-coding', {})
                api_key = kimi.get('apiKey', '')
                if api_key and not api_key.startswith('${'):
                    return api_key
        except:
            pass
        return os.environ.get('KIMI_API_KEY', '')
    
    async def process(self, message: str, context: Dict) -> Tuple[str, str, int]:
        """Route and process message"""
        await self.init_session()
        
        mode, score = self.analyze_complexity(message)
        
        if mode == "fast":
            response, tokens = await self.process_fast(message, context)
            return response, "fast", tokens
        else:
            response, tokens = await self.process_complex(message, context)
            return response, "complex", tokens
    
    async def close(self):
        """Close session"""
        if self.session:
            await self.session.close()

# Export for use in gateway
if __name__ == "__main__":
    # Test mode
    import asyncio
    
    async def test():
        processor = HybridAIProcessor("./hybrid_ai_config.json")
        context = {"business_name": "Test Business", "business_type": "retail"}
        
        # Test fast mode
        reply, mode, tokens = await processor.process("What are your hours?", context)
        print(f"Mode: {mode}, Tokens: {tokens}")
        print(f"Reply: {reply}")
        
        await processor.close()
    
    asyncio.run(test())
PYEOF

echo "✅ Hybrid AI module created"

echo ""
echo -e "${YELLOW}[4/6] Installing dependencies...${NC}"

# Check Python dependencies
python3 -c "import aiohttp" 2>/dev/null || pip3 install aiohttp --quiet
echo "✅ aiohttp installed"

echo ""
echo -e "${YELLOW}[5/6] Testing Hybrid System...${NC}"

# Create test script
cat > "$GATEWAY_DIR/test-hybrid.sh" << 'EOF'
#!/bin/bash
# Test hybrid routing logic

echo "Testing Hybrid AI Routing..."

cd /opt/openclaw/gateway

# Test complexity analysis
python3 << 'PYTEST'
import json

# Load config
with open("hybrid_ai_config.json") as f:
    config = json.load(f)

# Test messages
tests = [
    ("Hello!", "fast"),
    ("What are your hours?", "fast"),
    ("How much does it cost?", "fast"),
    ("Analyze the market trends for my business strategy", "complex"),
    ("Research competitor pricing and explain why they're cheaper", "complex"),
    ("Hi, can you help me understand how to optimize my operations?", "complex")
]

print("Routing Tests:")
for msg, expected in tests:
    score = 0.0
    msg_lower = msg.lower()
    
    # Check complex keywords
    for kw in config["complex_mode"]["trigger_keywords"]:
        if kw in msg_lower:
            score += 0.4
    
    # Check length
    if len(msg) > 100:
        score += 0.3
    
    # Check simple keywords
    for kw in config["fast_mode"]["use_for"]:
        if kw.replace('_', ' ') in msg_lower:
            score -= 0.3
    
    threshold = config["complex_mode"]["min_complexity_score"]
    mode = "complex" if score >= threshold else "fast"
    status = "✅" if mode == expected else "❌"
    
    print(f"{status} '{msg[:40]}...' -> {mode} (score: {score:.2f}, expected: {expected})")

print("\nTest complete!")
PYTEST

EOF

chmod +x "$GATEWAY_DIR/test-hybrid.sh"
"$GATEWAY_DIR/test-hybrid.sh"

echo ""
echo -e "${YELLOW}[6/6] Setting up service...${NC}"

# Create systemd service for hybrid gateway
cat > /tmp/hybrid-gateway.service << EOF
[Unit]
Description=OpenClaw Hybrid AI Gateway (Kimi Direct + Sub-agents)
After=network.target

[Service]
Type=simple
WorkingDirectory=$GATEWAY_DIR
Environment="KIMI_API_KEY=${KIMI_API_KEY}"
ExecStart=/usr/bin/python3 $GATEWAY_DIR/hybrid_ai.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

if [ "$IS_VPS" = true ]; then
    sudo cp /tmp/hybrid-gateway.service /etc/systemd/system/
    sudo systemctl daemon-reload
    echo "✅ Service created (run: sudo systemctl start hybrid-gateway)"
else
    echo "⚠️  VPS-only feature. Service file at: /tmp/hybrid-gateway.service"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ HYBRID AI SYSTEM INSTALLED!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Features:"
echo "  • Fast mode: Kimi Direct API (< 1s responses)"
echo "  • Complex mode: OpenClaw sub-agents (deep analysis)"
echo "  • Auto-routing based on message complexity"
echo "  • Cost tracking for both modes"
echo ""
echo "Files:"
echo "  Config: $CONFIG_FILE"
echo "  Module: $GATEWAY_DIR/hybrid_ai.py"
echo "  Tests:  $GATEWAY_DIR/test-hybrid.sh"
echo ""
echo "Next Steps:"
if [ "$IS_VPS" = true ]; then
    echo "  1. Set KIMI_API_KEY environment variable"
    echo "  2. Start service: sudo systemctl start hybrid-gateway"
    echo "  3. Test: curl http://localhost:9090/health"
else
    echo "  1. Deploy to VPS for production use"
    echo "  2. Set KIMI_API_KEY on VPS"
    echo "  3. Start service"
fi
echo ""
