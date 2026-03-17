/**
 * RapidAPI with Scout Fallback Module
 * Automatically falls back to Scout (browser agent) when RapidAPI hits rate limits
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

// Import existing RapidAPI proxy for base functionality
const rapidApiProxy = require('./rapidapi-proxy');

const execAsync = promisify(exec);

// ============================================
// CONFIGURATION
// ============================================

const SCOUT_CONFIG = {
  SCRIPT_PATH: '/home/darwin/.openclaw/agents/scout/scripts/deep-audit.sh',
  REPORTS_DIR: '/home/darwin/.openclaw/agents/scout/reports',
  TIMEOUT_MS: 120000, // 2 minutes timeout for Scout
  ENABLED: process.env.SCOUT_FALLBACK_ENABLED !== 'false'
};

// Fallback tracking
const FALLBACK_LOG_FILE = path.join(__dirname, '..', '..', 'data', 'scout_fallback_log.json');

// ============================================
// FALLBACK TRACKING & MONITORING
// ============================================

/**
 * Ensure fallback log file exists
 */
function ensureFallbackLog() {
  const dir = path.dirname(FALLBACK_LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(FALLBACK_LOG_FILE)) {
    fs.writeFileSync(FALLBACK_LOG_FILE, JSON.stringify({
      fallbacks: [],
      stats: {
        totalFallbacks: 0,
        lastFallback: null,
        rapidApiUsageBeforeFallback: 0,
        scoutUsage: 0
      }
    }, null, 2));
  }
}

/**
 * Log a fallback event for monitoring
 */
function logFallbackEvent(asin, rapidApiError, scoutSuccess) {
  ensureFallbackLog();
  
  try {
    const log = JSON.parse(fs.readFileSync(FALLBACK_LOG_FILE, 'utf8'));
    
    const event = {
      timestamp: new Date().toISOString(),
      asin,
      rapidApiError: rapidApiError?.message || rapidApiError,
      scoutSuccess,
      rapidApiStats: rapidApiProxy.getUsageStats()
    };
    
    log.fallbacks.push(event);
    log.stats.totalFallbacks++;
    log.stats.lastFallback = event.timestamp;
    log.stats.rapidApiUsageBeforeFallback = event.rapidApiStats.combined.totalMonthly;
    
    // Keep only last 100 fallback events
    if (log.fallbacks.length > 100) {
      log.fallbacks = log.fallbacks.slice(-100);
    }
    
    fs.writeFileSync(FALLBACK_LOG_FILE, JSON.stringify(log, null, 2));
    
    // Also log to console for immediate visibility
    console.log(`[SCOUT FALLBACK] ASIN ${asin}: ${scoutSuccess ? 'SUCCESS' : 'FAILED'}`);
    
  } catch (err) {
    console.error('[SCOUT FALLBACK] Failed to log fallback event:', err.message);
  }
}

/**
 * Get fallback statistics for monitoring
 */
function getFallbackStats() {
  ensureFallbackLog();
  
  try {
    const log = JSON.parse(fs.readFileSync(FALLBACK_LOG_FILE, 'utf8'));
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    
    // Calculate recent stats
    const recentFallbacks = log.fallbacks.filter(f => 
      new Date(f.timestamp) > oneDayAgo
    );
    
    return {
      ...log.stats,
      recentFallbacks24h: recentFallbacks.length,
      recentEvents: recentFallbacks.slice(-10),
      rapidApiVsScout: {
        rapidApiCalls: log.stats.rapidApiUsageBeforeFallback,
        scoutCalls: log.stats.scoutUsage
      }
    };
  } catch (err) {
    return {
      error: err.message,
      totalFallbacks: 0,
      recentFallbacks24h: 0
    };
  }
}

// ============================================
// SCOUT SPAWNING
// ============================================

/**
 * Spawn Scout agent to perform deep audit via browser
 * @param {string} asin - Amazon ASIN to analyze
 * @returns {Promise<Object>} Scout analysis results
 */
