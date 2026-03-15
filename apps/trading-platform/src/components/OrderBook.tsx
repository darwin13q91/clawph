import { useEffect, useState } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import { BookOpen } from 'lucide-react';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  type: 'bid' | 'ask';
}

export function OrderBook() {
  const { selectedAsset, prices } = useTradingStore();
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const [spread, setSpread] = useState(0);

  useEffect(() => {
    const generateOrderBook = () => {
      const currentPrice = prices[selectedAsset]?.price || 0;
      if (!currentPrice) return;

      const spreadAmount = currentPrice * 0.001; // 0.1% spread
      setSpread(spreadAmount);

      // Generate asks (sell orders)
      const newAsks: OrderBookEntry[] = [];
      for (let i = 10; i >= 1; i--) {
        const price = currentPrice + spreadAmount + (i * currentPrice * 0.0005);
        const amount = Math.random() * 2 + 0.1;
        newAsks.push({
          price,
          amount,
          total: price * amount,
          type: 'ask',
        });
      }

      // Generate bids (buy orders)
      const newBids: OrderBookEntry[] = [];
      for (let i = 1; i <= 10; i++) {
        const price = currentPrice - (i * currentPrice * 0.0005);
        const amount = Math.random() * 2 + 0.1;
        newBids.push({
          price,
          amount,
          total: price * amount,
          type: 'bid',
        });
      }

      setAsks(newAsks.reverse());
      setBids(newBids);
    };

    generateOrderBook();
    const interval = setInterval(generateOrderBook, 2000);
    return () => clearInterval(interval);
  }, [selectedAsset, prices]);

  const maxTotal = Math.max(
    ...bids.map(b => b.total),
    ...asks.map(a => a.total)
  );

  return (
    <div className="card-trading h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={20} className="text-blue-500" />
        <h2 className="text-lg font-semibold">Order Book</h2>
      </div>

      <div className="flex-1 overflow-auto text-sm font-mono">
        {/* Asks (Sells) */}
        <div className="mb-2">
          <div className="grid grid-cols-3 text-trading-muted text-xs mb-1 px-2">
            <span>Price</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Total</span>
          </div>
          {asks.map((ask, idx) => (
            <div key={idx} className="grid grid-cols-3 py-0.5 px-2 relative">
              <div
                className="absolute right-0 top-0 bottom-0 bg-red-500/10"
                style={{ width: `${(ask.total / maxTotal) * 100}%` }}
              />
              <span className="text-trading-red relative z-10">{ask.price.toFixed(2)}</span>
              <span className="text-right relative z-10">{ask.amount.toFixed(4)}</span>
              <span className="text-right relative z-10 text-trading-muted">{(ask.total / 1000).toFixed(1)}K</span>
            </div>
          ))}
        </div>

        {/* Spread */}
        <div className="border-y border-trading-border py-2 text-center">
          <span className="text-trading-muted">Spread: </span>
          <span className="font-semibold">{spread.toFixed(2)}</span>
        </div>

        {/* Bids (Buys) */}
        <div className="mt-2">
          {bids.map((bid, idx) => (
            <div key={idx} className="grid grid-cols-3 py-0.5 px-2 relative">
              <div
                className="absolute right-0 top-0 bottom-0 bg-green-500/10"
                style={{ width: `${(bid.total / maxTotal) * 100}%` }}
              />
              <span className="text-trading-green relative z-10">{bid.price.toFixed(2)}</span>
              <span className="text-right relative z-10">{bid.amount.toFixed(4)}</span>
              <span className="text-right relative z-10 text-trading-muted">{(bid.total / 1000).toFixed(1)}K</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}