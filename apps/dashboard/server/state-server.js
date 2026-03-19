/**
 * OpenClaw Systems Dashboard - Real-Time Agent State Server
 * Provides real-time state detection for agent animations
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile, exec } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  PORT: process.env.PORT || 8789,
  HOST: process.env.HOST || '127.0.0.1',
  CACHE_TTL_MS: 5000,
  ACTIVE_THRESHOLD_MS: 2 * 60 * 1000, // 2 minutes = active
  WORKING_THRESHOLD_MS: 30 * 1000,    // 30 seconds = working
  POLL_INTERVAL_MS: 10000,            // 10 second polling
  DEV_MODE: process.env.NODE_ENV === 'development',
};

// Agent configuration mapping
const AGENT_CONFIG = {
  allysa: { id: 'allysa', name: 'Allysa', role: 'Master Orchestrator', icon: '🧠', type: 'master' },
  echo: { id: 'echo', name: 'Echo', role: 'Email Monitor', icon: '📧', type: 'cron', cronPattern: 'email' },
  river: { id: 'river', name: 'River', role: 'Social Media', icon: '🌊', type: 'available' },
  atlas: { id: 'atlas', name: 'Atlas', role: 'Infrastructure', icon: '🏛️', type: 'working' },
  piper: { id: 'piper', name: 'Piper', role: 'Communications', icon: '📨', type: 'active' },
  cfo: { id: 'cfo', name: 'CFO', role: 'Finance', icon: '💰', type: 'reporting', cronPattern: 'report' }
};

// Cache storage
const cache = new Map();
let lastAgentStates = {};

function getCached(key, ttl = CONFIG.CACHE_TTL_MS) {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && (now - cached.timestamp) < ttl) {
    return cached.data;
  }
  return null;
}

function setCached(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ============================================
// REAL-TIME STATE DETECTION
// ============================================

/**
 * Detect agent state based on multiple factors:
 * - Active subagent runs
 * - Recent log activity
 * - Process status
 * - Cron execution times
 */
async function detectAgentState(agentId) {
  const now = Date.now();
  const agent = AGENT_CONFIG[agentId];
  
  if (!agent) {
    return { error: 'Unknown agent', status: 'offline' };
  }

  // Master agent is always active
  if (agent.type === 'master') {
    return {
      agentId,
      status: 'active',
      state: 'heartbeat',
      lastActivity: new Date().toISOString(),
      currentTask: 'System orchestration',
      uptime: 'Always',
      pid: null,
      reason: 'Master agent always active'
    };
  }

  // Check 1: Active subagent runs
  const subagentState = await checkSubagentRuns(agentId);
  if (subagentState.status === 'working') {
    return {
      agentId,
      status: 'working',
      state: getAnimationForState('working', agentId),
      lastActivity: subagentState.lastActivity,
      currentTask: subagentState.currentTask,
      pid: subagentState.pid,
      runId: subagentState.runId,
      reason: 'Active subagent run detected'
    };
  }

  // Check 2: Recent log activity
  const logState = await checkLogActivity(agentId);
  if (logState.recent) {
    const isWorking = logState.lastActivity && (now - new Date(logState.lastActivity).getTime() < CONFIG.WORKING_THRESHOLD_MS);
    return {
      agentId,
      status: isWorking ? 'working' : 'active',
      state: getAnimationForState(isWorking ? 'working' : 'active', agentId),
      lastActivity: logState.lastActivity,
      currentTask: logState.lastTask,
      reason: `Recent log activity ${Math.round((now - new Date(logState.lastActivity).getTime()) / 1000)}s ago`
    };
  }

  // Check 3: Process running status
  const processState = await checkProcessStatus(agentId);
  if (processState.running) {
    return {
      agentId,
      status: 'active',
      state: getAnimationForState('active', agentId),
      lastActivity: new Date().toISOString(),
      currentTask: processState.command || 'Background process',
      pid: processState.pid,
      reason: 'Background process running'
    };
  }

  // Check 4: Cron execution times (for cron-based agents)
  if (agent.type === 'cron' || agent.type === 'reporting') {
    const cronState = await checkCronActivity(agentId);
    if (cronState.recent) {
      return {
        agentId,
        status: 'active',
        state: getAnimationForState('active', agentId),
        lastActivity: cronState.lastRun,
        currentTask: cronState.nextTask || 'Scheduled task completed',
        nextRun: cronState.nextRun,
        reason: 'Recent cron execution'
      };
    }
    if (cronState.nextRun) {
      return {
        agentId,
        status: 'idle',
        state: getAnimationForState('idle', agentId),
        lastActivity: cronState.lastRun,
        currentTask: 'Waiting for next schedule',
        nextRun: cronState.nextRun,
        reason: 'Scheduled, waiting for next run'
      };
    }
  }

  // Default: idle/available
  return {
    agentId,
    status: 'idle',
    state: getAnimationForState('idle', agentId),
    lastActivity: subagentState.lastActivity || logState.lastActivity || null,
    currentTask: 'Available',
    reason: 'No recent activity detected'
  };
}

