#!/bin/bash
# Update Gateway to v2 with Custom Responses

# Backup old version
cp /opt/openclaw/gateway/gateway.py /opt/openclaw/gateway/gateway_v1_backup.py

# Deploy new version
cp /home/darwin/.openclaw/workspace/vps/gateway/gateway_v2.py /opt/openclaw/gateway/gateway.py

# Restart service
systemctl restart openclaw-gateway
sleep 2

# Test
echo "Testing updated gateway..."
curl -s http://127.0.0.1:5000/health

echo ""
echo "✅ Gateway v2 deployed!"
echo "Features: Per-client custom responses"
echo "API: GET/POST /admin/clients/{id}/config"
