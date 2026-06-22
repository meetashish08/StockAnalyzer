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
const bookmarksPath = path.join(__dirname, 'ai_bookmarks.json');

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

function loadBookmarks() {
  try {
    if (fs.existsSync(bookmarksPath)) {
      const loaded = JSON.parse(fs.readFileSync(bookmarksPath, 'utf-8'));
      return {
        bookmarks: loaded.bookmarks || [],
        nextBookmarkId: loaded.nextBookmarkId || 1,
      };
    }
  } catch {}
  return { bookmarks: [], nextBookmarkId: 1 };
}

function saveBookmarks(bookmarkData) {
  fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarkData, null, 2));
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
  'MIRAEAMC-ITETF': 'ITETF',
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

// REITs that need BSE exchange for accurate prices (NSE data is often stale)
const USE_BSE_EXCHANGE = [
  'EMBASSY',
  'BIRET',
  'MINDSPACE',
];

function getYahooSymbol(symbol, market) {
  // Check if we have a mapped symbol
  const mappedSymbol = SYMBOL_MAP[symbol.toUpperCase()] || symbol;

  // Force BSE for REITs (more accurate pricing)
  if (USE_BSE_EXCHANGE.includes(mappedSymbol.toUpperCase())) {
    return `${mappedSymbol}.BO`;
  }

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
    importedPrice: currentPrice || 0,      // Value as of Excel load date (preserved)
    currentPrice: currentPrice || 0,        // Today's live value (updated by refresh)
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

      // Use stored currentPrice and dayChange if available
      if (holding.currentPrice && holding.currentPrice > 0) {
        currentValue += holding.currentPrice * holding.quantity;
        // Use stored day change data if available (from refresh-prices)
        if (holding.dayChange !== undefined) {
          dayChange += holding.dayChange * holding.quantity;
        }
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

// Top picks - Portfolio-based recommendations
app.get('/api/top-picks/:market', async (req, res) => {
  try {
    const { market } = req.params;
    const marketHoldings = data.holdings.filter(h => {
      if (market === 'NSE') return h.market === 'NSE' || h.market === 'BSE';
      if (market === 'NYSE') return h.market === 'NYSE' || h.market === 'NASDAQ';
      return true;
    });

    if (marketHoldings.length === 0) {
      return res.json([]);
    }

    const recommendations = [];

    for (const holding of marketHoldings) {
      const mapped = SYMBOL_MAP[holding.symbol.toUpperCase()] || holding.symbol;
      let symbolsToTry;
      if (USE_BSE_EXCHANGE.includes(mapped.toUpperCase())) {
        symbolsToTry = [`${mapped}.BO`, `${mapped}.NS`];
      } else if (holding.market === 'NSE' || holding.market === 'BSE') {
        symbolsToTry = [`${mapped}.NS`, `${mapped}.BO`];
      } else {
        symbolsToTry = [mapped];
      }

      let quote = null;
      for (const sym of symbolsToTry) {
        try {
          quote = await yahooFinance.quote(sym);
          if (quote && quote.regularMarketPrice) break;
        } catch {}
      }

      if (!quote) continue;

      // Calculate technical indicators
      const price = quote.regularMarketPrice || 0;
      const high52 = quote.fiftyTwoWeekHigh || price;
      const low52 = quote.fiftyTwoWeekLow || price;
      const ma50 = quote.fiftyDayAverage || price;
      const ma200 = quote.twoHundredDayAverage || price;
      const prevClose = quote.regularMarketPreviousClose || price;
      const dayChange = quote.regularMarketChangePercent || 0;

      // Technical Score Components
      const priceVsMa50 = ma50 > 0 ? ((price - ma50) / ma50) * 100 : 0;
      const priceVsMa200 = ma200 > 0 ? ((price - ma200) / ma200) * 100 : 0;
      const distFrom52High = high52 > 0 ? ((price - high52) / high52) * 100 : 0;
      const distFrom52Low = low52 > 0 ? ((price - low52) / low52) * 100 : 0;

      // Trend Score (0-100)
      let trendScore = 50;
      if (price > ma200) trendScore += 20;
      if (price > ma50) trendScore += 15;
      if (ma50 > ma200) trendScore += 15; // Golden cross
      if (price < ma200) trendScore -= 20;
      if (price < ma50) trendScore -= 15;
      if (ma50 < ma200) trendScore -= 15; // Death cross
      trendScore = Math.max(0, Math.min(100, trendScore));

      // Momentum Score (0-100)
      let momentumScore = 50;
      if (dayChange > 2) momentumScore += 20;
      else if (dayChange > 0) momentumScore += 10;
      else if (dayChange < -2) momentumScore -= 20;
      else if (dayChange < 0) momentumScore -= 10;

      // Near 52-week high = strong momentum
      if (distFrom52High > -5) momentumScore += 20;
      else if (distFrom52High > -15) momentumScore += 10;
      // Near 52-week low = weak momentum
      if (distFrom52Low < 10) momentumScore -= 15;
      momentumScore = Math.max(0, Math.min(100, momentumScore));

      // Value Score (based on P/E if available)
      let valueScore = 50;
      const pe = quote.trailingPE || quote.forwardPE;
      if (pe) {
        if (pe < 15) valueScore = 80;
        else if (pe < 25) valueScore = 65;
        else if (pe < 40) valueScore = 50;
        else valueScore = 30;
      }

      // Calculate P&L for this holding
      const invested = holding.avgPrice * holding.quantity;
      const currentValue = price * holding.quantity;
      const pnl = currentValue - invested;
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

      // Overall Score
      const overallScore = (trendScore * 0.35 + momentumScore * 0.35 + valueScore * 0.3);

      // Determine Signal
      let signal = 'HOLD';
      const rationale = [];

      if (overallScore >= 75 && pnlPercent > -10) {
        signal = 'STRONG_BUY';
        rationale.push('Strong technical setup with positive trend');
      } else if (overallScore >= 60) {
        signal = 'BUY';
        rationale.push('Good momentum and trend alignment');
      } else if (overallScore <= 30 || pnlPercent < -20) {
        signal = 'STRONG_SELL';
        rationale.push('Weak technicals - consider exiting');
      } else if (overallScore <= 45 || pnlPercent < -10) {
        signal = 'SELL';
        rationale.push('Deteriorating momentum');
      }

      // Add context to rationale
      if (price > ma50 && price > ma200) rationale.push('Trading above 50 & 200 DMA');
      else if (price < ma50 && price < ma200) rationale.push('Trading below key moving averages');

      if (distFrom52High > -5) rationale.push('Near 52-week high - strong momentum');
      if (distFrom52Low < 15) rationale.push('Near 52-week low - potential value or risk');

      if (pnlPercent > 50) rationale.push(`Strong gain: ${pnlPercent.toFixed(1)}% profit`);
      if (pnlPercent < -15) rationale.push(`Significant loss: ${pnlPercent.toFixed(1)}%`);

      // Calculate days held
      const purchaseDate = new Date(holding.purchaseDate);
      const today = new Date();
      const daysHeld = Math.floor((today - purchaseDate) / (1000 * 60 * 60 * 24));
      const taxStatus = daysHeld >= 365 ? 'LTCG' : 'STCG';

      recommendations.push({
        symbol: holding.symbol,
        name: holding.name || quote.shortName || holding.symbol,
        market: holding.market,
        quantity: holding.quantity,
        avgPrice: holding.avgPrice,
        currentPrice: price,
        pnl,
        pnlPercent,
        technicalScore: Math.round(trendScore),
        fundamentalScore: Math.round(valueScore),
        momentumScore: Math.round(momentumScore),
        valueScore: Math.round(valueScore),
        overallScore: Math.round(overallScore),
        signal,
        confidence: Math.min(95, Math.round(overallScore + 10)),
        rationale,
        high52Week: high52,
        low52Week: low52,
        ma50,
        ma200,
        daysHeld,
        taxStatus,
        lastUpdated: new Date().toISOString(),
      });

      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // Sort by overall score descending
    recommendations.sort((a, b) => b.overallScore - a.overallScore);

    res.json(recommendations);
  } catch (error) {
    console.error('Top picks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sector analysis for recommendations
app.get('/api/recommendations/sectors', (req, res) => {
  if (data.holdings.length === 0) {
    return res.json({ sectors: [], gaps: [], overweight: [], underweight: [] });
  }

  // Ideal sector allocation (simplified benchmark)
  const benchmarkAllocation = {
    'Financial Services': 25,
    'IT': 15,
    'Consumer Goods': 12,
    'Pharma': 10,
    'Auto': 8,
    'Energy': 8,
    'Infrastructure': 7,
    'Metals': 5,
    'Telecom': 4,
    'Real Estate': 3,
    'Others': 3,
  };

  // Calculate current allocation
  let totalValue = 0;
  const sectorValues = {};

  for (const h of data.holdings) {
    const value = (h.currentPrice || h.avgPrice) * h.quantity;
    totalValue += value;
    const sector = h.sector || 'Unknown';
    sectorValues[sector] = (sectorValues[sector] || 0) + value;
  }

  const sectors = Object.entries(sectorValues).map(([name, value]) => ({
    name,
    value,
    percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    benchmark: benchmarkAllocation[name] || 5,
  }));

  // Find gaps (sectors in benchmark but not in portfolio)
  const gaps = Object.entries(benchmarkAllocation)
    .filter(([sector]) => !sectorValues[sector])
    .map(([sector, target]) => ({ sector, targetAllocation: target }));

  // Find overweight (>1.5x benchmark)
  const overweight = sectors.filter(s => s.percentage > (s.benchmark * 1.5));

  // Find underweight (<0.5x benchmark)
  const underweight = sectors.filter(s => s.percentage < (s.benchmark * 0.5) && s.benchmark > 3);

  res.json({ sectors, gaps, overweight, underweight, totalValue });
});

// Portfolio alerts
app.get('/api/recommendations/alerts', async (req, res) => {
  try {
    const alerts = [];

    for (const holding of data.holdings) {
      const price = holding.currentPrice || holding.avgPrice;
      const high52 = holding.high52Week;
      const low52 = holding.low52Week;
      const invested = holding.avgPrice * holding.quantity;
      const currentValue = price * holding.quantity;
      const pnlPercent = invested > 0 ? ((currentValue - invested) / invested) * 100 : 0;
      const dayChangePercent = holding.dayChangePercent || 0;

      // Calculate allocation
      const totalValue = data.holdings.reduce((sum, h) => sum + (h.currentPrice || h.avgPrice) * h.quantity, 0);
      const allocation = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;

      // Days held
      const purchaseDate = new Date(holding.purchaseDate);
      const today = new Date();
      const daysHeld = Math.floor((today - purchaseDate) / (1000 * 60 * 60 * 24));

      // Alert: Large single-day move
      if (Math.abs(dayChangePercent) > 3) {
        alerts.push({
          type: dayChangePercent > 0 ? 'SURGE' : 'DROP',
          priority: Math.abs(dayChangePercent) > 5 ? 'HIGH' : 'MEDIUM',
          symbol: holding.symbol,
          message: `${dayChangePercent > 0 ? 'Up' : 'Down'} ${Math.abs(dayChangePercent).toFixed(1)}% today`,
          value: dayChangePercent,
        });
      }

      // Alert: Concentrated position
      if (allocation > 10) {
        alerts.push({
          type: 'CONCENTRATION',
          priority: allocation > 15 ? 'HIGH' : 'MEDIUM',
          symbol: holding.symbol,
          message: `High allocation: ${allocation.toFixed(1)}% of portfolio`,
          value: allocation,
        });
      }

      // Alert: Large loss
      if (pnlPercent < -20) {
        alerts.push({
          type: 'LOSS',
          priority: pnlPercent < -30 ? 'HIGH' : 'MEDIUM',
          symbol: holding.symbol,
          message: `Down ${Math.abs(pnlPercent).toFixed(1)}% from purchase`,
          value: pnlPercent,
        });
      }

      // Alert: Large gain (consider booking profits)
      if (pnlPercent > 50) {
        alerts.push({
          type: 'PROFIT',
          priority: 'LOW',
          symbol: holding.symbol,
          message: `Up ${pnlPercent.toFixed(1)}% - consider partial profit booking`,
          value: pnlPercent,
        });
      }

      // Alert: LTCG threshold approaching
      if (daysHeld >= 300 && daysHeld < 365 && pnlPercent > 0) {
        alerts.push({
          type: 'TAX',
          priority: 'MEDIUM',
          symbol: holding.symbol,
          message: `${365 - daysHeld} days to LTCG qualification`,
          value: 365 - daysHeld,
        });
      }
    }

    // Sort by priority
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    res.json(alerts.slice(0, 20));
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: error.message });
  }
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

    // For REITs, use BSE first (NSE data is often stale)
    // For others, try NSE first, then BSE
    let symbolsToTry;
    if (USE_BSE_EXCHANGE.includes(mapped.toUpperCase())) {
      symbolsToTry = [`${mapped}.BO`, `${mapped}.NS`, mapped];
    } else {
      symbolsToTry = [`${mapped}.NS`, `${mapped}.BO`, mapped];
    }

    let success = false;
    for (const sym of symbolsToTry) {
      try {
        const quote = await yahooFinance.quote(sym);
        if (quote && quote.regularMarketPrice) {
          holding.currentPrice = quote.regularMarketPrice;
          holding.dayChange = quote.regularMarketChange || 0;
          holding.dayChangePercent = quote.regularMarketChangePercent || 0;
          holding.previousClose = quote.regularMarketPreviousClose || 0;
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

// =============================================
// INTELLIGENT TAX ANALYSIS - AI-Powered Excel Processing
// =============================================

const taxAnalysisPath = path.join(__dirname, 'tax_analysis.json');
const taxTemplatesPath = path.join(__dirname, 'tax_templates.json');

function loadTaxAnalysis() {
  try {
    if (fs.existsSync(taxAnalysisPath)) {
      return JSON.parse(fs.readFileSync(taxAnalysisPath, 'utf-8'));
    }
  } catch {}
  return { analyses: [], nextAnalysisId: 1, pendingAnalyses: {} };
}

function saveTaxAnalysis(data) {
  fs.writeFileSync(taxAnalysisPath, JSON.stringify(data, null, 2));
}

function loadTaxTemplates() {
  try {
    if (fs.existsSync(taxTemplatesPath)) {
      return JSON.parse(fs.readFileSync(taxTemplatesPath, 'utf-8'));
    }
  } catch {}
  return { templates: [], nextTemplateId: 1 };
}

function saveTaxTemplates(data) {
  fs.writeFileSync(taxTemplatesPath, JSON.stringify(data, null, 2));
}

let taxData = loadTaxAnalysis();
let taxTemplates = loadTaxTemplates();

// =============================================
// PHASE 1: Structure Analyzer
// =============================================

function analyzeExcelStructure(workbook) {
  const sheets = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

    if (rawData.length < 2) continue;

    // Find header row (row with most non-empty text cells)
    let headerRowIndex = 0;
    let maxTextCells = 0;

    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i] || [];
      const textCells = row.filter(cell =>
        cell !== null &&
        typeof cell === 'string' &&
        cell.trim().length > 0 &&
        !/^\d+([.,]\d+)?$/.test(cell.trim()) // Not a number
      ).length;

      if (textCells > maxTextCells) {
        maxTextCells = textCells;
        headerRowIndex = i;
      }
    }

    const headers = (rawData[headerRowIndex] || []).map(h => String(h || '').trim());
    const dataStartRow = headerRowIndex + 1;

    // Find data end (detect footer/total rows)
    let dataEndRow = rawData.length - 1;
    for (let i = rawData.length - 1; i > dataStartRow; i--) {
      const row = rawData[i] || [];
      const rowText = row.map(c => String(c || '').toLowerCase()).join(' ');
      if (rowText.includes('total') || rowText.includes('grand') || rowText.includes('sum')) {
        dataEndRow = i - 1;
      } else if (row.filter(c => c !== null).length > 2) {
        break;
      }
    }

    // Analyze each column
    const columns = [];
    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      const header = headers[colIdx];
      if (!header) continue;

      // Sample values from data rows
      const sampleValues = [];
      for (let rowIdx = dataStartRow; rowIdx <= Math.min(dataStartRow + 10, dataEndRow); rowIdx++) {
        const val = rawData[rowIdx]?.[colIdx];
        if (val !== null && val !== undefined && val !== '') {
          sampleValues.push(val);
        }
      }

      // Infer data type
      let dataType = 'text';
      let nullCount = 0;
      const totalRows = dataEndRow - dataStartRow + 1;

      for (let rowIdx = dataStartRow; rowIdx <= dataEndRow; rowIdx++) {
        if (rawData[rowIdx]?.[colIdx] === null || rawData[rowIdx]?.[colIdx] === '') {
          nullCount++;
        }
      }

      if (sampleValues.length > 0) {
        const sample = sampleValues[0];
        if (typeof sample === 'number') {
          // Check if it's a date serial number (between 1900 and 2100 in Excel terms)
          if (sample > 1 && sample < 100000 && sampleValues.every(v => typeof v === 'number' && v > 1 && v < 100000)) {
            dataType = 'date';
          } else {
            dataType = 'number';
          }
        } else if (typeof sample === 'string') {
          const str = sample.trim();
          if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/.test(str) ||
              /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/.test(str) ||
              /^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/.test(str)) {
            dataType = 'date';
          } else if (/^[₹$Rs.\s]*[\d,]+\.?\d*$/.test(str) || /^\([\d,]+\.?\d*\)$/.test(str)) {
            dataType = 'currency';
          } else if (/^-?\d+\.?\d*%?$/.test(str)) {
            dataType = 'number';
          }
        }
      }

      columns.push({
        index: colIdx,
        rawHeader: header,
        sampleValues: sampleValues.slice(0, 5),
        dataType,
        nullPercentage: Math.round((nullCount / totalRows) * 100),
        uniqueValueCount: new Set(sampleValues.map(v => String(v))).size,
      });
    }

    // Detect sheet type
    const allHeaders = headers.join(' ').toLowerCase();
    let detectedType = 'unknown';
    if (allHeaders.includes('buy') && allHeaders.includes('sell')) {
      detectedType = 'transactions';
    } else if (allHeaders.includes('gain') || allHeaders.includes('p&l') || allHeaders.includes('profit')) {
      detectedType = 'capital_gains';
    } else if (allHeaders.includes('quantity') || allHeaders.includes('qty') || allHeaders.includes('units')) {
      detectedType = 'holdings';
    }

    sheets.push({
      name: sheetName,
      headerRowIndex,
      dataStartRow,
      dataEndRow,
      totalRows: dataEndRow - dataStartRow + 1,
      columns,
      detectedType,
      rawHeaders: headers,
    });
  }

  return { sheets };
}

// =============================================
// PHASE 2: AI Semantic Understanding
// =============================================

async function getAIColumnMapping(sheetStructure, sampleRows) {
  const prompt = `You are a financial data analyst expert. Analyze this Excel structure and classify each column for Indian tax (ITR) capital gains calculation.

EXCEL STRUCTURE:
- Sheet: "${sheetStructure.name}"
- Detected Type: ${sheetStructure.detectedType}
- Headers: ${JSON.stringify(sheetStructure.rawHeaders)}
- Column Details:
${sheetStructure.columns.map(c => `  [${c.index}] "${c.rawHeader}" (${c.dataType}) - Samples: ${JSON.stringify(c.sampleValues.slice(0, 3))}`).join('\n')}

- Sample Data Rows:
${sampleRows.slice(0, 5).map((row, i) => `  Row ${i + 1}: ${JSON.stringify(row)}`).join('\n')}

TASK: Map each column to a semantic category for tax calculation.

SEMANTIC CATEGORIES:
- SYMBOL: Stock ticker, scrip code, script name
- ISIN: ISIN code (12 char alphanumeric)
- SECURITY_NAME: Company/fund name, stock name, scheme name
- TRANSACTION_TYPE: Buy/Sell/Purchase/Sale/Redemption indicator
- QUANTITY: Number of shares/units (qty, units, no. of shares)
- BUY_DATE: Purchase/acquisition date
- SELL_DATE: Sale/redemption/transfer date
- TRADE_DATE: Generic transaction date (if single date column)
- BUY_PRICE: Purchase price per unit
- SELL_PRICE: Sale price per unit
- BUY_VALUE: Total purchase/cost value
- SELL_VALUE: Total sale/redemption value
- GAIN_LOSS: Profit/loss amount (P&L, realized gain)
- GAIN_LOSS_PERCENT: Percentage gain/loss
- STT: Securities Transaction Tax
- BROKERAGE: Fees/charges/expenses
- EXCHANGE: NSE/BSE/MCX
- FOLIO: Mutual fund folio number
- NAV: Net Asset Value
- HOLDING_PERIOD: Days/months held
- ASSET_TYPE: Equity/MF/ETF/Bond category
- IGNORE: Columns not needed for tax calculation (serial no, remarks, etc.)

IMPORTANT RULES:
1. If a column header is ambiguous, use sample values to determine meaning
2. "Date" alone could be BUY_DATE or SELL_DATE - check context and other columns
3. If TRANSACTION_TYPE exists, a single "Date" column likely means the transaction date
4. Currency columns (₹, Rs.) are likely value columns
5. Short numeric values (1-1000) are likely QUANTITY
6. Large numeric values are likely VALUE columns
7. Negative values in GAIN_LOSS indicate loss
8. If you see "Scrip" or "Script" it means stock SYMBOL
9. "Dt." or "Dt" prefix usually means date

OUTPUT FORMAT (valid JSON only, no markdown):
{
  "sheetType": "capital_gains|transactions|holdings|p&l_statement|unknown",
  "transactionModel": "single_row|buy_sell_separate|paired",
  "sourceGuess": "Zerodha|Groww|ICICI Direct|HDFC Securities|Kotak|Angel|NSDL CAS|CDSL CAS|Unknown",
  "confidence": 0.85,
  "columns": [
    {"index": 0, "rawHeader": "...", "semantic": "SYMBOL", "confidence": 0.95},
    {"index": 1, "rawHeader": "...", "semantic": "IGNORE", "confidence": 0.9, "reason": "Serial number"}
  ],
  "derivedFields": [
    {"field": "GAIN_LOSS", "formula": "SELL_VALUE - BUY_VALUE", "reason": "No explicit gain column"}
  ],
  "dateFormat": "DD-MM-YYYY",
  "warnings": ["No QUANTITY column - may be aggregated data"],
  "notes": "This appears to be a Zerodha P&L statement"
}`;

  try {
    const response = await axios.post(
      `${PORTKEY_BASE_URL}/v1/messages`,
      {
        model: AI_MODELS['claude-sonnet'],
        max_tokens: 2048,
        system: 'You are a financial data parsing expert. Output valid JSON only, no markdown code blocks.',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-portkey-api-key': PORTKEY_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        timeout: 60000,
      }
    );

    const aiResponse = response.data.content[0].text;
    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = aiResponse;
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('AI column mapping error:', error.message);
    return null;
  }
}

// =============================================
// PHASE 3: Data Normalization
// =============================================

function parseDate(dateStr) {
  if (!dateStr) return null;

  // Handle Excel serial date numbers
  if (typeof dateStr === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + dateStr * 24 * 60 * 60 * 1000);
  }

  const str = String(dateStr).trim();

  // Common date formats
  const patterns = [
    { regex: /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/, parse: (m) => new Date(m[3], m[2] - 1, m[1]) }, // DD-MM-YYYY
    { regex: /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/, parse: (m) => new Date(m[1], m[2] - 1, m[3]) }, // YYYY-MM-DD
    { regex: /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2})$/, parse: (m) => {
      let year = parseInt(m[3]);
      year += year > 50 ? 1900 : 2000;
      return new Date(year, m[2] - 1, m[1]);
    }}, // DD-MM-YY
    { regex: /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/, parse: (m) => new Date(`${m[1]} ${m[2]} ${m[3]}`) }, // DD-Mon-YYYY
    { regex: /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/, parse: (m) => {
      let year = parseInt(m[3]);
      year += year > 50 ? 1900 : 2000;
      return new Date(`${m[1]} ${m[2]} ${year}`);
    }}, // DD-Mon-YY
  ];

  for (const { regex, parse } of patterns) {
    const match = str.match(regex);
    if (match) {
      const d = parse(match);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Fallback to native parsing
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseCurrency(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;

  let str = String(val).trim();

  // Handle brackets as negative
  const isNegative = str.startsWith('(') && str.endsWith(')') || str.startsWith('-');
  str = str.replace(/[()]/g, '');

  // Remove currency symbols and spaces
  str = str.replace(/[₹$Rs.\s,]/gi, '');

  // Handle Cr/Lakh suffixes
  let multiplier = 1;
  if (/cr$/i.test(str)) {
    multiplier = 10000000;
    str = str.replace(/cr$/i, '');
  } else if (/l(akh)?$/i.test(str)) {
    multiplier = 100000;
    str = str.replace(/l(akh)?$/i, '');
  } else if (/k$/i.test(str)) {
    multiplier = 1000;
    str = str.replace(/k$/i, '');
  }

  const num = parseFloat(str) || 0;
  return (isNegative ? -num : num) * multiplier;
}

function normalizeTransactions(rawData, structure, columnMapping) {
  const transactions = [];
  const mapping = {};

  // Build column index mapping
  for (const col of columnMapping.columns || []) {
    if (col.semantic && col.semantic !== 'IGNORE') {
      mapping[col.semantic] = col.index;
    }
  }

  // Process each data row
  for (let rowIdx = structure.dataStartRow; rowIdx <= structure.dataEndRow; rowIdx++) {
    const row = rawData[rowIdx];
    if (!row || row.filter(c => c !== null && c !== '').length < 2) continue;

    const getValue = (semantic) => {
      const idx = mapping[semantic];
      return idx !== undefined ? row[idx] : null;
    };

    // Extract base fields
    const symbol = String(getValue('SYMBOL') || getValue('SECURITY_NAME') || '').trim();
    const name = String(getValue('SECURITY_NAME') || getValue('SYMBOL') || '').trim();

    if (!symbol && !name) continue;

    // Parse dates
    let buyDate = parseDate(getValue('BUY_DATE'));
    let sellDate = parseDate(getValue('SELL_DATE'));
    const tradeDate = parseDate(getValue('TRADE_DATE'));

    // Handle transaction type for single date scenarios
    const txnType = String(getValue('TRANSACTION_TYPE') || '').toLowerCase();
    if (tradeDate && !buyDate && !sellDate) {
      if (txnType.includes('buy') || txnType.includes('purchase')) {
        buyDate = tradeDate;
      } else if (txnType.includes('sell') || txnType.includes('sale') || txnType.includes('redemption')) {
        sellDate = tradeDate;
      }
    }

    // Parse numeric values
    const quantity = parseCurrency(getValue('QUANTITY')) || 1;
    const buyPrice = parseCurrency(getValue('BUY_PRICE'));
    const sellPrice = parseCurrency(getValue('SELL_PRICE'));
    let buyValue = parseCurrency(getValue('BUY_VALUE'));
    let sellValue = parseCurrency(getValue('SELL_VALUE'));

    // Calculate values if not provided
    if (!buyValue && buyPrice) buyValue = buyPrice * quantity;
    if (!sellValue && sellPrice) sellValue = sellPrice * quantity;

    // Get or calculate gain/loss
    let gain = parseCurrency(getValue('GAIN_LOSS'));
    if (gain === 0 && sellValue && buyValue) {
      gain = sellValue - buyValue;
    }

    // Classify capital gain
    let classification = null;
    if (buyDate && sellDate) {
      const holdingDays = Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24));
      classification = {
        holdingDays,
        holdingMonths: Math.floor(holdingDays / 30),
        isLongTerm: holdingDays > 365,
        type: holdingDays > 365 ? 'LTCG' : 'STCG',
      };
    }

    // Additional fields
    const stt = parseCurrency(getValue('STT'));
    const brokerage = parseCurrency(getValue('BROKERAGE'));
    const exchange = String(getValue('EXCHANGE') || '').toUpperCase();
    const isin = String(getValue('ISIN') || '').toUpperCase();

    transactions.push({
      symbol,
      name: name || symbol,
      isin,
      buyDate: buyDate ? buyDate.toISOString().split('T')[0] : null,
      sellDate: sellDate ? sellDate.toISOString().split('T')[0] : null,
      quantity,
      buyPrice,
      sellPrice,
      buyValue,
      sellValue,
      gain,
      stt,
      brokerage,
      exchange,
      classification,
      sheet: structure.name,
      sourceRow: rowIdx + 1,
      confidence: columnMapping.confidence || 0.5,
    });
  }

  return transactions;
}

// =============================================
// PHASE 4: Tax Calculator
// =============================================

function calculateTaxes(transactions) {
  // Indian Tax Rules FY 2024-25
  const TAX_CONFIG = {
    stcgRate: 0.20,           // 20% for STCG on equity
    ltcgRate: 0.125,          // 12.5% for LTCG on equity
    ltcgExemption: 125000,    // ₹1.25 lakh exemption
    ltcgThresholdDays: 365,   // 12 months
  };

  const stcgTransactions = transactions.filter(t => t.classification?.type === 'STCG');
  const ltcgTransactions = transactions.filter(t => t.classification?.type === 'LTCG');
  const unclassified = transactions.filter(t => !t.classification);

  const stcgProfit = stcgTransactions.filter(t => t.gain > 0).reduce((sum, t) => sum + t.gain, 0);
  const stcgLoss = stcgTransactions.filter(t => t.gain < 0).reduce((sum, t) => sum + t.gain, 0);
  const ltcgProfit = ltcgTransactions.filter(t => t.gain > 0).reduce((sum, t) => sum + t.gain, 0);
  const ltcgLoss = ltcgTransactions.filter(t => t.gain < 0).reduce((sum, t) => sum + t.gain, 0);

  const totalSTCG = stcgProfit + stcgLoss;
  const totalLTCG = ltcgProfit + ltcgLoss;
  const totalGain = totalSTCG + totalLTCG;

  // Apply loss set-off rules
  let netSTCG = totalSTCG;
  let netLTCG = totalLTCG;
  let stcgLossCarryForward = 0;
  let ltcgLossCarryForward = 0;

  // STCG loss can be set off against LTCG
  if (netSTCG < 0 && netLTCG > 0) {
    const setOff = Math.min(Math.abs(netSTCG), netLTCG);
    netLTCG -= setOff;
    netSTCG += setOff;
  }

  // Remaining losses carry forward
  if (netSTCG < 0) stcgLossCarryForward = Math.abs(netSTCG);
  if (netLTCG < 0) ltcgLossCarryForward = Math.abs(netLTCG);

  // Calculate taxable amounts
  const taxableSTCG = Math.max(0, netSTCG);
  const taxableLTCG = Math.max(0, netLTCG - TAX_CONFIG.ltcgExemption);

  const estimatedSTCGTax = taxableSTCG * TAX_CONFIG.stcgRate;
  const estimatedLTCGTax = taxableLTCG * TAX_CONFIG.ltcgRate;
  const totalEstimatedTax = estimatedSTCGTax + estimatedLTCGTax;

  // Calculate totals for buy/sell values
  const totalBuyValue = transactions.reduce((sum, t) => sum + (t.buyValue || 0), 0);
  const totalSellValue = transactions.reduce((sum, t) => sum + (t.sellValue || 0), 0);
  const totalSTT = transactions.reduce((sum, t) => sum + (t.stt || 0), 0);
  const totalBrokerage = transactions.reduce((sum, t) => sum + (t.brokerage || 0), 0);

  return {
    summary: {
      totalTransactions: transactions.length,
      stcgCount: stcgTransactions.length,
      ltcgCount: ltcgTransactions.length,
      unclassifiedCount: unclassified.length,
      totalBuyValue,
      totalSellValue,
      totalGain,
      totalSTCG,
      totalLTCG,
      stcgProfit,
      stcgLoss,
      ltcgProfit,
      ltcgLoss,
      netSTCG,
      netLTCG,
      taxableSTCG,
      taxableLTCG,
      estimatedSTCGTax,
      estimatedLTCGTax,
      totalEstimatedTax,
      ltcgExemption: TAX_CONFIG.ltcgExemption,
      stcgLossCarryForward,
      ltcgLossCarryForward,
      totalSTT,
      totalBrokerage,
    },
    config: TAX_CONFIG,
  };
}

// =============================================
// PHASE 5: Insights Generator
// =============================================

function generateInsights(summary, transactions) {
  const insights = [];

  // Loss set-off opportunity
  if (summary.stcgLoss < 0 || summary.ltcgLoss < 0) {
    const totalLoss = Math.abs(summary.stcgLoss) + Math.abs(summary.ltcgLoss);
    insights.push({
      type: 'tax_saving',
      priority: 1,
      title: 'Capital Loss Set-off Available',
      description: `You have capital losses of ₹${totalLoss.toLocaleString('en-IN')} that can reduce your tax liability.`,
      details: {
        stcgLoss: Math.abs(summary.stcgLoss),
        ltcgLoss: Math.abs(summary.ltcgLoss),
      },
      impact: 'STCG losses can offset both STCG and LTCG. LTCG losses can only offset LTCG. Unused losses carry forward 8 years.',
    });
  }

  // LTCG exemption status
  if (summary.totalLTCG > 0) {
    if (summary.totalLTCG <= summary.ltcgExemption) {
      insights.push({
        type: 'tax_saving',
        priority: 2,
        title: 'LTCG Within Exemption Limit',
        description: `Your LTCG of ₹${summary.totalLTCG.toLocaleString('en-IN')} is fully exempt (limit: ₹1,25,000).`,
        impact: `Tax saved: ₹${Math.round(summary.totalLTCG * 0.125).toLocaleString('en-IN')}`,
      });
    } else {
      const excess = summary.totalLTCG - summary.ltcgExemption;
      insights.push({
        type: 'info',
        priority: 2,
        title: 'LTCG Exceeds Exemption',
        description: `₹${excess.toLocaleString('en-IN')} of your LTCG exceeds the ₹1,25,000 exemption.`,
        impact: `Taxable at 12.5% = ₹${Math.round(excess * 0.125).toLocaleString('en-IN')}`,
      });
    }
  }

  // High STCG warning
  if (summary.totalSTCG > 100000) {
    insights.push({
      type: 'warning',
      priority: 3,
      title: 'Significant Short-Term Gains',
      description: `STCG of ₹${summary.totalSTCG.toLocaleString('en-IN')} is taxed at 20%.`,
      impact: 'Consider holding investments >12 months for lower 12.5% LTCG rate.',
    });
  }

  // Near-term LTCG opportunities
  const nearLtcg = transactions.filter(t => {
    if (!t.classification || t.classification.type !== 'STCG') return false;
    const daysToLtcg = 365 - t.classification.holdingDays;
    return daysToLtcg > 0 && daysToLtcg <= 90 && t.gain > 10000;
  });

  if (nearLtcg.length > 0) {
    insights.push({
      type: 'optimization',
      priority: 4,
      title: 'Near-Term LTCG Qualification',
      description: `${nearLtcg.length} transaction(s) would qualify for LTCG if held slightly longer.`,
      details: nearLtcg.map(t => ({
        symbol: t.symbol,
        gain: t.gain,
        daysToLtcg: 365 - t.classification.holdingDays,
        potentialSaving: Math.round(t.gain * (0.20 - 0.125)),
      })),
      impact: 'Waiting could reduce tax from 20% to 12.5%.',
    });
  }

  // Loss carry forward
  if (summary.stcgLossCarryForward > 0 || summary.ltcgLossCarryForward > 0) {
    const total = summary.stcgLossCarryForward + summary.ltcgLossCarryForward;
    insights.push({
      type: 'info',
      priority: 5,
      title: 'Losses Available for Carry Forward',
      description: `₹${total.toLocaleString('en-IN')} in capital losses can be carried forward for 8 years.`,
      details: {
        stcgLoss: summary.stcgLossCarryForward,
        ltcgLoss: summary.ltcgLossCarryForward,
      },
      impact: 'File ITR to preserve carry-forward benefit. Report in Schedule CFL.',
    });
  }

  // ITR guidance
  insights.push({
    type: 'itr_guidance',
    priority: 10,
    title: 'ITR Form Required',
    description: summary.totalGain !== 0 ?
      'Capital gains require ITR-2 or ITR-3. ITR-1 cannot be used.' :
      'Even with zero net gain, report transactions in ITR-2/3 if you had capital gains activity.',
    impact: 'Schedule CG (Capital Gains) must be filled. Keep all contract notes.',
  });

  // Sort by priority
  insights.sort((a, b) => a.priority - b.priority);

  return insights;
}

// =============================================
// PHASE 6: Helper Functions
// =============================================

function determineFiscalYear(transactions) {
  const dates = transactions
    .map(t => t.sellDate ? new Date(t.sellDate) : null)
    .filter(d => d && !isNaN(d.getTime()));

  if (dates.length === 0) return 'Unknown';

  const fyCounts = {};
  dates.forEach(d => {
    const month = d.getMonth();
    const year = d.getFullYear();
    const fy = month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    fyCounts[fy] = (fyCounts[fy] || 0) + 1;
  });

  return Object.entries(fyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
}

function matchTemplate(structure, templates) {
  for (const template of templates) {
    const headerMatch = template.fingerprint.headerPatterns.every(pattern =>
      structure.rawHeaders.some(h => new RegExp(pattern, 'i').test(h))
    );
    if (headerMatch) {
      return template;
    }
  }
  return null;
}

// =============================================
// API ENDPOINTS
// =============================================

// Step 1: Upload and analyze structure
app.post('/api/tax/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);

    // Analyze structure
    const structure = analyzeExcelStructure(workbook);

    if (structure.sheets.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'No valid data sheets found in the file' });
    }

    // Get raw data for AI analysis
    const rawDataBySheet = {};
    for (const sheet of structure.sheets) {
      const sheetData = workbook.Sheets[sheet.name];
      rawDataBySheet[sheet.name] = XLSX.utils.sheet_to_json(sheetData, { header: 1, raw: true, defval: null });
    }

    // Check for matching template first
    let columnMappings = {};
    let useAI = true;

    for (const sheet of structure.sheets) {
      const matchedTemplate = matchTemplate(sheet, taxTemplates.templates);
      if (matchedTemplate) {
        columnMappings[sheet.name] = matchedTemplate.columnMapping;
        columnMappings[sheet.name].sourceGuess = matchedTemplate.sourceName;
        columnMappings[sheet.name].confidence = matchedTemplate.confidence;
        columnMappings[sheet.name].fromTemplate = true;
        useAI = false;
      }
    }

    // Use AI for sheets without templates
    if (useAI) {
      for (const sheet of structure.sheets) {
        if (!columnMappings[sheet.name]) {
          const sampleRows = rawDataBySheet[sheet.name].slice(sheet.dataStartRow, sheet.dataStartRow + 6);
          const aiMapping = await getAIColumnMapping(sheet, sampleRows);
          if (aiMapping) {
            columnMappings[sheet.name] = aiMapping;
          }
        }
      }
    }

    // Generate a pending analysis ID
    const pendingId = `pending_${Date.now()}`;

    // Store pending analysis
    taxData.pendingAnalyses = taxData.pendingAnalyses || {};
    taxData.pendingAnalyses[pendingId] = {
      filePath,
      fileName: req.file.originalname,
      structure,
      columnMappings,
      rawDataBySheet,
      createdAt: new Date().toISOString(),
    };
    saveTaxAnalysis(taxData);

    // Determine if confirmation needed
    const lowConfidenceSheets = structure.sheets.filter(s => {
      const mapping = columnMappings[s.name];
      return !mapping || mapping.confidence < 0.8;
    });

    res.json({
      pendingId,
      fileName: req.file.originalname,
      structure,
      columnMappings,
      requiresConfirmation: lowConfidenceSheets.length > 0,
      lowConfidenceSheets: lowConfidenceSheets.map(s => s.name),
      message: lowConfidenceSheets.length > 0 ?
        'Some columns need confirmation before processing' :
        'Ready to process',
    });
  } catch (error) {
    console.error('Tax upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze file' });
  }
});

