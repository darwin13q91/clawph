#!/bin/bash
#
# Start/Stop script for OpenClaw AI Gateway
#

set -e

CLIENT_MGMT_DIR="/home/darwin/.openclaw/workspace/client-management"
PIDFILE="/tmp/openclaw-gateway.pid"
LOGFILE="$CLIENT_MGMT_DIR/logs/gateway-service.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_ok() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check Python and dependencies
check_deps() {
    if ! command -v python3 > /dev/null 2>&1; then
        log_error "Python 3 is required but not installed"
        exit 1
    fi
    
    # Check for aiohttp
    if ! python3 -c "import aiohttp" 2>/dev/null; then
        log_warn "aiohttp not installed. Installing..."
        pip3 install -r "$CLIENT_MGMT_DIR/requirements.txt"
    fi
    
    # Check for OpenAI API key
    if [[ -z "$OPENAI_API_KEY" ]]; then
        log_warn "OPENAI_API_KEY not set. Gateway will not be able to process AI requests."
        log_info "Set it with: export OPENAI_API_KEY='your-key-here'"
    fi
}

# Start gateway
start() {
    log_info "Starting OpenClaw AI Gateway..."
    
    check_deps
    
    if [[ -f "$PIDFILE" ]]; then
        local pid=$(cat "$PIDFILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_warn "Gateway is already running (PID: $pid)"
            return
        else
            rm -f "$PIDFILE"
        fi
    fi
    
    mkdir -p "$CLIENT_MGMT_DIR/logs"
    
    # Start gateway in background
    cd "$CLIENT_MGMT_DIR"
    nohup python3 gateway.py >> "$LOGFILE" 2>&1 &
    local pid=$!
    
    echo $pid > "$PIDFILE"
    
    # Wait a moment and check if it's running
    sleep 2
    if kill -0 "$pid" 2>/dev/null; then
        log_ok "Gateway started (PID: $pid)"
        log_info "Health check: http://localhost:8080/health"
        log_info "Logs: tail -f $LOGFILE"
    else
        log_error "Gateway failed to start"
        rm -f "$PIDFILE"
        exit 1
    fi
}

# Stop gateway
stop() {
    log_info "Stopping OpenClaw AI Gateway..."
    
    if [[ -f "$PIDFILE" ]]; then
        local pid=$(cat "$PIDFILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            rm -f "$PIDFILE"
            log_ok "Gateway stopped"
        else
            log_warn "Gateway was not running"
            rm -f "$PIDFILE"
        fi
    else
        log_warn "No PID file found"
        # Try to find and kill process anyway
        local pids=$(pgrep -f "gateway.py" || true)
        if [[ -n "$pids" ]]; then
            echo "$pids" | xargs kill 2>/dev/null || true
            log_ok "Gateway stopped (found running processes)"
        fi
    fi
}

# Check status
status() {
    if [[ -f "$PIDFILE" ]]; then
        local pid=$(cat "$PIDFILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_ok "Gateway is running (PID: $pid)"
            
            # Try health check
            if curl -s http://localhost:8080/health > /dev/null 2>&1; then
                log_ok "Health check passed"
            else
                log_warn "Health check failed"
            fi
        else
            log_warn "Gateway is not running (stale PID file)"
            rm -f "$PIDFILE"
        fi
    else
        # Check if running without PID file
        local pids=$(pgrep -f "gateway.py" || true)
        if [[ -n "$pids" ]]; then
            log_ok "Gateway is running (PIDs: $pids)"
            echo "$pids" > "$PIDFILE"
        else
            log_warn "Gateway is not running"
        fi
    fi
}

# Restart gateway
restart() {
    stop
    sleep 1
    start
}

# Show logs
logs() {
    if [[ -f "$LOGFILE" ]]; then
        tail -f "$LOGFILE"
    else
        log_warn "No log file found at $LOGFILE"
    fi
}

# Show usage
usage() {
    echo "OpenClaw AI Gateway Service"
    echo ""
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start    Start the gateway"
    echo "  stop     Stop the gateway"
    echo "  restart  Restart the gateway"
    echo "  status   Check gateway status"
    echo "  logs     Show gateway logs"
    echo ""
    echo "Environment:"
    echo "  OPENAI_API_KEY    Required for AI processing"
    echo "  PORT              Gateway port (default: 8080)"
}

# Main
case "${1:-}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    *)
        usage
        exit 1
        ;;
esac
