# Stock Market Analysis App - Deployment Guide

Complete guide to deploy the Stock Market Analysis app on a fresh Windows system.

---

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Step-by-Step Installation](#step-by-step-installation)
3. [Configuration](#configuration)
4. [Running the Application](#running-the-application)
5. [Production Deployment](#production-deployment)
6. [Docker Deployment](#docker-deployment)
7. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements
- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4 GB
- **Storage**: 500 MB free space
- **Internet**: Required for stock price updates

### Software Dependencies
| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20.x or higher | JavaScript runtime |
| npm | 10.x or higher | Package manager (comes with Node.js) |
| Git | 2.x (optional) | Version control |

---

## Step-by-Step Installation

### Step 1: Install Node.js

#### Option A: Direct Download (Recommended)
1. Go to https://nodejs.org/
2. Download **LTS version** (20.x or higher)
3. Run the installer
4. Check all options during installation:
   - [x] Node.js runtime
   - [x] npm package manager
   - [x] Add to PATH
   - [x] Automatically install necessary tools

5. Verify installation:
```powershell
node --version
# Should show: v20.x.x or higher

npm --version
# Should show: 10.x.x or higher
```

#### Option B: Using winget (Windows Package Manager)
```powershell
winget install OpenJS.NodeJS.LTS
```

#### Option C: Using Chocolatey
```powershell
# Install Chocolatey first (run as Administrator)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Node.js
choco install nodejs-lts
```

### Step 2: Install Git (Optional)

If you want to clone from repository:

```powershell
winget install Git.Git
```

Or download from https://git-scm.com/download/win

### Step 3: Get the Application

#### Option A: Clone from Git Repository
```powershell
git clone <repository-url> stock-analyzer
cd stock-analyzer
```

#### Option B: Download ZIP
1. Download the source code ZIP file
2. Extract to desired location (e.g., `C:\Apps\stock-analyzer`)
3. Open PowerShell and navigate to folder:
```powershell
cd C:\Apps\stock-analyzer
```

### Step 4: Install Dependencies

```powershell
# Install all required packages
npm install
```

This installs:
- Express.js (backend server)
- React (frontend framework)
- yahoo-finance2 (stock data)
- xlsx (Excel parsing)
- multer (file uploads)
- axios (HTTP client for AI integration)
- And all other dependencies

**Expected output:**
```
added 670 packages in 30s
```

### Step 5: Build the Frontend

```powershell
npm run build:renderer
```

**Expected output:**
```
vite v5.4.21 building for production...
✓ 858 modules transformed.
✓ built in 20s
```

### Step 6: Start the Application

```powershell
node server.js
```

**Expected output:**
```
Data loaded from: C:\Apps\stock-analyzer\data.json
Server running on http://localhost:3001
```

### Step 7: Access the Application

Open browser and go to: **http://localhost:3001**

---

## Configuration

### Environment Variables (Optional)

Create a `.env` file in the root directory:

```env
# Server port (default: 3001)
PORT=3001

# Node environment
NODE_ENV=production
```

### Data Storage Location

By default, data is stored in `data.json` in the application directory.

To change location, modify in `server.js`:
```javascript
const dataPath = path.join(__dirname, 'data.json');
// Change to:
const dataPath = 'C:\\Data\\stock-analyzer\\data.json';
```

---

## Running the Application

### Development Mode

```powershell
# Terminal 1: Start backend
node server.js

# Terminal 2: Start frontend dev server (with hot reload)
npm run dev
```

### Production Mode

```powershell
# Build frontend
npm run build:renderer

# Start server
node server.js
```

### Run as Background Service

#### Using PM2 (Recommended)

```powershell
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start server.js --name "stock-analyzer"

# View status
pm2 status

# View logs
pm2 logs stock-analyzer

# Stop application
pm2 stop stock-analyzer

# Restart application
pm2 restart stock-analyzer

# Auto-start on system boot
pm2 startup
pm2 save
```

#### Using Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Name: "Stock Analyzer"
4. Trigger: "When the computer starts"
5. Action: "Start a program"
6. Program: `C:\Program Files\nodejs\node.exe`
7. Arguments: `C:\Apps\stock-analyzer\server.js`
8. Start in: `C:\Apps\stock-analyzer`

---

## Production Deployment

### Using NSSM (Non-Sucking Service Manager)

1. Download NSSM from https://nssm.cc/download
2. Extract and add to PATH

```powershell
# Install as Windows service
nssm install StockAnalyzer "C:\Program Files\nodejs\node.exe" "C:\Apps\stock-analyzer\server.js"

# Set working directory
nssm set StockAnalyzer AppDirectory "C:\Apps\stock-analyzer"

# Set to auto-start
nssm set StockAnalyzer Start SERVICE_AUTO_START

# Start the service
nssm start StockAnalyzer

# Check status
nssm status StockAnalyzer
```

### Reverse Proxy with IIS

1. Install IIS with URL Rewrite module
2. Install iisnode: https://github.com/Azure/iisnode

3. Create `web.config` in app directory:
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode" />
    </handlers>
    <rewrite>
      <rules>
        <rule name="Stock Analyzer">
          <match url="/*" />
          <action type="Rewrite" url="server.js" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

### Reverse Proxy with Nginx (Windows)

1. Download Nginx for Windows
2. Configure `nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Docker Deployment

### Create Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build frontend
RUN npm run build:renderer

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "server.js"]
```

### Create docker-compose.yml

```yaml
version: '3.8'

services:
  stock-analyzer:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - ./data.json:/app/data.json
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

### Build and Run

```powershell
# Build image
docker build -t stock-analyzer .

# Run container
docker run -d -p 3001:3001 -v ${PWD}/data.json:/app/data.json --name stock-analyzer stock-analyzer

# Or use docker-compose
docker-compose up -d
```

---

## Quick Start Script

Create `start.bat` for easy startup:

```batch
@echo off
echo Starting Stock Market Analysis App...
echo.

cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Check if frontend is built
if not exist "dist\renderer\index.html" (
    echo Building frontend...
    npm run build:renderer
    if %errorlevel% neq 0 (
        echo ERROR: Failed to build frontend
        pause
        exit /b 1
    )
)

:: Start server
echo.
echo Starting server...
echo Application will be available at: http://localhost:3001
echo Press Ctrl+C to stop the server
echo.
node server.js
```

Create `install.bat` for first-time setup:

```batch
@echo off
echo Stock Market Analysis App - Installation
echo ==========================================
echo.

cd /d "%~dp0"

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed.
    echo.
    echo Please install Node.js first:
    echo 1. Go to https://nodejs.org/
    echo 2. Download and install the LTS version
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Building frontend...
npm run build:renderer
if %errorlevel% neq 0 (
    echo ERROR: Failed to build frontend
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Installation complete!
echo.
echo To start the application:
echo   1. Run start.bat
echo   2. Open http://localhost:3001 in your browser
echo ==========================================
pause
```

---

## Troubleshooting

### "node" is not recognized

**Problem**: PowerShell doesn't find Node.js

**Solution**: 
1. Restart PowerShell after Node.js installation
2. Or add manually to PATH:
```powershell
$env:Path += ";C:\Program Files\nodejs"
```

### npm install fails

**Problem**: Network errors during installation

**Solutions**:
```powershell
# Clear npm cache
npm cache clean --force

# Use different registry
npm config set registry https://registry.npmmirror.com

# Retry installation
npm install
```

### Port 3001 already in use

**Problem**: Another application using port 3001

**Solution**:
```powershell
# Find process using port
netstat -ano | findstr :3001

# Kill process (replace with actual PID)
taskkill /F /PID <PID>

# Or change port in server.js
# const PORT = process.env.PORT || 3002;
```

### Build fails with memory error

**Problem**: Not enough memory for build

**Solution**:
```powershell
# Increase Node.js memory limit
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build:renderer
```

### Yahoo Finance errors

**Problem**: Stock prices not updating

**Solutions**:
1. Check internet connectivity
2. Some corporate networks block Yahoo Finance
3. Try running with:
```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
node server.js
```

### Permission denied errors

**Problem**: Cannot write to data.json

**Solution**: 
1. Run PowerShell as Administrator
2. Or change file permissions:
```powershell
icacls data.json /grant Users:F
```

---

## Backup & Restore

### Backup Data

```powershell
# Backup all data files
copy data.json "data_backup_$(Get-Date -Format 'yyyyMMdd').json"
copy ai_bookmarks.json "ai_bookmarks_backup_$(Get-Date -Format 'yyyyMMdd').json"
copy tax_analysis.json "tax_analysis_backup_$(Get-Date -Format 'yyyyMMdd').json"
```

### Restore Data

```powershell
# Restore from backup
copy data_backup_20260621.json data.json
copy ai_bookmarks_backup_20260621.json ai_bookmarks.json
copy tax_analysis_backup_20260621.json tax_analysis.json
```

### Automated Backup Script

Create `backup.bat`:
```batch
@echo off
set BACKUP_DIR=C:\Backups\stock-analyzer
set DATE=%date:~10,4%%date:~4,2%%date:~7,2%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

copy "%~dp0data.json" "%BACKUP_DIR%\data_%DATE%.json"
echo Backup created: %BACKUP_DIR%\data_%DATE%.json
```

---

## Updates

### Update Application

```powershell
# If using Git
git pull origin main

# Reinstall dependencies (in case of changes)
npm install

# Rebuild frontend
npm run build:renderer

# Restart server
# (stop current server first with Ctrl+C)
node server.js
```

### Update Node.js

```powershell
# Using winget
winget upgrade OpenJS.NodeJS.LTS

# After update, reinstall dependencies
npm install
```

---

## Support

For issues and feature requests:
- Check the Technical Documentation for common issues
- Review error logs in the console
- Create an issue in the repository

---

## Application Features

| Feature | URL | Description |
|---------|-----|-------------|
| Dashboard | http://localhost:3001/ | Portfolio overview, market indices (live), & summary |
| Portfolio | http://localhost:3001/portfolio | Holdings with India/US tabs, auto-refresh, sortable columns, clickable stocks |
| Learn | http://localhost:3001/learn | 6 educational modules with calculators & progress tracking |
| Recommendations | http://localhost:3001/recommendations | Portfolio insights, sector analysis & alerts (with export) |
| Analytics | http://localhost:3001/analytics | Charts & health scores (with Excel/CSV/MD export) |
| Tax Analysis | http://localhost:3001/tax-analysis | Capital gains & ITR helper (with Excel/CSV/MD export) |
| Import | http://localhost:3001/import | Import from brokers (Groww, INDmoney, Zerodha) |
| AI Assistant | http://localhost:3001/ai-chat | AI chat with bookmarks |

### Learn Page Details

The Learn page provides comprehensive stock market education:

**6 Educational Modules**:
1. **Stock Market Fundamentals** - Stocks, exchanges, market cap, bull/bear markets, dividends
2. **Financial Metrics & Calculations** - P/E, ROE, EPS, Dividend Yield, CAGR (with calculators)
3. **Technical Analysis Basics** - Moving averages, RSI, MACD, support/resistance, volume
4. **Criteria for Good Stocks** - Quality checklist, value/growth/dividend stocks, red flags
5. **Portfolio Management** - Professional strategies, diversification, rebalancing, famous investors
6. **Success Criteria & Benchmarks** - Performance metrics, benchmarks, goal setting

**Interactive Calculators**:
- P/E Ratio Calculator (price, EPS → P/E)
- CAGR Calculator (start, end, years → annual growth %)
- Dividend Yield Calculator (dividend, price → yield %)

**Progress Tracking**:
- Module completion status saved in browser
- Progress bar showing X/6 modules completed
- Green checkmarks on completed modules
- Certificate unlock after completing all 6

### Stock Detail Modal

Click any stock symbol throughout the app to open detailed modal:

**Live Quote Data**:
- Current price, day change, open/high/low
- 52-week high/low with distance indicators
- Volume, market cap, P/E, P/B, dividend yield

**Interactive Price Chart**:
- Timeframes: 1W, 1M, 3M, 6M, 1Y, 5Y
- 50-Day and 200-Day Moving Averages (DMAs)
- Golden Cross detection (50 DMA > 200 DMA) - Bullish signal
- Death Cross detection (50 DMA < 200 DMA) - Bearish signal
- Hover tooltips with exact price and date

**Technical Indicators**:
- Price position relative to DMAs
- Trend analysis (uptrend/downtrend)
- Volume analysis

### Recommendations Module Details

The Recommendations page provides three analysis tabs:

**Portfolio Insights**
- Technical analysis for each holding (trend, momentum, value scores)
- Signal recommendations: STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL
- 50/200 DMA analysis with visual indicators
- 52-week high/low context
- P&L tracking with STCG/LTCG tax status
- Detailed rationale for each recommendation
- Bookmark functionality to save snapshots

**Sector Analysis**
- Current vs benchmark allocation comparison (Nifty 50 weights)
- Visual bar charts with benchmark markers
- Overweight/underweight sector warnings
- Missing sector identification for diversification

**Alerts**
- Large daily moves (>3% up or down)
- Concentrated positions (>10% allocation)
- Significant losses (>20% from purchase)
- Profit booking opportunities (>50% gain)
- LTCG qualification countdown (approaching 365 days)

### Portfolio Module Features

**Auto-Refresh**
- Dropdown to select refresh interval: Off, 1-2-5-10-15-30 min, 1-2 hours
- Countdown timer showing time until next refresh
- Silent refresh updates only price fields without loading spinner
- Status message shows "Auto-updated X stocks" briefly

**Summary Cards**
- Total Holdings count
- Total Value (current)
- Total P&L with percentage
- 1D Return with change from last refresh in subscript

**Clickable Stock Symbols**
- Click any stock symbol to open Stock Detail Modal
- View live quotes, charts, DMAs, Golden/Death Cross
- Access from Portfolio, Analytics, Recommendations pages

**Sortable Columns**
Click any column header to sort: Symbol, Qty, Avg Price, Current Price, Value, P&L, 1D Change

### Import Features

**Supported Brokers**:
1. **Groww** - Excel format with auto-detection
2. **INDmoney** - Excel format with automatic market detection (NSE vs NYSE based on ISIN)
3. **Zerodha** - CSV format with holdings parsing

**Market Detection**:
- INDmoney: ISIN code determines market
  - ISIN starts with "US" → NYSE/NASDAQ
  - ISIN starts with "IN" → NSE/BSE
- Automatic currency assignment (USD vs INR)

**Duplicate Handling**:
- Detects previous imports from same broker
- Options: Replace, Keep Both, Cancel
- Replace deletes old holdings and transactions

### Dashboard Features

**Market Overview**
- Live market indices: NIFTY 50, SENSEX, S&P 500, NASDAQ
- Real-time data fetched via Yahoo Finance API
- Auto-refreshes every 60 seconds
- Shows price, change, and percentage change

**Asset Allocation**
- Pie chart with 16 distinct colors (no duplicates)
- Groups holdings beyond top 8 as "Others"
- Click to view detailed breakdown

### Export Capabilities

All major pages now support export functionality:

**Analytics Page**
- Excel (.xlsx) - Multi-sheet styled report (Summary, Holdings, Allocation, Recommendations)
- CSV (.csv) - Holdings data with P&L
- Markdown (.md) - Formatted report for documentation

**Tax Analysis Page**
- Excel (.xlsx) - Styled report (Summary, Transactions, Insights)
- CSV (.csv) - Transaction listing
- Markdown (.md) - Tax summary report

**Recommendations Page**
- Excel (.xlsx) - Professional multi-sheet report with conditional formatting
- CSV - Separate files for Portfolio, Sectors, Alerts

---

## Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Build frontend | `npm run build:renderer` |
| Start server | `node server.js` |
| Development mode | `npm run dev` |
| Access app | http://localhost:3001 |
| Stop server | `Ctrl+C` |

---

## Data Files

| File | Purpose |
|------|---------|
| `data.json` | Portfolio holdings & transactions |
| `ai_bookmarks.json` | Saved AI chat answers |
| `tax_analysis.json` | Tax analysis results |
| `tax_templates.json` | Learned column mappings for Excel formats |
| `recommendations_bookmarks.json` | Saved recommendation snapshots & bookmarks |

---

## Recommendations Module - Complete Feature List

### Data Persistence
- Recommendations cached in browser localStorage
- Persists between sessions (no re-fetch needed on page load)
- Market selection (NSE/NYSE) remembered
- Last refresh timestamp saved

### Export Options
| Format | Description |
|--------|-------------|
| Excel (.xlsx) | Multi-sheet report: Summary, Portfolio, Sectors, Alerts |
| CSV (Portfolio) | Holdings with P&L, signals, tax status |
| CSV (Sectors) | Allocation vs benchmark analysis |
| CSV (Alerts) | Prioritized risk alerts |

### Bookmarks
- Save entire portfolio snapshot
- Save individual stock analysis
- Add notes to bookmarks
- View bookmarked data in Portfolio Insights
- Compare saved vs current analysis

### UI Features
- Sticky table header while scrolling
- Floating stock details panel
- Delta indicators after refresh (↑↓)
- Signal change tracking (HOLD → BUY)
- "Viewing bookmark" mode with exit option
