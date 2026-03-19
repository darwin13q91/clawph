#!/bin/bash
# Continuous Dashboard Updater
# Runs updater every 5 seconds

while true; do
    python3 /home/darwin/.openclaw/workspace/scripts/dashboard_updater.py > /dev/null 2>&1
    sleep 5
done
