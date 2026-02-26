# Bot Maintenance Documentation

Automated maintenance system for keeping your 24/7 bot server healthy and secure.

## 📁 Structure

```
bot-maintenance/
├── scripts/
│   ├── maintenance.sh       # Full weekly maintenance
│   ├── quick-update.sh      # Daily quick update
│   ├── update-dashboard.sh  # Update dashboard packages
│   ├── security-audit.sh    # Monthly security check
│   └── health-monitor.sh    # Continuous health monitoring
├── logs/
│   ├── maintenance_*.log    # Maintenance logs
│   ├── health.log           # Health check history
│   └── alerts.log           # Alert log
└── config/
    └── maintenance.json     # Configuration
```

## 🚀 Quick Start

### 1. Run Maintenance Manually

```bash
cd ~/workspace/bot-maintenance/scripts

# Full maintenance (weekly)
sudo bash maintenance.sh

# Quick update (daily)
sudo bash quick-update.sh

# Check health now
bash health-monitor.sh

# Security audit
bash security-audit.sh
```

### 2. Set Up Automated Schedule

```bash
# Edit crontab
crontab -e

# Add these lines:

# Full maintenance - Sunday 3am
0 3 * * 0 cd ~/workspace/bot-maintenance/scripts && sudo bash maintenance.sh

# Quick update - Daily 6am  
0 6 * * * cd ~/workspace/bot-maintenance/scripts && sudo bash quick-update.sh

# Health check - Every 5 minutes
*/5 * * * * cd ~/workspace/bot-maintenance/scripts && bash health-monitor.sh

# Security audit - 1st of month 2am
0 2 1 * * cd ~/workspace/bot-maintenance/scripts && bash security-audit.sh
```

## 📊 What Gets Maintained

### System Updates
- ✅ Ubuntu packages (apt)
- ✅ Security updates
- ✅ Kernel updates (manual review)
- ✅ System cleanup (autoremove, autoclean)

### Application Updates
- ✅ Node.js packages (dashboard)
- ✅ Python packages (pip)
- ✅ Docker images
- ✅ OpenClaw CLI

### Health Monitoring
- ✅ CPU usage
- ✅ Memory usage
- ✅ Disk space
- ✅ CPU temperature
- ✅ Service status (no-sleep, docker)
- ✅ Battery level (for solar)

### Security
- ✅ Failed login attempts
- ✅ Open ports audit
- ✅ User account review
- ✅ File permissions
- ✅ Rootkit scan (if rkhunter installed)

### Backups
- ✅ Workspace configs
- ✅ Agent data
- ✅ Skills
- ✅ Rotated (keep 7 days)

## 🔔 Alerts

Alerts are written to `logs/alerts.log` when:
- CPU > 80%
- Memory > 90%
- Disk > 85%
- Temperature > 85°C
- Service goes down
- Battery < 15% (solar setups)

### View Alerts

```bash
# Real-time alert monitoring
tail -f ~/workspace/bot-maintenance/logs/alerts.log

# Recent alerts
cat ~/workspace/bot-maintenance/logs/alerts.log | tail -20
```

## 📈 Health Log

View system health history:

```bash
# View health metrics
cat ~/workspace/bot-maintenance/logs/health.log

# View last 24 hours
tail -n 288 ~/workspace/bot-maintenance/logs/health.log

# Graph CPU usage (if gnuplot installed)
gnuplot -e "plot '< tail -n 288 ~/workspace/bot-maintenance/logs/health.log' using 0:2 with lines title 'CPU %'"
```

## 🔧 Manual Tasks

### Update Dashboard Only

```bash
cd ~/workspace/bot-maintenance/scripts
bash update-dashboard.sh
```

### Fix Security Issues

```bash
cd ~/workspace/apps/dashboard
npm audit fix
```

### Update Python Packages

```bash
# List outdated
pip3 list --outdated

# Update specific package
pip3 install --upgrade package-name

# Update all (careful!)
pip3 list --outdated --format=freeze | cut -d= -f1 | xargs -n1 pip3 install -U
```

### Clean Docker

```bash
# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Full system prune (dangerous!)
docker system prune -a -f
```

## 🛠️ Troubleshooting

### Maintenance Script Fails

```bash
# Check permissions
ls -la ~/workspace/bot-maintenance/scripts/

# Make executable
chmod +x ~/workspace/bot-maintenance/scripts/*.sh

# Run with debug
bash -x ~/workspace/bot-maintenance/scripts/maintenance.sh
```

### Disk Space Full

```bash
# Check what's using space
cd ~ && du -sh * 2>/dev/null | sort -hr | head -20

# Clean logs
find ~/workspace/bot-maintenance/logs -name "*.log" -mtime +30 -delete

# Clean old backups
find ~/.openclaw/backups -name "*.tar.gz" -mtime +14 -delete

# Docker cleanup
docker system prune -a -f
```

### High CPU/Memory

```bash
# Find heavy processes
ps aux --sort=-%cpu | head -10
ps aux --sort=-%mem | head -10

# Check Docker stats
docker stats --no-stream

# Restart heavy containers
docker restart container-name
```

### Service Won't Start

```bash
# Check service status
systemctl status no-sleep.service
systemctl status docker

# View logs
journalctl -u no-sleep.service -f

# Restart services
sudo systemctl restart no-sleep.service
sudo systemctl restart docker
```

## 📅 Recommended Schedule

| Task | Frequency | Time | Automated |
|------|-----------|------|-----------|
| Health check | Every 5 min | Continuous | ✅ Cron |
| Quick update | Daily | 6am | ✅ Cron |
| Full maintenance | Weekly | Sunday 3am | ✅ Cron |
| Security audit | Monthly | 1st, 2am | ✅ Cron |
| Reboot | Monthly | After maintenance | Manual |
| Manual review | Weekly | - | You |

## 📊 Monitoring Dashboard

View system status quickly:

```bash
# Create alias in ~/.bashrc
echo 'alias botstatus="cd ~/workspace/bot-maintenance/scripts && bash health-monitor.sh && echo \"---\" && cat ~/workspace/bot-maintenance/logs/health.log | tail -5"' >> ~/.bashrc

# Use it
botstatus
```

## 🔒 Security Notes

- Maintenance scripts run with sudo - protect your password
- Review `security-audit.sh` output monthly
- Keep config files private (chmod 600)
- Backup encryption recommended for sensitive data

---

**Result:** Your bot server stays healthy, secure, and up-to-date with minimal manual intervention! 🤖🔧
