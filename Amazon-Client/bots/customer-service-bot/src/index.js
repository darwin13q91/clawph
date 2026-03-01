const express = require('express');
const cron = require('node-cron');
const { Pool } = require('pg');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.CLIENT_ID;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', bot: 'customer-service-bot', clientId: CLIENT_ID });
});

// Check for buyer messages every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  logger.info(`[${CLIENT_ID}] Checking for new buyer messages...`);
});

app.listen(PORT, () => {
  logger.info(`Customer Service Bot running for client ${CLIENT_ID}`);
});
