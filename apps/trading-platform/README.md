# Gold & BTC Trading Platform

A professional trading platform for GOLD (XAU/USD) and Bitcoin (BTC/USD) built with React, TypeScript, Node.js, and SQLite.

## Features

- **Real-time Price Feeds**: Live price updates via WebSocket
- **Professional Trading Interface**: Dark theme, TradingView-style charts
- **Order Management**: Market and limit orders with instant execution
- **Portfolio Tracking**: Real-time P&L, position tracking, equity calculations
- **Order Book**: Simulated depth of market display
- **Trade History**: Complete transaction log
- **Charting**: Candlestick charts with multiple timeframes
- **Paper Trading**: Practice with $100,000 virtual balance

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS
- Zustand (state management)
- Lightweight Charts (candlestick charts)
- Lucide React (icons)

### Backend
- Node.js + Express
- WebSocket (ws library)
- SQLite (database)
- CoinGecko API (BTC prices)

## File Structure

```
trading-platform/
├── public/              # Static assets
├── server/              # Backend
│   └── index.js         # Express + WebSocket server
├── src/                 # Frontend
│   ├── components/      # React components
│   ├── hooks/           # Custom hooks
│   ├── store/           # Zustand store
│   ├── types/           # TypeScript types
│   ├── App.tsx          # Main app
│   ├── main.tsx         # Entry point
│   └── index.css        # Styles
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

1. Install dependencies:
```bash
cd /home/darwin/.openclaw/workspace/apps/trading-platform
npm install
```

2. Start development server:
```bash
# Terminal 1: Start backend
npm run server:dev

# Terminal 2: Start frontend
npm run dev
```

3. Open http://localhost:5173 in your browser

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/prices | Get current prices |
| GET | /api/chart/:symbol | Get candle data |
| POST | /api/orders | Place order |
| GET | /api/orders | Get orders |
| GET | /api/trades | Get trade history |
| GET | /api/positions | Get open positions |
| GET | /api/portfolio | Get portfolio summary |
| WS | /ws | WebSocket for real-time prices |

## Security Notes

- All credentials stored in `.env` file (never commit this)
- SQLite database stored locally
- No real money - paper trading only
- HTTPS recommended for production deployment

## Future Enhancements

- Real gold price API integration
- More asset pairs
- Advanced order types (stop-loss, take-profit)
- User authentication
- Trading strategy backtesting
- Integration with Trader agent

## Created By

Atlas (Fullstack Developer) for Amajungle