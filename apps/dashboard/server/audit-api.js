/**
 * Amajungle Audit Dashboard API Module
 * Real-time data for Amazon store audit service
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// Configuration
const CONFIG = {
  RIVER_DATA_PATH: path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', 'river', 'data'),
  PIPER_DATA_PATH: path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', 'piper', 'data'),
  CACHE_TTL_MS: 5000,
  MAX_AUDIT_HISTORY: 100,
};

// Cache storage
const auditCache = new Map();

function getCached(key, ttl = CONFIG.CACHE_TTL_MS) {
  const now = Date.now();
  const cached = auditCache.get(key);
  if (cached && (now - cached.timestamp) < ttl) {
    return cached.data;
  }
  return null;
}

function setCached(key, data) {
  auditCache.set(key, { data, timestamp: Date.now() });
}

// ============================================
// AUDIT DATA COLLECTION
// ============================================

/**
 * Get all audit requests from River's results directory
 */
function getAuditResults() {
  const cacheKey = 'audit_results';
  const cached = getCached(cacheKey, 3000);
  if (cached) return cached;

  try {
    const resultsDir = path.join(CONFIG.RIVER_DATA_PATH, 'results');
    
    if (!fs.existsSync(resultsDir)) {
      return { audits: [], count: 0 };
    }

    const files = fs.readdirSync(resultsDir)
      .filter(f => f.startsWith('audit_') && f.endsWith('.json'))
      .map(f => {
        const filePath = path.join(resultsDir, f);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          const stats = fs.statSync(filePath);
          
          return {
            id: f.replace('.json', ''),
            ...data,
            file_mtime: stats.mtime.toISOString(),
            status: 'completed'
          };
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.analyzed_at || b.file_mtime) - new Date(a.analyzed_at || a.file_mtime));

    const result = { 
      audits: files.slice(0, CONFIG.MAX_AUDIT_HISTORY), 
      count: files.length,
      last_updated: new Date().toISOString()
    };
    
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Error reading audit results:', err.message);
    return { audits: [], count: 0, error: err.message };
  }
}

/**
 * Get active/pending audit jobs
 */
function getPendingJobs() {
  try {
    const jobsDir = path.join(CONFIG.RIVER_DATA_PATH, 'jobs');
    
    if (!fs.existsSync(jobsDir)) {
      return { jobs: [], count: 0 };
    }

    const files = fs.readdirSync(jobsDir)
      .filter(f => f.startsWith('audit_') && f.endsWith('.json'))
      .map(f => {
        const filePath = path.join(jobsDir, f);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          const stats = fs.statSync(filePath);
          
          return {
            id: f.replace('.json', ''),
            ...data,
            created_at: stats.birthtime.toISOString(),
            status: data.status || 'pending'
          };
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return { jobs: files, count: files.length };
  } catch (err) {
    console.error('Error reading pending jobs:', err.message);
    return { jobs: [], count: 0 };
  }
}

/**
 * Get sent audit emails from Piper
 */
function getSentAudits() {
  const cacheKey = 'sent_audits';
  const cached = getCached(cacheKey, 5000);
  if (cached) return cached;

  try {
    const sentDir = path.join(CONFIG.PIPER_DATA_PATH, 'sent');
    
    if (!fs.existsSync(sentDir)) {
      return { emails: [], count: 0 };
    }

    const files = fs.readdirSync(sentDir)
      .filter(f => f.startsWith('audit_') && f.endsWith('.json'))
      .map(f => {
        const filePath = path.join(sentDir, f);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          
          return {
            id: f.replace('.json', ''),
            ...data,
            sent_at: data.sent_at || data.timestamp
          };
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));

    const result = { 
      emails: files.slice(0, 50), 
      count: files.length,
      last_updated: new Date().toISOString()
    };
    
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Error reading sent audits:', err.message);
    return { emails: [], count: 0 };
  }
}

/**
 * Calculate audit statistics
 */
function calculateAuditStats() {
  const results = getAuditResults();
  const sent = getSentAudits();
  const pending = getPendingJobs();
  
  const audits = results.audits || [];
  const emails = sent.emails || [];
  
  // Calculate score distribution
  const scores = audits.map(a => a.overall_score || 0).filter(s => s > 0);
  const avgScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
    : 0;
  
  // Calculate today's stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayAudits = audits.filter(a => {
    const date = new Date(a.analyzed_at || a.file_mtime);
    return date >= today;
  });
  
  const todayEmails = emails.filter(e => {
    const date = new Date(e.sent_at);
    return date >= today;
  });
  
  // Calculate conversion (emails sent / audits completed)
  const conversionRate = audits.length > 0 
    ? Math.round((emails.length / audits.length) * 100) 
    : 0;
  
  // Calculate error rate
  const errorDir = path.join(CONFIG.PIPER_DATA_PATH, 'river_handoffs', 'errors');
  let errorCount = 0;
  if (fs.existsSync(errorDir)) {
    errorCount = fs.readdirSync(errorDir).filter(f => f.endsWith('.json')).length;
  }
  
  return {
    total_audits: audits.length,
    total_emails_sent: emails.length,
    pending_jobs: pending.count,
    avg_score: avgScore,
    today_audits: todayAudits.length,
    today_emails: todayEmails.length,
    conversion_rate: conversionRate,
    error_count: errorCount,
    score_distribution: {
      excellent: scores.filter(s => s >= 80).length,
      good: scores.filter(s => s >= 60 && s < 80).length,
      needs_work: scores.filter(s => s >= 40 && s < 60).length,
      poor: scores.filter(s => s < 40).length
    },
    last_updated: new Date().toISOString()
  };
}

