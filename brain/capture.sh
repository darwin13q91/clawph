#!/bin/bash
# Quick capture to second brain
# Usage: capture "your note here" [category]

BRAIN_DIR="/home/darwin/.openclaw/workspace/brain"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)

echo "✅ Captured at $TIME"
