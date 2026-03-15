#!/usr/bin/env python3
"""
Fix gateway.py by inserting root route properly
"""

import re

with open('/opt/openclaw/gateway/gateway.py', 'r') as f:
    content = f.read()

# First restore from backup if needed
if 'def root():' in content and '@app.route' in content:
    print("Route already exists, checking...")
else:
    # Insert before if __name__
    insert_code = '''\n@app.route('/')
def root():
    return jsonify({
        'service': 'OpenClaw Multi-Tenant Gateway',
        'status': 'running',
        'version': 'v1',
        'endpoints': {
            'health': '/health',
            'admin': '/admin/clients',
            'webhook': '/webhook/<client_id>'
        },
        'clients': len(client_manager.clients),
        'ssl': True
    })

'''
    
    # Find and replace
    new_content = content.replace("if __name__ == '__main__':", insert_code + "if __name__ == '__main__':")
    
    with open('/opt/openclaw/gateway/gateway.py', 'w') as f:
        f.write(new_content)
    
    print("✅ Root route added!")

print("Now run: systemctl restart openclaw-gateway")
