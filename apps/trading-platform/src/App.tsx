import { useWebSocket } from '@/hooks/useWebSocket';
import { PriceTicker } from '@/components/PriceTicker';
import { TradingChart } from '@/components/TradingChart';
import { OrderEntry } from '@/components/OrderEntry';
import { PortfolioSummary } from '@/components/PortfolioSummary';
import { OrderBook } from '@/components/OrderBook';
import { TradeHistory } from '@/components/TradeHistory';
import { BarChart3 } from 'lucide-react';

function App() {
  useWebSocket(); // Initialize WebSocket connection

  return (
    <div className="min-h-screen bg-trading-bg text-trading-text">
      {/* Header */}
      <header className="glass border-b border-trading-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BarChart3 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Gold&amp;BTC Pro</h1>
              <p className="text-xs text-trading-muted">Professional Trading Platform</p>
            </div>
          </div>
          <div className="text-sm text-trading-muted">
            Paper Trading Mode
          </div>
        </div>
      </header>

      {/* Price Ticker */}
      <PriceTicker />

      {/* Main Content */}
      <main className="p-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Left Sidebar - Order Entry & Portfolio */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <OrderEntry />
            <PortfolioSummary />
          </div>

          {/* Center - Chart */}
          <div className="col-span-12 lg:col-span-6">
            <TradingChart />
          </div>

          {/* Right Sidebar - Order Book & Trades */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <div className="h-[400px]">
              <OrderBook />
            </div>
            <div className="h-[300px]">
              <TradeHistory />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;