// Step 2: Confirm mapping (optional)
app.post('/api/tax/confirm-mapping', (req, res) => {
  try {
    const { pendingId, columnMappings } = req.body;

    if (!taxData.pendingAnalyses?.[pendingId]) {
      return res.status(404).json({ error: 'Pending analysis not found' });
    }

    // Update mappings with user corrections
    taxData.pendingAnalyses[pendingId].columnMappings = columnMappings;
    taxData.pendingAnalyses[pendingId].userConfirmed = true;
    saveTaxAnalysis(taxData);

    res.json({ success: true, message: 'Mappings confirmed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Step 3: Process and calculate
app.post('/api/tax/process', async (req, res) => {
  try {
    const { pendingId } = req.body;

    const pending = taxData.pendingAnalyses?.[pendingId];
    if (!pending) {
      return res.status(404).json({ error: 'Pending analysis not found' });
    }

    const { structure, columnMappings, rawDataBySheet, fileName, filePath } = pending;

    // Normalize transactions from all sheets
    let allTransactions = [];
    const sheetResults = [];

    for (const sheet of structure.sheets) {
      const mapping = columnMappings[sheet.name];
      if (!mapping) continue;

      const rawData = rawDataBySheet[sheet.name];
      const transactions = normalizeTransactions(rawData, sheet, mapping);

      allTransactions.push(...transactions);
      sheetResults.push({
        name: sheet.name,
        rowCount: transactions.length,
        sourceGuess: mapping.sourceGuess,
        confidence: mapping.confidence,
      });
    }

    // Calculate taxes
    const { summary, config } = calculateTaxes(allTransactions);

    // Generate insights
    const insights = generateInsights(summary, allTransactions);

    // Get top gainers and losers
    const sortedByGain = [...allTransactions].sort((a, b) => (b.gain || 0) - (a.gain || 0));
    const topGainers = sortedByGain.slice(0, 5).filter(t => t.gain > 0);
    const topLosers = sortedByGain.slice(-5).reverse().filter(t => t.gain < 0);

    // Create final analysis
    const analysis = {
      id: taxData.nextAnalysisId++,
      fileName,
      uploadedAt: pending.createdAt,
      processedAt: new Date().toISOString(),
      fiscalYear: determineFiscalYear(allTransactions),
      summary,
      taxConfig: config,
      transactions: allTransactions,
      sheets: sheetResults,
      insights,
      topGainers,
      topLosers,
      aiMappings: columnMappings,
      structure,
    };

    // Save analysis
    taxData.analyses.unshift(analysis);

    // Clean up pending
    delete taxData.pendingAnalyses[pendingId];
    saveTaxAnalysis(taxData);

    // Clean up uploaded file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {}

    res.json(analysis);
  } catch (error) {
    console.error('Tax process error:', error);
    res.status(500).json({ error: error.message || 'Failed to process file' });
  }
});

// Quick analyze (combined upload + process for simple files)
app.post('/api/tax/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);

    // Analyze structure
    const structure = analyzeExcelStructure(workbook);

    if (structure.sheets.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'No valid data sheets found' });
    }

    // Get raw data and AI mappings
    let allTransactions = [];
    const sheetResults = [];
    const columnMappings = {};

    for (const sheet of structure.sheets) {
      const sheetData = workbook.Sheets[sheet.name];
      const rawData = XLSX.utils.sheet_to_json(sheetData, { header: 1, raw: true, defval: null });

      // Check template first
      let mapping = matchTemplate(sheet, taxTemplates.templates);

      if (!mapping) {
        // Use AI
        const sampleRows = rawData.slice(sheet.dataStartRow, sheet.dataStartRow + 6);
        mapping = await getAIColumnMapping(sheet, sampleRows);
      }

      if (mapping) {
        columnMappings[sheet.name] = mapping;
        const transactions = normalizeTransactions(rawData, sheet, mapping);
        allTransactions.push(...transactions);
        sheetResults.push({
          name: sheet.name,
          rowCount: transactions.length,
          sourceGuess: mapping.sourceGuess,
          confidence: mapping.confidence,
        });
      }
    }

    // Clean up file
    fs.unlinkSync(filePath);

    if (allTransactions.length === 0) {
      return res.status(400).json({
        error: 'Could not extract any transactions from the file',
        structure,
        columnMappings,
      });
    }

    // Calculate taxes
    const { summary, config } = calculateTaxes(allTransactions);

    // Generate insights
    const insights = generateInsights(summary, allTransactions);

    // Get top gainers and losers
    const sortedByGain = [...allTransactions].sort((a, b) => (b.gain || 0) - (a.gain || 0));
    const topGainers = sortedByGain.slice(0, 5).filter(t => t.gain > 0);
    const topLosers = sortedByGain.slice(-5).reverse().filter(t => t.gain < 0);

    // Create analysis
    const analysis = {
      id: taxData.nextAnalysisId++,
      fileName: req.file.originalname,
      uploadedAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      fiscalYear: determineFiscalYear(allTransactions),
      summary,
      taxConfig: config,
      transactions: allTransactions,
      sheets: sheetResults,
      insights,
      topGainers,
      topLosers,
      aiMappings: columnMappings,
      structure,
    };

    taxData.analyses.unshift(analysis);
    saveTaxAnalysis(taxData);

    res.json(analysis);
  } catch (error) {
    console.error('Tax analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze file' });
  }
});

