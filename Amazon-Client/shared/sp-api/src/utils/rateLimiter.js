/**
 * Rate Limiting Handler for SP-API
 * Manages request throttling per client to respect Amazon's rate limits
 * 
 * Amazon SP-API Rate Limits:
 * - Default: 20 requests per second per seller
 * - Some endpoints: 10 requests per second
 * - Burst limits vary by endpoint
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

class RateLimiter {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.defaultRate = parseInt(process.env.MAX_REQUESTS_PER_SECOND) || 20;
    
    // Endpoint-specific rate limits (requests per second)
    this.endpointLimits = {
      'orders': { rate: 20, burst: 20 },
      'inventory': { rate: 20, burst: 20 },
      'pricing': { rate: 10, burst: 10 },
      'catalog': { rate: 5, burst: 5 },
      'reports': { rate: 15, burst: 15 },
      'feeds': { rate: 15, burst: 15 },
      'notifications': { rate: 10, burst: 10 }
    };

    this.redis.on('error', (err) => {
      logger.error('Redis connection error:', err.message);
    });
  }

  /**
   * Generate rate limit key for client + endpoint
   * @param {string} clientId - Client identifier
   * @param {string} endpoint - API endpoint category
   * @returns {string} Redis key
   */
  getKey(clientId, endpoint) {
    return `ratelimit:${clientId}:${endpoint}:${Math.floor(Date.now() / 1000)}`;
  }

  /**
   * Get rate limit configuration for endpoint
   * @param {string} endpoint - Endpoint category
   * @returns {Object} Rate limit config
   */
  getLimitConfig(endpoint) {
    return this.endpointLimits[endpoint] || { rate: this.defaultRate, burst: this.defaultRate };
  }

  /**
   * Check if request is allowed (sliding window)
   * @param {string} clientId - Client identifier
   * @param {string} endpoint - API endpoint category
   * @returns {Promise<Object>} Rate limit status
   */
  async checkLimit(clientId, endpoint = 'default') {
    const key = this.getKey(clientId, endpoint);
    const config = this.getLimitConfig(endpoint);
    
    try {
      // Increment counter
      const current = await this.redis.incr(key);
      
      // Set expiry on first request
      if (current === 1) {
        await this.redis.expire(key, 2); // 2 second window for safety
      }

      const allowed = current <= config.rate;
      const remaining = Math.max(0, config.rate - current);
      const retryAfter = allowed ? 0 : 1; // Retry after 1 second if limited

      return {
        allowed,
        limit: config.rate,
        remaining,
        retryAfter,
        current
      };
    } catch (error) {
      logger.error(`Rate limit check failed for ${clientId}:`, error.message);
      // Fail open - allow request if Redis fails
      return { allowed: true, limit: config.rate, remaining: 0, retryAfter: 0, current: 0 };
    }
  }

  /**
   * Wait for rate limit to reset if needed
   * @param {string} clientId - Client identifier
   * @param {string} endpoint - API endpoint category
   * @param {number} maxWaitMs - Maximum wait time in ms
   * @returns {Promise<boolean>} Whether request can proceed
   */
  async waitForSlot(clientId, endpoint = 'default', maxWaitMs = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.checkLimit(clientId, endpoint);
      
      if (status.allowed) {
        return true;
      }

      // Exponential backoff
      const waitTime = Math.min(1000, Math.pow(2, (status.current - status.limit)) * 100);
      logger.debug(`Rate limited for ${clientId}/${endpoint}, waiting ${waitTime}ms`);
      await this.sleep(waitTime);
    }

    logger.warn(`Rate limit wait timeout for ${clientId}/${endpoint}`);
    return false;
  }

  /**
   * Acquire token bucket for burst handling
   * @param {string} clientId - Client identifier
   * @param {string} endpoint - API endpoint category
   * @param {number} tokens - Number of tokens needed
   * @returns {Promise<boolean>} Whether tokens were acquired
   */
  async acquireTokens(clientId, endpoint = 'default', tokens = 1) {
    const bucketKey = `bucket:${clientId}:${endpoint}`;
    const config = this.getLimitConfig(endpoint);
    const now = Date.now();
    
    try {
      // Lua script for atomic token bucket operation
      const script = `
        local key = KEYS[1]
        local rate = tonumber(ARGV[1])
        local burst = tonumber(ARGV[2])
        local tokens = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])
        
        local bucket = redis.call('HMGET', key, 'tokens', 'last_update')
        local current_tokens = tonumber(bucket[1]) or burst
        local last_update = tonumber(bucket[2]) or now
        
        -- Add tokens based on time passed
        local time_passed = (now - last_update) / 1000
        local new_tokens = math.min(burst, current_tokens + (time_passed * rate))
        
        if new_tokens >= tokens then
          new_tokens = new_tokens - tokens
          redis.call('HMSET', key, 'tokens', new_tokens, 'last_update', now)
          redis.call('EXPIRE', key, 60)
          return 1
        else
          redis.call('HMSET', key, 'tokens', new_tokens, 'last_update', now)
          return 0
        end
      `;

      const result = await this.redis.eval(
        script,
        1,
        bucketKey,
        config.rate,
        config.burst,
        tokens,
        now
      );

      return result === 1;
    } catch (error) {
      logger.error(`Token bucket error for ${clientId}:`, error.message);
      return true; // Fail open
    }
  }

  /**
   * Get current rate limit status for all clients
   * @returns {Promise<Object>} Status summary
   */
  async getGlobalStatus() {
    try {
      const keys = await this.redis.keys('ratelimit:*');
      const status = {};
      
      for (const key of keys) {
        const [, clientId, endpoint] = key.split(':');
        const count = await this.redis.get(key);
        
        if (!status[clientId]) status[clientId] = {};
        status[clientId][endpoint] = parseInt(count) || 0;
      }
      
      return status;
    } catch (error) {
      logger.error('Failed to get global rate limit status:', error.message);
      return {};
    }
  }

  /**
   * Reset rate limits for a client
   * @param {string} clientId - Client identifier
   */
  async resetClient(clientId) {
    try {
      const keys = await this.redis.keys(`ratelimit:${clientId}:*`);
      const bucketKeys = await this.redis.keys(`bucket:${clientId}:*`);
      
      if (keys.length > 0) await this.redis.del(...keys);
      if (bucketKeys.length > 0) await this.redis.del(...bucketKeys);
      
      logger.info(`Rate limits reset for client: ${clientId}`);
    } catch (error) {
      logger.error(`Failed to reset rate limits for ${clientId}:`, error.message);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Middleware for Express routes
   */
  middleware(endpoint = 'default') {
    return async (req, res, next) => {
      const clientId = req.headers['x-client-id'] || req.params.clientId;
      
      if (!clientId) {
        return res.status(400).json({ error: 'Client ID required' });
      }

      const status = await this.checkLimit(clientId, endpoint);
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': status.limit,
        'X-RateLimit-Remaining': status.remaining,
        'X-RateLimit-Retry-After': status.retryAfter
      });

      if (!status.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: status.retryAfter
        });
      }

      next();
    };
  }
}

module.exports = new RateLimiter();
