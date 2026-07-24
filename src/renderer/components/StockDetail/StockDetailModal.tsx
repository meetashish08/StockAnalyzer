import React, { useEffect, useState } from 'react';
import StockHeader from './StockHeader';
import StockPriceChart from './StockPriceChart';
import Tooltip from '../common/Tooltip';
import InfoIcon from '../common/InfoIcon';
import {
  calculateSMA,
  detectGoldenCross,
  detectDeathCross,
  calculateRSI,
  calculateBollingerBands,
  calculateMACD,
  getOverallSignal,
  type PricePoint,
  type ChartDataPoint,
} from '../../utils/technicalAnalysis';
import type { Holding } from '../../../shared/types';

interface StockDetailModalProps {
  holding: Holding;
  onClose: () => void;
}

interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

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
  roe?: number;
  profitMargin?: number;
  dividendYield?: number;
  high52Week: number;
  low52Week: number;
}

export default function StockDetailModal({ holding, onClose }: StockDetailModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('1y');
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [goldenCrosses, setGoldenCrosses] = useState<number[]>([]);
  const [deathCrosses, setDeathCrosses] = useState<number[]>([]);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);

  const currency = (holding.market === 'NYSE' || holding.market === 'NASDAQ') ? 'USD' : 'INR';

  // Helper function to format large numbers (volume, market cap)
  const formatLargeNumber = (num: number | undefined): string => {
    if (!num || num === 0) return 'N/A';
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Fetch quote data on mount
  useEffect(() => {
    fetchQuoteData();
  }, [holding.symbol, holding.market]);

  // Fetch historical data
  useEffect(() => {
    fetchHistoricalData();
  }, [selectedPeriod, holding.symbol, holding.market]);

  const fetchQuoteData = async () => {
    try {
      const response = await fetch(`/api/quote/${holding.symbol}/${holding.market}`);

      if (!response.ok) {
        console.error('Failed to fetch quote data');
        return;
      }

      const quote = await response.json();
      setQuoteData(quote);
    } catch (err) {
      console.error('Error fetching quote data:', err);
    }
  };

  const fetchHistoricalData = async () => {
    // Use transitioning state for period changes, loading state for initial load
    const isInitialLoad = chartData.length === 0;

    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsTransitioning(true);
    }

    setError(null);

    try {
      // For short periods (1D, 5D, 1M, 3M), fetch extended data for DMA calculations
      // then slice to display only the requested period
      // 1D/5D: Need 200 days for 200 DMA
      // 1M: ~22 days, need 200 days for 200 DMA and 50 days for 50 DMA
      // 3M: ~66 days, need 200 days for 200 DMA
      const needsExtendedData = ['1d', '5d', '1mo', '3mo'].includes(selectedPeriod);
      const fetchPeriod = needsExtendedData ? '1y' : selectedPeriod;

      const response = await fetch(
        `/api/historical/${holding.symbol}/${holding.market}?period=${fetchPeriod}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }

      const result = await response.json();
      let historicalData: HistoricalDataPoint[] = result.data;

      if (!historicalData || historicalData.length === 0) {
        throw new Error('No historical data available for this stock');
      }

      // Convert to price points for technical analysis
      const allPricePoints: PricePoint[] = historicalData.map((d) => ({
        date: d.date,
        close: d.close,
      }));

      // Calculate moving averages on full dataset
      const dma50 = calculateSMA(allPricePoints, 50);
      const dma200 = calculateSMA(allPricePoints, 200);

      // Determine how many points to display
      let displayPoints = allPricePoints;
      let displayDma50 = dma50;
      let displayDma200 = dma200;

      if (needsExtendedData) {
        // Slice to show only the requested period while keeping DMAs calculated
        let daysToShow;
        if (selectedPeriod === '1d') {
          daysToShow = 1;
        } else if (selectedPeriod === '5d') {
          daysToShow = 5;
        } else if (selectedPeriod === '1mo') {
          daysToShow = 22; // ~1 month of trading days
        } else if (selectedPeriod === '3mo') {
          daysToShow = 66; // ~3 months of trading days
        } else {
          daysToShow = allPricePoints.length;
        }

        const startIndex = Math.max(0, allPricePoints.length - daysToShow);

        displayPoints = allPricePoints.slice(startIndex);
        displayDma50 = dma50.slice(startIndex);
        displayDma200 = dma200.slice(startIndex);
      }

      // Calculate technical indicators on display points
      const rsi = calculateRSI(displayPoints, 14);
      const bollinger = calculateBollingerBands(displayPoints, 20, 2);
      const macd = calculateMACD(displayPoints);

      // Detect crosses on full data, then filter to display range
      const goldenCrossIndices = detectGoldenCross(dma50, dma200)
        .map(idx => needsExtendedData ? idx - (allPricePoints.length - displayPoints.length) : idx)
        .filter(idx => idx >= 0 && idx < displayPoints.length);

      const deathCrossIndices = detectDeathCross(dma50, dma200)
        .map(idx => needsExtendedData ? idx - (allPricePoints.length - displayPoints.length) : idx)
        .filter(idx => idx >= 0 && idx < displayPoints.length);

      // Combine data for chart
      const combinedData: ChartDataPoint[] = displayPoints.map((point, index) => ({
        date: point.date,
        price: point.close,
        dma50: displayDma50[index] ?? undefined,
        dma200: displayDma200[index] ?? undefined,
        rsi: rsi[index] ?? undefined,
        bollingerUpper: bollinger.upper[index] ?? undefined,
        bollingerLower: bollinger.lower[index] ?? undefined,
        bollingerMiddle: bollinger.middle[index] ?? undefined,
      }));

      setChartData(combinedData);
      setGoldenCrosses(goldenCrossIndices);
      setDeathCrosses(deathCrossIndices);
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
      setIsTransitioning(false);
    }
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-900 rounded-lg shadow-2xl w-full max-w-[1400px] max-h-[85vh] overflow-hidden transition-all duration-300 animate-scale-in flex flex-col">
        {/* Close Button */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-lg transition-colors shadow-lg"
            title="Close (ESC)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-slate-900">
          <StockHeader holding={holding} quoteData={quoteData} />
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto scroll-smooth">{/* Content will go here */}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-slate-400">Loading historical data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-red-400 mb-4">{error}</p>
                <button onClick={fetchHistoricalData} className="btn-secondary">
                  Retry
                </button>
              </div>
            </div>
          ) : (
            /* Responsive Multi-Column Layout */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-10 gap-4 md:gap-5 lg:gap-6 p-4 md:p-5 lg:p-6">
              {/* Chart Section - Spans full width on mobile, 2 cols on tablet, 4 cols on desktop */}
              <div className="md:col-span-2 lg:col-span-4">
                <div className="bg-slate-800 rounded-lg p-4 md:p-5 lg:p-6 h-full">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">
                    Price Chart & DMAs
                  </h3>
                  <StockPriceChart
                    data={chartData}
                    currency={currency}
                    selectedPeriod={selectedPeriod}
                    onPeriodChange={handlePeriodChange}
                    goldenCrosses={goldenCrosses}
                    deathCrosses={deathCrosses}
                    isTransitioning={isTransitioning}
                  />

                  {/* Technical Summary */}
                  <div className="mt-3 md:mt-4 grid grid-cols-3 gap-2 md:gap-3">
                    <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg">
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-slate-400 text-xs">Golden Cross</p>
                        <Tooltip text="50 DMA crosses above 200 DMA">
                          <InfoIcon
                            title="What is a Golden Cross?"
                            explanation="A golden cross occurs when a short-term moving average (50-day) crosses above a long-term moving average (200-day). This is considered a bullish signal indicating potential upward momentum and is often used by traders to identify buying opportunities."
                          />
                        </Tooltip>
                      </div>
                      <p className="text-lg md:text-xl font-bold text-green-400">{goldenCrosses.length}</p>
                    </div>
                    <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg">
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-slate-400 text-xs">Death Cross</p>
                        <Tooltip text="50 DMA crosses below 200 DMA">
                          <InfoIcon
                            title="What is a Death Cross?"
                            explanation="A death cross occurs when a short-term moving average (50-day) crosses below a long-term moving average (200-day). This is considered a bearish signal indicating potential downward momentum and is often used by traders to identify selling opportunities or periods to avoid buying."
                          />
                        </Tooltip>
                      </div>
                      <p className="text-lg md:text-xl font-bold text-red-400">{deathCrosses.length}</p>
                    </div>
                    <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg">
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-slate-400 text-xs">Trend</p>
                        <Tooltip text="Current market trend direction">
                          <InfoIcon
                            title="What is Trend?"
                            explanation="The trend indicates whether the stock is currently in an upward or downward trajectory based on the relationship between the 50-day and 200-day moving averages. An upward arrow means the short-term average is above the long-term average (bullish), while a downward arrow means the opposite (bearish)."
                          />
                        </Tooltip>
                      </div>
                      <p className="text-lg md:text-xl font-bold text-blue-400">
                        {chartData.length > 0 &&
                        chartData[chartData.length - 1].dma50 &&
                        chartData[chartData.length - 1].dma200 &&
                        chartData[chartData.length - 1].dma50! > chartData[chartData.length - 1].dma200!
                          ? '↑'
                          : '↓'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fundamentals Section - Full width on mobile, 1 col on tablet, 3 cols on desktop */}
              <div className="lg:col-span-3">
                <div className="bg-slate-800 rounded-lg p-4 md:p-5 lg:p-6 h-full">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Fundamentals</h3>
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">P/E Ratio</span>
                        <Tooltip text="Price-to-Earnings ratio">
                          <InfoIcon
                            title="What is P/E Ratio?"
                            explanation="The P/E ratio compares a company's stock price to its earnings per share. It shows how much investors are willing to pay for each dollar of earnings. A lower P/E may indicate an undervalued stock, while a higher P/E may suggest growth expectations or overvaluation. Compare P/E ratios within the same industry for best results."
                          />
                        </Tooltip>
                      </div>
                      <span className="text-white font-medium text-sm">{quoteData?.pe ? quoteData.pe.toFixed(2) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">P/B Ratio</span>
                        <Tooltip text="Price-to-Book ratio">
                          <InfoIcon
                            title="What is P/B Ratio?"
                            explanation="The P/B ratio compares a company's market value to its book value (assets minus liabilities). A P/B ratio below 1.0 may indicate the stock is undervalued, as the market price is less than the company's net asset value. However, this varies by industry and growth stage."
                          />
                        </Tooltip>
                      </div>
                      <span className="text-white font-medium text-sm">{quoteData?.pb ? quoteData.pb.toFixed(2) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">ROE</span>
                        <Tooltip text="Return on Equity (%)">
                          <InfoIcon
                            title="What is ROE?"
                            explanation="Return on Equity measures how efficiently a company uses shareholders' equity to generate profits. ROE above 15% is considered good, above 20% is excellent. It's calculated as Net Income / Shareholders' Equity × 100. Compare ROE within the same industry for best results."
                          />
                        </Tooltip>
                      </div>
                      <span className="text-white font-medium text-sm">{quoteData?.roe ? `${(quoteData.roe * 100).toFixed(2)}%` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">Volume</span>
                        <Tooltip text="Total shares traded today">
                          <InfoIcon
                            title="What is Volume?"
                            explanation="Volume is the total number of shares traded during the trading day. High volume indicates strong interest and liquidity, making it easier to buy or sell. A sudden spike in volume often accompanies significant price movements or news. Volume helps confirm the strength of price trends."
                          />
                        </Tooltip>
                      </div>
                      <span className="text-white font-medium text-sm">{formatLargeNumber(quoteData?.volume)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">Market Cap</span>
                        <Tooltip text="Total company value">
                          <InfoIcon
                            title="What is Market Cap?"
                            explanation="Market Capitalization is the total value of all outstanding shares (share price × total shares). It categorizes companies: Small-cap (<$2B), Mid-cap ($2B-$10B), Large-cap (>$10B). Larger market caps generally indicate more stable, established companies, while smaller caps may offer higher growth potential with more risk."
                          />
                        </Tooltip>
                      </div>
                      <span className="text-white font-medium text-sm">{formatLargeNumber(quoteData?.marketCap)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">52W Range</span>
                        <Tooltip text="Yearly price range">
                          <InfoIcon
                            title="What is 52W Range?"
                            explanation="The 52-Week Range shows the lowest and highest prices over the past year. Stocks near their 52-week high may have strong momentum, while those near the low might be undervalued or facing challenges. This helps assess if the current price is relatively high or low compared to its recent history."
                          />
                        </Tooltip>
                      </div>
                      <span className="text-white font-medium text-sm">
                        {quoteData?.low52Week && quoteData?.high52Week
                          ? `${quoteData.low52Week.toFixed(2)} - ${quoteData.high52Week.toFixed(2)}`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">Dividend Yield</span>
                        <Tooltip text="Annual dividend as % of stock price">
                          <InfoIcon
                            title="What is Dividend Yield?"
                            explanation="Dividend yield shows the annual dividend payment as a percentage of the current stock price. It indicates how much income you'll receive relative to your investment. A yield of 2-6% is typical for dividend-paying stocks. Higher yields provide more income, but extremely high yields (above 10%) may indicate risk or an unsustainable payout."
                          />
                        </Tooltip>
                      </div>
                      <span className="text-white font-medium text-sm">{quoteData?.dividendYield ? `${(quoteData.dividendYield * 100).toFixed(2)}%` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signals Section - Full width on mobile, 1 col on tablet, 3 cols on desktop */}
              <div className="lg:col-span-3">
                <div className="bg-slate-800 rounded-lg p-4 md:p-5 lg:p-6 h-full">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Technical Signals</h3>
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">RSI (14)</span>
                        <Tooltip text="Relative Strength Index (0-100)">
                          <InfoIcon
                            title="What is RSI?"
                            explanation="The Relative Strength Index (RSI) measures the speed and magnitude of price changes on a scale of 0-100. Values above 70 indicate overbought conditions (potential sell signal), while values below 30 indicate oversold conditions (potential buy signal). RSI helps identify when a stock may be due for a reversal."
                          />
                        </Tooltip>
                      </div>
                      {(() => {
                        const currentRSI = chartData[chartData.length - 1]?.rsi;
                        const rsiColor = currentRSI
                          ? currentRSI > 70 ? 'text-red-400'
                          : currentRSI < 30 ? 'text-green-400'
                          : 'text-yellow-400'
                          : 'text-slate-400';
                        return (
                          <span className={`font-medium text-sm ${rsiColor}`}>
                            {currentRSI ? currentRSI.toFixed(2) : 'N/A'}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">MACD Signal</span>
                        <Tooltip text="Moving Average Convergence Divergence">
                          <InfoIcon
                            title="What is MACD?"
                            explanation="MACD (Moving Average Convergence Divergence) is a trend-following momentum indicator that shows the relationship between two moving averages. When the MACD line crosses above the signal line, it's a bullish signal. When it crosses below, it's bearish. The indicator helps identify trend changes and momentum shifts."
                          />
                        </Tooltip>
                      </div>
                      {(() => {
                        const macdData = calculateMACD(chartData.map(d => ({ date: d.date, close: d.price })));
                        const lastMACD = macdData.macd[macdData.macd.length - 1];
                        const lastSignal = macdData.signal[macdData.signal.length - 1];
                        const isBullish = lastMACD !== null && lastSignal !== null && lastMACD > lastSignal;
                        return (
                          <span className={`font-medium text-sm ${isBullish ? 'text-green-400' : 'text-red-400'}`}>
                            {lastMACD !== null && lastSignal !== null ? (isBullish ? 'Bullish' : 'Bearish') : 'N/A'}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">Price vs 50 SMA</span>
                        <Tooltip text="Price position relative to 50-day average">
                          <InfoIcon
                            title="What is Price vs SMA 50?"
                            explanation="The 50-day Simple Moving Average is the average closing price over the last 50 trading days. When the price is above the 50 SMA, it indicates an uptrend. When below, it suggests a downtrend. The percentage shows how far the price is from this key support/resistance level."
                          />
                        </Tooltip>
                      </div>
                      {(() => {
                        const currentPrice = chartData[chartData.length - 1]?.price;
                        const current50 = chartData[chartData.length - 1]?.dma50;
                        const diff = currentPrice && current50 ? ((currentPrice - current50) / current50) * 100 : null;
                        const isAbove = diff !== null && diff > 0;
                        return (
                          <span className={`font-medium text-sm ${isAbove ? 'text-green-400' : 'text-red-400'}`}>
                            {diff !== null ? `${isAbove ? '+' : ''}${diff.toFixed(2)}%` : 'N/A'}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">Price vs 200 SMA</span>
                        <Tooltip text="Price position relative to 200-day average">
                          <InfoIcon
                            title="What is Price vs SMA 200?"
                            explanation="The 200-day Simple Moving Average is a key indicator of long-term trends. A price above the 200 SMA suggests a long-term bull market, while below indicates a bear market. This percentage shows how far the current price deviates from this critical long-term trend line."
                          />
                        </Tooltip>
                      </div>
                      {(() => {
                        const currentPrice = chartData[chartData.length - 1]?.price;
                        const current200 = chartData[chartData.length - 1]?.dma200;
                        const diff = currentPrice && current200 ? ((currentPrice - current200) / current200) * 100 : null;
                        const isAbove = diff !== null && diff > 0;
                        return (
                          <span className={`font-medium text-sm ${isAbove ? 'text-green-400' : 'text-red-400'}`}>
                            {diff !== null ? `${isAbove ? '+' : ''}${diff.toFixed(2)}%` : 'N/A'}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">Bollinger Position</span>
                        <Tooltip text="Price position within Bollinger Bands">
                          <InfoIcon
                            title="What is Bollinger Position?"
                            explanation="Bollinger Bands show volatility around a 20-day moving average. When price touches the upper band, the stock may be overbought. When it touches the lower band, it may be oversold. The position percentage shows where the current price sits within these bands (0% = lower band, 50% = middle, 100% = upper band)."
                          />
                        </Tooltip>
                      </div>
                      {(() => {
                        const currentPrice = chartData[chartData.length - 1]?.price;
                        const upper = chartData[chartData.length - 1]?.bollingerUpper;
                        const lower = chartData[chartData.length - 1]?.bollingerLower;
                        const position = currentPrice && upper && lower
                          ? ((currentPrice - lower) / (upper - lower)) * 100
                          : null;
                        const color = position !== null
                          ? position > 80 ? 'text-red-400'
                          : position < 20 ? 'text-green-400'
                          : 'text-yellow-400'
                          : 'text-slate-400';
                        return (
                          <span className={`font-medium text-sm ${color}`}>
                            {position !== null ? `${position.toFixed(1)}%` : 'N/A'}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex justify-between py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-sm">Overall Signal</span>
                        <Tooltip text="Combined technical analysis signal">
                          <InfoIcon
                            title="What is Overall Signal?"
                            explanation="The Overall Signal combines multiple technical indicators (RSI, MACD, moving averages, etc.) to provide a general recommendation: BUY (bullish indicators dominate), SELL (bearish indicators dominate), or HOLD (mixed or neutral signals). This is a general guideline and should be combined with fundamental analysis and your own research before making investment decisions."
                          />
                        </Tooltip>
                      </div>
                      {(() => {
                        const currentPrice = chartData[chartData.length - 1]?.price;
                        const current50 = chartData[chartData.length - 1]?.dma50;
                        const current200 = chartData[chartData.length - 1]?.dma200;
                        const currentRSI = chartData[chartData.length - 1]?.rsi;
                        const signal = currentPrice ? getOverallSignal(currentPrice, current50, current200, currentRSI) : 'HOLD';
                        const signalColor = signal === 'BUY' ? 'bg-green-600 text-white'
                          : signal === 'SELL' ? 'bg-red-600 text-white'
                          : 'bg-slate-700 text-slate-300';
                        return (
                          <span className={`px-2 md:px-3 py-1 rounded text-sm font-medium ${signalColor}`}>
                            {signal}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