/**
 * Get API usage data (placeholder for RapidAPI tracking)
 */
function getApiUsage() {
  // In production, this would track actual RapidAPI calls
  // For now, return placeholder data structure
  return {
    rapidapi: {
      daily_limit: 100,
      used_today: 0, // Would be tracked in a database
      remaining: 100,
      reset_time: '00:00 UTC',
      cost_today: 0.00
    },
    other_apis: {
      helium10: { calls: 0, limit: 1000 },
      keepa: { calls: 0, limit: 500 }
    },
    last_updated: new Date().toISOString()
  };
}

/**
 * Get recent activity for the feed
 */
function getRecentActivity(limit = 20) {
  const results = getAuditResults();
  const sent = getSentAudits();
  const pending = getPendingJobs();
  
  const activities = [];
  
  // Add completed audits
  (results.audits || []).slice(0, limit).forEach(audit => {
    activities.push({
      type: 'audit_complete',
      timestamp: audit.analyzed_at || audit.file_mtime,
      title: 'Audit Completed',
      description: `Store analyzed: ${audit.store_id || 'Unknown'}`,
      score: audit.overall_score,
      icon: '🔍',
      severity: audit.overall_score >= 60 ? 'success' : 'warning'
    });
  });
  
  // Add sent emails
  (sent.emails || []).slice(0, limit).forEach(email => {
    activities.push({
      type: 'email_sent',
      timestamp: email.sent_at,
      title: 'Email Sent',
      description: `To: ${email.client_name || email.client_email}`,
      score: email.score,
      icon: '📧',
      severity: 'success'
    });
  });
  
  // Add pending jobs
  (pending.jobs || []).slice(0, limit).forEach(job => {
    activities.push({
      type: 'job_pending',
      timestamp: job.created_at,
      title: 'Audit Requested',
      description: `Store: ${job.store_url || 'Unknown'}`,
      icon: '⏳',
      severity: 'info'
    });
  });
  
  // Sort by timestamp (newest first)
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  return activities.slice(0, limit);
}

/**
 * Get system health for audit pipeline
 */
