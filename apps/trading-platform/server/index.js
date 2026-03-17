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
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3001;

// Ensure trades export directory exists
const TRADES_EXPORT_DIR = '/home/darwin/.openclaw/agents/trader/memory/trades';
if (!fs.existsSync(TRADES_EXPORT_DIR)) {
  fs.mkdirSync(TRADES_EXPORT_DIR, { recursive: true });
}

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
      entryPrice REAL,
      exitPrice REAL,
      price REAL NOT NULL,
      total REAL NOT NULL,
      pnl REAL DEFAULT 0,
      pnlPercent REAL DEFAULT 0,
      timestamp INTEGER NOT NULL,
      closed INTEGER DEFAULT 0,
      closedAt INTEGER,
      status TEXT DEFAULT 'open'
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
      filledPrice REAL,
      pnl REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS positions (
      symbol TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      avgPrice REAL NOT NULL,
      unrealizedPnl REAL DEFAULT 0,
      realizedPnl REAL DEFAULT 0,
      totalInvested REAL DEFAULT 0,
      lastUpdated INTEGER
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY,
      balance REAL NOT NULL DEFAULT 10000,
      totalPnL REAL NOT NULL DEFAULT 0,
      dayPnL REAL NOT NULL DEFAULT 0,
      totalEquity REAL NOT NULL DEFAULT 10000,
      totalTrades INTEGER DEFAULT 0,
      winningTrades INTEGER DEFAULT 0,
      losingTrades INTEGER DEFAULT 0,
      winRate REAL DEFAULT 0,
      expectancy REAL DEFAULT 0
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

    INSERT OR IGNORE INTO portfolio (id, balance, totalPnL, dayPnL, totalEquity) VALUES (1, 10000, 0, 0, 10000);
  `);

  // Handle schema migrations - add new columns if they don't exist
  try {
    const portfolioColumns = await db.all("PRAGMA table_info(portfolio)");
    const portfolioColumnNames = portfolioColumns.map(c => c.name);
    
    if (!portfolioColumnNames.includes('totalEquity')) {
      await db.run('ALTER TABLE portfolio ADD COLUMN totalEquity REAL DEFAULT 10000');
    }
    if (!portfolioColumnNames.includes('totalTrades')) {
      await db.run('ALTER TABLE portfolio ADD COLUMN totalTrades INTEGER DEFAULT 0');
    }
    if (!portfolioColumnNames.includes('winningTrades')) {
      await db.run('ALTER TABLE portfolio ADD COLUMN winningTrades INTEGER DEFAULT 0');
    }
    if (!portfolioColumnNames.includes('losingTrades')) {
      await db.run('ALTER TABLE portfolio ADD COLUMN losingTrades INTEGER DEFAULT 0');
    }
    if (!portfolioColumnNames.includes('winRate')) {
      await db.run('ALTER TABLE portfolio ADD COLUMN winRate REAL DEFAULT 0');
    }
    if (!portfolioColumnNames.includes('expectancy')) {
      await db.run('ALTER TABLE portfolio ADD COLUMN expectancy REAL DEFAULT 0');
    }

    // Migrate trades table
    const tradesColumns = await db.all("PRAGMA table_info(trades)");
    const tradesColumnNames = tradesColumns.map(c => c.name);
    
    if (!tradesColumnNames.includes('entryPrice')) {
      await db.run('ALTER TABLE trades ADD COLUMN entryPrice REAL');
    }
    if (!tradesColumnNames.includes('exitPrice')) {
      await db.run('ALTER TABLE trades ADD COLUMN exitPrice REAL');
    }
    if (!tradesColumnNames.includes('pnlPercent')) {
      await db.run('ALTER TABLE trades ADD COLUMN pnlPercent REAL DEFAULT 0');
    }
    if (!tradesColumnNames.includes('closed')) {
      await db.run('ALTER TABLE trades ADD COLUMN closed INTEGER DEFAULT 0');
    }
    if (!tradesColumnNames.includes('closedAt')) {
      await db.run('ALTER TABLE trades ADD COLUMN closedAt INTEGER');
    }
    if (!tradesColumnNames.includes('status')) {
      await db.run('ALTER TABLE trades ADD COLUMN status TEXT DEFAULT "open"');
    }

    // Migrate positions table
    const positionsColumns = await db.all("PRAGMA table_info(positions)");
    const positionsColumnNames = positionsColumns.map(c => c.name);
    
    if (!positionsColumnNames.includes('unrealizedPnl')) {
      await db.run('ALTER TABLE positions ADD COLUMN unrealizedPnl REAL DEFAULT 0');
    }
    if (!positionsColumnNames.includes('realizedPnl')) {
      await db.run('ALTER TABLE positions ADD COLUMN realizedPnl REAL DEFAULT 0');
    }
    if (!positionsColumnNames.includes('totalInvested')) {
      await db.run('ALTER TABLE positions ADD COLUMN totalInvested REAL DEFAULT 0');
    }
    if (!positionsColumnNames.includes('lastUpdated')) {
      await db.run('ALTER TABLE positions ADD COLUMN lastUpdated INTEGER');
    }

    // Migrate orders table
    const ordersColumns = await db.all("PRAGMA table_info(orders)");
    const ordersColumnNames = ordersColumns.map(c => c.name);
    
    if (!ordersColumnNames.includes('pnl')) {
      await db.run('ALTER TABLE orders ADD COLUMN pnl REAL DEFAULT 0');
    }

    console.log('Database migrations completed');
  } catch (e) {
    console.log('Migration check:', e.message);
  }

  console.log('Database initialized');
}

// Price feed cache
const prices = {
  GOLD: null,
  BTC: null,
};

// Default fallback prices
const DEFAULT_PRICES = {
  GOLD: {
    symbol: 'GOLD',
    price: 3018.50,
    change24h: 0,
    change24hValue: 0,
    high24h: 3038.68,
    low24h: 2998.32,
    volume24h: 0,
    timestamp: Date.now(),
  },
  BTC: {
    symbol: 'BTC',
    price: 84350.00,
    change24h: 0,
    change24hValue: 0,
    high24h: 86000.00,
    low24h: 82700.00,
    volume24h: 0,
    timestamp: Date.now(),
  },
};

// Initialize with default prices
prices.GOLD = { ...DEFAULT_PRICES.GOLD };
prices.BTC = { ...DEFAULT_PRICES.BTC };

// Fetch Bitcoin price from Finnhub
async function fetchBTCPrice() {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      console.error('FINNHUB_API_KEY not set, using fallback BTC price:', prices.BTC?.price || DEFAULT_PRICES.BTC.price);
      return prices.BTC || DEFAULT_PRICES.BTC;
    }

    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=BINANCE:BTCUSDT&token=${apiKey}`,
      { timeout: 10000 }
    );
    
    const data = response.data;
    
    // Validate response data
    if (!data || typeof data.c !== 'number') {
      throw new Error('Invalid response from Finnhub BTC API');
    }
    
    const price = data.c; // current price
    const prevClose = data.pc; // previous close
    const change24h = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    const change24hValue = price - prevClose;
    
    prices.BTC = {
      symbol: 'BTC',
      price: price,
      change24h: change24h,
      change24hValue: change24hValue,
      high24h: data.h || price * 1.02, // day high
      low24h: data.l || price * 0.98, // day low
      open24h: data.o, // day open
      prevClose: prevClose,
      volume24h: 0, // Finnhub quote doesn't provide volume
      timestamp: (data.t || Date.now() / 1000) * 1000,
      source: 'finnhub',
    };
    
    console.log(`[${new Date().toISOString()}] BTC price updated: $${price.toFixed(2)} (change: ${change24h.toFixed(2)}%)`);
    return prices.BTC;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to fetch BTC price from Finnhub:`, error.message);
    // Return current cached price or default
    return prices.BTC || DEFAULT_PRICES.BTC;
  }
}

// Fetch Gold price from Fixer.io API
// Returns XAU rate in USD per oz of gold
async function fixerFetchGoldPrice() {
  const REALISTIC_GOLD_MIN = 1000;
  const REALISTIC_GOLD_MAX = 6000;
  
  try {
    const apiKey = process.env.FIXER_API_KEY;
    if (!apiKey) {
      throw new Error('FIXER_API_KEY not set');
    }

    const response = await axios.get(
      `http://data.fixer.io/api/latest?access_key=${apiKey}&symbols=XAU,USD`,
      { timeout: 10000 }
    );
    
    const data = response.data;
    
    // Validate response
    if (!data || !data.success) {
      throw new Error(`Fixer API error: ${data?.error?.info || 'Unknown error'}`);
    }
    
    if (!data.rates || typeof data.rates.XAU !== 'number' || typeof data.rates.USD !== 'number') {
      throw new Error('Invalid response from Fixer API: missing XAU or USD rates');
    }
    
    // Calculate gold price in USD
    // rates.XAU = oz of gold per EUR (e.g., 0.00084234)
    // rates.USD = USD per EUR (e.g., 1.09)
    // goldUSD = (1 / rates.XAU) * rates.USD = USD per oz of gold
    const xauRate = data.rates.XAU;
    const usdRate = data.rates.USD;
    const price = (1 / xauRate) * usdRate;
    
    // Validate price is within realistic range
    if (price < REALISTIC_GOLD_MIN || price > REALISTIC_GOLD_MAX) {
      throw new Error(`Gold price ${price} is outside realistic range (${REALISTIC_GOLD_MIN}-${REALISTIC_GOLD_MAX})`);
    }
    
    // Calculate change (Fixer doesn't provide previous close, so we'll estimate)
    // Use cached price for change calculation if available
    const prevPrice = prices.GOLD?.price || price;
    const change24h = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
    const change24hValue = price - prevPrice;
    
    prices.GOLD = {
      symbol: 'GOLD',
      price: price,
      change24h: change24h,
      change24hValue: change24hValue,
      high24h: price * 1.02, // Estimated
      low24h: price * 0.98,  // Estimated
      open24h: prevPrice,
      prevClose: prevPrice,
      volume24h: 0,
      timestamp: (data.timestamp || Date.now() / 1000) * 1000,
      source: 'fixer.io',
      base: data.base,
      date: data.date,
    };
    
    console.log(`[${new Date().toISOString()}] GOLD price updated: $${price.toFixed(2)} (Fixer.io, base: ${data.base}, date: ${data.date}) (change: ${change24h.toFixed(2)}%)`);
    return prices.GOLD;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to fetch GOLD price from Fixer.io:`, error.message);
    throw error; // Re-throw to allow fallback
  }
}

// Fetch Gold price (XAU/USD) from Finnhub
// Tries XAUUSD symbol first, then falls back to GLD ETF × 10 approximation
async function finnhubFetchGoldPrice() {
  const REALISTIC_GOLD_MIN = 1000;
  const REALISTIC_GOLD_MAX = 6000;
  const GLD_TO_GOLD_RATIO = 10; // GLD tracks ~1/10th of gold oz price
  
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      throw new Error('FINNHUB_API_KEY not set');
    }

    // Try XAUUSD direct symbol first (spot gold)
    try {
      const xauResponse = await axios.get(
        `https://finnhub.io/api/v1/quote?symbol=XAUUSD&token=${apiKey}`,
        { timeout: 10000 }
      );
      
      const xauData = xauResponse.data;
      if (xauData && typeof xauData.c === 'number' && xauData.c > 0) {
        const price = xauData.c;
        const prevClose = xauData.pc;
        const change24h = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
        const change24hValue = price - prevClose;
        
        prices.GOLD = {
          symbol: 'GOLD',
          price: price,
          change24h: change24h,
          change24hValue: change24hValue,
          high24h: xauData.h || price * 1.02,
          low24h: xauData.l || price * 0.98,
          open24h: xauData.o || price,
          prevClose: prevClose,
          volume24h: 0,
          timestamp: (xauData.t || Date.now() / 1000) * 1000,
          source: 'finnhub',
          symbol_used: 'XAUUSD',
        };
        
        console.log(`[${new Date().toISOString()}] GOLD price updated: $${price.toFixed(2)} (XAUUSD spot) (change: ${change24h.toFixed(2)}%)`);
        return prices.GOLD;
      }
    } catch (xauError) {
      console.log(`[${new Date().toISOString()}] XAUUSD not available, falling back to GLD proxy`);
    }

    // Fallback: Use GLD ETF as a proxy for gold price
    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=GLD&token=${apiKey}`,
      { timeout: 10000 }
    );
    
    const data = response.data;
    
    // Validate response data
    if (!data || typeof data.c !== 'number') {
      throw new Error('Invalid response from Finnhub GLD API');
    }
    
    // Convert GLD price to approximate gold price
    // GLD is an ETF that represents ~0.1 oz of gold
    // Spot gold (~$3000) vs GLD (~$460) - ratio is roughly 6.5x, not 10x
    // Using market-based adjustment: actual gold price is typically ~6.5-7x GLD price
    const gldPrice = data.c;
    const GOLD_GLD_RATIO = 6.55; // Current market ratio (3000/460 ≈ 6.52)
    const price = gldPrice * GOLD_GLD_RATIO;
    
    // Validate price is within realistic range
    if (price < REALISTIC_GOLD_MIN || price > REALISTIC_GOLD_MAX) {
      throw new Error(`Gold price ${price} is outside realistic range (${REALISTIC_GOLD_MIN}-${REALISTIC_GOLD_MAX})`);
    }
    
    const prevClose = data.pc * GOLD_GLD_RATIO;
    const change24h = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    const change24hValue = price - prevClose;
    
    prices.GOLD = {
      symbol: 'GOLD',
      price: price,
      change24h: change24h,
      change24hValue: change24hValue,
      high24h: (data.h || gldPrice * 1.02) * GOLD_GLD_RATIO,
      low24h: (data.l || gldPrice * 0.98) * GOLD_GLD_RATIO,
      open24h: (data.o || gldPrice) * GOLD_GLD_RATIO,
      prevClose: prevClose,
      volume24h: 0,
      timestamp: (data.t || Date.now() / 1000) * 1000,
      source: 'finnhub',
      proxy: 'GLD',
      note: 'GLD ETF converted to spot gold equivalent',
    };
    
    console.log(`[${new Date().toISOString()}] GOLD price updated: $${price.toFixed(2)} (GLD: $${gldPrice.toFixed(2)} × ${GOLD_GLD_RATIO}) (change: ${change24h.toFixed(2)}%)`);
    return prices.GOLD;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to fetch GOLD price from Finnhub:`, error.message);
    throw error; // Re-throw to allow fallback
  }
}

