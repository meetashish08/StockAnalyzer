import React, { useEffect, useState } from 'react';
import { formatNumber, formatPercent } from '../../utils/format';

interface MarketIndex {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  lastUpdated?: Date;
}

const indices: MarketIndex[] = [
  { name: 'NIFTY 50', symbol: '^NSEI', value: 0, change: 0, changePercent: 0 },
  { name: 'SENSEX', symbol: '^BSESN', value: 0, change: 0, changePercent: 0 },
  { name: 'S&P 500', symbol: '^GSPC', value: 0, change: 0, changePercent: 0 },
  { name: 'NASDAQ', symbol: '^IXIC', value: 0, change: 0, changePercent: 0 },
];

export default function MarketOverview() {
  const [marketData, setMarketData] = useState<MarketIndex[]>(indices);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMarketData() {
      setIsLoading(true);
      setError(null);
      try {
        const fetchTime = new Date();
        const response = await fetch('http://localhost:3001/api/market-indices');

        if (response.ok) {
          const data = await response.json();
          const updatedData = indices.map(index => {
            const liveData = data.find((d: any) => d.symbol === index.symbol);
            if (liveData) {
              return {
                ...index,
                value: liveData.price,
                change: liveData.change,
                changePercent: liveData.changePercent,
                lastUpdated: fetchTime,
              };
            }
            return { ...index, lastUpdated: fetchTime };
          });
          setMarketData(updatedData);
          setLastFetchTime(fetchTime);
        } else {
          setError('Failed to fetch market data');
        }
      } catch (err) {
        console.error('Market data fetch error:', err);
        setError('Unable to connect to server');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-3">
      {/* Last Updated Header */}
      {lastFetchTime && (
        <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-700">
          <span>Market Data</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Last updated: {formatLastUpdated(lastFetchTime)}
          </span>
        </div>
      )}

      {/* Market Indices Grid */}
      <div className="grid grid-cols-2 gap-3">
        {marketData.map((index) => (
          <div
            key={index.symbol}
            className="p-3 rounded-lg bg-slate-700/50"
          >
            <p className="text-xs text-slate-400 mb-1">{index.name}</p>
            <p className="text-lg font-semibold text-white">
              {formatNumber(index.value, 0)}
            </p>
            <p className={`text-sm ${index.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
              {index.changePercent >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(index.change), 0)} ({formatPercent(index.changePercent)})
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
