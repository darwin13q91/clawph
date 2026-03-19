import { create } from 'zustand';
import type { Asset, PriceData, Order, Position, Trade, Portfolio } from '@/types';

interface TradingState {
  // Prices
  prices: Record<Asset, PriceData | null>;
  setPrice: (symbol: Asset, price: PriceData) => void;
  
  // Selected asset
  selectedAsset: Asset;
  setSelectedAsset: (asset: Asset) => void;
  
  // Orders
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  cancelOrder: (id: string) => void;
  
  // Positions
  positions: Position[];
  setPositions: (positions: Position[]) => void;
  updatePosition: (position: Position) => void;
  closePosition: (symbol: Asset) => void;
  
  // Trades
  trades: Trade[];
  setTrades: (trades: Trade[]) => void;
  addTrade: (trade: Trade) => void;
  
  // Portfolio
  portfolio: Portfolio;
  setPortfolio: (portfolio: Portfolio) => void;
  updatePortfolio: (updates: Partial<Portfolio>) => void;
  
  // WebSocket connection
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  connectionError: string | null;
  setConnectionError: (error: string | null) => void;
  
  // Data fetching
  fetchPortfolio: () => Promise<void>;
  fetchPositions: () => Promise<void>;
  fetchTrades: () => Promise<void>;
}

const initialPortfolio: Portfolio = {
  balance: 1000,
  equity: 1000,
  marginUsed: 0,
  marginAvailable: 1000,
  totalPnL: 0,
  dayPnL: 0,
};

export const useTradingStore = create<TradingState>((set, get) => ({
  prices: {
    GOLD: null,
    BTC: null,
  },
  setPrice: (symbol, price) => set((state) => ({
    prices: { ...state.prices, [symbol]: price },
  })),
  
  selectedAsset: 'BTC',
  setSelectedAsset: (asset) => set({ selectedAsset: asset }),
  
  orders: [],
  setOrders: (orders) => set({ orders }),
  addOrder: (order) => set((state) => ({
    orders: [order, ...state.orders],
  })),
  updateOrder: (id, updates) => set((state) => ({
    orders: state.orders.map((o) => o.id === id ? { ...o, ...updates } : o),
  })),
  cancelOrder: (id) => set((state) => ({
    orders: state.orders.map((o) => o.id === id ? { ...o, status: 'cancelled' } : o),
  })),
  
  positions: [],
  setPositions: (positions) => set({ positions }),
  updatePosition: (position) => set((state) => {
    const existingIndex = state.positions.findIndex((p) => p.symbol === position.symbol);
    if (existingIndex >= 0) {
      const newPositions = [...state.positions];
      newPositions[existingIndex] = position;
      return { positions: newPositions };
    }
    return { positions: [...state.positions, position] };
  }),
  closePosition: (symbol) => set((state) => ({
    positions: state.positions.filter((p) => p.symbol !== symbol),
  })),
  
  trades: [],
  setTrades: (trades) => set({ trades }),
  addTrade: (trade) => set((state) => ({
    trades: [trade, ...state.trades].slice(0, 100),
  })),
  
  portfolio: initialPortfolio,
  setPortfolio: (portfolio) => set({ portfolio }),
  updatePortfolio: (updates) => set((state) => ({
    portfolio: { ...state.portfolio, ...updates },
  })),
  
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),
  connectionError: null,
  setConnectionError: (error) => set({ connectionError: error }),
  
  // Fetch portfolio from API
  fetchPortfolio: async () => {
    try {
      const response = await fetch('/api/portfolio');
      if (response.ok) {
        const data = await response.json();
        set({ portfolio: {
          balance: data.balance,
          equity: data.totalEquity || data.equity,
          marginUsed: data.marginUsed || 0,
          marginAvailable: data.marginAvailable || data.balance,
          totalPnL: data.totalPnL,
          dayPnL: data.dayPnL,
        }});
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    }
  },
  
  // Fetch positions from API
  fetchPositions: async () => {
    try {
      const response = await fetch('/api/positions');
      if (response.ok) {
        const data = await response.json();
        // Map API response to Position type
        const positions: Position[] = data.map((pos: {
          symbol: string;
          amount: number;
          avgPrice: number;
          currentPrice?: number;
          unrealizedPnl?: number;
          unrealizedPnlPercent?: number;
        }) => ({
          symbol: pos.symbol as Asset,
          amount: pos.amount,
          avgPrice: pos.avgPrice,
          currentPrice: pos.currentPrice || pos.avgPrice,
          unrealizedPnL: pos.unrealizedPnl || 0,
          unrealizedPnLPercent: pos.unrealizedPnlPercent || 
            (pos.currentPrice && pos.avgPrice 
              ? ((pos.currentPrice - pos.avgPrice) / pos.avgPrice) * 100 * (pos.amount >= 0 ? 1 : -1)
              : 0),
        }));
        set({ positions });
      }
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    }
  },
  
  // Fetch trades from API
  fetchTrades: async () => {
    try {
      const response = await fetch('/api/trades');
      if (response.ok) {
        const data = await response.json();
        set({ trades: data.trades || [] });
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    }
  },
}));