// Fetch Gold price with fallback chain: Fixer.io → Finnhub → Cached/Default
async function fetchGoldPrice() {
  // Try Fixer.io first
  try {
    return await fixerFetchGoldPrice();
  } catch (fixerError) {
    console.log(`[${new Date().toISOString()}] Fixer.io failed, falling back to Finnhub`);
  }
  
  // Try Finnhub as fallback
  try {
    return await finnhubFetchGoldPrice();
  } catch (finnhubError) {
    console.error(`[${new Date().toISOString()}] All gold price sources failed, using fallback`);
  }
  
  // Return cached or default price
  return prices.GOLD || DEFAULT_PRICES.GOLD;
}

// Broadcast message to all connected clients
function broadcast(message) {
  const msgString = typeof message === 'string' ? message : JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msgString);
    }
  });
}

// Broadcast prices to all connected clients
function broadcastPrices() {
  broadcast({
    type: 'prices',
    payload: Object.values(prices).filter(Boolean),
  });
}

// Broadcast trade execution to all clients
function broadcastTrade(trade) {
  broadcast({
    type: 'trade_executed',
    payload: trade,
  });
}

// Broadcast portfolio update
function broadcastPortfolio(portfolio) {
  broadcast({
    type: 'portfolio_update',
    payload: portfolio,
  });
}

