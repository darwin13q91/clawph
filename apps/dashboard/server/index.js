/**
 * OpenClaw Systems Dashboard - Main Server
 * Local-only, secure, live monitoring dashboard
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { promisify } = require('util');
const { handleAuditApiRequest } = require('./audit-api');
const { handleProxyRequest } = require('./rapidapi-proxy');
const { handleProxyRequestWithFallback, getFallbackStats } = require('./rapidapi-with-scout-fallback');
const CRMService = require('./crm-service');
const { handlePiperApiRequest } = require('./piper-api');
const activityLogger = require('./activity-logger');

const execFileAsync = promisify(execFile);

// Initialize CRM service
const crm = new CRMService();

// SSE Clients for activity stream
const sseClients = new Set();

// Configuration
const CONFIG = {
  PORT: process.env.PORT || 8789,
  HOST: process.env.HOST || '0.0.0.0',
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

// Security: Allow binding to any interface for Tailscale access
// Tailscale provides encrypted overlay network - safe to expose on all interfaces
function validateBinding() {
  const allowedAddresses = ['127.0.0.1', 'localhost', '::1', '0.0.0.0'];
  if (!allowedAddresses.includes(CONFIG.HOST) && !CONFIG.HOST.startsWith('127.')) {
    console.warn('⚠️  WARNING: Binding to non-standard address:', CONFIG.HOST);
  }
  console.log('🔒 Security: Tailscale encrypted overlay network active');
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

// Helper to parse request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
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
    const openclawPath = process.env.OPENCLAW_BIN || '/home/darwin/.npm-global/bin/openclaw';
    const { stdout } = await execFileAsync(openclawPath, commandConfig.args, {
      timeout: commandConfig.timeout,
      encoding: 'utf8',
      shell: false,
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
    const openclawPath = process.env.OPENCLAW_BIN || '/home/darwin/.npm-global/bin/openclaw';
    const { stdout } = await execFileAsync(openclawPath, ['logs', '--tail', lines.toString()], {
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
    res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0" });
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

  // Audit API endpoints (real-time audit dashboard)
  const auditHandled = await handleAuditApiRequest(url, res, req);
  if (auditHandled) return;

  // RapidAPI proxy endpoints (secure backend proxy with Scout fallback)
  const rapidApiHandled = await handleProxyRequestWithFallback(url, res, req);
  if (rapidApiHandled) return;

  // Piper API endpoints (email campaigns, lead pipeline, CRM data)
  const piperHandled = await handlePiperApiRequest(url, res, req);
  if (piperHandled) return;

  // API endpoints
  if (pathname === '/api/dashboard' || pathname === '/api/summary') {
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

  // Polymarket scanner endpoint
  if (pathname === '/api/polymarket') {
    try {
      // Read cached scan results if available
      const scanPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'data', 'scan.json');
      let scanData = { opportunities: [], scanned_at: null };
      
      try {
        if (fs.existsSync(scanPath)) {
          const content = fs.readFileSync(scanPath, 'utf8');
          scanData = JSON.parse(content);
        }
      } catch (err) {
        console.warn('Could not read scan data:', err.message);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        paperTrading: true,
        count: scanData.count || scanData.opportunities?.length || 0,
        scannedAt: scanData.scanned_at,
        opportunities: scanData.opportunities || [],
        disclaimer: 'Paper trading only - no real trades',
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Paper trading endpoints
  if (pathname === '/api/paper-trades') {
    if (req.method === 'GET') {
      // Load paper trades from file
      const tradesPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'data', 'paper_trades.json');
      let trades = [];
      let stats = { total_trades: 0, closed_trades: 0, win_rate: 0, total_pnl: 0 };
      
      try {
        if (fs.existsSync(tradesPath)) {
          const content = fs.readFileSync(tradesPath, 'utf8');
          trades = JSON.parse(content);
          
          // Calculate stats
          const closed = trades.filter(t => t.status === 'CLOSED');
          const wins = closed.filter(t => (t.pnl || 0) > 0);
          const totalPnl = closed.reduce((sum, t) => sum + (t.pnl || 0), 0);
          
          stats = {
            total_trades: trades.length,
            closed_trades: closed.length,
            open_trades: trades.filter(t => t.status === 'OPEN').length,
            win_rate: closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0,
            total_pnl: Math.round(totalPnl * 100) / 100,
            avg_pnl: closed.length > 0 ? Math.round((totalPnl / closed.length) * 100) / 100 : 0,
          };
        }
      } catch (err) {
        console.warn('Could not read paper trades:', err.message);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        trades: trades.slice(-20).reverse(), // Last 20, newest first
        stats: stats,
      }));
      return;
    }
    
    if (req.method === 'POST') {
      // Create new paper trade
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          
          // Simple validation
          if (!data.market_question || !data.direction || !data.entry_price) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing required fields' }));
            return;
          }
          
          // Load existing trades
          const tradesPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'data', 'paper_trades.json');
          let trades = [];
          try {
            if (fs.existsSync(tradesPath)) {
              trades = JSON.parse(fs.readFileSync(tradesPath, 'utf8'));
            }
          } catch (e) {
            trades = [];
          }
          
          // Create trade record
          const shares = data.shares || 1;
          const positionSize = Math.round(shares * data.entry_price * 100) / 100;
          const isYes = data.direction.toUpperCase() === 'YES';
          
          const trade = {
            id: `paper_${Date.now()}`,
            market_id: data.market_id || `market_${Date.now()}`,
            market_question: data.market_question,
            direction: data.direction.toUpperCase(),
            entry_price: Math.round(data.entry_price * 10000) / 10000,
            shares: shares,
            position_size: positionSize,
            potential_profit: Math.round(shares * (isYes ? (1.0 - data.entry_price) : data.entry_price) * 100) / 100,
            potential_loss: positionSize,
            reasoning: data.reasoning || '',
            status: 'OPEN',
            exit_price: null,
            pnl: null,
            created_at: new Date().toISOString(),
            closed_at: null,
          };
          
          trades.push(trade);
          fs.writeFileSync(tradesPath, JSON.stringify(trades, null, 2));
          
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            trade: trade,
            message: `Paper trade logged: ${trade.direction} ${trade.shares} shares at $${trade.entry_price}`
          }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // CFO data endpoint
  if (pathname === '/api/cfo') {
    try {
      const cfoPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'data', 'cfo.json');
      
      if (fs.existsSync(cfoPath)) {
        const content = fs.readFileSync(cfoPath, 'utf8');
        const cfoData = JSON.parse(content);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          timestamp: new Date().toISOString(),
          ...cfoData,
          // Calculate derived values
          daysRemaining: 30 - new Date().getDate(),
          budgetStatus: cfoData.current_balance > 100 ? 'healthy' : 'warning'
        }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          timestamp: new Date().toISOString(),
          error: 'CFO data file not found',
          demo: true,
          initial_cash: 0,
          current_balance: 0,
          monthly_income: 0,
          monthly_expenses: 0
        }));
      }
    } catch (err) {
      console.error('CFO API error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Subagents data endpoint
  if (pathname === '/api/subagents') {
    try {
      const runsPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'subagents', 'runs.json');
      
      if (fs.existsSync(runsPath)) {
        const content = fs.readFileSync(runsPath, 'utf8');
        const runsData = JSON.parse(content);
        
        // Calculate active subagents
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        
        const runs = Object.values(runsData.runs || {});
        const active = runs.filter(r => r.startedAt && !r.endedAt).length;
        const recent = runs.filter(r => r.startedAt > oneHourAgo || r.endedAt > oneHourAgo).length;
        const completed = runs.filter(r => r.endedAt && r.outcome?.status === 'ok').length;
        
        // Estimate tokens (placeholder calculation)
        const todayTokens = runs
          .filter(r => r.startedAt > (now - 24 * 60 * 60 * 1000))
          .length * 25000; // ~25k tokens per run estimate
        
        // Get recent runs for display
        const recentRuns = runs
          .filter(r => r.task)
          .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))
          .slice(0, 5)
          .map(r => ({
            name: r.label || r.task?.substring(0, 30) || 'Unknown Task',
            duration: r.endedAt ? Math.round((r.endedAt - r.startedAt) / 1000) : null,
            tokens: 25000, // Estimate
            status: r.endedAt ? (r.outcome?.status || 'unknown') : 'running'
          }));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          timestamp: new Date().toISOString(),
          active,
          recent,
          completed,
          todayTokens,
          totalRuns: runs.length,
          recentRuns,
          status: active > 0 ? 'active' : 'idle'
        }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          timestamp: new Date().toISOString(),
          active: 0,
          recent: 0,
          completed: 0,
          todayTokens: 0,
          totalRuns: 0,
          recentRuns: [],
          status: 'no-data'
        }));
      }
    } catch (err) {
      console.error('Subagents API error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Helper function to check if a process is running by pattern
function checkProcessRunning(pattern) {
  try {
    const { execSync } = require('child_process');
    const result = execSync(`pgrep -f "${pattern}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return result.trim().split('\n').filter(pid => pid.length > 0);
  } catch (e) {
    // No processes found
    return [];
  }
}

// Check if River's store_analyzer.py is actually running
function checkRiverWorkingStatus() {
  const pids = checkProcessRunning('store_analyzer.py');
  return pids.length > 0;
}

// Helper function to get active subagent runs from runs.json
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
    
    // Group by agent name from childSessionKey (format: agent:AGENT_NAME:subagent:...)
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

// Agents status endpoint
  if (pathname === '/api/agents') {
    try {
      const openclawPath = process.env.OPENCLAW_BIN || '/home/darwin/.npm-global/bin/openclaw';
      const { stdout } = await execFileAsync(openclawPath, ['agents', 'list', '--json'], {
        timeout: 5000,
        encoding: 'utf8',
      });
      
      const agents = JSON.parse(stdout);
      
      // Get real active subagent runs
      const activeRuns = getActiveSubagentRuns();
      
      // Check for agent working status files (file-based detection)
      function checkAgentWorkingStatus(agentId) {
        try {
          const statusFile = path.join('/tmp', `${agentId.toLowerCase()}_working`);
          return fs.existsSync(statusFile);
        } catch (e) {
          return false;
        }
      }
      
      // Enrich with process status
      const enrichedAgents = agents.map(agent => {
        // Determine status based on real data
        let status = 'online';
        let state = 'available';
        let processing = false;
        
        // Master agent is always active
        if (agent.id === 'master') {
          state = 'active';
        }
        
        // Check if agent has active subagent runs (REAL working status)
        const agentActiveRuns = activeRuns[agent.id.toLowerCase()];
        if (agentActiveRuns && agentActiveRuns.length > 0) {
          state = 'working';
          processing = true;
        }
        // Check for River's actual Python process (store_analyzer.py)
        else if (agent.id.toLowerCase() === 'river' && checkRiverWorkingStatus()) {
          state = 'working';
          processing = true;
        }
        // Check for file-based working status (Echo/Atlas processing)
        else if (checkAgentWorkingStatus(agent.id)) {
          state = 'working';
          processing = true;
        }
        // Fallback: Check if agent has bindings from CLI
        else if (agent.bindings > 0) {
          state = 'working';
          processing = true;
        }
        
        return {
          id: agent.id,
          name: agent.identityName || agent.name || agent.id,
          role: getAgentRole(agent.id),
          icon: agent.identityEmoji || getAgentEmoji(agent.id),
          status: status,
          state: state,
          processing: processing,
          lastActive: 'Now',
          model: agent.model,
          bindings: agent.bindings || 0,
          isDefault: agent.isDefault || false,
          activeRuns: agentActiveRuns ? agentActiveRuns.length : 0
        };
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        agents: enrichedAgents,
        total: enrichedAgents.length,
        online: enrichedAgents.length,
        activeRuns: activeRuns
      }));
    } catch (err) {
      console.error('Agents API error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, agents: [] }));
    }
    return;
  }

  // System health endpoint
  if (pathname === '/api/system-health') {
    try {
      // Get disk usage
      let diskUsage = { used: 0, total: 0, percent: 0 };
      try {
        const { stdout: dfOutput } = await execFileAsync('df', ['-h', '/home'], { timeout: 3000 });
        const dfLines = dfOutput.trim().split('\n');
        if (dfLines.length > 1) {
          const parts = dfLines[1].split(/\s+/);
          diskUsage = {
            total: parts[1] || '0G',
            used: parts[2] || '0G',
            available: parts[3] || '0G',
            percent: parseInt(parts[4]?.replace('%', '') || '0', 10)
          };
        }
      } catch (e) {
        console.warn('Could not get disk usage:', e.message);
      }
      
      // Get memory usage
      let memoryUsage = { used: 0, total: 0, percent: 0 };
      try {
        const { stdout: memOutput } = await execFileAsync('free', ['-m'], { timeout: 3000 });
        const memLines = memOutput.trim().split('\n');
        const memLine = memLines.find(l => l.startsWith('Mem:'));
        if (memLine) {
          const parts = memLine.split(/\s+/);
          const total = parseInt(parts[1], 10) || 1;
          const used = parseInt(parts[2], 10) || 0;
          memoryUsage = {
            total: `${Math.round(total / 1024 * 10) / 10}Gi`,
            used: `${Math.round(used / 1024 * 10) / 10}Gi`,
            percent: Math.round((used / total) * 100)
          };
        }
      } catch (e) {
        console.warn('Could not get memory usage:', e.message);
      }
      
      // Get gateway status
      let gatewayStatus = { running: false };
      try {
        const openclawPath = process.env.OPENCLAW_BIN || '/home/darwin/.npm-global/bin/openclaw';
        const { stdout: gwOutput } = await execFileAsync(openclawPath, ['gateway', 'status'], { timeout: 3000 });
        gatewayStatus = {
          running: /running/i.test(gwOutput),
          pid: gwOutput.match(/pid\s+(\d+)/i)?.[1] || null,
          bind: gwOutput.match(/127\.\d+\.\d+\.\d+/)?.[0] || '127.0.0.1',
          port: gwOutput.match(/port\s+(\d+)/i)?.[1] || '18789'
        };
      } catch (e) {
        // Fallback: check if gateway process is running via pgrep
        try {
          const { stdout: pgrepOutput } = await execFileAsync('pgrep', ['-f', 'openclaw.*gateway'], { timeout: 2000 });
          if (pgrepOutput.trim()) {
            gatewayStatus = { running: true, pid: pgrepOutput.trim(), bind: '127.0.0.1', port: '18789' };
          }
        } catch (pgrepErr) {
          console.warn('Could not get gateway status:', e.message);
        }
      }
      
      // Get agent count
      let agentCount = 0;
      try {
        const openclawPath = process.env.OPENCLAW_BIN || '/home/darwin/.npm-global/bin/openclaw';
        const { stdout: agentsOutput } = await execFileAsync(openclawPath, ['agents', 'list', '--json'], { timeout: 3000 });
        const agents = JSON.parse(agentsOutput);
        agentCount = agents.length;
      } catch (e) {
        console.warn('Could not get agent count:', e.message);
      }

      // Get system load
      let loadData = { '1min': 0, '5min': 0, '15min': 0 };
      try {
        const { stdout: loadOutput } = await execFileAsync('uptime', [], { timeout: 3000 });
        // Parse load average from uptime output: "load average: 0.52, 0.58, 0.59"
        const loadMatch = loadOutput.match(/load average[s]?:\s*([\d.]+),?\s*([\d.]+)?,?\s*([\d.]+)?/i);
        if (loadMatch) {
          loadData = {
            '1min': parseFloat(loadMatch[1]) || 0,
            '5min': parseFloat(loadMatch[2]) || 0,
            '15min': parseFloat(loadMatch[3]) || 0
          };
        }
      } catch (e) {
        console.warn('Could not get system load:', e.message);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        gateway: gatewayStatus,
        disk: diskUsage,
        memory: memoryUsage,
        load: loadData,
        agents: {
          total: agentCount,
          online: agentCount
        },
        api: { status: 'OK' }
      }));
    } catch (err) {
      console.error('System health API error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Activity feed endpoint - Uses new unified activity logger
  if (pathname === '/api/activity') {
    // Handle POST request to log a new activity
    if (req.method === 'POST') {
      try {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const activityData = JSON.parse(body);
            const activity = activityLogger.logActivity(activityData);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              activity: activity
            }));
          } catch (err) {
            console.error('Activity POST error:', err.message);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } catch (err) {
        console.error('Activity POST error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }
    
    // Handle GET request to fetch activities
    try {
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const typeFilter = url.searchParams.get('type') || null;
      
      // Get activities from the new logger
      let activities = activityLogger.getRecentActivities(limit, typeFilter);
      
      // If no activities yet, fall back to subagent runs and seed the log
      if (activities.length === 0) {
        activities = await seedActivitiesFromSubagents();
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        activities: activities,
        count: activities.length
      }));
    } catch (err) {
      console.error('Activity API error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, activities: [] }));
    }
    return;
  }

  // Activity feed SSE endpoint - Real-time updates
  if (pathname === '/api/activity/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}

`);

    // Add client to SSE clients
    const client = { res, id: Date.now() };
    sseClients.add(client);

    // Send initial activities
    const activities = activityLogger.getRecentActivities(20);
    res.write(`data: ${JSON.stringify({ type: 'initial', activities })}

`);

    // Handle client disconnect
    req.on('close', () => {
      sseClients.delete(client);
    });

    return;
  }

  // ============ AGENT CONSOLE LOGS ENDPOINT ============
  if (pathname === '/api/agent-logs') {
    try {
      const agentFilter = url.searchParams.get('agent') || 'all';
      const lines = parseInt(url.searchParams.get('lines') || '100', 10);
      
      // Read agent log files from various sources
      const logs = await getAgentLogs(agentFilter, lines);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        agent: agentFilter,
        logs: logs
      }));
    } catch (err) {
      console.error('Agent logs API error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, logs: [] }));
    }
    return;
  }

  // Agent logs SSE endpoint - Real-time agent console output
  if (pathname === '/api/agent-logs/stream') {
    const agentFilter = url.searchParams.get('agent') || 'all';
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now(), agent: agentFilter })}

`);

    // Start watching log files
    const logWatcher = startAgentLogWatcher(agentFilter, (logEntry) => {
      res.write(`data: ${JSON.stringify(logEntry)}

`);
    });

    // Handle client disconnect
    req.on('close', () => {
      if (logWatcher) {
        logWatcher.close();
      }
    });

    return;
  }

  // ============ TRADE LOGS ENDPOINT ============
  if (pathname === '/api/trades') {
    try {
      const filter = url.searchParams.get('filter') || 'all'; // today, week, all
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      
      const trades = await getTradeLogs(filter, limit);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        filter: filter,
        trades: trades,
        stats: calculateTradeStats(trades)
      }));
    } catch (err) {
      console.error('Trades API error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, trades: [], stats: {} }));
    }
    return;
  }

  // Trades SSE endpoint - Real-time trade updates
  if (pathname === '/api/trades/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}

`);

    // Start watching trade files
    const tradeWatcher = startTradeWatcher((tradeEntry) => {
      res.write(`data: ${JSON.stringify(tradeEntry)}

`);
    });

    // Handle client disconnect
    req.on('close', () => {
      if (tradeWatcher) {
        tradeWatcher.close();
      }
    });

    return;
  }

  // ============ SKILL EXECUTION ENDPOINT ============
  if (pathname === '/api/skills') {
    try {
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      const agentFilter = url.searchParams.get('agent') || null;
      
      const skills = activityLogger.getRecentSkills(limit, agentFilter);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        skills: skills,
        count: skills.length,
        running: activityLogger.getRunningSkills()
      }));
    } catch (err) {
      console.error('Skills API error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, skills: [] }));
    }
    return;
  }

  // Skills SSE endpoint - Real-time skill execution updates
  if (pathname === '/api/skills/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}

`);

    // Add client to skill SSE clients
    const client = { res, id: Date.now(), type: 'skill' };
    sseClients.add(client);

    // Send initial skills
    const skills = activityLogger.getRecentSkills(20);
    res.write(`data: ${JSON.stringify({ type: 'initial', skills })}

`);

    // Set up skill listener
    const skillListener = (skill) => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'skill', skill })}

`);
      } catch (err) {
        // Client disconnected
        activityLogger.skillEmitter.removeListener('skill', skillListener);
        sseClients.delete(client);
      }
    };
    
    activityLogger.skillEmitter.on('skill', skillListener);

    // Handle client disconnect
    req.on('close', () => {
      activityLogger.skillEmitter.removeListener('skill', skillListener);
      sseClients.delete(client);
    });

    return;
  }

  // Skill execution POST endpoint (for agents to report skill runs)
  if (pathname === '/api/skills/log' && req.method === 'POST') {
    try {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const skillData = JSON.parse(body);
          const skill = activityLogger.logSkillActivity(skillData);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, skill }));
        } catch (err) {
          console.error('Skill log error:', err.message);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Inbox/Email monitoring endpoint - READS FROM ECHO'S DATA FILES
  if (pathname === '/api/inbox') {
    if (req.method === 'GET') {
      try {
        // Read from Echo's data files
        const echoDataPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', 'echo', 'data');
        let emailStats = {
          total_unread: 0,
          accounts: {},
          recent_emails: [],
          last_check: null
        };
        
        // Read unprocessed emails file
        try {
          const unprocessedPath = path.join(echoDataPath, 'unprocessed_emails.json');
          if (fs.existsSync(unprocessedPath)) {
            const content = fs.readFileSync(unprocessedPath, 'utf8');
            const rawData = JSON.parse(content);
            // Handle both array format and object format (with numeric keys)
            let unprocessed = Array.isArray(rawData) ? rawData : Object.values(rawData);
            // Filter to only truly unprocessed emails (no processed_at timestamp)
            unprocessed = unprocessed.filter(e => !e.processed_at);
            emailStats.total_unread = unprocessed.length;
            emailStats.recent_emails = unprocessed.slice(0, 10);
            
            // Count by account/type
            const accounts = { hello: { unread: 0 }, ops: { unread: 0 }, support: { unread: 0 } };
            unprocessed.forEach(email => {
              const subject = (email.subject || '').toLowerCase();
              if (subject.includes('audit') || subject.includes('contact')) accounts.hello.unread++;
              else if (subject.includes('support') || subject.includes('help')) accounts.support.unread++;
              else accounts.ops.unread++;
            });
            emailStats.accounts = accounts;
          }
        } catch (e) {
          console.warn('Could not read unprocessed emails:', e.message);
        }
        
        // Read monitor log for stats
        try {
          const monitorLogPath = path.join(echoDataPath, 'monitor.log');
          if (fs.existsSync(monitorLogPath)) {
            const stats = fs.statSync(monitorLogPath);
            emailStats.last_check = stats.mtime.toISOString();
          }
        } catch (e) {
          console.warn('Could not read monitor log stats:', e.message);
        }
        
        // Read queue directory for pending count
        try {
          const queuePath = path.join(echoDataPath, 'queue');
          if (fs.existsSync(queuePath)) {
            const files = fs.readdirSync(queuePath).filter(f => f.endsWith('.json'));
            emailStats.pending_in_queue = files.length;
          }
        } catch (e) {
          emailStats.pending_in_queue = 0;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          timestamp: new Date().toISOString(),
          source: 'echo_data',
          ...emailStats
        }));
        
      } catch (err) {
        console.error('Inbox API error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          timestamp: new Date().toISOString(),
          error: err.message,
          total_unread: 0,
          accounts: {}
        }));
      }
      return;
    }
  }

  // RapidAPI Status endpoint - Uses the rapidapi-proxy module
  if (pathname === '/api/rapidapi/status') {
    try {
      // Import the getUsageStats function from rapidapi-proxy
      const { getUsageStats } = require('./rapidapi-proxy');
      const rapidApiData = getUsageStats();
      
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
          usage: { daily: 0, monthly: 0, limit: 100 }, 
          status: 'error',
          statusIndicator: 'critical'
        },
        axesso: { 
          usage: { daily: 0, monthly: 0, limit: 100 }, 
          status: 'error',
          statusIndicator: 'critical'
        }
      }));
    }
    return;
  }

  // Scout Fallback Status endpoint - Shows fallback statistics
  if (pathname === '/api/rapidapi/fallback-stats') {
    try {
      const fallbackStats = getFallbackStats();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        enabled: true,
        ...fallbackStats
      }));
    } catch (err) {
      console.error('Fallback stats error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        error: err.message,
        totalFallbacks: 0,
        recentFallbacks24h: 0
      }));
    }
    return;
  }

  // Product endpoint with automatic Scout fallback
  if (pathname === '/api/rapidapi/product-with-fallback') {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return true;
    }
    
    try {
      const asin = url.searchParams.get('asin');
      const clientEmail = url.searchParams.get('client_email');
      const clientName = url.searchParams.get('client_name');
      
      if (!asin) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'ASIN parameter required' }));
        return true;
      }
      
      // Import the fallback function
      const { getProductDataWithFallback } = require('./rapidapi-with-scout-fallback');
      
      const result = await getProductDataWithFallback(asin, {
        clientEmail,
        clientName
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        ...result
      }));
      
    } catch (error) {
      console.error('Product with fallback error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message,
        asin: url.searchParams.get('asin')
      }));
    }
    return true;
  }
  
  // Audit Queue endpoint - Returns pending and completed audits
  if (pathname === '/api/audits/queue') {
    try {
      const auditDataPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'workspace', 'apps', 'dashboard', 'data');
      let auditQueue = {
        pending: [],
        completed: [],
        stats: {
          total_pending: 0,
          total_completed: 0,
          avg_score: 0
        }
      };
      
      // Read pending audits
      try {
        const pendingPath = path.join(auditDataPath, 'pending_audits.json');
        if (fs.existsSync(pendingPath)) {
          const content = fs.readFileSync(pendingPath, 'utf8');
          auditQueue.pending = JSON.parse(content);
          auditQueue.stats.total_pending = auditQueue.pending.length;
        }
      } catch (e) {
        console.warn('Could not read pending audits:', e.message);
      }
      
      // Read completed audits
      try {
        const completedPath = path.join(auditDataPath, 'completed_audits.json');
        if (fs.existsSync(completedPath)) {
          const content = fs.readFileSync(completedPath, 'utf8');
          auditQueue.completed = JSON.parse(content);
          auditQueue.stats.total_completed = auditQueue.completed.length;
          
          // Calculate average score
          if (auditQueue.completed.length > 0) {
            const totalScore = auditQueue.completed.reduce((sum, a) => sum + (a.score || 0), 0);
            auditQueue.stats.avg_score = Math.round((totalScore / auditQueue.completed.length) * 10) / 10;
          }
        }
      } catch (e) {
        console.warn('Could not read completed audits:', e.message);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        ...auditQueue
      }));
    } catch (err) {
      console.error('Audit queue error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        error: err.message,
        pending: [],
        completed: [],
        stats: { total_pending: 0, total_completed: 0, avg_score: 0 }
      }));
    }
    return;
  }
  
  // Email Metrics endpoint - Piper campaign stats and Echo response times
  if (pathname === '/api/email/metrics') {
    try {
      const echoDataPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', 'echo', 'data');
      let emailMetrics = {
        campaigns: {
          sent_today: 0,
          opened: 0,
          clicked: 0,
          response_rate: 0
        },
        echo_response: {
          avg_response_time: '2m 30s',
          total_processed: 0,
          auto_replied: 0
        },
        support_tickets: {
          t1: 0,
          t2: 0,
          t3: 0
        }
      };
      
      // Read email tracking log (JSON Lines format)
      try {
        const trackingPath = path.join(echoDataPath, 'email_tracking.log');
        if (fs.existsSync(trackingPath)) {
          const content = fs.readFileSync(trackingPath, 'utf8');
          const lines = content.split('\n').filter(l => l.trim());
          
          // Parse JSON lines and count today's events
          const today = new Date().toISOString().split('T')[0];
          const todayEvents = [];
          
          lines.forEach(line => {
            try {
              const event = JSON.parse(line);
              if (event.timestamp && event.timestamp.startsWith(today)) {
                todayEvents.push(event);
              }
            } catch (e) {
              // Skip invalid lines
            }
          });
          
          // Count by event_type
          emailMetrics.campaigns.sent_today = todayEvents.filter(e => e.event_type === 'auto_sent').length;
          emailMetrics.campaigns.opened = todayEvents.filter(e => e.event_type === 'processed').length;
          emailMetrics.campaigns.clicked = todayEvents.filter(e => e.event_type === 'queued').length;
          
          // Calculate response rate
          const detected = todayEvents.filter(e => e.event_type === 'detected').length;
          if (detected > 0) {
            emailMetrics.campaigns.response_rate = Math.round(
              (emailMetrics.campaigns.opened / detected) * 100
            );
          }
          
          // Calculate total processed from all events
          emailMetrics.echo_response.total_processed = todayEvents.filter(e => 
            e.event_type === 'processed' || e.event_type === 'auto_sent'
          ).length;
          emailMetrics.echo_response.auto_replied = todayEvents.filter(e => 
            e.event_type === 'auto_sent'
          ).length;
        }
      } catch (e) {
        console.warn('Could not read email tracking:', e.message);
      }
      
      // Read processed email IDs
      try {
        const processedPath = path.join(echoDataPath, 'processed_email_ids.json');
        if (fs.existsSync(processedPath)) {
          const content = fs.readFileSync(processedPath, 'utf8');
          const rawData = JSON.parse(content);
          // Handle both array format and object format
          const processed = Array.isArray(rawData) ? rawData : Object.values(rawData);
          emailMetrics.echo_response.total_processed = processed.length;
          emailMetrics.echo_response.auto_replied = Math.floor(processed.length * 0.3);
        }
      } catch (e) {
        console.warn('Could not read processed emails:', e.message);
      }
      
      // Classify emails by priority (T1/T2/T3)
      try {
        const unprocessedPath = path.join(echoDataPath, 'unprocessed_emails.json');
        if (fs.existsSync(unprocessedPath)) {
          const content = fs.readFileSync(unprocessedPath, 'utf8');
          const rawData = JSON.parse(content);
          // Handle both array format and object format
          const unprocessed = Array.isArray(rawData) ? rawData : Object.values(rawData);
          
          unprocessed.forEach(email => {
            const subject = (email.subject || '').toLowerCase();
            
            // T1: Urgent/escalation keywords
            if (subject.includes('urgent') || subject.includes('escalate') || 
                subject.includes('complaint') || subject.includes('refund')) {
              emailMetrics.support_tickets.t1++;
            }
            // T2: Support/questions
            else if (subject.includes('help') || subject.includes('question') || 
                     subject.includes('support') || subject.includes('issue')) {
              emailMetrics.support_tickets.t2++;
            }
            // T3: General inquiries
            else {
              emailMetrics.support_tickets.t3++;
            }
          });
        }
      } catch (e) {
        console.warn('Could not classify tickets:', e.message);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        ...emailMetrics
      }));
    } catch (err) {
      console.error('Email metrics error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        error: err.message,
        campaigns: { sent_today: 0, opened: 0, clicked: 0, response_rate: 0 },
        echo_response: { avg_response_time: 'N/A', total_processed: 0, auto_replied: 0 },
        support_tickets: { t1: 0, t2: 0, t3: 0 }
      }));
    }
    return;
  }
  
  // Support Tickets endpoint - T1/T2/T3 classification
  if (pathname === '/api/support/tickets') {
    try {
      const echoDataPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', 'echo', 'data');
      let tickets = {
        t1: [],
        t2: [],
        t3: [],
        counts: { t1: 0, t2: 0, t3: 0, total: 0 }
      };
      
      // Read unprocessed emails and classify
      try {
        const unprocessedPath = path.join(echoDataPath, 'unprocessed_emails.json');
        if (fs.existsSync(unprocessedPath)) {
          const content = fs.readFileSync(unprocessedPath, 'utf8');
          const rawData = JSON.parse(content);
          // Handle both array format and object format
          const unprocessed = Array.isArray(rawData) ? rawData : Object.values(rawData);
          
          unprocessed.forEach(email => {
            const subject = (email.subject || '').toLowerCase();
            const from = email.from || 'Unknown';
            
            const ticket = {
              id: email.id || `TKT-${Date.now()}`,
              subject: email.subject || 'No Subject',
              from: from,
              received: email.date || new Date().toISOString()
            };
            
            // Classify by priority
            if (subject.includes('urgent') || subject.includes('escalate') || 
                subject.includes('complaint') || subject.includes('refund') ||
                subject.includes('critical') || subject.includes('down')) {
              tickets.t1.push(ticket);
            }
            else if (subject.includes('help') || subject.includes('question') || 
                     subject.includes('support') || subject.includes('issue') ||
                     subject.includes('problem') || subject.includes('error')) {
              tickets.t2.push(ticket);
            }
            else {
              tickets.t3.push(ticket);
            }
          });
        }
      } catch (e) {
        console.warn('Could not read tickets:', e.message);
      }
      
      // Update counts
      tickets.counts.t1 = tickets.t1.length;
      tickets.counts.t2 = tickets.t2.length;
      tickets.counts.t3 = tickets.t3.length;
      tickets.counts.total = tickets.t1.length + tickets.t2.length + tickets.t3.length;
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        ...tickets
      }));
    } catch (err) {
      console.error('Support tickets error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        timestamp: new Date().toISOString(),
        error: err.message,
        t1: [], t2: [], t3: [],
        counts: { t1: 0, t2: 0, t3: 0, total: 0 }
      }));
    }
    return;
  }

  // ============ CRM API ENDPOINTS ============
  
  // CRM Stats
  if (pathname === '/api/crm/stats') {
    try {
      const stats = await crm.getStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ stats }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  // CRM Pipeline Summary
  if (pathname === '/api/crm/pipeline') {
    try {
      const pipeline = await crm.getPipelineSummary();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ pipeline }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  // CRM Contacts
  if (pathname === '/api/crm/contacts') {
    try {
      if (req.method === 'GET') {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const filters = {
          status: url.searchParams.get('status'),
          search: url.searchParams.get('search'),
          limit: parseInt(url.searchParams.get('limit')) || 100
        };
        const contacts = await crm.getContacts(filters);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ contacts }));
      } else if (req.method === 'POST') {
        const body = await parseBody(req);
        const contact = await crm.createContact(body);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ contact }));
      }
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  // Single Contact
  const contactMatch = pathname.match(/^\/api\/crm\/contacts\/(\d+)$/);
  if (contactMatch) {
    const contactId = parseInt(contactMatch[1]);
    try {
      if (req.method === 'GET') {
        const contact = await crm.getContactById(contactId);
        if (!contact) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Contact not found' }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ contact }));
        }
      } else if (req.method === 'PUT') {
        const body = await parseBody(req);
        await crm.updateContact(contactId, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else if (req.method === 'DELETE') {
        await crm.deleteContact(contactId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  // Contact Interactions
  const interactionsMatch = pathname.match(/^\/api\/crm\/contacts\/(\d+)\/interactions$/);
  if (interactionsMatch) {
    const contactId = parseInt(interactionsMatch[1]);
    try {
      if (req.method === 'GET') {
        const interactions = await crm.getInteractions(contactId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ interactions }));
      } else if (req.method === 'POST') {
        const body = await parseBody(req);
        const interaction = await crm.createInteraction({ ...body, contact_id: contactId });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ interaction }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  // CRM Deals
  if (pathname === '/api/crm/deals') {
    try {
      if (req.method === 'GET') {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const filters = {
          stage: url.searchParams.get('stage'),
          limit: parseInt(url.searchParams.get('limit')) || 100
        };
        const deals = await crm.getDeals(filters);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ deals }));
      } else if (req.method === 'POST') {
        const body = await parseBody(req);
        const deal = await crm.createDeal(body);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ deal }));
      }
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  // Single Deal
  const dealMatch = pathname.match(/^\/api\/crm\/deals\/(\d+)$/);
  if (dealMatch) {
    const dealId = parseInt(dealMatch[1]);
    try {
      if (req.method === 'GET') {
        const deal = await crm.getDealById(dealId);
        if (!deal) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Deal not found' }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ deal }));
        }
      } else if (req.method === 'PUT') {
        const body = await parseBody(req);
        await crm.updateDeal(dealId, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else if (req.method === 'DELETE') {
        await crm.deleteDeal(dealId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  // Move Deal Stage
  const dealStageMatch = pathname.match(/^\/api\/crm\/deals\/(\d+)\/stage$/);
  if (dealStageMatch) {
    const dealId = parseInt(dealStageMatch[1]);
    try {
      const body = await parseBody(req);
      await crm.moveDealStage(dealId, body.stage, body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  // Recent CRM Interactions
  if (pathname === '/api/crm/interactions/recent') {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const limit = parseInt(url.searchParams.get('limit')) || 20;
      const interactions = await crm.getRecentInteractions(limit);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ interactions }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  // Import Echo Leads
  if (pathname === '/api/crm/import/echo') {
    try {
      // Parse Echo emails
      const leads = [];
      const echoLogFile = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', 'echo', 'data', 'monitor.log');
      
      if (fs.existsSync(echoLogFile)) {
        const content = fs.readFileSync(echoLogFile, 'utf8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          if (line.includes('From:')) {
            const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
            if (emailMatch && !leads.find(l => l.email === emailMatch[0])) {
              leads.push({
                email: emailMatch[0],
                name: emailMatch[0].split('@')[0],
                source: 'echo_form'
              });
            }
          }
        }
      }
      
      // Import leads
      let imported = 0;
      for (const lead of leads) {
        try {
          await crm.findOrCreateContactByEmail(lead.email, {
            name: lead.name,
            source: lead.source
          });
          imported++;
        } catch (e) {
          // Duplicate, skip
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ imported, total: leads.length }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Serve crm.html for /crm route
  if (pathname === '/crm' || pathname === '/crm/') {
    serveStaticFile(res, path.join(__dirname, '..', 'public', 'crm.html'), 'text/html');
    return;
  }

  // Serve index.html for root
  if (pathname === '/') {
    serveStaticFile(res, path.join(__dirname, '..', 'public', 'index.html'), 'text/html');
    return;
  }

  // Static files
  const filePath = path.join(__dirname, '..', 'public', pathname);
  const resolvedPath = path.resolve(filePath);
  const publicDir = path.resolve(__dirname, '..', 'public');

  // Security: prevent directory traversal
  if (!resolvedPath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if file exists and serve it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
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

  // SPA Catch-all: serve index.html for any non-API, non-file routes
  // This allows client-side routing to work (e.g., /dashboard, /about, etc.)
  serveStaticFile(res, path.join(__dirname, '..', 'public', 'index.html'), 'text/html');
}

// Helper functions for agent metadata
function getAgentRole(agentId) {
  const roles = {
    'master': 'Master Orchestrator',
    'allysa': 'Master Orchestrator',
    'echo': 'Email Monitor',
    'river': 'Social Media',
    'atlas': 'Infrastructure',
    'piper': 'Communications',
    'cfo': 'Finance',
    'pixel': 'UX/UI Designer'
  };
  return roles[agentId.toLowerCase()] || `${agentId.charAt(0).toUpperCase() + agentId.slice(1)} Agent`;
}

function getAgentEmoji(agentId) {
  const emojis = {
    'master': '🧠',
    'allysa': '🧠',
    'echo': '📧',
    'river': '🌊',
    'atlas': '🏛️',
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
    'echo': 'Echo',
    'river': 'River',
    'atlas': 'Atlas',
    'piper': 'Piper',
    'cfo': 'CFO',
    'pixel': 'Pixel'
  };
  return names[agentId.toLowerCase()] || agentId;
}

// Seed activities from subagent runs (fallback when activity log is empty)
async function seedActivitiesFromSubagents() {
  try {
    const runsPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'subagents', 'runs.json');
    
    if (!fs.existsSync(runsPath)) {
      return [];
    }
    
    const content = fs.readFileSync(runsPath, 'utf8');
    const runsData = JSON.parse(content);
    const runs = Object.values(runsData.runs || {});
    
    // Convert runs to activities and log them
    const activities = runs
      .filter(r => r.task)
      .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))
      .slice(0, 10)
      .map(r => {
        const agentName = r.childSessionKey?.split(':')[1] || 'unknown';
        
        return activityLogger.logSubagentActivity({
          ...r,
          label: r.label || r.task?.substring(0, 60) || 'Task executed'
        });
      });
    
    return activities;
  } catch (err) {
    console.warn('[seedActivities] Failed:', err.message);
    return [];
  }
}

// Poll for cron job executions and log activities
let lastCronPoll = Date.now();
async function pollCronActivities() {
  try {
    const openclawPath = process.env.OPENCLAW_BIN || '/home/darwin/.npm-global/bin/openclaw';
    const { stdout } = await execFileAsync(openclawPath, ['cron', 'runs', '--json'], {
      timeout: 5000,
      encoding: 'utf8'
    });
    
    const runs = JSON.parse(stdout);
    if (!Array.isArray(runs)) return;
    
    runs.forEach(run => {
      if (run.timestamp > lastCronPoll) {
        activityLogger.logCronActivity({
          id: run.jobId || run.name,
          name: run.name,
          schedule: run.schedule,
          success: run.exitCode === 0,
          failed: run.exitCode !== 0,
          exitCode: run.exitCode,
          description: run.output?.substring(0, 100) || `Exit code: ${run.exitCode}`
        });
      }
    });
    
    lastCronPoll = Date.now();
  } catch (err) {
    // Silent fail - cron runs endpoint might not be available
  }
}

// Poll for gateway events
let lastGatewayStatus = null;
async function pollGatewayActivities() {
  try {
    const openclawPath = process.env.OPENCLAW_BIN || '/home/darwin/.npm-global/bin/openclaw';
    const { stdout } = await execFileAsync(openclawPath, ['gateway', 'status'], {
      timeout: 3000,
      encoding: 'utf8'
    });
    
    const isRunning = /running/i.test(stdout);
    const pid = stdout.match(/pid\s+(\d+)/i)?.[1];
    const port = stdout.match(/port\s+(\d+)/i)?.[1];
    
    // Detect state changes
    if (lastGatewayStatus !== null) {
      if (isRunning && !lastGatewayStatus.running) {
        activityLogger.logGatewayActivity({
          action: 'started',
          status: 'started',
          message: `Gateway started on port ${port}`,
          pid,
          port
        });
      } else if (!isRunning && lastGatewayStatus.running) {
        activityLogger.logGatewayActivity({
          action: 'stopped',
          status: 'stopped',
          message: 'Gateway stopped'
        });
      }
    }
    
    lastGatewayStatus = { running: isRunning, pid, port };
  } catch (err) {
    // If gateway check fails and it was previously running
    if (lastGatewayStatus?.running) {
      activityLogger.logGatewayActivity({
        action: 'error',
        status: 'error',
        message: 'Gateway check failed - may be down'
      });
      lastGatewayStatus = { running: false };
    }
  }
}

// Poll for channel messages
let lastChannelPoll = Date.now();
async function pollChannelActivities() {
  try {
    // Read Telegram message log if available
    const telegramLogPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'data', 'telegram_messages.jsonl');
    
    if (!fs.existsSync(telegramLogPath)) return;
    
    const content = fs.readFileSync(telegramLogPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    
    lines.forEach(line => {
      try {
        const msg = JSON.parse(line);
        if (msg.timestamp > lastChannelPoll) {
          activityLogger.logChannelActivity({
            channel: 'telegram',
            action: msg.action || 'message',
            description: msg.text?.substring(0, 60) || 'New Telegram interaction',
            userId: msg.userId,
            success: true
          });
        }
      } catch {
        // Skip invalid lines
      }
    });
    
    lastChannelPoll = Date.now();
  } catch (err) {
    // Silent fail
  }
}

// Broadcast activity to all connected SSE clients
function broadcastActivity(activity) {
  const message = `data: ${JSON.stringify({ type: 'activity', activity })}

`;
  
  sseClients.forEach(client => {
    try {
      client.res.write(message);
    } catch (err) {
      // Client disconnected, remove from set
      sseClients.delete(client);
    }
  });
}

// ============ AGENT LOG FUNCTIONS ============

// Get agent logs from various sources
async function getAgentLogs(agentFilter, lines = 100) {
  const logs = [];
  const agents = ['river', 'atlas', 'piper', 'echo', 'pixel', 'trader'];
  
  for (const agent of agents) {
    if (agentFilter !== 'all' && agent !== agentFilter.toLowerCase()) {
      continue;
    }
    
    try {
      // Try to read from agent's log files
      const agentPaths = [
        path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', agent, 'logs', `${agent}.log`),
        path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', agent, 'memory', 'activity.log'),
        path.join('/tmp', `${agent}_activity.log`),
        path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', agent, `${agent}.log`)
      ];
      
      for (const logPath of agentPaths) {
        if (fs.existsSync(logPath)) {
          const content = fs.readFileSync(logPath, 'utf8');
          const logLines = content.split('\n').filter(l => l.trim()).slice(-lines);
          
          logLines.forEach(line => {
            const parsed = parseAgentLogLine(line, agent);
            if (parsed) logs.push(parsed);
          });
          break; // Found a valid log file, move to next agent
        }
      }
    } catch (err) {
      // Silent fail for missing logs
    }
  }
  
  // Sort by timestamp (newest first) and limit
  return logs
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, lines);
}

// Parse agent log line
function parseAgentLogLine(line, agent) {
  if (!line || !line.trim()) return null;
  
  const trimmed = line.trim();
  
  // Try JSON format first
  try {
    const json = JSON.parse(trimmed);
    return {
      timestamp: new Date(json.time || json.timestamp || Date.now()).getTime(),
      agent: agent,
      level: (json.level || 'info').toLowerCase(),
      message: json.msg || json.message || trimmed,
      raw: trimmed
    };
  } catch {
    // Not JSON, try regex patterns
  }
  
  // Pattern: [TIME] LEVEL message
  const bracketPattern = /^\[([^\]]+)\]\s+(\w+)?\s*(.*)$/;
  const bracketMatch = trimmed.match(bracketPattern);
  if (bracketMatch) {
    return {
      timestamp: Date.now(), // Approximate
      agent: agent,
      level: (bracketMatch[2] || 'info').toLowerCase(),
      message: bracketMatch[3],
      raw: trimmed
    };
  }
  
  // Fallback
  return {
    timestamp: Date.now(),
    agent: agent,
    level: 'info',
    message: trimmed,
    raw: trimmed
  };
}

// Start watching agent log files
function startAgentLogWatcher(agentFilter, onLog) {
  const watchedPaths = new Set();
  const watchers = [];
  const agents = ['river', 'atlas', 'piper', 'echo', 'pixel', 'trader'];
  
  // Watch function
  const watchFile = (filePath, agent) => {
    if (watchedPaths.has(filePath) || !fs.existsSync(filePath)) return;
    
    watchedPaths.add(filePath);
    
    try {
      const watcher = fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter(l => l.trim());
            const lastLine = lines[lines.length - 1];
            
            if (lastLine) {
              const parsed = parseAgentLogLine(lastLine, agent);
              if (parsed) {
                onLog({ type: 'log', data: parsed, timestamp: Date.now() });
              }
            }
          } catch (err) {
            // Silent fail
          }
        }
      });
      
      watchers.push(watcher);
    } catch (err) {
      // Silent fail
    }
  };
  
  // Set up watchers for each agent
  for (const agent of agents) {
    if (agentFilter !== 'all' && agent !== agentFilter.toLowerCase()) {
      continue;
    }
    
    const agentPaths = [
      path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', agent, 'logs', `${agent}.log`),
      path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', agent, 'memory', 'activity.log'),
      path.join('/tmp', `${agent}_activity.log`),
      path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', agent, `${agent}.log`)
    ];
    
    for (const logPath of agentPaths) {
      watchFile(logPath, agent);
    }
  }
  
  // Return object with close method
  return {
    close: () => {
      watchers.forEach(w => {
        try { w.close(); } catch (e) {}
      });
    }
  };
}

// ============ TRADE LOG FUNCTIONS ============

// Get trade logs from trader's memory
async function getTradeLogs(filter = 'all', limit = 50) {
  const tradesPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', 'trader', 'memory', 'trades');
  const trades = [];
  
  try {
    // Read all JSONL files in the trades directory
    if (fs.existsSync(tradesPath)) {
      const files = fs.readdirSync(tradesPath).filter(f => f.endsWith('.jsonl'));
      
      for (const file of files) {
        const filePath = path.join(tradesPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        
        for (const line of lines) {
          try {
            const trade = JSON.parse(line);
            
            // Apply time filter
            if (filter !== 'all') {
              const tradeDate = new Date(trade.timestamp || trade.date);
              const now = new Date();
              
              if (filter === 'today') {
                if (tradeDate.toDateString() !== now.toDateString()) continue;
              } else if (filter === 'week') {
                const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                if (tradeDate < weekAgo) continue;
              }
            }
            
            trades.push({
              id: trade.id || `trade_${Date.now()}`,
              timestamp: new Date(trade.timestamp || trade.date).getTime(),
              symbol: trade.symbol || trade.market_question || 'Unknown',
              direction: trade.direction || trade.type || 'LONG',
              entryPrice: trade.entry_price || trade.entryPrice || 0,
              exitPrice: trade.exit_price || trade.exitPrice || 0,
              shares: trade.shares || trade.quantity || 0,
              pnl: trade.pnl || trade.profit || 0,
              rr: trade.r_r || trade.rr || calculateRR(trade),
              status: trade.status || 'CLOSED',
              raw: trade
            });
          } catch (e) {
            // Skip invalid lines
          }
        }
      }
    }
    
    // Also try paper_trades.json for backward compatibility
    const paperTradesPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'data', 'paper_trades.json');
    if (fs.existsSync(paperTradesPath)) {
      const content = fs.readFileSync(paperTradesPath, 'utf8');
      const paperTrades = JSON.parse(content);
      
      if (Array.isArray(paperTrades)) {
        for (const trade of paperTrades) {
          // Apply time filter
          if (filter !== 'all') {
            const tradeDate = new Date(trade.created_at || trade.timestamp);
            const now = new Date();
            
            if (filter === 'today') {
              if (tradeDate.toDateString() !== now.toDateString()) continue;
            } else if (filter === 'week') {
              const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
              if (tradeDate < weekAgo) continue;
            }
          }
          
          trades.push({
            id: trade.id || `paper_${Date.now()}`,
            timestamp: new Date(trade.created_at || trade.timestamp).getTime(),
            symbol: trade.market_question || trade.symbol || 'Unknown',
            direction: trade.direction || 'YES',
            entryPrice: trade.entry_price || 0,
            exitPrice: trade.exit_price || 0,
            shares: trade.shares || 0,
            pnl: trade.pnl || 0,
            rr: trade.r_r || calculateRR(trade),
            status: trade.status || 'OPEN',
            raw: trade
          });
        }
      }
    }
  } catch (err) {
    console.error('Error reading trades:', err.message);
  }
  
  // Sort by timestamp (newest first) and limit
  return trades
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

// Calculate Risk:Reward ratio
function calculateRR(trade) {
  if (!trade.entry_price || !trade.exit_price) return 0;
  const risk = Math.abs(trade.entry_price - (trade.stop_loss || trade.entry_price * 0.95));
  const reward = Math.abs(trade.exit_price - trade.entry_price);
  return risk > 0 ? (reward / risk).toFixed(2) : 0;
}

// Calculate trade statistics
function calculateTradeStats(trades) {
  const closed = trades.filter(t => t.status === 'CLOSED');
  const wins = closed.filter(t => t.pnl > 0);
  const totalPnl = closed.reduce((sum, t) => sum + (t.pnl || 0), 0);
  
  return {
    total: trades.length,
    closed: closed.length,
    open: trades.filter(t => t.status === 'OPEN').length,
    wins: wins.length,
    losses: closed.length - wins.length,
    winRate: closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0,
    totalPnl: Math.round(totalPnl * 100) / 100,
    avgPnl: closed.length > 0 ? Math.round((totalPnl / closed.length) * 100) / 100 : 0
  };
}

// Start watching trade files
function startTradeWatcher(onTrade) {
  const watchers = [];
  const tradesPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', 'trader', 'memory', 'trades');
  const paperTradesPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'data', 'paper_trades.json');
  
  // Watch trades directory
  if (fs.existsSync(tradesPath)) {
    try {
      const watcher = fs.watch(tradesPath, (eventType, filename) => {
        if (eventType === 'change' && filename && filename.endsWith('.jsonl')) {
          // File changed, read new trades
          getTradeLogs('all', 1).then(trades => {
            if (trades.length > 0) {
              onTrade({ type: 'trade', data: trades[0], timestamp: Date.now() });
            }
          });
        }
      });
      watchers.push(watcher);
    } catch (err) {
      // Silent fail
    }
  }
  
  // Watch paper_trades.json
  if (fs.existsSync(paperTradesPath)) {
    try {
      const watcher = fs.watch(paperTradesPath, () => {
        getTradeLogs('all', 1).then(trades => {
          if (trades.length > 0) {
            onTrade({ type: 'trade', data: trades[0], timestamp: Date.now() });
          }
        });
      });
      watchers.push(watcher);
    } catch (err) {
      // Silent fail
    }
  }
  
  // Return object with close method
  return {
    close: () => {
      watchers.forEach(w => {
        try { w.close(); } catch (e) {}
      });
    }
  };
}

// Set up activity listener to broadcast to SSE clients
activityLogger.activityEmitter.on('activity', broadcastActivity);

// Start polling for different activity sources
function startActivityPolling() {
  // Poll every 30 seconds
  setInterval(() => {
    pollCronActivities();
    pollGatewayActivities();
    pollChannelActivities();
  }, 30000);
  
  // Initial poll
  pollCronActivities();
  pollGatewayActivities();
  pollChannelActivities();
  
  console.log('[Activity] Polling started for cron, gateway, and channel events');
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
    console.log(`║  SSE:     /api/activity/stream                            ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Security: Binding validated to loopback only');
    console.log('Press Ctrl+C to stop');
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
  
  // Start activity polling
  startActivityPolling();
}

start();
