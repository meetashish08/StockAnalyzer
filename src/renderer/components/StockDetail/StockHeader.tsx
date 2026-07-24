import React from 'react';
import { formatPrice, formatPercent } from '../../utils/format';
import Tooltip from '../common/Tooltip';
import InfoIcon from '../common/InfoIcon';
import type { Holding } from '../../../shared/types';

interface QuoteData {
  symbol: string;
  name: string;
  market: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  pb?: number;
  dividendYield?: number;
  high52Week: number;
  low52Week: number;
}

interface StockHeaderProps {
  holding: Holding;
  quoteData: QuoteData | null;
}

export default function StockHeader({ holding, quoteData }: StockHeaderProps) {
  const currency = (holding.market === 'NYSE' || holding.market === 'NASDAQ') ? 'USD' : 'INR';

  // Use quote data if available, otherwise fall back to holding data
  const currentPrice = quoteData?.price || holding.currentPrice || holding.avgPrice;
  const previousClose = quoteData?.previousClose || holding.previousClose || currentPrice;
  const dayChange = quoteData?.change || holding.dayChange || 0;
  const dayChangePercent = quoteData?.changePercent || holding.dayChangePercent || 0;
  const openPrice = quoteData?.open || 0;
  const highPrice = quoteData?.high || 0;
  const lowPrice = quoteData?.low || 0;

  // Calculate 52-week range progress
  const high52Week = quoteData?.high52Week || 0;
  const low52Week = quoteData?.low52Week || 0;
  const range52WeekProgress = high52Week && low52Week
    ? ((currentPrice - low52Week) / (high52Week - low52Week)) * 100
    : 50;

  return (
    <div className="bg-slate-800 p-3 md:p-4 border-b border-slate-700">
      {/* Compact Header - Symbol, Price, and Key Stats in one row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        {/* Left: Symbol & Price */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-bold text-white">{holding.symbol}</h2>
              <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                {holding.market}
              </span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-1">{holding.name}</p>
          </div>
          <div className="border-l border-slate-600 pl-4">
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl md:text-3xl font-bold ${
                dayChange >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatPrice(currentPrice, currency)}
              </span>
              <span className={`text-sm ${
                dayChange >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {dayChange >= 0 ? '+' : ''}
                {formatPrice(dayChange, currency)} ({formatPercent(dayChangePercent)})
              </span>
            </div>
          </div>
        </div>

        {/* Right: Compact Day Stats */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <p className="text-slate-500">Open</p>
            <p className="text-white font-medium">{openPrice > 0 ? formatPrice(openPrice, currency) : 'N/A'}</p>
          </div>
          <div>
            <p className="text-slate-500">High</p>
            <p className="text-green-400 font-medium">{highPrice > 0 ? formatPrice(highPrice, currency) : 'N/A'}</p>
          </div>
          <div>
            <p className="text-slate-500">Low</p>
            <p className="text-red-400 font-medium">{lowPrice > 0 ? formatPrice(lowPrice, currency) : 'N/A'}</p>
          </div>
          <div>
            <p className="text-slate-500">Prev</p>
            <p className="text-white font-medium">{formatPrice(previousClose, currency)}</p>
          </div>
        </div>
      </div>

      {/* Compact 52-Week Range - Single Line */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 whitespace-nowrap">52W Range</span>
        <div className="flex-1 relative h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
            style={{ width: `${range52WeekProgress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full border border-slate-800"
            style={{ left: `calc(${range52WeekProgress}% - 5px)` }}
          />
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap">
          {low52Week ? formatPrice(low52Week, currency) : '-'} - {high52Week ? formatPrice(high52Week, currency) : '-'}
        </span>
      </div>
    </div>
  );
}
