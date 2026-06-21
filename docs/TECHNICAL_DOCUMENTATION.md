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
- **Data Storage**: JSON file (data.json)
- **Stock Data**: Yahoo Finance API (yahoo-finance2 library)

### Directory Structure
```
stock-analyzer/
├── server.js                 # Express backend server
├── data.json                 # Persistent data storage
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
│   │   │   ├── Portfolio/    # Holdings management
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

## Future Improvements

1. **Database**: Migrate from JSON to SQLite/PostgreSQL
2. **Authentication**: Add user login for multi-user support
3. **Real-time Updates**: WebSocket for live price updates
4. **More Brokers**: Add Zerodha, Angel One, Upstox parsers
5. **Mobile App**: React Native version
6. **Alerts**: Price alerts and notifications
7. **Tax Reports**: Capital gains report generation
