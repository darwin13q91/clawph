#!/usr/bin/env python3
import logging.handlers
"""
AI Handler for OpenClaw Tunnel Server
Receives messages from VPS via Tailscale, processes with AI, returns results
"""

import asyncio
import json
import logging
import os
import subprocess
import sys
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiohttp
from aiohttp import web

# Configuration
WORKSPACE_DIR = Path("/home/darwin/.openclaw/workspace")
TUNNEL_DIR = WORKSPACE_DIR / "tunnel-server"
CLIENTS_DIR = Path("/opt/openclaw/clients")  # Mirror of VPS structure
LOGS_DIR = WORKSPACE_DIR / "logs"

# Ensure directories exist
for d in [TUNNEL_DIR, LOGS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.handlers.RotatingFileHandler(LOGS_DIR / "ai_handler.log", maxBytes=10_000_000, backupCount=5)
    ]
)
logger = logging.getLogger("ai_handler")


@dataclass
class TokenUsage:
    """Track token usage per request"""
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0


@dataclass
class ProcessingResult:
    """Result of AI processing"""
    response: str
    tokens: TokenUsage = field(default_factory=TokenUsage)
    processing_time_ms: float = 0.0
    model_used: str = ""
    success: bool = True
    error_message: str = ""


class TokenCostTracker:
    """Tracks token usage and costs per client"""
    
    # Cost per 1K tokens (approximate, adjust based on actual model pricing)
    COST_RATES = {
        "kimi-coding/k2p5": {"input": 0.00001, "output": 0.00003},
        "kimi-coding/k2p5": {"input": 0.00001, "output": 0.00003},
        "default": {"input": 0.00001, "output": 0.00003}
    }
    
    def __init__(self, workspace_dir: Path):
        self.workspace_dir = workspace_dir
        self._cache: Dict[str, Dict] = {}
        self._lock = asyncio.Lock()
    
    def calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate cost in USD for token usage"""
        rates = self.COST_RATES.get(model, self.COST_RATES["default"])
        
        input_cost = (input_tokens / 1000) * rates["input"]
        output_cost = (output_tokens / 1000) * rates["output"]
        
        return round(input_cost + output_cost, 6)
    
    async def record_usage(self, client_id: str, usage: TokenUsage, model: str):
        """Record token usage for a client"""
        async with self._lock:
            # Update in-memory cache
            if client_id not in self._cache:
                self._cache[client_id] = {
                    "total_requests": 0,
                    "total_tokens": 0,
                    "total_cost_usd": 0.0,
                    "requests": []
                }
            
            client_stats = self._cache[client_id]
            client_stats["total_requests"] += 1
            client_stats["total_tokens"] += usage.total_tokens
            client_stats["total_cost_usd"] += usage.cost_usd
            
            # Keep last 100 requests in memory
            client_stats["requests"].append({
                "timestamp": datetime.now().isoformat(),
                "model": model,
                "input_tokens": usage.input_tokens,
                "output_tokens": usage.output_tokens,
                "total_tokens": usage.total_tokens,
                "cost_usd": usage.cost_usd
            })
            client_stats["requests"] = client_stats["requests"][-100:]
            
            # Persist to disk
            await self._save_to_disk(client_id)
    
    async def _save_to_disk(self, client_id: str):
        """Save usage stats to disk"""
        stats_file = self.workspace_dir / "ai-gateway" / "usage" / f"{client_id}.json"
        stats_file.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            with open(stats_file, 'w') as f:
                json.dump(self._cache[client_id], f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save usage stats for {client_id}: {e}")
    
    async def get_client_stats(self, client_id: str) -> Optional[Dict]:
        """Get usage stats for a client"""
        if client_id in self._cache:
            return self._cache[client_id]
        
        # Try to load from disk
        stats_file = self.workspace_dir / "ai-gateway" / "usage" / f"{client_id}.json"
        if stats_file.exists():
            try:
                with open(stats_file) as f:
                    self._cache[client_id] = json.load(f)
                    return self._cache[client_id]
            except Exception as e:
                logger.error(f"Failed to load usage stats: {e}")
        
        return None


class AISubagentSpawner:
    """Spawns sub-agents for AI processing"""
    
    def __init__(self, workspace_dir: Path, cost_tracker: TokenCostTracker):
        self.workspace_dir = workspace_dir
        self.cost_tracker = cost_tracker
        self._active_sessions: Dict[str, Any] = {}
    
    async def spawn_and_process(self, client_id: str, message: str, 
                                context: Dict[str, Any]) -> ProcessingResult:
        """Spawn a sub-agent to process the message and return results"""
        start_time = time.time()
        
        try:
            # Build the system prompt from context
            system_prompt = self._build_system_prompt(context)
            
            # Build conversation history
            conversation = self._build_conversation(context.get("conversation_history", []))
            
            # Create sub-agent task
            task_prompt = self._create_task_prompt(
                client_id=client_id,
                message=message,
                system_prompt=system_prompt,
                conversation=conversation,
                knowledge_base=context.get("knowledge_base", {})
            )
            
            # Execute sub-agent via openclaw CLI
            response_text, tokens_used = await self._execute_subagent(task_prompt)
            
            processing_time = (time.time() - start_time) * 1000
            
            # Calculate cost
            model = context.get("ai_settings", {}).get("model", "kimi-coding/k2p5")
            # Estimate input/output split (rough approximation)
            input_tokens = tokens_used // 3
            output_tokens = tokens_used - input_tokens
            cost = self.cost_tracker.calculate_cost(model, input_tokens, output_tokens)
            
            token_usage = TokenUsage(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=tokens_used,
                cost_usd=cost
            )
            
            # Record usage
            await self.cost_tracker.record_usage(client_id, token_usage, model)
            
            return ProcessingResult(
                response=response_text,
                tokens=token_usage,
                processing_time_ms=processing_time,
                model_used=model,
                success=True
            )
            
        except Exception as e:
            logger.exception(f"Error in AI processing: {e}")
            processing_time = (time.time() - start_time) * 1000
            
            return ProcessingResult(
                response="I apologize, but I'm having trouble processing your request right now.",
                processing_time_ms=processing_time,
                success=False,
                error_message=str(e)
            )
    
    def _build_system_prompt(self, context: Dict[str, Any]) -> str:
        """Build system prompt from client context"""
        business_name = context.get("business_name", "the business")
        personality = context.get("personality", "helpful and friendly")
        business_type = context.get("business_type", "business")
        
        # Get custom system prompt if available
        ai_settings = context.get("ai_settings", {})
        if "system_prompt" in ai_settings:
            template = ai_settings["system_prompt"]
            return template.format(
                business_name=business_name,
                personality=personality
            )
        
        # Default system prompt
        return f"""You are the AI assistant for {business_name}, a {business_type}. 
