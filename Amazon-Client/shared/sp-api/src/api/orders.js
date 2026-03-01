/**
 * SP-API Wrapper - Orders API
 * Handles order retrieval and management
 */

const axios = require('axios');
const auth = require('../auth');
const rateLimiter = require('../utils/rateLimiter');
const { ErrorHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');

class OrdersAPI {
  constructor() {
    this.baseUrl = 'https://sellingpartnerapi-na.amazon.com';
    this.errorHandler = new ErrorHandler();
  }

  /**
   * Get orders from Amazon
   * @param {string} clientId - Client identifier
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Orders response
   */
  async getOrders(clientId, params = {}) {
    await rateLimiter.waitForSlot(clientId, 'orders');

    return this.errorHandler.withRetry(async () => {
      const headers = await auth.getAuthHeaders(clientId);
      
      const queryParams = new URLSearchParams();
      if (params.createdAfter) queryParams.append('CreatedAfter', params.createdAfter);
      if (params.createdBefore) queryParams.append('CreatedBefore', params.createdBefore);
      if (params.lastUpdatedAfter) queryParams.append('LastUpdatedAfter', params.lastUpdatedAfter);
      if (params.orderStatuses) queryParams.append('OrderStatuses', params.orderStatuses.join(','));
      if (params.marketplaceIds) queryParams.append('MarketplaceIds', params.marketplaceIds.join(','));
      if (params.maxResults) queryParams.append('MaxResultsPerPage', params.maxResults);

      const url = `${this.baseUrl}/orders/v0/orders?${queryParams.toString()}`;
      
      logger.debug(`Fetching orders for ${clientId}`, { params });
      
      const response = await axios.get(url, { headers, timeout: 30000 });
      
      return {
        success: true,
        data: response.data,
        pagination: response.data.payload?.NextToken ? { nextToken: response.data.payload.NextToken } : null
      };
    });
  }

  /**
   * Get specific order details
   * @param {string} clientId - Client identifier
   * @param {string} orderId - Amazon Order ID
   * @returns {Promise<Object>} Order details
   */
  async getOrder(clientId, orderId) {
    await rateLimiter.waitForSlot(clientId, 'orders');

    return this.errorHandler.withRetry(async () => {
      const headers = await auth.getAuthHeaders(clientId);
      const url = `${this.baseUrl}/orders/v0/orders/${orderId}`;
      
      logger.debug(`Fetching order ${orderId} for ${clientId}`);
      
      const response = await axios.get(url, { headers, timeout: 30000 });
      
      return {
        success: true,
        data: response.data
      };
    });
  }

  /**
   * Get order items
   * @param {string} clientId - Client identifier
   * @param {string} orderId - Amazon Order ID
   * @returns {Promise<Object>} Order items
   */
  async getOrderItems(clientId, orderId) {
    await rateLimiter.waitForSlot(clientId, 'orders');

    return this.errorHandler.withRetry(async () => {
      const headers = await auth.getAuthHeaders(clientId);
      const url = `${this.baseUrl}/orders/v0/orders/${orderId}/orderItems`;
      
      logger.debug(`Fetching order items for ${orderId}`);
      
      const response = await axios.get(url, { headers, timeout: 30000 });
      
      return {
        success: true,
        data: response.data
      };
    });
  }

  /**
   * Get order buyer information
   * @param {string} clientId - Client identifier
   * @param {string} orderId - Amazon Order ID
   * @returns {Promise<Object>} Buyer info
   */
  async getOrderBuyerInfo(clientId, orderId) {
    await rateLimiter.waitForSlot(clientId, 'orders');

    return this.errorHandler.withRetry(async () => {
      const headers = await auth.getAuthHeaders(clientId);
      const url = `${this.baseUrl}/orders/v0/orders/${orderId}/buyerInfo`;
      
      const response = await axios.get(url, { headers, timeout: 30000 });
      
      return {
        success: true,
        data: response.data
      };
    });
  }
}

module.exports = new OrdersAPI();
