# Stock Market Analysis App

A comprehensive web application for stock market analysis and investment tracking for India (NSE/BSE) and US (NYSE/NASDAQ) markets.

## Features

### Portfolio Tracking
- Track stock, ETF, REIT, and mutual fund holdings across India (NSE/BSE) and US (NYSE/NASDAQ) markets
- Real-time price updates from Yahoo Finance
- P&L calculation with percentage returns and tax status (STCG/LTCG)
- Support for 80+ Indian stock symbol mappings
- Transaction history with buy/sell/SIP/dividend support
- Auto-refresh capability with configurable intervals (1 min to 2 hours)
- Clickable stock names throughout the app open detailed modals

### Data Import
- **Groww**: Full Excel import with holdings data
- **INDmoney**: Portfolio statement import with automatic market detection (NSE/NYSE)
- **Zerodha**: CSV import support with holdings parsing
- Import history tracking with date/time stamps
- Duplicate detection with replace option
- Delete previous imports with rollback capability

### Stock Detail Modal
- Comprehensive stock information with live quotes
- Interactive price charts with multiple timeframes (1W, 1M, 3M, 6M, 1Y, 5Y)
- 50-Day and 200-Day Moving Averages (DMA) visualization
- Golden Cross and Death Cross detection
- 52-week high/low indicators
- Key metrics: P/E ratio, P/B ratio, Market Cap, Dividend Yield
- Volume analysis and technical indicators

### Settings & Configuration
- **Configurable Portkey API Key**: Use your own API key for AI features
- **AI Model Selection**: Choose between Sonnet, Haiku, or Opus models
- **Adjustable Parameters**: Max tokens (1,000-8,000), temperature (0.0-1.0), extended thinking
- **Test Connection**: Validate API key before saving
- **Secure Storage**: API keys masked in UI, excluded from Git
- **Settings Page**: Easy-to-use interface with tab-based navigation
- **Default Fallback**: Works out-of-box with default configuration

### Educational Features
- **Learn Page**: 6 comprehensive modules covering stock market fundamentals
  1. Stock Market Fundamentals - Stocks, exchanges, market cap, dividends
  2. Financial Metrics & Calculations - P/E, ROE, EPS, CAGR with interactive calculators
  3. Technical Analysis Basics - Moving averages, RSI, MACD, support/resistance
  4. Criteria for Good Stocks - Quality checklist, value/growth/dividend stocks
  5. Portfolio Management - Professional strategies, diversification, rebalancing
  6. Success Criteria & Benchmarks - Performance metrics, benchmarks, goals
- Progress tracking with module completion status
- Interactive calculators for P/E, CAGR, and Dividend Yield
- Real-world examples and case studies
- Tooltips and info icons throughout the app for contextual help

### Analytics Dashboard
- **Overview Tab**: Key metrics, score gauges, best/worst performers
- **Allocation Tab**: Pie charts by holding, market, asset type with 16 distinct colors
- **Health Check Tab**: Diversification score, risk assessment, recommendations
- **Performance Tab**: P&L distribution, winners/losers lists
- Clickable metrics to view detailed stock lists
- Export capabilities: Excel (multi-sheet), CSV, Markdown

### Portfolio Health Check
- Overall health score (0-100)
- Diversification score based on holdings count and concentration
- Risk score based on losers ratio and loss severity
- Actionable recommendations (rebalance, review, profit booking)
- Warnings for concentration, losses, and portfolio issues

### Stock Recommendations
- **Portfolio Insights**: Technical analysis with trend, momentum, and value scores
- **Sector Analysis**: Compare allocation vs. benchmark (Nifty 50 weights)
- **Alerts**: Real-time monitoring for large moves, concentration, tax events
- Signal recommendations: STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL
- 50/200 DMA analysis with visual indicators
- Bookmark functionality to save analysis snapshots
- Export reports in Excel and CSV formats

### Tax Analysis & ITR Helper
- Capital gains calculation (STCG @ 20%, LTCG @ 12.5%)
- Automatic holding period classification (12-month threshold)
- LTCG exemption calculation (₹1.25 lakh)
- ITR Schedule CG report generation
- AIS (Annual Information Statement) CSV import
- Tax-saving insights and recommendations
- Export in Excel, CSV, and Markdown formats

### AI Financial Assistant
- Powered by Claude AI via Portkey middleware
- **Market-Wide Search**: Search any stock beyond just your portfolio
- **AI Tools**: Real-time market data, sector analysis, top movers, stock search
- Multiple model support (Sonnet, Haiku, Opus) - configurable in Settings
- Portfolio context-aware responses with tool calling capabilities
- Bookmark favorite Q&A for quick reference
- Chat history with conversation persistence
- Quick action buttons for common queries

