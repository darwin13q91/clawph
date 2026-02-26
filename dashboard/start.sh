#!/bin/bash
# Start the OpenClaw Systems Dashboard

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "========================================"
echo "  OpenClaw Systems Dashboard"
echo "========================================"
echo ""
echo "Starting server on http://127.0.0.1:5000"
echo ""
echo "Press Ctrl+C to stop"
echo "========================================"
echo ""

python3 app.py
