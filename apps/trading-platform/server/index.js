import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import cron from 'node-cron';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// Database setup
let db;
async function initDatabase() {
  db = await open({
    filename: path.join(__dirname, 'trading.db'),
    driver: sqlite3.Database,
  });

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      amount REAL NOT NULL,
      price REAL NOT NULL,
      total REAL NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      filledPrice REAL
    );

    CREATE TABLE IF NOT EXISTS positions (
      symbol TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      avgPrice REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY,
      balance REAL NOT NULL DEFAULT 100000,
      totalPnL REAL NOT NULL DEFAULT 0,
      dayPnL REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS candles (
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      time INTEGER NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume REAL NOT NULL,
      PRIMARY KEY (symbol, timeframe, time)
    );

    INSERT OR IGNORE INTO portfolio (id, balance, totalPnL, dayPnL) VALUES (1, 100000, 0, 0);
  `);

  console.log('Database initialized');
}

// Price feed cache
const prices = {
  GOLD: null,
  BTC: null,
};

// Fetch Bitcoin price from CoinGecko
async function fetchBTCPrice() {
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_24hr_high_low=true',
      { timeout: 10000 }
    );
    const data = response.data.bitcoin;
    prices.BTC = {
      symbol: 'BTC',
      price: data.usd,
      change24h: data.usd_24h_change || 0,
      change24hValue: (data.usd * (data.usd_24h_change || 0)) / 100,
      high24h: data.usd_24h_high || data.usd * 1.02,
      low24h: data.usd_24h_low || data.usd * 0.98,
      volume24h: data.usd_24h_vol || 0,
      timestamp: Date.now(),
    };
    return prices.BTC;
  } catch (error) {
    console.error('Failed to fetch BTC price:', error.message);
    return null;
  }
}

// Fetch Gold price from available APIs with validation
// XAU/USD should be around $2900-3100 per ounce (current market range)
async function fetchGoldPrice() {
  const REALISTIC_GOLD_MIN = 4000;
  const REALISTIC_GOLD_MAX = 6000;
  const DEFAULT_GOLD_PRICE = 5018; // Current market price
  
  try {
    // Try Alpha Vantage for XAU/USD
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=XAU&to_currency=USD&apikey=${apiKey}`,
      { timeout: 10000 }
    );
    
    const rateData = response.data['Realtime Currency Exchange Rate'];
    if (rateData && rateData['5. Exchange Rate']) {
      const price = parseFloat(rateData['5. Exchange Rate']);
      
      if (price >= REALISTIC_GOLD_MIN && price <= REALISTIC_GOLD_MAX) {
        prices.GOLD = {
          symbol: 'GOLD',
          price: price,
          change24h: 0,
          change24hValue: 0,
          high24h: price * 1.005,
          low24h: price * 0.995,
          volume24h: 0,
          timestamp: Date.now(),
        };
        console.log(`Gold price fetched from Alpha Vantage: $${price.toFixed(2)}/oz`);
        return prices.GOLD;
      }
    }
    throw new Error('Invalid or missing price data from Alpha Vantage');
  } catch (error) {
    console.error('Alpha Vantage gold price fetch failed:', error.message);
  }
  
  // Fallback: Try Yahoo Finance for Gold Futures (GC=F)
  try {
    const response = await axios.get(
      'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=2d',
      { 
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    const result = response.data.chart.result[0];
    if (result && result.meta && result.meta.regularMarketPrice) {
      let price = result.meta.regularMarketPrice;
      
      // GC=F returns contract value (100 oz), convert to per oz if needed
      // If price is > $4000, it's likely the full contract price
      if (price > 4000) {
        price = price / 100;
      }
      
      // Validate the price is realistic
      if (price >= REALISTIC_GOLD_MIN && price <= REALISTIC_GOLD_MAX) {
        const prevClose = result.meta.previousClose || price;
        // Adjust previous close if it was also a contract price
        let adjustedPrevClose = prevClose;
        if (prevClose > 4000) {
          adjustedPrevClose = prevClose / 100;
        }
        const change24h = ((price - adjustedPrevClose) / adjustedPrevClose) * 100;
        
        prices.GOLD = {
          symbol: 'GOLD',
          price: price,
          change24h: change24h,
          change24hValue: price - adjustedPrevClose,
          high24h: (result.meta.regularMarketDayHigh > 4000 ? result.meta.regularMarketDayHigh / 100 : result.meta.regularMarketDayHigh) || price * 1.005,
          low24h: (result.meta.regularMarketDayLow > 4000 ? result.meta.regularMarketDayLow / 100 : result.meta.regularMarketDayLow) || price * 0.995,
          volume24h: result.meta.regularMarketVolume || 0,
          timestamp: Date.now(),
        };
        console.log(`Gold price fetched from Yahoo Finance: $${price.toFixed(2)}/oz`);
        return prices.GOLD;
      }
    }
  } catch (fallbackError) {
    console.error('Yahoo Finance gold price fetch failed:', fallbackError.message);
  }
  
  // Final fallback: Use realistic default price
  console.warn(`Using default gold price $${DEFAULT_GOLD_PRICE} - APIs unavailable or returned invalid data`);
  prices.GOLD = {
    symbol: 'GOLD',
    price: DEFAULT_GOLD_PRICE,
    change24h: 0,
    change24hValue: 0,
    high24h: DEFAULT_GOLD_PRICE * 1.01,
    low24h: DEFAULT_GOLD_PRICE * 0.99,
    volume24h: 0,
    timestamp: Date.now(),
  };
  return prices.GOLD;
}

// Broadcast prices to all connected clients
function broadcastPrices() {
  const message = JSON.stringify({
    type: 'prices',
    payload: Object.values(prices).filter(Boolean),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Send current prices
  ws.send(JSON.stringify({
    type: 'prices',
    payload: Object.values(prices).filter(Boolean),
  }));

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// API Routes

// Get current prices
app.get('/api/prices', (req, res) => {
  res.json(prices);
});

// Get chart data
app.get('/api/chart/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1h' } = req.query;
    
    // Generate mock candle data if not in database
    const candles = await generateCandleData(symbol, timeframe);
    res.json(candles);
  } catch (error) {
    console.error('Chart data error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// Generate realistic candle data
async function generateCandleData(symbol, timeframe) {
  const currentPrice = prices[symbol]?.price || (symbol === 'BTC' ? 65000 : 2050);
  const candles = [];
  const now = Date.now();
  const interval = getIntervalMs(timeframe);
  
  for (let i = 100; i >= 0; i--) {
    const time = now - (i * interval);
    const volatility = symbol === 'BTC' ? 0.02 : 0.005;
    const trend = Math.sin(i / 10) * currentPrice * 0.05;
    const noise = (Math.random() - 0.5) * currentPrice * volatility;
    
    const open = currentPrice + trend + noise;
    const close = open + (Math.random() - 0.5) * currentPrice * volatility;
    const high = Math.max(open, close) + Math.random() * currentPrice * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * currentPrice * volatility * 0.5;
    
    candles.push({
      time: Math.floor(time / 1000),
      open: parseFloat(open.toFixed(symbol === 'BTC' ? 2 : 2)),
      high: parseFloat(high.toFixed(symbol === 'BTC' ? 2 : 2)),
      low: parseFloat(low.toFixed(symbol === 'BTC' ? 2 : 2)),
      close: parseFloat(close.toFixed(symbol === 'BTC' ? 2 : 2)),
      volume: Math.floor(Math.random() * 1000000),
    });
  }
  
  return candles;
}

function getIntervalMs(timeframe) {
  const intervals = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  };
  return intervals[timeframe] || intervals['1h'];
}

// Place order
app.post('/api/orders', async (req, res) => {
  try {
    const { symbol, side, type, amount, price } = req.body;
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    // In paper trading, fill market orders immediately
    const fillPrice = type === 'market' ? prices[symbol]?.price : price;
    const status = type === 'market' ? 'filled' : 'pending';

    await db.run(
      `INSERT INTO orders (id, symbol, side, type, amount, price, status, timestamp, filledPrice) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, symbol, side, type, amount, price, status, timestamp, fillPrice]
    );

    // If filled, create trade and update position
    if (status === 'filled') {
      const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const total = amount * fillPrice;

      await db.run(
        `INSERT INTO trades (id, symbol, side, amount, price, total, timestamp) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tradeId, symbol, side, amount, fillPrice, total, timestamp]
      );

      // Update or create position
      const existingPosition = await db.get('SELECT * FROM positions WHERE symbol = ?', symbol);
      if (existingPosition) {
        const newAmount = side === 'buy' 
          ? existingPosition.amount + amount 
          : existingPosition.amount - amount;
        
        if (newAmount === 0) {
          await db.run('DELETE FROM positions WHERE symbol = ?', symbol);
        } else {
          const totalCost = existingPosition.amount * existingPosition.avgPrice + amount * fillPrice;
          const newAvgPrice = totalCost / Math.abs(newAmount);
          await db.run(
            'UPDATE positions SET amount = ?, avgPrice = ? WHERE symbol = ?',
            [newAmount, newAvgPrice, symbol]
          );
        }
      } else {
        await db.run(
          'INSERT INTO positions (symbol, amount, avgPrice) VALUES (?, ?, ?)',
          [symbol, side === 'buy' ? amount : -amount, fillPrice]
        );
      }

      // Update portfolio balance
      const tradeValue = amount * fillPrice;
      await db.run(
        `UPDATE portfolio SET balance = balance - ? WHERE id = 1`,
        [side === 'buy' ? tradeValue : -tradeValue]
      );
    }

    res.json({ success: true, orderId, status, filledPrice: fillPrice });
  } catch (error) {
    console.error('Order error:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// Get orders
app.get('/api/orders', async (req, res) => {
  try {
    const { symbol } = req.query;
    let query = 'SELECT * FROM orders ORDER BY timestamp DESC LIMIT 50';
    let params = [];
    
    if (symbol) {
      query = 'SELECT * FROM orders WHERE symbol = ? ORDER BY timestamp DESC LIMIT 50';
      params = [symbol];
    }
    
    const orders = await db.all(query, params);
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get trades
app.get('/api/trades', async (req, res) => {
  try {
    const { symbol } = req.query;
    let query = 'SELECT * FROM trades ORDER BY timestamp DESC LIMIT 100';
    let params = [];
    
    if (symbol) {
      query = 'SELECT * FROM trades WHERE symbol = ? ORDER BY timestamp DESC LIMIT 100';
      params = [symbol];
    }
    
    const trades = await db.all(query, params);
    res.json(trades);
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// Get positions
app.get('/api/positions', async (req, res) => {
  try {
    const positions = await db.all('SELECT * FROM positions');
    res.json(positions);
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// Get portfolio
app.get('/api/portfolio', async (req, res) => {
  try {
    const portfolio = await db.get('SELECT * FROM portfolio WHERE id = 1');
    res.json(portfolio);
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Start server
async function start() {
  await initDatabase();
  
  // Fetch initial prices
  await fetchBTCPrice();
  await fetchGoldPrice();
  
  // Start price updates
  cron.schedule('*/10 * * * * *', async () => {
    await fetchBTCPrice();
    await fetchGoldPrice();
    broadcastPrices();
  });

  server.listen(PORT, () => {
    console.log(`Trading platform server running on port ${PORT}`);
    console.log(`WebSocket server ready at ws://localhost:${PORT}/ws`);
  });
}

start().catch(console.error);