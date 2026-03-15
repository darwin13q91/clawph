import { useEffect, useRef, useState } from 'react';
import { useTradingStore } from '@/store/tradingStore';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import type { CandleData, Asset } from '@/types';

export function TradingChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const { selectedAsset } = useTradingStore();
  const [timeframe, setTimeframe] = useState('1h');
  const [candleData, setCandleData] = useState<CandleData[]>([]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    chart.current = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0a0a0f' },
        textColor: '#71717a',
      },
      grid: {
        vertLines: { color: '#1a1a20' },
        horzLines: { color: '#1a1a20' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#3b82f6', width: 1, style: 2 },
        horzLine: { color: '#3b82f6', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: '#2a2a35',
      },
      timeScale: {
        borderColor: '#2a2a35',
        timeVisible: true,
      },
    });

    candleSeries.current = chart.current.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const handleResize = () => {
      if (chart.current && chartContainerRef.current) {
        chart.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.current?.remove();
    };
  }, []);

  // Fetch and update chart data
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const response = await fetch(`/api/chart/${selectedAsset}?timeframe=${timeframe}`);
        if (response.ok) {
          const data: CandleData[] = await response.json();
          setCandleData(data);
          
          if (candleSeries.current) {
            const formattedData = data.map((candle) => ({
              time: candle.time as Time,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
            }));
            candleSeries.current.setData(formattedData);
            chart.current?.timeScale().fitContent();
          }
        }
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      }
    };

    fetchChartData();
    const interval = setInterval(fetchChartData, 30000); // Update every 30s
    
    return () => clearInterval(interval);
  }, [selectedAsset, timeframe]);

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

  return (
    <div className="card-trading h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{selectedAsset}/USD Chart</h2>
        <div className="flex gap-1">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-blue-600 text-white'
                  : 'bg-trading-bg text-trading-muted hover:bg-trading-border'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div ref={chartContainerRef} className="flex-1 min-h-[400px]" />
    </div>
  );
}