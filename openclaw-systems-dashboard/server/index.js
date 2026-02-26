/**
 * OpenClaw Systems Dashboard - Main Server
 * Local-only, secure, live monitoring dashboard
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// Configuration
const CONFIG = {
  PORT: process.env.PORT || 8789,
  HOST: process.env.HOST || '127.0.0.1',
  CACHE_TTL_MS: 5000,
  REFRESH_INTERVAL_MS: 15000,
  MAX_BACKOFF_MS: 120000,
  DEV_MODE: process.env.NODE_ENV === 'development',
  OPENCLAW_TIMEOUT: 10000,
  REDACTION_PATTERNS: [
    /token/i,
    /secret/i,
    /api[_-]?key/i,
    /password/i,
    /cookie/i,
    /oauth/i,
    /authorization/i,
    /bearer/i,
    /auth/i,
    /credential/i,
    /private[_-]?key/i,
    /refresh[_-]?token/i,
    /webhook[_-]?secret/i,
    /session[_-]?secret/i,
  ],
  BASE64_PATTERN: /[A-Za-z0-9+/]{40,}={0,2}/g,
  HEX_PATTERN: /[a-f0-9]{32,}/gi,
};

// Security: Refuse to start if not binding to loopback
function validateBinding() {
  const loopbackAddresses = ['127.0.0.1', 'localhost', '::1'];
  if (!loopbackAddresses.includes(CONFIG.HOST) && !CONFIG.HOST.startsWith('127.')) {
    console.error('❌ FATAL: Refusing to start on non-loopback address:', CONFIG.HOST);
    console.error('   The dashboard must bind to 127.0.0.1 for security.');
    process.exit(1);
  }
}

// Cache storage
const cache = new Map();

function getCached(key, fetcher) {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && (now - cached.timestamp) < CONFIG.CACHE_TTL_MS) {
    return cached.data;
  }

  return null;
}

function setCached(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Redaction layer - strips sensitive fields
function redactSecrets(obj, path = '') {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Check if key suggests this is a secret
    const keyLower = path.toLowerCase();
    const isSecretField = CONFIG.REDACTION_PATTERNS.some(pattern => pattern.test(keyLower));

    if (isSecretField) {
      return obj.length > 4 ? obj.slice(0, 4) + '••••' : '••••';
    }

    // Mask base64-looking strings that might be tokens
    if (obj.length > 40 && CONFIG.BASE64_PATTERN.test(obj)) {
      return obj.slice(0, 8) + '••••';
    }

    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => redactSecrets(item, `${path}[${index}]`));
  }

  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if key itself is sensitive
      const keyLower = key.toLowerCase();
      if (CONFIG.REDACTION_PATTERNS.some(pattern => pattern.test(keyLower))) {
        if (typeof value === 'string' && value.length > 0) {
          result[key] = value.length > 4 ? value.slice(0, 4) + '••••' : '••••';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = '••••';
        }
      } else {
        result[key] = redactSecrets(value, `${path}.${key}`);
      }
    }
    return result;
  }

  return obj;
}

// Strict allowlist of CLI commands
const ALLOWED_COMMANDS = {
  'status': { args: ['--json'], timeout: 3000 },
  'status-all': { args: ['status', '--all'], timeout: 3000, jsonFlag: false },
  'cron-list': { args: ['cron', 'list', '--json', '--all'], timeout: 3000 },
  'cron-runs': { args: ['cron', 'runs', '--json'], timeout: 3000, optional: true },
  'channels-list': { args: ['channels', 'list', '--json'], timeout: 3000 },
  'channels-status': { args: ['channels', 'status'], timeout: 3000, jsonFlag: false },
  'agents-list': { args: ['agents', 'list', '--json'], timeout: 3000 },
  'hooks-list': { args: ['hooks', 'list', '--json'], timeout: 3000 },
  'gateway-status': { args: ['gateway', 'status'], timeout: 2000, jsonFlag: false },
  'health': { args: ['health', '--json'], timeout: 3000 },
  'sessions': { args: ['sessions', '--all-agents', '--json'], timeout: 3000 },
};

async function runOpenClawCommand(commandKey) {
  const commandConfig = ALLOWED_COMMANDS[commandKey];
  if (!commandConfig) {
    throw new Error(`Unknown command: ${commandKey}`);
  }

  const cacheKey = `cmd:${commandKey}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const { stdout } = await execFileAsync('openclaw', commandConfig.args, {
      timeout: commandConfig.timeout,
      encoding: 'utf8',
    });

    let result;
    if (commandConfig.jsonFlag !== false) {
      try {
        result = JSON.parse(stdout);
      } catch {
        result = { raw: stdout, parseError: true };
      }
    } else {
      result = { raw: stdout };
    }

    // Apply redaction
    result = redactSecrets(result);

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    // For optional commands, return empty result instead of throwing
    if (commandConfig.optional) {
      return { error: 'Command failed or not available', optional: true };
    }

    const errorResult = {
      error: error.message,
      stderr: error.stderr,
      code: error.code,
    };
    setCached(cacheKey, errorResult);
    return errorResult;
  }
}

// Parse gateway status from text output
function parseGatewayStatus(text) {
  const status = {
    running: false,
    bind: null,
    port: null,
    pid: null,
    rpcOk: false,
    raw: text,
  };

  if (!text) return status;

  // Check if running
  status.running = /running/i.test(text) || /ok/i.test(text);
  status.rpcOk = /rpc.*ok/i.test(text) || /probe.*ok/i.test(text);

  // Extract bind address
  const bindMatch = text.match(/bind[:\s]+(127\.\d+\.\d+\.\d+|localhost)/i);
  if (bindMatch) status.bind = bindMatch[1];

  // Extract port
  const portMatch = text.match(/port[:\s]+(\d+)/i);
  if (portMatch) status.port = parseInt(portMatch[1], 10);

  // Extract PID
  const pidMatch = text.match(/pid[:\s]+(\d+)/i);
  if (pidMatch) status.pid = parseInt(pidMatch[1], 10);

  return status;
}

// Derive model alias from model name
function getModelAlias(modelName) {
  if (!modelName) return 'default';
  const name = modelName.toLowerCase();
  if (name.includes('claude') || name.includes('opus')) return 'opus';
  if (name.includes('gpt') || name.includes('openai')) return 'gpt';
  if (name.includes('kimi')) return 'kimi';
  if (name.includes('flash') || name.includes('gemini')) return 'flash';
  if (name.includes('deepseek')) return 'deepseek';
  return 'default';
}

// Derive badge type from model/provider
function getModelBadge(model) {
  // Check for paid/free indicators in model data
  if (model.provider === 'openai' || model.paid === true) return 'Paid';
  if (model.provider === 'ollama' || model.local === true) return 'Local';
  if (model.oauth || model.requiresAuth) return 'OAuth';
  return 'Free';
}

// Collect all dashboard data
async function collectDashboardData() {
  const startTime = Date.now();

  try {
    // Load config file FIRST (fast, synchronous)
    const configData = loadOpenClawConfig();
    const config = configData?.config;

    // Parse models from config immediately (don't wait for CLI)
    let models = parseModelsFromConfig(config);
    let agentName = parseAgentName(config);
    let channels = parseChannelsFromConfig(config);

    // Collect live data from CLI (with short timeouts)
    const [
      statusResult,
      gatewayResult,
      cronResult,
      channelsResult,
      agentsResult,
      hooksResult,
      healthResult,
      sessionsResult,
    ] = await Promise.all([
      runOpenClawCommand('status').catch(() => ({ error: 'Failed' })),
      runOpenClawCommand('gateway-status').catch(() => ({ raw: '' })),
      runOpenClawCommand('cron-list').catch(() => ({ jobs: [] })),
      runOpenClawCommand('channels-list').catch(() => ({ channels: [] })),
      runOpenClawCommand('agents-list').catch(() => ({ agents: [] })),
      runOpenClawCommand('hooks-list').catch(() => ({ hooks: [] })),
      runOpenClawCommand('health').catch(() => ({ error: 'Failed' })),
      runOpenClawCommand('sessions').catch(() => ({ sessions: [] })),
    ]);

    const gateway = parseGatewayStatus(gatewayResult.raw);

    // Merge CLI data with config data (CLI takes precedence for live status)
    const agents = agentsResult.agents || agentsResult || [];
    const agentArray = Array.isArray(agents) ? agents : [agents].filter(Boolean);

    // If CLI returned models, use those instead
    if (agentArray.length > 0) {
      const cliModels = [];
      agentArray.forEach(agent => {
        if (agent.model) {
          cliModels.push({
            id: agent.model,
            name: agent.modelDisplayName || agent.model,
            alias: getModelAlias(agent.model),
            role: agent.id === 'main' ? 'Primary Agent' : `${agent.id} Agent`,
            badge: getModelBadge(agent),
            isPrimary: agent.id === 'main',
          });
        }
        if (agent.models && Array.isArray(agent.models)) {
          agent.models.forEach(m => {
            cliModels.push({
              id: m.id || m,
              name: m.name || m.id || m,
              alias: getModelAlias(m.id || m),
              role: m.role || 'Model',
              badge: getModelBadge(m),
              isPrimary: false,
            });
          });
        }
      });
      if (cliModels.length > 0) {
        models = cliModels;
      }
      // Update agent name from CLI if available
      const cliAgentName = agentArray.find(a => a.id === 'main')?.name || agentArray[0]?.name;
      if (cliAgentName) {
        agentName = cliAgentName;
      }
    }

    // Parse cron jobs
    const cronJobs = [];
    const cronData = cronResult.jobs || cronResult || [];
    const cronArray = Array.isArray(cronData) ? cronData : [];

    cronArray.forEach(job => {
      let status = 'Unknown';
      if (job.disabled || job.enabled === false) {
        status = 'Disabled';
      } else if (job.lastRun?.failed || job.lastResult === 'error') {
        status = 'Failed';
      } else if (job.enabled !== false) {
        status = 'Active';
      }

      cronJobs.push({
        id: job.id || job.name,
        name: job.name || job.id,
        schedule: job.schedule || job.cron || '-',
        status: status,
        lastRun: job.lastRun?.time || job.lastRunAt,
        nextRun: job.nextRun,
      });
    });

    // Parse channels (merge CLI data with config fallback)
    const channelData = channelsResult.channels || channelsResult || [];
    const channelArray = Array.isArray(channelData) ? channelData : [];

    // Update channel status from CLI data if available
    channelArray.forEach(ch => {
      const existing = channels.find(c => c.id === ch.id || c.type === (ch.type || ch.provider));
      if (existing) {
        // Update status from CLI
        if (ch.connected || ch.status === 'connected') existing.status = 'Active';
        else if (ch.status === 'degraded') existing.status = 'Degraded';
        else if (ch.status === 'error' || ch.error) existing.status = 'Down';
      } else {
        // Add new channel from CLI
        let status = 'Unknown';
        if (ch.connected || ch.status === 'connected') status = 'Active';
        else if (ch.status === 'degraded') status = 'Degraded';
        else if (ch.status === 'error' || ch.error) status = 'Down';
        channels.push({
          id: ch.id || ch.name,
          name: ch.name || ch.id,
          type: ch.type || ch.provider,
          status: status,
        });
      }
    });

    // If still no channels, add placeholders
    if (channels.length === 0) {
      channels.push({ id: 'telegram', name: 'Telegram', type: 'telegram', status: 'Unknown' });
      channels.push({ id: 'discord', name: 'Discord', type: 'discord', status: 'Unknown' });
    }

    // Gmail Pipeline status
    const pipeline = [
      { id: 'gmail', name: 'Gmail', status: 'Unknown' },
      { id: 'pubsub', name: 'Pub/Sub', status: 'Unknown' },
      { id: 'tailscale', name: 'Tailscale Funnel', status: gateway.bind?.includes('tailscale') ? 'OK' : 'Unknown' },
      { id: 'hook', name: 'OpenClaw Hook', status: (hooksResult.hooks?.length > 0) ? 'OK' : 'Unknown' },
      { id: 'agent', name: 'GPT Agent', status: gateway.running ? 'OK' : 'Down' },
      { id: 'telegram', name: 'Telegram', status: channels.find(c => c.type === 'telegram')?.status || 'Unknown' },
    ];

    // Determine hooks status more precisely
    const hooks = hooksResult.hooks || [];
    if (hooks.length > 0) {
      const webhookHook = hooks.find(h => h.type === 'webhook' || h.name?.includes('gmail'));
      if (webhookHook) {
        pipeline[3].status = webhookHook.enabled !== false ? 'OK' : 'Degraded';
      }
    }

    // Overall health
    const healthIssues = [];
    if (!gateway.running) healthIssues.push('Gateway not running');
    if (!gateway.rpcOk) healthIssues.push('RPC probe failed');

    const channelsDown = channels.filter(c => c.status === 'Down');
    if (channelsDown.length > 0) {
      healthIssues.push(`${channelsDown.length} channel(s) down`);
    }

    const failedJobs = cronJobs.filter(j => j.status === 'Failed');
    if (failedJobs.length > 0) {
      healthIssues.push(`${failedJobs.length} cron job(s) failed`);
    }

    const healthState = healthIssues.length === 0 ? 'ok' :
                       healthIssues.length < 2 ? 'warn' : 'down';

    // Session life from config (if available)
    let sessionLife = '-';
    if (statusResult.session?.ttl) {
      sessionLife = `${Math.round(statusResult.session.ttl / 60)}m`;
    } else if (statusResult.config?.session?.ttl) {
      sessionLife = `${Math.round(statusResult.config.session.ttl / 60)}m`;
    } else if (config?.agents?.defaults?.timeoutSeconds) {
      sessionLife = `${Math.round(config.agents.defaults.timeoutSeconds / 60)}m`;
    }

    return {
      generatedAt: new Date().toISOString(),
      agentName: agentName,
      gateway: {
        running: gateway.running,
        bind: gateway.bind,
        port: gateway.port,
        pid: gateway.pid,
        rpcOk: gateway.rpcOk,
      },
      stats: {
        modelsCount: models.length || '-',
        cronCount: cronJobs.length,
        channelsCount: channels.length,
        sessionLife: sessionLife,
      },
      models: models,
      cronJobs: cronJobs,
      channels: channels,
      pipeline: pipeline,
      features: [
        { name: 'Multi-Model AI Stack', detected: models.length > 1 },
        { name: 'Automated Cron Jobs', detected: cronJobs.length > 0 },
        { name: 'Real-Time Channels', detected: channels.some(c => c.status === 'Active') },
        { name: 'Secure Local Binding', detected: gateway.bind === '127.0.0.1' },
        { name: 'Webhook Integration', detected: hooks.length > 0 },
        { name: 'Health Monitoring', detected: healthState !== 'down' },
      ],
      health: {
        state: healthState,
        reasons: healthIssues,
      },
      _meta: {
        collectionTimeMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      error: 'Failed to collect dashboard data',
      errorDetails: error.message,
      health: { state: 'down', reasons: ['Data collection failed'] },
    };
  }
}

// Load OpenClaw config file directly (fallback when CLI hangs)
function loadOpenClawConfig() {
  const configPaths = [
    path.join(process.env.HOME || '/home/darwin', '.openclaw', 'openclaw.json'),
    path.join(process.env.HOME || '/home/darwin', '.config', 'openclaw', 'config.json'),
  ];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(content);
        return { config, path: configPath };
      }
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}:`, error.message);
    }
  }

  return null;
}

// Parse models from config file
function parseModelsFromConfig(config) {
  const models = [];

  if (!config) return models;

  // Get agents list
  const agents = config.agents?.list || [];
  const defaults = config.agents?.defaults || {};

  // Parse from agents list
  agents.forEach(agent => {
    if (agent.model?.primary) {
      const modelId = agent.model.primary;
      const [provider, modelName] = modelId.split('/');
      models.push({
        id: modelId,
        name: modelName || modelId,
        alias: getModelAlias(modelId),
        role: agent.id === 'main' ? 'Primary Agent' : `${agent.id} Agent`,
        badge: getModelBadge({ provider }),
        isPrimary: agent.id === 'main',
      });
    }
  });

  // Parse from models.providers section
  if (config.models?.providers) {
    Object.entries(config.models.providers).forEach(([providerId, provider]) => {
      if (provider.models && Array.isArray(provider.models)) {
        provider.models.forEach(m => {
          const modelId = `${providerId}/${m.id}`;
          // Only add if not already added from agents
          if (!models.find(existing => existing.id === modelId)) {
            models.push({
              id: modelId,
              name: m.name || m.id,
              alias: getModelAlias(m.id),
              role: 'Available Model',
              badge: getModelBadge({ provider: providerId }),
              isPrimary: false,
            });
          }
        });
      }
    });
  }

  // If still no models, add default from defaults.model
  if (models.length === 0 && defaults.model?.primary) {
    const modelId = defaults.model.primary;
    const [provider, modelName] = modelId.split('/');
    models.push({
      id: modelId,
      name: modelName || modelId,
      alias: getModelAlias(modelId),
      role: 'Primary Agent',
      badge: getModelBadge({ provider }),
      isPrimary: true,
    });
  }

  return models;
}

// Parse agent name from config
function parseAgentName(config) {
  if (!config) return 'Main';
  const mainAgent = config.agents?.list?.find(a => a.id === 'main');
  return mainAgent?.name || mainAgent?.id || 'Main';
}

// Parse channels from config
function parseChannelsFromConfig(config) {
  const channels = [];

  if (!config?.channels) return channels;

  if (config.channels.telegram?.enabled) {
    channels.push({
      id: 'telegram',
      name: 'Telegram',
      type: 'telegram',
      status: 'Unknown', // Will be updated from live check
    });
  }

  if (config.channels.discord?.enabled) {
    channels.push({
      id: 'discord',
      name: 'Discord',
      type: 'discord',
      status: 'Unknown',
    });
  }

  if (config.channels.whatsapp?.enabled) {
    channels.push({
      id: 'whatsapp',
      name: 'WhatsApp',
      type: 'whatsapp',
      status: 'Unknown',
    });
  }

  return channels;
}

// Load override file if exists
function loadModelStackOverride() {
  const overridePath = path.join(__dirname, 'config', 'model-stack.override.json');
  try {
    if (fs.existsSync(overridePath)) {
      const content = fs.readFileSync(overridePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn('Failed to load model override:', error.message);
  }
  return null;
}

// Parse a log line into structured format
function parseLogLine(line) {
  if (!line || !line.trim()) return null;

  const trimmed = line.trim();

  // Try to parse JSON log format
  try {
    const jsonLog = JSON.parse(trimmed);
    return {
      timestamp: jsonLog.time || jsonLog.timestamp || new Date().toISOString(),
      level: (jsonLog.level || 'info').toLowerCase(),
      message: jsonLog.msg || jsonLog.message || trimmed,
      raw: trimmed,
      source: jsonLog.subsystem || jsonLog.source || 'openclaw',
    };
  } catch {
    // Not JSON, try regex patterns
  }

  // Pattern: [TIME] LEVEL message
  const bracketPattern = /^\[([^\]]+)\]\s+(\w+)?\s*(.*)$/;
  const bracketMatch = trimmed.match(bracketPattern);
  if (bracketMatch) {
    return {
      timestamp: bracketMatch[1],
      level: (bracketMatch[2] || 'info').toLowerCase(),
      message: bracketMatch[3],
      raw: trimmed,
      source: 'openclaw',
    };
  }

  // Pattern: ISO timestamp LEVEL message
  const isoPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\d\.Z+-]*)\s+(\w+)\s+(.*)$/;
  const isoMatch = trimmed.match(isoPattern);
  if (isoMatch) {
    return {
      timestamp: isoMatch[1],
      level: isoMatch[2].toLowerCase(),
      message: isoMatch[3],
      raw: trimmed,
      source: 'openclaw',
    };
  }

  // Pattern: simple timestamp
  const simplePattern = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\w+)\s+(.*)$/;
  const simpleMatch = trimmed.match(simplePattern);
  if (simpleMatch) {
    return {
      timestamp: simpleMatch[1],
      level: simpleMatch[2].toLowerCase(),
      message: simpleMatch[3],
      raw: trimmed,
      source: 'openclaw',
    };
  }

  // Fallback: return as-is
  return {
    timestamp: new Date().toISOString(),
    level: 'info',
    message: trimmed,
    raw: trimmed,
    source: 'unknown',
  };
}

// Redact secrets from log line
function redactLogLine(line) {
  if (!line) return line;

  let redacted = line;

  // Redact patterns like key=value where key suggests secret
  CONFIG.REDACTION_PATTERNS.forEach((pattern) => {
    // Match key=value patterns
    const keyValuePattern = new RegExp(
      `(["']?${pattern.source}["']?\s*[:=]\s*)(["']?)([^"'\s,}]+)`,
      'gi'
    );
    redacted = redacted.replace(keyValuePattern, (match, prefix, quote, value) => {
      if (value.length > 4) {
        return prefix + quote + value.slice(0, 4) + '••••';
      }
      return prefix + quote + '••••';
    });
  });

  // Redact long base64 strings that might be tokens
  redacted = redacted.replace(CONFIG.BASE64_PATTERN, (match) => {
    if (match.length > 40) {
      return match.slice(0, 8) + '••••';
    }
    return match;
  });

  return redacted;
}

// Get recent logs via CLI
async function getRecentLogs(lines = 100, levelFilter = 'all') {
  try {
    const { stdout } = await execFileAsync('openclaw', ['logs', '--tail', lines.toString()], {
      timeout: 10000,
      encoding: 'utf8',
    });

    const logLines = stdout.split('\n').filter((l) => l.trim());
    const parsed = logLines
      .map((line) => {
        const redacted = redactLogLine(line);
        return parseLogLine(redacted);
      })
      .filter(Boolean);

    if (levelFilter !== 'all') {
      return parsed.filter((log) => log.level === levelFilter.toLowerCase());
    }

    return parsed;
  } catch (error) {
    // Fallback: try to read log file directly
    const logPaths = [
      '/tmp/openclaw/openclaw.log',
      `/tmp/openclaw/openclaw-${new Date().toISOString().split('T')[0]}.log`,
      path.join(process.env.HOME || '/home/darwin', '.openclaw', 'openclaw.log'),
    ];

    for (const logPath of logPaths) {
      try {
        const content = fs.readFileSync(logPath, 'utf8');
        const logLines = content.split('\n').filter((l) => l.trim()).slice(-lines);
        const parsed = logLines
          .map((line) => {
            const redacted = redactLogLine(line);
            return parseLogLine(redacted);
          })
          .filter(Boolean);

        if (levelFilter !== 'all') {
          return parsed.filter((log) => log.level === levelFilter.toLowerCase());
        }
        return parsed;
      } catch {
        continue;
      }
    }

    throw new Error('Could not retrieve logs: ' + error.message);
  }
}

// Start streaming logs via spawn
function startLogStream(levelFilter, onLog) {
  // Try openclaw logs --follow first
  const args = ['logs', '--follow'];

  const proc = spawn('openclaw', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let buffer = '';

  proc.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer

    lines.forEach((line) => {
      if (!line.trim()) return;

      const redacted = redactLogLine(line);
      const parsed = parseLogLine(redacted);

      if (!parsed) return;

      // Apply level filter
      if (levelFilter !== 'all' && parsed.level !== levelFilter.toLowerCase()) {
        return;
      }

      onLog({
        type: 'log',
        data: parsed,
        timestamp: new Date().toISOString(),
      });
    });
  });

  proc.stderr.on('data', (data) => {
    // Log errors to console but don't send to client
    console.error('Log stream error:', data.toString());
  });

  proc.on('error', (err) => {
    onLog({
      type: 'error',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  });

  proc.on('exit', (code) => {
    onLog({
      type: 'disconnected',
      code,
      timestamp: new Date().toISOString(),
    });
  });

  return proc;
}

// Serve static files
function serveStaticFile(res, filePath, contentType) {
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

// Main request handler
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS headers for localhost only
  res.setHeader('Access-Control-Allow-Origin', `http://localhost:${CONFIG.PORT}`);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API endpoints
  if (pathname === '/api/summary') {
    const data = await collectDashboardData();

    // Apply model override if available
    const override = loadModelStackOverride();
    if (override && override.models) {
      // Merge override with live data
      data.models = override.models.map(m => {
        const live = data.models.find(lm => lm.id === m.id);
        return { ...m, ...live, isPrimary: m.isPrimary || live?.isPrimary };
      });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  // Debug endpoint (dev only)
  if (pathname === '/api/debug' && CONFIG.DEV_MODE) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      config: { ...CONFIG, REDACTION_PATTERNS: '[redacted for debug]' },
      cacheKeys: Array.from(cache.keys()),
    }));
    return;
  }

  // Logs endpoint - Recent logs (polling)
  if (pathname === '/api/logs') {
    const lines = parseInt(url.searchParams.get('lines') || '100', 10);
    const level = url.searchParams.get('level') || 'all';
    
    try {
      const logs = await getRecentLogs(Math.min(lines, 500), level);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        logs: logs,
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Logs streaming endpoint - Server-Sent Events
  if (pathname === '/api/logs/stream') {
    const level = url.searchParams.get('level') || 'all';
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    // Start log tailing
    const logProcess = startLogStream(level, (logEntry) => {
      res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
    });

    // Handle client disconnect
    req.on('close', () => {
      if (logProcess) {
        logProcess.kill();
      }
    });

    return;
  }

  // Serve index.html for root
  if (pathname === '/') {
    serveStaticFile(res, path.join(__dirname, '..', 'public', 'index.html'), 'text/html');
    return;
  }

  // Static files
  if (pathname.startsWith('/')) {
    const filePath = path.join(__dirname, '..', 'public', pathname);
    // Security: prevent directory traversal
    const resolvedPath = path.resolve(filePath);
    const publicDir = path.resolve(__dirname, '..', 'public');

    if (!resolvedPath.startsWith(publicDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    };

    serveStaticFile(res, filePath, contentTypes[ext] || 'application/octet-stream');
    return;
  }

  res.writeHead(404);
  res.end('Not found');
}

// Start server
function start() {
  validateBinding();

  const server = http.createServer(handleRequest);

  server.listen(CONFIG.PORT, CONFIG.HOST, () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║       OpenClaw Systems Dashboard                           ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Local:   http://${CONFIG.HOST}:${CONFIG.PORT}                    ║`);
    console.log(`║  Cache:   ${CONFIG.CACHE_TTL_MS}ms                                      ║`);
    console.log(`║  Refresh: ${CONFIG.REFRESH_INTERVAL_MS}ms (auto-poll)                     ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Security: Binding validated to loopback only');
    console.log('Press Ctrl+C to stop');
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}

start();
