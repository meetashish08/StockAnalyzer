const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const XLSX = require('xlsx');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const app = express();
const PORT = process.env.PORT || 3001;

// File upload setup
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist/renderer')));

// Simple JSON file storage
const dataPath = path.join(__dirname, 'data.json');

function loadData() {
  try {
    if (fs.existsSync(dataPath)) {
      const loaded = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      // Ensure all required fields exist
      return {
        holdings: loaded.holdings || [],
        transactions: loaded.transactions || [],
        importHistory: loaded.importHistory || [],
        nextHoldingId: loaded.nextHoldingId || 1,
        nextTxnId: loaded.nextTxnId || 1,
        nextImportId: loaded.nextImportId || 1,
      };
    }
  } catch {}
  return { holdings: [], transactions: [], importHistory: [], nextHoldingId: 1, nextTxnId: 1, nextImportId: 1 };
}

// Analytics cache
const analyticsCache = {
  allocation: { data: null, timestamp: 0 },
  health: { data: null, timestamp: 0 },
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function invalidateCache() {
  analyticsCache.allocation.timestamp = 0;
  analyticsCache.health.timestamp = 0;
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

let data = loadData();
console.log('Data loaded from:', dataPath);

// Yahoo Finance API helpers
const YAHOO_QUOTE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';
const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';

// Common symbol mappings for Indian stocks (Groww name -> Yahoo symbol)
const SYMBOL_MAP = {
  'STATEBANKOFINDIA': 'SBIN',
  'STEELAUTHORITYOFINDIA': 'SAIL',
  'OILANDNATURALGAS': 'ONGC',
  'RELIANCEINDUSTRIES': 'RELIANCE',
  'TATACONSULTANCYSERVLT': 'TCS',
  'HINDUSTANUNILEVER': 'HINDUNILVR',
  'BHARTIAIRTEL': 'BHARTIARTL',
  'INFOSYS': 'INFY',
  'ICICIBANK': 'ICICIBANK',
  'HDFCBANK': 'HDFCBANK',
  'LARSEN&TOUBRO': 'LT',
  'MAHINDRA&MAHINDRA': 'M&M',
  'TATAMOTORS': 'TMCV',
  'TATAMOTORSPASSVEH': 'TMPV',
  'TATASTEEL': 'TATASTEEL',
  'TATAPOWERCO': 'TATAPOWER',
  'SUNPHARMACEUTICALINDL': 'SUNPHARMA',
  'HINDALCOINDUSTRIES': 'HINDALCO',
  'COALINDIA': 'COALINDIA',
  'NTPC': 'NTPC',
  'PUNJABNATIONALBANK': 'PNB',
  'INDIANRAILWAYFINCORPL': 'IRFC',
  'RAILVIKASNIGAM': 'RVNL',
  'SUZLONENERGY': 'SUZLON',
  'GAIL(INDIA)': 'GAIL',
  'WIPRO': 'WIPRO',
  'HINDUSTANAERONAUTICS': 'HAL',
  'HINDUSTANCOPPER': 'HINDCOPPER',
  'MAZAGONDOCKSHIPBUIL': 'MAZDOCK',
  'OLECTRAGREENTECH': 'OLECTRA',
  'OLAELECTRICMOBILITY': 'OLAELEC',
  'JIOFINSERVICES': 'JIOFIN',
  'KALYANJEWELLERSIND': 'KALYANKJIL',
  'DATAPATTERNSINDIA': 'DATAPATTNS',
  'VEDANTA': 'VEDL',
  'BHARATELECTRONICS': 'BEL',
  'SJVN': 'SJVN',
  'GENUSPOWERINFRASTRU': 'GENUSPOWER',
  'TITAGARHRAILSYSTEMS': 'TITAGARH',
  'DLF': 'DLF',
  'BSE': 'BSE',
  'ITC': 'ITC',
  'ADANIENERGYSOLUTION': 'ADANIENSOL',
  'ADANIPOWER': 'ADANIPOWER',
  'ETERNAL': 'ETERNAL',
  // REITs
  'BROOKFIELDINDIARET': 'BIRET',
  'EMBASSYOFFICEPARKSREIT': 'EMBASSY',
  'MINDSPACEBUSINESSPREIT': 'MINDSPACE',
  // ETFs
  'NIPINDETFGOLDBEES': 'GOLDBEES',
  'NIPINDETFNIFTYBEES': 'NIFTYBEES',
  'NIPINDETFPSUBANKBEES': 'PSUBNKBEES',
  'NIPINDETFIT': 'ITBEES',
  'NIPINDETFMIDCAP150': 'MID150BEES',
  'SBI-ETFGOLD': 'SETFGOLD',
  'SBI-ETFNIFTY50': 'SETFNIF50',
  'MIRAEAMC-ITETF': 'MAFANG',
  'HDFCAMC-HDFCSML250': 'HDFCSML250',
  // Finance
  'L&TFINANCE': 'LTF',
  // Hotels & Leisure
  'MAHINDRAHOLIDAYS': 'MHRIL',
  // Sugar
  'KCPSUGARINDCORP': 'KCPSUGIND',
  // Renewable Energy
  'STRLNG&WILRENENE': 'SWSOLAR',
  // Banks
  'UTKARSHSMALLFINBANKL': 'UTKARSHBNK',
  'BANDHANBANK': 'BANDHANBNK',
  // Exchange
  'INDIANENERGYEXCHANGE': 'IEX',
  // Retail
  'VMARTRETAIL': 'VMART',
  // Travel
  'YATRAONLINE': 'YATRA',
  // Finance
  'SHRIRAMFINANCE': 'SHRIRAMFIN',
  // Defence
  'PARASDEFENCEANDSPACETECHNOLOGIES': 'PARAS',
  // ETFs
  'QUANTUMGOLDFUNDETF': 'QGOLDHALF',
  'NIPPONINDIAETFNIFTY50BEES': 'NIFTYBEES',
  'BHARAT22ETF': 'ICICIB22',
  'ICICIPRUDENTIALSILVERETF': 'SILVERBEES',
  // Auto
  'TATAMOTORSPASSENGERVEHICLES': 'TMPV',
  // Vedanta subsidiaries
  'VEDANTAIRONANDSTEELL': 'VISL',
  'VEDANTAOILANDGAS': 'VOGL',
  'VEDANTAPOWER': 'VEDPOWER',
};

function getYahooSymbol(symbol, market) {
  // Check if we have a mapped symbol
  const mappedSymbol = SYMBOL_MAP[symbol.toUpperCase()] || symbol;

  switch (market) {
    case 'NSE': return `${mappedSymbol}.NS`;
    case 'BSE': return `${mappedSymbol}.BO`;
    default: return mappedSymbol;
  }
}

// API Routes

// Get all holdings
app.get('/api/holdings', (req, res) => {
  res.json(data.holdings);
});

// Add holding
app.post('/api/holdings', (req, res) => {
  const { symbol, market, name, quantity, avgPrice, currentPrice, purchaseDate, type, sector, isin, importId } = req.body;
  const holding = {
    id: data.nextHoldingId++,
    symbol: symbol.toUpperCase(),
    market,
    name,
    isin,
    quantity,
    avgPrice,
    currentPrice: currentPrice || 0,
    purchaseDate,
    type: type || 'STOCK',
    sector,
    importId: importId || null,
    createdAt: new Date().toISOString(),
  };
  data.holdings.push(holding);
  saveData(data);
  invalidateCache();
  res.json(holding);
});

// Update holding
app.put('/api/holdings/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = data.holdings.findIndex(h => h.id === id);
  if (idx >= 0) {
    data.holdings[idx] = { ...data.holdings[idx], ...req.body };
    saveData(data);
    invalidateCache();
    res.json(data.holdings[idx]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Delete holding
app.delete('/api/holdings/:id', (req, res) => {
  const id = parseInt(req.params.id);
  data.holdings = data.holdings.filter(h => h.id !== id);
  data.transactions = data.transactions.filter(t => t.holdingId !== id);
  saveData(data);
  invalidateCache();
  res.json({ success: true });
});

// Get transactions
app.get('/api/transactions', (req, res) => {
  const { holdingId } = req.query;
  if (holdingId) {
    res.json(data.transactions.filter(t => t.holdingId === parseInt(holdingId)));
  } else {
    res.json(data.transactions);
  }
});

// Add transaction
app.post('/api/transactions', (req, res) => {
  const { holdingId, type, quantity, price, date, fees, source, notes, skipHoldingUpdate } = req.body;
  const transaction = {
    id: data.nextTxnId++,
    holdingId,
    type,
    quantity,
    price,
    date,
    fees: fees || 0,
    source: source || 'MANUAL',
    notes,
    createdAt: new Date().toISOString(),
  };
  data.transactions.push(transaction);

  // Update holding quantity and avg price (skip for imports - holding already has correct values)
  if (!skipHoldingUpdate) {
    const holding = data.holdings.find(h => h.id === holdingId);
    if (holding) {
      if (type === 'BUY' || type === 'SIP') {
        const totalCost = holding.avgPrice * holding.quantity + price * quantity;
        holding.quantity += quantity;
        holding.avgPrice = holding.quantity > 0 ? totalCost / holding.quantity : 0;
      } else if (type === 'SELL') {
        holding.quantity -= quantity;
      }
    }
  }

  saveData(data);
  invalidateCache();
  res.json(transaction);
});

// Get stock quote
app.get('/api/quote/:symbol/:market', async (req, res) => {
  try {
    const { symbol, market } = req.params;
    const yahooSymbol = getYahooSymbol(symbol, market);

    const response = await axios.get(YAHOO_QUOTE_URL, {
      params: { symbols: yahooSymbol },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    });

    const quote = response.data?.quoteResponse?.result?.[0];
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json({
      symbol: symbol.toUpperCase(),
      name: quote.longName || quote.shortName || symbol,
      market,
      price: quote.regularMarketPrice || 0,
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
    });
  } catch (error) {
    console.error('Quote error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Search stocks
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    const response = await axios.get(YAHOO_SEARCH_URL, {
      params: { q, quotesCount: 10, newsCount: 0 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    });

    const quotes = response.data?.quotes || [];
    res.json(quotes
      .filter(q => q.quoteType === 'EQUITY')
      .slice(0, 10)
      .map(q => ({
        symbol: q.symbol?.replace('.NS', '').replace('.BO', '') || '',
        name: q.longname || q.shortname || q.symbol || '',
        exchange: q.exchange || '',
        type: q.quoteType || 'EQUITY',
      })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get portfolio summary
app.get('/api/portfolio/summary', async (req, res) => {
  try {
    if (data.holdings.length === 0) {
      return res.json({
        totalInvested: 0,
        currentValue: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        holdingsCount: 0,
      });
    }

    let totalInvested = 0;
    let currentValue = 0;
    let dayChange = 0;

    for (const holding of data.holdings) {
      const invested = holding.avgPrice * holding.quantity;
      totalInvested += invested;

      // Use stored currentPrice if available
      if (holding.currentPrice && holding.currentPrice > 0) {
        currentValue += holding.currentPrice * holding.quantity;
        // No day change data from import
      } else {
        // Fallback to Yahoo API
        try {
          const yahooSymbol = getYahooSymbol(holding.symbol, holding.market);
          const response = await axios.get(YAHOO_QUOTE_URL, {
            params: { symbols: yahooSymbol },
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000,
          });
          const quote = response.data?.quoteResponse?.result?.[0];
          if (quote) {
            currentValue += quote.regularMarketPrice * holding.quantity;
            dayChange += (quote.regularMarketChange || 0) * holding.quantity;
          } else {
            currentValue += invested;
          }
        } catch {
          currentValue += invested;
        }
      }
    }

    const totalPnL = currentValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    const dayChangePercent = currentValue > 0 ? (dayChange / currentValue) * 100 : 0;

    res.json({
      totalInvested,
      currentValue,
      totalPnL,
      totalPnLPercent,
      dayChange,
      dayChangePercent,
      holdingsCount: data.holdings.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get portfolio allocation (with cache)
app.get('/api/portfolio/allocation', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';

  // Check cache
  if (!forceRefresh && analyticsCache.allocation.data &&
      Date.now() - analyticsCache.allocation.timestamp < CACHE_TTL) {
    return res.json(analyticsCache.allocation.data);
  }

  if (data.holdings.length === 0) {
    return res.json({ byType: [], byMarket: [], bySector: [], byHolding: [], totalValue: 0 });
  }

  let totalValue = 0;
  const holdingsWithValues = [];

  for (const holding of data.holdings) {
    // Use stored currentPrice if available, otherwise use avgPrice
    let currentPrice = holding.currentPrice || holding.avgPrice;

    // Only fetch from Yahoo if no currentPrice stored
    if (!holding.currentPrice) {
      try {
        const yahooSymbol = getYahooSymbol(holding.symbol, holding.market);
        const response = await axios.get(YAHOO_QUOTE_URL, {
          params: { symbols: yahooSymbol },
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 5000,
        });
        const quote = response.data?.quoteResponse?.result?.[0];
        if (quote) currentPrice = quote.regularMarketPrice;
      } catch {}
    }

    const value = currentPrice * holding.quantity;
    totalValue += value;
    holdingsWithValues.push({ ...holding, currentValue: value });
  }

  // Group by type
  const typeMap = {};
  holdingsWithValues.forEach(h => {
    const t = h.type || 'STOCK';
    typeMap[t] = (typeMap[t] || 0) + h.currentValue;
  });
  const byType = Object.entries(typeMap).map(([name, value]) => ({
    name, value, percentage: (value / totalValue) * 100
  }));

  // Group by market
  const marketMap = {};
  holdingsWithValues.forEach(h => {
    marketMap[h.market] = (marketMap[h.market] || 0) + h.currentValue;
  });
  const byMarket = Object.entries(marketMap).map(([name, value]) => ({
    name, value, percentage: (value / totalValue) * 100
  }));

  // Group by sector
  const sectorMap = {};
  holdingsWithValues.forEach(h => {
    const s = h.sector || 'Unknown';
    sectorMap[s] = (sectorMap[s] || 0) + h.currentValue;
  });
  const bySector = Object.entries(sectorMap).map(([name, value]) => ({
    name, value, percentage: (value / totalValue) * 100
  }));

  // By holding
  const byHolding = holdingsWithValues.map(h => ({
    name: h.symbol,
    value: h.currentValue,
    percentage: (h.currentValue / totalValue) * 100
  })).sort((a, b) => b.value - a.value);

  const result = { byType, byMarket, bySector, byHolding, totalValue, cachedAt: new Date().toISOString() };

  // Store in cache
  analyticsCache.allocation.data = result;
  analyticsCache.allocation.timestamp = Date.now();

  res.json(result);
});

// Portfolio health - comprehensive analysis (with cache)
app.get('/api/portfolio/health', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';

    // Check cache
    if (!forceRefresh && analyticsCache.health.data &&
        Date.now() - analyticsCache.health.timestamp < CACHE_TTL) {
      return res.json(analyticsCache.health.data);
    }

    if (data.holdings.length === 0) {
      return res.json({
        overallScore: 0,
        diversificationScore: 0,
        riskScore: 0,
        recommendations: [{ action: 'Add holdings to your portfolio', reason: 'Your portfolio is empty', priority: 'HIGH', type: 'SETUP' }],
        warnings: ['No holdings in portfolio'],
        metrics: {},
      });
    }

    // Fetch current prices for all holdings
    const holdingsWithPrices = [];
    let totalValue = 0;
    let totalInvested = 0;

    for (const holding of data.holdings) {
      // Use stored currentPrice if available
      let currentPrice = holding.currentPrice || holding.avgPrice;

      // Only fetch from Yahoo if no currentPrice stored
      if (!holding.currentPrice) {
        try {
          const yahooSymbol = getYahooSymbol(holding.symbol, holding.market);
          const response = await axios.get(YAHOO_QUOTE_URL, {
            params: { symbols: yahooSymbol },
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000,
          });
          const quote = response.data?.quoteResponse?.result?.[0];
          if (quote) currentPrice = quote.regularMarketPrice;
        } catch {}
      }

      const invested = holding.avgPrice * holding.quantity;
      const currentValue = currentPrice * holding.quantity;
      const pnl = currentValue - invested;
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

      totalInvested += invested;
      totalValue += currentValue;

      holdingsWithPrices.push({
        ...holding,
        currentPrice,
        invested,
        currentValue,
        pnl,
        pnlPercent,
        weight: 0, // will calculate after total
      });
    }

    // Calculate weights
    holdingsWithPrices.forEach(h => {
      h.weight = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
    });

    // === DIVERSIFICATION SCORE ===
    // Based on: number of holdings, concentration, sector spread
    const numHoldings = holdingsWithPrices.length;
    const maxWeight = Math.max(...holdingsWithPrices.map(h => h.weight));
    const top5Weight = holdingsWithPrices
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .reduce((sum, h) => sum + h.weight, 0);

    // Herfindahl-Hirschman Index (HHI) for concentration
    const hhi = holdingsWithPrices.reduce((sum, h) => sum + Math.pow(h.weight, 2), 0);
    const normalizedHHI = Math.min(hhi / 10000, 1); // Normalize to 0-1

    let diversificationScore = 100;
    // Penalize for too few holdings
    if (numHoldings < 5) diversificationScore -= 30;
    else if (numHoldings < 10) diversificationScore -= 15;
    else if (numHoldings < 15) diversificationScore -= 5;
    // Penalize for high concentration
    if (maxWeight > 25) diversificationScore -= 20;
    else if (maxWeight > 15) diversificationScore -= 10;
    // Penalize for top 5 concentration
    if (top5Weight > 70) diversificationScore -= 15;
    else if (top5Weight > 50) diversificationScore -= 5;
    // HHI penalty
    diversificationScore -= normalizedHHI * 20;

    diversificationScore = Math.max(0, Math.min(100, diversificationScore));

    // === RISK SCORE ===
    // Based on: losers ratio, volatility proxy, large losses
    const losers = holdingsWithPrices.filter(h => h.pnlPercent < 0);
    const bigLosers = holdingsWithPrices.filter(h => h.pnlPercent < -20);
    const loserRatio = numHoldings > 0 ? losers.length / numHoldings : 0;
    const avgLoss = losers.length > 0
      ? losers.reduce((sum, h) => sum + h.pnlPercent, 0) / losers.length
      : 0;

    let riskScore = 100;
    // Penalize for high loser ratio
    if (loserRatio > 0.5) riskScore -= 25;
    else if (loserRatio > 0.3) riskScore -= 15;
    // Penalize for big losers
    riskScore -= bigLosers.length * 5;
    // Penalize for deep average losses
    if (avgLoss < -30) riskScore -= 20;
    else if (avgLoss < -15) riskScore -= 10;

    riskScore = Math.max(0, Math.min(100, riskScore));

    // === OVERALL SCORE ===
    const totalPnlPercent = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;
    let performanceBonus = 0;
    if (totalPnlPercent > 20) performanceBonus = 15;
    else if (totalPnlPercent > 10) performanceBonus = 10;
    else if (totalPnlPercent > 0) performanceBonus = 5;
    else if (totalPnlPercent < -10) performanceBonus = -10;

    const overallScore = Math.max(0, Math.min(100,
      (diversificationScore * 0.4 + riskScore * 0.4 + 50 + performanceBonus) * 0.5 + 25
    ));

    // === WARNINGS ===
    const warnings = [];
    if (numHoldings < 5) warnings.push('Portfolio has less than 5 holdings - consider diversifying');
    if (numHoldings < 10) warnings.push('Portfolio could benefit from more diversification (10+ holdings recommended)');
    if (maxWeight > 25) warnings.push(`Highest concentration is ${maxWeight.toFixed(1)}% - consider rebalancing`);
    if (top5Weight > 70) warnings.push(`Top 5 holdings make up ${top5Weight.toFixed(1)}% of portfolio`);
    if (bigLosers.length > 0) warnings.push(`${bigLosers.length} holding(s) have lost more than 20%`);
    if (loserRatio > 0.5) warnings.push(`More than half of your holdings are in loss`);

    // === RECOMMENDATIONS ===
    const recommendations = [];

    // Overweight positions
    holdingsWithPrices
      .filter(h => h.weight > 15)
      .forEach(h => {
        recommendations.push({
          action: `Consider reducing ${h.symbol} position`,
          reason: `${h.symbol} represents ${h.weight.toFixed(1)}% of your portfolio`,
          priority: h.weight > 25 ? 'HIGH' : 'MEDIUM',
          type: 'REBALANCE',
          symbol: h.symbol,
        });
      });

    // Big losers - potential tax harvesting
    holdingsWithPrices
      .filter(h => h.pnlPercent < -15 && h.pnl < -1000)
      .forEach(h => {
        recommendations.push({
          action: `Review ${h.symbol} - significant loss`,
          reason: `Down ${Math.abs(h.pnlPercent).toFixed(1)}% (₹${Math.abs(h.pnl).toLocaleString()} loss). Consider tax-loss harvesting or averaging down`,
          priority: h.pnlPercent < -30 ? 'HIGH' : 'MEDIUM',
          type: 'REVIEW',
          symbol: h.symbol,
          taxImplication: { type: 'Potential Tax Harvesting', amount: Math.abs(h.pnl) },
        });
      });

    // Big winners - consider booking profits
    holdingsWithPrices
      .filter(h => h.pnlPercent > 50 && h.weight > 10)
      .forEach(h => {
        recommendations.push({
          action: `Consider booking partial profits in ${h.symbol}`,
          reason: `Up ${h.pnlPercent.toFixed(1)}% with ${h.weight.toFixed(1)}% portfolio weight`,
          priority: 'LOW',
          type: 'PROFIT_BOOKING',
          symbol: h.symbol,
        });
      });

    // Sector concentration check
    const sectorMap = {};
    holdingsWithPrices.forEach(h => {
      const sector = h.sector || 'Unknown';
      sectorMap[sector] = (sectorMap[sector] || 0) + h.weight;
    });
    Object.entries(sectorMap).forEach(([sector, weight]) => {
      if (weight > 40 && sector !== 'Unknown') {
        recommendations.push({
          action: `Reduce ${sector} sector exposure`,
          reason: `${sector} represents ${weight.toFixed(1)}% of portfolio - too concentrated`,
          priority: 'MEDIUM',
          type: 'DIVERSIFY',
        });
      }
    });

    // === METRICS ===
    const metrics = {
      totalValue,
      totalInvested,
      totalPnL: totalValue - totalInvested,
      totalPnLPercent: totalPnlPercent,
      numHoldings,
      numWinners: holdingsWithPrices.filter(h => h.pnlPercent > 0).length,
      numLosers: losers.length,
      maxWeight,
      top5Weight,
      hhi: hhi.toFixed(2),
      avgHoldingSize: totalValue / numHoldings,
      biggestWinner: holdingsWithPrices.reduce((max, h) => h.pnlPercent > max.pnlPercent ? h : max, { pnlPercent: -Infinity }),
      biggestLoser: holdingsWithPrices.reduce((min, h) => h.pnlPercent < min.pnlPercent ? h : min, { pnlPercent: Infinity }),
    };

    const result = {
      overallScore: Math.round(overallScore),
      diversificationScore: Math.round(diversificationScore),
      riskScore: Math.round(riskScore),
      recommendations: recommendations.slice(0, 10),
      warnings,
      metrics,
      holdings: holdingsWithPrices.map(h => ({
        symbol: h.symbol,
        name: h.name,
        weight: h.weight,
        pnlPercent: h.pnlPercent,
        pnl: h.pnl,
        currentValue: h.currentValue,
      })),
      cachedAt: new Date().toISOString(),
    };

    // Store in cache
    analyticsCache.health.data = result;
    analyticsCache.health.timestamp = Date.now();

    res.json(result);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Top picks (placeholder)
app.get('/api/top-picks/:market', (req, res) => {
  res.json([]);
});

// === IMPORT HISTORY APIs ===

// Get import history
app.get('/api/import-history', (req, res) => {
  res.json(data.importHistory || []);
});

// Add import history record
app.post('/api/import-history', (req, res) => {
  const record = {
    ...req.body,
    id: data.nextImportId++,
  };
  if (!data.importHistory) data.importHistory = [];
  data.importHistory.push(record);
  saveData(data);
  res.json(record);
});

// Delete import (and associated holdings)
app.delete('/api/import-history/:id', (req, res) => {
  const importId = parseInt(req.params.id);
  const importRecord = data.importHistory.find(i => i.id === importId);

  if (!importRecord) {
    return res.status(404).json({ error: 'Import not found' });
  }

  // Delete all holdings from this import
  const holdingIdsToDelete = data.holdings
    .filter(h => h.importId === importId)
    .map(h => h.id);

  data.holdings = data.holdings.filter(h => h.importId !== importId);
  data.transactions = data.transactions.filter(t => !holdingIdsToDelete.includes(t.holdingId));
  data.importHistory = data.importHistory.filter(i => i.id !== importId);

  saveData(data);
  invalidateCache();

  res.json({ success: true, deletedHoldings: holdingIdsToDelete.length });
});

// Check for existing import from same source
app.get('/api/import-history/check', (req, res) => {
  const { source, filename } = req.query;
  const existing = data.importHistory.find(i =>
    i.source === source || (filename && i.filename?.toLowerCase() === filename.toLowerCase())
  );
  res.json({ exists: !!existing, import: existing || null });
});

// Clear all data
app.delete('/api/clear-all', (req, res) => {
  data.holdings = [];
  data.transactions = [];
  data.importHistory = [];
  data.nextHoldingId = 1;
  data.nextTxnId = 1;
  data.nextImportId = 1;
  saveData(data);
  invalidateCache();
  res.json({ success: true });
});

// Refresh all stock prices using yahoo-finance2 library
app.post('/api/refresh-prices', async (req, res) => {
  if (data.holdings.length === 0) {
    return res.json({ success: true, updated: 0, message: 'No holdings to update' });
  }

  let updated = 0;
  let failed = 0;
  const errors = [];

  for (const holding of data.holdings) {
    const mapped = SYMBOL_MAP[holding.symbol.toUpperCase()] || holding.symbol;

    // Try NSE first, then BSE
    const symbolsToTry = [`${mapped}.NS`, `${mapped}.BO`, mapped];

    let success = false;
    for (const sym of symbolsToTry) {
      try {
        const quote = await yahooFinance.quote(sym);
        if (quote && quote.regularMarketPrice) {
          holding.currentPrice = quote.regularMarketPrice;
          holding.lastPriceUpdate = new Date().toISOString();
          updated++;
          success = true;
          break;
        }
      } catch (err) {
        // Try next symbol variant
      }
    }

    if (!success) {
      failed++;
      errors.push({ symbol: holding.symbol, mapped, error: 'Quote not found' });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  saveData(data);
  invalidateCache();

  res.json({
    success: true,
    updated,
    failed,
    total: data.holdings.length,
    errors: errors.slice(0, 10),
    message: `Updated ${updated} of ${data.holdings.length} holdings`,
  });
});

// File import endpoint
app.post('/api/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname.toLowerCase();
    let transactions = [];

    if (originalName.endsWith('.csv')) {
      // Parse CSV
      const content = fs.readFileSync(filePath, 'utf-8');
      transactions = parseCSV(content);
    } else if (originalName.endsWith('.xlsx') || originalName.endsWith('.xls')) {
      // Parse Excel
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      transactions = parseExcelData(jsonData, workbook);
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json(transactions);
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  const transactions = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;

    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || '';
    });

    const tx = parseTransactionRow(row);
    if (tx) transactions.push(tx);
  }

  return transactions;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseExcelData(data, workbook) {
  const transactions = [];

  // Try to detect Groww format by checking for header row pattern
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });

  // Find the header row (look for "Stock Name" or similar)
  let headerRowIndex = -1;
  let headers = [];

  for (let i = 0; i < Math.min(rawData.length, 20); i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row)) continue;

    const rowStr = row.map(c => String(c).toLowerCase()).join('|');

    // Groww format: "Stock Name", "ISIN", "Quantity", etc.
    if (rowStr.includes('stock name') || rowStr.includes('isin')) {
      headerRowIndex = i;
      headers = row.map(h => String(h).toLowerCase().trim());
      break;
    }

    // Generic format: look for symbol, quantity, price columns
    if ((rowStr.includes('symbol') || rowStr.includes('scrip')) &&
        (rowStr.includes('quantity') || rowStr.includes('qty'))) {
      headerRowIndex = i;
      headers = row.map(h => String(h).toLowerCase().trim());
      break;
    }
  }

  // If we found headers, parse the data rows
  if (headerRowIndex >= 0 && headers.length > 0) {
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      const normalizedRow = {};
      headers.forEach((header, idx) => {
        if (header && idx < row.length) {
          normalizedRow[header] = row[idx];
        }
      });

      const tx = parseTransactionRow(normalizedRow);
      if (tx) transactions.push(tx);
    }
  } else {
    // Fallback: original parsing with first row as headers
    for (const row of data) {
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        normalizedRow[key.toLowerCase().trim()] = String(row[key]).trim();
      });

      const tx = parseTransactionRow(normalizedRow);
      if (tx) transactions.push(tx);
    }
  }

  return transactions;
}

function parseTransactionRow(row) {
  // Try to find symbol - support Groww format "stock name"
  const symbol = row['symbol'] || row['stock'] || row['scrip'] || row['ticker'] ||
                 row['stock name'] || row['name'] || row['fund name'] || row['fund_name'];
  if (!symbol || symbol === 'null' || symbol === '') return null;

  // Try to find quantity
  const quantityStr = row['quantity'] || row['qty'] || row['units'] || row['shares'] || '1';
  const quantity = parseFloat(quantityStr) || 0;
  if (quantity <= 0) return null;

  // Try to find average buy price - Groww format "average buy price"
  const avgPriceStr = row['average buy price'] || row['avg_price'] || row['average_price'] ||
                      row['buy price'] || row['price'] || row['rate'] || row['nav'] || '0';
  const avgPrice = parseFloat(String(avgPriceStr).replace(/[₹,]/g, '')) || 0;
  if (avgPrice <= 0) return null;

  // Try to find buy value (invested amount)
  const buyValueStr = row['buy value'] || row['invested'] || row['invested value'] ||
                      row['investment'] || row['cost'] || '0';
  const buyValue = parseFloat(String(buyValueStr).replace(/[₹,]/g, '')) || (avgPrice * quantity);

  // Try to find closing/current price - Groww format "closing price"
  const closingPriceStr = row['closing price'] || row['current price'] || row['ltp'] ||
                          row['last price'] || row['market price'] || '0';
  const closingPrice = parseFloat(String(closingPriceStr).replace(/[₹,]/g, '')) || 0;

  // Try to find closing value (current value) - Groww format "closing value"
  const closingValueStr = row['closing value'] || row['current value'] || row['market value'] || '0';
  const closingValue = parseFloat(String(closingValueStr).replace(/[₹,]/g, '')) || (closingPrice * quantity);

  // Try to find unrealised P&L - Groww format "unrealised p&l"
  const pnlStr = row['unrealised p&l'] || row['unrealized p&l'] || row['p&l'] ||
                 row['profit/loss'] || row['gain/loss'] || row['pnl'] || '0';
  const unrealisedPnL = parseFloat(String(pnlStr).replace(/[₹,]/g, '')) || (closingValue - buyValue);

  // Calculate P&L percent
  const pnlPercent = buyValue > 0 ? (unrealisedPnL / buyValue) * 100 : 0;

  // Try to find ISIN
  const isin = row['isin'] || row['isin code'] || '';

  // Try to find date
  const dateStr = row['date'] || row['trade_date'] || row['transaction_date'] || row['purchase_date'];
  const date = parseDateString(dateStr) || new Date().toISOString().split('T')[0];

  // Try to find type
  const typeStr = String(row['type'] || row['transaction_type'] || row['action'] || 'BUY').toUpperCase();
  let type = 'BUY';
  if (typeStr.includes('SELL')) type = 'SELL';
  else if (typeStr.includes('DIV')) type = 'DIVIDEND';
  else if (typeStr.includes('SIP')) type = 'SIP';

  // Extract clean symbol from stock name (remove "LTD", "LIMITED", etc.)
  let cleanSymbol = String(symbol).toUpperCase()
    .replace(/\s+(LTD|LIMITED|CORP|CORPORATION|INC|PVT)\.?$/gi, '')
    .replace(/\s+/g, '')
    .trim();

  // Keep full name for display
  const fullName = row['stock name'] || row['name'] || row['company'] ||
                   row['fund name'] || row['fund_name'] || symbol;

  return {
    symbol: cleanSymbol,
    name: String(fullName).trim(),
    isin: String(isin).trim(),
    type,
    quantity,
    price: avgPrice,           // Average buy price
    buyValue,                  // Total invested amount
    closingPrice,              // Current/closing price
    closingValue,              // Current market value
    unrealisedPnL,             // P&L amount
    pnlPercent,                // P&L percentage
    date,
    fees: parseFloat(row['fees'] || row['charges'] || row['brokerage'] || '0') || 0,
    source: 'Groww',
  };
}

function parseDateString(dateStr) {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {}

  // Excel serial date
  const serialDate = parseFloat(dateStr);
  if (!isNaN(serialDate) && serialDate > 30000 && serialDate < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + serialDate * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }

  return null;
}

// Email parsing endpoint
app.post('/api/parse-email', (req, res) => {
  const { emailText, broker } = req.body;
  const transactions = parseEmailText(emailText, broker);
  res.json(transactions);
});

function parseEmailText(emailText, broker) {
  const transactions = [];
  const lines = emailText.split('\n');

  // Zerodha pattern
  const zerodhaPattern = /([A-Z]+)\s*[|\t]\s*(\d+)\s*[|\t]\s*([\d,.]+)\s*[|\t]\s*(BUY|SELL)/gi;
  let match;
  while ((match = zerodhaPattern.exec(emailText)) !== null) {
    transactions.push({
      symbol: match[1].toUpperCase(),
      type: match[4].toUpperCase(),
      quantity: parseFloat(match[2]),
      price: parseFloat(match[3].replace(/,/g, '')),
      date: new Date().toISOString().split('T')[0],
      source: 'Zerodha',
    });
  }

  // Groww pattern
  const growwPattern = /order to (buy|sell)\s+(\d+)\s+units?\s+of\s+([^at]+)\s+at\s+(?:NAV\s+)?[₹Rs.]?\s*([\d,.]+)/gi;
  while ((match = growwPattern.exec(emailText)) !== null) {
    transactions.push({
      symbol: match[3].trim().toUpperCase().replace(/\s+/g, ''),
      name: match[3].trim(),
      type: match[1].toLowerCase() === 'buy' ? 'BUY' : 'SELL',
      quantity: parseFloat(match[2]),
      price: parseFloat(match[4].replace(/,/g, '')),
      date: new Date().toISOString().split('T')[0],
      source: 'Groww',
    });
  }

  // Generic stock purchase pattern
  const genericPattern = /(Bought|Purchased|Buy)\s+(\d+)\s+shares?\s+of\s+([A-Z]+)\s+at\s+[₹Rs.]?\s*([\d,.]+)/gi;
  while ((match = genericPattern.exec(emailText)) !== null) {
    transactions.push({
      symbol: match[3].toUpperCase(),
      type: 'BUY',
      quantity: parseFloat(match[2]),
      price: parseFloat(match[4].replace(/,/g, '')),
      date: new Date().toISOString().split('T')[0],
      source: 'Email',
    });
  }

  return transactions;
}

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/renderer/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Stock Analyzer running at: http://localhost:${PORT}\n`);
});
