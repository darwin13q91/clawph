# OpenClaw Systems Dashboard

A local-only web dashboard for monitoring your OpenClaw installation.

![Dashboard Preview](preview.png)

## Features

- **System Overview** — Gateway status, uptime, version info
- **Active Sessions** — Real-time session list with activity metrics  
- **Channel Health** — WhatsApp, Telegram, and other channel statuses
- **Live Logs** — Streaming log tail with filtering
- **Auto-refresh** — Polling updates every 5 seconds

## Quick Start

```bash
cd dashboard
./start.sh
```

Then open **http://127.0.0.1:5000** in your browser.

Or run directly:

```bash
python3 app.py
```

## Requirements

- **Python 3.7+** (no external packages needed!)
- **OpenClaw CLI** installed and available in PATH

## Architecture

| Component | Technology |
|-----------|------------|
| Backend | Pure Python (`http.server`) |
| Frontend | Vanilla HTML/CSS/JS |
| Data Source | OpenClaw CLI commands |

Zero dependencies. Uses only Python standard library modules.

## Security

- **Localhost only** — Binds to `127.0.0.1`, no external access
- **No authentication** — Not needed for local-only access
- **Read-only** — Dashboard only reads OpenClaw state, doesn't modify

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/status` | Gateway and system status |
| `GET /api/sessions` | Active sessions across all agents |
| `GET /api/channels` | Channel health status |
| `GET /api/health` | Health probe results |
| `GET /api/logs?lines=50` | Recent log entries (parsed) |
| `GET /api/config` | Configuration file summary |
| `GET /api/system` | Host system information |

All responses are JSON with a `timestamp` field.

## Troubleshooting

### "openclaw CLI not found"
Make sure `openclaw` is in your PATH:
```bash
which openclaw
openclaw --version
```

### Dashboard shows "Unknown" for everything
The Gateway might not be running. Start it:
```bash
openclaw gateway --port 18789
```

### Port 5000 already in use
Edit `app.py` and change `PORT = 5000` to another port.

## File Structure

```
dashboard/
├── app.py              # Python HTTP server + API
├── start.sh            # Convenience startup script
├── requirements.txt    # Documentation (no deps needed)
├── README.md           # This file
└── templates/
    └── index.html      # Dashboard UI
```

## License

MIT — Part of your OpenClaw workspace.