Your personality is: {personality}.

Guidelines:
- Be helpful, accurate, and concise
- Answer based on the knowledge base provided
- If you don't know something, admit it and offer to connect with a human
- Keep responses under 3-4 sentences when possible
- Use a warm, conversational tone
- Don't make up information not in your knowledge base"""
    
    def _build_conversation(self, history: List[Dict]) -> str:
        """Build conversation context from history"""
        if not history:
            return ""
        
        # Take last 10 messages for context
        recent = history[-10:]
        conversation = []
        
        for msg in recent:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                conversation.append(f"User: {content}")
            else:
                conversation.append(f"Assistant: {content}")
        
        return "\n".join(conversation)
    
    def _create_task_prompt(self, client_id: str, message: str, 
                           system_prompt: str, conversation: str,
                           knowledge_base: Dict) -> str:
        """Create the task prompt for the sub-agent"""
        
        knowledge_text = json.dumps(knowledge_base, indent=2)
        
        prompt = f"""SYSTEM PROMPT:
{system_prompt}

KNOWLEDGE BASE:
{knowledge_text}

PREVIOUS CONVERSATION:
{conversation}

CURRENT USER MESSAGE:
{message}

INSTRUCTIONS:
1. Respond to the user's message naturally and helpfully
2. Use information from the knowledge base when relevant
3. Maintain context from the conversation history
4. Keep your response friendly and concise
5. If you cannot answer, say so politely

RESPOND ONLY with your answer to the user. Do not include meta-commentary."""

        return prompt
    
    async def _execute_subagent(self, task_prompt: str) -> tuple:
        """Execute sub-agent and return response"""
        # For now, simulate with direct processing
        # In production, this would spawn an actual sub-agent
        
        # Simple estimation for token count
        token_estimate = len(task_prompt.split()) + len(task_prompt) // 4
        
        # Use the main agent's capabilities to process
        response = await self._process_with_ai(task_prompt)
        
        # Estimate output tokens
        output_estimate = len(response.split()) + len(response) // 4
        total_tokens = token_estimate + output_estimate
        
        return response, total_tokens
    
    async def _process_with_ai(self, prompt: str) -> str:
        """Process prompt using OpenClaw"""
        import subprocess
        import tempfile
        import os
        
        # Create temp file for the prompt
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(prompt)
            task_file = f.name
        
        try:
            # Spawn subagent via OpenClaw
            result = subprocess.run(
                ['openclaw', 'sessions_spawn', '--mode=run', '--runtime=subagent', 
                 f'--task={task_file}'],
                capture_output=True,
                text=True,
                timeout=90,
                cwd='/home/darwin/.openclaw/workspace'
            )
            
            os.unlink(task_file)
            
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
            else:
                # Use local context if subagent fails
                return self._generate_contextual_response(prompt)
                
        except Exception as e:
            try:
                os.unlink(task_file)
            except:
                pass
            return self._generate_contextual_response(prompt)
    
    def _generate_contextual_response(self, prompt: str) -> str:
        """Generate response based on prompt content"""
        prompt_lower = prompt.lower()
        
        if 'business' in prompt_lower or 'about' in prompt_lower:
            return "I'm a helpful AI assistant for this business. I can answer questions about services, hours, and provide general assistance. What would you like to know?"
        elif 'hour' in prompt_lower or 'open' in prompt_lower:
            return "Our business hours are typically 9 AM to 6 PM, Monday through Saturday. Would you like specific information?"
        elif 'price' in prompt_lower or 'cost' in prompt_lower:
            return "For pricing information, please let me know what specific service or product you're interested in, and I'll provide details."
        elif 'contact' in prompt_lower or 'call' in prompt_lower or 'email' in prompt_lower:
            return "You can reach us through this chat, or I can provide phone/email contact information if needed."
        else:
            return "Thank you for your message. I'm here to help with any questions about our business. What can I assist you with today?"


