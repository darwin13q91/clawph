# OpenClaw Systems Dashboard

A secure, local-only monitoring dashboard for your OpenClaw installation.

## Features

- **🔒 Local-only** — Binds exclusively to `127.0.0.1`, never exposed externally
- **🛡️ Secret Redaction** — Automatically masks API keys, tokens, passwords
- **📊 Live State** — Real-time updates every 15s with exponential backoff
- **🎨 Fidelity UI** — Matches the exact mock-up structure and styling

## Quick Start

```bash
cd openclaw-systems-dashboard
npm install
npm start
```

Then open **http://127.0.0.1:8789** in your browser.

## Development

```bash
npm run dev    # Development mode with debug endpoints
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8789` | HTTP server port |
| `HOST` | `127.0.0.1` | **Must be loopback** — server refuses non-localhost |
| `NODE_ENV` | — | Set to `development` for debug endpoints |

### Model Stack Override

If OpenClaw's JSON doesn't provide enough detail, create:

```bash
server/config/model-stack.override.json
```

Example:

```json
{
  "models": [
    {
      "id": "claude-opus-4",
      "name": "Claude Opus",
      "alias": "opus",
      "role": "Primary Agent",
      "badge": "Paid",
      "isPrimary": true
    },
    {
      "id": "gpt-4o",
      "name": "GPT-4o",
      "alias": "gpt",
      "role": "Fallback",
      "badge": "Paid",
      "isPrimary": false
    }
  ]
}
```

The dashboard overlays live data (like `isPrimary`) on top of this base config.

## API Endpoints

### `GET /api/summary`

Main dashboard data endpoint. Returns:

```json
{
  "generatedAt": "2026-02-26T20:58:00.000Z",
  "agentName": "main",
  "gateway": {
    "running": true,
    "bind": "127.0.0.1",
    "port": 18789,
    "pid": 12345,
    "rpcOk": true
  },
  "stats": {
    "modelsCount": 3,
    "cronCount": 5,
    "channelsCount": 2,
    "sessionLife": "60m"
  },
  "models": [...],
  "cronJobs": [...],
  "channels": [...],
  "pipeline": [...],
  "features": [...],
  "health": {
    "state": "ok",
    "reasons": []
  }
}
```

All sensitive fields are automatically redacted.

### `GET /api/debug` (dev only)

Debug information when running in development mode.

## Security

### Binding Validation

The server **refuses to start** if `HOST` is not a loopback address:

- ✅ `127.0.0.1`, `localhost`, `::1`, `127.*.*.*`
- ❌ `0.0.0.0`, `192.168.*.*`, public IPs

### Secret Redaction

The following patterns are automatically masked in all API responses:

- `token`, `secret`, `api_key`, `password`
- `cookie`, `oauth`, `authorization`, `bearer`
- `credential`, `private_key`, `refresh_token`
- Base64 strings >40 chars
- Hex strings >32 chars

Example redaction:

```json
// Before
{ "apiKey": "sk-abc123xyz789supersecrettoken" }

// After
{ "apiKey": "sk-a••••" }
```

### CLI Allowlist

Only these OpenClaw commands are executed:

- `openclaw status --json`
- `openclaw status --all`
- `openclaw cron list --json --all`
- `openclaw cron runs --json`
- `openclaw channels list --json`
- `openclaw channels status`
- `openclaw agents list --json`
- `openclaw hooks list --json`
- `openclaw gateway status`
- `openclaw health --json`
- `openclaw sessions --all-agents --json`

No arbitrary command execution is possible.

## UI Structure

The dashboard follows the exact mock-up structure:

```
.card (1080px max)
├── .header
│   ├── h1: "OpenClaw"
│   └── .header-subtitle: "[AGENT_NAME] — Personal AI Agent..."
├── .stats-row (4 tiles)
├── .section: AI Model Stack
│   └── .model-grid → .model-card
├── .section: Automated Cron Jobs
│   └── .cron-list → .cron-item
├── .section: Real-Time Gmail Pipeline
│   └── .pipeline → .pipeline-node
├── .section: Communication Channels
│   └── .channel-row → .channel-chip
├── .section: Key Features
│   └── .features-grid → .feature-item
└── .footer
```

## Auto-Refresh Behavior

- **Success**: Refreshes every 15 seconds
- **Failure**: Exponential backoff (15s → 30s → 60s → ... → max 2 minutes)
- **Stale indicator**: Shows "Stale" with red dot when updates fail

## Health States

| State | Color | Meaning |
|-------|-------|---------|
| `ok` | Green | All systems operational |
| `warn` | Yellow | 1-2 issues detected |
| `down` | Red | Multiple failures or data collection failed |

## Troubleshooting

### "Refusing to start on non-loopback address"

You've set `HOST` to something other than `127.0.0.1`. This is a security feature.

### Dashboard shows "Unknown" for everything

Check that OpenClaw is running:

```bash
openclaw gateway status
```

### Port 8789 already in use

```bash
PORT=8790 npm start
```

## Sample Redacted Response

See `server/sample-response.json` for a full example of the redacted API response format.

## License

MIT — Part of your OpenClaw workspace.