### Price Refresh
- One-click refresh all stock prices
- Auto-refresh with configurable intervals
- Silent refresh updates without loading spinners
- Uses Yahoo Finance API via yahoo-finance2 library
- Automatic symbol mapping for Indian stocks
- Shows success/failure counts and timestamps

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js + Express.js |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| State Management | Zustand |
| Build Tool | Vite |
| Routing | React Router DOM v6 |
| Stock Data | Yahoo Finance (yahoo-finance2) |
| Data Storage | JSON files (data.json, ai_bookmarks.json, tax_analysis.json) |
| File Parsing | XLSX & xlsx-js-style |
| AI Integration | Claude AI via Portkey (Anthropic SDK) |
| Date Utilities | date-fns |
| Financial Calculations | @webcarrot/xirr |

## Quick Start

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher

### Installation

```powershell
# Navigate to project directory
cd stock-analyzer

# Install dependencies
npm install

# Build frontend
npm run build:renderer

# Start server
node server.js
```

### Access
Open browser: **http://localhost:3001**

## Project Structure

```
stock-analyzer/
├── server.js                    # Express backend server
├── data.json                    # Portfolio data storage
├── ai_bookmarks.json            # AI chat bookmarks
├── tax_analysis.json            # Tax analysis results
├── recommendations_bookmarks.json  # Saved recommendations
├── settings.json                # User settings (API keys, AI config) - gitignored
├── package.json                 # Dependencies & scripts
├── docs/                        # Documentation
│   ├── TECHNICAL_DOCUMENTATION.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── FEATURE_GUIDE.md        # Comprehensive feature guide
│   └── EDUCATIONAL_MODULES.md  # Learn page content details
├── src/
│   ├── renderer/                # React frontend
│   │   ├── components/
│   │   │   ├── Analytics/       # Charts & insights
│   │   │   ├── Dashboard/       # Main dashboard with market indices
│   │   │   ├── Import/          # File import (Groww, INDmoney, Zerodha)
│   │   │   ├── Portfolio/       # Holdings management (India/US tabs)
│   │   │   ├── StockPicker/     # Stock recommendations & screener
│   │   │   ├── StockDetail/     # Stock modal with charts & DMAs
│   │   │   ├── Learn/           # Educational modules
│   │   │   ├── AIChat/          # AI assistant with Claude
│   │   │   ├── TaxAnalysis/     # Capital gains & ITR helper
│   │   │   ├── Settings/        # Configurable settings page
│   │   │   ├── common/          # Shared UI components (Tooltip, InfoIcon)
│   │   │   └── Layout/          # App layout & navigation
│   │   ├── store/               # Zustand state management
│   │   ├── utils/               # Formatters & helpers
│   │   │   ├── format.ts
│   │   │   └── technicalAnalysis.ts
│   │   ├── App.tsx              # Main React app with routes
│   │   └── main.tsx             # React entry point
│   └── shared/                  # Shared TypeScript types
│       └── types.ts
└── dist/renderer/               # Built frontend assets
```

## Documentation

