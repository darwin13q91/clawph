# Solar-Powered Ubuntu Laptop Setup

Complete guide to $0/mo operating cost for restaurant agent business.

## Hardware Shopping List

| Item | Specs | Est. Cost | Where to Buy |
|------|-------|-----------|--------------|
| **Laptop** | ThinkPad T480 (i5, 16GB RAM, 256GB SSD) | $250-350 | eBay, FB Marketplace |
| **Solar Panel** | 100W foldable (Rockpals/Jackery) | $150-200 | Amazon, REI |
| **Battery** | 200Wh portable power station | $180-250 | Amazon (Jackery/Bluetti) |
| **4G Modem** | Huawei E3372 or similar USB LTE | $30-50 | Amazon, AliExpress |
| **SIM Card** | Unlimited data plan | $40-60/mo | T-Mobile, Visible |
| **Cables** | USB-C PD, MC4 to DC adapters | $30 | Amazon |
| **Cooling** | Laptop cooling pad (solar days = hot) | $20 | Amazon |

**Total Initial: ~$700-950**

## Power Budget

### Laptop Consumption

```
Idle:        8-12W
Light load:  15-20W (1-2 agents)
Heavy load:  25-30W (5+ agents, scanning)
Average:     18W

Daily: 18W × 24h = 432Wh
```

### Solar Production

```
100W panel × 5 hours effective sun = 500Wh/day (clear day)
100W panel × 3 hours (cloudy) = 300Wh/day

Winter: ~300Wh/day
Summer: ~500Wh/day
```

### Battery Buffer

```
200Wh battery provides:
- 4-5 hours runtime without sun
- Overnight operation
- Cloudy day buffer
```

## Ubuntu Setup

### 1. Install Ubuntu Server (Minimal)

```bash
# Download Ubuntu 24.04 LTS Server
# Flash to USB with BalenaEtcher
# Install with:
# - No GUI (headless)
# - OpenSSH enabled
# - Docker selected in software

# After install, update:
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git htop
```

### 2. Power Optimization

```bash
# Install TLP for power management
sudo apt install -y tlp
sudo tlp start

# Configure:
sudo nano /etc/tlp.conf
# Set:
# CPU_SCALING_GOVERNOR_ON_AC=powersave
# CPU_SCALING_GOVERNOR_ON_BAT=powersave

# Reduce screen brightness (if using display)
echo 50 | sudo tee /sys/class/backlight/intel_backlight/brightness

# Disable Bluetooth (not needed)
sudo rfkill block bluetooth
```

### 3. Network Setup

```bash
# Auto-connect 4G modem
# Create connection profile:
sudo nmcli connection add type gsm ifname ttyUSB0 con-name 4g apn fast.t-mobile.com

# Auto-reconnect on boot
sudo nmcli connection modify 4g connection.autoconnect yes
```

### 4. Docker Optimization

```bash
# Limit Docker logging (saves disk writes)
sudo nano /etc/docker/daemon.json

{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}

sudo systemctl restart docker
```

### 5. Solar Monitoring Script

```bash
# Create battery monitoring
cat > ~/solar-monitor.sh << 'EOF'
#!/bin/bash
# Check battery level and throttle if low

BATTERY_PCT=$(cat /sys/class/power_supply/BAT0/capacity)
STATUS=$(cat /sys/class/power_supply/BAT0/status)

if [ "$BATTERY_PCT" -lt 20 ] && [ "$STATUS" = "Discharging" ]; then
    # Low battery - reduce agent load
    docker stop beach-resort  # Stop heaviest agent
    echo "$(date): Low battery - stopped beach-resort" >> ~/power.log
fi

if [ "$BATTERY_PCT" -gt 80 ] && [ "$STATUS" = "Charging" ]; then
    # High battery - restore all agents
    docker start beach-resort
    echo "$(date): Battery good - started beach-resort" >> ~/power.log
fi
EOF

chmod +x ~/solar-monitor.sh

# Run every 5 minutes via cron
crontab -e
# Add:
# */5 * * * * ~/solar-monitor.sh
```

## Daily Operations

### Morning (Check Solar)

```bash
# Check battery level
acpi -V

# Check all agents running
docker ps

# Check disk space
df -h

# Check network
ping -c 3 google.com
```

### Automated Backup

```bash
# Backup to free cloud storage
cat > ~/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)

# Backup agent data
tar czf /tmp/agents-$DATE.tar.gz ~/workspace/business/agents/

# Sync to cloud (rclone with Backblaze B2 free tier)
rclone sync /tmp/agents-$DATE.tar.gz b2:agent-backups/

# Keep only last 7 days
find /tmp -name "agents-*.tar.gz" -mtime +7 -delete
EOF

chmod +x ~/backup.sh

# Daily at 2am
crontab -e
# Add:
# 0 2 * * * ~/backup.sh
```

## Troubleshooting

### Problem: Battery draining too fast

**Solutions:**
1. Stop non-essential agents
2. Reduce scan frequency
3. Close browser tabs
4. Enable airplane mode when not needed

### Problem: No internet (4G down)

**Solutions:**
1. Check signal: `mmcli -m 0`
2. Restart modem: `sudo usb_modeswitch -R`
3. WiFi fallback: Connect to phone hotspot

### Problem: Overheating

**Solutions:**
1. Move to shade
2. Use cooling pad
3. Reduce CPU frequency: `sudo cpufreq-set -g powersave`
4. Stop heavy agents temporarily

## Cost Breakdown

| Cost Category | Monthly |
|---------------|---------|
| Electricity | $0 (solar) |
| Internet | $0 (4G included) |
| Cloud backup | $0 (free tier) |
| API calls | ~$10-30 |
| Domain | ~$1 |
| **Total** | **~$11-31/mo** |

**Revenue per client:** $500/mo

**Net margin:** ~95%

## Expansion Path

### Phase 1: Single Laptop (3-5 clients)
- Current setup
- $1,500-2,500/mo revenue

### Phase 2: Dual Laptop (8-12 clients)
- Second laptop + solar
- $5,000-6,000/mo revenue
- Load balancing between laptops

### Phase 3: Mini Data Center (20+ clients)
- Rack mount in garage/shed
- 400W solar array
- Battery bank
- $10,000+/mo revenue

## Safety Checklist

- [ ] Surge protector between solar and battery
- [ ] Battery stored in ventilated area
- [ ] Laptop elevated (airflow underneath)
- [ ] Waterproof container for rain
- [ ] Automatic shutdown if battery < 10%
- [ ] Fire extinguisher nearby (lithium battery)
- [ ] Insurance covers home business equipment

---

**Result:** A professional, multi-agent restaurant business running on 
sunlight, costing almost nothing to operate. ☀️🤖
