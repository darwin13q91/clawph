import { useEffect, useMemo } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, DollarSign, Package } from 'lucide-react';

export function PortfolioSummary() {
  const { portfolio, positions, prices, fetchPortfolio, fetchPositions } = useTradingStore();

  // Fetch initial data on mount
  useEffect(() => {
    fetchPortfolio();
    fetchPositions();
    
    // Refresh every 5 seconds
    const interval = setInterval(() => {
      fetchPortfolio();
      fetchPositions();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchPortfolio, fetchPositions]);

  // Calculate live position values with current prices
  const positionsWithLiveData = useMemo(() => {
    return positions.map(pos => {
      const livePrice = prices[pos.symbol]?.price || pos.currentPrice || pos.avgPrice;
      const positionValue = Math.abs(pos.amount) * livePrice;
      const costBasis = Math.abs(pos.amount) * pos.avgPrice;
      const liveUnrealizedPnL = pos.amount >= 0 
        ? (livePrice - pos.avgPrice) * pos.amount  // Long position
        : (pos.avgPrice - livePrice) * Math.abs(pos.amount);  // Short position
      const liveUnrealizedPnLPercent = pos.avgPrice > 0 
        ? ((livePrice - pos.avgPrice) / pos.avgPrice) * 100 * (pos.amount >= 0 ? 1 : -1)
        : 0;
      
      return {
        ...pos,
        currentPrice: livePrice,
        positionValue,
        costBasis,
        unrealizedPnL: liveUnrealizedPnL,
        unrealizedPnLPercent: liveUnrealizedPnLPercent,
      };
    });
  }, [positions, prices]);

  // Calculate totals
  const totalPositionValue = positionsWithLiveData.reduce((sum, pos) => sum + pos.positionValue, 0);
  const totalUnrealizedPnL = positionsWithLiveData.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
  const totalEquity = portfolio.balance + totalPositionValue;

  return (
    <div className="card-trading">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wallet size={20} className="text-blue-500" />
          Portfolio
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-trading-bg rounded-lg p-3">
          <p className="text-sm text-trading-muted mb-1">Total Equity</p>
          <p className="text-xl font-mono font-semibold">${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-trading-bg rounded-lg p-3">
          <p className="text-sm text-trading-muted mb-1">Available Balance</p>
          <p className="text-xl font-mono font-semibold">${portfolio.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-trading-bg rounded-lg p-3">
          <p className="text-sm text-trading-muted mb-1">Position Value</p>
          <p className="text-xl font-mono font-semibold text-blue-400">${totalPositionValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-trading-bg rounded-lg p-3">
          <p className="text-sm text-trading-muted mb-1">Unrealized P&L</p>
          <p className={`text-xl font-mono font-semibold ${totalUnrealizedPnL >= 0 ? 'text-trading-green' : 'text-trading-red'}`}>
            {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="border-t border-trading-border pt-4">
        <h3 className="text-sm font-medium text-trading-muted mb-3 flex items-center gap-2">
          <Package size={16} />
          Open Positions ({positions.length})
        </h3>

        {positions.length === 0 ? (
          <p className="text-sm text-trading-muted text-center py-4">No open positions</p>
        ) : (
          <div className="space-y-2">
            {positionsWithLiveData.map((pos) => (
              <div key={pos.symbol} className="bg-trading-bg rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">{pos.symbol}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${pos.amount > 0 ? 'bg-trading-green/20 text-trading-green' : 'bg-trading-red/20 text-trading-red'}`}>
                      {pos.amount > 0 ? 'LONG' : 'SHORT'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-trading-muted">${pos.currentPrice.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-trading-muted text-xs">Amount</p>
                    <p className="font-mono">{Math.abs(pos.amount).toFixed(4)} oz</p>
                  </div>
                  <div>
                    <p className="text-trading-muted text-xs">Avg Price</p>
                    <p className="font-mono">${pos.avgPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-trading-muted text-xs">Value</p>
                    <p className="font-mono">${pos.positionValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-trading-muted text-xs">P&L</p>
                    <p className={`font-mono font-medium ${pos.unrealizedPnL >= 0 ? 'text-trading-green' : 'text-trading-red'}`}>
                      {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} ({pos.unrealizedPnLPercent >= 0 ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}