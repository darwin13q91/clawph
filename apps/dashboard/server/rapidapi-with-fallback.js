/**
 * RapidAPI with Scout Fallback
 * Simplified wrapper with JSONL usage tracking
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawnScoutForASIN } = require('./scout-helper');

// Load from .env file if not in environment
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

// Configuration
const RAPIDAPI_CONFIG = {
  API_KEY: process.env.RAPIDAPI_KEY || loadFromEnvFile('RAPIDAPI_KEY'),
  API_HOST: process.env.RAPIDAPI_HOST || 'real-time-amazon-data.p.rapidapi.com',
  MONTHLY_LIMIT: parseInt(process.env.RAPIDAPI_MONTHLY_LIMIT || '500', 10),
  ENABLED: process.env.RAPIDAPI_ENABLED !== 'false'
};

// Usage tracking file (JSONL format) - use ~/.openclaw/data/
const USAGE_LOG_FILE = path.join(process.env.HOME || '/home/darwin', '.openclaw', 'data', 'rapidapi_usage.jsonl');

// Ensure data directory exists
const dataDir = path.dirname(USAGE_LOG_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Log usage event to JSONL file
 * @param {Object} event - Usage event data
 */
function logUsage(event) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...event
  };
  
  try {
    fs.appendFileSync(USAGE_LOG_FILE, JSON.stringify(logEntry) + '\n');
  } catch (err) {
    console.error('[RAPIDAPI] Failed to log usage:', err.message);
  }
}

/**
 * Count requests in the last 24 hours from JSONL log
 * @param {string} source - 'rapidapi' or 'scout' or null for all
 * @returns {number} Count of requests
 */
function getRecentRequestCount(source = null, hours = 24) {
  try {
    if (!fs.existsSync(USAGE_LOG_FILE)) {
      return 0;
    }

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const content = fs.readFileSync(USAGE_LOG_FILE, 'utf8');
    const lines = content.trim().split('\n').filter(line => line);

    let count = 0;
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const entryTime = new Date(entry.timestamp);
        if (entryTime >= cutoff) {
          if (!source || entry.source === source) {
            count++;
          }
        }
      } catch (e) {
        // Skip malformed lines
      }
    }
    return count;
  } catch (err) {
    console.error('[RAPIDAPI] Failed to count requests:', err.message);
    return 0;
  }
}

/**
 * Make request to RapidAPI
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} API response
 */
