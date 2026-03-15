#!/usr/bin/env python3
"""
OpenClaw AI Gateway - Simplified OpenAI Integration
Receives Telegram webhooks and responds directly via OpenAI API
"""

import asyncio
import json
import logging
import logging.handlers
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

# Configuration paths
GATEWAY_DIR = Path("/home/darwin/.openclaw/workspace/client-management")
CLIENTS_DIR = GATEWAY_DIR / "data" / "clients"
LOGS_DIR = GATEWAY_DIR / "logs"
AI_CONFIG_FILE = GATEWAY_DIR / "config" / "ai_config.json"

# Ensure directories exist
for d in [CLIENTS_DIR, LOGS_DIR, GATEWAY_DIR / "config"]:
    d.mkdir(parents=True, exist_ok=True)

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.handlers.RotatingFileHandler(LOGS_DIR / "ai_gateway.log", maxBytes=10_000_000, backupCount=5)
    ]
)
logger = logging.getLogger("openclaw_gateway")


@dataclass
class ClientConfig:
    """Client configuration"""
    client_id: str
    business_name: str
    tier: str
    status: str
    ai_enabled: bool = True
    ai_model: str = "gpt-4o-mini"
    max_tokens: int = 500
    temperature: float = 0.7
    messages_per_day: int = 100
    system_prompt: str = "You are a helpful assistant."
    custom_responses: Dict[str, str] = field(default_factory=dict)
    telegram_token: str = ""
    telegram_chat_id: str = ""


@dataclass
class ClientUsage:
    """Client usage tracking"""
    total_messages: int = 0
    messages_today: int = 0
    messages_this_month: int = 0
    ai_calls: int = 0
    tokens_used: int = 0
    estimated_cost: float = 0.0
    last_message_date: str = ""