- **[Settings Configuration Guide](docs/SETTINGS_CONFIGURATION_GUIDE.md)**: Complete guide to configuring API keys and AI settings
- **[Settings Quick Start](SETTINGS_QUICK_START.md)**: 5-minute setup guide for new users
- **[Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md)**: Detailed module documentation, API reference, data flow, and troubleshooting guide
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)**: Step-by-step installation on fresh systems, production deployment, Docker setup
- **[Feature Guide](docs/FEATURE_GUIDE.md)**: Comprehensive guide to all features with use cases and tips
- **[Educational Modules](docs/EDUCATIONAL_MODULES.md)**: Complete breakdown of Learn page content and learning outcomes
- **[AI Assistant User Guide](docs/AI_ASSISTANT_USER_GUIDE.md)**: AI capabilities, usage examples, and best practices
- **[AI Architecture](docs/AI_ARCHITECTURE.md)**: Technical implementation details of AI integration

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/holdings` | GET/POST | Manage holdings |
| `/api/transactions` | GET/POST | Manage transactions |
| `/api/refresh-prices` | POST | Update all prices |
| `/api/portfolio/summary` | GET | Portfolio totals |
| `/api/portfolio/allocation` | GET | Allocation breakdown |
| `/api/portfolio/health` | GET | Health analysis |
| `/api/import-history` | GET/POST/DELETE | Import records |
| `/api/clear-all` | DELETE | Reset all data |
| `/api/settings` | GET/POST | Get/update settings |
| `/api/settings/test` | POST | Test API connection |
| `/api/ai/chat` | POST | AI assistant chat |
| `/api/top-movers` | GET | Market top gainers/losers |
| `/api/search-stock` | POST | Search for stocks |
| `/api/sector-analysis` | POST | Sector breakdown |

## Common Tasks

### Import Portfolio
1. Go to **Import** page
2. Drag & drop Excel/CSV file from Groww, INDmoney, or Zerodha
3. System auto-detects broker format and market (NSE/NYSE)
4. Preview data and confirm import
5. Holdings appear in Portfolio with proper market classification

### View Stock Details
1. Click on any stock symbol throughout the app (Portfolio, Analytics, Recommendations)
2. Modal opens with:
   - Real-time price and market data
   - Interactive price chart with 50/200 DMAs
   - Golden/Death Cross indicators
   - Key financial metrics (P/E, P/B, Market Cap, Dividend Yield)
   - 52-week high/low analysis
3. Change timeframe: 1W, 1M, 3M, 6M, 1Y, 5Y
4. Press ESC or click outside to close

### Learn Stock Market Basics
1. Go to **Learn** page
2. Select any of 6 modules from sidebar
3. Read content, use interactive calculators
4. Mark modules as complete to track progress
5. Use search to find specific topics
6. Complete all modules to unlock certificate

### Get Stock Recommendations
1. Go to **Recommendations** page
2. Select market (NSE or NYSE)
3. View:
   - **Portfolio Insights**: Technical scores and signals (BUY/SELL/HOLD)
   - **Sector Analysis**: Your allocation vs. benchmark
   - **Alerts**: Real-time risk and opportunity alerts
4. Click on any stock for detailed modal
5. Bookmark important analysis for later review
6. Export recommendations to Excel or CSV

### Analyze Taxes
1. Go to **Tax Analysis** page
2. Upload Excel with buy/sell transactions
3. Or import AIS CSV from Income Tax portal
4. System calculates STCG/LTCG automatically
5. View tax liability and ITR Schedule CG format
6. Download Excel/CSV/Markdown report

### Configure Settings
1. Go to **Settings** page (⚙️ icon in sidebar)
2. **API Configuration** tab:
   - Enter your Portkey API key (get from [portkey.ai](https://portkey.ai))
   - Click "Test Connection" to validate
   - Click "Save Settings"
3. **AI Model Settings** tab (optional):
   - Choose model: Sonnet (recommended), Haiku (fastest), or Opus (most capable)
   - Adjust Max Tokens (1,000-8,000)
   - Adjust Temperature (0.0-1.0)
   - Toggle Extended Thinking
   - Click "Save Settings"

See [Settings Quick Start](SETTINGS_QUICK_START.md) for detailed setup guide.

### Use AI Assistant
1. Go to **AI Chat** page
2. Ask questions about investing, market trends, or your portfolio
3. AI uses real-time market data and portfolio context
4. Use quick action buttons for common queries:
   - Market Overview
   - Portfolio Analysis
   - Find Opportunities
   - Sector Comparison
5. Bookmark useful responses for quick access later
6. Change AI model in Settings if needed

### Refresh Prices
1. Go to **Portfolio** page
2. Click **Refresh Prices** button for one-time update
3. Or use **Auto-Refresh** dropdown to set interval (1 min to 2 hours)
4. Countdown timer shows time until next refresh
5. Silent updates without loading spinners

### View Analytics
1. Go to **Analytics** page
2. Switch between tabs: Overview, Allocation, Health, Performance
3. Click on metrics (Profitable, In Loss) to see stock details
4. Export complete analytics to Excel, CSV, or Markdown

### Clear Portfolio
1. Go to **Portfolio** page
2. Click **Clear All** button
3. Confirm twice to delete all data

## Symbol Mapping

The app maps broker stock names to Yahoo Finance symbols. If a stock price isn't updating:

1. Find the correct Yahoo symbol:
```javascript
// In browser console or Node.js
const YahooFinance = require('yahoo-finance2').default;
const yf = new YahooFinance();
const results = await yf.search('company name');
console.log(results.quotes);
```

2. Add mapping in `server.js`:
```javascript
const SYMBOL_MAP = {
  'BROKERSTOCKNAME': 'YAHOOSYMBOL',
};
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3001 in use | `netstat -ano \| findstr :3001` then `taskkill /F /PID <PID>` |
| Stock price not updating | Add symbol to SYMBOL_MAP in server.js |
| Double quantity after import | Ensure `skipHoldingUpdate: true` in transactions |
| Build fails | Run `npm install` again, check Node version |

See [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md) for detailed troubleshooting.

## Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build:renderer` | Build frontend for production |
| `npm run dev` | Start frontend dev server (hot reload) |
| `node server.js` | Start backend server |

## Disclaimer

This application is for informational purposes only and should not be considered financial advice. Always do your own research before making investment decisions.

## License

MIT License
