#!/usr/bin/env python3
"""
WebSocket Server for Real-time Dashboard Updates
Provides live data feed to dashboards
"""

import asyncio
import json
import websockets
import subprocess
from datetime import datetime
from pathlib import Path

# Connected clients
clients = set()
AGENTS = ["allysa", "atlas", "echo", "river", "piper", "pixel", "scout", "trader", "cfo"]

def check_agent_status(agent_id):
    """Check if agent is running."""
    try:
        result = subprocess.run(
            ["pgrep", "-f", agent_id],
            capture_output=True,
            text=True,
            timeout=2
        )
        return result.returncode == 0
    except:
        return False

def generate_live_data():
    """Generate current agent status."""
    agents = []
    online = 0
    
    for agent_id in AGENTS:
        is_online = check_agent_status(agent_id)
        if is_online:
            online += 1
        
        agents.append({
            "id": agent_id,
            "name": agent_id.capitalize(),
            "status": "online" if is_online else "offline",
            "lastActive": datetime.now().isoformat() if is_online else None,
            "timestamp": datetime.now().isoformat()
        })
    
    return {
        "type": "agent_status",
        "agents": agents,
        "total": len(AGENTS),
        "online": online,
        "timestamp": datetime.now().isoformat()
    }

async def broadcast(data):
    """Send data to all connected clients."""
    if clients:
        message = json.dumps(data)
        await asyncio.gather(*[client.send(message) for client in clients])

async def status_updater():
    """Background task to update status every 5 seconds."""
    while True:
        data = generate_live_data()
        await broadcast(data)
        await asyncio.sleep(5)

async def handler(websocket, path):
    """Handle WebSocket connections."""
    # Register client
    clients.add(websocket)
    print(f"🔌 Client connected. Total: {len(clients)}")
    
    # Send initial data
    await websocket.send(json.dumps(generate_live_data()))
    
    try:
        async for message in websocket:
            # Handle client requests
            try:
                data = json.loads(message)
                if data.get("action") == "get_status":
                    await websocket.send(json.dumps(generate_live_data()))
            except:
                pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        clients.remove(websocket)
        print(f"🔌 Client disconnected. Total: {len(clients)}")

async def main():
    """Start WebSocket server."""
    print("🚀 Starting Real-time Dashboard WebSocket Server")
    print("=" * 50)
    print("📡 WebSocket endpoint: ws://localhost:8765")
    print("📊 Data updates every 5 seconds")
    print("=" * 50)
    
    # Start status updater
    updater_task = asyncio.create_task(status_updater())
    
    # Start WebSocket server
    server = await websockets.serve(handler, "localhost", 8765)
    
    print("\n✅ Server running! Press Ctrl+C to stop.\n")
    
    try:
        await asyncio.Future()  # Run forever
    except KeyboardInterrupt:
        print("\n🛑 Stopping server...")
        updater_task.cancel()
        server.close()
        await server.wait_closed()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Server stopped.")