async function spawnScoutForASIN(asin) {
  if (!SCOUT_CONFIG.ENABLED) {
    throw new Error('Scout fallback is disabled');
  }
  
  console.log(`[SCOUT FALLBACK] Spawning Scout for ASIN: ${asin}`);
  
  try {
    // Execute Scout deep-audit script
    const { stdout, stderr } = await execAsync(
      `${SCOUT_CONFIG.SCRIPT_PATH} ${asin}`,
      { 
        timeout: SCOUT_CONFIG.TIMEOUT_MS,
        cwd: '/home/darwin/.openclaw/agents/scout'
      }
    );
    
    if (stderr) {
      console.warn('[SCOUT FALLBACK] Scout stderr:', stderr);
    }
    
    // Parse the Scout output to find the report file
    const reportMatch = stdout.match(/Report:\s*(\S+)/);
    if (!reportMatch) {
      throw new Error('Could not find report file in Scout output');
    }
    
    const reportFile = reportMatch[1];
    
    // Read and parse the Scout report
    const scoutData = readScoutReport(reportFile);
    
    // Transform Scout data to RapidAPI-compatible format
    return transformScoutToRapidApiFormat(scoutData, asin);
    
  } catch (error) {
    console.error('[SCOUT FALLBACK] Scout execution failed:', error.message);
    throw error;
  }
}

/**
 * Read and parse a Scout report file
 * @param {string} reportPath - Path to Scout report JSON
 * @returns {Object} Parsed report data
 */
function readScoutReport(reportPath) {
  try {
    if (!fs.existsSync(reportPath)) {
      // Try to find the most recent report for this ASIN
      const asin = path.basename(reportPath).split('_')[0];
      const reportsDir = SCOUT_CONFIG.REPORTS_DIR;
      
      if (fs.existsSync(reportsDir)) {
        const files = fs.readdirSync(reportsDir)
          .filter(f => f.startsWith(asin) && f.endsWith('.json'))
          .sort()
          .reverse();
        
        if (files.length > 0) {
          reportPath = path.join(reportsDir, files[0]);
        }
      }
    }
    
    if (!fs.existsSync(reportPath)) {
      throw new Error(`Report file not found: ${reportPath}`);
    }
    
    const content = fs.readFileSync(reportPath, 'utf8');
    return JSON.parse(content);
    
  } catch (error) {
    console.error('[SCOUT FALLBACK] Failed to read report:', error.message);
    throw error;
  }
}

/**
 * Transform Scout report format to RapidAPI-compatible format
 * This ensures the rest of the system can consume Scout data the same way
 */
function transformScoutToRapidApiFormat(scoutData, asin) {
  const extraction = scoutData.rawExtraction || {};
  
  return {
    source: 'scout',
    asin: asin,
    timestamp: scoutData.auditMetadata?.timestamp || new Date().toISOString(),
    // RapidAPI-compatible product structure
    product: {
      asin: asin,
      title: extraction.title || 'Unknown Product',
      price: extraction.price || null,
      rating: extraction.rating || null,
      reviews_count: extraction.reviewCount || 0,
      bestsellers_rank: extraction.bsr || null,
      brand: extraction.brand || null,
      availability: extraction.availability || null,
      images: extraction.images || [],
      features: extraction.features || [],
      has_a_plus_content: extraction.hasAPlus || false,
      a_plus_content: extraction.aPlusContent || [],
      description: extraction.description || null
    },
    // Scout-specific metadata
    scout: {
      screenshotFile: scoutData.auditMetadata?.screenshotFile || null,
      reportFile: scoutData.auditMetadata?.reportFile || null,
      extractionMethod: 'browser_agent',
      extractionTimestamp: scoutData.auditMetadata?.timestamp
    },
    // Analysis placeholder (to be filled by River)
    analysis: {
      listing_quality_score: null,
      optimization_opportunities: [],
      competitive_position: null
    }
  };
}

// ============================================
// MAIN FALLBACK WRAPPER
// ============================================

/**
 * Get product data with automatic Scout fallback on rate limit
 * This is the main function to use instead of calling RapidAPI directly
 * 
 * @param {string} asin - Amazon ASIN
 * @param {Object} options - Options for the request
 * @returns {Promise<Object>} Product data with source indicator
 */
