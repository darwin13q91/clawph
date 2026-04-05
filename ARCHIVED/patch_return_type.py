#!/usr/bin/env python3
with open("/opt/openclaw/gateway/ai_gateway.py", "r") as f:
    content = f.read()

# Update _process_message return type to include mode
content = content.replace(
    'async def _process_message(self, client_id: str, config: ClientConfig, \n                               message: str) -> str:',
    'async def _process_message(self, client_id: str, config: ClientConfig, \n                               message: str) -> Tuple[str, str]:'
)

# Find and update the return statements in _process_message to include mode
# First, let's find all return statements that need updating

# Replace simple response return
content = content.replace(
    '''            return simple_response
        
        # Use Hybrid AI for processing''',
    '''            return simple_response, "fast"
        
        # Use Hybrid AI for processing'''
)

# Replace Hybrid AI success return
content = content.replace(
    '''            return response_text
            
        except Exception as e:
            logger.error(f"Hybrid AI processing failed: {e}")
            return await self._fallback_response(client_id, message)''',
    '''            return response_text, mode
            
        except Exception as e:
            logger.error(f"Hybrid AI processing failed: {e}")
            fallback = await self._fallback_response(client_id, message)
            return fallback, "fallback"'''
)

with open("/opt/openclaw/gateway/ai_gateway.py", "w") as f:
    f.write(content)

print("SUCCESS: Updated _process_message to return Tuple[str, str]")
