/**
 * SP-API Wrapper - Pricing API
 * Handles competitive pricing and repricing operations
 */

const axios = require('axios');
const auth = require('../auth');
const rateLimiter = require('../utils/rateLimiter');
const { ErrorHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');

class PricingAPI {
  constructor() {
    this.baseUrl = 'https://sellingpartnerapi-na.amazon.com';
    this.errorHandler = new ErrorHandler();
  }

  /**
   * Get competitive pricing for ASINs
   * @param {string} clientId - Client identifier
   * @param {Array<string>} asins - Array of ASINs
   * @param {string} marketplaceId - Marketplace ID
   * @returns {Promise<Object>} Competitive pricing data
   */
  async getCompetitivePricing(clientId, asins, marketplaceId = 'ATVPDKIKX0DER') {
    await rateLimiter.waitForSlot(clientId, 'pricing');

    return this.errorHandler.withRetry(async () => {
      const headers = await auth.getAuthHeaders(clientId);
      
      const asinList = asins.map(a => `Asins=${encodeURIComponent(a)}`).join('&');
      const url = `${this.baseUrl}/products/pricing/v0/competitivePrice?MarketplaceId=${marketplaceId}&${asinList}`;
      
      logger.debug(`Fetching competitive pricing for ${asins.length} ASINs`);
      
      const response = await axios.get(url, { headers, timeout: 30000 });
      
      return {
        success: true,
        data: response.data
      };
    });
  }

  /**
   * Get listing offers (Buy Box eligible offers)
   * @param {string} clientId - Client identifier
   * @param {string} asin - ASIN to check
   * @param {string} itemCondition - Item condition (New, Used, etc.)
   * @param {string} marketplaceId - Marketplace ID
   * @returns {Promise<Object>} Listing offers
   */
  async getListingOffers(clientId, asin, itemCondition = 'New', marketplaceId = 'ATVPDKIKX0DER') {
    await rateLimiter.waitForSlot(clientId, 'pricing');

    return this.errorHandler.withRetry(async () => {
      const headers = await auth.getAuthHeaders(clientId);
      const url = `${this.baseUrl}/products/pricing/v0/listings/${encodeURIComponent(asin)}/offers?` +
                  `MarketplaceId=${marketplaceId}&ItemCondition=${itemCondition}`;
      
      logger.debug(`Fetching listing offers for ${asin}`);
      
      const response = await axios.get(url, { headers, timeout: 30000 });
      
      return {
        success: true,
        data: response.data
      };
    });
  }

  /**
   * Get item offers (all offers for an ASIN)
   * @param {string} clientId - Client identifier
   * @param {string} asin - ASIN to check
   * @param {string} itemCondition - Item condition
   * @param {string} marketplaceId - Marketplace ID
   * @returns {Promise<Object>} Item offers
   */
  async getItemOffers(clientId, asin, itemCondition = 'New', marketplaceId = 'ATVPDKIKX0DER') {
    await rateLimiter.waitForSlot(clientId, 'pricing');

    return this.errorHandler.withRetry(async () => {
      const headers = await auth.getAuthHeaders(clientId);
      const url = `${this.baseUrl}/products/pricing/v0/items/${encodeURIComponent(asin)}/offers?` +
                  `MarketplaceId=${marketplaceId}&ItemCondition=${itemCondition}`;
      
      logger.debug(`Fetching item offers for ${asin}`);
      
      const response = await axios.get(url, { headers, timeout: 30000 });
      
      return {
        success: true,
        data: response.data
      };
    });
  }

  /**
   * Get pricing for SKUs
   * @param {string} clientId - Client identifier
   * @param {Array<string>} skus - Array of seller SKUs
   * @param {string} itemCondition - Item condition
   * @param {string} marketplaceId - Marketplace ID
   * @returns {Promise<Object>} Pricing data
   */
  async getPricing(clientId, skus, itemCondition, marketplaceId = 'ATVPDKIKX0DER') {
    await rateLimiter.waitForSlot(clientId, 'pricing');

    return this.errorHandler.withRetry(async () => {
      const headers = await auth.getAuthHeaders(clientId);
      
      const skuList = skus.map(s => `Skus=${encodeURIComponent(s)}`).join('&');
      let url = `${this.baseUrl}/products/pricing/v0/price?MarketplaceId=${marketplaceId}&${skuList}`;
      
      if (itemCondition) {
        url += `&ItemCondition=${itemCondition}`;
      }
      
      logger.debug(`Fetching pricing for ${skus.length} SKUs`);
      
      const response = await axios.get(url, { headers, timeout: 30000 });
      
      return {
        success: true,
        data: response.data
      };
    });
  }

  /**
   * Calculate optimal price based on competitor data
   * @param {Object} competitorData - Competitor pricing data
   * @param {Object} strategy - Repricing strategy
   * @returns {Object} Pricing recommendation
   */
  calculateOptimalPrice(competitorData, strategy = {}) {
    const {
      minPrice = 0,
      maxPrice = Infinity,
      targetPosition = 'buy_box', // buy_box, lowest, average
      offset = 0, // Amount to undercut by
      offsetPercent = 0 // Percentage to undercut by
    } = strategy;

    const offers = competitorData.payload?.Offers || [];
    
    if (offers.length === 0) {
      return { canReprice: false, reason: 'No competitor data available' };
    }

    let referencePrice;
    
    switch (targetPosition) {
      case 'buy_box':
        const buyBoxOffer = offers.find(o => o.IsBuyBoxWinner);
        referencePrice = buyBoxOffer ? parseFloat(buyBoxOffer.ListingPrice.Amount) : null;
        break;
      case 'lowest':
        referencePrice = Math.min(...offers.map(o => parseFloat(o.ListingPrice.Amount)));
        break;
      case 'average':
        const prices = offers.map(o => parseFloat(o.ListingPrice.Amount));
        referencePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        break;
      default:
        referencePrice = parseFloat(offers[0].ListingPrice.Amount);
    }

    if (!referencePrice) {
      return { canReprice: false, reason: 'Could not determine reference price' };
    }

    // Calculate target price with offset
    let targetPrice = referencePrice;
    if (offset > 0) {
      targetPrice = referencePrice - offset;
    }
    if (offsetPercent > 0) {
      targetPrice = referencePrice * (1 - offsetPercent / 100);
    }

    // Apply min/max bounds
    targetPrice = Math.max(minPrice, Math.min(maxPrice, targetPrice));

    return {
      canReprice: true,
      referencePrice,
      targetPrice: Math.round(targetPrice * 100) / 100,
      strategy: targetPosition,
      competitorCount: offers.length,
      buyBoxPrice: offers.find(o => o.IsBuyBoxWinner)?.ListingPrice?.Amount
    };
  }
}

module.exports = new PricingAPI();
