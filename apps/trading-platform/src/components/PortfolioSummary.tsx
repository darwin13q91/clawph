import { useTradingStore } from '@/store/tradingStore';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, DollarSign } from 'lucide-react';

export function PortfolioSummary() {
  const { portfolio, positions, prices } = useTradingStore();

  // Calculate total unrealized P&L
  const totalUnrealizedPnL = positions.reduce((total, pos) => total + pos.unrealizedPnL, 0);
  const totalEquity = portfolio.balance + totalUnrealizedPnL;

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
          <p className="text-sm text-trading-muted mb-1">Equity</p>
          <p className="text-xl font-mono font-semibold">${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-trading-bg rounded-lg p-3">
          <p className="text-sm text-trading-muted mb-1">Balance</p>
          <p className="text-xl font-mono font-semibold">${portfolio.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-trading-bg rounded-lg p-3">
          <p className="text-sm text-trading-muted mb-1">Day P&L</p>
          <p className={`text-xl font-mono font-semibold ${portfolio.dayPnL >= 0 ? 'text-trading-green' : 'text-trading-red'}`}>
            {portfolio.dayPnL >= 0 ? '+' : ''}${portfolio.dayPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-trading-bg rounded-lg p-3">
          <p className="text-sm text-trading-muted mb-1">Total P&L</p>
          <p className={`text-xl font-mono font-semibold ${portfolio.totalPnL >= 0 ? 'text-trading-green' : 'text-trading-red'}`}>
            {portfolio.totalPnL >= 0 ? '+' : ''}${portfolio.totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="border-t border-trading-border pt-4">
        <h3 className="text-sm font-medium text-trading-muted mb-3 flex items-center gap-2">
          <TrendingUp size={16} />
          Positions ({positions.length})
        </h3>

        {positions.length === 0 ? (
          <p className="text-sm text-trading-muted text-center py-4">No open positions</p>
        ) : (
          <div className="space-y-2">
            {positions.map((pos) => (
              <div key={pos.symbol} className="bg-trading-bg rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{pos.symbol}</p>
                  <p className="text-sm text-trading-muted">{pos.amount > 0 ? 'Long' : 'Short'} {Math.abs(pos.amount)} @ ${pos.avgPrice.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono">${pos.currentPrice.toFixed(2)}</p>
                  <p className={`text-sm font-medium ${pos.unrealizedPnL >= 0 ? 'text-trading-green' : 'text-trading-red'}`}>
                    {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} ({pos.unrealizedPnLPercent.toFixed(2)}%)
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}