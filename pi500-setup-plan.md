# Pi 500 Home Server — Setup Plan

**Device:** Raspberry Pi 500 (16GB RAM, 256GB NVMe)
**Price:** $286
**Goal:** Dedicated always-on Amajungle server — eliminates laptop dependency

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Raspberry Pi 500 (16GB)   ← always-on                 │
│                                                         │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │ Ollama       │  │ OpenClaw   │  │ Dashboard    │ │
│  │ Phi-3 7B     │  │ Node       │  │ + CRM        │ │
│  │ Mistral 7B   │  │ (agents)   │  │ (Node.js)    │ │
│  └──────────────┘  └─────────────┘  └──────────────┘ │
│                                                         │
│  Cron: PhilGEPS • Echo • Heartbeats                    │
│  Tailscale: remote access                              │
└─────────────────────────────────────────────────────────┘
         │
         ▼
    MiniMax ◄───── Laptop (Telegram UI)
    (complex)
```

---

## Phase 1 — OS & Base Setup

### 1.1 Flash Raspberry Pi OS
- Download Raspberry Pi Imager
- OS: **Raspberry Pi OS (64-bit) — Debian Bookworm**
- Image to microSD card (or install directly to NVMe)
- Enable SSH, set hostname: `amajungle-pi`
- Set strong password for `pi` user

### 1.2 First Boot & Updates
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y vim git curl htop tree ufw fail2ban
```

### 1.3 Static IP (or DHCP reservation)
- Reserve IP on router: `192.168.1.50` → `amajungle-pi`
- Or set static in `/etc/dhcpcd.conf`

### 1.4 SSH Hardening
```bash
# Disable password auth (use SSH keys only)
sudo vim /etc/ssh/sshd_config
# Set: PasswordAuthentication no
# Set: PermitRootLogin no
sudo systemctl restart sshd

# Add your public key
ssh-copy-id pi@192.168.1.50
```

### 1.5 Disk Space
- NVMe mounted at `/mnt/nvme` (256GB)
- Symlink: `~/data → /mnt/nvme`
- Use for: databases, logs, Ollama models

---

## Phase 2 — Ollama (Local LLMs)

### 2.1 Install Ollama
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2.2 Pull Models
```bash
# Fast, lightweight — for simple tasks
ollama pull phi3:3.8b

# Medium — good balance of speed/quality
ollama pull mistral:7b

# Optional: coding assistant
ollama pull codellama:7b
```

### 2.3 Configure Ollama
```bash
# Make accessible over LAN
sudo systemctl edit ollama
# Add: Environment="OLLAMA_HOST=0.0.0.0"
sudo systemctl restart ollama
```

### 2.4 Verify
```bash
curl http://localhost:11434/api/tags
```

---

## Phase 3 — OpenClaw Node

### 3.1 Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # should be v20.x
```

### 3.2 Install OpenClaw
```bash
npm install -g openclaw
openclaw --version
```

### 3.3 Configure as Node (not gateway)
```bash
# On Pi, configure as a node that connects to your laptop's gateway
openclaw node setup
# This generates a node config with a pairing token

# On laptop, approve the node:
openclaw node approve <nodename>
```

### 3.4 Test Agent Spawn on Pi
```bash
# From laptop, spawn a test agent targeting the Pi node
openclaw agents spawn --node amajungle-pi --agent atlas
```

---

## Phase 4 — Dashboard & CRM

### 4.1 Move Dashboard to Pi
```bash
# On Pi
mkdir -p ~/amajungle/apps/dashboard
# rsync from laptop or git clone
git clone https://github.com/amajungle/dashboard ~/amajungle/apps/dashboard

