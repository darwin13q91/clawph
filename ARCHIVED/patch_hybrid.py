#!/usr/bin/env python3
with open("/opt/openclaw/gateway/ai_gateway.py", "r") as f:
    content = f.read()

# The old code to replace
old_start_marker = "        # Check if AI is enabled for this client"
old_end_marker = "            return await self._fallback_response(client_id, message)"

new_code = '''        # Use Hybrid AI for processing
        logger.info("Processing with Hybrid AI")
        
        context = {
            "business_name": config.business_name,
            "business_type": config.business_type,
            "personality": config.personality
        }
        
        try:
            response_text, mode = await self.hybrid_ai.process(message, context)
            logger.info(f"Hybrid AI processed message with mode: {mode}")
            
            # Update stats
            self.context_manager.update_stats(client_id, ai_call=True)
            
            return response_text
            
        except Exception as e:
            logger.error(f"Hybrid AI processing failed: {e}")
            return await self._fallback_response(client_id, message)'''

# Find the section to replace
start_idx = content.find(old_start_marker)
if start_idx == -1:
    print("ERROR: Could not find start marker")
    exit(1)

# Find the end of this section - the next occurrence of the fallback return after the start
end_idx = content.find(old_end_marker, start_idx)
if end_idx == -1:
    print("ERROR: Could not find end marker")
    exit(1)

# Include the full end marker line
end_idx = content.find("\n", end_idx) + 1

# Replace the section
new_content = content[:start_idx] + new_code + "\n" + content[end_idx:]

with open("/opt/openclaw/gateway/ai_gateway.py", "w") as f:
    f.write(new_content)

print("SUCCESS: Patched ai_gateway.py")
