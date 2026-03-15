const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);
const OPENCLAW_BIN = '/home/darwin/.npm-global/bin/openclaw';
const PORT = 8888;
const HOST = '0.0.0.0';

// Helper function to get active subagent runs
function getActiveSubagentRuns() {
  try {
    const runsPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'subagents', 'runs.json');
    if (!fs.existsSync(runsPath)) {
      return {};
    }
    
    const content = fs.readFileSync(runsPath, 'utf8');
    const data = JSON.parse(content);
    const runs = Object.values(data.runs || {});
    const now = Date.now();
    
    // Find active runs (started but not ended)
    const activeRuns = runs.filter(r => r.startedAt && !r.endedAt);
    
    // Group by agent name
    const agentActivity = {};
    activeRuns.forEach(run => {
      const sessionKey = run.childSessionKey || '';
      const match = sessionKey.match(/agent:([^:]+):subagent/);
      if (match) {
        const agentName = match[1].toLowerCase();
        if (!agentActivity[agentName]) {
          agentActivity[agentName] = [];
        }
        agentActivity[agentName].push({
          runId: run.runId,
          label: run.label,
          startedAt: run.startedAt,
          duration: now - run.startedAt
        });
      }
    });
    
    return agentActivity;
  } catch (err) {
    console.warn('Error reading runs.json:', err.message);
    return {};
  }
}