async function getAuditPipelineHealth() {
  const checks = {
    river_agent: false,
    piper_agent: false,
    data_directories: false,
    email_system: false,
    recent_activity: false
  };
  
  try {
    // Check River agent
    const riverPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', 'river');
    checks.river_agent = fs.existsSync(riverPath) && 
                         fs.existsSync(path.join(riverPath, 'data', 'results'));
    
    // Check Piper agent
    const piperPath = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'agents', 'piper');
    checks.piper_agent = fs.existsSync(piperPath) && 
                         fs.existsSync(path.join(piperPath, 'data', 'sent'));
    
    // Check data directories
    checks.data_directories = checks.river_agent && checks.piper_agent;
    
    // Check for recent activity (within last hour)
    const results = getAuditResults();
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    checks.recent_activity = results.audits.some(a => {
      const time = new Date(a.analyzed_at || a.file_mtime).getTime();
      return time > oneHourAgo;
    });
    
    // Check email system (Piper's handler script exists)
    checks.email_system = fs.existsSync(
      path.join(piperPath, 'scripts', 'audit_handler.py')
    );
    
  } catch (err) {
    console.error('Health check error:', err.message);
  }
  
  const allHealthy = Object.values(checks).every(v => v);
  
  return {
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    last_check: new Date().toISOString()
  };
}

// ============================================
// API HANDLER
// ============================================

async function handleAuditApiRequest(url, res, req) {
  const pathname = url.pathname;
  
  // GET /api/audits - All audit data combined
  if (pathname === '/api/audits') {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        results: getAuditResults(),
        pending: getPendingJobs(),
        sent: getSentAudits(),
        stats: calculateAuditStats(),
        activity: getRecentActivity(20)
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return true;
  }
  
  // GET /api/audits/stats - Statistics only
  if (pathname === '/api/audits/stats') {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        stats: calculateAuditStats()
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return true;
  }
  
  // GET /api/audits/queue - Active queue status
  if (pathname === '/api/audits/queue') {
    try {
      const pending = getPendingJobs();
      const results = getAuditResults();
      
      // Calculate processing time estimate
      const recentAudits = results.audits.slice(0, 10);
      const processingTimes = recentAudits.map(a => {
        const start = new Date(a.created_at || a.file_mtime);
        const end = new Date(a.analyzed_at || a.file_mtime);
        return end - start;
      }).filter(t => t > 0);
      
      const avgProcessingTime = processingTimes.length > 0
        ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length / 1000)
        : 30; // Default 30 seconds
      
      const data = {
        timestamp: new Date().toISOString(),
        queue_length: pending.count,
        estimated_wait_seconds: pending.count * avgProcessingTime,
        avg_processing_time_seconds: avgProcessingTime,
        pending_jobs: pending.jobs.slice(0, 10)
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return true;
  }
  
  // GET /api/audits/health - Pipeline health
  if (pathname === '/api/audits/health') {
    try {
      const health = await getAuditPipelineHealth();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return true;
  }
  
  // GET /api/audits/usage - API usage tracking
  if (pathname === '/api/audits/usage') {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        usage: getApiUsage()
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return true;
  }
  
  // GET /api/audits/stream - Server-Sent Events for real-time updates
  if (pathname === '/api/audits/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send initial data
    const initialData = {
      type: 'init',
      timestamp: new Date().toISOString(),
      stats: calculateAuditStats()
    };
    res.write(`data: ${JSON.stringify(initialData)}\n\n`);

    // Set up polling interval
    const interval = setInterval(() => {
      const data = {
        type: 'update',
        timestamp: new Date().toISOString(),
        stats: calculateAuditStats()
      };
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }, 10000); // Send update every 10 seconds

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(interval);
    });

    return true;
  }
  
  return false; // Not an audit endpoint
}

module.exports = {
  handleAuditApiRequest,
  getAuditResults,
  getPendingJobs,
  getSentAudits,
  calculateAuditStats,
  getApiUsage,
  getRecentActivity,
  getAuditPipelineHealth
};