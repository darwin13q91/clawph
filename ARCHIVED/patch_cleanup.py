#!/usr/bin/env python3
with open("/opt/openclaw/gateway/ai_gateway.py", "r") as f:
    content = f.read()

# Find and remove the duplicate old tunnel code
old_tunnel_code = '''        # Forward to local OpenClaw for AI processing
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
'''

if old_tunnel_code in content:
    content = content.replace(old_tunnel_code, "")
    with open("/opt/openclaw/gateway/ai_gateway.py", "w") as f:
        f.write(content)
    print("SUCCESS: Removed duplicate tunnel code")
else:
    print("WARNING: Could not find duplicate code to remove")
    # Print what we're looking for for debugging
    print("Looking for:", repr(old_tunnel_code[:100]))