/**
 * Get animation class based on state and agent
 */
function getAnimationForState(state, agentId) {
  const animations = {
    allysa: { active: 'heartbeat', working: 'heartbeat', idle: 'heartbeat' },
    echo: { active: 'pulse', working: 'pulse', idle: 'glow' },
    river: { active: 'slide-bounce', working: 'spin', idle: 'glow' },
    atlas: { active: 'spin', working: 'spin', idle: 'glow' },
    piper: { active: 'slide-bounce', working: 'spin', idle: 'glow' },
    cfo: { active: 'pulse', working: 'spin', idle: 'glow' }
  };
  return animations[agentId]?.[state] || 'glow';
}

/**
 * Check for active subagent runs for this agent
 */
async function checkSubagentRuns(agentId) {
  const cacheKey = `subagent:${agentId}`;
  const cached = getCached(cacheKey, 5000);
  if (cached) return cached;

  try {
    const runsPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'subagents', 'runs.json');
    
    if (!fs.existsSync(runsPath)) {
      return { status: 'idle', recent: false, lastActivity: null };
    }

    const content = fs.readFileSync(runsPath, 'utf8');
    const runsData = JSON.parse(content);
    const runs = Object.values(runsData.runs || {});
    
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Find runs for this agent
    const agentRuns = runs.filter(r => {
      const childAgent = r.childSessionKey?.split(':')[1] || '';
      return childAgent === agentId;
    });
    
    // Check for currently running
    const activeRun = agentRuns.find(r => r.startedAt && !r.endedAt);
    if (activeRun) {
      const result = {
        status: 'working',
        recent: true,
        lastActivity: new Date(activeRun.startedAt).toISOString(),
        currentTask: activeRun.label || activeRun.task?.substring(0, 50) || 'Processing task',
        runId: activeRun.runId,
        pid: null
      };
      setCached(cacheKey, result);
      return result;
    }
    
    // Find most recent completed run
    const recentRuns = agentRuns
      .filter(r => r.startedAt)
      .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    
    if (recentRuns.length > 0) {
      const lastRun = recentRuns[0];
      const isRecent = lastRun.startedAt > oneHourAgo;
      const result = {
        status: isRecent ? 'active' : 'idle',
        recent: isRecent,
        lastActivity: new Date(lastRun.startedAt).toISOString(),
        lastTask: lastRun.label || 'Task completed',
        runId: lastRun.runId
      };
      setCached(cacheKey, result);
      return result;
    }
    
    return { status: 'idle', recent: false, lastActivity: null };
  } catch (err) {
    console.error(`Error checking subagent runs for ${agentId}:`, err.message);
    return { status: 'idle', recent: false, lastActivity: null, error: err.message };
  }
}

/**
 * Check recent log activity for this agent
 */
