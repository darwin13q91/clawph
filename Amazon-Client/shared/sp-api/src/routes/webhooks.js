/**
 * Webhook Routes
 * Receive events from bots and forward to client systems
 */

const express = require('express');
const logger = require('../utils/logger');

const router = express.Router({ mergeParams: true });

// Generic webhook handler
router.post('/:type', async (req, res) => {
  try {
    const { clientId, type } = req.params;
    const payload = req.body;
    
    logger.info(`Webhook received: ${type} for client ${clientId}`);
    
    // TODO: Forward to client's configured webhook URL
    // This would typically:
    // 1. Look up the client's webhook configuration
    // 2. Sign the payload
    // 3. POST to client's endpoint
    // 4. Retry on failure
    
    res.json({
      success: true,
      received: true,
      clientId,
      type,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Webhook processing failed for ${req.params.type}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Inventory webhook
router.post('/inventory', async (req, res) => {
  const { clientId } = req.params;
  logger.info(`Inventory webhook for ${clientId}`, req.body);
  res.json({ success: true, type: 'inventory' });
});

// Pricing webhook
router.post('/pricing', async (req, res) => {
  const { clientId } = req.params;
  logger.info(`Pricing webhook for ${clientId}`, req.body);
  res.json({ success: true, type: 'pricing' });
});

// Reviews webhook
router.post('/reviews', async (req, res) => {
  const { clientId } = req.params;
  logger.info(`Reviews webhook for ${clientId}`, req.body);
  res.json({ success: true, type: 'reviews' });
});

// Competitors webhook
router.post('/competitors', async (req, res) => {
  const { clientId } = req.params;
  logger.info(`Competitors webhook for ${clientId}`, req.body);
  res.json({ success: true, type: 'competitors' });
});

// Analytics webhook
router.post('/analytics', async (req, res) => {
  const { clientId } = req.params;
  logger.info(`Analytics webhook for ${clientId}`, req.body);
  res.json({ success: true, type: 'analytics' });
});

module.exports = router;