// Get all analyses
app.get('/api/tax/analyses', (req, res) => {
  res.json(taxData.analyses.map(a => ({
    id: a.id,
    fileName: a.fileName,
    uploadedAt: a.uploadedAt,
    fiscalYear: a.fiscalYear,
    summary: a.summary,
    sheets: a.sheets,
  })));
});

// Get specific analysis
app.get('/api/tax/analyses/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const analysis = taxData.analyses.find(a => a.id === id);
  if (!analysis) {
    return res.status(404).json({ error: 'Analysis not found' });
  }
  res.json(analysis);
});

// Delete analysis
app.delete('/api/tax/analyses/:id', (req, res) => {
  const id = parseInt(req.params.id);
  taxData.analyses = taxData.analyses.filter(a => a.id !== id);
  saveTaxAnalysis(taxData);
  res.json({ success: true });
});

// Save as template
app.post('/api/tax/save-template', (req, res) => {
  try {
    const { analysisId, templateName } = req.body;

    const analysis = taxData.analyses.find(a => a.id === analysisId);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Create template from analysis
    const template = {
      id: taxTemplates.nextTemplateId++,
      name: templateName,
      sourceName: analysis.sheets[0]?.sourceGuess || 'Custom',
      confidence: 0.95,
      createdAt: new Date().toISOString(),
      timesUsed: 1,
      fingerprint: {
        headerPatterns: analysis.structure.sheets[0]?.rawHeaders
          .filter(h => h && h.length > 2)
          .slice(0, 5),
      },
      columnMapping: analysis.aiMappings[analysis.structure.sheets[0]?.name],
    };

    taxTemplates.templates.push(template);
    saveTaxTemplates(taxTemplates);

    res.json({ success: true, template });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get templates
app.get('/api/tax/templates', (req, res) => {
  res.json(taxTemplates.templates);
});

// Delete template
app.delete('/api/tax/templates/:id', (req, res) => {
  const id = parseInt(req.params.id);
  taxTemplates.templates = taxTemplates.templates.filter(t => t.id !== id);
  saveTaxTemplates(taxTemplates);
  res.json({ success: true });
});

// =============================================
// AIS CSV IMPORT - Income Tax AIS Data
// =============================================

// Parse AIS CSV file from Income Tax website
function parseAISCSV(content, filename) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return { transactions: [], metadata: {} };

  // Parse headers - handle quoted values
  const headers = parseCSVLine(lines[0]).map(h => String(h).trim().toLowerCase());

  const transactions = [];
  let metadata = {
    financialYear: '',
    source: 'AIS',
    reportType: '',
    totalRecords: 0,
  };

  // Detect AIS format type from headers
  const isSecData = headers.some(h => h.includes('short term capital gain') || h.includes('long term capital gain'));
  const isSchedule112A = headers.some(h => h.includes('fair market value'));

  if (isSecData) {
    metadata.reportType = 'AIS_SecData';
  } else if (isSchedule112A) {
    metadata.reportType = 'AIS_Schedule112A';
  }

  // Map AIS columns to our standard fields
  const getColumnIndex = (patterns) => {
    for (const pattern of patterns) {
      const idx = headers.findIndex(h => h.includes(pattern.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  // Column mappings for AIS SecData format
  const colMap = {
    fy: getColumnIndex(['fy', 'financial year']),
    isin: getColumnIndex(['isin']),
    securityName: getColumnIndex(['name of the security', 'security', 'share name']),
    securityClass: getColumnIndex(['security class']),
    assetType: getColumnIndex(['asset type']),
    debitDate: getColumnIndex(['debit date', 'sale date', 'date']),
    units: getColumnIndex(['units', 'number of shares', 'quantity']),
    salePrice: getColumnIndex(['unit sale price', 'sale price per share']),
    saleConsideration: getColumnIndex(['sale consideration', 'full value']),
    costOfAcquisition: getColumnIndex(['cost of acquisition']),
    adjustedCOA: getColumnIndex(['adjusted cost of acquisition']),
    fmv: getColumnIndex(['fair market value per share']),
    totalFMV: getColumnIndex(['total fair market value']),
    adjustedFMV: getColumnIndex(['adjusted fair market value']),
    stcg: getColumnIndex(['short term capital gain']),
    ltcgWithoutIndexation: getColumnIndex(['long term capital gain (without indexation)', 'long term capital gain']),
    ltcgWithIndexation: getColumnIndex(['long term capital gain (with indexation)']),
    optionTax10: getColumnIndex(['option to pay tax @10%', 'option to pay']),
    reportingEntity: getColumnIndex(['reporting entity', 'itdrein']),
  };

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 5) continue;

    const getValue = (colIdx) => {
      if (colIdx < 0 || colIdx >= values.length) return null;
      return values[colIdx];
    };

    const parseNum = (val) => {
      if (val === null || val === undefined || val === '') return 0;
      return parseFloat(String(val).replace(/[₹,\s]/g, '')) || 0;
    };

    // Extract FY
    const fyVal = getValue(colMap.fy);
    if (fyVal && !metadata.financialYear) {
      metadata.financialYear = String(fyVal).trim();
    }

    const securityName = getValue(colMap.securityName);
    if (!securityName || securityName.trim() === '') continue;

    // Parse ISIN to get a clean symbol
    const isin = String(getValue(colMap.isin) || '').trim().toUpperCase();

    // Clean up security name - extract company name before #
    let cleanName = securityName;
    let symbol = '';
    if (securityName.includes('#')) {
      cleanName = securityName.split('#')[0].trim();
    }
    // Generate symbol from ISIN or name
    if (isin && isin.length >= 12) {
      symbol = isin;
    } else {
      symbol = cleanName.replace(/[^A-Z0-9]/gi, '').substring(0, 15).toUpperCase();
    }

    // Asset type determines STCG vs LTCG
    const assetType = String(getValue(colMap.assetType) || '').toLowerCase();
    const isLongTerm = assetType.includes('long');
    const isShortTerm = assetType.includes('short');

    // Parse values
    const units = parseNum(getValue(colMap.units));
    const salePrice = parseNum(getValue(colMap.salePrice));
    const saleConsideration = parseNum(getValue(colMap.saleConsideration));
    const costOfAcquisition = parseNum(getValue(colMap.costOfAcquisition)) || parseNum(getValue(colMap.adjustedCOA));
    const stcg = parseNum(getValue(colMap.stcg));
    const ltcg = parseNum(getValue(colMap.ltcgWithoutIndexation)) || parseNum(getValue(colMap.ltcgWithIndexation));

    // Calculate gain - use pre-calculated values from AIS
    let gain = 0;
    let classificationType = null;

    if (isShortTerm && stcg !== 0) {
      gain = stcg;
      classificationType = 'STCG';
    } else if (isLongTerm && ltcg !== 0) {
      gain = ltcg;
      classificationType = 'LTCG';
    } else {
      // Fallback calculation
      gain = saleConsideration - costOfAcquisition;
      classificationType = isLongTerm ? 'LTCG' : 'STCG';
    }

    // Parse sell date
    let sellDate = null;
    const dateStr = getValue(colMap.debitDate);
    if (dateStr) {
      // Parse DD/MM/YYYY format
      const parts = String(dateStr).split('/');
      if (parts.length === 3) {
        sellDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    // Check for 10% tax option (pre-July 2024 transactions)
    const optionTax10 = String(getValue(colMap.optionTax10) || '').toUpperCase();
    const eligibleFor10PercentTax = optionTax10 === 'Y';

    const transaction = {
      symbol,
      name: cleanName,
      isin,
      buyDate: null, // AIS doesn't provide buy dates
      sellDate,
      quantity: units,
      buyPrice: units > 0 ? costOfAcquisition / units : 0,
      sellPrice: salePrice,
      buyValue: costOfAcquisition,
      sellValue: saleConsideration,
      gain,
      stt: 0, // STT already deducted in AIS values
      brokerage: 0,
      exchange: 'NSE', // Default
      classification: classificationType ? {
        holdingDays: isLongTerm ? 400 : 200, // Estimated
        holdingMonths: isLongTerm ? 13 : 6,
        isLongTerm,
        type: classificationType,
      } : null,
      sheet: 'AIS Import',
      sourceRow: i + 1,
      confidence: 0.95, // High confidence - official AIS data
      aisSource: true,
      eligibleFor10PercentTax,
      securityClass: getValue(colMap.securityClass),
    };

    transactions.push(transaction);
  }

  metadata.totalRecords = transactions.length;

  return { transactions, metadata };
}

// AIS CSV import endpoint
app.post('/api/tax/import-ais', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = req.file.originalname;

    // Parse AIS CSV
    const { transactions, metadata } = parseAISCSV(content, filename);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    if (transactions.length === 0) {
      return res.status(400).json({
        error: 'No transactions found in AIS file. Make sure you uploaded an AIS CSV export (not encrypted JSON).',
        metadata,
      });
    }

    // Calculate taxes using existing function
    const { summary, config } = calculateTaxes(transactions);

    // Generate insights
    const insights = generateInsights(summary, transactions);

    // Add AIS-specific insights
    const ais10PercentEligible = transactions.filter(t => t.eligibleFor10PercentTax && t.gain > 0);
    if (ais10PercentEligible.length > 0) {
      const totalGainEligible = ais10PercentEligible.reduce((sum, t) => sum + t.gain, 0);
      insights.unshift({
        type: 'tax_saving',
        priority: 0,
        title: '10% Tax Option Available (Pre-July 2024)',
        description: `${ais10PercentEligible.length} transaction(s) with ₹${totalGainEligible.toLocaleString('en-IN')} gains are eligible for 10% tax rate (grandfathered transactions before July 2024 tax changes).`,
        details: {
          count: ais10PercentEligible.length,
          totalGain: totalGainEligible,
          potentialSaving: Math.round(totalGainEligible * 0.025), // 12.5% - 10% = 2.5% saving
        },
        impact: 'You may opt for 10% tax rate on these transactions instead of 12.5%.',
      });
    }

    // Get top gainers and losers
    const sortedByGain = [...transactions].sort((a, b) => (b.gain || 0) - (a.gain || 0));
    const topGainers = sortedByGain.slice(0, 5).filter(t => t.gain > 0);
    const topLosers = sortedByGain.slice(-5).reverse().filter(t => t.gain < 0);

    // Create analysis
    const analysis = {
      id: taxData.nextAnalysisId++,
      fileName: filename,
      uploadedAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      fiscalYear: metadata.financialYear || determineFiscalYear(transactions),
      summary,
      taxConfig: config,
      transactions,
      sheets: [{
        name: 'AIS Import',
        rowCount: transactions.length,
        sourceGuess: 'Income Tax AIS',
        confidence: 0.95,
      }],
      insights,
      topGainers,
      topLosers,
      aiMappings: {},
      structure: { sheets: [] },
      aisMetadata: metadata,
    };

    taxData.analyses.unshift(analysis);
    saveTaxAnalysis(taxData);

    res.json(analysis);
  } catch (error) {
    console.error('AIS import error:', error);
    res.status(500).json({ error: error.message || 'Failed to import AIS file' });
  }
});

// Generate ITR report
app.get('/api/tax/itr-report/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const analysis = taxData.analyses.find(a => a.id === id);
  if (!analysis) {
    return res.status(404).json({ error: 'Analysis not found' });
  }

  const summary = analysis.summary;

  // Helper to calculate ITR values for a set of transactions
  function calculateITRValues(transactions) {
    let fullValue = 0;
    let costOfAcquisition = 0;
    let expenditure = 0;
    let totalGain = 0;
    let detectedCurrency = 'INR'; // Default to INR

    for (const t of transactions) {
      const gain = t.gain || 0;
      const buyVal = t.buyValue || 0;
      const sellVal = t.sellValue || 0;
      const charges = (t.stt || 0) + (t.brokerage || 0);

      totalGain += gain;
      expenditure += charges;
      fullValue += sellVal;
      costOfAcquisition += buyVal;

      // Detect if values might be in different currency (USD)
      // If gain is much larger than buy/sell values, likely USD values with INR gain
      if (Math.abs(gain) > 50 && buyVal > 0 && Math.abs(gain) > (buyVal + sellVal) * 2) {
        detectedCurrency = 'USD';
      }
    }

    return {
      fullValue,
      costOfAcquisition,
      expenditure,
      capitalGains: totalGain,
      currency: detectedCurrency,
    };
  }

  const stcgTransactions = analysis.transactions.filter(t => t.classification?.type === 'STCG');
  const ltcgTransactions = analysis.transactions.filter(t => t.classification?.type === 'LTCG');

  const stcgValues = calculateITRValues(stcgTransactions);
  const ltcgValues = calculateITRValues(ltcgTransactions);

  // Generate ITR Schedule CG format
  const scheduleCG = {
    shortTermCapitalGains: {
      section111A: {
        fullValue: stcgValues.fullValue,
        costOfAcquisition: stcgValues.costOfAcquisition,
        expenditure: stcgValues.expenditure,
        capitalGains: summary.totalSTCG,
        taxRate: '20%',
        taxPayable: summary.estimatedSTCGTax,
        currency: stcgValues.currency,
      },
    },
    longTermCapitalGains: {
      section112A: {
        fullValue: ltcgValues.fullValue,
        costOfAcquisition: ltcgValues.costOfAcquisition,
        expenditure: ltcgValues.expenditure,
        grossGains: summary.totalLTCG,
        exemptionUnder112A: Math.min(summary.ltcgExemption, Math.max(0, summary.totalLTCG)),
        taxableGains: summary.taxableLTCG,
        taxRate: '12.5%',
        taxPayable: summary.estimatedLTCGTax,
        currency: ltcgValues.currency,
      },
    },
    lossSetOff: {
      stcgLossSetOffAgainstSTCG: Math.min(Math.abs(summary.stcgLoss), summary.stcgProfit),
      stcgLossSetOffAgainstLTCG: summary.stcgLoss < 0 && summary.totalLTCG > 0 ?
        Math.min(Math.abs(summary.stcgLoss + summary.stcgProfit), summary.totalLTCG) : 0,
      ltcgLossSetOffAgainstLTCG: Math.min(Math.abs(summary.ltcgLoss), summary.ltcgProfit),
    },
    lossCarryForward: {
      stcgLoss: summary.stcgLossCarryForward || 0,
      ltcgLoss: summary.ltcgLossCarryForward || 0,
      yearsRemaining: 8,
    },
  };

  const notes = [
    'STT-paid equity transactions fall under Section 111A (STCG) and Section 112A (LTCG)',
    'LTCG exemption of ₹1,25,000 per year is available under Section 112A',
    'Capital losses can be carried forward for 8 assessment years',
    'STCG losses can be set off against both STCG and LTCG',
    'LTCG losses can only be set off against LTCG',
    'Keep all contract notes and broker statements for verification',
    'Report grandfathered gains separately if holding from before 31-Jan-2018',
  ];

  // Add note if values are in different currency
  if (stcgValues.currency === 'USD' || ltcgValues.currency === 'USD') {
    notes.unshift('Note: Full Value and Cost of Acquisition are shown in USD (source currency). Capital Gains are in INR.');
  }

  res.json({
    fiscalYear: analysis.fiscalYear,
    scheduleCG,
    summary,
    formRequired: 'ITR-2 or ITR-3',
    scheduleToFill: ['Schedule CG', 'Schedule 112A'],
    transactionCount: {
      stcg: summary.stcgCount,
      ltcg: summary.ltcgCount,
      total: summary.totalTransactions,
    },
    notes,
  });
});

// AI Chat endpoint using Portkey middleware with Claude
const PORTKEY_API_KEY = 'MfSPscvdmxTj8jGpP34lq41axRRK';
const PORTKEY_BASE_URL = 'https://api.portkey.ai';

// Available AI models via Portkey
const AI_MODELS = {
  'claude-sonnet': '@vertexai-global/anthropic.claude-sonnet-4-5@20250929',
  'claude-haiku': '@vertexai-global/anthropic.claude-haiku-4-5@20251001',
  'claude-opus': '@vertexai-global/anthropic.claude-opus-4-5@20251101',
};
const DEFAULT_MODEL = 'claude-sonnet';

// Get available models
app.get('/api/ai/models', (req, res) => {
  res.json({
    models: [
      { id: 'claude-sonnet', name: 'Claude Sonnet 4.5', description: 'Fast & capable (Recommended)' },
      { id: 'claude-haiku', name: 'Claude Haiku 4.5', description: 'Fastest responses' },
      { id: 'claude-opus', name: 'Claude Opus 4.5', description: 'Most capable' },
    ],
    default: DEFAULT_MODEL,
  });
});

// AI Bookmarks endpoints (stored in separate file)
let bookmarkData = loadBookmarks();

app.get('/api/ai/bookmarks', (req, res) => {
  res.json(bookmarkData.bookmarks || []);
});

app.post('/api/ai/bookmarks', (req, res) => {
  const { question, answer, model } = req.body;
  const bookmark = {
    id: bookmarkData.nextBookmarkId++,
    question,
    answer,  // Store complete answer
    model: model || DEFAULT_MODEL,
    createdAt: new Date().toISOString(),
  };
  bookmarkData.bookmarks.unshift(bookmark); // Add to beginning
  saveBookmarks(bookmarkData);
  res.json(bookmark);
});

app.delete('/api/ai/bookmarks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  bookmarkData.bookmarks = bookmarkData.bookmarks.filter(b => b.id !== id);
  saveBookmarks(bookmarkData);
  res.json({ success: true });
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, portfolioContext, history, model } = req.body;

    // Get the model to use
    const selectedModel = AI_MODELS[model] || AI_MODELS[DEFAULT_MODEL];

    const systemPrompt = `You are an expert financial advisor and portfolio analyst. You help users understand and optimize their investment portfolios.

You have access to the user's current portfolio data. When analyzing their portfolio:
- Provide specific, actionable insights based on their actual holdings
- Calculate and mention specific numbers (values, percentages)
- Identify risks like over-concentration, sector exposure, underperformers
- Suggest rebalancing actions with clear reasoning
- Be concise but thorough
- Use bullet points for readability
- Always be helpful and educational
- If user asks general questions not related to portfolio, still be helpful

${portfolioContext}`;

    // Call Claude via Portkey middleware
    const response = await axios.post(
      `${PORTKEY_BASE_URL}/v1/messages`,
      {
        model: selectedModel,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          ...history.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          { role: 'user', content: message },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-portkey-api-key': PORTKEY_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        timeout: 120000,
      }
    );

    const aiResponse = response.data.content[0].text;
    res.json({ response: aiResponse, model: model || DEFAULT_MODEL });
  } catch (error) {
    console.error('AI Chat error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message ||
                        error.response?.data?.error ||
                        error.message ||
                        'Failed to get AI response';
    res.status(500).json({ error: errorMessage });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/renderer/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Stock Analyzer running at: http://localhost:${PORT}\n`);
});