// Broadcast position update
function broadcastPosition(position) {
  broadcast({
    type: 'position_update',
    payload: position,
  });
}

// Calculate unrealized P&L for positions
async function updatePositionPnL() {
  const positions = await db.all('SELECT * FROM positions');
  
  for (const position of positions) {
    const currentPrice = prices[position.symbol]?.price;
    if (!currentPrice) continue;
    
    const unrealizedPnl = (currentPrice - position.avgPrice) * position.amount;
    await db.run(
      'UPDATE positions SET unrealizedPnl = ?, lastUpdated = ? WHERE symbol = ?',
      [unrealizedPnl, Date.now(), position.symbol]
    );
  }
}

// Calculate total equity and portfolio stats
async function calculatePortfolioStats() {
  const portfolio = await db.get('SELECT * FROM portfolio WHERE id = 1');
  const positions = await db.all('SELECT * FROM positions');
  
  let positionsValue = 0;
  let totalUnrealizedPnl = 0;
  
  for (const position of positions) {
    const currentPrice = prices[position.symbol]?.price || position.avgPrice;
    positionsValue += Math.abs(position.amount) * currentPrice;
    totalUnrealizedPnl += position.unrealizedPnl || 0;
  }
  
  const totalEquity = portfolio.balance + positionsValue;
  
  // Get trade statistics
  const stats = await db.get(`
    SELECT 
      COUNT(*) as totalTrades,
      SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winningTrades,
      SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losingTrades,
      AVG(pnl) as avgPnl,
      AVG(CASE WHEN pnl > 0 THEN pnl END) as avgWin,
      AVG(CASE WHEN pnl < 0 THEN pnl END) as avgLoss
    FROM trades WHERE closed = 1
  `);
  
  const winRate = stats.totalTrades > 0 ? (stats.winningTrades / stats.totalTrades) * 100 : 0;
  const avgWin = stats.avgWin || 0;
  const avgLoss = Math.abs(stats.avgLoss || 0);
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
  const winProbability = winRate / 100;
  const lossProbability = 1 - winProbability;
  const expectancy = (winProbability * avgWin) - (lossProbability * avgLoss);
  
  // Calculate realized PnL from CLOSED trades only (not unrealized)
  const realizedPnL = await db.get(`
    SELECT COALESCE(SUM(pnl), 0) as total FROM trades WHERE closed = 1
  `);
  
  await db.run(
    `UPDATE portfolio SET 
      totalEquity = ?, 
      totalPnL = ?,
      totalTrades = ?,
      winningTrades = ?,
      losingTrades = ?,
      winRate = ?,
      expectancy = ?
     WHERE id = 1`,
    [totalEquity, realizedPnL.total || 0, stats.totalTrades || 0, 
     stats.winningTrades || 0, stats.losingTrades || 0, winRate, expectancy]
  );
  
  return {
    ...portfolio,
    totalEquity,
    positionsValue,
    unrealizedPnl: totalUnrealizedPnl,
    totalTrades: stats.totalTrades || 0,
    winningTrades: stats.winningTrades || 0,
    losingTrades: stats.losingTrades || 0,
    winRate,
    expectancy
  };
}

