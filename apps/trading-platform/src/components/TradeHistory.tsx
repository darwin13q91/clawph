import { useEffect, useState } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import { ArrowUpRight, ArrowDownRight, History } from 'lucide-react';
import type { Trade } from '@/types';

export function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const { selectedAsset } = useTradingStore();

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await fetch(`/api/trades?symbol=${selectedAsset}`);
        if (response.ok) {
          const data = await response.json();
          setTrades(data);
        }
      } catch (error) {
        console.error('Failed to fetch trades:', error);
      }
    };

    fetchTrades();
    const interval = setInterval(fetchTrades, 5000);
    return () => clearInterval(interval);
  }, [selectedAsset]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="card-trading h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <History size={20} className="text-blue-500" />
        <h2 className="text-lg font-semibold">Recent Trades</h2>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-trading-muted sticky top-0 bg-trading-card">
            <tr>
              <th className="text-left py-2 px-2">Time</th>
              <th className="text-left py-2 px-2">Side</th>
              <th className="text-right py-2 px-2">Price</th>
              <th className="text-right py-2 px-2">Amount</th>
              <th className="text-right py-2 px-2">Total</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {trades.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-trading-muted">
                  No trades yet
                </td>
              </tr>
            ) : (
              trades.map((trade) => (
                <tr key={trade.id} className="border-t border-trading-border hover:bg-trading-bg">
                  <td className="py-2 px-2 text-trading-muted">{formatTime(trade.timestamp)}</td>
                  <td className="py-2 px-2">
                    <span className={`flex items-center gap-1 font-medium ${
                      trade.side === 'buy' ? 'text-trading-green' : 'text-trading-red'
                    }`}>
                      {trade.side === 'buy' ? (
                        <ArrowUpRight size={14} />
                      ) : (
                        <ArrowDownRight size={14} />
                      )}
                      {trade.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">${trade.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-2 px-2 text-right">{trade.amount.toFixed(4)}</td>
                  <td className="py-2 px-2 text-right">${trade.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}