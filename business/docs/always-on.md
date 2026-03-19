# 24/7 Always-On Server Configuration

Prevent Ubuntu laptop from sleeping - critical for restaurant agents handling customer messages at any time.

## Quick Start

```bash
cd business/infra
sudo bash always-on.sh
```

This will:
- ✅ Mask sleep/suspend/hibernate targets
- ✅ Ignore lid close (keep running when closed)
- ✅ Disable screen blanking
- ✅ Configure TLP for server mode
- ✅ Install keepalive script
- ✅ Set up no-sleep systemd service

## What It Does

### 1. Systemd Sleep Targets

Prevents system from entering sleep states:
```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

### 2. Lid Close Behavior

Closing laptop lid does NOTHING:
```ini
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
```

### 3. TLP Power Management

Optimized for 24/7 server operation:
- No sleep on AC or battery
- Performance governor when plugged in
- USB autosuspend disabled (keeps modems active)
- Bluetooth disabled

### 4. No-Sleep Service

Systemd service that blocks sleep using `systemd-inhibit`:
```bash
sudo systemctl enable --now no-sleep.service
```

This is the nuclear option - actively prevents ANY sleep attempt.

### 5. Keepalive Script

Runs every minute to simulate activity:
```cron
* * * * * /usr/local/bin/keepalive.sh
```

Prevents "idle" detection that might trigger sleep.

## Verification

Check if properly configured:

```bash
bash business/infra/check-always-on.sh
```

Expected output:
```
✅ Sleep target is masked/disabled
✅ Lid close = ignore
✅ TLP sleep disabled on AC
✅ Console blanking disabled
✅ no-sleep.service is running
✅ Keepalive cron job installed

✅ System is configured for 24/7 operation!
```

## Manual Verification

### Test 1: Check sleep availability
```bash
cat /sys/power/state
```
Should NOT show `mem` (memory sleep).

### Test 2: Check lid behavior
```bash
systemctl show systemd-logind -p HandleLidSwitch
```
Should show `ignore`.

### Test 3: Check no-sleep service
```bash
systemctl status no-sleep.service
```
Should show `active (running)`.

### Test 4: Simulate lid close (SAFE TEST)
```bash
# This just checks the setting, doesn't actually close lid
sudo dbus-send --system --print-reply --dest=org.freedesktop.login1 /org/freedesktop/login1 org.freedesktop.DBus.Properties.Get string:org.freedesktop.login1.Manager string:HandleLidSwitch
```

## Important Safety Notes

### ⚠️ Overheating Risk

Running 24/7 with lid closed can cause overheating:

**Solutions:**
1. **Use a laptop cooling pad** ($20)
2. **Keep vents clear** - don't put laptop on soft surfaces
3. **Monitor temperature:**
   ```bash
   watch -n 5 sensors
   ```
4. **Thermal shutdown script** (automatic):
   ```bash
   # Add to crontab
   # Shutdown if CPU > 90°C
   */5 * * * * [ $(cat /sys/class/thermal/thermal_zone*/temp | sort -rn | head -1) -gt 90000 ] && shutdown -h now
   ```

### ⚠️ Battery Safety

Never leave lithium battery charging unattended 24/7 without:
- Battery management system (BMS)
- Temperature monitoring
- Fire extinguisher nearby

**For solar setup:** Use external battery (Jackery/Bluetti) with built-in BMS instead of laptop battery.

### ⚠️ Data Corruption Risk

If laptop dies (battery drain), agents might lose state.

**Solutions:**
1. **Battery backup threshold:**
   ```bash
   # Auto-shutdown at 10% battery (graceful)
   echo 'SUBSYSTEM=="power_supply", ATTR{status}=="Discharging", ATTR{capacity}=="10", RUN+="/sbin/shutdown -h now"' | sudo tee /etc/udev/rules.d/99-low-battery.rules
   ```

2. **Persistent storage:** Agent data in Docker volumes (survives restart)

3. **Cloud backup:** Daily backup to cloud storage

## Troubleshooting

### Problem: Still going to sleep

```bash
# Check what's triggering sleep
journalctl | grep -i sleep
journalctl | grep -i suspend

# Force reload all configs
sudo systemctl daemon-reload
sudo systemctl restart systemd-logind
sudo systemctl restart no-sleep.service
```

### Problem: Overheating

```bash
# Check CPU temp
sensors

# Emergency: Stop heaviest agent
docker stop beach-resort

# Reduce CPU frequency
sudo cpufreq-set -g powersave
```

### Problem: No-sleep service failed

```bash
# Check logs
sudo journalctl -u no-sleep.service -f

# Reinstall
sudo cp infra/no-sleep.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now no-sleep.service
```

## Reverting Changes

If you need to restore normal laptop behavior:

```bash
# Unmask sleep targets
sudo systemctl unmask sleep.target suspend.target hibernate.target hybrid-sleep.target

# Restore logind config
sudo rm /etc/systemd/logind.conf.d/no-sleep.conf
sudo systemctl restart systemd-logind

# Stop services
sudo systemctl stop no-sleep.service
sudo systemctl disable no-sleep.service
sudo rm /etc/systemd/system/no-sleep.service

# Remove cron
(crontab -l | grep -v keepalive.sh) | crontab -

# Reboot
sudo reboot
```

## Performance Expectations

| State | CPU Usage | Power Draw | Temperature |
|-------|-----------|------------|-------------|
| Idle (no agents) | 5-10% | 8-12W | 40-50°C |
| Light (1-2 agents) | 15-25% | 15-20W | 50-60°C |
| Busy (3-5 agents) | 30-50% | 20-30W | 60-75°C |
| Peak (scanning + agents) | 60-80% | 25-35W | 70-85°C |

**Safe operating range:** 40-80°C sustained
**Thermal throttling starts:** ~85°C
**Emergency shutdown:** 90°C

## Monitoring

Check system health:
```bash
# Temperature + frequency
watch -n 2 'sensors | grep -E "Core|temp" && cat /proc/cpuinfo | grep MHz | head -1'

# Power consumption (if available)
cat /sys/class/power_supply/BAT0/power_now 2>/dev/null | awk '{print $1/1000000 "W"}'

# Uptime (should be days/weeks)
uptime -p
```

---

**Result:** Your laptop stays awake 24/7, agents never miss a customer message, even with lid closed, on solar power alone. ☀️🖥️
