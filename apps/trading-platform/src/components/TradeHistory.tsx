import { useEffect, useState } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import { ArrowUpRight, ArrowDownRight, History, Package, TrendingUp } from 'lucide-react';
import type { Trade, Position } from '@/types';

export function TradeHistory() {
  const [activeTab, setActiveTab] = useState<'positions' | 'trades'>('positions');
  const { trades, positions, prices, fetchTrades, fetchPositions } = useTradingStore();

  useEffect(() => {
    fetchTrades();
    fetchPositions();
    
    const interval = setInterval(() => {
      fetchTrades();
      fetchPositions();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchTrades, fetchPositions]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate live PnL for positions
  const positionsWithLivePnL = positions.map(pos => {
    const livePrice = prices[pos.symbol]?.price || pos.currentPrice || pos.avgPrice;
    const liveUnrealizedPnL = pos.amount >= 0 
      ? (livePrice - pos.avgPrice) * pos.amount
      : (pos.avgPrice - livePrice) * Math.abs(pos.amount);
    const positionValue = Math.abs(pos.amount) * livePrice;
    
    return {
      ...pos,
      currentPrice: livePrice,
      unrealizedPnL: liveUnrealizedPnL,
      positionValue,
    };
  });

  return (
    <div className="card-trading h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-500" />
          <h2 className="text-lg font-semibold">Positions & Trades</h2>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'positions' 
                ? 'bg-blue-600 text-white' 
                : 'bg-trading-bg text-trading-muted hover:text-white'
            }`}
          >
            Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'trades' 
                ? 'bg-blue-600 text-white' 
                : 'bg-trading-bg text-trading-muted hover:text-white'
            }`}
          >
            Trades ({trades.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'positions' ? (
          // Positions Tab
          positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-trading-muted">
              <Package size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No open positions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {positionsWithLivePnL.map((pos) => (
                <div key={pos.symbol} className="bg-trading-bg rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{pos.symbol}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${pos.amount > 0 ? 'bg-trading-green/20 text-trading-green' : 'bg-trading-red/20 text-trading-red'}`}>
                        {pos.amount > 0 ? 'LONG' : 'SHORT'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-mono font-medium ${pos.unrealizedPnL >= 0 ? 'text-trading-green' : 'text-trading-red'}`}>
                        {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-trading-muted">Amount</p>
                      <p className="font-mono">{Math.abs(pos.amount).toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-trading-muted">Entry</p>
                      <p className="font-mono">${pos.avgPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-trading-muted">Current</p>
                      <p className="font-mono">${pos.currentPrice.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Trades Tab
          <table className="w-full text-sm">
            <thead className="text-trading-muted sticky top-0 bg-trading-card">
              <tr>
                <th className="text-left py-2 px-1">Time</th>
                <th className="text-left py-2 px-1">Side</th>
                <th className="text-right py-2 px-1">Price</th>
                <th className="text-right py-2 px-1">Amt</th>
                <th className="text-right py-2 px-1">P&L</th>
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
                trades.slice(0, 20).map((trade) => (
                  <tr key={trade.id} className="border-t border-trading-border hover:bg-trading-bg">
                    <td className="py-2 px-1 text-trading-muted">{formatDate(trade.timestamp)}</td>
                    <td className="py-2 px-1">
                      <span className={`flex items-center gap-1 font-medium ${
                        trade.side === 'buy' ? 'text-trading-green' : 'text-trading-red'
                      }`}>
                        {trade.side === 'buy' ? (
                          <ArrowUpRight size={12} />
                        ) : (
                          <ArrowDownRight size={12} />
                        )}
                        {trade.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-1 text-right">${trade.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-1 text-right">{trade.amount.toFixed(3)}</td>
                    <td className={`py-2 px-1 text-right ${(trade.pnl || 0) >= 0 ? 'text-trading-green' : 'text-trading-red'}`}>
                      {(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}