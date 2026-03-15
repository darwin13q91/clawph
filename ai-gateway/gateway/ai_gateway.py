#!/usr/bin/env python3
"""
AI Gateway Module for OpenClaw Multi-Tenant System
Runs on VPS, receives Telegram webhooks, forwards to local OpenClaw via Tailscale
"""

import asyncio
import json
import logging
import os
import re
import sys
import time
import traceback
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import aiohttp
from aiohttp import web

# Configuration
GATEWAY_DIR = Path("/opt/openclaw")
CLIENTS_DIR = GATEWAY_DIR / "clients"
LOGS_DIR = GATEWAY_DIR / "logs"
SECRETS_DIR = GATEWAY_DIR / "secrets"

# Ensure directories exist
for d in [CLIENTS_DIR, LOGS_DIR, SECRETS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOGS_DIR / "ai_gateway.log", maxBytes=10_000_000, backupCount=5)
    ]
)
logger = logging.getLogger("ai_gateway")


@dataclass
class ClientConfig:
    """Configuration for a single client"""
    client_id: str
    bot_token: str
    business_name: str
    business_type: str
    personality: str
    ai_enabled: bool = True
    simple_response_threshold: float = 0.7
    max_context_messages: int = 50
    rate_limit_per_minute: int = 30
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class ClientStats:
    """Runtime statistics for a client"""
    message_count: int = 0
    ai_calls: int = 0
    simple_responses: int = 0
    errors: int = 0
    last_message_at: Optional[str] = None
    tokens_used: int = 0
    estimated_cost: float = 0.0


