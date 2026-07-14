const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const XLSX = require('xlsx');
const XLSXStyle = require('xlsx-js-style');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const app = express();
const PORT = process.env.PORT || 3001;

// Helper function to format numbers - no decimals if >= 100, else 2 decimals (for display strings)
const fmt2 = (num) => {
  const n = Number(num) || 0;
  const decimals = Math.abs(n) >= 100 ? 0 : 2;
  return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// Helper function to round numbers - no decimals if >= 100, else 2 decimals (for Excel cell values)
const r2 = (num) => {
  const n = Number(num) || 0;
  return Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 100) / 100;
};

// Helper to get Excel number format based on value size
const getNumFmt = (num, prefix = '') => {
  const n = Math.abs(Number(num) || 0);
  return n >= 100 ? `${prefix}#,##0` : `${prefix}#,##0.00`;
};

// Helper for CSV - format number with conditional decimals
const csvNum = (num) => {
  const n = Number(num) || 0;
  return Math.abs(n) >= 100 ? Math.round(n).toString() : n.toFixed(2);
};

// File upload setup
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist/renderer')));

// Simple JSON file storage
const dataPath = path.join(__dirname, 'data.json');
const bookmarksPath = path.join(__dirname, 'ai_bookmarks.json');
const settingsPath = path.join(__dirname, 'settings.json');

// Default settings configuration
const DEFAULT_SETTINGS = {
  aiProvider: 'anthropic',
  portkeyApiKey: process.env.PORTKEY_API_KEY || 'MfSPscvdmxTj8jGpP34lq41axRRK',
  claudeModel: 'claude-sonnet',
  maxTokens: 20000,
  temperature: 0.7,
  extendedThinking: false,
  // API key profiles for easy switching
  apiKeyProfiles: [
    {
      id: 'default',
      name: 'Default Key',
      key: 'MfSPscvdmxTj8jGpP34lq41axRRK',
      isActive: true,
      createdAt: new Date().toISOString(),
    }
  ],
  activeProfileId: 'default',
};

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

// Settings management functions
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const loaded = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      // Merge with defaults to ensure all fields exist
      return { ...DEFAULT_SETTINGS, ...loaded };
    }
  } catch (err) {
    console.error('Error loading settings:', err.message);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving settings:', err.message);
    return false;
  }
}