// Serve static files
function serveFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// Run Python aggregator
async function getAggregatedData() {
    try {
        const { stdout } = await execPromise('python3 server/aggregator.py --json', {
            cwd: '/home/darwin/.openclaw/workspace/apps/command-center',
            timeout: 15000
        });
        return JSON.parse(stdout);
    } catch (error) {
        console.error('Aggregator error:', error);
        return { error: 'Failed to aggregate data', timestamp: new Date().toISOString() };
    }
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API endpoint
    if (pathname === '/api/status') {
        const data = await getAggregatedData();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
    }
    
    // GET /api/agents - Return agent statuses from actual agent processes
    if (pathname === '/api/agents') {
        try {
            // Check actual running processes
            const { stdout: psOutput } = await execPromise('ps aux | grep -E "(echo_monitor|store_analyzer|audit_handler|health_monitor|openclaw-gateway)" | grep -v grep');
            const ps = psOutput || '';
            
            // Get active subagent runs
            const activeRuns = getActiveSubagentRuns();
            
            // Define known agents with live process checks
            const agents = [
                { id: 'master', name: 'Allysa', role: 'Master Orchestrator', icon: '🧠', check: 'openclaw-gateway' },
                { id: 'atlas', name: 'Atlas', role: 'Infrastructure & DevOps', icon: '🏛️', check: 'health_monitor' },
                { id: 'echo', name: 'Echo', role: 'Email Monitor', icon: '📧', check: 'echo_monitor' },
                { id: 'river', name: 'River', role: 'Amazon Specialist', icon: '🌊', check: 'store_analyzer' },
                { id: 'piper', name: 'Piper', role: 'Communications', icon: '📨', check: 'audit_handler' },
                { id: 'pixel', name: 'Pixel', role: 'UX/UI Designer', icon: '🎨', check: 'openclaw-gateway' }
            ];
            
            // Enrich agents with live status
            const enrichedAgents = agents.map(agent => {
                const agentId = agent.id.toLowerCase();
                const runs = activeRuns[agentId] || [];
                const isRunning = ps.includes(agent.check);
                const isWorking = runs.length > 0 || (agentId === 'master' && isRunning);
                
                return {
                    id: agent.id,
                    name: agent.name,
                    role: agent.role,
                    icon: agent.icon,
                    status: isRunning ? 'online' : 'offline',
                    state: agent.id === 'master' ? 'active' : isWorking ? 'working' : (isRunning ? 'available' : 'offline'),
                    processing: isWorking,
                    lastActive: isWorking ? new Date().toISOString() : null,
                    bindings: isRunning ? 1 : 0,
                    isDefault: agent.id === 'master',
                    activeRuns: runs.length,
                    currentTask: runs.length > 0 ? runs[0].label : null
                };
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                timestamp: new Date().toISOString(),
                agents: enrichedAgents,
                total: enrichedAgents.length,
                online: enrichedAgents.filter(a => a.status === 'online').length,
                activeSessions: Object.values(activeRuns).flat().length
            }));
        } catch (err) {
            console.error('Agents API error:', err);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                timestamp: new Date().toISOString(),
                agents: []
            }));
        }
        return;
    }
    
    // GET /api/agents/status - Alias for /api/agents (for backward compatibility)
    if (pathname === '/api/agents/status') {
        try {
            // Check actual running processes
            const { stdout: psOutput } = await execPromise('ps aux | grep -E "(echo_monitor|store_analyzer|audit_handler|health_monitor|openclaw-gateway)" | grep -v grep');
            const ps = psOutput || '';
            
            // Get active subagent runs
            const activeRuns = getActiveSubagentRuns();
            
            // Define known agents with live process checks
            const agents = [
                { id: 'master', name: 'Allysa', role: 'Master Orchestrator', icon: '🧠', check: 'openclaw-gateway' },
                { id: 'atlas', name: 'Atlas', role: 'Infrastructure & DevOps', icon: '🏛️', check: 'health_monitor' },
                { id: 'echo', name: 'Echo', role: 'Email Monitor', icon: '📧', check: 'echo_monitor' },
                { id: 'river', name: 'River', role: 'Amazon Specialist', icon: '🌊', check: 'store_analyzer' },
                { id: 'piper', name: 'Piper', role: 'Communications', icon: '📨', check: 'audit_handler' },
                { id: 'pixel', name: 'Pixel', role: 'UX/UI Designer', icon: '🎨', check: 'openclaw-gateway' }
            ];
            
            // Enrich agents with live status
            const enrichedAgents = agents.map(agent => {
                const agentId = agent.id.toLowerCase();
                const runs = activeRuns[agentId] || [];
                const isRunning = ps.includes(agent.check);
                const isWorking = runs.length > 0 || (agentId === 'master' && isRunning);
                
                return {
                    id: agent.id,
                    name: agent.name,
                    role: agent.role,
                    icon: agent.icon,
                    status: isRunning ? 'online' : 'offline',
                    state: agent.id === 'master' ? 'active' : isWorking ? 'working' : (isRunning ? 'available' : 'offline'),
                    processing: isWorking,
                    lastActive: isWorking ? new Date().toISOString() : null,
                    bindings: isRunning ? 1 : 0,
                    isDefault: agent.id === 'master',
                    activeRuns: runs.length,
                    currentTask: runs.length > 0 ? runs[0].label : null
                };
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                timestamp: new Date().toISOString(),
                agents: enrichedAgents,
                total: enrichedAgents.length,
                online: enrichedAgents.filter(a => a.status === 'online').length,
                activeSessions: Object.values(activeRuns).flat().length
            }));
        } catch (err) {
            console.error('Agents status API error:', err);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                timestamp: new Date().toISOString(),
                agents: []
            }));
        }
        return;
    }
    
    // GET /api/system-health - Return live system metrics
    if (pathname === '/api/system-health') {
        try {
            const metrics = {};
            
            // Disk usage
            try {
                const { stdout: dfOutput } = await execPromise('df -h /home | tail -1', { timeout: 3000 });
                const parts = dfOutput.trim().split(/\s+/);
                metrics.disk = {
                    filesystem: parts[0],
                    size: parts[1],
                    used: parts[2],
                    available: parts[3],
                    percent: parseInt(parts[4].replace('%', ''), 10),
                    mount: parts[5]
                };
            } catch (e) {
                metrics.disk = { error: e.message };
            }
            
            // Memory usage
            try {
                const { stdout: memOutput } = await execPromise('free -m | grep Mem', { timeout: 3000 });
                const parts = memOutput.trim().split(/\s+/);
                const total = parseInt(parts[1], 10);
                const used = parseInt(parts[2], 10);
                const free = parseInt(parts[3], 10);
                metrics.memory = {
                    total_mb: total,
                    used_mb: used,
                    free_mb: free,
                    percent: Math.round((used / total) * 100),
                    total: `${Math.round(total / 1024 * 10) / 10}Gi`,
                    used: `${Math.round(used / 1024 * 10) / 10}Gi`,
                    free: `${Math.round(free / 1024 * 10) / 10}Gi`
                };
            } catch (e) {
                metrics.memory = { error: e.message };
            }
            
            // Load average
            try {
                const { stdout: loadOutput } = await execPromise('uptime | awk -F"load average:" \'{print $2}\'', { timeout: 3000 });
                const loads = loadOutput.trim().split(',').map(l => parseFloat(l.trim()));
                metrics.load = {
                    '1min': loads[0] || 0,
                    '5min': loads[1] || 0,
                    '15min': loads[2] || 0
                };
            } catch (e) {
                metrics.load = { error: e.message };
            }
            
            // CPU info
            try {
                const { stdout: cpuOutput } = await execPromise('nproc', { timeout: 3000 });
                metrics.cpu = {
                    cores: parseInt(cpuOutput.trim(), 10)
                };
                
                // Try to get temperature
                try {
                    const { stdout: tempOutput } = await execPromise('sensors 2>/dev/null | grep -E "Core|Package" | head -1 | awk \'{print $2}\' | sed \'s/+//;s/°C//\'', { timeout: 3000 });
                    metrics.cpu.temp_celsius = parseFloat(tempOutput.trim());
                } catch (tempErr) {
                    metrics.cpu.temp_celsius = null;
                }
            } catch (e) {
                metrics.cpu = { error: e.message };
            }
            
            // Gateway status
            try {
                // Try using pgrep first (more reliable through Node.js exec)
                const { stdout: pgrepOutput } = await execPromise('pgrep -f "openclaw.*gateway" | head -1', { timeout: 3000 });
                const pid = pgrepOutput.trim();
                
                if (pid) {
                    metrics.gateway = {
                        running: true,
                        pid: pid,
                        bind: '127.0.0.1',
                        port: '18789'
                    };
                } else {
                    metrics.gateway = { running: false, pid: null, bind: null, port: null };
                }
            } catch (e) {
                // Fallback: assume running if we can't check
                metrics.gateway = { running: true, pid: null, bind: '127.0.0.1', port: '18789' };
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                timestamp: new Date().toISOString(),
                ...metrics
            }));
        } catch (err) {
            console.error('System health error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: err.message,
                timestamp: new Date().toISOString()
            }));
        }
        return;
    }
    
    // GET /api/sessions - Return active session count
    if (pathname === '/api/sessions') {
        try {
            let sessions = [];
            let sessionCount = 0;
            
            try {
                const { stdout: sessionsOutput } = await execPromise('/home/darwin/.npm-global/bin/openclaw sessions --all-agents --json', {
                    timeout: 5000
                });
                const sessionsData = JSON.parse(sessionsOutput);
                sessions = sessionsData.sessions || [];
                sessionCount = sessions.length;
            } catch (e) {
                console.warn('Could not get sessions:', e.message);
            }
            
            // Count by agent
            const byAgent = {};
            sessions.forEach(session => {
                const agentId = session.agentId || 'unknown';
                byAgent[agentId] = (byAgent[agentId] || 0) + 1;
            });
            
            // Count active vs idle
            const now = Date.now();
            const activeThreshold = 5 * 60 * 1000; // 5 minutes
            const activeSessions = sessions.filter(s => {
                const lastActive = s.lastActiveAt || s.createdAt;
                return (now - new Date(lastActive).getTime()) < activeThreshold;
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                timestamp: new Date().toISOString(),
                count: sessionCount,
                active: activeSessions.length,
                byAgent: byAgent,
                sessions: sessions.slice(0, 50) // Limit to first 50
            }));
        } catch (err) {
            console.error('Sessions API error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: err.message,
                timestamp: new Date().toISOString(),
                count: 0
            }));
        }
        return;
    }
    
    // GET /api/echo/status - Return Echo email monitor status
    if (pathname === '/api/echo/status') {
        try {
            const echoDataPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', 'echo', 'data');
            let echoStatus = {
                status: 'unknown',
                last_check: null,
                emails_processed_today: 0,
                queue_size: 0,
                unread_count: 0,
                recent_logs: []
            };
            
            // Read monitor log for recent activity
            try {
                const monitorLogPath = path.join(echoDataPath, 'monitor.log');
                if (fs.existsSync(monitorLogPath)) {
                    const stats = fs.statSync(monitorLogPath);
                    echoStatus.last_check = stats.mtime.toISOString();
                    
                    // Read last 50 lines
                    const logContent = fs.readFileSync(monitorLogPath, 'utf8');
                    const lines = logContent.split('\n').filter(l => l.trim()).slice(-50);
                    echoStatus.recent_logs = lines.map(line => {
                        // Parse log line
                        const match = line.match(/\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]\s+(.+)/);
                        if (match) {
                            return {
                                timestamp: match[1],
                                message: match[2],
                                level: line.includes('✅') || line.includes('✓') ? 'success' :
                                       line.includes('⚠️') || line.includes('⚠') ? 'warning' :
                                       line.includes('❌') || line.includes('🔴') ? 'error' : 'info'
                            };
                        }
                        return { message: line, level: 'info' };
                    }).slice(-10); // Last 10 parsed entries
                    
                    // Count today's processed emails
                    const today = new Date().toISOString().split('T')[0];
                    const todayLines = lines.filter(l => l.includes(today));
                    const summaryLines = todayLines.filter(l => l.includes('Summary:'));
                    
                    let processedToday = 0;
                    summaryLines.forEach(line => {
                        const match = line.match(/(\d+)\s+detected/);
                        if (match) processedToday += parseInt(match[1], 10);
                    });
                    echoStatus.emails_processed_today = processedToday;
                    
                    // Determine status based on recent activity
                    const lastCheckTime = stats.mtime.getTime();
                    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                    echoStatus.status = lastCheckTime > fiveMinutesAgo ? 'active' : 'idle';
                }
            } catch (e) {
                console.warn('Could not read monitor log:', e.message);
            }
            
            // Read queue directory
            try {
                const queuePath = path.join(echoDataPath, 'queue');
                if (fs.existsSync(queuePath)) {
                    const files = fs.readdirSync(queuePath).filter(f => f.endsWith('.json'));
                    echoStatus.queue_size = files.length;
                }
            } catch (e) {
                echoStatus.queue_size = 0;
            }
            
            // Read unprocessed emails count
            try {
                const unprocessedPath = path.join(echoDataPath, 'unprocessed_emails.json');
                if (fs.existsSync(unprocessedPath)) {
                    const content = fs.readFileSync(unprocessedPath, 'utf8');
                    const rawData = JSON.parse(content);
                    // Handle both array format and object format (with numeric keys)
                    const unprocessed = Array.isArray(rawData) ? rawData : Object.values(rawData);
                    // Count only truly unprocessed emails (no processed_at timestamp)
                    echoStatus.unread_count = unprocessed.filter(e => !e.processed_at).length;
                }
            } catch (e) {
                echoStatus.unread_count = 0;
            }
            
            // Check if echo_monitor process is running
            try {
                const { stdout: psOutput } = await execPromise('pgrep -f "echo_monitor.py"', { timeout: 2000 });
                echoStatus.process_running = psOutput.trim().length > 0;
                if (echoStatus.process_running) {
                    echoStatus.status = 'active';
                }
            } catch (e) {
                echoStatus.process_running = false;
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                timestamp: new Date().toISOString(),
                ...echoStatus
            }));
        } catch (err) {
            console.error('Echo status error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: err.message,
                timestamp: new Date().toISOString()
            }));
        }
        return;
    }
    
    // GET /api/activity - Return recent activity feed
    if (pathname === '/api/activity') {
        try {
            const activities = [];
            const now = Date.now();
            
            // Get subagent runs for activity
            const activeRuns = getActiveSubagentRuns();
            Object.entries(activeRuns).forEach(([agentId, runs]) => {
                runs.forEach(run => {
                    activities.push({
                        id: run.runId,
                        type: 'info',
                        icon: getAgentEmoji(agentId),
                        title: `${getAgentName(agentId)} Working`,
                        description: run.label || 'Processing task',
                        time: new Date(run.startedAt).toLocaleTimeString(),
                        timestamp: run.startedAt,
                        agent: agentId
                    });
                });
            });
            
            // Get recent echo activity
            try {
                const echoLogPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', 'echo', 'data', 'monitor.log');
                if (fs.existsSync(echoLogPath)) {
                    const logContent = fs.readFileSync(echoLogPath, 'utf8');
                    const lines = logContent.split('\n').filter(l => l.includes('Summary:')).slice(-5);
                    
                    lines.forEach(line => {
                        const match = line.match(/\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\].*Summary:\s*(.+)/);
                        if (match) {
                            activities.push({
                                id: `echo_${match[1]}`,
                                type: 'success',
                                icon: '📧',
                                title: 'Echo Check Complete',
                                description: match[2],
                                time: match[1].split(' ')[1],
                                timestamp: new Date(match[1]).getTime(),
                                agent: 'echo'
                            });
                        }
                    });
                }
            } catch (e) {
                // Ignore echo log errors
            }
            
            // Sort by timestamp, newest first
            activities.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                timestamp: new Date().toISOString(),
                activities: activities.slice(0, 20),
                count: activities.length
            }));
        } catch (err) {
            console.error('Activity API error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: err.message,
                timestamp: new Date().toISOString(),
                activities: []
            }));
        }
        return;
    }
    
    // GET /api/logs - Return recent system logs
    if (pathname === '/api/logs') {
        const lines = parseInt(url.searchParams.get('lines') || '100', 10);
        try {
            let logs = [];
            
            // Try to read from the actual log file location
            const today = new Date().toISOString().split('T')[0];
            const logPaths = [
                `/tmp/openclaw/openclaw-${today}.log`,
                '/tmp/openclaw/openclaw.log',
                path.join(process.env.HOME || '/home/darwin', '.openclaw', 'logs', 'openclaw.log'),
            ];
            
            for (const logPath of logPaths) {
                if (fs.existsSync(logPath)) {
                    const content = fs.readFileSync(logPath, 'utf8');
                    logs = content.split('\n').filter(l => l.trim()).slice(-lines);
                    break;
                }
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                timestamp: new Date().toISOString(),
                logs: logs,
                count: logs.length
            }));
        } catch (err) {
            console.error('Logs API error:', err);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                timestamp: new Date().toISOString(),
                logs: [],
                count: 0
            }));
        }
        return;
    }
    
    // GET /api/rapidapi/status - Return RapidAPI rate limit status
    if (pathname === '/api/rapidapi/status') {
        try {
            // Import from dashboard's rapidapi-proxy module
            const rapidApiProxyPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'workspace', 'apps', 'dashboard', 'server', 'rapidapi-proxy.js');
            let rapidApiData = {
                amazon: { 
                    usage: { daily: 0, monthly: 0, limit: 100, percentUsed: 0 }, 
                    remaining: { daily: 100, monthly: 500 },
                    status: 'unknown',
                    statusIndicator: 'healthy',
                    recent429Count: 0,
                    timeUntilReset: { hours: 0, minutes: 0, formatted: '--' }
                },
                axesso: { 
                    usage: { daily: 0, monthly: 0, limit: 100, percentUsed: 0 }, 
                    remaining: { daily: 100, monthly: 500 },
                    status: 'unknown',
                    statusIndicator: 'healthy',
                    recent429Count: 0,
                    timeUntilReset: { hours: 0, minutes: 0, formatted: '--' }
                }
            };
            
            // Try to use the dashboard's rapidapi-proxy module
            if (fs.existsSync(rapidApiProxyPath)) {
                const { getUsageStats } = require(rapidApiProxyPath);
                rapidApiData = getUsageStats();
            } else {
                // Fallback: read directly from usage files
                const rapidApiPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'workspace', 'apps', 'data', 'rapidapi_usage.json');
                const axessoPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'workspace', 'apps', 'data', 'axesso_usage.json');
                
                if (fs.existsSync(rapidApiPath)) {
                    const content = fs.readFileSync(rapidApiPath, 'utf8');
                    const data = JSON.parse(content);
                    const today = new Date().toISOString().split('T')[0];
                    const todayRequests = data.requestLog?.filter(r => r.timestamp?.startsWith(today)) || [];
                    const errors429 = data.errors?.filter(e => e.code === 429 && e.timestamp?.startsWith(today)) || [];
                    
                    // Calculate time until midnight UTC
                    const now = new Date();
                    const midnight = new Date();
                    midnight.setUTCHours(24, 0, 0, 0);
                    const msUntilReset = midnight - now;
                    const hoursUntil = Math.floor(msUntilReset / (1000 * 60 * 60));
                    const minsUntil = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));
                    
                    const percentUsed = Math.round((todayRequests.length / 100) * 100);
                    
                    rapidApiData.amazon = {
                        usage: { 
                            daily: todayRequests.length, 
                            monthly: data.monthlyRequests || 0, 
                            limit: 100, 
                            percentUsed: percentUsed 
                        },
                        remaining: { daily: 100 - todayRequests.length, monthly: 500 - (data.monthlyRequests || 0) },
                        status: percentUsed >= 80 ? 'warning' : 'ok',
                        statusIndicator: percentUsed >= 90 ? 'critical' : percentUsed >= 70 ? 'warning' : 'healthy',
                        recent429Count: errors429.length,
                        timeUntilReset: { 
                            hours: hoursUntil, 
                            minutes: minsUntil, 
                            formatted: `${hoursUntil}h ${minsUntil}m` 
                        },
                        lastSuccessfulCall: todayRequests.filter(r => r.status === 200).pop()?.timestamp || null
                    };
                }
                
                if (fs.existsSync(axessoPath)) {
                    const content = fs.readFileSync(axessoPath, 'utf8');
                    const data = JSON.parse(content);
                    const today = new Date().toISOString().split('T')[0];
                    const todayRequests = data.requestLog?.filter(r => r.timestamp?.startsWith(today)) || [];
                    const errors429 = data.errors?.filter(e => e.code === 429 && e.timestamp?.startsWith(today)) || [];
                    
                    // Calculate time until midnight UTC
                    const now = new Date();
                    const midnight = new Date();
                    midnight.setUTCHours(24, 0, 0, 0);
                    const msUntilReset = midnight - now;
                    const hoursUntil = Math.floor(msUntilReset / (1000 * 60 * 60));
                    const minsUntil = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));
                    
                    const percentUsed = Math.round((todayRequests.length / 100) * 100);
                    
                    rapidApiData.axesso = {
                        usage: { 
                            daily: todayRequests.length, 
                            monthly: data.monthlyRequests || 0, 
                            limit: 100, 
                            percentUsed: percentUsed 
                        },
                        remaining: { daily: 100 - todayRequests.length, monthly: 500 - (data.monthlyRequests || 0) },
                        status: percentUsed >= 80 ? 'warning' : 'ok',
                        statusIndicator: percentUsed >= 90 ? 'critical' : percentUsed >= 70 ? 'warning' : 'healthy',
                        recent429Count: errors429.length,
                        timeUntilReset: { 
                            hours: hoursUntil, 
                            minutes: minsUntil, 
                            formatted: `${hoursUntil}h ${minsUntil}m` 
                        },
                        lastSuccessfulCall: todayRequests.filter(r => r.status === 200).pop()?.timestamp || null
                    };
                }
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                timestamp: new Date().toISOString(),
                ...rapidApiData
            }));
        } catch (err) {
            console.error('RapidAPI status error:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                timestamp: new Date().toISOString(),
                error: err.message,
                amazon: { 
                    usage: { daily: 0, monthly: 0, limit: 100, percentUsed: 0 }, 
                    status: 'error',
                    statusIndicator: 'critical'
                },
                axesso: { 
                    usage: { daily: 0, monthly: 0, limit: 100, percentUsed: 0 }, 
                    status: 'error',
                    statusIndicator: 'critical'
                }
            }));
        }
        return;
    }
    
    // Serve index.html
    if (pathname === '/') {
        serveFile(res, path.join(__dirname, '../public/index.html'), 'text/html');
        return;
    }
    
    // Static files
    if (pathname.startsWith('/')) {
        const ext = path.extname(pathname);
        const contentTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json'
        };
        
        const filePath = path.join(__dirname, '../public', pathname);
        serveFile(res, filePath, contentTypes[ext] || 'application/octet-stream');
        return;
    }
    
    res.writeHead(404);
    res.end('Not found');
});

