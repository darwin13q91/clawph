/**
 * Orders API Routes
 */

const express = require('express');
const ordersAPI = require('../api/orders');
const { formatErrorResponse } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const router = express.Router({ mergeParams: true });

// Get orders list
router.get('/', async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await ordersAPI.getOrders(clientId, req.query);
    res.json(result);
  } catch (error) {
    logger.error('Orders fetch failed:', error);
    res.status(error.statusCode || 500).json(formatErrorResponse(error));
  }
});

// Get specific order
router.get('/:orderId', async (req, res) => {
  try {
    const { clientId, orderId } = req.params;
    const result = await ordersAPI.getOrder(clientId, orderId);
    res.json(result);
  } catch (error) {
    logger.error(`Order fetch failed for ${req.params.orderId}:`, error);
    res.status(error.statusCode || 500).json(formatErrorResponse(error));
  }
});

// Get order items
router.get('/:orderId/items', async (req, res) => {
  try {
    const { clientId, orderId } = req.params;
    const result = await ordersAPI.getOrderItems(clientId, orderId);
    res.json(result);
  } catch (error) {
    logger.error(`Order items fetch failed for ${req.params.orderId}:`, error);
    res.status(error.statusCode || 500).json(formatErrorResponse(error));
  }
});

module.exports = router;