function maskApiKey(key) {
  if (!key) return null;
  if (key.length <= 10) return '***';
  return key.substring(0, 7) + '...' + key.substring(key.length - 4);
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
  // Real Estate
  'ANANTRAJ': 'ANANTRAJ',
  // Hotels
  'ITCHOTELS': 'ITCHOTELS',
  // Cement
  'JSWCEMENT': 'JSWCEMENT',
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

// ===== SETTINGS ENDPOINTS =====

// Get current settings (with masked API key)
app.get('/api/settings', (req, res) => {
  try {
    const settings = loadSettings();
    res.json({
      aiProvider: settings.aiProvider || 'anthropic',
      portkeyApiKey: maskApiKey(settings.portkeyApiKey),
      portkeyApiKeySet: !!settings.portkeyApiKey,
      claudeModel: settings.claudeModel || 'claude-sonnet',
      maxTokens: settings.maxTokens || 20000,
      temperature: settings.temperature || 0.7,
      extendedThinking: settings.extendedThinking || false,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update settings
app.post('/api/settings', (req, res) => {
  try {
    const { aiProvider, portkeyApiKey, claudeModel, maxTokens, temperature, extendedThinking } = req.body;
    const settings = loadSettings();

    // Update only provided fields
    if (aiProvider !== undefined) {
      // Validate provider
      if (!['anthropic', 'openai', 'google'].includes(aiProvider)) {
        return res.status(400).json({ error: 'Invalid AI provider' });
      }
      settings.aiProvider = aiProvider;
    }
    if (portkeyApiKey !== undefined) {
      // Validate API key format (basic check) - accept any non-empty string
      // Actual validation happens via test connection
      if (portkeyApiKey && portkeyApiKey.trim().length < 10) {
        return res.status(400).json({ error: 'API key seems too short. Please check and try again.' });
      }
      settings.portkeyApiKey = portkeyApiKey;
    }
    if (claudeModel !== undefined) settings.claudeModel = claudeModel;
    if (maxTokens !== undefined) settings.maxTokens = maxTokens;
    if (temperature !== undefined) settings.temperature = temperature;
    if (extendedThinking !== undefined) settings.extendedThinking = extendedThinking;

    const saved = saveSettings(settings);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save settings' });
    }

    res.json({
      success: true,
      message: 'Settings saved successfully',
      settings: {
        aiProvider: settings.aiProvider,
        portkeyApiKey: maskApiKey(settings.portkeyApiKey),
        portkeyApiKeySet: !!settings.portkeyApiKey,
        claudeModel: settings.claudeModel,
        maxTokens: settings.maxTokens,
        temperature: settings.temperature,
        extendedThinking: settings.extendedThinking,
      }
    });
  } catch (error) {
    console.error('Save settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test Portkey API connection
app.post('/api/settings/test', async (req, res) => {
  try {
    const { portkeyApiKey } = req.body;

    if (!portkeyApiKey) {
      return res.status(400).json({ success: false, message: 'API key is required' });
    }

    console.log('Testing Portkey API connection...');
    console.log('API Key (masked):', maskApiKey(portkeyApiKey));

    // Build headers - only add anthropic-version for Claude
    const settings = loadSettings();
    const provider = settings?.aiProvider || 'anthropic';
    const headers = {
      'Content-Type': 'application/json',
      'x-portkey-api-key': portkeyApiKey,
    };

    if (provider === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01';
    }

    // Test API call to Portkey - use exact same format as AI chat
    const testResponse = await axios.post(
      'https://api.portkey.ai/v1/messages',
      {
        model: '@vertexai-global/anthropic.claude-sonnet-4-5@20250929',
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Say "API key is working" in 5 words or less.' }],
      },
      {
        headers: headers,
        timeout: 15000,
      }
    );

    console.log('Test response status:', testResponse.status);

    if (testResponse.status === 200 && testResponse.data) {
      console.log('✓ Connection successful');
      res.json({
        success: true,
        message: 'Connection successful! API key is valid and working.'
      });
    } else {
      console.log('✗ Unexpected response:', testResponse.status);
      res.status(400).json({
        success: false,
        message: 'Unexpected response from Portkey API. Please check your key.'
      });
    }
  } catch (error) {
    console.error('Test connection error:', error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code,
    });

    let errorMessage = 'Connection failed. ';

    if (error.response?.status === 401 || error.response?.status === 403) {
      errorMessage += 'Invalid API key or insufficient permissions.';
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorMessage += 'Connection timeout. Please check your internet connection.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage += 'Could not reach Portkey servers. Check your internet connection.';
    } else if (error.response?.data?.error) {
      // Extract error message from Portkey/Anthropic API response
      const apiError = error.response.data.error;
      errorMessage += apiError.message || apiError.type || 'Unknown API error';
    } else {
      errorMessage += error.message;
    }

    res.status(400).json({ success: false, message: errorMessage });
  }
});

// API Key Profiles Management
app.get('/api/settings/profiles', (req, res) => {
  try {
    const settings = loadSettings();
    const profiles = settings.apiKeyProfiles || [];

    // Return profiles with masked keys
    const maskedProfiles = profiles.map(p => ({
      id: p.id,
      name: p.name,
      key: maskApiKey(p.key),
      isActive: p.id === settings.activeProfileId,
      createdAt: p.createdAt,
    }));

    res.json({
      profiles: maskedProfiles,
      activeProfileId: settings.activeProfileId || 'default',
    });
  } catch (error) {
    console.error('Get profiles error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings/profiles', (req, res) => {
  try {
    const { name, key } = req.body;

    if (!name || !key) {
      return res.status(400).json({ error: 'Name and API key are required' });
    }

    if (key.trim().length < 10) {
      return res.status(400).json({ error: 'API key seems too short. Please check and try again.' });
    }

    const settings = loadSettings();
    const profiles = settings.apiKeyProfiles || [];

    // Generate unique ID
    const id = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check for duplicate names
    if (profiles.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: 'A profile with this name already exists' });
    }

    // Add new profile
    const newProfile = {
      id,
      name,
      key,
      isActive: false,
      createdAt: new Date().toISOString(),
    };

    profiles.push(newProfile);
    settings.apiKeyProfiles = profiles;

    const saved = saveSettings(settings);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save profile' });
    }

    res.json({
      success: true,
      message: 'Profile created successfully',
      profile: {
        id: newProfile.id,
        name: newProfile.name,
        key: maskApiKey(newProfile.key),
        isActive: false,
        createdAt: newProfile.createdAt,
      }
    });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings/profiles/:id/activate', (req, res) => {
  try {
    const { id } = req.params;
    const settings = loadSettings();
    const profiles = settings.apiKeyProfiles || [];

    const profile = profiles.find(p => p.id === id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Set as active profile
    settings.activeProfileId = id;
    settings.portkeyApiKey = profile.key; // Update main API key

    const saved = saveSettings(settings);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to activate profile' });
    }

    res.json({
      success: true,
      message: `Profile "${profile.name}" is now active`,
      activeProfileId: id,
    });
  } catch (error) {
    console.error('Activate profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/settings/profiles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const settings = loadSettings();
    const profiles = settings.apiKeyProfiles || [];

    // Don't allow deleting default profile
    if (id === 'default') {
      return res.status(400).json({ error: 'Cannot delete the default profile' });
    }

    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const deletedProfile = profiles[index];
    profiles.splice(index, 1);
    settings.apiKeyProfiles = profiles;

    // If deleted profile was active, switch to default
    if (settings.activeProfileId === id) {
      settings.activeProfileId = 'default';
      const defaultProfile = profiles.find(p => p.id === 'default');
      if (defaultProfile) {
        settings.portkeyApiKey = defaultProfile.key;
      }
    }

    const saved = saveSettings(settings);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to delete profile' });
    }

    res.json({
      success: true,
      message: `Profile "${deletedProfile.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// Get market indices (NIFTY 50, SENSEX, S&P 500, NASDAQ)
app.get('/api/market-indices', async (req, res) => {
  try {
    const indices = [
      { symbol: '^NSEI', name: 'NIFTY 50' },
      { symbol: '^BSESN', name: 'SENSEX' },
      { symbol: '^GSPC', name: 'S&P 500' },
      { symbol: '^IXIC', name: 'NASDAQ' },
    ];

    const data = await Promise.all(indices.map(async (index) => {
      try {
        const quote = await yahooFinance.quote(index.symbol);
        return {
          symbol: index.symbol,
          name: index.name,
          price: quote.regularMarketPrice || 0,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          previousClose: quote.regularMarketPreviousClose || 0,
        };
      } catch (err) {
        console.log(`Failed to fetch ${index.symbol}:`, err.message);
        return { symbol: index.symbol, name: index.name, price: 0, change: 0, changePercent: 0 };
      }
    }));

    res.json(data);
  } catch (error) {
    console.error('Market indices error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get stock quote
app.get('/api/quote/:symbol/:market', async (req, res) => {
  try {
    const { symbol, market } = req.params;
    const yahooSymbol = getYahooSymbol(symbol, market);

    // Get basic quote data
    const quote = await yahooFinance.quote(yahooSymbol);

    // Get additional fundamental data
    let roe = null;
    let profitMargin = null;
    try {
      const summary = await yahooFinance.quoteSummary(yahooSymbol, {
        modules: ['defaultKeyStatistics', 'financialData']
      });
      roe = summary.defaultKeyStatistics?.returnOnEquity?.raw;
      profitMargin = summary.financialData?.profitMargins?.raw;
    } catch (err) {
      // Some stocks don't have this data, that's okay
      console.log(`Fundamental data not available for ${yahooSymbol}`);
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
      roe: roe,  // Added ROE
      profitMargin: profitMargin,  // Added profit margin as bonus
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
    if (maxWeight > 25) warnings.push(`Highest concentration is ${maxWeight.toFixed(2)}% - consider rebalancing`);
    if (top5Weight > 70) warnings.push(`Top 5 holdings make up ${top5Weight.toFixed(2)}% of portfolio`);
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
          reason: `${h.symbol} represents ${h.weight.toFixed(2)}% of your portfolio`,
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
          reason: `Down ${Math.abs(h.pnlPercent).toFixed(2)}% (₹${Math.abs(h.pnl).toLocaleString()} loss). Consider tax-loss harvesting or averaging down`,
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
          reason: `Up ${h.pnlPercent.toFixed(2)}% with ${h.weight.toFixed(2)}% portfolio weight`,
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
          reason: `${sector} represents ${weight.toFixed(2)}% of portfolio - too concentrated`,
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

// Analytics Export - Excel
app.get('/api/analytics/export/excel', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().split('T')[0];

    // Get data
    const healthRes = await axios.get(`http://localhost:${PORT}/api/portfolio/health`);
    const allocationRes = await axios.get(`http://localhost:${PORT}/api/portfolio/allocation`);
    const health = healthRes.data;
    const allocation = allocationRes.data;

    const styles = {
      title: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E3A5F" } }, alignment: { horizontal: "center" } },
      header: { font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2563EB" } }, alignment: { horizontal: "center" } },
      sectionHeader: { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "475569" } }, alignment: { horizontal: "left" } },
      profit: { font: { bold: true, color: { rgb: "059669" } } },
      loss: { font: { bold: true, color: { rgb: "DC2626" } } },
      label: { font: { bold: true }, fill: { fgColor: { rgb: "E2E8F0" } } },
      value: { alignment: { horizontal: "right" } },
    };

    const wb = XLSXStyle.utils.book_new();

    // Summary Sheet
    const summaryData = [
      [{ v: 'PORTFOLIO ANALYTICS REPORT', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }],
      [{ v: `Generated: ${new Date().toLocaleString()}`, s: { font: { italic: true, color: { rgb: "6B7280" } } } }],
      [],
      [{ v: 'PORTFOLIO OVERVIEW', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }],
      [{ v: 'Total Value', s: styles.label }, { v: r2(health.metrics?.totalValue), s: { ...styles.value, numFmt: "₹#,##0.00" } }],
      [{ v: 'Total Invested', s: styles.label }, { v: r2(health.metrics?.totalInvested), s: { ...styles.value, numFmt: "₹#,##0.00" } }],
      [{ v: 'Total P&L', s: styles.label }, { v: r2(health.metrics?.totalPnL), s: { ...(health.metrics?.totalPnL >= 0 ? styles.profit : styles.loss), numFmt: "₹#,##0.00" } }],
      [{ v: 'P&L %', s: styles.label }, { v: r2(health.metrics?.totalPnLPercent), s: { ...(health.metrics?.totalPnL >= 0 ? styles.profit : styles.loss), numFmt: "0.00\\%" } }],
      [],
      [{ v: 'HEALTH SCORES', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }],
      [{ v: 'Overall Score', s: styles.label }, { v: health.overallScore }],
      [{ v: 'Diversification Score', s: styles.label }, { v: health.diversificationScore }],
      [{ v: 'Risk Score', s: styles.label }, { v: health.riskScore }],
      [],
      [{ v: 'HOLDINGS BREAKDOWN', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }],
      [{ v: 'Total Holdings', s: styles.label }, { v: health.metrics?.numHoldings }],
      [{ v: 'Winners', s: styles.label }, { v: health.metrics?.numWinners, s: styles.profit }],
      [{ v: 'Losers', s: styles.label }, { v: health.metrics?.numLosers, s: styles.loss }],
      [{ v: 'Top 5 Concentration', s: styles.label }, { v: r2(health.metrics?.top5Weight), s: { ...styles.value, numFmt: "0.00\\%" } }],
    ];
    const ws1 = XLSXStyle.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }];
    ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    XLSXStyle.utils.book_append_sheet(wb, ws1, 'Summary');

    // Holdings Sheet
    const holdingsData = [
      [{ v: 'HOLDINGS PERFORMANCE', s: styles.title }, '', '', '', '', ''],
      [],
      [{ v: 'Symbol', s: styles.header }, { v: 'Name', s: styles.header }, { v: 'Weight %', s: styles.header }, { v: 'Current Value', s: styles.header }, { v: 'P&L', s: styles.header }, { v: 'P&L %', s: styles.header }],
    ];
    (health.holdings || []).forEach((h, i) => {
      const pnlStyle = h.pnl >= 0 ? styles.profit : styles.loss;
      holdingsData.push([
        { v: h.symbol }, { v: h.name },
        { v: r2(h.weight), s: { numFmt: "0.00\\%" } },
        { v: r2(h.currentValue), s: { numFmt: "₹#,##0.00" } },
        { v: r2(h.pnl), s: { ...pnlStyle, numFmt: "₹#,##0.00" } },
        { v: r2(h.pnlPercent), s: { ...pnlStyle, numFmt: "0.00\\%" } },
      ]);
    });
    const ws2 = XLSXStyle.utils.aoa_to_sheet(holdingsData);
    ws2['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
    XLSXStyle.utils.book_append_sheet(wb, ws2, 'Holdings');

    // Allocation Sheet
    const allocData = [
      [{ v: 'PORTFOLIO ALLOCATION', s: styles.title }, '', '', ''],
      [],
      [{ v: 'BY MARKET', s: styles.sectionHeader }, '', '', ''],
      [{ v: 'Market', s: styles.header }, { v: 'Value', s: styles.header }, { v: 'Allocation', s: styles.header }],
    ];
    (allocation.byMarket || []).forEach(m => {
      allocData.push([{ v: m.name }, { v: r2(m.value), s: { numFmt: "₹#,##0.00" } }, { v: r2(m.percentage), s: { numFmt: "0.00\\%" } }]);
    });
    allocData.push([]);
    allocData.push([{ v: 'BY TYPE', s: styles.sectionHeader }, '', '']);
    allocData.push([{ v: 'Type', s: styles.header }, { v: 'Value', s: styles.header }, { v: 'Allocation', s: styles.header }]);
    (allocation.byType || []).forEach(t => {
      allocData.push([{ v: t.name }, { v: r2(t.value), s: { numFmt: "₹#,##0.00" } }, { v: r2(t.percentage), s: { numFmt: "0.00\\%" } }]);
    });
    const ws3 = XLSXStyle.utils.aoa_to_sheet(allocData);
    ws3['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 12 }];
    XLSXStyle.utils.book_append_sheet(wb, ws3, 'Allocation');

    // Recommendations Sheet
    const recsData = [
      [{ v: 'RECOMMENDATIONS & WARNINGS', s: styles.title }, '', '', ''],
      [],
      [{ v: 'Priority', s: styles.header }, { v: 'Action', s: styles.header }, { v: 'Reason', s: styles.header }, { v: 'Type', s: styles.header }],
    ];
    (health.recommendations || []).forEach(r => {
      recsData.push([{ v: r.priority }, { v: r.action }, { v: r.reason }, { v: r.type }]);
    });
    recsData.push([]);
    recsData.push([{ v: 'WARNINGS', s: styles.sectionHeader }, '', '', '']);
    (health.warnings || []).forEach(w => {
      recsData.push([{ v: '⚠️' }, { v: w }, '', '']);
    });
    const ws4 = XLSXStyle.utils.aoa_to_sheet(recsData);
    ws4['!cols'] = [{ wch: 10 }, { wch: 35 }, { wch: 45 }, { wch: 15 }];
    XLSXStyle.utils.book_append_sheet(wb, ws4, 'Recommendations');

    const buf = XLSXStyle.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=portfolio_analytics_${timestamp}.xlsx`);
    res.send(buf);
  } catch (error) {
    console.error('Analytics Excel export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analytics Export - CSV
app.get('/api/analytics/export/csv', async (req, res) => {
  try {
    const healthRes = await axios.get(`http://localhost:${PORT}/api/portfolio/health`);
    const health = healthRes.data;
    const timestamp = new Date().toISOString().split('T')[0];

    let csv = 'Symbol,Name,Weight %,Current Value,P&L,P&L %\n';
    (health.holdings || []).forEach(h => {
      csv += `"${h.symbol}","${h.name}",${(h.weight || 0).toFixed(2)}%,${csvNum(h.currentValue)},${csvNum(h.pnl)},${(h.pnlPercent || 0).toFixed(2)}%\n`;
    });
    csv += `\nTotal Value,${csvNum(health.metrics?.totalValue)}\n`;
    csv += `Total Invested,${csvNum(health.metrics?.totalInvested)}\n`;
    csv += `Total P&L,${csvNum(health.metrics?.totalPnL)}\n`;
    csv += `Overall Score,${health.overallScore}\n`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=portfolio_analytics_${timestamp}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics Export - Markdown
app.get('/api/analytics/export/md', async (req, res) => {
  try {
    const healthRes = await axios.get(`http://localhost:${PORT}/api/portfolio/health`);
    const allocationRes = await axios.get(`http://localhost:${PORT}/api/portfolio/allocation`);
    const health = healthRes.data;
    const allocation = allocationRes.data;
    const timestamp = new Date().toISOString().split('T')[0];

    let md = `# Portfolio Analytics Report\n\n`;
    md += `Generated: ${new Date().toLocaleString()}\n\n`;
    md += `## Portfolio Overview\n\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Total Value | ₹${fmt2(health.metrics?.totalValue)} |\n`;
    md += `| Total Invested | ₹${fmt2(health.metrics?.totalInvested)} |\n`;
    md += `| Total P&L | ₹${fmt2(health.metrics?.totalPnL)} (${(health.metrics?.totalPnLPercent || 0).toFixed(2)}%) |\n`;
    md += `| Holdings | ${health.metrics?.numHoldings} (${health.metrics?.numWinners} winners, ${health.metrics?.numLosers} losers) |\n\n`;
    md += `## Health Scores\n\n`;
    md += `- **Overall**: ${health.overallScore}/100\n`;
    md += `- **Diversification**: ${health.diversificationScore}/100\n`;
    md += `- **Risk**: ${health.riskScore}/100\n\n`;
    md += `## Top Holdings\n\n`;
    md += `| Symbol | Weight | P&L % |\n|--------|--------|-------|\n`;
    (health.holdings || []).slice(0, 10).forEach(h => {
      md += `| ${h.symbol} | ${(h.weight || 0).toFixed(2)}% | ${(h.pnlPercent || 0).toFixed(2)}% |\n`;
    });
    md += `\n## Recommendations\n\n`;
    (health.recommendations || []).forEach(r => {
      md += `- **[${r.priority}]** ${r.action}: ${r.reason}\n`;
    });
    if (health.warnings?.length) {
      md += `\n## Warnings\n\n`;
      health.warnings.forEach(w => { md += `- ⚠️ ${w}\n`; });
    }
    md += `\n---\n*Report generated by Stock Analyzer*\n`;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename=portfolio_analytics_${timestamp}.md`);
    res.send(md);
  } catch (error) {
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

      if (pnlPercent > 50) rationale.push(`Strong gain: ${pnlPercent.toFixed(2)}% profit`);
      if (pnlPercent < -15) rationale.push(`Significant loss: ${pnlPercent.toFixed(2)}%`);

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
          message: `${dayChangePercent > 0 ? 'Up' : 'Down'} ${Math.abs(dayChangePercent).toFixed(2)}% today`,
          value: dayChangePercent,
        });
      }

      // Alert: Concentrated position
      if (allocation > 10) {
        alerts.push({
          type: 'CONCENTRATION',
          priority: allocation > 15 ? 'HIGH' : 'MEDIUM',
          symbol: holding.symbol,
          message: `High allocation: ${allocation.toFixed(2)}% of portfolio`,
          value: allocation,
        });
      }

      // Alert: Large loss
      if (pnlPercent < -20) {
        alerts.push({
          type: 'LOSS',
          priority: pnlPercent < -30 ? 'HIGH' : 'MEDIUM',
          symbol: holding.symbol,
          message: `Down ${Math.abs(pnlPercent).toFixed(2)}% from purchase`,
          value: pnlPercent,
        });
      }

      // Alert: Large gain (consider booking profits)
      if (pnlPercent > 50) {
        alerts.push({
          type: 'PROFIT',
          priority: 'LOW',
          symbol: holding.symbol,
          message: `Up ${pnlPercent.toFixed(2)}% - consider partial profit booking`,
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

// === RECOMMENDATIONS BOOKMARKS ===

const recBookmarksPath = path.join(__dirname, 'recommendations_bookmarks.json');

function loadRecBookmarks() {
  try {
    if (fs.existsSync(recBookmarksPath)) {
      const loaded = JSON.parse(fs.readFileSync(recBookmarksPath, 'utf-8'));
      return {
        bookmarks: loaded.bookmarks || [],
        nextId: loaded.nextId || 1,
      };
    }
  } catch {}
  return { bookmarks: [], nextId: 1 };
}

function saveRecBookmarks(bookmarkData) {
  fs.writeFileSync(recBookmarksPath, JSON.stringify(bookmarkData, null, 2));
}

// Get all recommendation bookmarks
app.get('/api/recommendations/bookmarks', (req, res) => {
  const bookmarks = loadRecBookmarks();
  res.json(bookmarks.bookmarks);
});

// Save recommendation bookmark
app.post('/api/recommendations/bookmarks', (req, res) => {
  const bookmarks = loadRecBookmarks();
  const { type, symbol, data: bookmarkData, notes, market } = req.body;

  const bookmark = {
    id: bookmarks.nextId++,
    type, // 'portfolio' | 'sectors' | 'alerts' | 'stock'
    symbol: symbol || null,
    data: bookmarkData,
    notes: notes || '',
    market: market || 'NSE',
    createdAt: new Date().toISOString(),
  };

  bookmarks.bookmarks.push(bookmark);
  saveRecBookmarks(bookmarks);
  res.json(bookmark);
});

// Delete recommendation bookmark
app.delete('/api/recommendations/bookmarks/:id', (req, res) => {
  const bookmarks = loadRecBookmarks();
  const id = parseInt(req.params.id);
  bookmarks.bookmarks = bookmarks.bookmarks.filter(b => b.id !== id);
  saveRecBookmarks(bookmarks);
  res.json({ success: true });
});

// Export recommendations as CSV
app.get('/api/recommendations/export/csv/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { market } = req.query;

    let csvContent = '';
    const timestamp = new Date().toISOString().split('T')[0];

    if (type === 'portfolio') {
      // Get recommendations data
      const marketFilter = market || 'NSE';
      const marketHoldings = data.holdings.filter(h => {
        if (marketFilter === 'NSE') return h.market === 'NSE' || h.market === 'BSE';
        if (marketFilter === 'NYSE') return h.market === 'NYSE' || h.market === 'NASDAQ';
        return true;
      });

      csvContent = 'Symbol,Name,Market,Quantity,Avg Price,Current Price,P&L,P&L %,Signal,Score,Tax Status,Days Held\n';

      for (const h of marketHoldings) {
        const pnl = ((h.currentPrice || h.avgPrice) - h.avgPrice) * h.quantity;
        const pnlPercent = h.avgPrice > 0 ? ((h.currentPrice || h.avgPrice) - h.avgPrice) / h.avgPrice * 100 : 0;
        const purchaseDate = new Date(h.purchaseDate);
        const daysHeld = Math.floor((new Date() - purchaseDate) / (1000 * 60 * 60 * 24));
        const taxStatus = daysHeld >= 365 ? 'LTCG' : 'STCG';

        csvContent += `"${h.symbol}","${h.name}","${h.market}",${h.quantity},${csvNum(h.avgPrice)},${csvNum(h.currentPrice || h.avgPrice)},${csvNum(pnl)},${pnlPercent.toFixed(2)}%,HOLD,50,${taxStatus},${daysHeld}\n`;
      }
    } else if (type === 'alerts') {
      csvContent = 'Type,Priority,Symbol,Message,Value\n';

      for (const h of data.holdings) {
        const pnlPercent = h.avgPrice > 0 ? ((h.currentPrice || h.avgPrice) - h.avgPrice) / h.avgPrice * 100 : 0;
        if (pnlPercent < -20) {
          csvContent += `LOSS,${pnlPercent < -30 ? 'HIGH' : 'MEDIUM'},"${h.symbol}","Down ${Math.abs(pnlPercent).toFixed(2)}% from purchase",${pnlPercent.toFixed(2)}\n`;
        }
        if (pnlPercent > 50) {
          csvContent += `PROFIT,LOW,"${h.symbol}","Up ${pnlPercent.toFixed(2)}% - consider profit booking",${pnlPercent.toFixed(2)}\n`;
        }
      }
    } else if (type === 'sectors') {
      csvContent = 'Sector,Value,Allocation %,Benchmark %,Status\n';

      let totalValue = 0;
      const sectorValues = {};
      for (const h of data.holdings) {
        const value = (h.currentPrice || h.avgPrice) * h.quantity;
        totalValue += value;
        const sector = h.sector || 'Unknown';
        sectorValues[sector] = (sectorValues[sector] || 0) + value;
      }

      const benchmark = { 'Financial Services': 25, 'IT': 15, 'Consumer Goods': 12, 'Pharma': 10, 'Auto': 8, 'Energy': 8 };

      for (const [sector, value] of Object.entries(sectorValues)) {
        const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
        const bench = benchmark[sector] || 5;
        const status = pct > bench * 1.5 ? 'Overweight' : pct < bench * 0.5 ? 'Underweight' : 'Normal';
        csvContent += `"${sector}",${csvNum(value)},${pct.toFixed(2)}%,${bench}%,${status}\n`;
      }
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=recommendations_${type}_${timestamp}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export recommendations as Excel with professional styling
app.get('/api/recommendations/export/excel', async (req, res) => {
  try {
    const { market } = req.query;
    const timestamp = new Date().toISOString().split('T')[0];

    // Style definitions
    const styles = {
      title: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E3A5F" } }, alignment: { horizontal: "center" } },
      subtitle: { font: { bold: true, sz: 11, color: { rgb: "1E3A5F" } }, alignment: { horizontal: "left" } },
      header: { font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2563EB" } }, alignment: { horizontal: "center" }, border: { bottom: { style: "medium", color: { rgb: "1E3A5F" } } } },
      headerGreen: { font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "059669" } }, alignment: { horizontal: "center" } },
      headerRed: { font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "DC2626" } }, alignment: { horizontal: "center" } },
      headerYellow: { font: { bold: true, sz: 11, color: { rgb: "000000" } }, fill: { fgColor: { rgb: "F59E0B" } }, alignment: { horizontal: "center" } },
      dataOdd: { fill: { fgColor: { rgb: "F8FAFC" } }, alignment: { horizontal: "left" } },
      dataEven: { fill: { fgColor: { rgb: "FFFFFF" } }, alignment: { horizontal: "left" } },
      profit: { font: { bold: true, color: { rgb: "059669" } }, alignment: { horizontal: "right" } },
      loss: { font: { bold: true, color: { rgb: "DC2626" } }, alignment: { horizontal: "right" } },
      strongBuy: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "059669" } }, alignment: { horizontal: "center" } },
      buy: { font: { bold: true, color: { rgb: "059669" } }, fill: { fgColor: { rgb: "D1FAE5" } }, alignment: { horizontal: "center" } },
      hold: { font: { bold: true, color: { rgb: "92400E" } }, fill: { fgColor: { rgb: "FEF3C7" } }, alignment: { horizontal: "center" } },
      sell: { font: { bold: true, color: { rgb: "DC2626" } }, fill: { fgColor: { rgb: "FEE2E2" } }, alignment: { horizontal: "center" } },
      strongSell: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "DC2626" } }, alignment: { horizontal: "center" } },
      ltcg: { font: { color: { rgb: "059669" } }, fill: { fgColor: { rgb: "D1FAE5" } }, alignment: { horizontal: "center" } },
      stcg: { font: { color: { rgb: "92400E" } }, fill: { fgColor: { rgb: "FEF3C7" } }, alignment: { horizontal: "center" } },
      summaryLabel: { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: "E2E8F0" } }, alignment: { horizontal: "left" } },
      summaryValue: { font: { bold: true, sz: 11 }, alignment: { horizontal: "right" } },
      sectionHeader: { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "475569" } }, alignment: { horizontal: "left" } },
      high: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "DC2626" } }, alignment: { horizontal: "center" } },
      medium: { font: { bold: true, color: { rgb: "000000" } }, fill: { fgColor: { rgb: "F59E0B" } }, alignment: { horizontal: "center" } },
      low: { font: { bold: true, color: { rgb: "059669" } }, fill: { fgColor: { rgb: "D1FAE5" } }, alignment: { horizontal: "center" } },
      overweight: { font: { color: { rgb: "92400E" } }, fill: { fgColor: { rgb: "FEF3C7" } }, alignment: { horizontal: "center" } },
      underweight: { font: { color: { rgb: "1E40AF" } }, fill: { fgColor: { rgb: "DBEAFE" } }, alignment: { horizontal: "center" } },
      normal: { font: { color: { rgb: "059669" } }, fill: { fgColor: { rgb: "D1FAE5" } }, alignment: { horizontal: "center" } },
      number: { alignment: { horizontal: "right" }, numFmt: "#,##0.00" },
      percent: { alignment: { horizontal: "right" }, numFmt: "0.00%" },
    };

    const wb = XLSXStyle.utils.book_new();
    const marketFilter = market || 'NSE';
    const marketHoldings = data.holdings.filter(h => {
      if (marketFilter === 'NSE') return h.market === 'NSE' || h.market === 'BSE';
      if (marketFilter === 'NYSE') return h.market === 'NYSE' || h.market === 'NASDAQ';
      return true;
    });

    // Calculate totals
    let totalInvested = 0, totalValue = 0, totalPnl = 0;
    const rowData = [];

    for (const h of marketHoldings) {
      const currentPrice = h.currentPrice || h.avgPrice;
      const pnl = (currentPrice - h.avgPrice) * h.quantity;
      const pnlPercent = h.avgPrice > 0 ? (currentPrice - h.avgPrice) / h.avgPrice * 100 : 0;
      const purchaseDate = new Date(h.purchaseDate);
      const daysHeld = Math.floor((new Date() - purchaseDate) / (1000 * 60 * 60 * 24));
      const taxStatus = daysHeld >= 365 ? 'LTCG' : 'STCG';

      let signal = 'HOLD';
      if (pnlPercent > 30) signal = 'STRONG BUY';
      else if (pnlPercent > 10) signal = 'BUY';
      else if (pnlPercent < -20) signal = 'STRONG SELL';
      else if (pnlPercent < -10) signal = 'SELL';

      totalInvested += h.avgPrice * h.quantity;
      totalValue += currentPrice * h.quantity;
      totalPnl += pnl;

      rowData.push({ symbol: h.symbol, name: h.name, market: h.market, qty: h.quantity, avgPrice: h.avgPrice, currentPrice, pnl, pnlPercent, signal, taxStatus, daysHeld });
    }
    rowData.sort((a, b) => b.pnl - a.pnl);

    // === PORTFOLIO SHEET ===
    const ws1Data = [];
    ws1Data.push([{ v: 'PORTFOLIO INSIGHTS REPORT', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }]);
    ws1Data.push([{ v: `Generated: ${new Date().toLocaleString()}`, s: styles.subtitle }, '', '', '', { v: `Market: ${marketFilter}`, s: styles.subtitle }, '', '', '', '', '', '']);
    ws1Data.push(['', '', '', '', '', '', '', '', '', '', '']);
    ws1Data.push([
      { v: 'Symbol', s: styles.header }, { v: 'Name', s: styles.header }, { v: 'Market', s: styles.header }, { v: 'Qty', s: styles.header },
      { v: 'Avg Price', s: styles.header }, { v: 'Current', s: styles.header }, { v: 'P&L', s: styles.header }, { v: 'P&L %', s: styles.header },
      { v: 'Signal', s: styles.header }, { v: 'Tax', s: styles.header }, { v: 'Days', s: styles.header }
    ]);

    rowData.forEach((r, i) => {
      const rowStyle = i % 2 === 0 ? styles.dataOdd : styles.dataEven;
      const pnlStyle = r.pnl >= 0 ? styles.profit : styles.loss;
      const signalStyle = r.signal === 'STRONG BUY' ? styles.strongBuy : r.signal === 'BUY' ? styles.buy : r.signal === 'HOLD' ? styles.hold : r.signal === 'SELL' ? styles.sell : styles.strongSell;
      const taxStyle = r.taxStatus === 'LTCG' ? styles.ltcg : styles.stcg;

      ws1Data.push([
        { v: r.symbol, s: rowStyle }, { v: r.name, s: rowStyle }, { v: r.market, s: rowStyle }, { v: r.qty, s: { ...rowStyle, alignment: { horizontal: "right" } } },
        { v: r2(r.avgPrice), s: { ...rowStyle, numFmt: "₹#,##0.00" } }, { v: r2(r.currentPrice), s: { ...rowStyle, numFmt: "₹#,##0.00" } },
        { v: r2(r.pnl), s: { ...pnlStyle, numFmt: "₹#,##0.00" } }, { v: r2(r.pnlPercent), s: { ...pnlStyle, numFmt: "0.00\\%" } },
        { v: r.signal, s: signalStyle }, { v: r.taxStatus, s: taxStyle }, { v: r.daysHeld, s: { ...rowStyle, alignment: { horizontal: "right" } } }
      ]);
    });

    ws1Data.push(['', '', '', '', '', '', '', '', '', '', '']);
    ws1Data.push([{ v: 'SUMMARY', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }, '', '', '', '', '', '']);
    ws1Data.push([{ v: 'Total Invested', s: styles.summaryLabel }, { v: r2(totalInvested), s: { ...styles.summaryValue, numFmt: "₹#,##0.00" } }, '', { v: 'Holdings', s: styles.summaryLabel }, { v: marketHoldings.length, s: styles.summaryValue }]);
    ws1Data.push([{ v: 'Current Value', s: styles.summaryLabel }, { v: r2(totalValue), s: { ...styles.summaryValue, numFmt: "₹#,##0.00" } }, '', { v: 'Profitable', s: styles.summaryLabel }, { v: rowData.filter(r => r.pnl > 0).length, s: { ...styles.summaryValue, ...styles.profit } }]);
    ws1Data.push([{ v: 'Total P&L', s: styles.summaryLabel }, { v: r2(totalPnl), s: { ...(totalPnl >= 0 ? styles.profit : styles.loss), numFmt: "₹#,##0.00" } }, '', { v: 'In Loss', s: styles.summaryLabel }, { v: rowData.filter(r => r.pnl < 0).length, s: { ...styles.summaryValue, ...styles.loss } }]);
    ws1Data.push([{ v: 'P&L %', s: styles.summaryLabel }, { v: r2((totalValue - totalInvested) / totalInvested * 100), s: { ...(totalPnl >= 0 ? styles.profit : styles.loss), numFmt: "0.00\\%" } }]);

    const ws1 = XLSXStyle.utils.aoa_to_sheet(ws1Data);
    ws1['!cols'] = [{ wch: 22 }, { wch: 30 }, { wch: 8 }, { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 6 }];
    ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];
    XLSXStyle.utils.book_append_sheet(wb, ws1, 'Portfolio');

    // === SECTORS SHEET ===
    let sectorTotal = 0;
    const sectorValues = {};
    for (const h of data.holdings) {
      const value = (h.currentPrice || h.avgPrice) * h.quantity;
      sectorTotal += value;
      const sector = h.sector || 'Unknown';
      sectorValues[sector] = (sectorValues[sector] || 0) + value;
    }

    const benchmark = { 'Financial Services': 25, 'IT': 15, 'Consumer Goods': 12, 'Pharma': 10, 'Auto': 8, 'Energy': 8, 'Infrastructure': 7, 'Metals': 5, 'Telecom': 4, 'Real Estate': 3 };
    const sectorRows = [];
    for (const [sector, value] of Object.entries(sectorValues)) {
      const pct = sectorTotal > 0 ? (value / sectorTotal) * 100 : 0;
      const bench = benchmark[sector] || 5;
      const deviation = pct - bench;
      const status = pct > bench * 1.5 ? 'OVERWEIGHT' : pct < bench * 0.5 ? 'UNDERWEIGHT' : 'NORMAL';
      sectorRows.push({ sector, value, pct, bench, status, deviation });
    }
    sectorRows.sort((a, b) => b.pct - a.pct);

    const ws2Data = [];
    ws2Data.push([{ v: 'SECTOR ANALYSIS', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }]);
    ws2Data.push([{ v: `Generated: ${new Date().toLocaleString()}`, s: styles.subtitle }]);
    ws2Data.push([]);
    ws2Data.push([{ v: 'Sector', s: styles.header }, { v: 'Value', s: styles.header }, { v: 'Allocation', s: styles.header }, { v: 'Benchmark', s: styles.header }, { v: 'Status', s: styles.header }, { v: 'Deviation', s: styles.header }]);

    sectorRows.forEach((r, i) => {
      const rowStyle = i % 2 === 0 ? styles.dataOdd : styles.dataEven;
      const statusStyle = r.status === 'OVERWEIGHT' ? styles.overweight : r.status === 'UNDERWEIGHT' ? styles.underweight : styles.normal;
      const devStyle = r.deviation >= 0 ? styles.profit : styles.loss;

      ws2Data.push([
        { v: r.sector, s: rowStyle }, { v: r2(r.value), s: { ...rowStyle, numFmt: "₹#,##0.00" } },
        { v: r2(r.pct), s: { ...rowStyle, numFmt: "0.00\\%" } }, { v: r2(r.bench), s: { ...rowStyle, numFmt: "0.00\\%" } },
        { v: r.status, s: statusStyle }, { v: r2(r.deviation), s: { ...devStyle, numFmt: "+0.00\\%;-0.00\\%" } }
      ]);
    });

    const ws2 = XLSXStyle.utils.aoa_to_sheet(ws2Data);
    ws2['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
    ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    XLSXStyle.utils.book_append_sheet(wb, ws2, 'Sectors');

    // === ALERTS SHEET ===
    const alertRows = [];
    for (const h of data.holdings) {
      const pnlPercent = h.avgPrice > 0 ? ((h.currentPrice || h.avgPrice) - h.avgPrice) / h.avgPrice * 100 : 0;
      const dayChange = h.dayChangePercent || 0;
      const currentValue = (h.currentPrice || h.avgPrice) * h.quantity;
      const allocation = sectorTotal > 0 ? (currentValue / sectorTotal) * 100 : 0;

      if (Math.abs(dayChange) > 3) alertRows.push({ priority: Math.abs(dayChange) > 5 ? 'HIGH' : 'MEDIUM', type: dayChange > 0 ? 'SURGE' : 'DROP', symbol: h.symbol, message: `${dayChange > 0 ? 'Up' : 'Down'} ${Math.abs(dayChange).toFixed(2)}% today`, value: dayChange });
      if (allocation > 10) alertRows.push({ priority: allocation > 15 ? 'HIGH' : 'MEDIUM', type: 'CONCENTRATION', symbol: h.symbol, message: `High allocation: ${allocation.toFixed(2)}%`, value: allocation });
      if (pnlPercent < -20) alertRows.push({ priority: pnlPercent < -30 ? 'HIGH' : 'MEDIUM', type: 'LOSS', symbol: h.symbol, message: `Down ${Math.abs(pnlPercent).toFixed(2)}% from purchase`, value: pnlPercent });
      if (pnlPercent > 50) alertRows.push({ priority: 'LOW', type: 'PROFIT', symbol: h.symbol, message: `Up ${pnlPercent.toFixed(2)}% - consider profit booking`, value: pnlPercent });
    }
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    alertRows.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const ws3Data = [];
    ws3Data.push([{ v: 'PORTFOLIO ALERTS', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }]);
    ws3Data.push([{ v: `Generated: ${new Date().toLocaleString()}`, s: styles.subtitle }]);
    ws3Data.push([]);
    ws3Data.push([{ v: 'Priority', s: styles.header }, { v: 'Type', s: styles.header }, { v: 'Symbol', s: styles.header }, { v: 'Message', s: styles.header }, { v: 'Value', s: styles.header }]);

    alertRows.forEach((r, i) => {
      const rowStyle = i % 2 === 0 ? styles.dataOdd : styles.dataEven;
      const priorityStyle = r.priority === 'HIGH' ? styles.high : r.priority === 'MEDIUM' ? styles.medium : styles.low;
      const typeStyle = r.type === 'SURGE' || r.type === 'PROFIT' ? styles.profit : r.type === 'DROP' || r.type === 'LOSS' ? styles.loss : styles.hold;

      ws3Data.push([
        { v: r.priority, s: priorityStyle }, { v: r.type, s: { ...rowStyle, ...typeStyle } },
        { v: r.symbol, s: rowStyle }, { v: r.message, s: rowStyle },
        { v: r2(r.value), s: { ...rowStyle, numFmt: "0.00\\%" } }
      ]);
    });

    const ws3 = XLSXStyle.utils.aoa_to_sheet(ws3Data);
    ws3['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 22 }, { wch: 40 }, { wch: 10 }];
    ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    XLSXStyle.utils.book_append_sheet(wb, ws3, 'Alerts');

    // === SUMMARY SHEET ===
    const ws4Data = [];
    ws4Data.push([{ v: 'PORTFOLIO RECOMMENDATIONS SUMMARY', s: styles.title }, { v: '', s: styles.title }, { v: '', s: styles.title }]);
    ws4Data.push([{ v: `Generated: ${new Date().toLocaleString()}`, s: styles.subtitle }, '', { v: `Market: ${marketFilter}`, s: styles.subtitle }]);
    ws4Data.push([]);
    ws4Data.push([{ v: 'PORTFOLIO OVERVIEW', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }]);
    ws4Data.push([{ v: 'Total Holdings', s: styles.summaryLabel }, { v: marketHoldings.length, s: styles.summaryValue }]);
    ws4Data.push([{ v: 'Total Invested', s: styles.summaryLabel }, { v: r2(totalInvested), s: { ...styles.summaryValue, numFmt: "₹#,##0.00" } }]);
    ws4Data.push([{ v: 'Current Value', s: styles.summaryLabel }, { v: r2(totalValue), s: { ...styles.summaryValue, numFmt: "₹#,##0.00" } }]);
    ws4Data.push([{ v: 'Total P&L', s: styles.summaryLabel }, { v: r2(totalPnl), s: { ...(totalPnl >= 0 ? styles.profit : styles.loss), numFmt: "₹#,##0.00" } }, { v: totalPnl >= 0 ? 'PROFIT' : 'LOSS', s: totalPnl >= 0 ? styles.strongBuy : styles.strongSell }]);
    ws4Data.push([{ v: 'P&L %', s: styles.summaryLabel }, { v: r2((totalValue - totalInvested) / totalInvested * 100), s: { ...(totalPnl >= 0 ? styles.profit : styles.loss), numFmt: "0.00\\%" } }]);
    ws4Data.push([]);
    ws4Data.push([{ v: 'SIGNALS BREAKDOWN', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }]);
    ws4Data.push([{ v: 'Strong Buy', s: styles.strongBuy }, { v: rowData.filter(r => r.signal === 'STRONG BUY').length, s: styles.summaryValue }]);
    ws4Data.push([{ v: 'Buy', s: styles.buy }, { v: rowData.filter(r => r.signal === 'BUY').length, s: styles.summaryValue }]);
    ws4Data.push([{ v: 'Hold', s: styles.hold }, { v: rowData.filter(r => r.signal === 'HOLD').length, s: styles.summaryValue }]);
    ws4Data.push([{ v: 'Sell', s: styles.sell }, { v: rowData.filter(r => r.signal === 'SELL').length, s: styles.summaryValue }]);
    ws4Data.push([{ v: 'Strong Sell', s: styles.strongSell }, { v: rowData.filter(r => r.signal === 'STRONG SELL').length, s: styles.summaryValue }]);
    ws4Data.push([]);
    ws4Data.push([{ v: 'TAX STATUS', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }, { v: '', s: styles.sectionHeader }]);
    ws4Data.push([{ v: 'LTCG Eligible', s: styles.ltcg }, { v: rowData.filter(r => r.taxStatus === 'LTCG').length, s: styles.summaryValue }]);
    ws4Data.push([{ v: 'STCG Holdings', s: styles.stcg }, { v: rowData.filter(r => r.taxStatus === 'STCG').length, s: styles.summaryValue }]);
    ws4Data.push([]);
    ws4Data.push([{ v: 'DISCLAIMER', s: { font: { italic: true, sz: 10, color: { rgb: "6B7280" } } } }]);
    ws4Data.push([{ v: 'This report is for informational purposes only. Not financial advice.', s: { font: { italic: true, sz: 9, color: { rgb: "9CA3AF" } } } }]);

    const ws4 = XLSXStyle.utils.aoa_to_sheet(ws4Data);
    ws4['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }];
    ws4['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    XLSXStyle.utils.book_append_sheet(wb, ws4, 'Summary');

    const buf = XLSXStyle.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=portfolio_recommendations_${timestamp}.xlsx`);
    res.send(buf);
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// === STOCK PICKER APIs ===

// Stock Recommendations Engine
app.post('/api/stock-recommendations', async (req, res) => {
  try {
    const { currentHoldings, riskProfile, investmentGoal, timeHorizon, market } = req.body;

    // Define stock universe based on market
    const stockUniverse = market === 'NSE' ? [
      // Banking
      { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', pe: 18.5, rsi: 55, dividendYield: 1.2, roe: 17.5, marketCap: 'LARGE' },
      { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking', pe: 16.2, rsi: 58, dividendYield: 1.5, roe: 16.8, marketCap: 'LARGE' },
      { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking', pe: 17.8, rsi: 52, dividendYield: 0.8, roe: 14.2, marketCap: 'LARGE' },
      // IT
      { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT', pe: 28.5, rsi: 60, dividendYield: 2.8, roe: 45.2, marketCap: 'LARGE' },
      { symbol: 'INFY', name: 'Infosys', sector: 'IT', pe: 25.3, rsi: 62, dividendYield: 2.5, roe: 31.5, marketCap: 'LARGE' },
      { symbol: 'WIPRO', name: 'Wipro', sector: 'IT', pe: 22.1, rsi: 48, dividendYield: 1.8, roe: 18.3, marketCap: 'LARGE' },
      // Pharma
      { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', sector: 'Pharma', pe: 32.5, rsi: 56, dividendYield: 0.9, roe: 14.8, marketCap: 'LARGE' },
      { symbol: 'DRREDDY', name: 'Dr Reddys Laboratories', sector: 'Pharma', pe: 29.8, rsi: 54, dividendYield: 0.7, roe: 13.2, marketCap: 'LARGE' },
      // Auto
      { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Auto', pe: 24.5, rsi: 59, dividendYield: 1.3, roe: 16.5, marketCap: 'LARGE' },
      { symbol: 'M&M', name: 'Mahindra & Mahindra', sector: 'Auto', pe: 22.3, rsi: 63, dividendYield: 1.1, roe: 18.7, marketCap: 'LARGE' },
      // FMCG
      { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', sector: 'FMCG', pe: 62.5, rsi: 51, dividendYield: 1.6, roe: 82.3, marketCap: 'LARGE' },
      { symbol: 'ITC', name: 'ITC Limited', sector: 'FMCG', pe: 28.9, rsi: 57, dividendYield: 3.2, roe: 24.5, marketCap: 'LARGE' },
      // Energy
      { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', pe: 26.8, rsi: 61, dividendYield: 0.5, roe: 9.8, marketCap: 'LARGE' },
      { symbol: 'ONGC', name: 'Oil & Natural Gas Corp', sector: 'Energy', pe: 8.5, rsi: 45, dividendYield: 5.2, roe: 11.2, marketCap: 'LARGE' },
    ] : [
      // US Stocks - Tech
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', pe: 28.5, rsi: 58, dividendYield: 0.5, roe: 147.5, marketCap: 'LARGE' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', pe: 32.8, rsi: 62, dividendYield: 0.8, roe: 43.2, marketCap: 'LARGE' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', pe: 24.2, rsi: 55, dividendYield: 0, roe: 28.5, marketCap: 'LARGE' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Technology', pe: 52.3, rsi: 60, dividendYield: 0, roe: 18.7, marketCap: 'LARGE' },
      // Finance
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Finance', pe: 12.5, rsi: 56, dividendYield: 2.5, roe: 15.8, marketCap: 'LARGE' },
      { symbol: 'BAC', name: 'Bank of America Corp', sector: 'Finance', pe: 11.8, rsi: 54, dividendYield: 2.8, roe: 11.2, marketCap: 'LARGE' },
      // Healthcare
      { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', pe: 24.5, rsi: 52, dividendYield: 2.6, roe: 25.3, marketCap: 'LARGE' },
      { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', pe: 18.2, rsi: 48, dividendYield: 3.5, roe: 12.5, marketCap: 'LARGE' },
      // Consumer
      { symbol: 'KO', name: 'Coca-Cola Company', sector: 'Consumer', pe: 26.3, rsi: 55, dividendYield: 3.0, roe: 40.2, marketCap: 'LARGE' },
      { symbol: 'PG', name: 'Procter & Gamble Co', sector: 'Consumer', pe: 27.5, rsi: 53, dividendYield: 2.4, roe: 32.8, marketCap: 'LARGE' },
    ];

    // Get user's current sector exposure
    const userSectors = {};
    currentHoldings.forEach(h => {
      if (h.sector) {
        userSectors[h.sector] = (userSectors[h.sector] || 0) + 1;
      }
    });

    const recommendations = [];

    for (const stock of stockUniverse) {
      // Skip if user already owns this stock
      if (currentHoldings.some(h => h.symbol === stock.symbol)) continue;

      // Calculate scores based on investment profile
      let score = 50;
      const rationale = [];

      // Risk Profile Scoring
      if (riskProfile === 'conservative') {
        if (stock.marketCap === 'LARGE') { score += 15; rationale.push('Large-cap stability suits conservative profile'); }
        if (stock.pe < 20) { score += 10; rationale.push(`Reasonable P/E ratio of ${stock.pe.toFixed(1)}`); }
        if (stock.dividendYield > 2) { score += 15; rationale.push(`Strong dividend yield of ${stock.dividendYield.toFixed(1)}%`); }
        if (stock.roe > 15) { score += 10; }
      } else if (riskProfile === 'moderate') {
        if (stock.pe < 25) { score += 10; }
        if (stock.rsi > 50 && stock.rsi < 70) { score += 15; rationale.push('Healthy momentum (RSI in optimal range)'); }
        if (stock.roe > 18) { score += 10; rationale.push(`Strong ROE of ${stock.roe.toFixed(1)}%`); }
      } else if (riskProfile === 'aggressive') {
        if (stock.rsi > 60) { score += 15; rationale.push('Strong momentum for growth'); }
        if (stock.roe > 25) { score += 15; rationale.push(`Excellent ROE of ${stock.roe.toFixed(1)}%`); }
        if (stock.sector === 'Technology' || stock.sector === 'IT') { score += 10; rationale.push('High-growth technology sector'); }
      }

      // Investment Goal Scoring
      if (investmentGoal === 'income') {
        if (stock.dividendYield > 2) { score += 20; }
        if (stock.dividendYield > 3) { score += 10; }
      } else if (investmentGoal === 'growth') {
        if (stock.rsi > 55) { score += 10; }
        if (stock.roe > 20) { score += 15; }
      }

      // Diversification Bonus - prefer sectors user doesn't have
      if (!userSectors[stock.sector]) {
        score += 20;
        rationale.push(`You have 0% exposure to ${stock.sector} sector`);
      } else if (userSectors[stock.sector] === 1) {
        score += 5;
        rationale.push(`Low exposure to ${stock.sector} sector`);
      }

      // Technical signals
      if (stock.rsi < 30) {
        rationale.push('Oversold - potential buying opportunity');
        score += 10;
      } else if (stock.rsi > 50 && stock.rsi < 70) {
        rationale.push('Positive momentum without being overbought');
      }

      if (stock.pe < 15) {
        rationale.push('Trading at attractive valuation');
      } else if (stock.pe > 30) {
        rationale.push('Premium valuation - priced for growth');
        if (riskProfile === 'conservative') score -= 10;
      }

      // Only recommend stocks with score > 60
      if (score >= 60) {
        // Fetch live price from Yahoo Finance
        let currentPrice = 1000; // Default
        let targetPrice = currentPrice * 1.15; // Default 15% upside

        try {
          const yahooSymbol = market === 'NSE' ? `${stock.symbol}.NS` : stock.symbol;
          const quote = await yahooFinance.quote(yahooSymbol);
          if (quote && quote.regularMarketPrice) {
            currentPrice = quote.regularMarketPrice;

            // Calculate target price based on time horizon and risk
            const horizonMultiplier = timeHorizon === '1year' ? 1.08 :
                                     timeHorizon === '3years' ? 1.15 :
                                     timeHorizon === '5years' ? 1.25 : 1.35;
            targetPrice = currentPrice * horizonMultiplier;
          }
        } catch (err) {
          console.log(`Failed to fetch price for ${stock.symbol}:`, err.message);
        }

        const upside = ((targetPrice - currentPrice) / currentPrice) * 100;

        recommendations.push({
          symbol: stock.symbol,
          name: stock.name,
          market: market,
          currentPrice: Math.round(currentPrice * 100) / 100,
          targetPrice: Math.round(targetPrice * 100) / 100,
          upside: Math.round(upside * 10) / 10,
          rating: score >= 80 ? 'STRONG_BUY' : score >= 70 ? 'BUY' : 'HOLD',
          rationale: rationale.slice(0, 4), // Top 4 reasons
          technicals: {
            pe: stock.pe,
            trend: stock.rsi > 55 ? 'Bullish' : stock.rsi < 45 ? 'Bearish' : 'Neutral',
            rsi: stock.rsi,
            above200DMA: stock.rsi > 50,
          },
          risk: stock.marketCap === 'LARGE' && stock.pe < 25 ? 'LOW' :
                stock.pe < 35 ? 'MEDIUM' : 'HIGH',
          sector: stock.sector,
          investmentRange: {
            min: market === 'NSE' ? 10000 : 1000,
            max: market === 'NSE' ? 50000 : 5000,
          },
          score,
        });
      }
    }

    // Sort by score descending and return top 8
    recommendations.sort((a, b) => b.score - a.score);
    res.json(recommendations.slice(0, 8));

  } catch (error) {
    console.error('Stock recommendations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Portfolio Gaps Analysis
app.post('/api/portfolio-gaps', async (req, res) => {
  try {
    const { currentHoldings, market } = req.body;

    // Nifty 50 benchmark sector weights (approximate)
    const nifty50Benchmark = {
      'Banking': 28.5,
      'IT': 17.2,
      'Energy': 12.8,
      'Auto': 8.5,
      'FMCG': 7.3,
      'Pharma': 6.2,
      'Metals': 5.8,
      'Telecom': 4.5,
      'Finance': 9.2,
    };

    // S&P 500 benchmark (simplified)
    const sp500Benchmark = {
      'Technology': 28.0,
      'Finance': 13.5,
      'Healthcare': 12.8,
      'Consumer': 10.5,
      'Industrial': 8.7,
      'Energy': 4.2,
      'Real Estate': 2.5,
      'Utilities': 2.8,
    };

    const benchmark = market === 'NSE' ? nifty50Benchmark : sp500Benchmark;

    // Calculate user's sector allocation
    const totalValue = currentHoldings.reduce((sum, h) => sum + h.value, 0);
    const userSectors = {};
    currentHoldings.forEach(h => {
      if (h.sector) {
        userSectors[h.sector] = (userSectors[h.sector] || 0) + h.value;
      }
    });

    const gaps = [];

    // Check each benchmark sector
    for (const [sector, benchmarkPct] of Object.entries(benchmark)) {
      const userValue = userSectors[sector] || 0;
      const userPct = totalValue > 0 ? (userValue / totalValue) * 100 : 0;
      const gap = userPct - benchmarkPct;

      let status;
      let recommendations = [];

      if (userPct === 0) {
        status = 'MISSING';
        recommendations.push(`Add ${sector} exposure to diversify portfolio`);

        // Suggest specific stocks
        if (market === 'NSE') {
          if (sector === 'Banking') recommendations.push('Consider: HDFC Bank, ICICI Bank');
          else if (sector === 'IT') recommendations.push('Consider: TCS, Infosys');
          else if (sector === 'Pharma') recommendations.push('Consider: Sun Pharma, Dr Reddy\'s');
          else if (sector === 'Auto') recommendations.push('Consider: Maruti Suzuki, M&M');
          else if (sector === 'Energy') recommendations.push('Consider: Reliance Industries');
        } else {
          if (sector === 'Technology') recommendations.push('Consider: AAPL, MSFT, GOOGL');
          else if (sector === 'Healthcare') recommendations.push('Consider: JNJ, PFE');
          else if (sector === 'Finance') recommendations.push('Consider: JPM, BAC');
        }
      } else if (userPct < benchmarkPct * 0.5) {
        status = 'UNDERWEIGHT';
        recommendations.push(`Increase ${sector} allocation to ${benchmarkPct.toFixed(1)}% (currently ${userPct.toFixed(1)}%)`);
        recommendations.push(`Add ${formatCurrency((benchmarkPct - userPct) * totalValue / 100, market === 'NSE' ? 'INR' : 'USD')} to reach benchmark`);
      } else if (userPct > benchmarkPct * 1.5) {
        status = 'OVERWEIGHT';
        recommendations.push(`Reduce ${sector} concentration risk`);
        recommendations.push(`Consider rebalancing ${formatCurrency((userPct - benchmarkPct) * totalValue / 100, market === 'NSE' ? 'INR' : 'USD')} to other sectors`);
      } else {
        status = 'OPTIMAL';
        recommendations.push(`${sector} allocation is well balanced`);
      }

      gaps.push({
        sector,
        current: Math.round(userPct * 10) / 10,
        benchmark: Math.round(benchmarkPct * 10) / 10,
        gap: Math.round(gap * 10) / 10,
        status,
        recommendations,
      });
    }

    // Sort by status priority: MISSING > UNDERWEIGHT > OVERWEIGHT > OPTIMAL
    const statusPriority = { 'MISSING': 0, 'UNDERWEIGHT': 1, 'OVERWEIGHT': 2, 'OPTIMAL': 3 };
    gaps.sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);

    res.json(gaps);

  } catch (error) {
    console.error('Portfolio gaps error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mutual Fund Recommendations
app.get('/api/mutual-funds', async (req, res) => {
  try {
    const { category, riskProfile } = req.query;

    // Curated list of top Indian mutual funds
    const mutualFunds = [
      // Large Cap
      {
        schemeCode: 'MF001',
        schemeName: 'Mirae Asset Large Cap Fund',
        category: 'LARGE_CAP',
        fundHouse: 'Mirae Asset',
        nav: 85.50,
        returns: { oneYear: 18.5, threeYear: 21.3, fiveYear: 19.8 },
        expenseRatio: 0.52,
        aum: 25000000000,
        rating: 5,
        riskLevel: 'LOW',
      },
      {
        schemeCode: 'MF002',
        schemeName: 'Parag Parikh Flexi Cap Fund',
        category: 'LARGE_CAP',
        fundHouse: 'PPFAS',
        nav: 52.30,
        returns: { oneYear: 22.8, threeYear: 24.5, fiveYear: 22.1 },
        expenseRatio: 0.68,
        aum: 45000000000,
        rating: 5,
        riskLevel: 'LOW',
      },
      // Mid Cap
      {
        schemeCode: 'MF003',
        schemeName: 'Motilal Oswal Midcap Fund',
        category: 'MID_CAP',
        fundHouse: 'Motilal Oswal',
        nav: 68.75,
        returns: { oneYear: 28.5, threeYear: 32.8, fiveYear: 26.3 },
        expenseRatio: 0.75,
        aum: 18000000000,
        rating: 4,
        riskLevel: 'MEDIUM',
      },
      {
        schemeCode: 'MF004',
        schemeName: 'Kotak Emerging Equity Fund',
        category: 'MID_CAP',
        fundHouse: 'Kotak',
        nav: 78.20,
        returns: { oneYear: 25.3, threeYear: 29.5, fiveYear: 24.8 },
        expenseRatio: 0.72,
        aum: 22000000000,
        rating: 5,
        riskLevel: 'MEDIUM',
      },
      // Small Cap
      {
        schemeCode: 'MF005',
        schemeName: 'Nippon India Small Cap Fund',
        category: 'SMALL_CAP',
        fundHouse: 'Nippon India',
        nav: 95.80,
        returns: { oneYear: 32.5, threeYear: 38.2, fiveYear: 28.5 },
        expenseRatio: 0.85,
        aum: 32000000000,
        rating: 5,
        riskLevel: 'HIGH',
      },
      {
        schemeCode: 'MF006',
        schemeName: 'Axis Small Cap Fund',
        category: 'SMALL_CAP',
        fundHouse: 'Axis',
        nav: 88.60,
        returns: { oneYear: 30.8, threeYear: 35.5, fiveYear: 26.8 },
        expenseRatio: 0.78,
        aum: 28000000000,
        rating: 4,
        riskLevel: 'HIGH',
      },
      // Debt
      {
        schemeCode: 'MF007',
        schemeName: 'ICICI Prudential Short Duration Fund',
        category: 'DEBT',
        fundHouse: 'ICICI Prudential',
        nav: 48.25,
        returns: { oneYear: 7.2, threeYear: 7.8, fiveYear: 7.5 },
        expenseRatio: 0.45,
        aum: 15000000000,
        rating: 4,
        riskLevel: 'LOW',
      },
      {
        schemeCode: 'MF008',
        schemeName: 'HDFC Corporate Bond Fund',
        category: 'DEBT',
        fundHouse: 'HDFC',
        nav: 28.90,
        returns: { oneYear: 7.8, threeYear: 8.2, fiveYear: 7.9 },
        expenseRatio: 0.42,
        aum: 20000000000,
        rating: 5,
        riskLevel: 'LOW',
      },
      // Hybrid
      {
        schemeCode: 'MF009',
        schemeName: 'HDFC Balanced Advantage Fund',
        category: 'HYBRID',
        fundHouse: 'HDFC',
        nav: 325.50,
        returns: { oneYear: 15.2, threeYear: 17.8, fiveYear: 16.5 },
        expenseRatio: 0.58,
        aum: 55000000000,
        rating: 5,
        riskLevel: 'MEDIUM',
      },
      {
        schemeCode: 'MF010',
        schemeName: 'ICICI Prudential Equity & Debt Fund',
        category: 'HYBRID',
        fundHouse: 'ICICI Prudential',
        nav: 245.80,
        returns: { oneYear: 14.5, threeYear: 16.8, fiveYear: 15.2 },
        expenseRatio: 0.62,
        aum: 42000000000,
        rating: 4,
        riskLevel: 'MEDIUM',
      },
      // Index
      {
        schemeCode: 'MF011',
        schemeName: 'UTI Nifty 50 Index Fund',
        category: 'INDEX',
        fundHouse: 'UTI',
        nav: 168.25,
        returns: { oneYear: 17.8, threeYear: 20.5, fiveYear: 18.2 },
        expenseRatio: 0.15,
        aum: 35000000000,
        rating: 4,
        riskLevel: 'LOW',
      },
      {
        schemeCode: 'MF012',
        schemeName: 'ICICI Prudential Nifty Next 50 Index Fund',
        category: 'INDEX',
        fundHouse: 'ICICI Prudential',
        nav: 42.50,
        returns: { oneYear: 22.5, threeYear: 25.8, fiveYear: 21.5 },
        expenseRatio: 0.18,
        aum: 18000000000,
        rating: 4,
        riskLevel: 'MEDIUM',
      },
      // Sectoral
      {
        schemeCode: 'MF013',
        schemeName: 'SBI Technology Opportunities Fund',
        category: 'SECTORAL',
        fundHouse: 'SBI',
        nav: 185.60,
        returns: { oneYear: 25.8, threeYear: 28.5, fiveYear: 24.2 },
        expenseRatio: 0.85,
        aum: 12000000000,
        rating: 4,
        riskLevel: 'HIGH',
      },
      {
        schemeCode: 'MF014',
        schemeName: 'ICICI Prudential Pharma Healthcare Fund',
        category: 'SECTORAL',
        fundHouse: 'ICICI Prudential',
        nav: 425.30,
        returns: { oneYear: 18.5, threeYear: 22.3, fiveYear: 19.8 },
        expenseRatio: 0.78,
        aum: 8000000000,
        rating: 3,
        riskLevel: 'HIGH',
      },
    ];

    // Filter by category
    let filtered = category && category !== 'ALL'
      ? mutualFunds.filter(f => f.category === category)
      : mutualFunds;

    // Filter by risk profile
    if (riskProfile === 'conservative') {
      filtered = filtered.filter(f => f.riskLevel === 'LOW' || f.category === 'DEBT');
    } else if (riskProfile === 'moderate') {
      filtered = filtered.filter(f => f.riskLevel !== 'HIGH');
    }

    // Sort by 3-year returns descending
    filtered.sort((a, b) => b.returns.threeYear - a.returns.threeYear);

    res.json(filtered);

  } catch (error) {
    console.error('Mutual funds error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stock Screener
app.post('/api/stock-screener', async (req, res) => {
  try {
    const { filters, market } = req.body;

    // Expanded stock database with comprehensive data
    const stockDatabase = market === 'NSE' ? [
      // Banking Sector
      { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', price: 1650, pe: 18.5, dividendYield: 1.2, roe: 17.5, performance52w: 12.8, marketCap: 'LARGE', ma50: 1620, ma200: 1580 },
      { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking', price: 1050, pe: 16.2, dividendYield: 1.5, roe: 16.8, performance52w: 28.5, marketCap: 'LARGE', ma50: 1020, ma200: 980 },
      { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking', price: 1850, pe: 17.8, dividendYield: 0.8, roe: 14.2, performance52w: 10.2, marketCap: 'LARGE', ma50: 1820, ma200: 1750 },
      { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', price: 625, pe: 12.5, dividendYield: 2.8, roe: 18.5, performance52w: 35.5, marketCap: 'LARGE', ma50: 610, ma200: 580 },
      { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Banking', price: 1125, pe: 14.8, dividendYield: 0.9, roe: 15.2, performance52w: 22.3, marketCap: 'LARGE', ma50: 1100, ma200: 1050 },
      { symbol: 'INDUSINDBK', name: 'IndusInd Bank', sector: 'Banking', price: 1420, pe: 13.2, dividendYield: 1.1, roe: 16.5, performance52w: 18.7, marketCap: 'MID', ma50: 1380, ma200: 1320 },

      // IT Sector
      { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT', price: 3650, pe: 28.5, dividendYield: 2.8, roe: 45.2, performance52w: 22.5, marketCap: 'LARGE', ma50: 3600, ma200: 3450 },
      { symbol: 'INFY', name: 'Infosys', sector: 'IT', price: 1580, pe: 25.3, dividendYield: 2.5, roe: 31.5, performance52w: 18.5, marketCap: 'LARGE', ma50: 1550, ma200: 1480 },
      { symbol: 'WIPRO', name: 'Wipro Limited', sector: 'IT', price: 465, pe: 22.8, dividendYield: 1.8, roe: 17.8, performance52w: 12.5, marketCap: 'LARGE', ma50: 455, ma200: 440 },
      { symbol: 'HCLTECH', name: 'HCL Technologies', sector: 'IT', price: 1420, pe: 24.5, dividendYield: 3.2, roe: 22.5, performance52w: 25.8, marketCap: 'LARGE', ma50: 1390, ma200: 1320 },
      { symbol: 'TECHM', name: 'Tech Mahindra', sector: 'IT', price: 1285, pe: 26.8, dividendYield: 2.1, roe: 19.5, performance52w: 15.2, marketCap: 'MID', ma50: 1260, ma200: 1210 },

      // FMCG Sector
      { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', sector: 'FMCG', price: 2680, pe: 62.5, dividendYield: 1.6, roe: 82.3, performance52w: 8.5, marketCap: 'LARGE', ma50: 2650, ma200: 2580 },
      { symbol: 'ITC', name: 'ITC Limited', sector: 'FMCG', price: 425, pe: 28.9, dividendYield: 3.2, roe: 24.5, performance52w: 5.2, marketCap: 'LARGE', ma50: 420, ma200: 410 },
      { symbol: 'NESTLEIND', name: 'Nestle India', sector: 'FMCG', price: 24500, pe: 72.5, dividendYield: 1.2, roe: 95.5, performance52w: 12.8, marketCap: 'LARGE', ma50: 24200, ma200: 23500 },
      { symbol: 'BRITANNIA', name: 'Britannia Industries', sector: 'FMCG', price: 5250, pe: 58.5, dividendYield: 0.9, roe: 38.5, performance52w: 18.5, marketCap: 'LARGE', ma50: 5180, ma200: 4950 },
      { symbol: 'DABUR', name: 'Dabur India', sector: 'FMCG', price: 525, pe: 48.5, dividendYield: 1.5, roe: 22.8, performance52w: 6.5, marketCap: 'MID', ma50: 520, ma200: 505 },

      // Energy Sector
      { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', price: 2450, pe: 26.8, dividendYield: 0.5, roe: 9.8, performance52w: 15.2, marketCap: 'LARGE', ma50: 2420, ma200: 2350 },
      { symbol: 'ONGC', name: 'Oil & Natural Gas Corp', sector: 'Energy', price: 245, pe: 8.5, dividendYield: 4.5, roe: 12.5, performance52w: 28.5, marketCap: 'LARGE', ma50: 240, ma200: 228 },
      { symbol: 'BPCL', name: 'Bharat Petroleum', sector: 'Energy', price: 385, pe: 9.8, dividendYield: 3.8, roe: 15.8, performance52w: 32.5, marketCap: 'LARGE', ma50: 375, ma200: 355 },
      { symbol: 'NTPC', name: 'NTPC Limited', sector: 'Energy', price: 285, pe: 12.5, dividendYield: 3.5, roe: 14.2, performance52w: 42.5, marketCap: 'LARGE', ma50: 275, ma200: 255 },
      { symbol: 'POWERGRID', name: 'Power Grid Corp', sector: 'Energy', price: 245, pe: 14.2, dividendYield: 4.2, roe: 16.5, performance52w: 25.8, marketCap: 'LARGE', ma50: 240, ma200: 228 },

      // Pharma Sector
      { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', sector: 'Pharma', price: 1480, pe: 38.5, dividendYield: 0.6, roe: 14.8, performance52w: 22.5, marketCap: 'LARGE', ma50: 1450, ma200: 1380 },
      { symbol: 'DRREDDY', name: 'Dr Reddys Laboratories', sector: 'Pharma', price: 5850, pe: 42.5, dividendYield: 0.5, roe: 12.5, performance52w: 18.5, marketCap: 'LARGE', ma50: 5750, ma200: 5450 },
      { symbol: 'CIPLA', name: 'Cipla Limited', sector: 'Pharma', price: 1285, pe: 28.5, dividendYield: 1.2, roe: 15.8, performance52w: 25.5, marketCap: 'MID', ma50: 1250, ma200: 1180 },
      { symbol: 'DIVISLAB', name: 'Divis Laboratories', sector: 'Pharma', price: 3580, pe: 52.5, dividendYield: 0.8, roe: 18.5, performance52w: 15.2, marketCap: 'MID', ma50: 3520, ma200: 3350 },
      { symbol: 'BIOCON', name: 'Biocon Limited', sector: 'Pharma', price: 325, pe: 32.5, dividendYield: 0.7, roe: 11.5, performance52w: 8.5, marketCap: 'MID', ma50: 318, ma200: 305 },

      // Auto Sector
      { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Auto', price: 11500, pe: 24.5, dividendYield: 1.3, roe: 16.5, performance52w: 35.8, marketCap: 'LARGE', ma50: 11250, ma200: 10850 },
      { symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Auto', price: 825, pe: 18.5, dividendYield: 0.8, roe: 22.5, performance52w: 52.5, marketCap: 'LARGE', ma50: 790, ma200: 720 },
      { symbol: 'M&M', name: 'Mahindra & Mahindra', sector: 'Auto', price: 1850, pe: 22.8, dividendYield: 1.2, roe: 18.5, performance52w: 42.5, marketCap: 'LARGE', ma50: 1820, ma200: 1680 },
      { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto', sector: 'Auto', price: 8250, pe: 28.5, dividendYield: 2.8, roe: 32.5, performance52w: 28.5, marketCap: 'LARGE', ma50: 8100, ma200: 7650 },
      { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp', sector: 'Auto', price: 4250, pe: 26.5, dividendYield: 2.2, roe: 28.5, performance52w: 22.5, marketCap: 'LARGE', ma50: 4180, ma200: 3950 },

      // Metals Sector
      { symbol: 'TATASTEEL', name: 'Tata Steel', sector: 'Metals', price: 128, pe: 8.5, dividendYield: 2.8, roe: 18.5, performance52w: 15.2, marketCap: 'LARGE', ma50: 125, ma200: 118 },
      { symbol: 'HINDALCO', name: 'Hindalco Industries', sector: 'Metals', price: 585, pe: 12.5, dividendYield: 1.5, roe: 16.8, performance52w: 22.5, marketCap: 'LARGE', ma50: 575, ma200: 550 },
      { symbol: 'JSWSTEEL', name: 'JSW Steel', sector: 'Metals', price: 825, pe: 14.5, dividendYield: 1.8, roe: 15.5, performance52w: 18.5, marketCap: 'LARGE', ma50: 810, ma200: 780 },
      { symbol: 'VEDL', name: 'Vedanta Limited', sector: 'Metals', price: 385, pe: 9.8, dividendYield: 5.5, roe: 22.5, performance52w: 32.5, marketCap: 'MID', ma50: 375, ma200: 350 },
      { symbol: 'SAIL', name: 'Steel Authority of India', sector: 'Metals', price: 115, pe: 6.5, dividendYield: 3.2, roe: 14.5, performance52w: 12.5, marketCap: 'MID', ma50: 112, ma200: 105 },
    ] : [
      // US Technology
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', price: 185, pe: 28.5, dividendYield: 0.5, roe: 147.5, performance52w: 42.5, marketCap: 'LARGE', ma50: 182, ma200: 175 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', price: 380, pe: 32.8, dividendYield: 0.8, roe: 43.2, performance52w: 52.8, marketCap: 'LARGE', ma50: 375, ma200: 355 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', price: 142, pe: 24.2, dividendYield: 0, roe: 28.5, performance52w: 38.5, marketCap: 'LARGE', ma50: 140, ma200: 132 },
      { symbol: 'META', name: 'Meta Platforms', sector: 'Technology', price: 485, pe: 26.5, dividendYield: 0.4, roe: 32.5, performance52w: 58.5, marketCap: 'LARGE', ma50: 475, ma200: 445 },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', price: 495, pe: 72.5, dividendYield: 0.1, roe: 85.5, performance52w: 125.5, marketCap: 'LARGE', ma50: 485, ma200: 425 },
      { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Auto', price: 245, pe: 68.5, dividendYield: 0, roe: 28.5, performance52w: 52.5, marketCap: 'LARGE', ma50: 240, ma200: 215 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Technology', price: 155, pe: 58.5, dividendYield: 0, roe: 18.5, performance52w: 48.5, marketCap: 'LARGE', ma50: 152, ma200: 142 },

      // US Finance
      { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Finance', price: 165, pe: 12.5, dividendYield: 2.5, roe: 15.8, performance52w: 22.5, marketCap: 'LARGE', ma50: 162, ma200: 155 },
      { symbol: 'BAC', name: 'Bank of America', sector: 'Finance', price: 38, pe: 11.8, dividendYield: 2.8, roe: 12.5, performance52w: 18.5, marketCap: 'LARGE', ma50: 37, ma200: 35 },
      { symbol: 'WFC', name: 'Wells Fargo', sector: 'Finance', price: 52, pe: 10.5, dividendYield: 3.2, roe: 11.8, performance52w: 25.5, marketCap: 'LARGE', ma50: 51, ma200: 48 },
      { symbol: 'GS', name: 'Goldman Sachs', sector: 'Finance', price: 385, pe: 14.5, dividendYield: 2.2, roe: 14.5, performance52w: 32.5, marketCap: 'LARGE', ma50: 378, ma200: 355 },
      { symbol: 'MS', name: 'Morgan Stanley', sector: 'Finance', price: 92, pe: 13.5, dividendYield: 3.5, roe: 13.2, performance52w: 28.5, marketCap: 'LARGE', ma50: 90, ma200: 85 },

      // US Healthcare
      { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', price: 158, pe: 24.5, dividendYield: 2.6, roe: 25.3, performance52w: 8.5, marketCap: 'LARGE', ma50: 156, ma200: 152 },
      { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', price: 525, pe: 28.5, dividendYield: 1.2, roe: 28.5, performance52w: 22.5, marketCap: 'LARGE', ma50: 518, ma200: 495 },
      { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', price: 28, pe: 18.5, dividendYield: 5.8, roe: 12.5, performance52w: -8.5, marketCap: 'LARGE', ma50: 27, ma200: 29 },
      { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', price: 168, pe: 22.5, dividendYield: 3.5, roe: 52.5, performance52w: 18.5, marketCap: 'LARGE', ma50: 165, ma200: 158 },
      { symbol: 'LLY', name: 'Eli Lilly', sector: 'Healthcare', price: 685, pe: 85.5, dividendYield: 0.6, roe: 48.5, performance52w: 95.5, marketCap: 'LARGE', ma50: 670, ma200: 595 },

      // US Consumer
      { symbol: 'KO', name: 'Coca-Cola Company', sector: 'Consumer', price: 62, pe: 26.3, dividendYield: 3.0, roe: 40.2, performance52w: 12.5, marketCap: 'LARGE', ma50: 61, ma200: 59 },
      { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer', price: 158, pe: 27.5, dividendYield: 2.4, roe: 32.8, performance52w: 15.2, marketCap: 'LARGE', ma50: 156, ma200: 152 },
      { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer', price: 172, pe: 32.5, dividendYield: 1.2, roe: 22.5, performance52w: 28.5, marketCap: 'LARGE', ma50: 169, ma200: 162 },
      { symbol: 'MCD', name: 'McDonalds Corp', sector: 'Consumer', price: 285, pe: 28.5, dividendYield: 2.1, roe: 52.5, performance52w: 18.5, marketCap: 'LARGE', ma50: 282, ma200: 272 },
      { symbol: 'NKE', name: 'Nike Inc.', sector: 'Consumer', price: 105, pe: 32.5, dividendYield: 1.2, roe: 38.5, performance52w: 8.5, marketCap: 'LARGE', ma50: 103, ma200: 108 },
    ];

    let results = [...stockDatabase];

    // Apply filters
    if (filters.marketCap && filters.marketCap !== 'ALL') {
      results = results.filter(s => s.marketCap === filters.marketCap);
    }

    if (filters.sector && filters.sector !== 'ALL') {
      results = results.filter(s => s.sector === filters.sector);
    }

    if (filters.peRatio && filters.peRatio !== 'ALL') {
      if (filters.peRatio === '<15') {
        results = results.filter(s => s.pe < 15);
      } else if (filters.peRatio === '15-25') {
        results = results.filter(s => s.pe >= 15 && s.pe <= 25);
      } else if (filters.peRatio === '>25') {
        results = results.filter(s => s.pe > 25);
      }
    }

    if (filters.dividendYield && filters.dividendYield !== 'ALL') {
      if (filters.dividendYield === '>2%') {
        results = results.filter(s => s.dividendYield > 2);
      } else if (filters.dividendYield === '>4%') {
        results = results.filter(s => s.dividendYield > 4);
      }
    }

    if (filters.roe && filters.roe !== 'ALL') {
      if (filters.roe === '>15%') {
        results = results.filter(s => s.roe > 15);
      } else if (filters.roe === '>20%') {
        results = results.filter(s => s.roe > 20);
      }
    }

    if (filters.performance52w && filters.performance52w !== 'ALL') {
      if (filters.performance52w === 'NEAR_HIGH') {
        results = results.filter(s => s.performance52w > 40); // Within 10% of 52W high
      } else if (filters.performance52w === 'NEAR_LOW') {
        results = results.filter(s => s.performance52w < 10); // Near 52W low
      }
    }

    // Apply Moving Average filter
    if (filters.ma && filters.ma !== 'ALL') {
      if (filters.ma === 'ABOVE_50') {
        results = results.filter(s => s.price > (s.ma50 || 0));
      } else if (filters.ma === 'ABOVE_200') {
        results = results.filter(s => s.price > (s.ma200 || 0));
      }
    }

    res.json(results);

  } catch (error) {
    console.error('Stock screener error:', error);
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

    // Build symbol list based on market
    let symbolsToTry;
    if (holding.market === 'NYSE' || holding.market === 'NASDAQ') {
      // US stocks: use symbol as-is (no .NS/.BO suffix)
      symbolsToTry = [mapped];
    } else if (USE_BSE_EXCHANGE.includes(mapped.toUpperCase())) {
      // For REITs, use BSE first (NSE data is often stale)
      symbolsToTry = [`${mapped}.BO`, `${mapped}.NS`, mapped];
    } else {
      // For other Indian stocks, try NSE first, then BSE
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

  // Parse headers using CSV line parser to handle quoted values
  const headerValues = parseCSVLine(lines[0]);
  const headers = headerValues.map(h => String(h).toLowerCase().trim().replace(/"/g, ''));

  // Detect format from headers
  const headerStr = headers.join('|');
  let detectedFormat = 'generic';
  let detectedMarket = null;

  // Zerodha format: "Instrument", "Qty.", "Avg. cost", "LTP", "Invested", "Cur. val", "P&L"
  if (headerStr.includes('instrument') && headerStr.includes('qty') && headerStr.includes('avg. cost')) {
    detectedFormat = 'zerodha';
    detectedMarket = 'IN';
    console.log('Detected Zerodha CSV format');
  }
  // INDmoney format: "Stock Symbol", "Holding Since", "Quantity", "Avg. Price ($)"
  else if (headerStr.includes('stock symbol') && headerStr.includes('holding since')) {
    detectedFormat = 'indmoney';
    detectedMarket = 'US';
    console.log('Detected INDmoney CSV format');
  }
  // Groww format: "Stock Name", "ISIN", "Quantity"
  else if (headerStr.includes('stock name') || headerStr.includes('isin')) {
    detectedFormat = 'groww';
    detectedMarket = 'IN';
    console.log('Detected Groww CSV format');
  }

  const transactions = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row = {};
    headers.forEach((header, idx) => {
      if (idx < values.length) {
        row[header] = String(values[idx] || '').trim().replace(/"/g, '');
      }
    });

    const tx = parseTransactionRow(row, detectedFormat, detectedMarket);
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

  // Try to detect format by checking for header row pattern
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });

  // Find the header row (look for "Stock Name" or similar)
  let headerRowIndex = -1;
  let headers = [];
  let detectedFormat = 'generic';
  let detectedMarket = null; // Auto-detected market

  for (let i = 0; i < Math.min(rawData.length, 20); i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row)) continue;

    const rowStr = row.map(c => String(c).toLowerCase()).join('|');

    // Zerodha format: "Instrument", "Qty.", "Avg. cost", "LTP", "Invested", "Cur. val", "P&L"
    if (rowStr.includes('instrument') && rowStr.includes('qty') && rowStr.includes('avg. cost')) {
      headerRowIndex = i;
      headers = row.map(h => String(h).toLowerCase().trim());
      detectedFormat = 'zerodha';
      detectedMarket = 'IN'; // Zerodha = Indian stocks (NSE/BSE)
      console.log('Detected Zerodha format at row', i);
      break;
    }

    // INDmoney format: "Stock Symbol", "Holding Since", "Quantity", "Avg. Price ($)", "Total Value ($)"
    if (rowStr.includes('stock symbol') && rowStr.includes('holding since')) {
      headerRowIndex = i;
      headers = row.map(h => String(h).toLowerCase().trim());
      detectedFormat = 'indmoney';
      detectedMarket = 'US'; // INDmoney = US stocks
      console.log('Detected INDmoney format at row', i);
      break;
    }

    // Groww format: "Stock Name", "ISIN", "Quantity", etc.
    if (rowStr.includes('stock name') || rowStr.includes('isin')) {
      headerRowIndex = i;
      headers = row.map(h => String(h).toLowerCase().trim());
      detectedFormat = 'groww';
      detectedMarket = 'IN'; // Groww = Indian stocks
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

  // Auto-detect market from currency symbols in headers if not already detected
  if (!detectedMarket) {
    const headerStr = headers.join(' ');
    if (headerStr.includes('$') || headerStr.includes('usd')) {
      detectedMarket = 'US';
    } else if (headerStr.includes('₹') || headerStr.includes('rs') || headerStr.includes('inr')) {
      detectedMarket = 'IN';
    }
  }

  console.log('Detected format:', detectedFormat, 'Headers:', headers, 'Market:', detectedMarket);

  // If we found headers, parse the data rows
  if (headerRowIndex >= 0 && headers.length > 0) {
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      // Skip empty rows (all cells empty or whitespace)
      const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
      if (!hasData) continue;

      const normalizedRow = {};
      headers.forEach((header, idx) => {
        if (header && idx < row.length) {
          normalizedRow[header] = row[idx];
        }
      });

      const tx = parseTransactionRow(normalizedRow, detectedFormat, detectedMarket);
      if (tx) transactions.push(tx);
    }
  } else {
    // Fallback: original parsing with first row as headers
    for (const row of data) {
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        normalizedRow[key.toLowerCase().trim()] = String(row[key]).trim();
      });

      const tx = parseTransactionRow(normalizedRow, detectedFormat, detectedMarket);
      if (tx) transactions.push(tx);
    }
  }

  return transactions;
}

// Auto-detect market from row data
function detectMarketFromRow(row, detectedMarket) {
  // If already detected from headers, return it
  if (detectedMarket) return detectedMarket;

  // Check currency symbols in price columns
  const priceColumns = ['avg. price ($)', 'avg. price', 'avg price', 'average buy price',
                        'closing price', 'current price', 'total value ($)', 'total value'];

  for (const col of priceColumns) {
    const value = row[col];
    if (value) {
      const valueStr = String(value);
      if (valueStr.includes('$') || valueStr.includes('USD')) return 'US';
      if (valueStr.includes('₹') || valueStr.includes('Rs') || valueStr.includes('INR')) return 'IN';
    }
  }

  // Check ISIN pattern
  const isin = row['isin'] || row['isin code'] || '';
  if (isin) {
    const isinStr = String(isin).trim();
    if (isinStr.startsWith('INE')) return 'IN'; // Indian ISIN
    if (isinStr.startsWith('US')) return 'US';  // US ISIN
  }

  // Check symbol pattern (heuristic)
  const symbol = row['symbol'] || row['stock symbol'] || '';
  if (symbol) {
    const symStr = String(symbol).trim();
    // Short symbols (1-4 chars, all caps) often US
    if (symStr.length <= 4 && /^[A-Z]+$/.test(symStr)) return 'US';
    // Symbols with .NS or .BO are Indian
    if (symStr.includes('.NS') || symStr.includes('.BO')) return 'IN';
  }

  return null; // Unknown
}

function parseTransactionRow(row, detectedFormat = 'generic', detectedMarket = null) {
  // INDmoney specific parsing
  if (detectedFormat === 'indmoney') {
    return parseINDmoneyRow(row, detectedMarket);
  }

  // Zerodha specific parsing
  if (detectedFormat === 'zerodha') {
    return parseZerodhaRow(row, detectedMarket);
  }

  // Try to find symbol - support Groww format "stock name"
  const symbol = row['symbol'] || row['stock'] || row['scrip'] || row['ticker'] ||
                 row['stock name'] || row['name'] || row['fund name'] || row['fund_name'] ||
                 row['stock symbol'] || row['instrument'];
  if (!symbol || symbol === 'null' || symbol === '') return null;

  // Try to find quantity - Zerodha format "qty."
  const quantityStr = row['quantity'] || row['qty'] || row['qty.'] || row['units'] || row['shares'] || '1';
  const quantity = parseFloat(String(quantityStr).replace(/,/g, '')) || 0;
  if (quantity <= 0) return null;

  // Try to find average buy price - Zerodha format "avg. cost"
  const avgPriceStr = row['average buy price'] || row['avg_price'] || row['average_price'] ||
                      row['buy price'] || row['price'] || row['rate'] || row['nav'] ||
                      row['avg. price ($)'] || row['avg. price'] || row['avg. cost'] || '0';
  const avgPrice = parseFloat(String(avgPriceStr).replace(/[₹,$]/g, '')) || 0;
  if (avgPrice <= 0) return null;

  // Try to find buy value (invested amount) - Zerodha format "invested"
  const buyValueStr = row['buy value'] || row['invested'] || row['invested value'] ||
                      row['investment'] || row['cost'] || '0';
  const buyValue = parseFloat(String(buyValueStr).replace(/[₹,$]/g, '')) || (avgPrice * quantity);

  // Try to find closing/current price - Zerodha format "ltp"
  const closingPriceStr = row['closing price'] || row['current price'] || row['ltp'] ||
                          row['last price'] || row['market price'] || '0';
  const closingPrice = parseFloat(String(closingPriceStr).replace(/[₹,$]/g, '')) || 0;

  // Try to find closing value (current value) - Zerodha format "cur. val"
  const closingValueStr = row['closing value'] || row['current value'] || row['market value'] ||
                          row['total value ($)'] || row['total value'] || row['cur. val'] || '0';
  const closingValue = parseFloat(String(closingValueStr).replace(/[₹,$]/g, '')) || (closingPrice * quantity);

  // Try to find unrealised P&L - Groww format "unrealised p&l"
  const pnlStr = row['unrealised p&l'] || row['unrealized p&l'] || row['p&l'] ||
                 row['profit/loss'] || row['gain/loss'] || row['pnl'] || '0';
  const unrealisedPnL = parseFloat(String(pnlStr).replace(/[₹,$]/g, '')) || (closingValue - buyValue);

  // Calculate P&L percent
  const pnlPercent = buyValue > 0 ? (unrealisedPnL / buyValue) * 100 : 0;

  // Try to find ISIN
  const isin = row['isin'] || row['isin code'] || '';

  // Try to find date
  const dateStr = row['date'] || row['trade_date'] || row['transaction_date'] ||
                  row['purchase_date'] || row['holding since'];
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

  // Auto-detect market if not provided
  const autoDetectedMarket = detectMarketFromRow(row, detectedMarket);

  // Determine source from detected format
  let source = 'Manual';
  if (detectedFormat === 'indmoney') source = 'INDmoney';
  else if (detectedFormat === 'zerodha') source = 'Zerodha';
  else if (detectedFormat === 'groww') source = 'Groww';

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
    source,
    detectedMarket: autoDetectedMarket, // Add detected market to transaction
  };
}

function parseZerodhaRow(row, detectedMarket = 'IN') {
  // Zerodha format: Instrument | Qty. | Avg. cost | LTP | Invested | Cur. val | P&L | Net chg. | Day chg.
  const symbol = row['instrument'];
  if (!symbol || symbol === 'null' || symbol === '') return null;

  const quantityStr = row['qty.'] || row['qty'] || '0';
  const quantity = parseFloat(String(quantityStr).replace(/,/g, '')) || 0;
  if (quantity <= 0) return null;

  // Parse avg cost (remove commas)
  const avgCostStr = row['avg. cost'] || row['avg cost'] || '0';
  const avgCost = parseFloat(String(avgCostStr).replace(/,/g, '')) || 0;
  if (avgCost <= 0) return null;

  // Parse LTP (Last Traded Price)
  const ltpStr = row['ltp'] || '0';
  const ltp = parseFloat(String(ltpStr).replace(/,/g, '')) || 0;

  // Parse invested amount
  const investedStr = row['invested'] || '0';
  const invested = parseFloat(String(investedStr).replace(/,/g, '')) || 0;

  // Parse current value
  const curValStr = row['cur. val'] || row['cur val'] || '0';
  const curVal = parseFloat(String(curValStr).replace(/,/g, '')) || 0;

  // Parse P&L
  const pnlStr = row['p&l'] || '0';
  const pnl = parseFloat(String(pnlStr).replace(/,/g, '')) || 0;

  // Parse day change percentage
  const dayChgStr = row['day chg.'] || row['day chg'] || '0';
  const dayChg = parseFloat(String(dayChgStr).replace(/,/g, '')) || 0;

  // Calculate P&L percent
  const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

  console.log('Parsed Zerodha row:', {
    symbol: symbol.toUpperCase(),
    quantity,
    avgCost,
    ltp,
    invested,
    curVal,
    pnl,
    pnlPercent,
    detectedMarket
  });

  return {
    symbol: symbol.toUpperCase().trim(),
    name: symbol.toUpperCase().trim(), // Zerodha uses symbol as name
    isin: '',
    type: 'BUY',
    quantity,
    price: avgCost,           // Average cost
    buyValue: invested,       // Total invested
    closingPrice: ltp,        // Last traded price
    closingValue: curVal,     // Current value
    unrealisedPnL: pnl,       // P&L amount
    pnlPercent,               // P&L percentage
    date: new Date().toISOString().split('T')[0], // Default to today
    fees: 0,
    source: 'Zerodha',
    detectedMarket: detectedMarket || 'IN', // Zerodha is Indian stocks (NSE/BSE)
  };
}

function parseINDmoneyRow(row, detectedMarket = 'US') {
  // INDmoney format: Stock Symbol | Holding Since | Quantity | Avg. Price ($) | Total Value ($)
  // NOTE: "Total Value ($)" is the INVESTED amount (buy value), not current market value
  const symbol = row['stock symbol'] || row['symbol'];
  if (!symbol || symbol === 'null' || symbol === '') return null;

  const quantityStr = row['quantity'] || '0';
  const quantity = parseFloat(quantityStr) || 0;
  if (quantity <= 0) return null;

  // Parse avg price (remove $ and commas)
  const avgPriceStr = row['avg. price ($)'] || row['avg price'] || row['avg. price'] || '0';
  const avgPrice = parseFloat(String(avgPriceStr).replace(/[$,]/g, '')) || 0;
  if (avgPrice <= 0) return null;

  // Parse total value - this is the BUY/INVESTED value, not current market value
  const totalValueStr = row['total value ($)'] || row['total value'] || '0';
  const totalValue = parseFloat(String(totalValueStr).replace(/[$,]/g, '')) || 0;

  // Use total value as buy value (this is what was invested)
  const buyValue = totalValue;

  // Current price is same as avg price initially (will be updated by price refresh)
  const closingPrice = avgPrice;

  // Current value is same as buy value initially (will be updated by price refresh)
  const closingValue = buyValue;

  // P&L is 0 initially (will be calculated after price refresh)
  const unrealisedPnL = 0;
  const pnlPercent = 0;

  // Parse holding since date (e.g., "12 Jul 2026, 06:39 AM")
  const dateStr = row['holding since'] || '';
  const date = parseINDmoneyDate(dateStr) || new Date().toISOString().split('T')[0];

  console.log('Parsed INDmoney row:', {
    symbol: symbol.toUpperCase(),
    quantity,
    avgPrice,
    buyValue,
    date,
    detectedMarket
  });

  return {
    symbol: symbol.toUpperCase().trim(),
    name: symbol.toUpperCase().trim(), // US stocks don't have long names in this format
    isin: '',
    type: 'BUY',
    quantity,
    price: avgPrice,
    buyValue,
    closingPrice,
    closingValue,
    unrealisedPnL,
    pnlPercent,
    date,
    fees: 0,
    source: 'INDmoney',
    detectedMarket: detectedMarket || 'US', // INDmoney is typically US stocks
  };
}

function parseINDmoneyDate(dateStr) {
  if (!dateStr) return null;

  try {
    // Format: "12 Jul 2026, 06:39 AM"
    // Extract just the date part before the comma
    const datePart = dateStr.split(',')[0].trim();

    // Parse using Date constructor
    const date = new Date(datePart);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    console.error('Failed to parse INDmoney date:', dateStr, e);
  }

  return null;
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
    // Load settings for API key and provider
    const settings = loadSettings();
    const PORTKEY_API_KEY = settings.portkeyApiKey;
    const provider = settings?.aiProvider || 'anthropic';

    // Build headers - only add anthropic-version for Claude
    const headers = {
      'Content-Type': 'application/json',
      'x-portkey-api-key': PORTKEY_API_KEY,
    };

    if (provider === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01';
    }

    const response = await axios.post(
      `${PORTKEY_BASE_URL}/v1/messages`,
      {
        model: AI_MODELS['claude-sonnet'],
        max_tokens: 2048,
        system: 'You are a financial data parsing expert. Output valid JSON only, no markdown code blocks.',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: headers,
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

// Tax Analysis Export - Excel
app.get('/api/tax/export/excel/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const analysis = taxData.analyses.find(a => a.id === id);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });

    const timestamp = new Date().toISOString().split('T')[0];
    const summary = analysis.summary;
    const transactions = analysis.transactions || [];

    const styles = {
      title: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E3A5F" } }, alignment: { horizontal: "center" } },
      header: { font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2563EB" } }, alignment: { horizontal: "center" } },
      sectionHeader: { font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "475569" } } },
      profit: { font: { bold: true, color: { rgb: "059669" } } },
      loss: { font: { bold: true, color: { rgb: "DC2626" } } },
      stcg: { fill: { fgColor: { rgb: "FEF3C7" } } },
      ltcg: { fill: { fgColor: { rgb: "D1FAE5" } } },
      label: { font: { bold: true }, fill: { fgColor: { rgb: "E2E8F0" } } },
    };

    const wb = XLSXStyle.utils.book_new();

    // Summary Sheet
    const summaryData = [
      [{ v: `TAX ANALYSIS REPORT - FY ${analysis.fiscalYear}`, s: styles.title }, '', '', ''],
      [{ v: `File: ${analysis.fileName}`, s: { font: { italic: true, color: { rgb: "6B7280" } } } }],
      [{ v: `Generated: ${new Date().toLocaleString()}` }],
      [],
      [{ v: 'CAPITAL GAINS SUMMARY', s: styles.sectionHeader }, '', '', ''],
      [{ v: 'Category', s: styles.header }, { v: 'Profit', s: styles.header }, { v: 'Loss', s: styles.header }, { v: 'Net', s: styles.header }],
      [{ v: 'Short Term (STCG)', s: styles.stcg }, { v: r2(summary.stcgProfit), s: { ...styles.profit, numFmt: "₹#,##0.00" } }, { v: r2(summary.stcgLoss), s: { ...styles.loss, numFmt: "₹#,##0.00" } }, { v: r2(summary.netSTCG), s: { numFmt: "₹#,##0.00" } }],
      [{ v: 'Long Term (LTCG)', s: styles.ltcg }, { v: r2(summary.ltcgProfit), s: { ...styles.profit, numFmt: "₹#,##0.00" } }, { v: r2(summary.ltcgLoss), s: { ...styles.loss, numFmt: "₹#,##0.00" } }, { v: r2(summary.netLTCG), s: { numFmt: "₹#,##0.00" } }],
      [],
      [{ v: 'TAX LIABILITY', s: styles.sectionHeader }, '', '', ''],
      [{ v: 'Taxable STCG (15%)', s: styles.label }, { v: r2(summary.taxableSTCG), s: { numFmt: "₹#,##0.00" } }],
      [{ v: 'Taxable LTCG (10%)', s: styles.label }, { v: r2(summary.taxableLTCG), s: { numFmt: "₹#,##0.00" } }, { v: 'After ₹1.25L exemption' }],
      [{ v: 'Est. STCG Tax', s: styles.label }, { v: r2(summary.estimatedSTCGTax), s: { numFmt: "₹#,##0.00" } }],
      [{ v: 'Est. LTCG Tax', s: styles.label }, { v: r2(summary.estimatedLTCGTax), s: { numFmt: "₹#,##0.00" } }],
      [{ v: 'TOTAL ESTIMATED TAX', s: { ...styles.label, font: { bold: true, sz: 12 } } }, { v: r2(summary.totalEstimatedTax), s: { font: { bold: true, sz: 12 }, numFmt: "₹#,##0.00" } }],
      [],
      [{ v: 'STATISTICS', s: styles.sectionHeader }, '', '', ''],
      [{ v: 'Total Transactions', s: styles.label }, { v: summary.totalTransactions }],
      [{ v: 'STCG Count', s: styles.label }, { v: summary.stcgCount }],
      [{ v: 'LTCG Count', s: styles.label }, { v: summary.ltcgCount }],
      [{ v: 'Total Buy Value', s: styles.label }, { v: r2(summary.totalBuyValue), s: { numFmt: "₹#,##0.00" } }],
      [{ v: 'Total Sell Value', s: styles.label }, { v: r2(summary.totalSellValue), s: { numFmt: "₹#,##0.00" } }],
      [{ v: 'Total Gain/Loss', s: styles.label }, { v: r2(summary.totalGain), s: { ...(summary.totalGain >= 0 ? styles.profit : styles.loss), numFmt: "₹#,##0.00" } }],
    ];
    const ws1 = XLSXStyle.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    XLSXStyle.utils.book_append_sheet(wb, ws1, 'Summary');

    // Transactions Sheet
    const txnData = [
      [{ v: 'TRANSACTIONS', s: styles.title }, '', '', '', '', '', '', '', '', ''],
      [],
      [{ v: 'Symbol', s: styles.header }, { v: 'Name', s: styles.header }, { v: 'Buy Date', s: styles.header }, { v: 'Sell Date', s: styles.header }, { v: 'Qty', s: styles.header }, { v: 'Buy Price', s: styles.header }, { v: 'Sell Price', s: styles.header }, { v: 'Gain/Loss', s: styles.header }, { v: 'Type', s: styles.header }, { v: 'Days Held', s: styles.header }],
    ];
    transactions.forEach(t => {
      const gainStyle = (t.gain || 0) >= 0 ? styles.profit : styles.loss;
      const typeStyle = t.classification?.type === 'STCG' ? styles.stcg : styles.ltcg;
      txnData.push([
        { v: t.symbol }, { v: t.name },
        { v: t.buyDate || '-' }, { v: t.sellDate || '-' },
        { v: t.quantity }, { v: r2(t.buyPrice), s: { numFmt: "#,##0.00" } },
        { v: r2(t.sellPrice), s: { numFmt: "#,##0.00" } },
        { v: r2(t.gain), s: { ...gainStyle, numFmt: "#,##0.00" } },
        { v: t.classification?.type || '-', s: typeStyle },
        { v: t.classification?.holdingDays || '-' },
      ]);
    });
    const ws2 = XLSXStyle.utils.aoa_to_sheet(txnData);
    ws2['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 8 }, { wch: 10 }];
    XLSXStyle.utils.book_append_sheet(wb, ws2, 'Transactions');

    // Insights Sheet
    const insightsData = [
      [{ v: 'TAX INSIGHTS', s: styles.title }, '', ''],
      [],
    ];
    (analysis.insights || []).forEach(i => {
      insightsData.push([{ v: i.title, s: { font: { bold: true } } }, { v: i.type }]);
      insightsData.push([{ v: i.description }]);
      insightsData.push([{ v: `Impact: ${i.impact}`, s: { font: { italic: true, color: { rgb: "6B7280" } } } }]);
      insightsData.push([]);
    });
    const ws3 = XLSXStyle.utils.aoa_to_sheet(insightsData);
    ws3['!cols'] = [{ wch: 60 }, { wch: 15 }, { wch: 20 }];
    XLSXStyle.utils.book_append_sheet(wb, ws3, 'Insights');

    const buf = XLSXStyle.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=tax_analysis_${analysis.fiscalYear}_${timestamp}.xlsx`);
    res.send(buf);
  } catch (error) {
    console.error('Tax Excel export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tax Analysis Export - CSV
app.get('/api/tax/export/csv/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const analysis = taxData.analyses.find(a => a.id === id);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });

    const timestamp = new Date().toISOString().split('T')[0];
    const summary = analysis.summary;
    const transactions = analysis.transactions || [];

    let csv = `Tax Analysis Report - FY ${analysis.fiscalYear}\n`;
    csv += `File: ${analysis.fileName}\n\n`;
    csv += `SUMMARY\n`;
    csv += `STCG Profit,${csvNum(summary.stcgProfit)}\n`;
    csv += `STCG Loss,${csvNum(summary.stcgLoss)}\n`;
    csv += `Net STCG,${csvNum(summary.netSTCG)}\n`;
    csv += `LTCG Profit,${csvNum(summary.ltcgProfit)}\n`;
    csv += `LTCG Loss,${csvNum(summary.ltcgLoss)}\n`;
    csv += `Net LTCG,${csvNum(summary.netLTCG)}\n`;
    csv += `Total Estimated Tax,${csvNum(summary.totalEstimatedTax)}\n\n`;
    csv += `TRANSACTIONS\n`;
    csv += `Symbol,Name,Buy Date,Sell Date,Qty,Buy Price,Sell Price,Gain/Loss,Type,Days Held\n`;
    transactions.forEach(t => {
      csv += `"${t.symbol}","${t.name}",${t.buyDate || '-'},${t.sellDate || '-'},${t.quantity},${csvNum(t.buyPrice)},${csvNum(t.sellPrice)},${csvNum(t.gain)},${t.classification?.type || '-'},${t.classification?.holdingDays || '-'}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=tax_analysis_${analysis.fiscalYear}_${timestamp}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tax Analysis Export - Markdown
app.get('/api/tax/export/md/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const analysis = taxData.analyses.find(a => a.id === id);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });

    const timestamp = new Date().toISOString().split('T')[0];
    const summary = analysis.summary;

    let md = `# Tax Analysis Report - FY ${analysis.fiscalYear}\n\n`;
    md += `**File:** ${analysis.fileName}\n`;
    md += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    md += `## Capital Gains Summary\n\n`;
    md += `| Category | Profit | Loss | Net |\n|----------|--------|------|-----|\n`;
    md += `| Short Term (STCG) | ₹${fmt2(summary.stcgProfit)} | ₹${fmt2(summary.stcgLoss)} | ₹${fmt2(summary.netSTCG)} |\n`;
    md += `| Long Term (LTCG) | ₹${fmt2(summary.ltcgProfit)} | ₹${fmt2(summary.ltcgLoss)} | ₹${fmt2(summary.netLTCG)} |\n\n`;
    md += `## Tax Liability\n\n`;
    md += `- **Taxable STCG:** ₹${fmt2(summary.taxableSTCG)} @ 15%\n`;
    md += `- **Taxable LTCG:** ₹${fmt2(summary.taxableLTCG)} @ 10% (after ₹1.25L exemption)\n`;
    md += `- **Est. STCG Tax:** ₹${fmt2(summary.estimatedSTCGTax)}\n`;
    md += `- **Est. LTCG Tax:** ₹${fmt2(summary.estimatedLTCGTax)}\n`;
    md += `- **TOTAL ESTIMATED TAX:** ₹${fmt2(summary.totalEstimatedTax)}\n\n`;
    md += `## Statistics\n\n`;
    md += `- Total Transactions: ${summary.totalTransactions}\n`;
    md += `- STCG Transactions: ${summary.stcgCount}\n`;
    md += `- LTCG Transactions: ${summary.ltcgCount}\n`;
    md += `- Total Buy Value: ₹${fmt2(summary.totalBuyValue)}\n`;
    md += `- Total Sell Value: ₹${fmt2(summary.totalSellValue)}\n\n`;
    if (analysis.insights?.length) {
      md += `## Tax Insights\n\n`;
      analysis.insights.forEach(i => {
        md += `### ${i.title}\n${i.description}\n\n*Impact: ${i.impact}*\n\n`;
      });
    }
    md += `---\n*Report generated by Stock Analyzer*\n`;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename=tax_analysis_${analysis.fiscalYear}_${timestamp}.md`);
    res.send(md);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === AI ASSISTANT MARKET DATA ENDPOINTS ===

// Get top movers (gainers/losers) - for AI context
app.get('/api/top-movers', async (req, res) => {
  try {
    const { type = 'gainers', limit = 5, market = 'NSE' } = req.query;

    // Get all holdings with current prices
    const holdingsWithPrices = [];
    for (const holding of data.holdings) {
      if (market === 'NSE' && !['NSE', 'BSE'].includes(holding.market)) continue;
      if (market === 'NYSE' && !['NYSE', 'NASDAQ'].includes(holding.market)) continue;

      const currentPrice = holding.currentPrice || holding.avgPrice;
      const dayChangePercent = holding.dayChangePercent || 0;

      holdingsWithPrices.push({
        symbol: holding.symbol,
        name: holding.name,
        market: holding.market,
        currentPrice,
        dayChangePercent,
        dayChange: holding.dayChange || 0,
      });
    }

    // Sort by day change
    holdingsWithPrices.sort((a, b) =>
      type === 'gainers'
        ? b.dayChangePercent - a.dayChangePercent
        : a.dayChangePercent - b.dayChangePercent
    );

    res.json(holdingsWithPrices.slice(0, parseInt(limit)));
  } catch (error) {
    console.error('Top movers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search for any stock and get quote - for AI to analyze stocks user doesn't own
app.post('/api/search-stock', async (req, res) => {
  try {
    const { symbol, market } = req.body;

    if (!symbol || !market) {
      return res.status(400).json({ error: 'Symbol and market are required' });
    }

    const yahooSymbol = getYahooSymbol(symbol, market);

    // Get detailed quote with error handling
    let quote = null;
    try {
      quote = await yahooFinance.quote(yahooSymbol);
    } catch (quoteErr) {
      console.error(`Quote error for ${yahooSymbol}:`, quoteErr.message);
      return res.status(404).json({
        error: `Stock data not available for ${symbol}. Please check the symbol and try again.`,
        symbol,
        market
      });
    }

    // Validate quote has minimum required data
    if (!quote || (!quote.regularMarketPrice && !quote.price)) {
      return res.status(404).json({
        error: `No price data available for ${symbol}`,
        symbol,
        market
      });
    }

    // Try to get fundamental data
    let roe = null;
    let profitMargin = null;
    let debtToEquity = null;
    try {
      const summary = await yahooFinance.quoteSummary(yahooSymbol, {
        modules: ['defaultKeyStatistics', 'financialData']
      });
      roe = summary.defaultKeyStatistics?.returnOnEquity?.raw;
      profitMargin = summary.financialData?.profitMargins?.raw;
      debtToEquity = summary.financialData?.debtToEquity?.raw;
    } catch (err) {
      console.log(`Fundamental data not available for ${yahooSymbol}`);
    }

    res.json({
      symbol: symbol.toUpperCase(),
      name: quote?.longName || quote?.shortName || quote?.displayName || symbol.toUpperCase(),
      market,
      price: quote?.regularMarketPrice || quote?.price || 0,
      change: quote?.regularMarketChange || quote?.change || 0,
      changePercent: quote?.regularMarketChangePercent || quote?.changePercent || 0,
      open: quote?.regularMarketOpen || quote?.open || 0,
      high: quote?.regularMarketDayHigh || quote?.dayHigh || 0,
      low: quote?.regularMarketDayLow || quote?.dayLow || 0,
      previousClose: quote?.regularMarketPreviousClose || quote?.previousClose || 0,
      volume: quote?.regularMarketVolume || quote?.volume || 0,
      marketCap: quote?.marketCap || null,
      pe: quote?.trailingPE || quote?.forwardPE || null,
      pb: quote?.priceToBook || null,
      roe,
      profitMargin,
      debtToEquity,
      dividendYield: quote?.dividendYield ? quote.dividendYield * 100 : 0,
      eps: quote?.epsTrailingTwelveMonths || null,
      high52Week: quote?.fiftyTwoWeekHigh || 0,
      low52Week: quote?.fiftyTwoWeekLow || 0,
      ma50: quote?.fiftyDayAverage || 0,
      ma200: quote.twoHundredDayAverage || 0,
    });
  } catch (error) {
    console.error('Search stock error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sector analysis - analyze specific sector performance
app.post('/api/sector-analysis', async (req, res) => {
  try {
    const { sector, market = 'NSE' } = req.body;

    if (!sector) {
      return res.status(400).json({ error: 'Sector is required' });
    }

    // Filter holdings by sector and market
    const sectorHoldings = data.holdings.filter(h => {
      const matchesSector = h.sector === sector;
      const matchesMarket = market === 'NSE'
        ? ['NSE', 'BSE'].includes(h.market)
        : ['NYSE', 'NASDAQ'].includes(h.market);
      return matchesSector && matchesMarket;
    });

    if (sectorHoldings.length === 0) {
      return res.json({
        sector,
        market,
        holdings: [],
        avgPerformance: 0,
        totalValue: 0,
        message: `No ${sector} holdings found in ${market} market`
      });
    }

    let totalValue = 0;
    let totalPnL = 0;
    let totalInvested = 0;

    const holdings = sectorHoldings.map(h => {
      const currentPrice = h.currentPrice || h.avgPrice;
      const currentValue = currentPrice * h.quantity;
      const invested = h.avgPrice * h.quantity;
      const pnl = currentValue - invested;
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

      totalValue += currentValue;
      totalPnL += pnl;
      totalInvested += invested;

      return {
        symbol: h.symbol,
        name: h.name,
        currentPrice,
        quantity: h.quantity,
        currentValue,
        pnl,
        pnlPercent,
        dayChangePercent: h.dayChangePercent || 0,
      };
    });

    res.json({
      sector,
      market,
      holdings: holdings.sort((a, b) => b.currentValue - a.currentValue),
      avgPerformance: totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0,
      totalValue,
      totalPnL,
      totalInvested,
      count: sectorHoldings.length,
    });
  } catch (error) {
    console.error('Sector analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available stock universe from screener
app.get('/api/stock-universe', (req, res) => {
  try {
    const { market = 'NSE' } = req.query;

    const nseStocks = [
      'HDFCBANK', 'ICICIBANK', 'KOTAKBANK', 'SBIN', 'AXISBANK', 'INDUSINDBK',
      'TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM',
      'HINDUNILVR', 'ITC', 'NESTLEIND', 'BRITANNIA', 'DABUR',
      'RELIANCE', 'ONGC', 'BPCL', 'NTPC', 'POWERGRID',
      'SUNPHARMA', 'DRREDDY', 'CIPLA', 'DIVISLAB', 'BIOCON',
      'MARUTI', 'TATAMOTORS', 'M&M', 'BAJAJ-AUTO', 'HEROMOTOCO',
      'TATASTEEL', 'HINDALCO', 'JSWSTEEL', 'VEDL', 'SAIL',
    ];

    const nyseStocks = [
      'AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'TSLA', 'AMZN',
      'JPM', 'BAC', 'WFC', 'GS', 'MS',
      'JNJ', 'UNH', 'PFE', 'ABBV', 'LLY',
      'KO', 'PG', 'WMT', 'MCD', 'NKE',
    ];

    res.json({
      market,
      stocks: market === 'NSE' ? nseStocks : nyseStocks,
      count: market === 'NSE' ? nseStocks.length : nyseStocks.length,
    });
  } catch (error) {
    console.error('Stock universe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Chat endpoint using Portkey middleware with Claude
const PORTKEY_BASE_URL = 'https://api.portkey.ai';

// Multi-provider model mappings for Portkey
const PROVIDER_MODELS = {
  anthropic: {
    'sonnet': '@vertexai-global/anthropic.claude-sonnet-4-5@20250929',
    'opus': '@vertexai-global/anthropic.claude-opus-4-5@20251101',
    'haiku': '@vertexai-global/anthropic.claude-haiku-4-5@20251001',
  },
  openai: {
    'gpt-4o': 'gpt-4o',
    'gpt-4-turbo': 'gpt-4-turbo-preview',
    'gpt-3.5-turbo': 'gpt-3.5-turbo',
  },
  google: {
    'gemini-pro': 'gemini-1.5-pro',
    'gemini-flash': 'gemini-1.5-flash',
  }
};

// Available AI models via Portkey (backwards compatibility)
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

    // Load API key from settings
    const settings = loadSettings();
    const PORTKEY_API_KEY = settings.portkeyApiKey;

    if (!PORTKEY_API_KEY) {
      return res.status(400).json({
        error: 'Portkey API key not configured. Please update your settings.',
        requiresSetup: true
      });
    }

    // Get provider and model from settings
    const provider = settings.aiProvider || 'anthropic';
    const modelKey = model || settings.claudeModel || 'sonnet';

    console.log(`[AI Config] Provider: ${provider}, Model Key: ${modelKey}`);

    // Look up the actual model ID for the provider
    let selectedModel;

    // Check new multi-provider format first
    if (PROVIDER_MODELS[provider]?.[modelKey]) {
      selectedModel = PROVIDER_MODELS[provider][modelKey];
      console.log(`[AI Config] Using multi-provider model: ${selectedModel}`);
    } else {
      // Fallback to legacy AI_MODELS for backwards compatibility
      selectedModel = AI_MODELS[model] || AI_MODELS[DEFAULT_MODEL];
      console.log(`[AI Config] Using legacy model: ${selectedModel}`);
    }

    if (!selectedModel) {
      console.error(`[ERROR] Invalid model ${modelKey} for provider ${provider}`);
      return res.status(400).json({
        error: `Model ${modelKey} not available for provider ${provider}`
      });
    }

    console.log(`[AI Config] Final model: ${selectedModel}`);

    // Fetch market context for AI
    let marketContext = '';
    try {
      // Get market indices
      const indicesRes = await axios.get(`http://localhost:${PORT}/api/market-indices`);
      const indices = indicesRes.data;

      marketContext += '\n\nMARKET INDICES (Current):\n';
      indices.forEach(idx => {
        marketContext += `- ${idx.name}: ${idx.price.toFixed(2)} (${idx.changePercent >= 0 ? '+' : ''}${idx.changePercent.toFixed(2)}%)\n`;
      });

      // Get top gainers (from user's portfolio)
      const gainersRes = await axios.get(`http://localhost:${PORT}/api/top-movers?type=gainers&limit=3`);
      if (gainersRes.data.length > 0) {
        marketContext += '\n\nTOP GAINERS TODAY (from your portfolio):\n';
        gainersRes.data.forEach(stock => {
          marketContext += `- ${stock.symbol}: ${stock.dayChangePercent >= 0 ? '+' : ''}${stock.dayChangePercent.toFixed(2)}%\n`;
        });
      }

      // Get top losers (from user's portfolio)
      const losersRes = await axios.get(`http://localhost:${PORT}/api/top-movers?type=losers&limit=3`);
      if (losersRes.data.length > 0) {
        marketContext += '\n\nTOP LOSERS TODAY (from your portfolio):\n';
        losersRes.data.forEach(stock => {
          marketContext += `- ${stock.symbol}: ${stock.dayChangePercent.toFixed(2)}%\n`;
        });
      }

      // Get available stock universe
      const nseUniverseRes = await axios.get(`http://localhost:${PORT}/api/stock-universe?market=NSE`);
      const nyseUniverseRes = await axios.get(`http://localhost:${PORT}/api/stock-universe?market=NYSE`);

      marketContext += `\n\nAVAILABLE STOCK UNIVERSE:\n`;
      marketContext += `- NSE Stocks (${nseUniverseRes.data.count}): ${nseUniverseRes.data.stocks.slice(0, 10).join(', ')}...\n`;
      marketContext += `- NYSE Stocks (${nyseUniverseRes.data.count}): ${nyseUniverseRes.data.stocks.slice(0, 10).join(', ')}...\n`;
    } catch (err) {
      console.log('Could not fetch market context:', err.message);
    }

    const systemPrompt = `You are a Stock Market Expert AI Assistant with REAL-TIME market data access via Yahoo Finance API.

🔥 POWERFUL REAL-TIME DATA TOOLS AVAILABLE:
1. USER'S PORTFOLIO: Complete holdings with current prices, P&L, and performance data
2. LIVE MARKET DATA: Real-time indices (Nifty 50, Sensex, S&P 500, NASDAQ), top gainers/losers
3. YAHOO FINANCE ACCESS: Direct access to Yahoo Finance API for ANY stock worldwide
4. HISTORICAL DATA: OHLCV data for any period (1mo, 3mo, 6mo, 1y, 2y, 5y)
5. COMPANY PROFILES: Business descriptions, industry, sector, headquarters, employee count
6. FINANCIAL STATEMENTS: Income statement, balance sheet, cash flow data
7. TECHNICAL INDICATORS: RSI, MACD, Moving Averages (50/200 DMA), Bollinger Bands
8. STOCK SCREENER: Filter stocks by P/E, dividend yield, market cap, price
9. STOCK COMPARISONS: Side-by-side comparison of multiple stocks

🎯 YOUR CAPABILITIES (ALL WITH REAL-TIME DATA):
- ✅ Analyze user's portfolio (holdings, P&L, diversification, risk)
- ✅ Search ANY stock worldwide and get live data (not limited to portfolio)
- ✅ Get historical price data and identify trends, patterns, support/resistance
- ✅ Fetch company information (what they do, industry, business model)
- ✅ Access financial statements (revenue, profit, cash flow, balance sheet)
- ✅ Compare multiple stocks side-by-side with key metrics
- ✅ Calculate technical indicators (RSI, Moving Averages, momentum)
- ✅ Screen stocks by criteria (find undervalued, high dividend, growth stocks)
- ✅ Analyze sector performance and market trends
- ✅ Provide investment recommendations based on fundamentals + technicals
- ✅ Answer ANY market question with real data (not generic advice)

📊 HOW TO USE YOUR TOOLS EFFECTIVELY:
1. **For Stock Research**: Use getCompanyInfo() first to understand business, then getFinancialStatements() for fundamentals
2. **For Technical Analysis**: Use getTechnicalIndicators() for RSI, MAs, then getHistoricalPrices() to see price trends
3. **For Stock Comparison**: Use compareStocks() to show side-by-side metrics with real numbers
4. **For Finding Opportunities**: Use screenStocks() to filter by criteria (e.g., P/E < 15, dividend > 3%)
5. **For Trend Analysis**: Use getHistoricalPrices() to see price movements over different periods

⚡ WHEN ANALYZING (BE SPECIFIC WITH REAL DATA):
- ALWAYS use real numbers from tools (not generic "it's good/bad")
- Example: "RELIANCE P/E is 24.5 vs industry average 18.2 (35% premium)"
- Example: "RSI at 72 indicates overbought, suggest waiting for pullback to 50-55"
- Example: "Stock trading at ₹2,450, 52-week high ₹2,850 (14% below high), support at ₹2,300"
- Identify risks with data: "Banking exposure 45% of portfolio (recommend reducing to 30%)"
- For comparisons, show metrics side-by-side in table format

🎯 ANSWERING STRATEGY:
1. **"What is X company?"** → Use getCompanyInfo() to fetch business description, industry, sector
2. **"Should I buy X?"** → Use compareStocks() + getTechnicalIndicators() + getFinancialStatements()
3. **"Compare X vs Y"** → Use compareStocks() with both symbols
4. **"Find high dividend stocks"** → Use screenStocks() with minDividendYield filter
5. **"Is X overvalued?"** → Use searchStock() for P/E, then compareStocks() with peers
6. **"Show me X price chart"** → Use getHistoricalPrices() and describe trend/pattern
7. **"What's X's revenue?"** → Use getFinancialStatements() with type='income'

🚀 IMPORTANT BEHAVIORS:
- ALWAYS fetch live data - don't rely on general knowledge from training
- Use multiple tools for comprehensive analysis (company info + financials + technicals)
- Show actual numbers, not vague statements
- For any stock mentioned, you can get live data instantly
- When user asks "what do you think about X", analyze it with real data using your tools
- Don't say "I don't have access" - you have Yahoo Finance API access for ANY stock!

${portfolioContext}${marketContext}`;

    // Define tools for Claude to call
    const tools = [
      {
        name: "searchStock",
        description: "Get detailed real-time quote, fundamentals, and technical analysis for any stock symbol. Use this when user asks about a specific stock (even if they don't own it).",
        input_schema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Stock symbol (e.g., TCS, AAPL, RELIANCE)"
            },
            market: {
              type: "string",
              enum: ["NSE", "NYSE", "NASDAQ", "BSE"],
              description: "Market exchange where stock is listed"
            }
          },
          required: ["symbol", "market"]
        }
      },
      {
        name: "getHistoricalPrices",
        description: "Get historical price data for technical analysis, chart patterns, trend analysis. Returns OHLCV data for specified period. Use when user asks about price history, trends, support/resistance levels.",
        input_schema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Stock symbol (e.g., RELIANCE, AAPL)"
            },
            market: {
              type: "string",
              enum: ["NSE", "NYSE"],
              description: "Market exchange"
            },
            period: {
              type: "string",
              enum: ["1mo", "3mo", "6mo", "1y", "2y", "5y"],
              description: "Historical period to fetch",
              default: "1y"
            }
          },
          required: ["symbol", "market"]
        }
      },
      {
        name: "getCompanyInfo",
        description: "Get detailed company profile, business description, industry, sector, employee count, headquarters. Use when user asks 'what does this company do', 'tell me about company X', or needs business overview.",
        input_schema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Stock symbol"
            },
            market: {
              type: "string",
              enum: ["NSE", "NYSE"],
              description: "Market exchange"
            }
          },
          required: ["symbol", "market"]
        }
      },
      {
        name: "getFinancialStatements",
        description: "Get income statement, balance sheet, cash flow data for fundamental analysis. Returns revenue, earnings, assets, liabilities, cash from operations. Use when user asks about company financials, profitability, cash flow.",
        input_schema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Stock symbol"
            },
            market: {
              type: "string",
              enum: ["NSE", "NYSE"],
              description: "Market exchange"
            },
            type: {
              type: "string",
              enum: ["income", "balance", "cashflow"],
              description: "Type of financial statement",
              default: "income"
            }
          },
          required: ["symbol", "market"]
        }
      },
      {
        name: "compareStocks",
        description: "Compare multiple stocks side-by-side on key metrics (P/E, ROE, Market Cap, Dividend Yield, Revenue Growth). Use when user asks 'compare X vs Y', 'which is better', 'X or Y for investment'.",
        input_schema: {
          type: "object",
          properties: {
            stocks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  symbol: { type: "string" },
                  market: { type: "string", enum: ["NSE", "NYSE"] }
                },
                required: ["symbol", "market"]
              },
              description: "Array of stocks to compare (2-5 stocks)",
              minItems: 2,
              maxItems: 5
            }
          },
          required: ["stocks"]
        }
      },
      {
        name: "getTechnicalIndicators",
        description: "Calculate technical indicators: RSI, MACD, Bollinger Bands, Moving Averages (50, 200 DMA), support/resistance levels. Use when user asks about technical analysis, overbought/oversold conditions, momentum.",
        input_schema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Stock symbol"
            },
            market: {
              type: "string",
              enum: ["NSE", "NYSE"],
              description: "Market exchange"
            }
          },
          required: ["symbol", "market"]
        }
      },
      {
        name: "screenStocks",
        description: "Screen/filter stocks by criteria: P/E ratio, dividend yield, market cap, sector, price range. Returns list of stocks matching criteria. Use when user asks 'find stocks with X criteria', 'high dividend stocks', 'undervalued stocks'.",
        input_schema: {
          type: "object",
          properties: {
            market: {
              type: "string",
              enum: ["NSE", "NYSE"],
              description: "Market to screen"
            },
            filters: {
              type: "object",
              properties: {
                maxPE: { type: "number", description: "Maximum P/E ratio" },
                minDividendYield: { type: "number", description: "Minimum dividend yield %" },
                minMarketCap: { type: "number", description: "Minimum market cap in billions" },
                maxPrice: { type: "number", description: "Maximum stock price" },
                sector: { type: "string", description: "Sector filter (Banking, IT, Pharma, etc.)" }
              }
            }
          },
          required: ["market"]
        }
      },
      {
        name: "getMarketIndices",
        description: "Get current values and performance of major market indices (Nifty 50, Sensex, S&P 500, NASDAQ). Use when user asks about overall market performance.",
        input_schema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "getSectorAnalysis",
        description: "Analyze performance of a specific sector in user's portfolio or the market. Returns all holdings in that sector with their performance.",
        input_schema: {
          type: "object",
          properties: {
            sector: {
              type: "string",
              description: "Sector name (e.g., Banking, IT, Pharma, Energy, Auto)"
            },
            market: {
              type: "string",
              enum: ["NSE", "NYSE"],
              description: "Market to analyze",
              default: "NSE"
            }
          },
          required: ["sector"]
        }
      },
      {
        name: "getTopMovers",
        description: "Get top gaining or losing stocks from user's portfolio today. Use when user asks 'what's moving today' or 'biggest movers'.",
        input_schema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["gainers", "losers"],
              description: "Type of movers to fetch"
            },
            limit: {
              type: "number",
              description: "Number of stocks to return",
              default: 5
            },
            market: {
              type: "string",
              enum: ["NSE", "NYSE"],
              description: "Market filter",
              default: "NSE"
            }
          },
          required: ["type"]
        }
      }
    ];

    // Build headers - only add anthropic-version for Claude
    const headers = {
      'Content-Type': 'application/json',
      'x-portkey-api-key': PORTKEY_API_KEY,
    };

    if (provider === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01';
    }

    console.log(`[AI Config] Request headers:`, Object.keys(headers));
    console.log(`[AI Config] API Key present: ${!!PORTKEY_API_KEY}, Length: ${PORTKEY_API_KEY?.length || 0}`);

    // Call Claude via Portkey middleware with tools
    const response = await axios.post(
      `${PORTKEY_BASE_URL}/v1/messages`,
      {
        model: selectedModel,
        max_tokens: settings.maxTokens || 20000,
        system: systemPrompt,
        tools,
        messages: [
          ...history.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          { role: 'user', content: message },
        ],
      },
      {
        headers: headers,
        timeout: 120000,
      }
    );

    // Handle tool calls if Claude requests them
    let finalResponse = response.data.content[0].text;

    // Check if Claude used tools
    if (response.data.stop_reason === 'tool_use') {
      const toolUses = response.data.content.filter(c => c.type === 'tool_use');

      // Execute tool calls
      const toolResults = [];
      for (const toolUse of toolUses) {
        let toolResult = null;

        try {
          switch (toolUse.name) {
            case 'searchStock':
              const stockRes = await axios.post(`http://localhost:${PORT}/api/search-stock`, {
                symbol: toolUse.input.symbol,
                market: toolUse.input.market
              });
              toolResult = JSON.stringify(stockRes.data);
              break;

            case 'getHistoricalPrices':
              const histRes = await axios.get(`http://localhost:${PORT}/api/historical/${toolUse.input.symbol}/${toolUse.input.market}`, {
                params: { period: toolUse.input.period || '1y' }
              });
              toolResult = JSON.stringify(histRes.data);
              break;

            case 'getCompanyInfo':
              const yahooSym = getYahooSymbol(toolUse.input.symbol, toolUse.input.market);
              try {
                const companyInfo = await yahooFinance.quoteSummary(yahooSym, {
                  modules: ['assetProfile', 'summaryProfile']
                });
                toolResult = JSON.stringify({
                  symbol: toolUse.input.symbol,
                  companyName: companyInfo.assetProfile?.longName || companyInfo.summaryProfile?.longName || toolUse.input.symbol,
                  industry: companyInfo.assetProfile?.industry || 'N/A',
                  sector: companyInfo.assetProfile?.sector || 'N/A',
                  country: companyInfo.assetProfile?.country || 'N/A',
                  website: companyInfo.assetProfile?.website || 'N/A',
                  employees: companyInfo.assetProfile?.fullTimeEmployees || 'N/A',
                  description: companyInfo.assetProfile?.longBusinessSummary || 'Company profile data not available',
                  headquarters: companyInfo.assetProfile?.city ?
                    `${companyInfo.assetProfile.city}${companyInfo.assetProfile.state ? ', ' + companyInfo.assetProfile.state : ''}${companyInfo.assetProfile.country ? ', ' + companyInfo.assetProfile.country : ''}` : 'N/A'
                });
              } catch (compErr) {
                toolResult = JSON.stringify({
                  symbol: toolUse.input.symbol,
                  error: `Company information not available for ${toolUse.input.symbol}`,
                  message: compErr.message
                });
              }
              break;

            case 'getFinancialStatements':
              const finYahooSym = getYahooSymbol(toolUse.input.symbol, toolUse.input.market);
              const finModule = toolUse.input.type === 'balance' ? 'balanceSheetHistory' :
                              toolUse.input.type === 'cashflow' ? 'cashflowStatementHistory' :
                              'incomeStatementHistory';
              try {
                const financials = await yahooFinance.quoteSummary(finYahooSym, {
                  modules: [finModule, 'financialData', 'defaultKeyStatistics']
                });
                toolResult = JSON.stringify({
                  symbol: toolUse.input.symbol,
                  type: toolUse.input.type,
                  data: financials[finModule] || {},
                  currentData: {
                    revenue: financials.financialData?.totalRevenue?.fmt || 'N/A',
                    profitMargin: financials.financialData?.profitMargins?.fmt || 'N/A',
                    operatingMargin: financials.financialData?.operatingMargins?.fmt || 'N/A',
                    roe: financials.financialData?.returnOnEquity?.fmt || 'N/A',
                    roa: financials.financialData?.returnOnAssets?.fmt || 'N/A',
                    debtToEquity: financials.financialData?.debtToEquity?.fmt || 'N/A',
                    currentRatio: financials.financialData?.currentRatio?.fmt || 'N/A',
                    freeCashFlow: financials.financialData?.freeCashflow?.fmt || 'N/A'
                  }
                });
              } catch (finErr) {
                toolResult = JSON.stringify({
                  symbol: toolUse.input.symbol,
                  error: `Financial statements not available for ${toolUse.input.symbol}`,
                  message: finErr.message
                });
              }
              break;

            case 'compareStocks':
              const comparisons = [];
              for (const stock of toolUse.input.stocks) {
                try {
                  const cmpYahooSym = getYahooSymbol(stock.symbol, stock.market);
                  const quote = await yahooFinance.quote(cmpYahooSym);

                  // Check if quote has minimum data
                  if (!quote || (!quote.regularMarketPrice && !quote.price)) {
                    comparisons.push({
                      symbol: stock.symbol,
                      market: stock.market,
                      error: 'Price data not available'
                    });
                    continue;
                  }

                  let summary = null;
                  try {
                    summary = await yahooFinance.quoteSummary(cmpYahooSym, {
                      modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail']
                    });
                  } catch (summErr) {
                    console.log(`Summary data not available for ${cmpYahooSym}`);
                  }

                  comparisons.push({
                    symbol: stock.symbol,
                    market: stock.market,
                    price: quote?.regularMarketPrice || quote?.price || 'N/A',
                    change: quote?.regularMarketChangePercent || quote?.changePercent || 0,
                    marketCap: summary?.summaryDetail?.marketCap?.fmt || quote?.marketCap?.fmt || 'N/A',
                    pe: quote?.trailingPE || quote?.forwardPE || 'N/A',
                    pb: quote?.priceToBook || 'N/A',
                    roe: summary?.defaultKeyStatistics?.returnOnEquity?.fmt || 'N/A',
                    dividendYield: summary?.summaryDetail?.dividendYield?.fmt || (quote?.dividendYield ? (quote.dividendYield * 100).toFixed(2) + '%' : 'N/A'),
                    eps: quote?.epsTrailingTwelveMonths || 'N/A',
                    beta: quote?.beta || 'N/A',
                    fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh || 'N/A',
                    fiftyTwoWeekLow: quote?.fiftyTwoWeekLow || 'N/A'
                  });
                } catch (err) {
                  comparisons.push({
                    symbol: stock.symbol,
                    market: stock.market,
                    error: `Data not available: ${err.message}`
                  });
                }
              }
              toolResult = JSON.stringify({ stocks: comparisons });
              break;

            case 'getTechnicalIndicators':
              const techYahooSym = getYahooSymbol(toolUse.input.symbol, toolUse.input.market);

              try {
                // Get historical data for calculations
                const techHist = await yahooFinance.chart(techYahooSym, {
                  period1: Math.floor((Date.now() - (365 * 24 * 60 * 60 * 1000)) / 1000),
                  period2: Math.floor(Date.now() / 1000),
                  interval: '1d'
                });

                if (!techHist || !techHist.quotes || techHist.quotes.length === 0) {
                  toolResult = JSON.stringify({
                    symbol: toolUse.input.symbol,
                    error: 'Insufficient historical data for technical analysis'
                  });
                  break;
                }

                const prices = techHist.quotes.map(q => q.close).filter(p => p && !isNaN(p));

                if (prices.length < 15) {
                  toolResult = JSON.stringify({
                    symbol: toolUse.input.symbol,
                    error: `Only ${prices.length} data points available. Need at least 15 for technical analysis.`
                  });
                  break;
                }

                // Calculate indicators
                const sma50 = prices.length >= 50 ? prices.slice(-50).reduce((a, b) => a + b) / 50 : null;
                const sma200 = prices.length >= 200 ? prices.slice(-200).reduce((a, b) => a + b) / 200 : null;

                // RSI calculation (14-day)
                let rsi = null;
                if (prices.length >= 15) {
                  const changes = [];
                  for (let i = 1; i < prices.length; i++) {
                    changes.push(prices[i] - prices[i - 1]);
                  }
                  const recentChanges = changes.slice(-14);
                  const gains = recentChanges.filter(c => c > 0).reduce((a, b) => a + b, 0) / 14;
                  const losses = Math.abs(recentChanges.filter(c => c < 0).reduce((a, b) => a + b, 0)) / 14;
                  const rs = gains / (losses || 1);
                  rsi = 100 - (100 / (1 + rs));
                }

                const currentPrice = prices[prices.length - 1];
                const yearPrices = prices.slice(-252);

                toolResult = JSON.stringify({
                  symbol: toolUse.input.symbol,
                  currentPrice: currentPrice?.toFixed(2),
                  sma50: sma50 ? sma50.toFixed(2) : 'N/A (need 50 days data)',
                  sma200: sma200 ? sma200.toFixed(2) : 'N/A (need 200 days data)',
                  goldenCross: sma50 && sma200 ? sma50 > sma200 : null,
                  deathCross: sma50 && sma200 ? sma50 < sma200 : null,
                  rsi: rsi ? rsi.toFixed(2) : 'N/A',
                  rsiSignal: rsi ? (rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral') : 'N/A',
                  priceAboveSMA50: sma50 ? currentPrice > sma50 : null,
                  priceAboveSMA200: sma200 ? currentPrice > sma200 : null,
                  fiftyTwoWeekRange: yearPrices.length > 0 ? {
                    high: Math.max(...yearPrices).toFixed(2),
                    low: Math.min(...yearPrices).toFixed(2),
                    currentPosition: ((currentPrice - Math.min(...yearPrices)) / (Math.max(...yearPrices) - Math.min(...yearPrices)) * 100).toFixed(1) + '%'
                  } : 'N/A'
                });
              } catch (techErr) {
                toolResult = JSON.stringify({
                  symbol: toolUse.input.symbol,
                  error: `Technical analysis failed: ${techErr.message}`
                });
              }
              break;

            case 'screenStocks':
              const screenMarket = toolUse.input.market;
              const filters = toolUse.input.filters || {};

              // Get stock universe
              const universeRes = await axios.get(`http://localhost:${PORT}/api/stock-universe`, {
                params: { market: screenMarket }
              });
              const stockList = universeRes.data.stocks;

              const screenResults = [];
              for (const sym of stockList.slice(0, 20)) { // Limit to 20 for performance
                try {
                  const screenYahooSym = getYahooSymbol(sym, screenMarket);
                  const screenQuote = await yahooFinance.quote(screenYahooSym);
                  const screenSummary = await yahooFinance.quoteSummary(screenYahooSym, {
                    modules: ['defaultKeyStatistics', 'summaryDetail']
                  });

                  const pe = screenQuote.trailingPE;
                  const price = screenQuote.regularMarketPrice;
                  const divYield = screenSummary.summaryDetail?.dividendYield?.raw * 100 || 0;
                  const marketCapNum = screenQuote.marketCap / 1e9; // Convert to billions

                  // Apply filters
                  let match = true;
                  if (filters.maxPE && pe && pe > filters.maxPE) match = false;
                  if (filters.minDividendYield && divYield < filters.minDividendYield) match = false;
                  if (filters.minMarketCap && marketCapNum < filters.minMarketCap) match = false;
                  if (filters.maxPrice && price > filters.maxPrice) match = false;
                  // Sector filter would need additional API call for industry/sector

                  if (match) {
                    screenResults.push({
                      symbol: sym,
                      price: price?.toFixed(2),
                      pe: pe?.toFixed(2),
                      dividendYield: divYield?.toFixed(2) + '%',
                      marketCap: marketCapNum?.toFixed(1) + 'B',
                      change: screenQuote.regularMarketChangePercent?.toFixed(2) + '%'
                    });
                  }
                } catch (err) {
                  // Skip stocks that fail
                }
              }

              toolResult = JSON.stringify({
                market: screenMarket,
                filters: filters,
                resultsCount: screenResults.length,
                stocks: screenResults
              });
              break;

            case 'getMarketIndices':
              const indicesRes = await axios.get(`http://localhost:${PORT}/api/market-indices`);
              toolResult = JSON.stringify(indicesRes.data);
              break;

            case 'getSectorAnalysis':
              const sectorRes = await axios.post(`http://localhost:${PORT}/api/sector-analysis`, {
                sector: toolUse.input.sector,
                market: toolUse.input.market || 'NSE'
              });
              toolResult = JSON.stringify(sectorRes.data);
              break;

            case 'getTopMovers':
              const moversRes = await axios.get(`http://localhost:${PORT}/api/top-movers`, {
                params: {
                  type: toolUse.input.type,
                  limit: toolUse.input.limit || 5,
                  market: toolUse.input.market || 'NSE'
                }
              });
              toolResult = JSON.stringify(moversRes.data);
              break;
          }
        } catch (err) {
          toolResult = JSON.stringify({ error: err.message });
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: toolResult
        });
      }

      // Send tool results back to Claude for final response
      const followUpRes = await axios.post(
        `${PORTKEY_BASE_URL}/v1/messages`,
        {
          model: selectedModel,
          max_tokens: settings.maxTokens || 20000,
          system: systemPrompt,
          tools,
          messages: [
            ...history.map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
            { role: 'user', content: message },
            { role: 'assistant', content: response.data.content },
            { role: 'user', content: toolResults }
          ],
        },
        {
          headers: headers,
          timeout: 120000,
        }
      );

      finalResponse = followUpRes.data.content.find(c => c.type === 'text')?.text || finalResponse;
    }

    res.json({ response: finalResponse, model: model || DEFAULT_MODEL });
  } catch (error) {
    console.error('AI Chat error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message ||
                        error.response?.data?.error ||
                        error.message ||
                        'Failed to get AI response';
    res.status(500).json({ error: errorMessage });
  }
});

// Get historical data for stock charts
app.get('/api/historical/:symbol/:market', async (req, res) => {
  try {
    const { symbol, market } = req.params;
    const { period = '1y' } = req.query;

    const yahooSymbol = getYahooSymbol(symbol, market);

    // Map period to Yahoo Finance ranges
    const periodMap = {
      '1mo': { range: '1mo', interval: '1d' },
      '3mo': { range: '3mo', interval: '1d' },
      '6mo': { range: '6mo', interval: '1d' },
      '1y': { range: '1y', interval: '1d' },
      '2y': { range: '2y', interval: '1d' },
      '5y': { range: '5y', interval: '1wk' },
    };

    const { range, interval } = periodMap[period] || periodMap['1y'];

    const result = await yahooFinance.chart(yahooSymbol, {
      period1: getStartDate(period),
      period2: Math.floor(Date.now() / 1000),
      interval,
    });

    if (!result || !result.quotes || result.quotes.length === 0) {
      return res.status(404).json({ error: 'No historical data found' });
    }

    // Format the data
    const historicalData = result.quotes.map(quote => ({
      date: new Date(quote.date).toISOString().split('T')[0],
      open: quote.open || 0,
      high: quote.high || 0,
      low: quote.low || 0,
      close: quote.close || 0,
      volume: quote.volume || 0,
    }));

    res.json({
      symbol,
      market,
      period,
      data: historicalData,
    });
  } catch (error) {
    console.error('Historical data error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate start date from period
function getStartDate(period) {
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;

  let daysBack;
  switch (period) {
    case '1mo': daysBack = 30; break;
    case '3mo': daysBack = 90; break;
    case '6mo': daysBack = 180; break;
    case '1y': daysBack = 365; break;
    case '2y': daysBack = 730; break;
    case '5y': daysBack = 1825; break;
    default: daysBack = 365;
  }

  return Math.floor((now.getTime() - (daysBack * msPerDay)) / 1000);
}

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/renderer/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Stock Analyzer running at: http://localhost:${PORT}\n`);
});
