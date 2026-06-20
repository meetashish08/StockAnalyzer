# Stock Analyzer

A comprehensive Windows desktop application for stock market analysis and investment tracking for India (NSE/BSE) and US (NYSE/NASDAQ) markets.

## Features

### 1. Portfolio Tracking
- Track your stock and mutual fund holdings
- Real-time price updates from Yahoo Finance
- P&L calculation with day change tracking
- Transaction history with buy/sell/SIP support

### 2. Stock Recommendations
- AI-powered stock analysis using technical and fundamental indicators
- Top 10 daily picks for NSE and NYSE markets
- Scoring based on:
  - Technical indicators (RSI, MACD, Moving Averages, Bollinger Bands)
  - Fundamental metrics (P/E, P/B, ROE, Dividend Yield)
  - Momentum analysis
  - Value scoring

### 3. Analytics Dashboard
- Portfolio allocation by sector, market, and asset type
- Performance charts and P&L distribution
- Top winners and losers tracking
- Comparison with benchmark indices

### 4. Portfolio Health Check
- Diversification score
- Risk assessment
- Corrective action recommendations
- Overweight position alerts
- Tax-loss harvesting opportunities

### 5. Data Import
- CSV/Excel file import
- Broker email parsing (Zerodha, Groww, INDmoney)
- Automatic transaction detection

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Electron (Node.js)
- **Database**: SQLite (better-sqlite3)
- **Charts**: Recharts
- **State Management**: Zustand
- **Stock Data**: Yahoo Finance API

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
cd stock-analyzer

# Install dependencies
npm install

# Start development server
npm run dev

# In another terminal, start Electron
npm start
```

### Build for Production

```bash
# Build the app
npm run build

# Package as Windows installer
npm run package
```

## Project Structure

```
stock-analyzer/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── database/            # SQLite setup & repositories
│   │   ├── services/            # Stock API, analyzer, import
│   │   └── ipc/                 # IPC handlers
│   ├── renderer/                # React frontend
│   │   ├── components/
│   │   │   ├── Dashboard/       # Main dashboard
│   │   │   ├── Portfolio/       # Holdings management
│   │   │   ├── Recommendations/ # Stock picks
│   │   │   ├── Analytics/       # Charts & insights
│   │   │   └── Import/          # Data import
│   │   ├── store/               # Zustand state
│   │   └── utils/               # Helpers
│   └── shared/                  # Shared types
└── package.json
```

## Configuration

### API Keys (Optional)
For additional features, you can add these API keys:

```env
ALPHA_VANTAGE_KEY=your_key_here  # For extended market data
```

## Disclaimer

This application is for informational purposes only and should not be considered financial advice. Always do your own research before making investment decisions.

## License

MIT License
