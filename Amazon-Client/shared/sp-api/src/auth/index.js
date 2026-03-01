/**
 * SP-API Authentication Module
 * Handles LWA (Login with Amazon) token refresh and credential management
 */

const axios = require('axios');
const crypto = require('crypto-js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class SPAPIAuth {
  constructor() {
    this.tokenCache = new Map(); // In-memory cache for access tokens
    this.lwaEndpoint = 'https://api.amazon.com/auth/o2/token';
    this.tokenRefreshThreshold = 300; // Refresh 5 minutes before expiry
  }

  /**
   * Initialize authentication for a client
   * @param {string} clientId - The client identifier
   */
  async initializeClient(clientId) {
    try {
      const credentials = await this.loadCredentials(clientId);
      const accessToken = await this.refreshAccessToken(clientId, credentials);
      
      this.tokenCache.set(clientId, {
        accessToken,
        expiresAt: Date.now() + 3600 * 1000, // 1 hour from now
        credentials
      });
      
      logger.info(`SP-API auth initialized for client: ${clientId}`);
      return accessToken;
    } catch (error) {
      logger.error(`Failed to initialize SP-API auth for ${clientId}:`, error.message);
      throw error;
    }
  }

  /**
   * Load and decrypt client credentials
   * @param {string} clientId - The client identifier
   * @returns {Object} Decrypted credentials
   */
  async loadCredentials(clientId) {
    const credentialsPath = path.join(
      process.env.SECRETS_DIR || '/app/secrets',
      clientId,
      'credentials',
      'sp-api.enc'
    );

    try {
      const encryptedData = await fs.readFile(credentialsPath, 'utf8');
      const credentials = JSON.parse(encryptedData);
      
      // Decrypt all fields
      return {
        sellerId: this.decrypt(credentials.seller_id),
        refreshToken: this.decrypt(credentials.refresh_token),
        clientId: this.decrypt(credentials.client_id),
        awsAccessKey: this.decrypt(credentials.aws_access_key),
        awsSecretKey: this.decrypt(credentials.aws_secret_key)
      };
    } catch (error) {
      logger.error(`Failed to load credentials for ${clientId}:`, error.message);
      throw new Error(`Credentials not found for client: ${clientId}`);
    }
  }

  /**
   * Decrypt encrypted credential
   * @param {string} encrypted - Base64 encrypted string
   * @returns {string} Decrypted value
   */
  decrypt(encrypted) {
    if (!encrypted) return '';
    const key = process.env.ENCRYPTION_KEY || process.env.MASTER_ENCRYPTION_KEY;
    if (!key) throw new Error('Encryption key not configured');
    
    const bytes = crypto.AES.decrypt(encrypted, key);
    return bytes.toString(crypto.enc.Utf8);
  }

  /**
   * Refresh LWA access token using refresh token
   * @param {string} clientId - The client identifier
   * @param {Object} credentials - Client credentials
   * @returns {string} New access token
   */
  async refreshAccessToken(clientId, credentials) {
    try {
      const response = await axios.post(
        this.lwaEndpoint,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: credentials.refreshToken,
          client_id: credentials.clientId,
          client_secret: process.env.SP_API_CLIENT_SECRET || ''
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 30000
        }
      );

      const { access_token, expires_in } = response.data;
      
      logger.info(`Access token refreshed for client: ${clientId}`);
      
      // Update cache
      const cached = this.tokenCache.get(clientId) || {};
      this.tokenCache.set(clientId, {
        ...cached,
        accessToken: access_token,
        expiresAt: Date.now() + (expires_in * 1000)
      });

      return access_token;
    } catch (error) {
      logger.error(`Token refresh failed for ${clientId}:`, error.response?.data || error.message);
      throw new Error(`Failed to refresh access token: ${error.message}`);
    }
  }

  /**
   * Get valid access token for client (refresh if needed)
   * @param {string} clientId - The client identifier
   * @returns {string} Valid access token
   */
  async getAccessToken(clientId) {
    const cached = this.tokenCache.get(clientId);
    
    if (!cached) {
      return await this.initializeClient(clientId);
    }

    // Check if token needs refresh
    const timeUntilExpiry = cached.expiresAt - Date.now();
    if (timeUntilExpiry < this.tokenRefreshThreshold * 1000) {
      logger.info(`Token expiring soon for ${clientId}, refreshing...`);
      return await this.refreshAccessToken(clientId, cached.credentials);
    }

    return cached.accessToken;
  }

  /**
   * Get authentication headers for SP-API requests
   * @param {string} clientId - The client identifier
   * @returns {Object} Headers object with authorization
   */
  async getAuthHeaders(clientId) {
    const accessToken = await this.getAccessToken(clientId);
    const cached = this.tokenCache.get(clientId);
    
    return {
      'Authorization': `Bearer ${accessToken}`,
      'x-amz-access-token': accessToken,
      'x-amz-date': new Date().toISOString(),
      'Content-Type': 'application/json'
    };
  }

  /**
   * Revoke client authentication
   * @param {string} clientId - The client identifier
   */
  revokeClient(clientId) {
    this.tokenCache.delete(clientId);
    logger.info(`Authentication revoked for client: ${clientId}`);
  }

  /**
   * Get auth status for all clients
   * @returns {Object} Status summary
   */
  getStatus() {
    const status = {};
    for (const [clientId, data] of this.tokenCache.entries()) {
      status[clientId] = {
        initialized: true,
        expiresAt: data.expiresAt,
        expiresIn: Math.floor((data.expiresAt - Date.now()) / 1000)
      };
    }
    return status;
  }
}

module.exports = new SPAPIAuth();