class OpenAIClient:
    """OpenAI API Client"""
    
    API_URL = "https://api.openai.com/v1/chat/completions"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def start(self):
        """Initialize HTTP session"""
        connector = aiohttp.TCPConnector(limit=100, limit_per_host=20)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=aiohttp.ClientTimeout(total=60, connect=10),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
        )
    
    async def stop(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def chat_completion(self, 
                              messages: List[Dict[str, str]], 
                              model: str = "gpt-4o-mini",
                              max_tokens: int = 500,
                              temperature: float = 0.7) -> Tuple[str, int, float]:
        """
        Send chat completion request to OpenAI
        Returns: (response_text, tokens_used, estimated_cost)
        """
        if not self.session:
            raise RuntimeError("OpenAI client not started")
        
        if not self.api_key:
            raise RuntimeError("OpenAI API key not configured")
        
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        try:
            async with self.session.post(self.API_URL, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Extract response
                    response_text = data["choices"][0]["message"]["content"]
                    
                    # Calculate tokens and cost
                    usage = data.get("usage", {})
                    prompt_tokens = usage.get("prompt_tokens", 0)
                    completion_tokens = usage.get("completion_tokens", 0)
                    total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)
                    
                    # Cost calculation (GPT-4o-mini rates as of 2024)
                    # Input: $0.15 per 1M tokens, Output: $0.60 per 1M tokens
                    input_cost = (prompt_tokens / 1_000_000) * 0.15
                    output_cost = (completion_tokens / 1_000_000) * 0.60
                    estimated_cost = input_cost + output_cost
                    
                    return response_text.strip(), total_tokens, estimated_cost
                    
                elif response.status == 401:
                    raise Exception("Invalid OpenAI API key")
                elif response.status == 429:
                    raise Exception("Rate limit exceeded - please try again later")
                else:
                    error_text = await response.text()
                    raise Exception(f"OpenAI API error {response.status}: {error_text}")
                    
        except aiohttp.ClientError as e:
            raise Exception(f"Connection error: {e}")
        except asyncio.TimeoutError:
            raise Exception("Request timeout - OpenAI is taking too long to respond")


class ClientManager:
    """Manages client configurations and usage"""
    
    def __init__(self, clients_dir: Path):
        self.clients_dir = clients_dir
        self._cache: Dict[str, ClientConfig] = {}
        self._usage: Dict[str, ClientUsage] = {}
        self._lock = asyncio.Lock()
    
    def _client_dir(self, client_id: str) -> Path:
        return self.clients_dir / client_id
    
    def _config_path(self, client_id: str) -> Path:
        return self._client_dir(client_id) / "config.json"
    
    def _usage_path(self, client_id: str) -> Path:
        return self._client_dir(client_id) / "usage.json"
    
    async def load_client(self, client_id: str) -> Optional[ClientConfig]:
        """Load client configuration"""
        if client_id in self._cache:
            return self._cache[client_id]
        
        config_path = self._config_path(client_id)
        if not config_path.exists():
            return None
        
        try:
            with open(config_path) as f:
                data = json.load(f)
            
            config = ClientConfig(
                client_id=client_id,
                business_name=data.get("business_name", "Unknown"),
                tier=data.get("tier", "trial"),
                status=data.get("status", "trial"),
                ai_enabled=data.get("ai_settings", {}).get("enabled", True),
                ai_model=data.get("ai_settings", {}).get("model", "gpt-4o-mini"),
                max_tokens=data.get("ai_settings", {}).get("max_tokens", 500),
                temperature=data.get("ai_settings", {}).get("temperature", 0.7),
                messages_per_day=data.get("billing", {}).get("messages_per_day", 100),
                system_prompt=data.get("ai_settings", {}).get("system_prompt", 
                    f"You are a helpful assistant for {data.get('business_name', 'this business')}."),
                custom_responses=data.get("customization", {}),
                telegram_token=data.get("telegram_bot_token", ""),
                telegram_chat_id=data.get("telegram_chat_id", "")
            )
            
            self._cache[client_id] = config
            return config
            
        except Exception as e:
            logger.error(f"Failed to load client {client_id}: {e}")
            return None
    
    async def load_usage(self, client_id: str) -> ClientUsage:
        """Load client usage statistics"""
        if client_id in self._usage:
            return self._usage[client_id]
        
        usage_path = self._usage_path(client_id)
        if usage_path.exists():
            try:
                with open(usage_path) as f:
                    data = json.load(f)
                
                usage = ClientUsage(
                    total_messages=data.get("total_messages", 0),
                    messages_today=data.get("messages_today", 0),
                    messages_this_month=data.get("messages_this_month", 0),
                    ai_calls=data.get("ai_calls", 0),
                    tokens_used=data.get("tokens_used", 0),
                    estimated_cost=data.get("estimated_cost", 0.0),
                    last_message_date=data.get("last_message_date", "")
                )
                
                self._usage[client_id] = usage
                return usage
                
            except Exception as e:
                logger.error(f"Failed to load usage for {client_id}: {e}")
        
        return ClientUsage()
    
    async def save_usage(self, client_id: str):
        """Save client usage statistics"""
        async with self._lock:
            if client_id not in self._usage:
                return
            
            usage_path = self._usage_path(client_id)
            try:
                with open(usage_path, 'w') as f:
                    json.dump(self._usage[client_id].__dict__, f, indent=2)
            except Exception as e:
                logger.error(f"Failed to save usage for {client_id}: {e}")
    
    async def update_usage(self, client_id: str, ai_call: bool = False, 
                          tokens: int = 0, cost: float = 0.0):
        """Update client usage statistics"""
        async with self._lock:
            if client_id not in self._usage:
                self._usage[client_id] = await self.load_usage(client_id)
            
            usage = self._usage[client_id]
            today = datetime.now().strftime("%Y-%m-%d")
            
            # Reset daily counter if it's a new day
            if usage.last_message_date != today:
                usage.messages_today = 0
                usage.last_message_date = today
            
            usage.total_messages += 1
            usage.messages_today += 1
            usage.messages_this_month += 1
            
            if ai_call:
                usage.ai_calls += 1
                usage.tokens_used += tokens
                usage.estimated_cost += cost
            
            # Async save
            asyncio.create_task(self.save_usage(client_id))
    
    async def check_rate_limit(self, client_id: str) -> Tuple[bool, int, int]:
        """
        Check if client has exceeded their rate limit
        Returns: (allowed, current_count, limit)
        """
        usage = await self.load_usage(client_id)
        config = await self.load_client(client_id)
        
        if not config:
            return False, 0, 0
        
        today = datetime.now().strftime("%Y-%m-%d")
        current_count = usage.messages_today if usage.last_message_date == today else 0
        limit = config.messages_per_day
        
        # -1 means unlimited
        if limit == -1:
            return True, current_count, limit
        
        return current_count < limit, current_count, limit
    
    async def get_conversation_memory(self, client_id: str, user_id: str, limit: int = 10) -> List[Dict[str, str]]:
        """Get conversation memory for a user"""
        memory_path = self._client_dir(client_id) / f"memory_{user_id}.json"
        
        if memory_path.exists():
            try:
                with open(memory_path) as f:
                    messages = json.load(f)
                return messages[-limit:]
            except Exception as e:
                logger.error(f"Failed to load memory for {client_id}/{user_id}: {e}")
        
        return []
    
    async def add_to_memory(self, client_id: str, user_id: str, role: str, content: str):
        """Add message to conversation memory"""
        async with self._lock:
            memory_path = self._client_dir(client_id) / f"memory_{user_id}.json"
            
            messages = []
            if memory_path.exists():
                try:
                    with open(memory_path) as f:
                        messages = json.load(f)
                except:
                    messages = []
            
            messages.append({
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat()
            })
            
            # Keep only last 50 messages
            messages = messages[-50:]
            
            try:
                with open(memory_path, 'w') as f:
                    json.dump(messages, f, indent=2)
            except Exception as e:
                logger.error(f"Failed to save memory for {client_id}/{user_id}: {e}")


class TelegramClient:
    """Telegram Bot API Client"""
    
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
        """Send message to Telegram"""
        if not self.session:
            raise RuntimeError("Telegram client not started")
        
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
        """Send friendly error message"""
        error_text = (
            "I'm having a bit of trouble right now. 😅\n\n"
            "Please try again in a few minutes, or contact support if the problem persists."
        )
        return await self.send_message(token, chat_id, error_text)


class IntentClassifier:
    """Simple intent classification for routing"""
    
    # Simple patterns that don't need AI
    SIMPLE_PATTERNS = [
        (r'^(hi|hello|hey|greetings|yo|hola)\b', 'greeting'),
        (r'^(bye|goodbye|see you|later|cya|take care)\b', 'goodbye'),
        (r'^(thanks?|thank you|ty|appreciate)\b', 'thanks'),
        (r'(what time|hours|open|close|when.*open|business hours)', 'hours'),
        (r'(where.*located|address|location|directions)', 'location'),
        (r'(phone|number|call|contact|email|reach you)', 'contact'),
    ]
    
    def classify(self, message: str) -> Tuple[str, float]:
        """Classify message intent"""
        msg_lower = message.lower().strip()
        
        # Check simple patterns
        for pattern, intent in self.SIMPLE_PATTERNS:
            if re.search(pattern, msg_lower, re.IGNORECASE):
                return intent, 0.9
        
        # Complex indicators
        complex_indicators = [
            r'(explain|describe|tell me about|what is|how to|why is)',
            r'(recommend|suggest|advice|opinion|think|believe)',
            r'(problem|issue|error|trouble|help.*with)',
            r'(create|write|generate|make|draft)',
        ]
        
        for pattern in complex_indicators:
            if re.search(pattern, msg_lower, re.IGNORECASE):
                return "complex", 0.8
        
        return "general", 0.5
    
    def get_simple_response(self, intent: str, custom_responses: Dict[str, str]) -> Optional[str]:
        """Get simple response for common intents"""
        responses = {
            'greeting': custom_responses.get('greeting_message', 'Hello! How can I help you today?'),
            'goodbye': custom_responses.get('goodbye_message', 'Thank you! Have a great day!'),
            'thanks': 'You\'re welcome! Is there anything else I can help with?',
            'hours': custom_responses.get('business_hours', 'Please contact us for our current hours.'),
            'location': custom_responses.get('contact_info', 'Please contact us for location details.'),
            'contact': custom_responses.get('contact_info', 'Please contact us for more information.'),
        }
        return responses.get(intent)


class AIGateway:
    """Main AI Gateway Application"""
    
    def __init__(self):
        self.client_manager = ClientManager(CLIENTS_DIR)
        self.openai = OpenAIClient()
        self.telegram = TelegramClient()
        self.classifier = IntentClassifier()
        self.app = web.Application()
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup HTTP routes"""
        self.app.router.add_get("/health", self.health_handler)
        self.app.router.add_post("/webhook/{client_id}", self.webhook_handler)
        self.app.router.add_get("/stats/{client_id}", self.stats_handler)
        self.app.router.add_get("/clients", self.list_clients_handler)
    
    async def start(self):
        """Start the gateway"""
        await self.openai.start()
        await self.telegram.start()
        logger.info("AI Gateway started successfully")
    
    async def stop(self):
        """Stop the gateway"""
        await self.openai.stop()
        await self.telegram.stop()
        logger.info("AI Gateway stopped")
    
    async def health_handler(self, request: web.Request) -> web.Response:
        """Health check endpoint"""
        return web.json_response({
            "status": "healthy",
            "service": "openclaw-ai-gateway",
            "version": "2.0.0",
            "timestamp": datetime.now().isoformat()
        })
    
    async def list_clients_handler(self, request: web.Request) -> web.Response:
        """List all clients (admin endpoint)"""
        clients = []
        
        if CLIENTS_DIR.exists():
            for client_dir in CLIENTS_DIR.iterdir():
                if client_dir.is_dir():
                    config_path = client_dir / "config.json"
                    if config_path.exists():
                        try:
                            with open(config_path) as f:
                                data = json.load(f)
                            clients.append({
                                "client_id": data.get("client_id"),
                                "business_name": data.get("business_name"),
                                "tier": data.get("tier"),
                                "status": data.get("status")
                            })
                        except:
                            pass
        
        return web.json_response({"clients": clients})
    
    async def stats_handler(self, request: web.Request) -> web.Response:
        """Get client statistics"""
        client_id = request.match_info["client_id"]
        
        config = await self.client_manager.load_client(client_id)
        if not config:
            return web.json_response({"error": "Client not found"}, status=404)
        
        usage = await self.client_manager.load_usage(client_id)
        
        return web.json_response({
            "client_id": client_id,
            "business_name": config.business_name,
            "tier": config.tier,
            "status": config.status,
            "usage": usage.__dict__
        })
    
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
        
        logger.info(f"Message from {client_id}/{user_id}: {text[:50]}...")
        
        # Load client config
        config = await self.client_manager.load_client(client_id)
        if not config:
            logger.error(f"Unknown client: {client_id}")
            return web.json_response({"error": "Unknown client"}, status=404)
        
        # Check if client is active
        if config.status not in ["active", "trial"]:
            await self.telegram.send_message(
                config.telegram_token, chat_id,
                "⚠️ This service is currently unavailable. Please contact support."
            )
            return web.json_response({"status": "inactive_client"})
        
        # Check rate limit
        allowed, current, limit = await self.client_manager.check_rate_limit(client_id)
        if not allowed:
            await self.telegram.send_message(
                config.telegram_token, chat_id,
                f"⚠️ You've reached your daily message limit ({limit}/day). Please try again tomorrow."
            )
            return web.json_response({"status": "rate_limited"})
        
        try:
            # Process message
            response_text = await self._process_message(config, user_id, text)
            
            # Send response
            success = await self.telegram.send_message(
                config.telegram_token, chat_id, response_text
            )
            
            return web.json_response({"status": "ok", "sent": success})
            
        except Exception as e:
            logger.exception(f"Error processing message: {e}")
            await self.telegram.send_error_message(config.telegram_token, chat_id)
            return web.json_response({"status": "error"}, status=500)
    
    async def _process_message(self, config: ClientConfig, user_id: int, message: str) -> str:
        """Process message and generate response"""
        
        # Check message length
        if len(message) > 4000:
            return "Your message is too long. Please send a shorter message."
        
        # Classify intent
        intent, confidence = self.classifier.classify(message)
        logger.info(f"Classified intent: {intent} (confidence: {confidence:.2f})")
        
        # Try simple response first
        simple_response = self.classifier.get_simple_response(intent, config.custom_responses)
        if simple_response and confidence >= 0.8:
            await self.client_manager.update_usage(config.client_id, ai_call=False)
            return simple_response
        
        # Check if AI is enabled
        if not config.ai_enabled:
            return "I'm not able to process complex questions right now. Please contact us directly."
        
        # Get conversation history
        history = await self.client_manager.get_conversation_memory(config.client_id, str(user_id))
        
        # Build messages for OpenAI
        messages = [{"role": "system", "content": config.system_prompt}]
        
        # Add conversation history
        for msg in history:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        try:
            # Call OpenAI
            response_text, tokens, cost = await self.openai.chat_completion(
                messages=messages,
                model=config.ai_model,
                max_tokens=config.max_tokens,
                temperature=config.temperature
            )
            
            # Update usage
            await self.client_manager.update_usage(
                config.client_id, 
                ai_call=True, 
                tokens=tokens, 
                cost=cost
            )
            
            # Save to memory
            await self.client_manager.add_to_memory(
                config.client_id, str(user_id), "user", message
            )
            await self.client_manager.add_to_memory(
                config.client_id, str(user_id), "assistant", response_text
            )
            
            return response_text
            
        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            return "I'm having trouble processing your request right now. Please try again later."


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="OpenClaw AI Gateway")
    parser.add_argument("--port", "-p", type=int, default=8080, help="Port to listen on")
    parser.add_argument("--host", "-H", default="0.0.0.0", help="Host to bind to")
    args = parser.parse_args()
    
    # Check for OpenAI API key
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not set. AI responses will fail.")
    
    gateway = AIGateway()
    await gateway.start()
    
    runner = web.AppRunner(gateway.app)
    await runner.setup()
    
    site = web.TCPSite(runner, args.host, args.port)
    await site.start()
    
    print(f"""
╔════════════════════════════════════════════════════════════════╗
║           OpenClaw AI Gateway - Running                        ║
╠════════════════════════════════════════════════════════════════╣
║  Endpoint: http://{args.host}:{args.port}                        ║
║  Health:   http://{args.host}:{args.port}/health                 ║
╚════════════════════════════════════════════════════════════════╝
    """)
    
    logger.info(f"Gateway listening on {args.host}:{args.port}")
    
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
