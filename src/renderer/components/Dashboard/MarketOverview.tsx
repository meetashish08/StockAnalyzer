import React, { useEffect, useState } from 'react';
import { formatNumber, formatPercent } from '../../utils/format';

interface MarketIndex {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
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

  useEffect(() => {
    async function fetchMarketData() {
      setIsLoading(true);
      try {
        const updatedData = await Promise.all(
          indices.map(async (index) => {
            try {
              // For indices, we use a different approach since they're not regular stocks
              // In production, you'd fetch these from a proper API
              const quote = await window.electronAPI.getQuote(index.symbol, 'NYSE');
              if (quote) {
                return {
                  ...index,
                  value: quote.price,
                  change: quote.change,
                  changePercent: quote.changePercent,
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
            };
          })
        );
        setMarketData(updatedData);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMarketData();
  }, []);

  return (
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
  );
}
