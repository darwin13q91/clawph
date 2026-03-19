#!/bin/bash
# System Health Monitor
# Run continuously or via cron every 5 minutes

ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEM=90
ALERT_THRESHOLD_DISK=85
ALERT_THRESHOLD_TEMP=85

LOG_FILE="/home/darwin/.openclaw/workspace/bot-maintenance/logs/health.log"
ALERT_FILE="/home/darwin/.openclaw/workspace/bot-maintenance/logs/alerts.log"

mkdir -p "$(dirname $LOG_FILE)"

# Get current metrics
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 || echo "0")
MEM_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | cut -d',' -f1 | xargs)

# Get temperature if available
CPU_TEMP="N/A"
if command -v sensors >/dev/null; then
    CPU_TEMP=$(sensors 2>/dev/null | grep -E 'Core 0|Package id 0' | head -1 | awk '{print $3}' | sed 's/+//;s/°C//' | cut -d'.' -f1)
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log metrics
echo "$TIMESTAMP CPU:${CPU_USAGE}% MEM:${MEM_USAGE}% DISK:${DISK_USAGE}% TEMP:${CPU_TEMP}°C LOAD:${LOAD_AVG}" >> "$LOG_FILE"

# Check thresholds and alert
alert() {
    echo "🚨 $TIMESTAMP $1" | tee -a "$ALERT_FILE"
    # Optional: Send notification
    # notify-send "Bot Alert" "$1" 2>/dev/null || true
}

# CPU check
if (( $(echo "$CPU_USAGE > $ALERT_THRESHOLD_CPU" | bc -l) )); then
    alert "HIGH CPU: ${CPU_USAGE}% (threshold: ${ALERT_THRESHOLD_CPU}%)"
fi

# Memory check
if [ "$MEM_USAGE" -gt "$ALERT_THRESHOLD_MEM" ]; then
    alert "HIGH MEMORY: ${MEM_USAGE}% (threshold: ${ALERT_THRESHOLD_MEM}%)"
fi

# Disk check
if [ "$DISK_USAGE" -gt "$ALERT_THRESHOLD_DISK" ]; then
    alert "LOW DISK SPACE: ${DISK_USAGE}% used (threshold: ${ALERT_THRESHOLD_DISK}%)"
fi

# Temperature check
if [ -n "$CPU_TEMP" ] && [ "$CPU_TEMP" != "N/A" ]; then
    if [ "$CPU_TEMP" -gt "$ALERT_THRESHOLD_TEMP" ]; then
        alert "HIGH TEMPERATURE: ${CPU_TEMP}°C (threshold: ${ALERT_THRESHOLD_TEMP}°C)"
        # Emergency: stop heavy containers
        docker stop beach-resort 2>/dev/null || true
    fi
fi

# Check critical services
for service in no-sleep docker; do
    if ! systemctl is-active "$service" >/dev/null 2>&1; then
        alert "SERVICE DOWN: $service"
        # Try to restart
        sudo systemctl restart "$service" 2>/dev/null || true
    fi
done

# Check if we're running on battery (for solar setup)
if [ -f /sys/class/power_supply/BAT0/status ]; then
    BATTERY_STATUS=$(cat /sys/class/power_supply/BAT0/status)
    BATTERY_PERCENT=$(cat /sys/class/power_supply/BAT0/capacity)
    
    if [ "$BATTERY_STATUS" = "Discharging" ] && [ "$BATTERY_PERCENT" -lt 15 ]; then
        alert "LOW BATTERY: ${BATTERY_PERCENT}% - System may shutdown soon"
    fi
fi

# Keep only last 10000 log entries
tail -n 10000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
