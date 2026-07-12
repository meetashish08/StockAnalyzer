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
    <div className="bg-slate-800 p-4 md:p-5 lg:p-6 border-b border-slate-700">
      {/* Symbol and Company Name */}
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1">{holding.symbol}</h2>
          <p className="text-sm md:text-base text-slate-400">{holding.name}</p>
          <div className="flex items-center gap-1 md:gap-2 mt-1 flex-wrap">
            <Tooltip text="Stock exchange where this security is listed">
              <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                {holding.market}
              </span>
            </Tooltip>
            <Tooltip text="Type of security (Stock, ETF, Mutual Fund, etc.)">
              <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                {holding.type}
              </span>
            </Tooltip>
            {holding.sector && (
              <Tooltip text="Industry sector this company operates in">
                <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                  {holding.sector}
                </span>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Current Price */}
      <div className="mb-4 md:mb-5">
        <div className="flex items-baseline gap-2 md:gap-3 flex-wrap">
          <Tooltip text="Current market price">
            <span className={`text-3xl md:text-4xl font-bold ${
              dayChange >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatPrice(currentPrice, currency)}
            </span>
          </Tooltip>
          <Tooltip text="Change from previous close">
            <span className={`text-lg md:text-xl ${
              dayChange >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {dayChange >= 0 ? '+' : ''}
              {formatPrice(dayChange, currency)} ({formatPercent(dayChangePercent)})
            </span>
          </Tooltip>
        </div>
      </div>

      {/* Day Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-slate-400">Open</p>
            <Tooltip text="Opening price for the trading day">
              <InfoIcon
                title="What is Open Price?"
                explanation="The Open price is the first traded price when the stock market opens for the day. It can differ from the previous day's closing price due to after-hours trading or overnight news. The difference between Open and Close indicates intraday price movement."
              />
            </Tooltip>
          </div>
          <p className="text-sm text-white font-medium">
            {openPrice > 0 ? formatPrice(openPrice, currency) : 'N/A'}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-slate-400">High</p>
            <Tooltip text="Highest price reached today">
              <InfoIcon
                title="What is Day High?"
                explanation="The Day High is the highest price at which the stock traded during the current trading session. It represents the peak price buyers were willing to pay today. Comparing the high to the current price shows if the stock has retreated from its peak."
              />
            </Tooltip>
          </div>
          <p className="text-sm text-white font-medium">
            {highPrice > 0 ? formatPrice(highPrice, currency) : 'N/A'}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-slate-400">Low</p>
            <Tooltip text="Lowest price reached today">
              <InfoIcon
                title="What is Day Low?"
                explanation="The Day Low is the lowest price at which the stock traded during the current trading session. It represents the bottom price sellers accepted today. The range between Day High and Day Low shows the stock's intraday volatility."
              />
            </Tooltip>
          </div>
          <p className="text-sm text-white font-medium">
            {lowPrice > 0 ? formatPrice(lowPrice, currency) : 'N/A'}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-slate-400">Prev Close</p>
            <Tooltip text="Previous trading day's closing price">
              <InfoIcon
                title="What is Previous Close?"
                explanation="Previous Close is the last traded price when the market closed on the previous trading day. It's used as the baseline to calculate today's price change and percentage change. The difference between current price and previous close shows today's performance."
              />
            </Tooltip>
          </div>
          <p className="text-sm text-white font-medium">
            {formatPrice(previousClose, currency)}
          </p>
        </div>
      </div>

      {/* 52-Week Range */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <p className="text-xs text-slate-400">52W Range</p>
            <Tooltip text="Lowest and highest prices in the past year">
              <InfoIcon
                title="What is 52-Week Range?"
                explanation="The 52-Week Range shows the lowest and highest prices at which the stock has traded over the past 52 weeks (one year). Stocks trading near their 52-week high may indicate strong momentum, while those near their 52-week low might be undervalued or facing challenges. The colored bar shows where the current price sits within this range."
              />
            </Tooltip>
          </div>
          <p className="text-xs text-slate-400">
            {low52Week ? formatPrice(low52Week, currency) : '-'} - {high52Week ? formatPrice(high52Week, currency) : '-'}
          </p>
        </div>
        <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-300"
            style={{ width: `${range52WeekProgress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-slate-800 transition-all duration-300"
            style={{ left: `calc(${range52WeekProgress}% - 6px)` }}
          />
        </div>
      </div>
    </div>
  );
}
