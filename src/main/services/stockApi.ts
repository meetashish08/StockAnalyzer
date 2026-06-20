import axios from 'axios';
import type { StockQuote, Market, TechnicalIndicators } from '../../shared/types';

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const YAHOO_QUOTE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';
const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';

function getYahooSymbol(symbol: string, market: Market): string {
  switch (market) {
    case 'NSE':
      return `${symbol}.NS`;
    case 'BSE':
      return `${symbol}.BO`;
    case 'NYSE':
    case 'NASDAQ':
    default:
      return symbol;
  }
}

export async function getQuote(symbol: string, market: Market): Promise<StockQuote | null> {
  try {
    const yahooSymbol = getYahooSymbol(symbol, market);
    const response = await axios.get(YAHOO_QUOTE_URL, {
      params: { symbols: yahooSymbol },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const quote = response.data?.quoteResponse?.result?.[0];
    if (!quote || !quote.regularMarketPrice) {
      return null;
    }

    return {
      symbol: symbol.toUpperCase(),
      name: quote.longName || quote.shortName || symbol,
      market,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      open: quote.regularMarketOpen || 0,
      high: quote.regularMarketDayHigh || 0,
      low: quote.regularMarketDayLow || 0,
      previousClose: quote.regularMarketPreviousClose || 0,
      volume: quote.regularMarketVolume || 0,
      marketCap: quote.marketCap,
      pe: quote.trailingPE,
      pb: quote.priceToBook,
      dividendYield: quote.dividendYield,
      high52Week: quote.fiftyTwoWeekHigh || 0,
      low52Week: quote.fiftyTwoWeekLow || 0,
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

export async function getQuotes(symbols: Array<{ symbol: string; market: Market }>): Promise<StockQuote[]> {
  const quotes: StockQuote[] = [];

  // Batch requests to avoid rate limiting
  const batchSize = 10;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const batchQuotes = await Promise.all(
      batch.map(({ symbol, market }) => getQuote(symbol, market))
    );
    quotes.push(...batchQuotes.filter((q): q is StockQuote => q !== null));

    // Small delay between batches
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return quotes;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  try {
    const response = await axios.get(YAHOO_SEARCH_URL, {
      params: { q: query, quotesCount: 10, newsCount: 0 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const quotes = response.data?.quotes || [];
    return quotes
      .filter((q: any) => q.quoteType === 'EQUITY')
      .slice(0, 10)
      .map((q: any) => ({
        symbol: q.symbol?.replace('.NS', '').replace('.BO', '') || '',
        name: q.longname || q.shortname || q.symbol || '',
        exchange: q.exchange || '',
        type: q.quoteType || 'EQUITY',
      }));
  } catch (error) {
    console.error('Error searching stocks:', error);
    return [];
  }
}

interface HistoricalDataPoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

export async function getHistoricalData(
  symbol: string,
  market: Market,
  period: '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' = '1y'
): Promise<HistoricalDataPoint[]> {
  try {
    const yahooSymbol = getYahooSymbol(symbol, market);
    const periodMap: Record<string, string> = {
      '1mo': '1mo', '3mo': '3mo', '6mo': '6mo',
      '1y': '1y', '2y': '2y', '5y': '5y'
    };

    const response = await axios.get(`${YAHOO_BASE_URL}${yahooSymbol}`, {
      params: {
        range: periodMap[period] || '1y',
        interval: period === '1mo' ? '1d' : '1wk',
      },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const result = response.data?.chart?.result?.[0];
    if (!result || !result.timestamp) {
      return [];
    }

    const quotes = result.indicators?.quote?.[0];
    const adjClose = result.indicators?.adjclose?.[0]?.adjclose;

    return result.timestamp.map((ts: number, i: number) => ({
      date: new Date(ts * 1000),
      open: quotes?.open?.[i] || 0,
      high: quotes?.high?.[i] || 0,
      low: quotes?.low?.[i] || 0,
      close: quotes?.close?.[i] || 0,
      volume: quotes?.volume?.[i] || 0,
      adjClose: adjClose?.[i],
    }));
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return [];
  }
}

export function calculateTechnicalIndicators(prices: number[]): TechnicalIndicators {
  const rsi14 = calculateRSI(prices, 14);
  const macd = calculateMACD(prices);
  const sma50 = calculateSMA(prices, 50);
  const sma200 = calculateSMA(prices, 200);
  const bollingerBands = calculateBollingerBands(prices, 20, 2);
  const atr14 = calculateATR(prices, 14);

  return {
    rsi14,
    macd,
    sma50,
    sma200,
    bollingerBands,
    atr14,
  };
}

function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;

  // Simple approximation for signal line
  const signalLine = macdLine * 0.9;
  const histogram = macdLine - signalLine;

  return { value: macdLine, signal: signalLine, histogram };
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;

  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateBollingerBands(prices: number[], period: number, stdDev: number): { upper: number; middle: number; lower: number } {
  const middle = calculateSMA(prices, period);
  const slice = prices.slice(-period);

  const variance = slice.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
  const standardDeviation = Math.sqrt(variance);

  return {
    upper: middle + stdDev * standardDeviation,
    middle,
    lower: middle - stdDev * standardDeviation,
  };
}

function calculateATR(prices: number[], period: number): number {
  if (prices.length < period + 1) return 0;

  let atr = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const tr = Math.abs(prices[i] - prices[i - 1]);
    atr += tr;
  }

  return atr / period;
}
