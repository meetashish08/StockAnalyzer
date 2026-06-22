# Stock Market Analysis App - Technical Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Backend Modules](#backend-modules)
3. [Frontend Modules](#frontend-modules)
4. [Data Flow](#data-flow)
5. [API Reference](#api-reference)
6. [Common Issues & Troubleshooting](#common-issues--troubleshooting)

---

## Architecture Overview

### Technology Stack
- **Backend**: Node.js + Express.js
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Build Tool**: Vite
- **State Management**: Zustand
- **Charts**: Recharts
- **Data Storage**: JSON files (data.json, ai_bookmarks.json, tax_analysis.json)
- **Stock Data**: Yahoo Finance API (yahoo-finance2 library)
- **AI Integration**: Claude AI via Portkey middleware
- **File Parsing**: XLSX library for Excel files

### Directory Structure
```
stock-analyzer/
├── server.js                 # Express backend server
├── data.json                 # Portfolio data storage
├── ai_bookmarks.json         # AI chat bookmarks storage
├── tax_analysis.json         # Tax analysis results storage
├── package.json              # Dependencies and scripts
├── vite.config.ts            # Vite build configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── src/
│   ├── renderer/             # Frontend React application
│   │   ├── components/       # React components
│   │   │   ├── Analytics/    # Portfolio analytics & charts
│   │   │   ├── Dashboard/    # Main dashboard
│   │   │   ├── Import/       # File import functionality
│   │   │   ├── Portfolio/    # Holdings management (India/US tabs)
│   │   │   ├── AIChat/       # AI Assistant with bookmarks
│   │   │   ├── TaxAnalysis/  # Tax analysis & ITR helper
│   │   │   └── Layout/       # App layout & navigation
│   │   ├── store/            # Zustand state management
│   │   ├── utils/            # Utility functions
│   │   ├── App.tsx           # Main React app
│   │   └── main.tsx          # React entry point
│   └── shared/               # Shared types & constants
│       └── types.ts          # TypeScript type definitions
├── dist/                     # Built frontend assets
│   └── renderer/
└── uploads/                  # Temporary file uploads
```

---

## Backend Modules

### 1. Server Core (server.js)

#### Overview
Express.js server handling all API requests, file uploads, and Yahoo Finance integration.

#### Key Components

##### Data Management
```javascript
// Data structure stored in data.json
{
  holdings: [],        // Stock holdings array
  transactions: [],    // Buy/sell transactions
  importHistory: [],   // Import records
  nextHoldingId: 1,    // Auto-increment IDs
  nextTxnId: 1,
  nextImportId: 1
}
```

##### Symbol Mapping (SYMBOL_MAP)
Maps broker-specific stock names to Yahoo Finance symbols:
```javascript
const SYMBOL_MAP = {
  'STATEBANKOFINDIA': 'SBIN',
  'TATACONSULTANCYSERVLT': 'TCS',
  'BHARTIAIRTEL': 'BHARTIARTL',
  'BHARAT22ETF': 'ICICIB22',
  // ... 80+ mappings
};
```

**Why needed**: Brokers like Groww use full company names while Yahoo Finance uses NSE/BSE ticker symbols.

##### Yahoo Finance Integration
```javascript
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// Fetches real-time stock quotes
const quote = await yahooFinance.quote('SBIN.NS');
```

##### Analytics Cache
```javascript
const analyticsCache = {
  allocation: { data: null, timestamp: 0 },
  health: { data: null, timestamp: 0 },
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```
Reduces API calls by caching analytics results.

---

### 2. Holdings Module

#### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/holdings` | Get all holdings |
| POST | `/api/holdings` | Add new holding |
| PUT | `/api/holdings/:id` | Update holding |
| DELETE | `/api/holdings/:id` | Delete holding |

#### Holding Schema
```typescript
interface Holding {
  id: number;
  symbol: string;           // Stock symbol (e.g., "STATEBANKOFINDIA")
  market: 'NSE' | 'BSE';    // Exchange
  name: string;             // Company name
  isin?: string;            // ISIN code
  quantity: number;         // Number of shares
  avgPrice: number;         // Average purchase price
  currentPrice?: number;    // Latest market price
  purchaseDate: string;     // ISO date string
  type: 'STOCK' | 'ETF' | 'MUTUAL_FUND' | 'REIT';
  sector?: string;
  importId?: number;        // Links to import history
  createdAt: string;
  lastPriceUpdate?: string;
}
```

---

### 3. Transactions Module

#### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | Get all transactions |
| GET | `/api/transactions?holdingId=X` | Get transactions for holding |
| POST | `/api/transactions` | Add transaction |

#### Transaction Schema
```typescript
interface Transaction {
  id: number;
  holdingId: number;
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'SIP';
  quantity: number;
  price: number;
  date: string;
  fees: number;
  source: 'MANUAL' | 'IMPORT' | 'GMAIL';
  notes?: string;
}
```

#### skipHoldingUpdate Flag
When importing from brokers, holdings already have correct quantities. Pass `skipHoldingUpdate: true` to prevent double-counting:
```javascript
POST /api/transactions
{
  holdingId: 1,
  type: 'BUY',
  quantity: 10,
  price: 100,
  skipHoldingUpdate: true  // Don't add to holding quantity
}
```

---

### 4. Import Module

#### Supported Formats
- **Groww**: Excel files with holdings data
- **INDmoney**: Excel files with portfolio data
- **Zerodha**: Excel/CSV files (basic support)

#### Import Flow
1. User uploads Excel file via `/api/upload`
2. Frontend parses file using XLSX library
3. Detects broker format from file structure
4. Extracts holdings data (symbol, quantity, avgPrice, currentPrice)
5. Creates import history record
6. Checks for duplicate imports (same source)
7. Creates holdings with `importId` reference
8. Creates transactions with `skipHoldingUpdate: true`

#### Import History Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/import-history` | List all imports |
| POST | `/api/import-history` | Create import record |
| DELETE | `/api/import-history/:id` | Delete import & holdings |
| GET | `/api/import-history/check` | Check for duplicates |

---

### 5. Price Refresh Module

#### Endpoint
```
POST /api/refresh-prices
```

#### Process
1. Iterates through all holdings
2. Maps symbol to Yahoo format using SYMBOL_MAP
3. Tries NSE (.NS), then BSE (.BO) suffix
4. Updates `currentPrice` and `lastPriceUpdate`
5. Returns success/failure counts

#### Response
```json
{
  "success": true,
  "updated": 81,
  "failed": 0,
  "total": 81,
  "errors": [],
  "message": "Updated 81 of 81 holdings"
}
```

---

### 6. Analytics Module

#### Portfolio Summary
```
GET /api/portfolio/summary
```
Returns:
- Total invested amount
- Current portfolio value
- Total P&L (absolute and percentage)
- Day change
- Holdings count

#### Portfolio Allocation
```
GET /api/portfolio/allocation
```
Returns allocation breakdown by:
- Holding (individual stocks)
- Market (NSE/BSE)
- Asset Type (STOCK/ETF/REIT)
- Sector

#### Portfolio Health
```
GET /api/portfolio/health
```
Returns:
- **Overall Score** (0-100): Combined health rating
- **Diversification Score**: Based on holdings count, concentration
- **Risk Score**: Based on losers ratio, big losses
- **Warnings**: Issues needing attention
- **Recommendations**: Actionable suggestions

##### Scoring Algorithm
```javascript
// Diversification Score penalties
if (numHoldings < 5) score -= 30;
if (maxWeight > 25%) score -= 20;
if (top5Weight > 70%) score -= 15;

// Risk Score penalties
if (loserRatio > 50%) score -= 25;
if (bigLosers > 0) score -= 5 per loser;
if (avgLoss < -30%) score -= 20;
```

---

## Frontend Modules

### 1. State Management (useStore.ts)

Uses Zustand for global state:
```typescript
interface StoreState {
  holdingsWithPrices: HoldingWithPrice[];
  isLoadingHoldings: boolean;
  fetchHoldings: () => Promise<void>;
  addHolding: (data) => Promise<void>;
  deleteHolding: (id) => Promise<void>;
  // ... more actions
}
```

### 2. Components

#### Dashboard
- Portfolio value summary
- P&L display
- Quick stats cards
- Navigation to other modules

#### Portfolio
- Holdings table with sorting
- Add/Edit holding modal
- Refresh prices button
- Clear all functionality
- Transaction management

#### Import
- File upload (drag & drop)
- Broker format detection
- Preview before import
- Duplicate detection dialog
- Import history list

#### Analytics
- **Overview Tab**: Key metrics, score gauges, best/worst performers
- **Allocation Tab**: Pie charts, holdings breakdown
- **Health Check Tab**: Scores, warnings, recommendations
- **Performance Tab**: P&L distribution, winners/losers

##### Clickable Metrics
Metrics like "Profitable", "In Loss" open modals showing:
- Stock list with details
- Sortable table
- Total value and P&L

### 3. Utility Functions (format.ts)

```typescript
formatCurrency(value, currency)  // ₹1,23,456 or $1,234.56
formatPrice(value, currency)     // 2 decimal places
formatPercent(value)             // +12.34%
formatCompactNumber(value)       // 1.5 Cr, 50 L, 10 K
formatDate(dateString)           // 21 Jun 2026
```

---

## Data Flow

### Import Flow
```
Excel File → Upload → Parse (XLSX) → Detect Broker
    ↓
Validate Data → Check Duplicates → Create Import Record
    ↓
Create Holdings → Create Transactions (skipHoldingUpdate)
    ↓
Invalidate Cache → Refresh UI
```

### Price Refresh Flow
```
User clicks "Refresh Prices"
    ↓
POST /api/refresh-prices
    ↓
For each holding:
  Map symbol (SYMBOL_MAP)
  → Try SYMBOL.NS (NSE)
  → Try SYMBOL.BO (BSE)
  → Update currentPrice
    ↓
Save data.json → Invalidate cache → Return results
```

### Analytics Calculation Flow
```
GET /api/portfolio/health
    ↓
Check cache (5 min TTL)
    ↓
If stale: Calculate scores
  - Fetch current prices
  - Calculate P&L for each holding
  - Calculate diversification metrics
  - Calculate risk metrics
  - Generate warnings & recommendations
    ↓
Cache results → Return response
```

---

## API Reference

### Holdings
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/holdings` | - | `Holding[]` |
| POST | `/api/holdings` | `{symbol, market, name, quantity, avgPrice, ...}` | `Holding` |
| PUT | `/api/holdings/:id` | `{field: value}` | `Holding` |
| DELETE | `/api/holdings/:id` | - | `{success: true}` |

### Transactions
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/transactions` | - | `Transaction[]` |
| POST | `/api/transactions` | `{holdingId, type, quantity, price, date, skipHoldingUpdate?}` | `Transaction` |

### Import
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/import-history` | - | `ImportRecord[]` |
| POST | `/api/import-history` | `{source, filename, count, date}` | `ImportRecord` |
| DELETE | `/api/import-history/:id` | - | `{success, deletedHoldings}` |
| GET | `/api/import-history/check?source=X` | - | `{exists, import}` |

### Analytics
| Method | Endpoint | Query | Response |
|--------|----------|-------|----------|
| GET | `/api/portfolio/summary` | - | `PortfolioSummary` |
| GET | `/api/portfolio/allocation` | `?refresh=true` | `AllocationData` |
| GET | `/api/portfolio/health` | `?refresh=true` | `HealthData` |

### Prices
| Method | Endpoint | Response |
|--------|----------|----------|
| POST | `/api/refresh-prices` | `{success, updated, failed, total, errors}` |
| GET | `/api/quote/:symbol/:market` | `StockQuote` |

### Utility
| Method | Endpoint | Response |
|--------|----------|----------|
| DELETE | `/api/clear-all` | `{success: true}` |
| GET | `/api/search?q=X` | `SearchResult[]` |

---

## Common Issues & Troubleshooting

### 1. Yahoo Finance 401 Unauthorized

**Symptom**: Price refresh fails with 401 errors

**Cause**: Direct API calls to Yahoo Finance are blocked

**Solution**: The app uses `yahoo-finance2` library which handles authentication. Ensure:
```javascript
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
```

### 2. Symbol Not Found

**Symptom**: Specific stock prices not updating

**Cause**: Broker uses different name than Yahoo Finance

**Solution**: Add mapping to SYMBOL_MAP in server.js:
```javascript
const SYMBOL_MAP = {
  'BROKERNAME': 'YAHOOSYMBOL',
  // Example: 'STATEBANKOFINDIA': 'SBIN'
};
```

**To find correct Yahoo symbol**:
```javascript
const results = await yahooFinance.search('company name');
console.log(results.quotes);
```

### 3. Double Quantity on Import

**Symptom**: Holdings show 2x the actual quantity

**Cause**: Transactions are updating holdings after import already set values

**Solution**: Always pass `skipHoldingUpdate: true` when creating transactions from imports:
```javascript
await fetch('/api/transactions', {
  method: 'POST',
  body: JSON.stringify({
    ...transactionData,
    skipHoldingUpdate: true
  })
});
```

### 4. Port Already in Use (EADDRINUSE)

**Symptom**: Server fails to start with "EADDRINUSE: address already in use :::3001"

**Solution**:
```powershell
# Find process using port
netstat -ano | findstr :3001

# Kill process (replace PID)
taskkill /F /PID <PID>
```

### 5. Node Version Mismatch

**Symptom**: "Unsupported environment: Requires Node >= 22.0.0"

**Cause**: yahoo-finance2 v3.x prefers Node 22+

**Impact**: Warning only, functionality works on Node 20.x

**Solution**: Upgrade Node.js or ignore warning (works with Node 20+)

### 6. Cache Not Updating

**Symptom**: Analytics show stale data after import

**Cause**: Cache TTL not expired

**Solution**: 
- Use `?refresh=true` query parameter
- Or wait 5 minutes for cache expiry
- Or call `invalidateCache()` after data changes (already done in server)

### 7. Excel Parse Errors

**Symptom**: Import fails with parse error

**Cause**: Unexpected file format or structure

**Solution**:
- Ensure file is .xlsx format
- Check file isn't password protected
- Verify header row is at expected position (row 11 for Groww)

### 8. SSL Certificate Errors

**Symptom**: "CERT_HAS_EXPIRED" or SSL errors

**Cause**: Corporate proxy or firewall issues

**Solution**: Set environment variable (not recommended for production):
```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
```

### 9. Memory Issues with Large Portfolios

**Symptom**: Slow performance with 100+ holdings

**Solution**:
- Price refresh processes sequentially with 200ms delay
- Analytics use caching to reduce recalculation
- Consider pagination for very large portfolios

### 10. Incorrect P&L Calculation

**Symptom**: P&L shows wrong values

**Causes & Solutions**:
1. **Wrong avgPrice**: Check import parsing logic
2. **Wrong currentPrice**: Verify symbol mapping
3. **Wrong quantity**: Check for double-counting (skipHoldingUpdate)

**Debug**:
```javascript
// Check holding data
curl http://localhost:3001/api/holdings | jq '.[] | select(.symbol == "STOCKNAME")'
```

---

## Performance Considerations

### API Rate Limiting
- Yahoo Finance has rate limits
- Price refresh uses 200ms delay between requests
- Batch requests where possible

### Caching Strategy
- Analytics cached for 5 minutes
- Cache invalidated on data changes (import, delete, update)
- Force refresh with `?refresh=true`

### Data Storage
- JSON file storage (data.json)
- Synchronous writes (blocking)
- Consider SQLite for larger deployments

---

## Security Notes

1. **No Authentication**: App runs locally, no auth implemented
2. **File Upload**: Uploads stored temporarily in /uploads
3. **API Keys**: No API keys required (Yahoo Finance is free)
4. **Data Storage**: All data stored locally in data.json

---

---

## AI Chat Module

### Overview
AI-powered financial assistant using Claude via Portkey middleware.

### Available Models
```javascript
const AI_MODELS = {
  'claude-sonnet': '@vertexai-global/anthropic.claude-sonnet-4-5@20250929',  // Default
  'claude-haiku': '@vertexai-global/anthropic.claude-haiku-4-5@20251001',
  'claude-opus': '@vertexai-global/anthropic.claude-opus-4-5@20251101',
};
```

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai/models` | Get available AI models |
| POST | `/api/ai/chat` | Send message to AI |
| GET | `/api/ai/bookmarks` | Get saved bookmarks |
| POST | `/api/ai/bookmarks` | Save answer as bookmark |
| DELETE | `/api/ai/bookmarks/:id` | Delete bookmark |

### Chat Request
```json
{
  "message": "Analyze my portfolio",
  "portfolioContext": "User's portfolio summary...",
  "history": [{"role": "user", "content": "..."}, ...],
  "model": "claude-sonnet"
}
```

### Bookmark Storage (ai_bookmarks.json)
```json
{
  "bookmarks": [
    {
      "id": 1,
      "question": "User's question",
      "answer": "Complete AI response",
      "model": "claude-sonnet",
      "createdAt": "2026-06-21T..."
    }
  ],
  "nextBookmarkId": 2
}
```

---

## Tax Analysis Module

### Overview
Analyzes financial Excel data for capital gains calculation and ITR filing assistance.

### Features
- Excel file upload and parsing
- Auto-detection of column mappings
- STCG/LTCG classification (12-month threshold)
- Tax calculation (STCG @ 20%, LTCG @ 12.5%)
- LTCG exemption (₹1.25 lakh)
- ITR Schedule CG generation
- Tax-saving insights

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tax/analyze` | Upload & analyze Excel file |
| POST | `/api/tax/import-ais` | Import AIS CSV from Income Tax portal |
| GET | `/api/tax/analyses` | List all analyses |
| GET | `/api/tax/analyses/:id` | Get specific analysis |
| DELETE | `/api/tax/analyses/:id` | Delete analysis |
| GET | `/api/tax/itr-report/:id` | Generate ITR report |

### Capital Gains Classification
```javascript
function classifyCapitalGain(buyDate, sellDate) {
  const holdingDays = (sellDate - buyDate) / (1000 * 60 * 60 * 24);
  return {
    type: holdingDays > 365 ? 'LTCG' : 'STCG',
    holdingMonths: Math.floor(holdingDays / 30),
  };
}
```

### Tax Rates (FY 2024-25)
| Type | Rate | Exemption |
|------|------|-----------|
| STCG (Section 111A) | 20% | None |
| LTCG (Section 112A) | 12.5% | ₹1,25,000/year |

### Expected Excel Format
Auto-detected columns:
- Symbol / Script / Scrip / ISIN
- Buy Date / Purchase Date
- Sell Date / Sale Date
- Quantity / Qty / Units
- Buy Price / Purchase Price
- Sell Price / Sale Price
- Gain / Profit / P&L (optional)

### Analysis Output
```typescript
interface TaxAnalysis {
  id: number;
  fileName: string;
  fiscalYear: string;
  summary: {
    totalTransactions: number;
    totalSTCG: number;
    totalLTCG: number;
    taxableSTCG: number;
    taxableLTCG: number;
    estimatedSTCGTax: number;
    estimatedLTCGTax: number;
    totalEstimatedTax: number;
  };
  transactions: Transaction[];
  insights: Insight[];
  topGainers: Transaction[];
  topLosers: Transaction[];
}
```

### ITR Report Format
Generates Schedule CG data for ITR-2/ITR-3:
- Section 111A (STCG on listed equity with STT)
- Section 112A (LTCG on listed equity/MF with STT)
- Loss carry-forward details (8 years)

### AIS (Annual Information Statement) Import

Import pre-calculated capital gains data directly from Income Tax portal CSV exports.

#### How to Get AIS CSV
1. Login to incometax.gov.in
2. Go to e-File → View AIS
3. Click "Download" → Select CSV format
4. Choose "SecData" or "Schedule 112A Details"

#### AIS CSV Format (SecData)
| Column | Description |
|--------|-------------|
| FY | Financial Year (e.g., 2024-25) |
| ISIN Code | Security identifier |
| Name of the Security | Full company/fund name |
| Asset Type | "Short term" or "Long term" |
| Units | Quantity sold |
| Sale Consideration | Total sale value |
| Cost of Acquisition | Total purchase value |
| Short Term Capital Gain | Pre-calculated STCG |
| Long Term Capital Gain | Pre-calculated LTCG |
| OPTION TO PAY TAX @10% | Y/N for pre-July 2024 transactions |

#### AIS Import Benefits
- **Official Data**: Values directly from CDSL/NSDL records
- **Pre-calculated**: STCG/LTCG already computed by depository
- **10% Tax Option**: Detects grandfathered transactions eligible for old tax rates
- **High Confidence**: 95%+ accuracy since data is government-verified
- **All Securities**: Stocks, ETFs, Mutual Funds from all demat accounts

#### AIS Parsing Logic
```javascript
// Extract gain from AIS - use pre-calculated values
const stcg = parseNum(getValue(colMap.stcg));
const ltcg = parseNum(getValue(colMap.ltcgWithoutIndexation));

if (isShortTerm && stcg !== 0) {
  gain = stcg;
  classificationType = 'STCG';
} else if (isLongTerm && ltcg !== 0) {
  gain = ltcg;
  classificationType = 'LTCG';
}
```

---

## Future Improvements

1. **Database**: Migrate from JSON to SQLite/PostgreSQL
2. **Authentication**: Add user login for multi-user support
3. **Real-time Updates**: WebSocket for live price updates
4. **More Brokers**: Add Zerodha, Angel One, Upstox parsers
5. **Mobile App**: React Native version
6. **Alerts**: Price alerts and notifications
7. **Advanced Tax**: Support for debt funds, grandfathering clause
