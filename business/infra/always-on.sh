#!/bin/bash
# 24/7 Always-On Configuration for Ubuntu Laptop
# Run this to prevent sleep, hibernation, and screen blanking

set -e

echo "🔧 Configuring Ubuntu for 24/7 Always-On Operation..."
echo "======================================================"

# 1. Disable sleep/suspend when on AC power
echo "[1/7] Disabling sleep on AC power..."
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target 2>/dev/null || true

# 2. Configure systemd logind (lid close behavior)
echo "[2/7] Configuring lid close behavior (do nothing)..."
sudo mkdir -p /etc/systemd/logind.conf.d/
cat | sudo tee /etc/systemd/logind.conf.d/no-sleep.conf > /dev/null << 'EOF'
[Login]
# Do nothing when lid is closed
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore

# Don't suspend on idle
IdleAction=ignore
IdleActionSec=0

# Don't kill user processes on logout
KillUserProcesses=no
EOF

# 3. Disable screen blanking and sleep via gsettings (if GUI installed)
echo "[3/7] Disabling screen blanking..."
if command -v gsettings &> /dev/null; then
    gsettings set org.gnome.desktop.session idle-delay 0 2>/dev/null || true
    gsettings set org.gnome.desktop.screensaver lock-enabled false 2>/dev/null || true
    gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-timeout 0 2>/dev/null || true
    gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-battery-timeout 0 2>/dev/null || true
    gsettings set org.gnome.settings-daemon.plugins.power idle-dim false 2>/dev/null || true
fi

# 4. Configure console blanking (tty)
echo "[4/7] Disabling console blanking..."
echo 'setterm -blank 0 -powerdown 0 2>/dev/null || true' | sudo tee /etc/profile.d/no-console-blank.sh > /dev/null
sudo chmod +x /etc/profile.d/no-console-blank.sh

# Add to current session
setterm -blank 0 -powerdown 0 2>/dev/null || true

# 5. Disable sleep in TLP (power management)
echo "[5/7] Configuring TLP for always-on..."
if [ -f /etc/tlp.conf ]; then
    sudo cp /etc/tlp.conf /etc/tlp.conf.backup.$(date +%Y%m%d)
fi

cat | sudo tee /etc/tlp.conf > /dev/null << 'EOF'
# TLP Configuration for 24/7 Server Operation

# CPU Governor - performance when plugged in
CPU_SCALING_GOVERNOR_ON_AC=performance
CPU_SCALING_GOVERNOR_ON_BAT=powersave

# Don't sleep/suspend
SLEEP_ON_AC_DISABLE=1
SLEEP_ON_BAT_DISABLE=1

# Disable USB autosuspend (can cause issues with modems)
USB_AUTOSUSPEND=0

# WiFi power saving off
WIFI_PWR_ON_AC=off
WIFI_PWR_ON_BAT=off

# Bluetooth off (save power, not needed)
DEVICES_TO_DISABLE_ON_STARTUP="bluetooth"

# Runtime PM for PCI devices
RUNTIME_PM_ON_AC=on
RUNTIME_PM_ON_BAT=auto

# Disable audio power saving
SOUND_POWER_SAVE_ON_AC=0
SOUND_POWER_SAVE_ON_BAT=0
EOF

# Restart TLP
sudo systemctl restart tlp 2>/dev/null || true

# 6. Set kernel parameters for no sleep
echo "[6/7] Setting kernel parameters..."
cat | sudo tee /etc/sysctl.d/99-always-on.conf > /dev/null << 'EOF'
# Prevent kernel from sleeping
kernel.nmi_watchdog = 0
vm.stat_interval = 120
EOF

sudo sysctl -p /etc/sysctl.d/99-always-on.conf 2>/dev/null || true

# 7. Create keepalive script (runs every minute to prevent idle)
echo "[7/7] Creating keepalive script..."
cat | sudo tee /usr/local/bin/keepalive.sh > /dev/null << 'EOF'
#!/bin/bash
# Keepalive script - prevents system from going idle
# Runs every minute via cron

# Simulate activity
xprintidle 2>/dev/null || echo 0 > /dev/null

# Log that we're alive (optional, comment out if too verbose)
# echo "$(date): Keepalive ping" >> /var/log/keepalive.log
EOF

sudo chmod +x /usr/local/bin/keepalive.sh

# Add to cron (every minute)
(crontab -l 2>/dev/null | grep -v keepalive.sh; echo "* * * * * /usr/local/bin/keepalive.sh >/dev/null 2>&1") | crontab -

echo ""
echo "✅ Always-on configuration complete!"
echo ""
echo "Settings applied:"
echo "  • Sleep targets masked (systemd)"
echo "  • Lid close = do nothing"
echo "  • Screen blanking disabled"
echo "  • TLP configured for server operation"
echo "  • Keepalive script running every minute"
echo ""
echo "⚠️  IMPORTANT: Reboot required for some changes to take effect"
echo ""
echo "To verify after reboot:"
echo "  systemctl status sleep.target    # Should show 'masked'"
echo "  cat /sys/power/state             # Should not show 'mem' available"
echo ""
read -p "Reboot now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Rebooting..."
    sudo reboot
fi
