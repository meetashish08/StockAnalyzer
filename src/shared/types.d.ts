export type Market = 'NSE' | 'BSE' | 'NYSE' | 'NASDAQ';
export type AssetType = 'STOCK' | 'MUTUAL_FUND' | 'ETF';
export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND' | 'SIP';
export type Signal = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
export interface Holding {
    id: number;
    symbol: string;
    market: Market;
    name: string;
    quantity: number;
    avgPrice: number;
    purchaseDate: string;
    type: AssetType;
    sector?: string;
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
    macd: {
        value: number;
        signal: number;
        histogram: number;
    };
    sma50: number;
    sma200: number;
    bollingerBands: {
        upper: number;
        middle: number;
        lower: number;
    };
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
export declare const IPC_CHANNELS: {
    readonly DB_GET_HOLDINGS: "db:get-holdings";
    readonly DB_ADD_HOLDING: "db:add-holding";
    readonly DB_UPDATE_HOLDING: "db:update-holding";
    readonly DB_DELETE_HOLDING: "db:delete-holding";
    readonly DB_GET_TRANSACTIONS: "db:get-transactions";
    readonly DB_ADD_TRANSACTION: "db:add-transaction";
    readonly STOCK_GET_QUOTE: "stock:get-quote";
    readonly STOCK_GET_QUOTES: "stock:get-quotes";
    readonly STOCK_SEARCH: "stock:search";
    readonly STOCK_GET_HISTORY: "stock:get-history";
    readonly ANALYSIS_GET_SCORE: "analysis:get-score";
    readonly ANALYSIS_GET_TOP_PICKS: "analysis:get-top-picks";
    readonly ANALYSIS_PORTFOLIO_HEALTH: "analysis:portfolio-health";
    readonly IMPORT_CSV: "import:csv";
    readonly IMPORT_EXCEL: "import:excel";
    readonly IMPORT_PARSE_EMAIL: "import:parse-email";
    readonly PORTFOLIO_GET_SUMMARY: "portfolio:get-summary";
    readonly PORTFOLIO_GET_ALLOCATION: "portfolio:get-allocation";
};
//# sourceMappingURL=types.d.ts.map