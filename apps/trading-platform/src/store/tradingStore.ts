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
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  cancelOrder: (id: string) => void;
  
  // Positions
  positions: Position[];
  updatePosition: (position: Position) => void;
  closePosition: (symbol: Asset) => void;
  
  // Trades
  trades: Trade[];
  addTrade: (trade: Trade) => void;
  
  // Portfolio
  portfolio: Portfolio;
  updatePortfolio: (updates: Partial<Portfolio>) => void;
  
  // WebSocket connection
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  connectionError: string | null;
  setConnectionError: (error: string | null) => void;
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
  addTrade: (trade) => set((state) => ({
    trades: [trade, ...state.trades].slice(0, 100),
  })),
  
  portfolio: initialPortfolio,
  updatePortfolio: (updates) => set((state) => ({
    portfolio: { ...state.portfolio, ...updates },
  })),
  
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),
  connectionError: null,
  setConnectionError: (error) => set({ connectionError: error }),
}));