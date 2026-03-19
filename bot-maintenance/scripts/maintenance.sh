#!/bin/bash
# Bot Maintenance Master Script
# Run all maintenance tasks and log results
# Schedule via cron: 0 3 * * 0 (weekly Sunday 3am)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/../logs"
CONFIG_DIR="$SCRIPT_DIR/../config"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/maintenance_$DATE.log"

mkdir -p "$LOG_DIR"

echo "🔧 Bot Maintenance - $(date)"
echo "================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Track results
ERRORS=0
WARNINGS=0

# Helper functions
log_info() {
    echo "ℹ️  $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo "✅ $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo "⚠️  $1" | tee -a "$LOG_FILE"
    ((WARNINGS++))
}

log_error() {
    echo "❌ $1" | tee -a "$LOG_FILE"
    ((ERRORS++))
}

# 1. System Updates
log_info "1. System Package Updates"
if sudo apt update >> "$LOG_FILE" 2>&1; then
    if sudo apt upgrade -y >> "$LOG_FILE" 2>&1; then
        log_success "System packages updated"
    else
        log_warning "Some packages failed to upgrade"
    fi
else
    log_error "Failed to update package lists"
fi

# 2. Security Updates Only (critical)
log_info "2. Security Updates"
if sudo apt install -y unattended-upgrades >> "$LOG_FILE" 2>&1; then
    sudo unattended-upgrade --dry-run >> "$LOG_FILE" 2>&1 || true
    log_success "Security updates checked"
fi

# 3. Node.js Packages (Dashboard)
log_info "3. Node.js Package Updates"
if [ -f "/home/darwin/.openclaw/workspace/apps/dashboard/package.json" ]; then
    cd /home/darwin/.openclaw/workspace/apps/dashboard
    if npm outdated >> "$LOG_FILE" 2>&1; then
        log_info "Node packages up to date"
    else
        log_warning "Some Node packages outdated (check log)"
    fi
    
    # Security audit
    if npm audit --audit-level=moderate >> "$LOG_FILE" 2>&1; then
        log_success "Node security audit passed"
    else
        log_warning "Node security issues found (run 'npm audit fix')"
    fi
fi

# 4. Python Packages
log_info "4. Python Package Updates"
if command -v pip3 >/dev/null; then
    # List outdated packages
    pip3 list --outdated --format=freeze > "$LOG_DIR/pip_outdated_$DATE.txt" 2>&1 || true
    
    if [ -s "$LOG_DIR/pip_outdated_$DATE.txt" ]; then
        log_warning "Python packages outdated (see $LOG_DIR/pip_outdated_$DATE.txt)"
    else
        log_success "Python packages up to date"
    fi
fi

# 5. Docker Images
log_info "5. Docker Image Updates"
if command -v docker >/dev/null; then
    # Check for image updates
    docker images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>" | while read image; do
        docker pull "$image" >> "$LOG_FILE" 2>&1 || log_warning "Failed to pull $image"
    done
    
    # Clean up old images
    docker image prune -f >> "$LOG_FILE" 2>&1
    log_success "Docker images updated"
fi

# 6. OpenClaw CLI
log_info "6. OpenClaw CLI Update"
if command -v openclaw >/dev/null; then
    CURRENT_VERSION=$(openclaw --version 2>&1 || echo "unknown")
    log_info "Current OpenClaw: $CURRENT_VERSION"
    
    # Check for updates (npm package)
    if npm outdated -g openclaw >> "$LOG_FILE" 2>&1; then
        log_info "OpenClaw up to date"
    else
        log_info "Updating OpenClaw..."
        if sudo npm install -g openclaw@latest >> "$LOG_FILE" 2>&1; then
            NEW_VERSION=$(openclaw --version 2>&1 || echo "unknown")
            log_success "OpenClaw updated: $CURRENT_VERSION → $NEW_VERSION"
        else
            log_error "Failed to update OpenClaw"
        fi
    fi
fi

# 7. Skill Updates
log_info "7. Skill Updates"
SKILLS_DIR="/home/darwin/.openclaw/workspace/skills"
if [ -d "$SKILLS_DIR" ]; then
    for skill in "$SKILLS_DIR"/*; do
        if [ -d "$skill/.git" ]; then
            cd "$skill"
            if git pull >> "$LOG_FILE" 2>&1; then
                log_success "Updated skill: $(basename $skill)"
            fi
        fi
    done
fi

# 8. System Cleanup
log_info "8. System Cleanup"
sudo apt autoremove -y >> "$LOG_FILE" 2>&1 || true
sudo apt autoclean >> "$LOG_FILE" 2>&1 || true
sudo journalctl --vacuum-time=7d >> "$LOG_FILE" 2>&1 || true
log_success "System cleaned"

# 9. Health Check
log_info "9. System Health Check"

# Disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    log_warning "Disk usage high: ${DISK_USAGE}%"
else
    log_success "Disk usage OK: ${DISK_USAGE}%"
fi

# Memory
MEM_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
if [ "$MEM_USAGE" -gt 90 ]; then
    log_warning "Memory usage high: ${MEM_USAGE}%"
else
    log_success "Memory usage OK: ${MEM_USAGE}%"
fi

# CPU temp (if sensors available)
if command -v sensors >/dev/null; then
    CPU_TEMP=$(sensors 2>/dev/null | grep -i 'core\|temp' | head -1 | awk '{print $2}' | sed 's/+//;s/°C//')
    if [ -n "$CPU_TEMP" ] && [ "${CPU_TEMP%.*}" -gt 80 ]; then
        log_warning "CPU temperature high: ${CPU_TEMP}°C"
    else
        log_success "CPU temperature OK: ${CPU_TEMP}°C"
    fi
fi

# Check services
for service in no-sleep docker; do
    if systemctl is-active "$service" >/dev/null 2>&1; then
        log_success "Service running: $service"
    else
        log_warning "Service not running: $service"
    fi
done

# 10. Backup Critical Data
log_info "10. Backup Critical Data"
BACKUP_DIR="/home/darwin/.openclaw/backups"
mkdir -p "$BACKUP_DIR"

# Backup workspace configs
tar czf "$BACKUP_DIR/workspace_config_$DATE.tar.gz" \
    /home/darwin/.openclaw/workspace/core/ \
    /home/darwin/.openclaw/workspace/business/agents/ \
    2>&1

# Keep only last 7 backups
find "$BACKUP_DIR" -name "workspace_config_*.tar.gz" -mtime +7 -delete 2>&1

log_success "Backup created: $BACKUP_DIR/workspace_config_$DATE.tar.gz"

# Summary
echo "" | tee -a "$LOG_FILE"
echo "================================" | tee -a "$LOG_FILE"
echo "📊 Maintenance Summary" | tee -a "$LOG_FILE"
echo "================================" | tee -a "$LOG_FILE"
echo "Completed: $(date)" | tee -a "$LOG_FILE"
echo "Duration: $(ps -o etime= -p $$)" | tee -a "$LOG_FILE"
echo "Errors: $ERRORS" | tee -a "$LOG_FILE"
echo "Warnings: $WARNINGS" | tee -a "$LOG_FILE"
echo "Log: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ All maintenance tasks completed successfully!" | tee -a "$LOG_FILE"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  Maintenance completed with warnings" | tee -a "$LOG_FILE"
    exit 0
else
    echo "❌ Maintenance completed with errors" | tee -a "$LOG_FILE"
    exit 1
fi
