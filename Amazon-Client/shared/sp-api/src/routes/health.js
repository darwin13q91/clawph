/**
 * Health Check Route
 */

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'sp-api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
