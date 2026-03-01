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
  res.json({ status: 'healthy', bot: 'analytics-bot', clientId: CLIENT_ID });
});

// Generate daily reports
cron.schedule('0 6 * * *', async () => {
  logger.info(`[${CLIENT_ID}] Generating daily analytics report...`);
});

// Generate weekly reports (Sunday at 7 AM)
cron.schedule('0 7 * * 0', async () => {
  logger.info(`[${CLIENT_ID}] Generating weekly analytics report...`);
});

app.listen(PORT, () => {
  logger.info(`Analytics Bot running for client ${CLIENT_ID}`);
});
