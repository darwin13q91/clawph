import { useEffect, useRef, useCallback } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import type { Asset, PriceData, Position, Portfolio } from '@/types';

const WS_URL = `ws://${window.location.hostname}:3001/ws`;

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const { setPrice, setIsConnected, setConnectionError, setPortfolio, setPositions, updatePosition, addTrade } = useTradingStore();

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        
        // Fetch initial data when connected
        const { fetchPortfolio, fetchPositions, fetchTrades } = useTradingStore.getState();
        fetchPortfolio();
        fetchPositions();
        fetchTrades();
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'price') {
            const priceData: PriceData = data.payload;
            setPrice(priceData.symbol, priceData);
          } else if (data.type === 'prices') {
            data.payload.forEach((price: PriceData) => {
              setPrice(price.symbol, price);
            });
          } else if (data.type === 'portfolio_update') {
            // Handle portfolio updates from server
            const portfolioData = data.payload;
            setPortfolio({
              balance: portfolioData.balance,
              equity: portfolioData.totalEquity || portfolioData.equity,
              marginUsed: portfolioData.marginUsed || 0,
              marginAvailable: portfolioData.marginAvailable || portfolioData.balance,
              totalPnL: portfolioData.totalPnL,
              dayPnL: portfolioData.dayPnL,
            });
          } else if (data.type === 'position_update') {
            // Handle position updates from server
            const posData = data.payload;
            if (posData) {
              const position: Position = {
                symbol: posData.symbol as Asset,
                amount: posData.amount,
                avgPrice: posData.avgPrice,
                currentPrice: posData.currentPrice || posData.avgPrice,
                unrealizedPnL: posData.unrealizedPnl || 0,
                unrealizedPnLPercent: posData.unrealizedPnlPercent || 
                  (posData.currentPrice && posData.avgPrice 
                    ? ((posData.currentPrice - posData.avgPrice) / posData.avgPrice) * 100 * (posData.amount >= 0 ? 1 : -1)
                    : 0),
              };
              updatePosition(position);
            }
          } else if (data.type === 'trade_executed') {
            // Handle trade execution notifications
            addTrade(data.payload);
            // Refresh portfolio and positions after trade
            const { fetchPortfolio, fetchPositions } = useTradingStore.getState();
            fetchPortfolio();
            fetchPositions();
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        // Reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error. Retrying...');
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setConnectionError('Failed to connect. Retrying...');
      reconnectTimeout.current = setTimeout(connect, 3000);
    }
  }, [setPrice, setIsConnected, setConnectionError, setPortfolio, setPositions, updatePosition, addTrade]);

  const sendMessage = useCallback((message: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      ws.current?.close();
    };
  }, [connect]);

  return { sendMessage };
}