cd ~/amajungle/apps/dashboard
npm install
npm run build
```

### 4.2 Setup as Service
```bash
sudo vim /etc/systemd/system/amajungle-dashboard.service
```

```ini
[Unit]
Description=Amajungle Dashboard
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/amajungle/apps/dashboard
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable amajungle-dashboard
sudo systemctl start amajungle-dashboard
sudo systemctl status amajungle-dashboard
```

---

## Phase 5 — Always-On Cron Jobs

### 5.1 PhilGEPS Monitor
- Already installed in workspace: `~/.openclaw/skills/philgeps-monitor/`
- Setup cron: every 6 hours or as needed
```bash
# Edit crontab
crontab -e
# Add:
0 */6 * * * /home/pi/.npm-global/lib/node_modules/openclaw/skills/philgeps-monitor/run.sh >> /home/pi/logs/philgeps.log 2>&1
```

### 5.2 Echo (Inbound Support)
- Already configured as cron in OpenClaw
- Ensure cron is active: `openclaw cron list`

### 5.3 Heartbeat Checks
- Update HEARTBEAT.md to use Pi as the primary heartbeat runner
- Laptop becomes optional — Pi handles all scheduled checks

---

## Phase 6 — Remote Access (Tailscale)

### 6.1 Install Tailscale
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --accept-routes
```

### 6.2 Access from Anywhere
```bash
# From laptop, SSH via Tailscale
ssh pi@100.x.x.x  # Pi's Tailscale IP
```

### 6.3 Funnel (if behind NAT)
```bash
# On Pi — expose OpenClaw node via Tailscale funnel
sudo tailscale funnel 8080
# Dashboard now accessible at: https://amajungle-pi.tailxxxx.ts.net
```

---

## Phase 7 — Backup Strategy

### 7.1 Backup Cron
```bash
# Nightly backup of CRM and agent memory
0 3 * * * rsync -avz /home/pi/amajungle/data/ pi@192.168.1.100:/backup/pi-backup/
```

### 7.2 Critical Files to Backup
- `~/.openclaw/` — agent configs, skills
- `~/.openclaw/.env` — API keys (encrypted)
- `~/amajungle/apps/dashboard/data/crm.db`
- `~/proactivity/` and `~/self-improving/`

---

## Phase 8 — Testing & Validation

### 8.1 Connectivity Tests
- [ ] SSH to Pi from laptop: `ssh pi@192.168.1.50`
- [ ] Tailscale ping: `tailscale ping 100.x.x.x`
- [ ] Ollama from laptop: `curl http://192.168.1.50:11434/api/tags`
- [ ] Dashboard accessible: `http://192.168.1.50:8789`

### 8.2 Agent Tests
- [ ] Spawn Atlas on Pi node
- [ ] Spawn Scout on Pi node
- [ ] Echo cron fires correctly
- [ ] PhilGEPS monitor runs

### 8.3 Failover Test
- [ ] Turn off laptop — confirm Pi continues running
- [ ] Telegram still routes to Pi node
- [ ] Dashboard still serves

---

## Time Estimate

| Phase | Effort | Time |
|-------|--------|------|
| Phase 1 — OS & Base | 30 min | Setup + first boot |
| Phase 2 — Ollama | 20 min | Install + pull models |
| Phase 3 — OpenClaw Node | 30 min | Install + pair with laptop |
| Phase 4 — Dashboard | 30 min | Migrate + service setup |
| Phase 5 — Cron Jobs | 15 min | Configure + test |
| Phase 6 — Tailscale | 15 min | Install + expose |
| Phase 7 — Backup | 20 min | Scripts + scheduling |
| Phase 8 — Testing | 30 min | Full validation |

**Total: ~3–4 hours** (half day project)

---

## Prerequisites Before Starting

- [ ] microSD card (16GB+ recommended for OS)
- [ ] Raspberry Pi Imager installed on laptop
- [ ] SSH key generated on laptop (`ssh-keygen`)
- [ ] Tailscale account (free tier)
- [ ] Ethernet cable handy (faster than WiFi for NVMe + agents)
- [ ] Router access for static IP or DHCP reservation
