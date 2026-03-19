#!/bin/bash

# Trading Platform Startup Script
# Usage: ./start.sh [dev|prod]

MODE=${1:-dev}
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$DIR"

if [ "$MODE" = "dev" ]; then
    echo "Starting Trading Platform in DEVELOPMENT mode..."
    echo ""
    echo "Terminal 1: Starting backend server..."
    gnome-terminal -- bash -c "cd $DIR && npm run server:dev; exec bash" 2>/dev/null || \
    xterm -e "cd $DIR && npm run server:dev" 2>/dev/null || \
    (cd "$DIR" && npm run server:dev &)
    
    sleep 2
    
    echo "Terminal 2: Starting frontend dev server..."
    gnome-terminal -- bash -c "cd $DIR && npm run dev; exec bash" 2>/dev/null || \
    xterm -e "cd $DIR && npm run dev" 2>/dev/null || \
    (cd "$DIR" && npm run dev)
    
elif [ "$MODE" = "prod" ]; then
    echo "Starting Trading Platform in PRODUCTION mode..."
    npm start
else
    echo "Usage: ./start.sh [dev|prod]"
    exit 1
fi