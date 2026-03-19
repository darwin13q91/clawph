import { useState } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import { useApi } from '@/hooks/useApi';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import type { OrderType, OrderSide, Asset } from '@/types';

export function OrderEntry() {
  const { selectedAsset, prices } = useTradingStore();
  const { post, isLoading } = useApi();
  
  const [side, setSide] = useState<OrderSide>('buy');
  const [type, setType] = useState<OrderType>('market');
  const [amount, setAmount] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentPrice = prices[selectedAsset]?.price || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const orderPrice = type === 'market' ? currentPrice : parseFloat(price);
    if (type === 'limit' && (!orderPrice || orderPrice <= 0)) {
      setError('Please enter a valid price');
      return;
    }

    const order = {
      symbol: selectedAsset,
      side,
      type,
      amount: numAmount,
      price: orderPrice,
    };

    const result = await post('/orders', order);
    
    if (result) {
      setSuccess(`${side.toUpperCase()} order placed successfully!`);
      setAmount('');
      setPrice('');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError('Failed to place order. Please try again.');
    }
  };

  const estimatedTotal = (parseFloat(amount) || 0) * (type === 'market' ? currentPrice : parseFloat(price) || 0);

  return (
    <div className="card-trading">
      <h2 className="text-lg font-semibold mb-4">Place Order</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Asset Selector */}
        <div>
          <label className="block text-sm font-medium text-trading-muted mb-2">Asset</label>
          <AssetSelector />
        </div>

        {/* Order Side */}
        <div>
          <label className="block text-sm font-medium text-trading-muted mb-2">Side</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide('buy')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-colors ${
                side === 'buy'
                  ? 'bg-green-600 text-white'
                  : 'bg-trading-bg text-trading-muted hover:bg-trading-border'
              }`}
            >
              <ArrowUpCircle size={18} /> Buy
            </button>
            <button
              type="button"
              onClick={() => setSide('sell')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-colors ${
                side === 'sell'
                  ? 'bg-red-600 text-white'
                  : 'bg-trading-bg text-trading-muted hover:bg-trading-border'
              }`}
            >
              <ArrowDownCircle size={18} /> Sell
            </button>
          </div>
        </div>

        {/* Order Type */}
        <div>
          <label className="block text-sm font-medium text-trading-muted mb-2">Order Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('market')}
              className={`py-2 rounded-lg font-medium transition-colors ${
                type === 'market'
                  ? 'bg-blue-600 text-white'
                  : 'bg-trading-bg text-trading-muted hover:bg-trading-border'
              }`}
            >
              Market
            </button>
            <button
              type="button"
              onClick={() => setType('limit')}
              className={`py-2 rounded-lg font-medium transition-colors ${
                type === 'limit'
                  ? 'bg-blue-600 text-white'
                  : 'bg-trading-bg text-trading-muted hover:bg-trading-border'
              }`}
            >
              Limit
            </button>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-trading-muted mb-2">Amount</label>
          <div className="relative">
            <input
              type="number"
              step="0.0001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="input-trading w-full pr-12"
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-trading-muted text-sm">{selectedAsset}</span>
          </div>
        </div>

        {/* Limit Price */}
        {type === 'limit' && (
          <div>
            <label className="block text-sm font-medium text-trading-muted mb-2">Limit Price</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={currentPrice.toFixed(2)}
                className="input-trading w-full pr-12"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-trading-muted text-sm">USD</span>
            </div>
          </div>
        )}

        {/* Estimated Total */}
        {estimatedTotal > 0 && (
          <div className="bg-trading-bg rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-trading-muted">Estimated Total</span>
              <span className="font-mono font-semibold">${estimatedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">{error}</div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm text-green-400">{success}</div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
            side === 'buy'
              ? 'bg-green-600 hover:bg-green-500 disabled:bg-green-800'
              : 'bg-red-600 hover:bg-red-500 disabled:bg-red-800'
          }`}
        >
          {isLoading ? 'Placing Order...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${selectedAsset}`}
        </button>
      </form>
    </div>
  );
}

function AssetSelector() {
  const { selectedAsset, setSelectedAsset, prices } = useTradingStore();
  const assets: Asset[] = ['GOLD', 'BTC'];

  return (
    <div className="grid grid-cols-2 gap-2">
      {assets.map((asset) => {
        const price = prices[asset]?.price;
        return (
          <button
            key={asset}
            type="button"
            onClick={() => setSelectedAsset(asset)}
            className={`py-3 px-4 rounded-lg border transition-all ${
              selectedAsset === asset
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-trading-border bg-trading-bg hover:border-trading-muted'
            }`}
          >
            <div className="text-left">
              <p className="font-semibold">{asset}</p>
              <p className="text-sm text-trading-muted font-mono">{price ? `$${price.toLocaleString()}` : '—'}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}