// Helper functions
function getAgentRole(agentId) {
    const roles = {
        'master': 'Master Orchestrator',
        'allysa': 'Master Orchestrator',
        'husband': 'Personal Executive Assistant',
        'atlas': 'Infrastructure & DevOps',
        'echo': 'Email Monitor',
        'river': 'Social Media Manager',
        'piper': 'Communications',
        'cfo': 'Finance',
        'pixel': 'UX/UI Designer'
    };
    return roles[agentId.toLowerCase()] || `${agentId} Agent`;
}

function getAgentEmoji(agentId) {
    const emojis = {
        'master': '🧠',
        'allysa': '🧠',
        'husband': '🤵',
        'atlas': '🏛️',
        'echo': '📧',
        'river': '🌊',
        'piper': '📨',
        'cfo': '💰',
        'pixel': '🎨'
    };
    return emojis[agentId.toLowerCase()] || '🤖';
}

function getAgentName(agentId) {
    const names = {
        'master': 'Allysa',
        'allysa': 'Allysa',
        'atlas': 'Atlas',
        'echo': 'Echo',
        'river': 'River',
        'piper': 'Piper',
        'cfo': 'CFO',
        'pixel': 'Pixel'
    };
    return names[agentId.toLowerCase()] || agentId;
}

server.listen(PORT, HOST, () => {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║        UNIFIED COMMAND CENTER                            ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Dashboard: http://${HOST}:${PORT}                      ║`);
    console.log('║  Aggregates all systems into unified view                ║');
    console.log('║  Endpoints:                                              ║');
    console.log('║    /api/status         - Full system status              ║');
    console.log('║    /api/agents         - Agent statuses (live)           ║');
    console.log('║    /api/system-health  - System metrics (live)           ║');
    console.log('║    /api/sessions       - Active sessions                 ║');
    console.log('║    /api/echo/status    - Echo email monitor              ║');
    console.log('║    /api/activity       - Recent activity feed            ║');
    console.log('║    /api/logs           - System logs                     ║');
    console.log('║    /api/rapidapi/status - RapidAPI rate limits           ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
});