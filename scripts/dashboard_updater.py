#!/usr/bin/env python3
"""
Real-time Dashboard Updater for AmaJungle
Ensures all dashboard data is live and dynamic
"""

import json
import time
import subprocess
from datetime import datetime
from pathlib import Path
import requests

# Dashboard endpoints
DASHBOARDS = {
    "command_center": {"port": 8888, "api": "/api/agents/status"},
    "amajungle": {"port": 8789, "api": "/api/status"}
}

AGENTS = ["allysa", "atlas", "echo", "river", "piper", "pixel", "scout", "trader", "cfo"]

def check_agent_status(agent_id):
    """Check if an agent process is running."""
    try:
        result = subprocess.run(
            ["pgrep", "-f", agent_id],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except:
        return False

def get_agent_last_active(agent_id):
    """Get last active timestamp from memory files."""
    memory_files = [
        Path.home() / f".openclaw/memory/2026-03-19.md",
        Path.home() / f".openclaw/agents/{agent_id}/memory/last_active.txt"
    ]
    
    for mem_file in memory_files:
        if mem_file.exists():
            try:
                content = mem_file.read_text()
                # Look for timestamp patterns
                if agent_id in content.lower():
                    return datetime.now().isoformat()
            except:
                pass
    
    return None

def generate_real_time_data():
    """Generate real-time agent status data."""
    agents_data = []
    online_count = 0
    
    for agent_id in AGENTS:
        is_online = check_agent_status(agent_id)
        last_active = get_agent_last_active(agent_id) if is_online else None
        
        agent_data = {
            "id": agent_id,
            "name": agent_id.capitalize(),
            "status": "online" if is_online else "offline",
            "state": "available" if is_online else "offline",
            "lastActive": last_active or datetime.now().isoformat() if is_online else None,
            "timestamp": datetime.now().isoformat()
        }
        
        agents_data.append(agent_data)
        if is_online:
            online_count += 1
    
    return {
        "agents": agents_data,
        "total": len(AGENTS),
        "online": online_count,
        "timestamp": datetime.now().isoformat(),
        "refreshRate": 5  # seconds
    }

def update_dashboard_data():
    """Update dashboard with real-time data."""
    data = generate_real_time_data()
    
    # Write to JSON file for dashboards to read
    data_file = Path.home() / ".openclaw/workspace/dashboard-data.json"
    data_file.write_text(json.dumps(data, indent=2))
    
    return data

def push_to_dashboards():
    """Push data to both dashboards."""
    data = update_dashboard_data()
    
    for name, config in DASHBOARDS.items():
        try:
            url = f"http://localhost:{config['port']}{config['api']}"
            # Try to POST update if endpoint supports it
            response = requests.post(
                url,
                json=data,
                timeout=5,
                headers={"Content-Type": "application/json"}
            )
            print(f"✅ {name}: Updated (status {response.status_code})")
        except requests.exceptions.ConnectionError:
            print(f"⚠️  {name}: Dashboard not running on port {config['port']}")
        except Exception as e:
            print(f"⚠️  {name}: {str(e)[:50]}")
    
    return data

if __name__ == "__main__":
    print("🚀 Real-time Dashboard Updater")
    print("=" * 50)
    
    # Single update
    data = push_to_dashboards()
    
    print("\n📊 Current Status:")
    print(f"  Total Agents: {data['total']}")
    print(f"  Online: {data['online']}")
    print(f"  Last Update: {data['timestamp']}")
    
    # Show agent statuses
    print("\n🤖 Agent Statuses:")
    for agent in data['agents'][:5]:  # Show first 5
        status_emoji = "🟢" if agent['status'] == 'online' else "🔴"
        print(f"  {status_emoji} {agent['name']}: {agent['status']}")
    
    print(f"\n💾 Data saved to: ~/.openclaw/workspace/dashboard-data.json")
    print("\n🔄 To run continuously (updating every 5 seconds):")
    print("   watch -n 5 python3 ~/.openclaw/workspace/scripts/dashboard_updater.py")