async function getProductDataWithFallback(asin, options = {}) {
  const { 
    skipScoutFallback = false,
    notifyOnFallback = true,
    clientEmail = null,
    clientName = null
  } = options;
  
  // Try RapidAPI first
  try {
    console.log(`[RAPIDAPI] Requesting product data for ASIN: ${asin}`);
    
    // Use the existing proxy to make the request
    const rapidApiData = await makeRapidApiProductRequest(asin);
    
    return {
      source: 'rapidapi',
      success: true,
      data: rapidApiData,
      fallbackUsed: false
    };
    
  } catch (error) {
    // Check if this is a rate limit error
    const isRateLimit = error.status === 429 || 
                       error.code === 'RATE_LIMIT' ||
                       error.message?.includes('Rate limit') ||
                       error.message?.includes('exceeded');
    
    if (isRateLimit && !skipScoutFallback) {
      console.log(`[RAPIDAPI] Rate limit hit, falling back to Scout...`);
      
      // Send notification to client if email provided
      if (notifyOnFallback && clientEmail) {
        await notifyClientOfDeepResearch(clientEmail, clientName, asin);
      }
      
      try {
        // Spawn Scout for browser research
        const scoutData = await spawnScoutForASIN(asin);
        
        // Log the fallback event
        logFallbackEvent(asin, error, true);
        
        return {
          source: 'scout',
          success: true,
          data: scoutData,
          fallbackUsed: true,
          rapidApiError: error.message
        };
        
      } catch (scoutError) {
        // Scout also failed
        logFallbackEvent(asin, error, false);
        
        throw new Error(
          `Both RapidAPI and Scout failed. ` +
          `RapidAPI: ${error.message}, Scout: ${scoutError.message}`
        );
      }
    }
    
    // Not a rate limit error, or fallback disabled
    throw error;
  }
}

/**
 * Make a product request via the existing RapidAPI proxy
 */
async function makeRapidApiProductRequest(asin) {
  // Simulate a request to the product endpoint
  // In production, this would call the actual RapidAPI endpoint
  
  return new Promise((resolve, reject) => {
    // Check rate limits first
    const limits = rapidApiProxy.checkRateLimits('amazon');
    
    if (limits.status === 'exceeded') {
      const error = new Error('Rate limit exceeded for Real-Time Amazon Data');
      error.status = 429;
      error.code = 'RATE_LIMIT';
      reject(error);
      return;
    }
    
    // Mock implementation - in production this would make actual API call
    // For now, we'll check if we should simulate rate limit for testing
    const stats = rapidApiProxy.getUsageStats();
    
    if (stats.combined.monthlyPercentUsed >= 100) {
      const error = new Error('Rate limit exceeded');
      error.status = 429;
      error.code = 'RATE_LIMIT';
      reject(error);
      return;
    }
    
    // Simulate API call (in production, use actual RapidAPI)
    reject(new Error('Rate limit exceeded for Real-Time Amazon Data'));
  });
}

/**
 * Send email notification to client about deep research
 */
async function notifyClientOfDeepResearch(clientEmail, clientName, asin) {
  try {
    // This would integrate with your email system
    // For now, we log it - Echo/Piper will handle the actual email
    
    const notification = {
      type: 'scout_fallback_notification',
      timestamp: new Date().toISOString(),
      clientEmail,
      clientName,
      asin,
      message: 'Deep research in progress (2-3 minutes)'
    };
    
    // Write to a queue file for Echo to pick up
    const queueDir = '/home/darwin/.openclaw/agents/echo/data/scout_notifications';
    if (!fs.existsSync(queueDir)) {
      fs.mkdirSync(queueDir, { recursive: true });
    }
    
    const queueFile = path.join(queueDir, `scout_notify_${Date.now()}.json`);
    fs.writeFileSync(queueFile, JSON.stringify(notification, null, 2));
    
    console.log(`[SCOUT FALLBACK] Queued notification for ${clientEmail}`);
    
  } catch (error) {
    console.error('[SCOUT FALLBACK] Failed to queue notification:', error.message);
  }
}

// ============================================
// API ENDPOINT HANDLER
// ============================================

/**
 * Handle API requests with Scout fallback support
 */
async function handleProxyRequestWithFallback(url, res, req) {
  const pathname = url.pathname;
  
  // Fallback stats endpoint
  if (pathname === '/api/rapidapi/fallback-stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      timestamp: new Date().toISOString(),
      ...getFallbackStats()
    }));
    return true;
  }
  
  // Product endpoint with automatic fallback
  if (pathname === '/api/rapidapi/product-with-fallback') {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return true;
    }
    
    const asin = url.searchParams.get('asin');
    const clientEmail = url.searchParams.get('client_email');
    const clientName = url.searchParams.get('client_name');
    
    if (!asin) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'ASIN parameter required' }));
      return true;
    }
    
    try {
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
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message,
        asin
      }));
    }
    
    return true;
  }
  
  // Pass through to original handler for other endpoints
  return rapidApiProxy.handleProxyRequest(url, res, req);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Main function
  getProductDataWithFallback,
  
  // Scout functions
  spawnScoutForASIN,
  readScoutReport,
  transformScoutToRapidApiFormat,
  
  // Monitoring
  getFallbackStats,
  logFallbackEvent,
  
  // API handler
  handleProxyRequestWithFallback,
  
  // Config
  SCOUT_CONFIG
};