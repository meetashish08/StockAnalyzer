// Market types
export type Market = 'NSE' | 'BSE' | 'NYSE' | 'NASDAQ';
export type AssetType = 'STOCK' | 'MUTUAL_FUND' | 'ETF';
export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND' | 'SIP';
export type Signal = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

// Database entities
export interface Holding {
  id: number;
  symbol: string;
  market: Market;
  name: string;
  isin?: string;
  quantity: number;
  avgPrice: number;
  importedPrice?: number;  // Value as of Excel import date (preserved)
  currentPrice?: number;   // Today's live market price (updated by refresh)
  dayChange?: number;      // Today's price change
  dayChangePercent?: number;
  previousClose?: number;
  lastPriceUpdate?: string;
  purchaseDate: string;
  type: AssetType;
  sector?: string;
  importId?: number;
  createdAt: string;
}

export interface Transaction {
  id: number;
  holdingId: number;
  type: TransactionType;
  quantity: number;
  price: number;
  date: string;
  fees: number;
  source: 'MANUAL' | 'IMPORT' | 'GMAIL';
  notes?: string;
}

export interface PriceCache {
  symbol: string;
  market: Market;
  currentPrice: number;
  previousClose: number;
  dayChange: number;
  dayChangePct: number;
  high52Week: number;
  low52Week: number;
  volume: number;
  updatedAt: string;
}

// Stock analysis types
export interface StockQuote {
  symbol: string;
  name: string;
  market: Market;
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

export interface TechnicalIndicators {
  rsi14: number;
  macd: { value: number; signal: number; histogram: number };
  sma50: number;
  sma200: number;
  bollingerBands: { upper: number; middle: number; lower: number };
  atr14: number;
}

export interface FundamentalData {
  pe: number;
  pb: number;
  eps: number;
  roe: number;
  debtToEquity: number;
  currentRatio: number;
  revenueGrowth: number;
  profitMargin: number;
  dividendYield: number;
}

export interface StockScore {
  symbol: string;
  name: string;
  market: Market;
  technicalScore: number;
  fundamentalScore: number;
  momentumScore: number;
  valueScore: number;
  overallScore: number;
  signal: Signal;
  confidence: number;
  rationale: string[];
  lastUpdated: string;
}

// Portfolio analytics
export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  xirr: number;
  holdingsCount: number;
}

export interface HoldingWithPrice extends Holding {
  currentPrice: number;
  importedPrice?: number;
  importedValue?: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  dayChange: number;
  dayChangePercent: number;
  allocation: number;
}

export interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
  holdings: string[];
}

export interface MarketAllocation {
  market: Market;
  value: number;
  percentage: number;
}

export interface PortfolioHealth {
  overallScore: number;
  diversificationScore: number;
  riskScore: number;
  recommendations: CorrectiveAction[];
  warnings: string[];
}

export interface CorrectiveAction {
  type: 'REBALANCE' | 'REDUCE' | 'ADD' | 'EXIT' | 'SWITCH';
  symbol: string;
  currentAllocation: number;
  targetAllocation: number;
  action: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  taxImplication?: {
    type: 'STCG' | 'LTCG';
    estimatedTax: number;
  };
}

// Import types
export interface ImportedTransaction {
  symbol: string;
  name?: string;
  type: TransactionType;
  quantity: number;
  price: number;
  date: string;
  fees?: number;
  source: string;
  raw?: string;
}

// Mutual Fund types
export interface MutualFund {
  schemeCode: string;
  schemeName: string;
  nav: number;
  navDate: string;
  category: string;
  fundHouse: string;
  expenseRatio: number;
  aum: number;
  returns: {
    oneYear: number;
    threeYear: number;
    fiveYear: number;
  };
}

export interface FundOverlap {
  fund1: string;
  fund2: string;
  overlapPercentage: number;
  commonStocks: string[];
}

// IPC Channel names
export const IPC_CHANNELS = {
  // Database operations
  DB_GET_HOLDINGS: 'db:get-holdings',
  DB_ADD_HOLDING: 'db:add-holding',
  DB_UPDATE_HOLDING: 'db:update-holding',
  DB_DELETE_HOLDING: 'db:delete-holding',
  DB_GET_TRANSACTIONS: 'db:get-transactions',
  DB_ADD_TRANSACTION: 'db:add-transaction',

  // Stock API
  STOCK_GET_QUOTE: 'stock:get-quote',
  STOCK_GET_QUOTES: 'stock:get-quotes',
  STOCK_SEARCH: 'stock:search',
  STOCK_GET_HISTORY: 'stock:get-history',

  // Analysis
  ANALYSIS_GET_SCORE: 'analysis:get-score',
  ANALYSIS_GET_TOP_PICKS: 'analysis:get-top-picks',
  ANALYSIS_PORTFOLIO_HEALTH: 'analysis:portfolio-health',

  // Import
  IMPORT_CSV: 'import:csv',
  IMPORT_EXCEL: 'import:excel',
  IMPORT_PARSE_EMAIL: 'import:parse-email',

  // Portfolio
  PORTFOLIO_GET_SUMMARY: 'portfolio:get-summary',
  PORTFOLIO_GET_ALLOCATION: 'portfolio:get-allocation',
} as const;
