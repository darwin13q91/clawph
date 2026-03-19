#!/usr/bin/env python3
"""
Quick Diagnostic Script
Location: ~/.openclaw/workspace/scripts/debug-check.py
Run before debugging any agent script to confirm environment is sane
"""

import sys
import os
from pathlib import Path

def run_diagnostics():
    """Run basic environment diagnostics."""
    print("=" * 50)
    print("PYTHON DEBUG ENVIRONMENT CHECK")
    print("=" * 50)
    print()
    
    # Python info
    print(f"Python: {sys.version}")
    print(f"Executable: {sys.executable}")
    print()
    
    # Paths
    print(f"CWD: {os.getcwd()}")
    print(f"Script: {__file__}")
    print(f"Home: {Path.home()}")
    
    # OpenClaw workspace
    workspace = Path.home() / ".openclaw" / "workspace"
    print(f"OpenClaw workspace: {workspace}")
    print(f"Workspace exists: {workspace.exists()}")
    print()
    
    # Check critical env vars
    print("Environment Variables:")
    critical_vars = [
        "KIMI_API_KEY",
        "GEMINI_API_KEY", 
        "TELEGRAM_BOT_TOKEN",
        "TELEGRAM_CHAT_ID",
        "IMAP_PASS",
        "SMTP_PASS"
    ]
    
    for var in critical_vars:
        val = os.environ.get(var)
        if val:
            # Mask the value for security
            masked = val[:4] + "..." + val[-4:] if len(val) > 8 else "***"
            print(f"  ✅ {var}: {masked}")
        else:
            print(f"  ❌ {var}: NOT SET")
    
    print()
    print("=" * 50)
    print("Check complete")

if __name__ == "__main__":
    run_diagnostics()
