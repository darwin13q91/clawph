/**
 * Inventory API Routes
 */

const express = require('express');
const inventoryAPI = require('../api/inventory');
const { formatErrorResponse } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const router = express.Router({ mergeParams: true });

// Get inventory summaries
router.get('/summaries', async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await inventoryAPI.getInventorySummaries(clientId, req.query);
    res.json(result);
  } catch (error) {
    logger.error('Inventory fetch failed:', error);
    res.status(error.statusCode || 500).json(formatErrorResponse(error));
  }
});

// Get specific inventory item
router.get('/item/:sellerSku', async (req, res) => {
  try {
    const { clientId, sellerSku } = req.params;
    const { marketplaceId } = req.query;
    const result = await inventoryAPI.getInventoryItem(clientId, sellerSku, marketplaceId);
    res.json(result);
  } catch (error) {
    logger.error(`Inventory item fetch failed for ${req.params.sellerSku}:`, error);
    res.status(error.statusCode || 500).json(formatErrorResponse(error));
  }
});

// Get inbound shipments
router.get('/shipments', async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await inventoryAPI.getInboundShipments(clientId, req.query);
    res.json(result);
  } catch (error) {
    logger.error('Shipments fetch failed:', error);
    res.status(error.statusCode || 500).json(formatErrorResponse(error));
  }
});

module.exports = router;
