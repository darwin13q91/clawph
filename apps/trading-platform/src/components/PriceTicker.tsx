import { TrendingUp, TrendingDown, Wifi, WifiOff } from 'lucide-react';
import { useTradingStore } from '@/store/tradingStore';
import type { Asset } from '@/types';

const ASSETS: { symbol: Asset; name: string; color: string }[] = [
  { symbol: 'GOLD', name: 'XAU/USD', color: 'text-amber-500' },
  { symbol: 'BTC', name: 'BTC/USD', color: 'text-orange-500' },
];

export function PriceTicker() {
  const { prices, isConnected, connectionError } = useTradingStore();

  return (
    <div className="glass border-b border-trading-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          {ASSETS.map((asset) => {
            const priceData = prices[asset.symbol];
            const isUp = (priceData?.change24h || 0) >= 0;

            return (
              <div key={asset.symbol} className="flex items-center gap-3">
                <span className={`font-semibold ${asset.color}`}>{asset.name}</span>
                <span className="font-mono text-lg font-semibold">
                  {priceData ? formatPrice(priceData.price) : '—'}
                </span>
                {priceData && (
                  <span
                    className={`flex items-center gap-1 text-sm font-medium ${
                      isUp ? 'text-trading-green' : 'text-trading-red'
                    }`}
                  >
                    {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {isUp ? '+' : ''}
                    {priceData.change24h.toFixed(2)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <>
              <Wifi size={16} className="text-trading-green" />
              <span className="text-trading-muted">Connected</span>
            </>
          ) : (
            <>
              <WifiOff size={16} className="text-trading-red" />
              <span className="text-trading-red">{connectionError || 'Disconnected'}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}