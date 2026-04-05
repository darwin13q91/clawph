# OpenClaw AI Gateway - Simple Deploy

## Quick Start (3 Steps)

### Step 1: Install Local Handler (Laptop)
```bash
cd /home/darwin/.openclaw/workspace/ai-gateway
chmod +x install-local.sh
./install-local.sh
```

This will:
- Install dependencies
- Fix logging issues
- Create systemd service
- Auto-start on boot

**Verify:** `sudo systemctl status ai-handler`

---

### Step 2: Copy Files to VPS
```bash
cd /home/darwin/.openclaw/workspace/ai-gateway
sshpass -p 'aiopsflow13!ED' scp -r . root@157.245.152.57:/opt/openclaw/ai-gateway/
```

---

### Step 3: Deploy on VPS
```bash
# SSH to VPS
ssh root@157.245.152.57

# Run deploy
cd /opt/openclaw/ai-gateway
chmod +x deploy-vps.sh
./deploy-vps.sh
```

**First time:** It will install Tailscale and ask you to authenticate.

**Then run again:** After authenticating Tailscale.

---

### Step 4: Enable AI for Your Client
```bash
# On VPS
sudo /opt/openclaw/scripts/enable-ai-for-client.sh client_0b70f519a29c45c1
```

---

### Step 5: Test!
Message your bot on Telegram:
- "Tell me about your business"
- Should get AI-powered response!

---

## Check Status

```bash
cd /home/darwin/.openclaw/workspace/ai-gateway
./status.sh
```

---

## Troubleshooting

### Handler not running?
```bash
sudo systemctl restart ai-handler
sudo journalctl -u ai-handler -n 20
```

### Tailscale not connected?
```bash
sudo tailscale up
```

### Gateway not responding?
```bash
# On VPS
sudo systemctl restart ai-gateway
sudo journalctl -u ai-gateway -n 20
```

---

## Files Created

| File | Purpose |
|------|---------|
| `ai-handler.service` | Systemd service for local handler |
| `install-local.sh` | One-command local install |
| `deploy-vps.sh` | One-command VPS deploy |
| `status.sh` | Check all systems |

---

## Architecture

```
User → Telegram → VPS Gateway → Tailscale → Local Handler → Sub-Agent → Reply
```

**Costs:** Only when AI is used (complex queries)
**Simple queries:** Free (cached responses)

---

## Next Steps

1. Test with 1 client
2. Monitor costs (check `stats.json`)
3. Add more clients
4. Scale up!

Good luck! 🚀
