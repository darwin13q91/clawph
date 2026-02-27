#!/bin/bash
# Command Center Auto-Restart Script
# Keeps the server running 24/7

APP_DIR="/home/darwin/.openclaw/workspace/apps/command-center"
LOG_FILE="/home/darwin/.openclaw/workspace/apps/command-center/logs/server.log"
PID_FILE="/tmp/command-center.pid"

cd "$APP_DIR"

# Create logs directory
mkdir -p "$APP_DIR/logs"

# Function to check if running
check_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            return 0  # Running
        fi
    fi
    return 1  # Not running
}

# Function to start server
start_server() {
    echo "[$(date)] Starting Command Center..." >> "$LOG_FILE"
    nohup node server/index.js >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "[$(date)] Started with PID: $!" >> "$LOG_FILE"
}

# Function to stop server
stop_server() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        kill "$PID" 2>/dev/null
        rm -f "$PID_FILE"
        echo "[$(date)] Stopped server" >> "$LOG_FILE"
    fi
}

# Main loop
while true; do
    if ! check_running; then
        echo "[$(date)] Server not running, restarting..." >> "$LOG_FILE"
        start_server
    fi
    
    # Check every 10 seconds
    sleep 10
done
