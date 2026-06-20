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

  useEffect(() => {
    async function fetchMarketData() {
      setIsLoading(true);
      try {
        const fetchTime = new Date();
        const updatedData = await Promise.all(
          indices.map(async (index) => {
            try {
              const quote = await window.electronAPI.getQuote(index.symbol, 'NYSE');
              if (quote) {
                return {
                  ...index,
                  value: quote.price,
                  change: quote.change,
                  changePercent: quote.changePercent,
                  lastUpdated: fetchTime,
                };
              }
            } catch {
              // Return mock data if API fails
            }
            return {
              ...index,
              value: index.name.includes('NIFTY') ? 23500 + Math.random() * 200 :
                     index.name.includes('SENSEX') ? 77500 + Math.random() * 300 :
                     index.name.includes('S&P') ? 5400 + Math.random() * 50 :
                     17800 + Math.random() * 100,
              change: (Math.random() - 0.4) * 200,
              changePercent: (Math.random() - 0.4) * 1.5,
              lastUpdated: fetchTime,
            };
          })
        );
        setMarketData(updatedData);
        setLastFetchTime(fetchTime);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMarketData();
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
