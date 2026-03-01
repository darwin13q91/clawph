/**
 * Pricing API Routes
 */

const express = require('express');
const pricingAPI = require('../api/pricing');
const { formatErrorResponse } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const router = express.Router({ mergeParams: true });

// Get competitive pricing for ASINs
router.get('/competitive', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { asins, marketplaceId } = req.query;
    
    if (!asins) {
      return res.status(400).json({
        success: false,
        error: 'asins parameter is required'
      });
    }
    
    const asinList = asins.split(',');
    const result = await pricingAPI.getCompetitivePricing(clientId, asinList, marketplaceId);
    res.json(result);
  } catch (error) {
    logger.error('Competitive pricing fetch failed:', error);
    res.status(error.statusCode || 500).json(formatErrorResponse(error));
  }
});

// Get listing offers (Buy Box eligible)
router.get('/offers/:asin', async (req, res) => {
  try {
    const { clientId, asin } = req.params;
    const { itemCondition, marketplaceId } = req.query;
    const result = await pricingAPI.getListingOffers(clientId, asin, itemCondition, marketplaceId);
    res.json(result);
  } catch (error) {
    logger.error(`Listing offers fetch failed for ${req.params.asin}:`, error);
    res.status(error.statusCode || 500).json(formatErrorResponse(error));
  }
});

// Get item offers (all offers)
router.get('/item-offers/:asin', async (req, res) => {
  try {
    const { clientId, asin } = req.params;
    const { itemCondition, marketplaceId } = req.query;
    const result = await pricingAPI.getItemOffers(clientId, asin, itemCondition, marketplaceId);
    res.json(result);
  } catch (error) {
    logger.error(`Item offers fetch failed for ${req.params.asin}:`, error);
    res.status(error.statusCode || 500).json(formatErrorResponse(error));
  }
});

// Get pricing for SKUs
router.get('/sku-pricing', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { skus, itemCondition, marketplaceId } = req.query;
    
    if (!skus) {
      return res.status(400).json({
        success: false,
        error: 'skus parameter is required'
      });
    }
    
    const skuList = skus.split(',');
    const result = await pricingAPI.getPricing(clientId, skuList, itemCondition, marketplaceId);
    res.json(result);
  } catch (error) {
    logger.error('SKU pricing fetch failed:', error);
    res.status(error.statusCode || 500).json(formatErrorResponse(error));
  }
});

// Calculate optimal price
router.post('/calculate', async (req, res) => {
  try {
    const { competitorData, strategy } = req.body;
    const recommendation = pricingAPI.calculateOptimalPrice(competitorData, strategy);
    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    logger.error('Price calculation failed:', error);
    res.status(500).json(formatErrorResponse(error));
  }
});

module.exports = router;