class ContextManager:
    """Manages per-client context, memory, and stats"""
    
    def __init__(self, clients_dir: Path):
        self.clients_dir = clients_dir
        self._cache: Dict[str, ClientConfig] = {}
        self._stats: Dict[str, ClientStats] = {}
        self._lock = asyncio.Lock()
    
    def _client_dir(self, client_id: str) -> Path:
        return self.clients_dir / client_id
    
    async def load_client(self, client_id: str) -> Optional[ClientConfig]:
        """Load client configuration from disk"""
        if client_id in self._cache:
            return self._cache[client_id]
        
        client_dir = self._client_dir(client_id)
        context_file = client_dir / "context.json"
        
        if not context_file.exists():
            logger.warning(f"No context found for client {client_id}")
            return None
        
        try:
            with open(context_file) as f:
                data = json.load(f)
            
            # Load bot token from secrets
            token_file = SECRETS_DIR / f"{client_id}.token"
            bot_token = ""
            if token_file.exists():
                bot_token = token_file.read_text().strip()
            
            config = ClientConfig(
                client_id=client_id,
                bot_token=bot_token,
                business_name=data.get("business_name", "Unknown"),
                business_type=data.get("business_type", "general"),
                personality=data.get("personality", "friendly, helpful"),
                ai_enabled=data.get("ai_enabled", True),
                simple_response_threshold=data.get("simple_response_threshold", 0.7),
                max_context_messages=data.get("max_context_messages", 50),
                rate_limit_per_minute=data.get("rate_limit_per_minute", 30)
            )
            
            self._cache[client_id] = config
            
            # Initialize stats
            if client_id not in self._stats:
                self._stats[client_id] = await self._load_stats(client_id)
            
            return config
            
        except Exception as e:
            logger.error(f"Failed to load client {client_id}: {e}")
            return None
    
    async def _load_stats(self, client_id: str) -> ClientStats:
        """Load client statistics from disk"""
        stats_file = self._client_dir(client_id) / "stats.json"
        if stats_file.exists():
            try:
                with open(stats_file) as f:
                    data = json.load(f)
                return ClientStats(**data)
            except Exception as e:
                logger.error(f"Failed to load stats for {client_id}: {e}")
        return ClientStats()
    
    async def save_stats(self, client_id: str):
        """Save client statistics to disk"""
        async with self._lock:
            if client_id in self._stats:
                stats_file = self._client_dir(client_id) / "stats.json"
                try:
                    with open(stats_file, 'w') as f:
                        json.dump(self._stats[client_id].__dict__, f, indent=2)
                except Exception as e:
                    logger.error(f"Failed to save stats for {client_id}: {e}")
    
    async def add_message_to_memory(self, client_id: str, role: str, content: str):
        """Add a message to client's conversation memory"""
        memory_file = self._client_dir(client_id) / "memory.json"
        
        try:
            messages = []
            if memory_file.exists():
                with open(memory_file) as f:
                    messages = json.load(f)
            
            # Add new message
            messages.append({
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat()
            })
            
            # Keep only last N messages
            config = await self.load_client(client_id)
            max_messages = config.max_context_messages if config else 50
            messages = messages[-max_messages:]
            
            with open(memory_file, 'w') as f:
                json.dump(messages, f, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to update memory for {client_id}: {e}")
    
    async def get_memory(self, client_id: str) -> List[Dict[str, str]]:
        """Get client's conversation memory"""
        memory_file = self._client_dir(client_id) / "memory.json"
        if memory_file.exists():
            try:
                with open(memory_file) as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load memory for {client_id}: {e}")
        return []
    
    def update_stats(self, client_id: str, ai_call: bool = False, 
                     simple_response: bool = False, error: bool = False,
                     tokens: int = 0, cost: float = 0):
        """Update client statistics"""
        if client_id not in self._stats:
            self._stats[client_id] = ClientStats()
        
        stats = self._stats[client_id]
        stats.message_count += 1
        stats.last_message_at = datetime.now().isoformat()
        
        if ai_call:
            stats.ai_calls += 1
        if simple_response:
            stats.simple_responses += 1
        if error:
            stats.errors += 1
        
        stats.tokens_used += tokens
        stats.estimated_cost += cost
        
        # Async save
        asyncio.create_task(self.save_stats(client_id))


class IntentClassifier:
    """Classifies messages to determine if AI processing is needed"""
    
    # Simple response patterns (case-insensitive)
    SIMPLE_PATTERNS = [
        # Greetings
        (r'^(hi|hello|hey|greetings|yo|hola)\b', 'greeting'),
        # Goodbyes
        (r'^(bye|goodbye|see you|later|cya|take care)\b', 'goodbye'),
        # Thanks
        (r'^(thanks?|thank you|ty|appreciate)\b', 'thanks'),
        # Hours questions
        (r'(what time|hours|open|close|when.*open|business hours)', 'hours_query'),
        # Location
        (r'(where.*located|address|location|directions|how.*get there)', 'location_query'),
        # Contact
        (r'(phone|number|call|contact|email|reach you)', 'contact_query'),
        # Simple yes/no
        (r'^(yes|no|yeah|nope|sure|ok|okay|k)$', 'confirmation'),
    ]
    
    # Complex indicators (likely need AI)
    COMPLEX_INDICATORS = [
        r'(explain|describe|tell me about|what is|how to|why is|compare)',
        r'(recommend|suggest|advice|opinion|think|believe)',
        r'(problem|issue|error|trouble|help.*with)',
        r'(create|write|generate|make|draft)',
        r'\?',  # Questions that aren't simple lookups
    ]
    
    def __init__(self, context_manager: ContextManager):
        self.context = context_manager
    
    async def classify(self, message: str, client_id: str) -> Tuple[str, float, Optional[str]]:
        """
        Classify message intent and determine if AI is needed
        
        Returns: (intent_type, confidence, simple_response)
        """
        msg_lower = message.lower().strip()
        
        # Check for simple patterns first
        for pattern, intent in self.SIMPLE_PATTERNS:
            if re.search(pattern, msg_lower, re.IGNORECASE):
                simple_response = await self._get_simple_response(intent, client_id)
                if simple_response:
                    return (intent, 0.9, simple_response)
        
        # Check for complex indicators
        complex_score = 0
        for pattern in self.COMPLEX_INDICATORS:
            if re.search(pattern, msg_lower, re.IGNORECASE):
                complex_score += 0.25
        
        # Load client config for threshold
        config = await self.context.load_client(client_id)
        threshold = config.simple_response_threshold if config else 0.7
        
        if complex_score >= threshold:
            return ("complex", complex_score, None)
        
        # Default to simple for very short messages
        if len(msg_lower.split()) <= 3:
            return ("short", 0.6, None)
        
        return ("unknown", 0.5, None)
    
    async def _get_simple_response(self, intent: str, client_id: str) -> Optional[str]:
        """Get a simple response from client's context"""
        client_dir = CLIENTS_DIR / client_id
        context_file = client_dir / "context.json"
        
        if not context_file.exists():
            return None
        
        try:
            with open(context_file) as f:
                data = json.load(f)
            
            common_qa = data.get("common_qa", {})
            knowledge_base = data.get("knowledge_base", {})
            
            # Map intents to response keys
            responses = {
                'greeting': common_qa.get('greeting') or f"Hello! Welcome to {data.get('business_name', 'our business')}. How can I help you today?",
                'goodbye': common_qa.get('goodbye') or "Thank you! Have a great day!",
                'thanks': common_qa.get('thanks_response') or "You're welcome! Is there anything else I can help with?",
                'hours_query': common_qa.get('hours') or knowledge_base.get('hours') or None,
                'location_query': common_qa.get('location') or knowledge_base.get('address') or None,
                'contact_query': common_qa.get('contact') or knowledge_base.get('phone') or None,
                'confirmation': "Got it!",
            }
            
            return responses.get(intent)
            
        except Exception as e:
            logger.error(f"Failed to get simple response for {client_id}: {e}")
            return None


class TunnelClient:
    """Client for forwarding messages to local OpenClaw via Tailscale"""
    
    def __init__(self, local_host: str = "openclaw-local", local_port: int = 8080):
        self.local_host = local_host
        self.local_port = local_port
        self.base_url = f"http://{local_host}:{local_port}"
        self.session: Optional[aiohttp.ClientSession] = None
        self.timeout = aiohttp.ClientTimeout(total=60, connect=10)
    
    async def start(self):
        """Initialize HTTP session"""
        connector = aiohttp.TCPConnector(limit=100, limit_per_host=20)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=self.timeout,
            headers={"Content-Type": "application/json"}
        )
    
    async def stop(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def forward_message(self, client_id: str, message: str, 
                              context: Dict[str, Any]) -> Dict[str, Any]:
        """Forward message to local OpenClaw for AI processing"""
        if not self.session:
            raise RuntimeError("TunnelClient not started")
        
        payload = {
            "client_id": client_id,
            "message": message,
            "context": context,
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/process",
                json=payload
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    text = await response.text()
                    raise Exception(f"Local server error {response.status}: {text}")
                    
        except asyncio.TimeoutError:
            raise Exception("Timeout waiting for local OpenClaw response")
        except aiohttp.ClientError as e:
            raise Exception(f"Connection error: {e}")
    
    async def health_check(self) -> bool:
        """Check if local OpenClaw is reachable"""
        if not self.session:
            return False
        
        try:
            async with self.session.get(
                f"{self.base_url}/health",
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                return response.status == 200
        except:
            return False


class TelegramClient:
    """Client for sending messages back to Telegram"""
    
    API_BASE = "https://api.telegram.org/bot"
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def start(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
    
    async def stop(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def send_message(self, token: str, chat_id: int, text: str,
                          parse_mode: str = "Markdown") -> bool:
        """Send a message to Telegram chat"""
        if not self.session:
            raise RuntimeError("TelegramClient not started")
        
        url = f"{self.API_BASE}{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode
        }
        
        try:
            async with self.session.post(url, json=payload) as response:
                if response.status == 200:
                    result = await response.json()
                    return result.get("ok", False)
                else:
                    logger.error(f"Telegram API error: {response.status}")
                    return False
        except Exception as e:
            logger.error(f"Failed to send Telegram message: {e}")
            return False
    
    async def send_error_message(self, token: str, chat_id: int) -> bool:
        """Send a friendly error message to user"""
        error_text = (
            "I'm having a bit of trouble right now. 😅\n\n"
            "Let me connect you with a human who can help. "
            "Please try again in a few minutes!"
        )
        return await self.send_message(token, chat_id, error_text)


class AIGateway:
    """Main AI Gateway application"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_config(config_path)
        self.context_manager = ContextManager(CLIENTS_DIR)
        self.intent_classifier = IntentClassifier(self.context_manager)
        self.tunnel = TunnelClient(
            self.config.get("local_host", "openclaw-local"),
            self.config.get("local_port", 8080)
        )
        self.telegram = TelegramClient()
        self.app = web.Application()
        self._setup_routes()
        
        # Rate limiting
        self._rate_limits: Dict[str, List[float]] = {}
    
    def _load_config(self, config_path: Optional[str]) -> Dict[str, Any]:
        """Load gateway configuration"""
        if config_path and os.path.exists(config_path):
            with open(config_path) as f:
                return json.load(f)
        
        # Default config
        default_path = GATEWAY_DIR / "gateway" / "ai_config.json"
        if default_path.exists():
            with open(default_path) as f:
                return json.load(f)
        
        return {
            "local_host": "openclaw-local",
            "local_port": 8080,
            "gateway_port": 8000,
            "max_message_length": 4000,
            "rate_limit_enabled": True
        }
    
    def _setup_routes(self):
        """Setup HTTP routes"""
        self.app.router.add_get("/health", self.health_handler)
        self.app.router.add_post("/webhook/{client_id}", self.webhook_handler)
        self.app.router.add_get("/stats/{client_id}", self.stats_handler)
    
    async def start(self):
        """Start the gateway"""
        await self.tunnel.start()
        await self.telegram.start()
        logger.info("AI Gateway started")
    
    async def stop(self):
        """Stop the gateway"""
        await self.tunnel.stop()
        await self.telegram.stop()
        logger.info("AI Gateway stopped")
    
    def _check_rate_limit(self, client_id: str, user_id: int) -> bool:
        """Check if user has exceeded rate limit"""
        if not self.config.get("rate_limit_enabled", True):
            return True
        
        key = f"{client_id}:{user_id}"
        now = time.time()
        window = 60  # 1 minute
        
        if key not in self._rate_limits:
            self._rate_limits[key] = []
        
        # Clean old entries
        self._rate_limits[key] = [t for t in self._rate_limits[key] if now - t < window]
        
        # Get client config for limit
        config = asyncio.run(self.context_manager.load_client(client_id))
        limit = config.rate_limit_per_minute if config else 30
        
        if len(self._rate_limits[key]) >= limit:
            return False
        
        self._rate_limits[key].append(now)
        return True
    
    async def health_handler(self, request: web.Request) -> web.Response:
        """Health check endpoint"""
        tunnel_healthy = await self.tunnel.health_check()
        
        status = {
            "status": "healthy" if tunnel_healthy else "degraded",
            "gateway": "running",
            "tunnel": "connected" if tunnel_healthy else "disconnected",
            "timestamp": datetime.now().isoformat()
        }
        
        return web.json_response(status, status=200 if tunnel_healthy else 503)
    
    async def stats_handler(self, request: web.Request) -> web.Response:
        """Get client statistics"""
        client_id = request.match_info["client_id"]
        stats = self.context_manager._stats.get(client_id)
        
        if not stats:
            # Try to load from disk
            stats = await self.context_manager._load_stats(client_id)
        
        if stats:
            return web.json_response(stats.__dict__)
        else:
            return web.json_response({"error": "Client not found"}, status=404)
    
    async def webhook_handler(self, request: web.Request) -> web.Response:
        """Handle incoming Telegram webhook"""
        client_id = request.match_info["client_id"]
        
        try:
            data = await request.json()
        except json.JSONDecodeError:
            return web.json_response({"error": "Invalid JSON"}, status=400)
        
        # Extract message info
        message = data.get("message", {})
        text = message.get("text", "")
        chat_id = message.get("chat", {}).get("id")
        user_id = message.get("from", {}).get("id")
        
        if not text or not chat_id:
            return web.json_response({"status": "ignored"})
        
        logger.info(f"Received message from {client_id}: {text[:50]}...")
        
        # Load client config
        config = await self.context_manager.load_client(client_id)
        if not config:
            logger.error(f"Unknown client: {client_id}")
            return web.json_response({"error": "Unknown client"}, status=404)
        
        # Check rate limit
        if not self._check_rate_limit(client_id, user_id):
            await self.telegram.send_message(
                config.bot_token, chat_id,
                "⚠️ You're sending messages too quickly. Please slow down."
            )
            return web.json_response({"status": "rate_limited"})
        
        # Update stats
        self.context_manager.update_stats(client_id)
        
        # Add user message to memory
        await self.context_manager.add_message_to_memory(client_id, "user", text)
        
        # Process message
        try:
            response_text = await self._process_message(client_id, config, text)
            
            # Send response
            success = await self.telegram.send_message(
                config.bot_token, chat_id, response_text
            )
            
            if success:
                # Add assistant response to memory
                await self.context_manager.add_message_to_memory(
                    client_id, "assistant", response_text
                )
            
            return web.json_response({"status": "ok", "sent": success})
            
        except Exception as e:
            logger.exception(f"Error processing message: {e}")
            self.context_manager.update_stats(client_id, error=True)
            
            # Send error message to user
            await self.telegram.send_error_message(config.bot_token, chat_id)
            
            return web.json_response({"status": "error", "message": str(e)}, status=500)
    
    async def _process_message(self, client_id: str, config: ClientConfig, 
                               message: str) -> str:
        """Process a message and generate response"""
        
        # Check message length
        max_len = self.config.get("max_message_length", 4000)
        if len(message) > max_len:
            return "Your message is too long. Please send a shorter message."
        
        # Classify intent
        intent, confidence, simple_response = await self.intent_classifier.classify(
            message, client_id
        )
        
        logger.info(f"Classified intent: {intent} (confidence: {confidence:.2f})")
        
        # Use simple response if available and appropriate
        if simple_response and confidence >= config.simple_response_threshold:
            logger.info("Using simple response")
            self.context_manager.update_stats(client_id, simple_response=True)
            return simple_response
        
        # Check if AI is enabled for this client
        if not config.ai_enabled:
            return ("I'm not able to process complex questions right now. "
                   "Please contact us directly for assistance.")
        
        # Check tunnel health
        if not await self.tunnel.health_check():
            logger.error("Tunnel is down, using fallback")
            return await self._fallback_response(client_id, message)
        
        # Forward to local OpenClaw for AI processing
        logger.info("Forwarding to local OpenClaw for AI processing")
        
        context = {
            "business_name": config.business_name,
            "business_type": config.business_type,
            "personality": config.personality,
            "conversation_history": await self.context_manager.get_memory(client_id),
            "knowledge_base": await self._load_knowledge_base(client_id)
        }
        
        try:
            result = await self.tunnel.forward_message(client_id, message, context)
            
            # Update stats with token usage
            tokens = result.get("tokens_used", 0)
            cost = result.get("cost", 0.0)
            self.context_manager.update_stats(client_id, ai_call=True, 
                                              tokens=tokens, cost=cost)
            
            return result.get("response", "I couldn't process that request.")
            
        except Exception as e:
            logger.error(f"AI processing failed: {e}")
            return await self._fallback_response(client_id, message)
    
    async def _load_knowledge_base(self, client_id: str) -> Dict[str, Any]:
        """Load client's knowledge base"""
        context_file = CLIENTS_DIR / client_id / "context.json"
        if context_file.exists():
            try:
                with open(context_file) as f:
                    data = json.load(f)
                return data.get("knowledge_base", {})
            except Exception as e:
                logger.error(f"Failed to load knowledge base: {e}")
        return {}
    
    async def _fallback_response(self, client_id: str, message: str) -> str:
        """Generate fallback response when AI is unavailable"""
        # Try to find relevant FAQ answer
        msg_lower = message.lower()
        
        context_file = CLIENTS_DIR / client_id / "context.json"
        if context_file.exists():
            try:
                with open(context_file) as f:
                    data = json.load(f)
                
                common_qa = data.get("common_qa", {})
                for keyword, answer in common_qa.items():
                    if keyword in msg_lower:
                        return answer
                        
            except Exception:
                pass
        
        # Default fallback
        return ("I'm having trouble connecting to my brain right now. 😅\n\n"
               "For immediate assistance, please call us directly. "
               "I'll be back online shortly!")


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="OpenClaw AI Gateway")
    parser.add_argument("--config", "-c", help="Path to config file")
    parser.add_argument("--port", "-p", type=int, default=8000, help="Port to listen on")
    args = parser.parse_args()
    
    gateway = AIGateway(args.config)
    await gateway.start()
    
    runner = web.AppRunner(gateway.app)
    await runner.setup()
    
    site = web.TCPSite(runner, "0.0.0.0", args.port)
    await site.start()
    
    logger.info(f"Gateway listening on port {args.port}")
    
    try:
        while True:
            await asyncio.sleep(3600)
    except asyncio.CancelledError:
        pass
    finally:
        await gateway.stop()
        await runner.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
