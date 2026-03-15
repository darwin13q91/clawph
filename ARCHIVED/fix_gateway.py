import re

# Read the file
with open('/opt/openclaw/gateway/ai_gateway.py', 'r') as f:
    content = f.read()

# Fix 1: Change _check_rate_limit to accept config parameter
old_method = '''    def _check_rate_limit(self, client_id: str, user_id: int) -> bool:
        """Check if user has exceeded rate limit"""
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
        return True'''

new_method = '''    def _check_rate_limit(self, client_id: str, user_id: int, config) -> bool:
        """Check if user has exceeded rate limit"""
        key = f"{client_id}:{user_id}"
        now = time.time()
        window = 60  # 1 minute
        
        if key not in self._rate_limits:
            self._rate_limits[key] = []
        
        # Clean old entries
        self._rate_limits[key] = [t for t in self._rate_limits[key] if now - t < window]
        
        # Get limit from config
        limit = config.rate_limit_per_minute if config else 30
        
        if len(self._rate_limits[key]) >= limit:
            return False
        
        self._rate_limits[key].append(now)
        return True'''

content = content.replace(old_method, new_method)

# Fix 2: Update the call to pass config
old_call = '''        # Check rate limit
        if not self._check_rate_limit(client_id, user_id):'''

new_call = '''        # Check rate limit
        if not self._check_rate_limit(client_id, user_id, config):'''

content = content.replace(old_call, new_call)

# Write back
with open('/opt/openclaw/gateway/ai_gateway.py', 'w') as f:
    f.write(content)

print("Fixed!")