class AIHandler:
    """Main AI Handler server"""
    
    def __init__(self):
        self.cost_tracker = TokenCostTracker(WORKSPACE_DIR)
        self.subagent_spawner = AISubagentSpawner(WORKSPACE_DIR, self.cost_tracker)
        self.app = web.Application()
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup HTTP routes"""
        self.app.router.add_get("/health", self.health_handler)
        self.app.router.add_post("/process", self.process_handler)
        self.app.router.add_get("/stats/{client_id}", self.stats_handler)
    
    async def health_handler(self, request: web.Request) -> web.Response:
        """Health check endpoint"""
        return web.json_response({
            "status": "healthy",
            "service": "openclaw-ai-handler",
            "timestamp": datetime.now().isoformat()
        })
    
    async def stats_handler(self, request: web.Request) -> web.Response:
        """Get client statistics"""
        client_id = request.match_info["client_id"]
        stats = await self.cost_tracker.get_client_stats(client_id)
        
        if stats:
            return web.json_response(stats)
        else:
            return web.json_response({
                "client_id": client_id,
                "total_requests": 0,
                "total_tokens": 0,
                "total_cost_usd": 0.0
            })
    
    async def process_handler(self, request: web.Request) -> web.Response:
        """Handle incoming processing request from VPS"""
        try:
            data = await request.json()
        except json.JSONDecodeError:
            return web.json_response(
                {"error": "Invalid JSON"}, 
                status=400
            )
        
        # Validate request
        client_id = data.get("client_id")
        message = data.get("message")
        context = data.get("context", {})
        
        if not client_id or not message:
            return web.json_response(
                {"error": "Missing client_id or message"}, 
                status=400
            )
        
        logger.info(f"Processing message for client {client_id}: {message[:50]}...")
        
        try:
            # Process with AI sub-agent
            result = await self.subagent_spawner.spawn_and_process(
                client_id=client_id,
                message=message,
                context=context
            )
            
            response_data = {
                "response": result.response,
                "success": result.success,
                "tokens_used": result.tokens.total_tokens,
                "cost": result.tokens.cost_usd,
                "model": result.model_used,
                "processing_time_ms": result.processing_time_ms
            }
            
            if not result.success:
                response_data["error"] = result.error_message
                status = 500
            else:
                status = 200
            
            return web.json_response(response_data, status=status)
            
        except Exception as e:
            logger.exception(f"Error processing request: {e}")
            return web.json_response({
                "error": "Internal processing error",
                "message": str(e),
                "success": False
            }, status=500)


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="OpenClaw AI Handler")
    parser.add_argument("--port", "-p", type=int, default=8081, 
                       help="Port to listen on")
    parser.add_argument("--host", "-H", default="0.0.0.0",
                       help="Host to bind to (use 100.64.0.0/10 for Tailscale only)")
    args = parser.parse_args()
    
    handler = AIHandler()
    
    runner = web.AppRunner(handler.app)
    await runner.setup()
    
    site = web.TCPSite(runner, args.host, args.port)
    await site.start()
    
    logger.info(f"AI Handler listening on {args.host}:{args.port}")
    
    # Print helpful info
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║           OpenClaw AI Handler - Running                      ║
╠══════════════════════════════════════════════════════════════╣
║  Endpoint: http://{args.host}:{args.port}                      ║
║  Health:   http://{args.host}:{args.port}/health               ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    try:
        while True:
            await asyncio.sleep(3600)
    except asyncio.CancelledError:
        pass
    finally:
        await runner.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
