import { useEffect, useRef, useCallback } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import type { Asset, PriceData } from '@/types';

const WS_URL = `ws://${window.location.hostname}:3001/ws`;

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const { setPrice, setIsConnected, setConnectionError } = useTradingStore();

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
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
  }, [setPrice, setIsConnected, setConnectionError]);

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