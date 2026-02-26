#!/usr/bin/env python3
"""
OpenClaw Systems Dashboard - Pure Python HTTP Server
Uses only built-in modules (no Flask required).
"""

import json
import subprocess
import re
import os
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# Configuration
HOST = "127.0.0.1"  # Localhost only
PORT = 5000
CACHE_TTL = 3  # seconds
cache = {}

# Template path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_PATH = os.path.join(SCRIPT_DIR, "templates", "index.html")


def run_openclaw_cmd(args, json_mode=True, timeout=10):
    """Execute an OpenClaw CLI command and return parsed output."""
    cmd = ["openclaw"] + args
    if json_mode and "--json" not in args:
        cmd.append("--json")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        if result.returncode == 0:
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError:
                return {"raw": result.stdout, "parsed": parse_text_output(result.stdout)}
        else:
            return {"error": result.stderr or "Command failed", "exit_code": result.returncode}
    except subprocess.TimeoutExpired:
        return {"error": "Command timed out", "timeout": timeout}
    except FileNotFoundError:
        return {"error": "openclaw CLI not found in PATH"}
    except Exception as e:
        return {"error": str(e)}


def parse_text_output(output):
    """Parse text output from OpenClaw commands into structured data."""
    lines = output.strip().split('\n')
    return {"lines": lines, "line_count": len(lines)}


def get_cached(key, func, *args, **kwargs):
    """Simple cache wrapper."""
    now = datetime.now().timestamp()
    if key in cache:
        data, timestamp = cache[key]
        if now - timestamp < CACHE_TTL:
            return data
    
    result = func(*args, **kwargs)
    cache[key] = (result, now)
    return result


def parse_log_line(line):
    """Parse a single log line into structured format."""
    patterns = [
        r'^(?P<time>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\d\.Z+-]*)\s+(?P<level>\w+)\s+(?P<message>.*)$',
        r'^(?P<time>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(?P<level>\w+)\s+(?P<message>.*)$',
        r'^\[(?P<time>[^\]]+)\]\s+(?P<level>\w+)?\s*(?P<message>.*)$',
    ]
    
    for pattern in patterns:
        match = re.match(pattern, line)
        if match:
            return {
                "timestamp": match.group("time"),
                "level": match.group("level") or "INFO",
                "message": match.group("message").strip(),
                "raw": line
            }
    
    return {"message": line, "raw": line, "level": "UNKNOWN"}


def get_status():
    """Get OpenClaw system status."""
    status = get_cached("status", run_openclaw_cmd, ["status", "--all"])
    gateway = run_openclaw_cmd(["gateway", "status"], json_mode=False)
    
    return {
        "timestamp": datetime.now().isoformat(),
        "status": status,
        "gateway_text": gateway.get("raw", gateway.get("error", "Unknown")),
        "gateway_parsed": gateway
    }


def get_sessions():
    """Get active sessions."""
    sessions = run_openclaw_cmd(["sessions", "--all-agents"])
    return {
        "timestamp": datetime.now().isoformat(),
        "sessions": sessions
    }


def get_channels():
    """Get channel status."""
    channels_status = run_openclaw_cmd(["channels", "status"], json_mode=False)
    return {
        "timestamp": datetime.now().isoformat(),
        "channels": channels_status
    }


def get_health():
    """Get health probe results."""
    health = run_openclaw_cmd(["health"])
    return {
        "timestamp": datetime.now().isoformat(),
        "health": health
    }


def get_logs(lines="50"):
    """Get recent log entries."""
    logs = run_openclaw_cmd(["logs", "--tail", lines], json_mode=False)
    raw_logs = logs.get("raw", "")
    parsed_logs = []
    
    for line in raw_logs.split('\n')[-int(lines):]:
        if line.strip():
            parsed_logs.append(parse_log_line(line))
    
    return {
        "timestamp": datetime.now().isoformat(),
        "logs": parsed_logs,
        "raw": raw_logs if not parsed_logs else None
    }


def get_config():
    """Get OpenClaw configuration summary."""
    config_paths = [
        os.path.expanduser("~/.openclaw/openclaw.json"),
        os.path.expanduser("~/.config/openclaw/config.json"),
        os.path.expanduser("~/.openclaw/config.json")
    ]
    
    config_data = {"sources_checked": config_paths}
    
    for path in config_paths:
        try:
            with open(path, 'r') as f:
                config_data["found_at"] = path
                config_data["config"] = json.load(f)
                break
        except (FileNotFoundError, json.JSONDecodeError, PermissionError):
            continue
    
    return {
        "timestamp": datetime.now().isoformat(),
        "configuration": config_data
    }


def get_system():
    """Get system info."""
    import platform
    
    return {
        "timestamp": datetime.now().isoformat(),
        "system": {
            "platform": platform.platform(),
            "python": platform.python_version(),
            "hostname": platform.node(),
            "user": os.getenv("USER", "unknown"),
            "openclaw_workspace": "/home/darwin/.openclaw/workspace"
        }
    }


class DashboardHandler(BaseHTTPRequestHandler):
    """HTTP request handler for the dashboard."""
    
    def log_message(self, format, *args):
        """Suppress default logging."""
        pass
    
    def send_json_response(self, data, status=200):
        """Send a JSON response."""
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "http://localhost:5000")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def send_html_response(self, html, status=200):
        """Send an HTML response."""
        self.send_response(status)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(html.encode())
    
    def do_GET(self):
        """Handle GET requests."""
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        
        try:
            if path == "/":
                # Serve the main dashboard HTML
                try:
                    with open(TEMPLATE_PATH, 'r') as f:
                        html = f.read()
                    self.send_html_response(html)
                except FileNotFoundError:
                    self.send_html_response("<h1>Error: Dashboard template not found</h1>", 500)
            
            elif path == "/api/status":
                self.send_json_response(get_status())
            
            elif path == "/api/sessions":
                self.send_json_response(get_sessions())
            
            elif path == "/api/channels":
                self.send_json_response(get_channels())
            
            elif path == "/api/health":
                self.send_json_response(get_health())
            
            elif path == "/api/logs":
                lines = query.get("lines", ["50"])[0]
                self.send_json_response(get_logs(lines))
            
            elif path == "/api/config":
                self.send_json_response(get_config())
            
            elif path == "/api/system":
                self.send_json_response(get_system())
            
            else:
                self.send_json_response({"error": "Not found"}, 404)
        
        except Exception as e:
            self.send_json_response({"error": str(e)}, 500)


def main():
    """Start the dashboard server."""
    server = HTTPServer((HOST, PORT), DashboardHandler)
    
    print("=" * 60)
    print("  OpenClaw Systems Dashboard")
    print("=" * 60)
    print(f"  Local-only server: http://{HOST}:{PORT}")
    print("  Press Ctrl+C to stop")
    print("=" * 60)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