async function checkLogActivity(agentId) {
  const cacheKey = `logs:${agentId}`;
  const cached = getCached(cacheKey, 10000);
  if (cached) return cached;

  try {
    // Check agent's own logs
    const agentLogPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', agentId, 'logs');
    const systemLogPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'logs');
    
    let lastActivity = null;
    let lastTask = null;
    
    // Check agent-specific logs
    if (fs.existsSync(agentLogPath)) {
      const logFiles = fs.readdirSync(agentLogPath)
        .filter(f => f.endsWith('.log') || f.endsWith('.jsonl'))
        .map(f => ({
          name: f,
          path: path.join(agentLogPath, f),
          mtime: fs.statSync(path.join(agentLogPath, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      if (logFiles.length > 0) {
        lastActivity = logFiles[0].mtime.toISOString();
        
        // Try to read last line for task info
        try {
          const content = fs.readFileSync(logFiles[0].path, 'utf8');
          const lines = content.trim().split('\n').filter(l => l);
          const lastLine = lines[lines.length - 1];
          if (lastLine) {
            try {
              const jsonLog = JSON.parse(lastLine);
              lastTask = jsonLog.task || jsonLog.msg || jsonLog.message || 'Activity logged';
            } catch {
              lastTask = lastLine.substring(0, 50);
            }
          }
        } catch (e) {
          // Ignore read errors
        }
      }
    }
    
    // Also check subagent runs for this agent
    const runsPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'subagents', 'runs.json');
    if (fs.existsSync(runsPath)) {
      const content = fs.readFileSync(runsPath, 'utf8');
      const runsData = JSON.parse(content);
      const runs = Object.values(runsData.runs || {});
      
      const agentRuns = runs.filter(r => {
        const childAgent = r.childSessionKey?.split(':')[1] || '';
        return childAgent === agentId;
      });
      
      if (agentRuns.length > 0) {
        const latest = agentRuns.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))[0];
        const runTime = new Date(latest.startedAt);
        if (!lastActivity || runTime > new Date(lastActivity)) {
          lastActivity = runTime.toISOString();
          lastTask = latest.label || latest.task?.substring(0, 50) || 'Task executed';
        }
      }
    }
    
    const now = Date.now();
    const isRecent = lastActivity && (now - new Date(lastActivity).getTime() < CONFIG.ACTIVE_THRESHOLD_MS);
    
    const result = {
      recent: isRecent,
      lastActivity,
      lastTask: lastTask || 'Unknown activity'
    };
    
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    console.error(`Error checking log activity for ${agentId}:`, err.message);
    return { recent: false, lastActivity: null, lastTask: null };
  }
}

/**
 * Check if agent has running processes
 */
async function checkProcessStatus(agentId) {
  const cacheKey = `process:${agentId}`;
  const cached = getCached(cacheKey, 5000);
  if (cached) return cached;

  try {
    const { stdout } = await execAsync(`ps aux | grep -i "${agentId}" | grep -v grep | head -5`);
    const lines = stdout.trim().split('\n').filter(l => l);
    
    if (lines.length > 0) {
      const line = lines[0];
      const parts = line.split(/\s+/);
      const pid = parts[1];
      const command = parts.slice(10).join(' ');
      
      const result = {
        running: true,
        pid: parseInt(pid, 10),
        command: command.substring(0, 50)
      };
      setCached(cacheKey, result);
      return result;
    }
  } catch (err) {
    // No processes found or command failed
  }
  
  return { running: false, pid: null, command: null };
}

/**
 * Check cron activity for scheduled agents
 */
async function checkCronActivity(agentId) {
  const cacheKey = `cron:${agentId}`;
  const cached = getCached(cacheKey, 60000); // 1 minute cache for cron
  if (cached) return cached;

  try {
    // Get cron list from OpenClaw
    const { stdout } = await execFileAsync('openclaw', ['cron', 'list', '--json'], {
      timeout: 5000,
      encoding: 'utf8'
    });
    
    const cronData = JSON.parse(stdout);
    const jobs = cronData.jobs || [];
    
    // Find jobs related to this agent
    const agentJobs = jobs.filter(j => {
      const jobId = (j.id || j.name || '').toLowerCase();
      return jobId.includes(agentId) || 
             (AGENT_CONFIG[agentId]?.cronPattern && jobId.includes(AGENT_CONFIG[agentId].cronPattern));
    });
    
    if (agentJobs.length > 0) {
      // Get most recent activity
      const recentJob = agentJobs
        .filter(j => j.lastRun?.time || j.lastRunAt)
        .sort((a, b) => {
          const timeA = new Date(a.lastRun?.time || a.lastRunAt || 0);
          const timeB = new Date(b.lastRun?.time || b.lastRunAt || 0);
          return timeB - timeA;
        })[0];
      
      if (recentJob) {
        const lastRun = recentJob.lastRun?.time || recentJob.lastRunAt;
        const isRecent = lastRun && (Date.now() - new Date(lastRun).getTime() < CONFIG.ACTIVE_THRESHOLD_MS);
        
        const result = {
          recent: isRecent,
          lastRun,
          nextRun: recentJob.nextRun,
          nextTask: recentJob.name || recentJob.id,
          enabled: recentJob.enabled !== false && !recentJob.disabled
        };
        setCached(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.error(`Error checking cron for ${agentId}:`, err.message);
  }
  
  return { recent: false, lastRun: null, nextRun: null, enabled: false };
}

// ============================================
// API ENDPOINTS
// ============================================

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // GET /api/agent-state/:agentId - Single agent state
  const agentStateMatch = pathname.match(/^\/api\/agent-state\/(.+)$/);
  if (agentStateMatch) {
    const agentId = agentStateMatch[1];
    try {
      const state = await detectAgentState(agentId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        ...state
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: err.message,
        agentId
      }));
    }
    return;
  }

  // GET /api/agent-states - All agents' states
  if (pathname === '/api/agent-states') {
    try {
      const states = {};
      const agents = Object.keys(AGENT_CONFIG);
      
      await Promise.all(agents.map(async (agentId) => {
        states[agentId] = await detectAgentState(agentId);
      }));
      
      // Store for change detection
      lastAgentStates = states;
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        agents: states,
        summary: {
          total: agents.length,
          working: Object.values(states).filter(s => s.status === 'working').length,
          active: Object.values(states).filter(s => s.status === 'active').length,
          idle: Object.values(states).filter(s => s.status === 'idle').length,
          offline: Object.values(states).filter(s => s.status === 'offline').length
        }
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: err.message
      }));
    }
    return;
  }

  // GET /api/health - Server health check
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0'
    }));
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', path: pathname }));
}

// ============================================
// SERVER STARTUP
// ============================================

function start() {
  const server = http.createServer(handleRequest);

  server.listen(CONFIG.PORT, CONFIG.HOST, () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       OpenClaw Agent State Server                          ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Local:   http://${CONFIG.HOST}:${CONFIG.PORT}                    ║`);
    console.log(`║  Endpoints:                                                ║`);
    console.log(`║    GET /api/agent-states    - All agent states             ║`);
    console.log(`║    GET /api/agent-state/:id - Single agent state           ║`);
    console.log(`║    GET /api/health          - Health check                 ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Real-time state detection active');
    console.log('Press Ctrl+C to stop');
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}

start();
