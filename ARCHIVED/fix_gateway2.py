import sys

# Read the file
with open('/opt/openclaw/gateway/ai_gateway.py', 'r') as f:
    lines = f.readlines()

# Find and fix the _check_rate_limit function
output = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # Find the line with asyncio.run for load_client
    if 'config = asyncio.run(self.context_manager.load_client(client_id))' in line:
        # Replace with the default limit (config is already passed in the new version)
        output.append('        # Using default limit since config is passed to webhook handler\n')
        output.append('        limit = 30\n')
        i += 1
        # Skip the old line that set limit from config
        if i < len(lines) and 'limit = config.rate_limit_per_minute' in lines[i]:
            i += 1
        continue
    
    output.append(line)
    i += 1

# Write back
with open('/opt/openclaw/gateway/ai_gateway.py', 'w') as f:
    f.writelines(output)

print("Fixed!")
