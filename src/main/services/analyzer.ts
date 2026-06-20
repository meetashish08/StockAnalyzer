import type { StockScore, Signal, Market, StockQuote, TechnicalIndicators, PortfolioHealth, CorrectiveAction, Holding, HoldingWithPrice, SectorAllocation } from '../../shared/types';
import { getQuote, getHistoricalData, calculateTechnicalIndicators } from './stockApi';
import { getAllHoldings } from '../database/holdingsRepository';
import { getDatabase } from '../database/init';

interface ScoreWeights {
  technical: number;
  fundamental: number;
  momentum: number;
  value: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  technical: 0.25,
  fundamental: 0.30,
  momentum: 0.25,
  value: 0.20,
};

export async function analyzeStock(symbol: string, market: Market): Promise<StockScore | null> {
  try {
    const quote = await getQuote(symbol, market);
    if (!quote) return null;

    const historicalData = await getHistoricalData(symbol, market, '1y');
    const prices = historicalData.map(d => d.close);

    const technicalIndicators = calculateTechnicalIndicators(prices);

    const technicalScore = calculateTechnicalScore(technicalIndicators, quote);
    const fundamentalScore = calculateFundamentalScore(quote);
    const momentumScore = calculateMomentumScore(quote, prices);
    const valueScore = calculateValueScore(quote);

    const overallScore =
      technicalScore * DEFAULT_WEIGHTS.technical +
      fundamentalScore * DEFAULT_WEIGHTS.fundamental +
      momentumScore * DEFAULT_WEIGHTS.momentum +
      valueScore * DEFAULT_WEIGHTS.value;

    const signal = getSignal(overallScore);
    const confidence = calculateConfidence(technicalScore, fundamentalScore, momentumScore, valueScore);
    const rationale = generateRationale(quote, technicalIndicators, technicalScore, fundamentalScore, momentumScore, valueScore);

    const stockScore: StockScore = {
      symbol,
      name: quote.name,
      market,
      technicalScore,
      fundamentalScore,
      momentumScore,
      valueScore,
      overallScore,
      signal,
      confidence,
      rationale,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the score
    cacheStockScore(stockScore);

    return stockScore;
  } catch (error) {
    console.error(`Error analyzing stock ${symbol}:`, error);
    return null;
  }
}

function calculateTechnicalScore(indicators: TechnicalIndicators, quote: StockQuote): number {
  let score = 50;

  // RSI analysis (30-70 range is neutral)
  if (indicators.rsi14 < 30) score += 15; // Oversold - bullish
  else if (indicators.rsi14 > 70) score -= 15; // Overbought - bearish
  else if (indicators.rsi14 > 40 && indicators.rsi14 < 60) score += 5; // Neutral trending

  // MACD analysis
  if (indicators.macd.histogram > 0) score += 10;
  else score -= 10;

  // Moving average analysis
  if (quote.price > indicators.sma50) score += 10;
  if (quote.price > indicators.sma200) score += 10;
  if (indicators.sma50 > indicators.sma200) score += 5; // Golden cross

  // Bollinger Bands
  if (quote.price < indicators.bollingerBands.lower) score += 10; // Near lower band - potential bounce
  else if (quote.price > indicators.bollingerBands.upper) score -= 10; // Near upper band - potential pullback

  return Math.max(0, Math.min(100, score));
}

function calculateFundamentalScore(quote: StockQuote): number {
  let score = 50;

  // P/E ratio (lower is better, but not negative)
  if (quote.pe !== undefined) {
    if (quote.pe > 0 && quote.pe < 15) score += 20;
    else if (quote.pe >= 15 && quote.pe < 25) score += 10;
    else if (quote.pe >= 25 && quote.pe < 40) score -= 5;
    else if (quote.pe >= 40) score -= 15;
  }

  // P/B ratio
  if (quote.pb !== undefined) {
    if (quote.pb > 0 && quote.pb < 1) score += 15;
    else if (quote.pb >= 1 && quote.pb < 3) score += 5;
    else if (quote.pb >= 3 && quote.pb < 5) score -= 5;
    else if (quote.pb >= 5) score -= 10;
  }

  // Dividend yield
  if (quote.dividendYield !== undefined && quote.dividendYield > 0) {
    if (quote.dividendYield > 4) score += 15;
    else if (quote.dividendYield > 2) score += 10;
    else if (quote.dividendYield > 1) score += 5;
  }

  // Market cap (prefer large/mid cap for stability)
  if (quote.marketCap !== undefined) {
    const marketCapInCr = quote.marketCap / 10000000; // Convert to crores
    if (marketCapInCr > 100000) score += 5; // Large cap
    else if (marketCapInCr > 10000) score += 10; // Mid cap
  }

  return Math.max(0, Math.min(100, score));
}

function calculateMomentumScore(quote: StockQuote, prices: number[]): number {
  let score = 50;

  // Day change
  if (quote.changePercent > 2) score += 10;
  else if (quote.changePercent > 0) score += 5;
  else if (quote.changePercent < -2) score -= 10;
  else if (quote.changePercent < 0) score -= 5;

  // Position relative to 52-week range
  const range = quote.high52Week - quote.low52Week;
  if (range > 0) {
    const position = (quote.price - quote.low52Week) / range;
    if (position > 0.8) score -= 10; // Near highs - less upside
    else if (position < 0.3) score += 15; // Near lows - potential upside
    else if (position >= 0.4 && position <= 0.6) score += 5; // Mid range
  }

  // Price trend (last 20 days vs 60 days)
  if (prices.length >= 60) {
    const recent20Avg = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const older60Avg = prices.slice(-60, -20).reduce((a, b) => a + b, 0) / 40;

    if (recent20Avg > older60Avg * 1.05) score += 15; // Uptrend
    else if (recent20Avg < older60Avg * 0.95) score -= 10; // Downtrend
  }

  return Math.max(0, Math.min(100, score));
}

function calculateValueScore(quote: StockQuote): number {
  let score = 50;

  // Discount from 52-week high
  const discountFromHigh = ((quote.high52Week - quote.price) / quote.high52Week) * 100;
  if (discountFromHigh > 30) score += 20;
  else if (discountFromHigh > 20) score += 15;
  else if (discountFromHigh > 10) score += 10;

  // Premium from 52-week low
  const premiumFromLow = ((quote.price - quote.low52Week) / quote.low52Week) * 100;
  if (premiumFromLow < 20) score += 15;
  else if (premiumFromLow < 50) score += 5;
  else if (premiumFromLow > 100) score -= 10;

  // Combined P/E and dividend analysis for value
  if (quote.pe !== undefined && quote.dividendYield !== undefined) {
    if (quote.pe < 20 && quote.dividendYield > 2) score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

function getSignal(score: number): Signal {
  if (score >= 75) return 'STRONG_BUY';
  if (score >= 60) return 'BUY';
  if (score >= 40) return 'HOLD';
  if (score >= 25) return 'SELL';
  return 'STRONG_SELL';
}

function calculateConfidence(technical: number, fundamental: number, momentum: number, value: number): number {
  // Confidence is higher when all scores agree
  const scores = [technical, fundamental, momentum, value];
  const avg = scores.reduce((a, b) => a + b, 0) / 4;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / 4;
  const stdDev = Math.sqrt(variance);

  // Lower std deviation = higher confidence
  const maxStdDev = 25; // Maximum expected std deviation
  const confidence = Math.max(0, 100 - (stdDev / maxStdDev) * 50);

  return Math.round(confidence);
}

function generateRationale(
  quote: StockQuote,
  indicators: TechnicalIndicators,
  technical: number,
  fundamental: number,
  momentum: number,
  value: number
): string[] {
  const rationale: string[] = [];

  // Technical rationale
  if (indicators.rsi14 < 30) {
    rationale.push(`RSI at ${indicators.rsi14.toFixed(1)} indicates oversold conditions`);
  } else if (indicators.rsi14 > 70) {
    rationale.push(`RSI at ${indicators.rsi14.toFixed(1)} indicates overbought conditions`);
  }

  if (quote.price > indicators.sma200) {
    rationale.push('Trading above 200-day moving average (bullish trend)');
  } else {
    rationale.push('Trading below 200-day moving average (bearish trend)');
  }

  // Fundamental rationale
  if (quote.pe !== undefined) {
    if (quote.pe < 15) rationale.push(`Low P/E ratio of ${quote.pe.toFixed(1)} indicates undervaluation`);
    else if (quote.pe > 40) rationale.push(`High P/E ratio of ${quote.pe.toFixed(1)} indicates expensive valuation`);
  }

  // Value rationale
  const discountFromHigh = ((quote.high52Week - quote.price) / quote.high52Week) * 100;
  if (discountFromHigh > 20) {
    rationale.push(`Trading ${discountFromHigh.toFixed(1)}% below 52-week high`);
  }

  // Momentum rationale
  if (quote.changePercent > 3) {
    rationale.push(`Strong momentum with ${quote.changePercent.toFixed(2)}% gain today`);
  } else if (quote.changePercent < -3) {
    rationale.push(`Weak momentum with ${quote.changePercent.toFixed(2)}% loss today`);
  }

  return rationale;
}

function cacheStockScore(score: StockScore): void {
  try {
    const db = getDatabase();
    db.prepare(`
      INSERT OR REPLACE INTO stock_scores (
        symbol, market, technical_score, fundamental_score, momentum_score,
        value_score, overall_score, signal, confidence, rationale, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      score.symbol,
      score.market,
      score.technicalScore,
      score.fundamentalScore,
      score.momentumScore,
      score.valueScore,
      score.overallScore,
      score.signal,
      score.confidence,
      JSON.stringify(score.rationale)
    );
  } catch (error) {
    console.error('Error caching stock score:', error);
  }
}

export async function getTopPicks(market: Market, count: number = 10): Promise<StockScore[]> {
  // Define universe of stocks to screen
  const universe = market === 'NSE'
    ? ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'ITC', 'SBIN', 'BHARTIARTL', 'KOTAKBANK',
       'LT', 'AXISBANK', 'ASIANPAINT', 'MARUTI', 'TITAN', 'BAJFINANCE', 'WIPRO', 'HCLTECH', 'ULTRACEMCO', 'SUNPHARMA']
    : ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'UNH', 'JNJ',
       'V', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV', 'PEP', 'KO', 'COST'];

  const scores: StockScore[] = [];

  for (const symbol of universe) {
    const score = await analyzeStock(symbol, market);
    if (score) scores.push(score);
    await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
  }

  // Sort by overall score and return top picks
  return scores
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, count);
}

export async function analyzePortfolioHealth(): Promise<PortfolioHealth> {
  const holdings = getAllHoldings();
  if (holdings.length === 0) {
    return {
      overallScore: 0,
      diversificationScore: 0,
      riskScore: 0,
      recommendations: [],
      warnings: ['No holdings found. Add stocks to your portfolio to get health analysis.'],
    };
  }

  // Get current prices for all holdings
  const holdingsWithPrices: HoldingWithPrice[] = [];
  let totalValue = 0;

  for (const holding of holdings) {
    const quote = await getQuote(holding.symbol, holding.market);
    const currentPrice = quote?.price || holding.avgPrice;
    const currentValue = currentPrice * holding.quantity;
    totalValue += currentValue;

    holdingsWithPrices.push({
      ...holding,
      currentPrice,
      currentValue,
      pnl: currentValue - (holding.avgPrice * holding.quantity),
      pnlPercent: ((currentPrice - holding.avgPrice) / holding.avgPrice) * 100,
      dayChange: quote?.change || 0,
      dayChangePercent: quote?.changePercent || 0,
      allocation: 0, // Will calculate after we have total
    });
  }

  // Calculate allocations
  holdingsWithPrices.forEach(h => {
    h.allocation = (h.currentValue / totalValue) * 100;
  });

  // Calculate sector allocation
  const sectorAllocation = calculateSectorAllocation(holdingsWithPrices);

  // Calculate scores
  const diversificationScore = calculateDiversificationScore(holdingsWithPrices, sectorAllocation);
  const riskScore = calculateRiskScore(holdingsWithPrices);
  const overallScore = (diversificationScore + riskScore) / 2;

  // Generate recommendations
  const recommendations = generateRecommendations(holdingsWithPrices, sectorAllocation);
  const warnings = generateWarnings(holdingsWithPrices, sectorAllocation);

  return {
    overallScore,
    diversificationScore,
    riskScore,
    recommendations,
    warnings,
  };
}

function calculateSectorAllocation(holdings: HoldingWithPrice[]): SectorAllocation[] {
  const sectorMap = new Map<string, { value: number; holdings: string[] }>();
  let totalValue = 0;

  for (const holding of holdings) {
    const sector = holding.sector || 'Unknown';
    const existing = sectorMap.get(sector) || { value: 0, holdings: [] };
    existing.value += holding.currentValue;
    existing.holdings.push(holding.symbol);
    sectorMap.set(sector, existing);
    totalValue += holding.currentValue;
  }

  return Array.from(sectorMap.entries()).map(([sector, data]) => ({
    sector,
    value: data.value,
    percentage: (data.value / totalValue) * 100,
    holdings: data.holdings,
  }));
}

function calculateDiversificationScore(holdings: HoldingWithPrice[], sectorAllocation: SectorAllocation[]): number {
  let score = 100;

  // Penalize for few holdings
  if (holdings.length < 5) score -= 20;
  else if (holdings.length < 10) score -= 10;

  // Penalize for concentration in single stock
  const maxAllocation = Math.max(...holdings.map(h => h.allocation));
  if (maxAllocation > 30) score -= 25;
  else if (maxAllocation > 20) score -= 15;
  else if (maxAllocation > 15) score -= 5;

  // Penalize for sector concentration
  const maxSectorAllocation = Math.max(...sectorAllocation.map(s => s.percentage));
  if (maxSectorAllocation > 50) score -= 20;
  else if (maxSectorAllocation > 35) score -= 10;

  // Bonus for having multiple markets
  const markets = new Set(holdings.map(h => h.market));
  if (markets.size > 1) score += 10;

  return Math.max(0, Math.min(100, score));
}

function calculateRiskScore(holdings: HoldingWithPrice[]): number {
  let score = 100;

  // Penalize for large losses
  const losers = holdings.filter(h => h.pnlPercent < -20);
  score -= losers.length * 10;

  // Penalize for volatile holdings (large day changes)
  const volatile = holdings.filter(h => Math.abs(h.dayChangePercent) > 5);
  score -= volatile.length * 5;

  // Bonus for profitable holdings
  const profitable = holdings.filter(h => h.pnlPercent > 0);
  score += (profitable.length / holdings.length) * 20;

  return Math.max(0, Math.min(100, score));
}

function generateRecommendations(holdings: HoldingWithPrice[], sectorAllocation: SectorAllocation[]): CorrectiveAction[] {
  const recommendations: CorrectiveAction[] = [];

  // Check for overweight positions
  holdings.forEach(h => {
    if (h.allocation > 25) {
      recommendations.push({
        type: 'REDUCE',
        symbol: h.symbol,
        currentAllocation: h.allocation,
        targetAllocation: 15,
        action: `Reduce ${h.symbol} position to 15%`,
        reason: 'Single stock allocation exceeds 25% - high concentration risk',
        priority: 'HIGH',
      });
    }
  });

  // Check for major losers
  holdings.forEach(h => {
    if (h.pnlPercent < -30) {
      recommendations.push({
        type: 'EXIT',
        symbol: h.symbol,
        currentAllocation: h.allocation,
        targetAllocation: 0,
        action: `Review and consider exiting ${h.symbol}`,
        reason: `Position down ${h.pnlPercent.toFixed(1)}% - evaluate if thesis still holds`,
        priority: 'MEDIUM',
        taxImplication: h.pnlPercent < 0 ? {
          type: (Date.now() - new Date(h.purchaseDate).getTime() > 365 * 24 * 60 * 60 * 1000) ? 'LTCG' : 'STCG',
          estimatedTax: 0, // Would need actual calculation
        } : undefined,
      });
    }
  });

  // Check sector concentration
  sectorAllocation.forEach(s => {
    if (s.percentage > 40) {
      recommendations.push({
        type: 'REBALANCE',
        symbol: s.holdings.join(', '),
        currentAllocation: s.percentage,
        targetAllocation: 30,
        action: `Reduce ${s.sector} sector exposure`,
        reason: `${s.sector} sector at ${s.percentage.toFixed(1)}% - consider diversifying`,
        priority: 'MEDIUM',
      });
    }
  });

  return recommendations;
}

function generateWarnings(holdings: HoldingWithPrice[], sectorAllocation: SectorAllocation[]): string[] {
  const warnings: string[] = [];

  if (holdings.length < 5) {
    warnings.push('Portfolio has less than 5 holdings - consider adding more for diversification');
  }

  const maxAllocation = Math.max(...holdings.map(h => h.allocation));
  if (maxAllocation > 30) {
    const topHolding = holdings.find(h => h.allocation === maxAllocation);
    warnings.push(`${topHolding?.symbol} represents ${maxAllocation.toFixed(1)}% of portfolio - concentration risk`);
  }

  const deepLosers = holdings.filter(h => h.pnlPercent < -30);
  if (deepLosers.length > 0) {
    warnings.push(`${deepLosers.length} holding(s) down more than 30% - review positions`);
  }

  return warnings;
}
