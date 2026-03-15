export type Asset = 'GOLD' | 'BTC';

export interface PriceData {
  symbol: Asset;
  price: number;
  change24h: number;
  change24hValue: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

export type OrderType = 'market' | 'limit';
export type OrderSide = 'buy' | 'sell';

export interface Order {
  id: string;
  symbol: Asset;
  side: OrderSide;
  type: OrderType;
  amount: number;
  price: number;
  status: 'pending' | 'filled' | 'cancelled';
  timestamp: number;
  filledPrice?: number;
}

export interface Position {
  symbol: Asset;
  amount: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface Trade {
  id: string;
  symbol: Asset;
  side: OrderSide;
  amount: number;
  price: number;
  total: number;
  timestamp: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Portfolio {
  balance: number;
  equity: number;
  marginUsed: number;
  marginAvailable: number;
  totalPnL: number;
  dayPnL: number;
}