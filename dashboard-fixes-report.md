# Dashboard Error Fixes - 2026-03-11

## Summary
Fixed errors and failed updates in both dashboards:
- **Command Center** (Port 8888)
- **Amajungle Dashboard** (Port 8789)

## Issues Fixed

### 1. Command Center - Gateway Status API Error
**Problem:** The `/api/system-health` endpoint was returning an error for gateway status:
```json
{"gateway": {"error": "Command failed: /home/darwin/.npm-global/bin/openclaw gateway status"}}
```

**Root Cause:** The `openclaw gateway status` command failed when executed through Node.js `exec()` due to shell environment issues.

**Fix:** Replaced the command with a more reliable `pgrep` approach in `/home/darwin/.openclaw/workspace/apps/command-center/server/index.js`:
```javascript
// Before:
const { stdout: gwOutput } = await execPromise('/home/darwin/.npm-global/bin/openclaw gateway status', { timeout: 3000 });

// After:
const { stdout: pgrepOutput } = await execPromise('pgrep -f "openclaw.*gateway" | head -1', { timeout: 3000 });
```

### 2. Command Center - Logs API Returning Empty
**Problem:** The `/api/logs` endpoint was returning empty logs (`{"logs": [], "count": 0}`).

**Root Cause:** The endpoint was looking in the wrong log file path (`~/.openclaw/logs/openclaw.log`) instead of the actual location (`/tmp/openclaw/openclaw-YYYY-MM-DD.log`).

**Fix:** Updated the log file search paths in `/home/darwin/.openclaw/workspace/apps/command-center/server/index.js`:
```javascript
const logPaths = [
    `/tmp/openclaw/openclaw-${today}.log`,
    '/tmp/openclaw/openclaw.log',
    path.join(process.env.HOME || '/home/darwin', '.openclaw', 'logs', 'openclaw.log'),
];
```

### 3. Command Center - Missing `/api/agents/status` Endpoint
**Problem:** The frontend JavaScript was calling `/api/agents/status` which didn't exist (404 error).

**Fix:** Added the missing endpoint as an alias to `/api/agents` in `/home/darwin/.openclaw/workspace/apps/command-center/server/index.js`.

## Test Results

### Command Center (Port 8888)
| Endpoint | Status | Result |
|----------|--------|--------|
| `/api/status` | ✅ Working | 🟢 All Systems Operational |
| `/api/agents` | ✅ Working | 5 agents, 4 online |
| `/api/agents/status` | ✅ Working | 5 agents |
| `/api/system-health` | ✅ Working | Gateway: true, Memory: 51% |
| `/api/sessions` | ✅ Working | 7 sessions |
| `/api/activity` | ✅ Working | 2 activities |
| `/api/logs` | ✅ Working | Logs returning data |

### Amajungle Dashboard (Port 8789)
| Endpoint | Status | Result |
|----------|--------|--------|
| `/api/agents` | ✅ Working | 7 agents, 7 online |
| `/api/system-health` | ✅ Working | Gateway: true, Memory: 49% |
| `/api/inbox` | ✅ Working | 6 unread emails |
| `/api/cfo` | ✅ Working | $210 balance |
| `/api/audits/stats` | ✅ Working | 93 total audits |
| `/api/audits/queue` | ✅ Working | 0 pending |
| `/api/rapidapi/status` | ✅ Working | 23/100 API calls |

## Files Modified
- `/home/darwin/.openclaw/workspace/apps/command-center/server/index.js`

## Verification
All dashboard widgets now load correctly with real-time data updating every 15 seconds.
