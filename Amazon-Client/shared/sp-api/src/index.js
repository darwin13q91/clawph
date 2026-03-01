/**
 * SP-API Gateway Service
 * Main entry point for the shared SP-API integration service
 */

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const auth = require('./auth');
const rateLimiter = require('./utils/rateLimiter');
const logger = require('./utils/logger');
const { errorHandler } = require('./utils/errorHandler');

// API routes
const ordersRouter = require('./routes/orders');
const inventoryRouter = require('./routes/inventory');
const pricingRouter = require('./routes/pricing');
const webhookRouter = require('./routes/webhooks');
const healthRouter = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting per IP
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' }
});
app.use(globalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    clientId: req.headers['x-client-id'],
    ip: req.ip
  });
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.use('/health', healthRouter);

// API routes (require authentication)
app.use('/api/:clientId/orders', ordersRouter);
app.use('/api/:clientId/inventory', inventoryRouter);
app.use('/api/:clientId/pricing', pricingRouter);

// Webhook routes
app.use('/webhook/:clientId', webhookRouter);

// Client initialization endpoint
app.post('/admin/clients/:clientId/init', async (req, res) => {
  try {
    const { clientId } = req.params;
    await auth.initializeClient(clientId);
    
    res.json({
      success: true,
      message: `Client ${clientId} initialized successfully`
    });
  } catch (error) {
    logger.error(`Failed to initialize client ${req.params.clientId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Status endpoint
app.get('/admin/status', async (req, res) => {
  try {
    const authStatus = auth.getStatus();
    const rateLimitStatus = await rateLimiter.getGlobalStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      auth: authStatus,
      rateLimits: rateLimitStatus,
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Status check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`SP-API Gateway started on port ${PORT}`);
  console.log(`🚀 SP-API Gateway running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
