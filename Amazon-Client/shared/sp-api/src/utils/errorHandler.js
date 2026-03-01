/**
 * SP-API Error Handler
 * Standardized error handling with retry logic
 */

const logger = require('./logger');

class SPAPIError extends Error {
  constructor(message, code, statusCode, retryable = false, details = {}) {
    super(message);
    this.name = 'SPAPIError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
  }
}

class ErrorHandler {
  constructor() {
    // Retry configuration
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      exponentialBase: 2
    };

    // Error codes that are retryable
    this.retryableErrors = new Set([
      'InternalFailure',
      'ServiceUnavailable',
      'RequestTimeout',
      'ThrottlingException',
      'QuotaExceeded',
      'InternalError'
    ]);

    // HTTP status codes that trigger retry
    this.retryableStatusCodes = new Set([429, 500, 502, 503, 504]);
  }

  /**
   * Classify error from Amazon SP-API response
   * @param {Error} error - Axios error object
   * @returns {SPAPIError} Classified error
   */
  classifyError(error) {
    const response = error.response;
    
    if (!response) {
      // Network error
      return new SPAPIError(
        error.message || 'Network error',
        'NetworkError',
        0,
        true,
        { original: error }
      );
    }

    const statusCode = response.status;
    const data = response.data || {};
    
    // Extract error details
    const errorCode = data.code || data.errorCode || data.error || 'UnknownError';
    const errorMessage = data.message || data.errors?.[0]?.message || error.message;
    
    // Determine if retryable
    const isRetryable = this.retryableErrors.has(errorCode) || 
                       this.retryableStatusCodes.has(statusCode);

    return new SPAPIError(
      errorMessage,
      errorCode,
      statusCode,
      isRetryable,
      { 
        response: data,
        headers: response.headers,
        requestId: response.headers?.['x-amzn-requestid']
      }
    );
  }

  /**
   * Execute function with retry logic
   * @param {Function} fn - Async function to execute
   * @param {Object} options - Retry options
   * @returns {Promise<any>} Function result
   */
  async withRetry(fn, options = {}) {
    const config = { ...this.retryConfig, ...options };
    let lastError;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = this.classifyError(error);
        
        // Don't retry if not retryable or on last attempt
        if (!lastError.retryable || attempt === config.maxRetries) {
          throw lastError;
        }

        // Calculate delay with exponential backoff + jitter
        const delay = this.calculateDelay(attempt, config);
        
        logger.warn(
          `Request failed (attempt ${attempt + 1}/${config.maxRetries + 1}), ` +
          `retrying in ${delay}ms: ${lastError.code} - ${lastError.message}`
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   * @param {number} attempt - Current attempt number
   * @param {Object} config - Retry configuration
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt, config) {
    // Exponential backoff: baseDelay * (base ^ attempt)
    const exponential = config.baseDelay * Math.pow(config.exponentialBase, attempt);
    
    // Cap at max delay
    const capped = Math.min(exponential, config.maxDelay);
    
    // Add jitter (±25%) to prevent thundering herd
    const jitter = capped * 0.25 * (Math.random() * 2 - 1);
    
    return Math.floor(capped + jitter);
  }

  /**
   * Handle rate limit specifically (429 responses)
   * @param {Object} headers - Response headers
   * @returns {number} Recommended wait time in ms
   */
  getRetryAfter(headers) {
    // Check for Retry-After header
    const retryAfter = headers['retry-after'] || headers['Retry-After'];
    if (retryAfter) {
      // Could be seconds or HTTP date
      const seconds = parseInt(retryAfter);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }

    // Check for x-amzn-RateLimit-Limit header
    const rateLimitReset = headers['x-amzn-ratelimit-reset'];
    if (rateLimitReset) {
      const resetTime = parseInt(rateLimitReset) * 1000;
      const waitTime = resetTime - Date.now();
      return Math.max(1000, waitTime);
    }

    // Default: exponential backoff
    return this.retryConfig.baseDelay;
  }

  /**
   * Format error for API response
   * @param {Error} error - Error to format
   * @returns {Object} Formatted error object
   */
  formatErrorResponse(error) {
    if (error instanceof SPAPIError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          retryable: error.retryable,
          requestId: error.details?.requestId
        }
      };
    }

    // Generic error
    return {
      success: false,
      error: {
        code: 'InternalError',
        message: error.message || 'An unexpected error occurred',
        statusCode: 500,
        retryable: false
      }
    };
  }

  /**
   * Log error with context
   * @param {Error} error - Error to log
   * @param {Object} context - Additional context
   */
  logError(error, context = {}) {
    if (error instanceof SPAPIError) {
      logger.error({
        error: error.code,
        message: error.message,
        statusCode: error.statusCode,
        retryable: error.retryable,
        requestId: error.details?.requestId,
        ...context
      }, 'SP-API Error');
    } else {
      logger.error({
        error: error.message,
        stack: error.stack,
        ...context
      }, 'Unexpected Error');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { ErrorHandler, SPAPIError };
