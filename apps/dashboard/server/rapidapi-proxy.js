/**
 * RapidAPI Proxy Module
 * Securely proxies requests to RapidAPI with rate limiting and usage tracking
 * Now supports multiple providers: Real-Time Amazon Data + Axesso
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================
// PROVIDER CONFIGURATIONS
// ============================================

// Real-Time Amazon Data Provider (Primary)
const AMAZON_DATA_CONFIG = {
  API_KEY: process.env.RAPIDAPI_KEY || loadFromEnvFile('RAPIDAPI_KEY'),
  API_HOST: process.env.RAPIDAPI_HOST || 'real-time-amazon-data.p.rapidapi.com',
  MONTHLY_LIMIT: parseInt(process.env.RAPIDAPI_MONTHLY_LIMIT || '500', 10),
  DAILY_LIMIT: parseInt(process.env.RAPIDAPI_DAILY_LIMIT || '100', 10),
  ENABLED: process.env.RAPIDAPI_ENABLED !== 'false',
  NAME: 'Real-Time Amazon Data'
};

// Axesso Amazon Data Service Provider (Secondary)
const AXESSO_CONFIG = {
  API_KEY: process.env.RAPIDAPI_KEY || loadFromEnvFile('RAPIDAPI_KEY'), // Same API key
  API_HOST: 'axesso-axesso-amazon-data-service-v1.p.rapidapi.com',
  MONTHLY_LIMIT: parseInt(process.env.AXESSO_MONTHLY_LIMIT || '500', 10), // Separate free tier
  DAILY_LIMIT: parseInt(process.env.AXESSO_DAILY_LIMIT || '100', 10),
  ENABLED: process.env.AXESSO_ENABLED !== 'false',
  NAME: 'Axesso Amazon Data'
};

// Load API key from secure env file if not in environment
function loadFromEnvFile(key) {
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(new RegExp(`${key}=([^\\s]+)`));
      if (match) return match[1];
    }
  } catch (err) {
    console.warn('Failed to load from env file:', err.message);
  }
  return null;
}

// ============================================
// USAGE TRACKING
// ============================================

const USAGE_DIR = path.join(__dirname, '..', '..', 'data');
const AMAZON_USAGE_FILE = path.join(USAGE_DIR, 'rapidapi_usage.json');
const AXESSO_USAGE_FILE = path.join(USAGE_DIR, 'axesso_usage.json');

// Ensure data directory exists
if (!fs.existsSync(USAGE_DIR)) {
  fs.mkdirSync(USAGE_DIR, { recursive: true });
}

// Default usage data structure
function createDefaultUsageData() {
  return {
    totalRequests: 0,
    monthlyRequests: 0,
    dailyRequests: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    lastResetMonth: new Date().toISOString().slice(0, 7),
    requestLog: [],
    errors: []
  };
}

// Load usage data for a specific provider
function loadUsageData(provider) {
  const filePath = provider === 'axesso' ? AXESSO_USAGE_FILE : AMAZON_USAGE_FILE;
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.warn(`Failed to load usage data for ${provider}:`, err.message);
  }
  return createDefaultUsageData();
}

// Save usage data for a specific provider
function saveUsageData(provider, data) {
  const filePath = provider === 'axesso' ? AXESSO_USAGE_FILE : AMAZON_USAGE_FILE;
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Failed to save usage data for ${provider}:`, err.message);
  }
}

// Reset counters if needed
function resetCountersIfNeeded(data) {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);
  
  // Reset daily counter
  if (data.lastResetDate !== today) {
    data.dailyRequests = 0;
    data.lastResetDate = today;
  }
  
  // Reset monthly counter
  if (data.lastResetMonth !== thisMonth) {
    data.monthlyRequests = 0;
    data.lastResetMonth = thisMonth;
  }
  
  return data;
}

// Log a request for a specific provider
function logRequest(provider, endpoint, status, error = null) {
  const data = loadUsageData(provider);
  resetCountersIfNeeded(data);
  
  data.totalRequests++;
  data.monthlyRequests++;
  data.dailyRequests++;
  
  data.requestLog.push({
    timestamp: new Date().toISOString(),
    endpoint,
    status,
    error
  });
  
  // Keep only last 1000 entries
  if (data.requestLog.length > 1000) {
    data.requestLog = data.requestLog.slice(-1000);
  }
  
  saveUsageData(provider, data);
  return data;
}

// Log an error for a specific provider
function logError(provider, endpoint, error) {
  const data = loadUsageData(provider);
  
  data.errors.push({
    timestamp: new Date().toISOString(),
    endpoint,
    error: error.message || error,
    code: error.code
  });
  
  // Keep only last 100 errors
  if (data.errors.length > 100) {
    data.errors = data.errors.slice(-100);
  }
  
  saveUsageData(provider, data);
}

// Check rate limits for a provider
function checkRateLimits(provider) {
  const config = provider === 'axesso' ? AXESSO_CONFIG : AMAZON_DATA_CONFIG;
  const data = loadUsageData(provider);
  resetCountersIfNeeded(data);
  
  const limits = {
    daily: {
      used: data.dailyRequests,
      limit: config.DAILY_LIMIT,
      remaining: Math.max(0, config.DAILY_LIMIT - data.dailyRequests),
      percentUsed: Math.round((data.dailyRequests / config.DAILY_LIMIT) * 100)
    },
    monthly: {
      used: data.monthlyRequests,
      limit: config.MONTHLY_LIMIT,
      remaining: Math.max(0, config.MONTHLY_LIMIT - data.monthlyRequests),
      percentUsed: Math.round((data.monthlyRequests / config.MONTHLY_LIMIT) * 100)
    }
  };
  
  // Determine status
  let status = 'ok';
  if (limits.daily.remaining === 0 || limits.monthly.remaining === 0) {
    status = 'exceeded';
  } else if (limits.daily.percentUsed >= 80 || limits.monthly.percentUsed >= 80) {
    status = 'warning';
  }
  
  return { ...limits, status };
}

// Check if request should be blocked due to rate limits
function isRateLimited(provider) {
  const limits = checkRateLimits(provider);
  return limits.status === 'exceeded';
}

// ============================================
// API REQUESTS
// ============================================

// Make request to RapidAPI
async function makeRapidApiRequest(provider, endpoint, params = {}) {
  const config = provider === 'axesso' ? AXESSO_CONFIG : AMAZON_DATA_CONFIG;
  
  if (!config.ENABLED) {
    throw new Error(`${config.NAME} is disabled`);
  }
  
  if (!config.API_KEY) {
    throw new Error('RapidAPI key not configured');
  }
  
  if (isRateLimited(provider)) {
    throw new Error(`Rate limit exceeded for ${config.NAME}. Please try again tomorrow.`);
  }
  
  // Build query string
  const queryParams = new URLSearchParams(params);
  const queryString = queryParams.toString();
  const path = `${endpoint}${queryString ? '?' + queryString : ''}`;
  
  const options = {
    hostname: config.API_HOST,
    path: path,
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': config.API_KEY,
      'X-RapidAPI-Host': config.API_HOST,
      'Accept': 'application/json'
    },
    timeout: 10000
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const statusCode = res.statusCode;
        
        // Log the request
        logRequest(provider, endpoint, statusCode);
        
        if (statusCode === 429) {
          logError(provider, endpoint, { message: 'Rate limited by RapidAPI', code: 429 });
          reject(new Error(`Rate limit exceeded on ${config.NAME}`));
          return;
        }
        
        if (statusCode >= 400) {
          const errorMsg = `${config.NAME} error: ${statusCode}`;
          logError(provider, endpoint, { message: errorMsg, code: statusCode });
          reject(new Error(errorMsg));
          return;
        }
        
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (err) {
          resolve({ raw: data });
        }
      });
    });
    
    req.on('error', (err) => {
      logError(provider, endpoint, err);
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      logError(provider, endpoint, { message: 'Request timeout', code: 'TIMEOUT' });
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// ============================================
// USAGE STATS
// ============================================

// Get usage stats for a specific provider
function getProviderStats(provider) {
  const config = provider === 'axesso' ? AXESSO_CONFIG : AMAZON_DATA_CONFIG;
  const data = loadUsageData(provider);
  resetCountersIfNeeded(data);
  const limits = checkRateLimits(provider);
  
  // Calculate percentage used (MONTHLY is now the primary metric)
  const percentUsed = Math.round((data.monthlyRequests / config.MONTHLY_LIMIT) * 100);
  
  // Determine status indicator based on monthly usage
  let statusIndicator = 'healthy';
  if (percentUsed >= 90) {
    statusIndicator = 'critical';
  } else if (percentUsed >= 70) {
    statusIndicator = 'warning';
  }
  
  // Count recent 429 errors (last 24 hours)
  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const recent429Count = data.errors.filter(e => 
    e.code === 429 && new Date(e.timestamp) > oneDayAgo
  ).length;
  
  // Get last successful API call
  const lastSuccess = data.requestLog
    .filter(r => r.status === 200)
    .pop();
  
  // Calculate monthly billing cycle reset (first day of next month)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const msUntilReset = nextMonth - now;
  const daysUntilReset = Math.floor(msUntilReset / (1000 * 60 * 60 * 24));
  const hoursUntilReset = Math.floor((msUntilReset % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  // Format billing cycle info
  const resetDate = nextMonth.toISOString().split('T')[0];
  const formattedResetDate = nextMonth.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  
  return {
    name: config.NAME,
    enabled: config.ENABLED,
    configured: !!config.API_KEY,
    host: config.API_HOST,
    limits: {
      daily: config.DAILY_LIMIT,
      monthly: config.MONTHLY_LIMIT
    },
    usage: {
      total: data.totalRequests,
      daily: data.dailyRequests,
      monthly: data.monthlyRequests,
      percentUsed: percentUsed
    },
    remaining: {
      daily: limits.daily.remaining,
      monthly: limits.monthly.remaining
    },
    status: limits.status,
    statusIndicator: statusIndicator,
    recent429Count: recent429Count,
    lastSuccessfulCall: lastSuccess ? lastSuccess.timestamp : null,
    // Monthly billing cycle info
    billingCycle: {
      currentPeriod: data.lastResetMonth,
      resetDate: resetDate,
      formattedResetDate: formattedResetDate,
      daysUntilReset: daysUntilReset,
      hoursUntilReset: hoursUntilReset
    },
    timeUntilReset: {
      days: daysUntilReset,
      hours: hoursUntilReset,
      formatted: daysUntilReset > 0 
        ? `${daysUntilReset}d ${hoursUntilReset}h` 
        : `${hoursUntilReset}h`
    },
    // Keep daily reset for backward compatibility
    dailyTimeUntilReset: {
      hours: Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now) / (1000 * 60 * 60)),
      minutes: Math.floor(((new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now) % (1000 * 60 * 60)) / (1000 * 60)),
      formatted: `${Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now) / (1000 * 60 * 60))}h ${Math.floor(((new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now) % (1000 * 60 * 60)) / (1000 * 60))}m`
    },
    lastRequest: data.requestLog[data.requestLog.length - 1] || null,
    recentErrors: data.errors.slice(-5)
  };
}

// Get combined usage stats for all providers
function getUsageStats() {
  const amazonData = loadUsageData('amazon');
  const axessoData = loadUsageData('axesso');
  
  // Calculate next billing cycle reset (first day of next month)
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const msUntilReset = nextMonth - now;
  const daysUntilReset = Math.floor(msUntilReset / (1000 * 60 * 60 * 24));
  const hoursUntilReset = Math.floor((msUntilReset % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  return {
    amazon: getProviderStats('amazon'),
    axesso: getProviderStats('axesso'),
    combined: {
      // Monthly is now the primary metric
      totalMonthly: amazonData.monthlyRequests + axessoData.monthlyRequests,
      totalMonthlyLimit: AMAZON_DATA_CONFIG.MONTHLY_LIMIT + AXESSO_CONFIG.MONTHLY_LIMIT,
      monthlyPercentUsed: Math.round(((amazonData.monthlyRequests + axessoData.monthlyRequests) / 
        (AMAZON_DATA_CONFIG.MONTHLY_LIMIT + AXESSO_CONFIG.MONTHLY_LIMIT)) * 100),
      // Keep daily stats for reference
      totalDaily: amazonData.dailyRequests + axessoData.dailyRequests,
      totalDailyLimit: AMAZON_DATA_CONFIG.DAILY_LIMIT + AXESSO_CONFIG.DAILY_LIMIT,
      // Billing cycle info
      billingCycle: {
        resetDate: nextMonth.toISOString().split('T')[0],
        formattedResetDate: nextMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        daysUntilReset: daysUntilReset,
        hoursUntilReset: hoursUntilReset,
        formatted: daysUntilReset > 0 
          ? `${daysUntilReset} days` 
          : `${hoursUntilReset} hours`
      }
    }
  };
}

// ============================================
// ENDPOINT CONFIGURATIONS
// ============================================

// Real-Time Amazon Data endpoints
const AMAZON_ENDPOINTS = {
  search: {
    path: '/search',
    params: ['query', 'category', 'page'],
    description: 'Search Amazon products'
  },
  product: {
    path: '/product-details',
    params: ['asin', 'country'],
    description: 'Get product details by ASIN'
  },
  reviews: {
    path: '/product-reviews',
    params: ['asin', 'page'],
    description: 'Get product reviews'
  },
  deals: {
    path: '/deals',
    params: ['category', 'page'],
    description: 'Get current deals'
  },
  bestsellers: {
    path: '/bestsellers',
    params: ['category', 'country'],
    description: 'Get bestseller products'
  }
};

// Axesso endpoints
const AXESSO_ENDPOINTS = {
  seller: {
    path: '/amz/amazon-lookup-seller',
    params: ['sellerId', 'domainCode'],
    description: 'Get seller details by seller ID',
    required: ['sellerId']
  }
};

// ============================================
// REQUEST HANDLERS
// ============================================

// Handle Amazon Data API requests
async function handleAmazonRequest(url, res, req) {
  const pathname = url.pathname;
  const endpoint = pathname.replace('/api/rapidapi/amazon/', '');
  
  // Only allow specific endpoints
  if (!AMAZON_ENDPOINTS[endpoint]) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Unknown endpoint',
      available: Object.keys(AMAZON_ENDPOINTS)
    }));
    return true;
  }
  
  // GET requests only
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return true;
  }
  
  try {
    // Build params from query string
    const params = {};
    const searchParams = url.searchParams;
    const endpointConfig = AMAZON_ENDPOINTS[endpoint];
    
    endpointConfig.params.forEach(param => {
      if (searchParams.has(param)) {
        params[param] = searchParams.get(param);
      }
    });
    
    // Make the proxy request
    const result = await makeRapidApiRequest('amazon', endpointConfig.path, params);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      provider: 'amazon',
      endpoint,
      timestamp: new Date().toISOString(),
      data: result
    }));
    
  } catch (error) {
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('Rate limit')) statusCode = 429;
    if (error.message.includes('not configured')) statusCode = 503;
    
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      provider: 'amazon',
      error: error.message,
      endpoint,
      timestamp: new Date().toISOString()
    }));
  }
  
  return true;
}

// Handle Axesso API requests
async function handleAxessoRequest(url, res, req) {
  const pathname = url.pathname;
  const endpoint = pathname.replace('/api/rapidapi/axesso/', '');
  
  // Only allow specific endpoints
  if (!AXESSO_ENDPOINTS[endpoint]) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Unknown Axesso endpoint',
      available: Object.keys(AXESSO_ENDPOINTS)
    }));
    return true;
  }
  
  // GET requests only
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return true;
  }
  
  try {
    // Build params from query string
    const params = {};
    const searchParams = url.searchParams;
    const endpointConfig = AXESSO_ENDPOINTS[endpoint];
    
    // Map domain to domainCode for Axesso
    if (searchParams.has('domain')) {
      params.domainCode = searchParams.get('domain');
    }
    if (searchParams.has('domainCode')) {
      params.domainCode = searchParams.get('domainCode');
    }
    if (searchParams.has('sellerId')) {
      params.sellerId = searchParams.get('sellerId');
    }
    
    // Check required params
    if (endpointConfig.required) {
      for (const requiredParam of endpointConfig.required) {
        if (!params[requiredParam]) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            provider: 'axesso',
            error: `Missing required parameter: ${requiredParam}`,
            endpoint,
            timestamp: new Date().toISOString()
          }));
          return true;
        }
      }
    }
    
    // Make the proxy request
    const result = await makeRapidApiRequest('axesso', endpointConfig.path, params);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      provider: 'axesso',
      endpoint,
      timestamp: new Date().toISOString(),
      data: result
    }));
    
  } catch (error) {
    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('Rate limit')) statusCode = 429;
    if (error.message.includes('not configured')) statusCode = 503;
    
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      provider: 'axesso',
      error: error.message,
      endpoint,
      timestamp: new Date().toISOString()
    }));
  }
  
  return true;
}

// Main proxy request handler
async function handleProxyRequest(url, res, req) {
  const pathname = url.pathname;
  
  // Status endpoint - returns stats for all providers
  if (pathname === '/api/rapidapi/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getUsageStats()));
    return true;
  }
  
  // Axesso-specific status endpoint
  if (pathname === '/api/rapidapi/axesso/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getProviderStats('axesso')));
    return true;
  }
  
  // Amazon-specific status endpoint
  if (pathname === '/api/rapidapi/amazon/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getProviderStats('amazon')));
    return true;
  }
  
  // Amazon Data proxy endpoints
  if (pathname.startsWith('/api/rapidapi/amazon/')) {
    return handleAmazonRequest(url, res, req);
  }
  
  // Axesso proxy endpoints
  if (pathname.startsWith('/api/rapidapi/axesso/')) {
    return handleAxessoRequest(url, res, req);
  }
  
  return false;
}

module.exports = {
  handleProxyRequest,
  getUsageStats,
  getProviderStats,
  checkRateLimits,
  AMAZON_ENDPOINTS,
  AXESSO_ENDPOINTS
};