// Export trade to file for Trader agent
async function exportTrade(trade) {
  const date = new Date(trade.timestamp);
  const filename = `${date.toISOString().split('T')[0]}_trades.jsonl`;
  const filepath = path.join(TRADES_EXPORT_DIR, filename);
  
  const tradeRecord = {
    ...trade,
    exportedAt: Date.now()
  };
  
  fs.appendFileSync(filepath, JSON.stringify(tradeRecord) + '\n');
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Send current prices
  ws.send(JSON.stringify({
    type: 'prices',
    payload: Object.values(prices).filter(Boolean),
  }));
  
  // Send current portfolio
  calculatePortfolioStats().then(portfolio => {
    ws.send(JSON.stringify({
      type: 'portfolio_update',
      payload: portfolio,
    }));
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// API Routes

// Get current prices
app.get('/api/prices', (req, res) => {
  res.json(prices);
});

// Get specific price (for Trader agent)
app.get('/api/prices/:symbol', (req, res) => {
  const { symbol } = req.params;
  const upperSymbol = symbol.toUpperCase();
  
  if (prices[upperSymbol]) {
    res.json(prices[upperSymbol]);
  } else {
    res.status(404).json({ error: 'Symbol not found' });
  }
});

// Get chart data
app.get('/api/chart/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1h' } = req.query;
    
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
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
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

// Place order - LIVE TRADE EXECUTION
app.post('/api/orders', async (req, res) => {
  try {
    const { symbol, side, type, amount, price } = req.body;
    const upperSymbol = symbol.toUpperCase();
    
    // Validate inputs
    if (!['GOLD', 'BTC'].includes(upperSymbol)) {
      return res.status(400).json({ error: 'Invalid symbol. Use GOLD or BTC' });
    }
    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({ error: 'Invalid side. Use buy or sell' });
    }
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }
    
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    // Get current price for market orders
    const currentPrice = prices[upperSymbol]?.price;
    if (!currentPrice) {
      return res.status(503).json({ error: 'Price data unavailable' });
    }
    
    // For market orders, fill immediately at current price
    const fillPrice = type === 'market' ? currentPrice : (price || currentPrice);
    const total = amount * fillPrice;
    
    // Check portfolio balance for buy orders
    const portfolio = await db.get('SELECT * FROM portfolio WHERE id = 1');
    if (side === 'buy' && portfolio.balance < total) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Check position for sell orders
    if (side === 'sell') {
      const position = await db.get('SELECT * FROM positions WHERE symbol = ?', upperSymbol);
      if (!position || position.amount < amount) {
        return res.status(400).json({ error: 'Insufficient position' });
      }
    }
    
    const status = type === 'market' ? 'filled' : 'pending';

    await db.run(
      `INSERT INTO orders (id, symbol, side, type, amount, price, status, timestamp, filledPrice) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, upperSymbol, side, type, amount, price || fillPrice, status, timestamp, fillPrice]
    );

    // If filled, execute the trade
    if (status === 'filled') {
      await executeTrade(orderId, upperSymbol, side, amount, fillPrice, timestamp);
    }

    res.json({ 
      success: true, 
      orderId, 
      status, 
      filledPrice: fillPrice,
      total,
      timestamp
    });
  } catch (error) {
    console.error('Order error:', error);
    res.status(500).json({ error: 'Failed to place order', message: error.message });
  }
});

// Execute trade and update all records
async function executeTrade(orderId, symbol, side, amount, fillPrice, timestamp) {
  const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const total = amount * fillPrice;
  
  // Get existing position
  const existingPosition = await db.get('SELECT * FROM positions WHERE symbol = ?', symbol);
  let pnl = 0;
  let pnlPercent = 0;
  
  if (existingPosition) {
    if (side === 'buy') {
      // Adding to position
      const newAmount = existingPosition.amount + amount;
      const totalCost = (existingPosition.amount * existingPosition.avgPrice) + (amount * fillPrice);
      const newAvgPrice = totalCost / newAmount;
      
      await db.run(
        'UPDATE positions SET amount = ?, avgPrice = ?, totalInvested = totalInvested + ?, lastUpdated = ? WHERE symbol = ?',
        [newAmount, newAvgPrice, total, timestamp, symbol]
      );
    } else {
      // Selling from position - calculate P&L
      pnl = (fillPrice - existingPosition.avgPrice) * amount;
      pnlPercent = ((fillPrice - existingPosition.avgPrice) / existingPosition.avgPrice) * 100;
      
      const newAmount = existingPosition.amount - amount;
      
      if (newAmount <= 0) {
        await db.run('DELETE FROM positions WHERE symbol = ?', symbol);
      } else {
        await db.run(
          'UPDATE positions SET amount = ?, realizedPnl = realizedPnl + ?, lastUpdated = ? WHERE symbol = ?',
          [newAmount, pnl, timestamp, symbol]
        );
      }
      
      // Update portfolio P&L
      await db.run(
        'UPDATE portfolio SET totalPnL = totalPnL + ? WHERE id = 1',
        [pnl]
      );
    }
  } else if (side === 'buy') {
    // New position
    await db.run(
      'INSERT INTO positions (symbol, amount, avgPrice, totalInvested, lastUpdated) VALUES (?, ?, ?, ?, ?)',
      [symbol, amount, fillPrice, total, timestamp]
    );
  }
  
  // Update balance
  if (side === 'buy') {
    await db.run(
      'UPDATE portfolio SET balance = balance - ? WHERE id = 1',
      [total]
    );
  } else {
    await db.run(
      'UPDATE portfolio SET balance = balance + ? WHERE id = 1',
      [total]
    );
  }
  
  // Record the trade
  const trade = {
    id: tradeId,
    orderId,
    symbol,
    side,
    amount,
    price: fillPrice,
    entryPrice: side === 'buy' ? fillPrice : existingPosition?.avgPrice,
    exitPrice: side === 'sell' ? fillPrice : null,
    total,
    pnl,
    pnlPercent,
    timestamp,
    status: side === 'sell' ? 'closed' : 'open',
    closed: side === 'sell' ? 1 : 0
  };
  
  await db.run(
    `INSERT INTO trades (id, symbol, side, amount, entryPrice, exitPrice, price, total, pnl, pnlPercent, timestamp, status, closed) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tradeId, symbol, side, amount, trade.entryPrice, trade.exitPrice, fillPrice, total, pnl, pnlPercent, timestamp, trade.status, trade.closed]
  );
  
  // Export trade for Trader agent
  await exportTrade(trade);
  
  // Update order with P&L
  await db.run('UPDATE orders SET pnl = ? WHERE id = ?', [pnl, orderId]);
  
  // Broadcast updates
  broadcastTrade(trade);
  
  const updatedPosition = await db.get('SELECT * FROM positions WHERE symbol = ?', symbol);
  if (updatedPosition) {
    broadcastPosition(updatedPosition);
  }
  
  const portfolio = await calculatePortfolioStats();
  broadcastPortfolio(portfolio);
  
  console.log(`Trade executed: ${side.toUpperCase()} ${amount} ${symbol} @ $${fillPrice.toFixed(2)} | P&L: $${pnl.toFixed(2)}`);
  
  return trade;
}

// Get orders
app.get('/api/orders', async (req, res) => {
  try {
    const { symbol, status } = req.query;
    let query = 'SELECT * FROM orders ORDER BY timestamp DESC LIMIT 50';
    let params = [];
    
    if (symbol) {
      query = 'SELECT * FROM orders WHERE symbol = ? ORDER BY timestamp DESC LIMIT 50';
      params = [symbol.toUpperCase()];
    }
    if (status) {
      query = symbol 
        ? 'SELECT * FROM orders WHERE symbol = ? AND status = ? ORDER BY timestamp DESC LIMIT 50'
        : 'SELECT * FROM orders WHERE status = ? ORDER BY timestamp DESC LIMIT 50';
      params = symbol ? [symbol.toUpperCase(), status] : [status];
    }
    
    const orders = await db.all(query, params);
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get trades with stats
app.get('/api/trades', async (req, res) => {
  try {
    const { symbol, limit = 100 } = req.query;
    let query = 'SELECT * FROM trades ORDER BY timestamp DESC LIMIT ?';
    let params = [parseInt(limit)];
    
    if (symbol) {
      query = 'SELECT * FROM trades WHERE symbol = ? ORDER BY timestamp DESC LIMIT ?';
      params = [symbol.toUpperCase(), parseInt(limit)];
    }
    
    const trades = await db.all(query, params);
    
    // Calculate stats
    const stats = await db.get(`
      SELECT 
        COUNT(*) as totalTrades,
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winningTrades,
        SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losingTrades,
        SUM(pnl) as totalPnl,
        AVG(pnl) as avgPnl,
        AVG(CASE WHEN pnl > 0 THEN pnlPercent END) as avgWinPercent,
        AVG(CASE WHEN pnl < 0 THEN pnlPercent END) as avgLossPercent
      FROM trades WHERE closed = 1
    `);
    
    const winRate = stats.totalTrades > 0 ? (stats.winningTrades / stats.totalTrades) * 100 : 0;
    const avgWin = Math.abs(stats.avgWinPercent || 0);
    const avgLoss = Math.abs(stats.avgLossPercent || 0);
    const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
    
    res.json({
      trades,
      stats: {
        totalTrades: stats.totalTrades || 0,
        winningTrades: stats.winningTrades || 0,
        losingTrades: stats.losingTrades || 0,
        winRate: parseFloat(winRate.toFixed(2)),
        totalPnl: stats.totalPnl || 0,
        avgPnl: stats.avgPnl || 0,
        winLossRatio: parseFloat(winLossRatio.toFixed(2)),
        expectancy: parseFloat(((winRate/100) * avgWin - (1-winRate/100) * avgLoss).toFixed(2))
      }
    });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// Get positions with P&L
app.get('/api/positions', async (req, res) => {
  try {
    await updatePositionPnL();
    const positions = await db.all('SELECT * FROM positions');
    
    // Enhance with current prices
    const enhancedPositions = positions.map(pos => {
      const currentPrice = prices[pos.symbol]?.price || pos.avgPrice;
      const currentValue = Math.abs(pos.amount) * currentPrice;
      const costBasis = Math.abs(pos.amount) * pos.avgPrice;
      
      return {
        ...pos,
        currentPrice,
        currentValue,
        costBasis,
        unrealizedPnlPercent: ((currentPrice - pos.avgPrice) / pos.avgPrice) * 100 * (pos.amount >= 0 ? 1 : -1)
      };
    });
    
    res.json(enhancedPositions);
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// Get portfolio with full stats
app.get('/api/portfolio', async (req, res) => {
  try {
    const portfolio = await calculatePortfolioStats();
    const positions = await db.all('SELECT * FROM positions');
    
    res.json({
      ...portfolio,
      positions: positions.length,
      openPositions: positions.filter(p => p.amount !== 0).length
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// Get trade history summary (for Trader agent)
app.get('/api/trader/summary', async (req, res) => {
  try {
    const portfolio = await calculatePortfolioStats();
    const positions = await db.all('SELECT * FROM positions');
    
    const summary = {
      timestamp: Date.now(),
      prices: {
        GOLD: prices.GOLD,
        BTC: prices.BTC
      },
      portfolio: {
        balance: portfolio.balance,
        totalEquity: portfolio.totalEquity,
        totalPnL: portfolio.totalPnL,
        winRate: portfolio.winRate,
        expectancy: portfolio.expectancy,
        totalTrades: portfolio.totalTrades
      },
      positions: positions.map(p => ({
        symbol: p.symbol,
        amount: p.amount,
        avgPrice: p.avgPrice,
        unrealizedPnl: p.unrealizedPnl,
        currentPrice: prices[p.symbol]?.price || p.avgPrice
      }))
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Trader summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Close position endpoint
app.post('/api/positions/:symbol/close', async (req, res) => {
  try {
    const { symbol } = req.params;
    const upperSymbol = symbol.toUpperCase();
    
    const position = await db.get('SELECT * FROM positions WHERE symbol = ?', upperSymbol);
    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    const currentPrice = prices[upperSymbol]?.price;
    if (!currentPrice) {
      return res.status(503).json({ error: 'Price data unavailable' });
    }
    
    // Close the position by selling all
    const orderId = `order_close_${Date.now()}`;
    await executeTrade(orderId, upperSymbol, 'sell', position.amount, currentPrice, Date.now());
    
    res.json({ 
      success: true, 
      message: `Closed ${upperSymbol} position`,
      closedAmount: position.amount,
      closedPrice: currentPrice
    });
  } catch (error) {
    console.error('Close position error:', error);
    res.status(500).json({ error: 'Failed to close position' });
  }
});

// Reset portfolio (for testing)
app.post('/api/portfolio/reset', async (req, res) => {
  try {
    await db.run('DELETE FROM trades');
    await db.run('DELETE FROM orders');
    await db.run('DELETE FROM positions');
    await db.run(
      'UPDATE portfolio SET balance = 10000, totalPnL = 0, dayPnL = 0, totalEquity = 10000, totalTrades = 0, winningTrades = 0, losingTrades = 0, winRate = 0, expectancy = 0 WHERE id = 1'
    );
    
    const portfolio = await calculatePortfolioStats();
    broadcastPortfolio(portfolio);
    
    res.json({ success: true, message: 'Portfolio reset', portfolio });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ error: 'Failed to reset portfolio' });
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
  
  // Check API keys
  const hasFinnhubKey = !!process.env.FINNHUB_API_KEY;
  const hasFixerKey = !!process.env.FIXER_API_KEY;
  console.log(`Finnhub API: ${hasFinnhubKey ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`Fixer.io API: ${hasFixerKey ? 'Configured' : 'NOT CONFIGURED'}`);
  
  // Fetch initial prices
  console.log('Fetching initial prices...');
  await fetchBTCPrice();
  await fetchGoldPrice();
  console.log(`Initial prices - BTC: $${prices.BTC?.price?.toFixed(2) || 'N/A'}, GOLD: $${prices.GOLD?.price?.toFixed(2) || 'N/A'} (source: ${prices.GOLD?.source || 'default'})`);
  
  // Update position P&L periodically (every 5 seconds)
  cron.schedule('*/5 * * * * *', async () => {
    await updatePositionPnL();
    const portfolio = await calculatePortfolioStats();
    broadcastPortfolio(portfolio);
  });
  
  // Start price updates - every 15 seconds to respect Finnhub rate limits (60 calls/minute free tier)
  // 2 symbols × 4 updates/minute = 8 calls/minute (well under the 60 limit)
  cron.schedule('*/15 * * * * *', async () => {
    await fetchBTCPrice();
    await fetchGoldPrice();
    broadcastPrices();
  });

  server.listen(PORT, () => {
    console.log(`Trading platform server running on port ${PORT}`);
    console.log(`WebSocket server ready at ws://localhost:${PORT}/ws`);
    console.log(`Price updates: Every 15 seconds (BTC: Finnhub, GOLD: Fixer.io → Finnhub fallback)`);
    console.log(`Trade exports saved to: ${TRADES_EXPORT_DIR}`);
  });
}

start().catch(console.error);