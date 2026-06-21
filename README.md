# Stock Market Analysis App

A comprehensive web application for stock market analysis and investment tracking for India (NSE/BSE) and US (NYSE/NASDAQ) markets.

## Features

### Portfolio Tracking
- Track stock, ETF, REIT, and mutual fund holdings
- Real-time price updates from Yahoo Finance
- P&L calculation with percentage returns
- Support for 80+ Indian stock symbol mappings
- Transaction history with buy/sell/SIP/dividend support

### Data Import
- **Groww**: Full Excel import with holdings data
- **INDmoney**: Portfolio statement import
- **Zerodha**: Basic Excel/CSV support
- Import history tracking with date/time stamps
- Duplicate detection with replace option
- Delete previous imports

### Analytics Dashboard
- **Overview Tab**: Key metrics, score gauges, best/worst performers
- **Allocation Tab**: Pie charts by holding, market, asset type
- **Health Check Tab**: Diversification score, risk assessment, recommendations
- **Performance Tab**: P&L distribution, winners/losers lists
- Clickable metrics to view detailed stock lists

### Portfolio Health Check
- Overall health score (0-100)
- Diversification score based on holdings count and concentration
- Risk score based on losers ratio and loss severity
- Actionable recommendations (rebalance, review, profit booking)
- Warnings for concentration, losses, and portfolio issues

### Price Refresh
- One-click refresh all stock prices
- Uses Yahoo Finance API via yahoo-finance2 library
- Automatic symbol mapping for Indian stocks
- Shows success/failure counts

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js + Express.js |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| State Management | Zustand |
| Build Tool | Vite |
| Stock Data | Yahoo Finance (yahoo-finance2) |
| Data Storage | JSON file |

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
├── server.js              # Express backend
├── data.json              # Data storage
├── package.json           # Dependencies
├── docs/                  # Documentation
│   ├── TECHNICAL_DOCUMENTATION.md
│   └── DEPLOYMENT_GUIDE.md
├── src/
│   ├── renderer/          # React frontend
│   │   ├── components/
│   │   │   ├── Analytics/ # Charts & insights
│   │   │   ├── Dashboard/ # Main dashboard
│   │   │   ├── Import/    # File import
│   │   │   ├── Portfolio/ # Holdings management
│   │   │   └── Layout/    # Navigation
│   │   ├── store/         # Zustand state
│   │   └── utils/         # Formatters
│   └── shared/            # TypeScript types
└── dist/renderer/         # Built frontend
```

## Documentation

- **[Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md)**: Detailed module documentation, API reference, data flow, and troubleshooting guide
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)**: Step-by-step installation on fresh systems, production deployment, Docker setup

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

## Common Tasks

### Import Portfolio
1. Go to **Import** page
2. Drag & drop Excel file from Groww/INDmoney
3. Preview data and confirm import
4. Holdings appear in Portfolio

### Refresh Prices
1. Go to **Portfolio** page
2. Click **Refresh Prices** button
3. Wait for completion (shows X/Y updated)

### View Analytics
1. Go to **Analytics** page
2. Switch between tabs: Overview, Allocation, Health, Performance
3. Click on metrics (Profitable, In Loss) to see stock details

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