async function makeRapidApiRequest(endpoint, params = {}) {
  if (!RAPIDAPI_CONFIG.ENABLED) {
    throw new Error('RapidAPI is disabled');
  }

  if (!RAPIDAPI_CONFIG.API_KEY) {
    throw new Error('RapidAPI key not configured');
  }

  // Check if we're near the limit
  const recentCount = getRecentRequestCount('rapidapi', 24);
  if (recentCount >= RAPIDAPI_CONFIG.MONTHLY_LIMIT) {
    const error = new Error('Rate limit would be exceeded');
    error.status = 429;
    throw error;
  }

  // Build query string
  const queryParams = new URLSearchParams(params);
  const queryString = queryParams.toString();
  const path = `${endpoint}${queryString ? '?' + queryString : ''}`;

  const options = {
    hostname: RAPIDAPI_CONFIG.API_HOST,
    path: path,
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_CONFIG.API_KEY,
      'X-RapidAPI-Host': RAPIDAPI_CONFIG.API_HOST,
      'Accept': 'application/json'
    },
    timeout: 15000
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const statusCode = res.statusCode;

        if (statusCode === 429) {
          const error = new Error('Rate limit exceeded (429)');
          error.status = 429;
          error.code = 'RATE_LIMIT';
          reject(error);
          return;
        }

        if (statusCode >= 400) {
          reject(new Error(`RapidAPI error: ${statusCode}`));
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
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Get product data with automatic Scout fallback on rate limit
 * This is the main function - tries RapidAPI first, falls back to Scout
 * 
 * @param {string} asin - Amazon ASIN
 * @returns {Promise<Object>} Product data with source indicator
 */
async function getProductData(asin) {
  if (!asin || !/^[A-Z0-9]{10}$/i.test(asin)) {
    throw new Error(`Invalid ASIN: ${asin}`);
  }

  const normalizedAsin = asin.toUpperCase();

  // Try RapidAPI first
  try {
    console.log(`[RAPIDAPI] Requesting product data for ASIN: ${normalizedAsin}`);
    
    const data = await makeRapidApiRequest('/product-details', {
      asin: normalizedAsin,
      country: 'US'
    });

    // Log successful RapidAPI call
    logUsage({
      asin: normalizedAsin,
      source: 'rapidapi',
      success: true,
      error: null
    });

    return {
      source: 'rapidapi',
      success: true,
      asin: normalizedAsin,
      data: data,
      fallback_used: false,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    // Check if this is a rate limit error
    const isRateLimit = error.status === 429 || 
                       error.code === 'RATE_LIMIT' ||
                       error.message?.includes('Rate limit');

    if (isRateLimit) {
      console.log(`[RAPIDAPI] Rate limit hit (${error.message}), falling back to Scout...`);

      // Log the RapidAPI failure
      logUsage({
        asin: normalizedAsin,
        source: 'rapidapi',
        success: false,
        error: error.message
      });

      try {
        // Spawn Scout for browser research
        const scoutData = await spawnScoutForASIN(normalizedAsin);

        // Log successful Scout fallback
        logUsage({
          asin: normalizedAsin,
          source: 'scout',
          success: true,
          error: null
        });

        return {
          source: 'scout',
          success: true,
          asin: normalizedAsin,
          data: scoutData,
          fallback_used: true,
          rapidapi_error: error.message,
          timestamp: new Date().toISOString()
        };

      } catch (scoutError) {
        // Log Scout failure
        logUsage({
          asin: normalizedAsin,
          source: 'scout',
          success: false,
          error: scoutError.message
        });

        throw new Error(
          `Both RapidAPI and Scout failed. ` +
          `RapidAPI: ${error.message}, Scout: ${scoutError.message}`
        );
      }
    }

    // Not a rate limit error - log and rethrow
    logUsage({
      asin: normalizedAsin,
      source: 'rapidapi',
      success: false,
      error: error.message
    });

    throw error;
  }
}

/**
 * Get usage statistics from JSONL log
 * @returns {Object} Usage statistics
 */
function getUsageStats() {
  const rapidapi24h = getRecentRequestCount('rapidapi', 24);
  const scout24h = getRecentRequestCount('scout', 24);
  const total24h = rapidapi24h + scout24h;

  return {
    last24h: {
      rapidapi: rapidapi24h,
      scout: scout24h,
      total: total24h,
      fallbackRate: total24h > 0 ? (scout24h / total24h * 100).toFixed(1) + '%' : '0%'
    },
    limits: {
      monthly: RAPIDAPI_CONFIG.MONTHLY_LIMIT,
      percentUsed: Math.round((rapidapi24h / RAPIDAPI_CONFIG.MONTHLY_LIMIT) * 100)
    },
    logFile: USAGE_LOG_FILE
  };
}

// Export main functions
module.exports = {
  getProductData,
  getUsageStats,
  getRecentRequestCount,
  logUsage,
  makeRapidApiRequest
};

// If run directly, test with sample ASIN
if (require.main === module) {
  const testAsin = process.argv[2] || 'B08N5WRWNW';
  
  console.log('=== RapidAPI with Scout Fallback - Test Mode ===');
  console.log(`Testing with ASIN: ${testAsin}`);
  console.log('');

  getProductData(testAsin)
    .then(result => {
      console.log('\n✅ Success!');
      console.log(`Source: ${result.source}`);
      console.log(`Fallback used: ${result.fallback_used}`);
      console.log(`Product title: ${result.data?.product?.title || result.data?.title || 'N/A'}`);
      
      console.log('\n--- Usage Stats ---');
      console.log(JSON.stringify(getUsageStats(), null, 2));
      
      process.exit(0);
    })
    .catch(error => {
      console.log('\n❌ Error:', error.message);
      
      console.log('\n--- Usage Stats ---');
      console.log(JSON.stringify(getUsageStats(), null, 2));
      
      process.exit(1);
    });
}
