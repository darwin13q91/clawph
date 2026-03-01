/**
 * SP-API Wrapper - Inventory API
 * Handles inventory levels and management
 */

const axios = require('axios');
const auth = require('../auth');
const rateLimiter = require('../utils/rateLimiter');
const { ErrorHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');

class InventoryAPI {
  constructor() {
    this.baseUrl = 'https://sellingpartnerapi-na.amazon.com';
    this.errorHandler = new ErrorHandler();
  }

  /**
   * Get inventory summaries
   * @param {string} clientId - Client identifier
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Inventory summaries
   */
  async getInventorySummaries(clientId, params = {}) {
    await rateLimiter.waitForSlot(clientId, 'inventory');

    return this.errorHandler.withRetry(async () => {
      const headers = await auth.getAuthHeaders(clientId);
      
      const queryParams = new URLSearchParams();
      queryParams.append('details', params.details || 'false');
      queryParams.append('granularityType', params.granularityType || 'Marketplace');
      queryParams.append('granularityId', params.granularityId || 'ATVPDKIKX0DER'); // US marketplace
      
      if (params.startDateTime) queryParams.append('startDateTime', params.startDateTime);
      if (params.sellerSkus) queryParams.append('sellerSkus', params.sellerSkus.join(','));
      if (params.nextToken) queryParams.append('nextToken', params.nextToken);
      if (params.marketplaceIds) queryParams.append('marketplaceIds', params.marketplaceIds.join(','));

      const url = `${this.baseUrl}/fba/inventory/v1/summaries?${queryParams.toString()}`;
      
      logger.debug(`Fetching inventory for ${clientId}`);
      
      const response = await axios.get(url, { headers, timeout: 30000 });
      
      return {
        success: true,
        data: response.data
      };
    });
  }

  /**
   * Get inventory items by seller SKU
   * @param {string} clientId - Client identifier
   * @param {string} sellerSku - Seller SKU
   * @param {string} marketplaceId - Marketplace ID
   * @returns {Promise<Object>} Inventory item details
   */
  async getInventoryItem(clientId, sellerSku, marketplaceId = 'ATVPDKIKX0DER') {
    await rateLimiter.waitForSlot(clientId, 'inventory');

    return this.errorHandler.withRetry(async () => {
      const headers = await auth.getAuthHeaders(clientId);
      const encodedSku = encodeURIComponent(sellerSku);
      const url = `${this.baseUrl}/inventory/v1/inventoryItems/${encodedSku}?marketplaceIds=${marketplaceId}`;
      
      logger.debug(`Fetching inventory item ${sellerSku} for ${clientId}`);
      
      const response = await axios.get(url, { headers, timeout: 30000 });
      
      return {
        success: true,
        data: response.data
      };
    });
  }

  /**
   * Submit inventory update (reserved for future use)
   * Note: Most inventory updates are done via feeds API
   * @param {string} clientId - Client identifier
   * @param {Object} inventoryData - Inventory update data
   * @returns {Promise<Object>} Update result
   */
  async submitInventoryUpdate(clientId, inventoryData) {
    logger.info(`Inventory update requested for ${clientId}`, { sku: inventoryData.sellerSku });
    
    // Inventory updates typically use the Feeds API
    // This is a placeholder for direct API if available
    return {
      success: true,
      message: 'Use Feeds API for inventory updates',
      feedType: 'POST_INVENTORY_AVAILABILITY_DATA'
    };
  }

  /**
   * Get inbound shipments (FBA)
   * @param {string} clientId - Client identifier
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Shipments data
   */
  async getInboundShipments(clientId, params = {}) {
    await rateLimiter.waitForSlot(clientId, 'inventory');

    return this.errorHandler.withRetry(async () => {
      const headers = await auth.getAuthHeaders(clientId);
      
      const queryParams = new URLSearchParams();
      if (params.shipmentStatusList) queryParams.append('shipmentStatusList', params.shipmentStatusList.join(','));
      if (params.shipmentIdList) queryParams.append('shipmentIdList', params.shipmentIdList.join(','));
      if (params.lastUpdatedAfter) queryParams.append('lastUpdatedAfter', params.lastUpdatedAfter);
      if (params.lastUpdatedBefore) queryParams.append('lastUpdatedBefore', params.lastUpdatedBefore);
      if (params.queryType) queryParams.append('queryType', params.queryType);
      if (params.nextToken) queryParams.append('nextToken', params.nextToken);

      const url = `${this.baseUrl}/fba/inbound/v0/shipments?${queryParams.toString()}`;
      
      const response = await axios.get(url, { headers, timeout: 30000 });
      
      return {
        success: true,
        data: response.data
      };
    });
  }
}

module.exports = new InventoryAPI();
