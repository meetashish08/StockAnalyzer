# Stock Market Analysis App - Feature Guide

Complete guide to all features with detailed explanations, use cases, and tips.

---

## Table of Contents
1. [Portfolio Management](#portfolio-management)
2. [Stock Picker & Recommendations](#stock-picker--recommendations)
3. [Learn Page - Educational Modules](#learn-page---educational-modules)
4. [Analytics & Charts](#analytics--charts)
5. [Tax Analysis & ITR Helper](#tax-analysis--itr-helper)
6. [Import from Brokers](#import-from-brokers)
7. [Stock Detail Modal](#stock-detail-modal)
8. [AI Financial Assistant](#ai-financial-assistant)
9. [Dashboard & Market Overview](#dashboard--market-overview)

---

## Portfolio Management

### What It Does
Centralized hub for tracking all your stock holdings across Indian (NSE/BSE) and US (NYSE/NASDAQ) markets with real-time price updates and P&L tracking.

### Key Features

#### Multi-Market Support
- **India Tab**: NSE and BSE stocks, ETFs, REITs, Mutual Funds
- **US Tab**: NYSE and NASDAQ stocks
- Automatic market classification on import
- Separate currency formatting (₹ for INR, $ for USD)

#### Auto-Refresh
- Configurable refresh intervals: Off, 1 min, 2 min, 5 min, 10 min, 15 min, 30 min, 1 hour, 2 hours
- Countdown timer showing time until next refresh
- Silent refresh updates only price fields without loading spinners
- Status message: "Auto-updated X stocks" briefly displayed

#### Holdings Table
- **Sortable Columns**: Click any header to sort
  - Symbol, Quantity, Average Price, Current Price, Value, P&L, 1D Change
- **Clickable Stock Symbols**: Opens detailed modal
- **Color-coded P&L**: Green for profits, red for losses
- **STCG/LTCG Badges**: Tax classification based on holding period

#### Summary Cards
| Card | Display |
|------|---------|
| Total Holdings | Count with tab filter (India/US) |
| Total Value | Current portfolio value with currency |
| Total P&L | Amount + percentage (₹+12,345 / +8.5%) |
| 1D Return | Today's gain/loss + change from last refresh (subscript) |

#### Transaction Management
- Add buy/sell transactions for each holding
- Track purchase date, price, quantity, fees
- View complete transaction history
- Automatic holding period calculation for tax classification

### How to Use

#### Add a Stock Manually
1. Click **Add Stock** button
2. Fill in details:
   - Symbol (e.g., TCS, AAPL)
   - Market (NSE/BSE/NYSE/NASDAQ)
   - Quantity and average price
   - Purchase date
   - Stock type (STOCK/ETF/REIT/MUTUAL_FUND)
3. Click **Save**

#### Enable Auto-Refresh
1. Click **Auto-Refresh** dropdown in top-right
2. Select interval (e.g., "5 min")
3. Countdown timer appears
4. Prices update silently at intervals

#### View Stock Details
1. Click on any stock symbol in the table
2. Modal opens with live data and charts
3. View 50/200 DMAs, technical indicators
4. Press ESC to close

#### Refresh Prices Manually
1. Click **Refresh Prices** button
2. Wait for completion (shows "Updated X of Y holdings")
3. Success/failure counts displayed

### Tips & Tricks
- Use auto-refresh during market hours for live tracking
- Sort by P&L% to quickly identify top gainers/losers
- Click stock symbols for quick technical analysis
- LTCG holdings (>365 days) qualify for lower tax rate
- Export analytics before tax season for records

### Example Use Cases
1. **Active Trader**: Set 1-2 min auto-refresh during market hours
2. **Long-term Investor**: Weekly manual refresh sufficient
3. **Tax Planning**: Filter by STCG (sell before 1 year) vs LTCG
4. **Portfolio Review**: Sort by P&L% to identify profit-booking opportunities

---

## Stock Picker & Recommendations

### What It Does
AI-powered portfolio analysis providing actionable buy/sell signals, sector allocation insights, and real-time risk alerts based on technical indicators and fundamental analysis.

### Key Features

#### Portfolio Insights Tab
Analyzes each holding with technical scoring:

**Scoring System (0-100)**
- **Technical Score**: Trend analysis using 50/200 DMAs
  - Price above 200 DMA = +20 points
  - Price above 50 DMA = +15 points
  - Golden Cross (50 DMA > 200 DMA) = +15 points
  
- **Momentum Score**: Recent performance
  - Daily gain > 2% = +20 points
  - Near 52-week high (within 5%) = +20 points
  
- **Value Score**: P/E based valuation
  - P/E < 15 = 80 points (undervalued)
  - P/E 15-25 = 65 points (fair)
  - P/E > 25 = 40 points (growth premium)

**Signal Generation**
| Overall Score | P&L Status | Signal |
|---------------|------------|--------|
| ≥ 75 | > -10% | STRONG_BUY |
| ≥ 60 | Any | BUY |
| 46-59 | Any | HOLD |
| ≤ 45 | Any | SELL |
| ≤ 30 or P&L < -20% | Any | STRONG_SELL |

**Rationale Provided**
Each stock includes human-readable analysis:
- "Strong uptrend - price above both 50 and 200 DMA"
- "Undervalued - P/E of 12.5 below industry average"
- "High momentum - up 5.2% today, near 52-week high"
- "Qualified for LTCG tax benefit (held 450 days)"

#### Sector Analysis Tab
Compares your allocation against benchmark (Nifty 50 for NSE):

**Benchmark Weights**
| Sector | Nifty 50 % |
|--------|-----------|
| Financial Services | 25% |
| IT | 15% |
| Consumer Goods | 12% |
| Pharma | 10% |
| Auto | 8% |
| Energy | 8% |

**Analysis Outputs**
- Overweight sectors (>1.5x benchmark) - Risk of concentration
- Underweight sectors (<0.5x benchmark) - Diversification opportunity
- Missing sectors - Add for balanced portfolio
- Visual bar charts with benchmark markers

#### Alerts Tab
Real-time monitoring for portfolio events:

| Alert Type | Trigger Condition | Priority |
|------------|------------------|----------|
| SURGE | Daily gain > 3% | MEDIUM/HIGH |
| DROP | Daily loss > 3% | MEDIUM/HIGH |
| CONCENTRATION | Single stock > 10% portfolio | MEDIUM/HIGH |
| LOSS | Total loss > 20% from purchase | MEDIUM/HIGH |
| PROFIT | Total gain > 50% | LOW |
| TAX | LTCG qualification in 65 days | MEDIUM |

#### Bookmarks
Save analysis snapshots for later comparison:
- Bookmark entire portfolio or individual stock
- Add notes to bookmarks
- View historical analysis vs. current
- Track signal changes over time (HOLD → BUY)

### How to Use

#### Get Portfolio Recommendations
1. Go to **Recommendations** page
2. Select market from dropdown (NSE or NYSE)
3. Click **Refresh** to fetch latest data
4. Review Portfolio Insights tab:
   - Green signals (STRONG_BUY, BUY) = Consider buying more
   - Red signals (SELL, STRONG_SELL) = Consider exiting
   - Read rationale for each stock
5. Check tax status before selling (STCG vs LTCG)

#### Analyze Sector Allocation
1. Go to **Sector Analysis** tab
2. View bar chart comparing your allocation vs. benchmark
3. Identify overweight sectors (reduce position)
4. Identify underweight sectors (add exposure)
5. Add missing sectors for diversification

#### Monitor Alerts
1. Go to **Alerts** tab
2. Review high-priority alerts first
3. Act on alerts:
   - SURGE/DROP > 3%: Check news, decide if temporary or trend change
   - CONCENTRATION > 10%: Trim position, rebalance
   - LOSS > 20%: Review fundamentals, consider stop-loss
   - PROFIT > 50%: Book partial profits, let rest run
   - TAX: Wait for LTCG if near 365 days

#### Save Analysis
1. Click **Bookmark** button in Portfolio Insights
2. Choose "Portfolio" or individual stock
3. Add optional notes (e.g., "Pre-earnings analysis")
4. Access bookmarks from **Bookmarks** tab
5. View saved analysis alongside current data

#### Export Reports
1. Click **Export** dropdown
2. Choose format:
   - **Excel**: Professional multi-sheet report with formatting
   - **CSV**: Separate files for Portfolio, Sectors, Alerts
3. Save file for records or sharing

### Tips & Tricks
- Refresh recommendations weekly for long-term portfolios
- Don't blindly follow signals - read rationale
- Compare your sector allocation quarterly
- Set alerts as calendar reminders for tax planning
- Bookmark analysis before major events (earnings, budget)
- Delta indicators (↑3 / ↓5) show score changes after refresh

### Example Use Cases
1. **Weekly Review**: Check signals, rebalance overweight sectors
2. **Tax Optimization**: Monitor LTCG alerts, delay selling if near 365 days
3. **Risk Management**: Act on CONCENTRATION and LOSS alerts
4. **Profit Booking**: Book 50% when stock shows PROFIT alert + SELL signal
5. **Sector Rotation**: Add underweight sectors after market correction

---

## Learn Page - Educational Modules

### What It Does
Comprehensive stock market education platform with 6 interactive modules covering fundamentals to advanced portfolio management strategies. Built-in calculators and progress tracking.

### Key Features

#### 6 Learning Modules
1. **Stock Market Fundamentals** (📈)
   - What stocks are and how exchanges work
   - Market capitalization (Large/Mid/Small cap)
   - Bull vs Bear markets
   - Dividends and stock splits

2. **Financial Metrics & Calculations** (🧮)
   - P/E Ratio with calculator
   - ROE, P/B Ratio, EPS
   - Dividend Yield calculator
   - Debt-to-Equity ratio
   - CAGR calculator

3. **Technical Analysis Basics** (📊)
   - Moving Averages (50 DMA, 200 DMA)
   - Golden Cross & Death Cross
   - RSI (Relative Strength Index)
   - MACD indicators
   - Support & Resistance levels
   - Volume analysis

4. **Criteria for Good Stocks** (✅)
   - Universal quality checklist (7 must-haves)
   - Value stocks (low P/E, high dividend)
   - Growth stocks (high revenue growth)
   - Dividend stocks (stable income)
   - Red flags to avoid
   - Competitive moat analysis

5. **Portfolio Management** (💼)
   - Professional investment process (6 steps)
   - Famous strategies (Buffett, Lynch, Graham, Cathie Wood)
   - Diversification guidelines
   - Position sizing by conviction
   - Rebalancing strategies
   - Exit criteria

6. **Success Criteria & Benchmarks** (🎯)
   - Performance metrics (Alpha, Beta, Sharpe Ratio)
   - Indian benchmarks (Nifty 50: ~12% CAGR)
   - US benchmarks (S&P 500: ~10% CAGR)
   - Success by investor type (Conservative/Moderate/Aggressive)
   - Time horizon goals
   - Self-assessment checklist

#### Interactive Calculators
- **P/E Ratio Calculator**: Enter price & EPS, get P/E instantly
- **CAGR Calculator**: Enter start/end values & years, get annual growth rate
- **Dividend Yield Calculator**: Enter dividend & price, get yield %

#### Progress Tracking
- Module completion tracking (saved in browser)
- Progress bar showing X/6 modules completed
- Green checkmarks on completed modules
- Certificate unlock after completing all 6 modules

#### Search & Navigation
- Search bar to find specific topics across all modules
- Sidebar navigation to jump between modules
- Collapsible sections for easy scanning

### How to Use

#### Start Learning
1. Go to **Learn** page from navigation
2. See progress bar at top (0/6 initially)
3. Select first module: "Stock Market Fundamentals"
4. Read content section by section
5. Click "Mark Complete" when finished
6. Progress updates automatically

#### Use Calculators
**P/E Ratio Example**:
1. Go to "Financial Metrics" module
2. Scroll to P/E Ratio section
3. Enter: Stock Price = 3500, EPS = 140
4. Calculator shows: P/E = 25.0
5. Read interpretation guide below

**CAGR Example**:
1. Enter: Starting Value = 100000, Ending Value = 200000, Years = 5
2. Calculator shows: CAGR = 14.87%
3. Compare with benchmark (12-15% is good)

#### Search for Topics
1. Type query in search box (e.g., "RSI")
2. System highlights matching content
3. Navigate to relevant module
4. Read detailed explanation with examples

#### Track Progress
1. Complete modules in any order
2. Progress saved automatically in browser
3. Return anytime to resume
4. Green checkmarks show completed modules
5. Complete all 6 to unlock certificate

### Tips & Tricks
- Start with Module 1 if you're a beginner
- Use calculators with real portfolio stocks
- Bookmark favorite sections for quick reference
- Complete one module per week for steady learning
- Apply learnings immediately to your portfolio

### Example Use Cases
1. **New Investor**: Complete all 6 modules in order over 6 weeks
2. **Quick Refresh**: Use search to find specific metric (e.g., "P/B ratio")
3. **Calculate Returns**: Use CAGR calculator to check portfolio performance
4. **Stock Evaluation**: Use P/E calculator to check if stock is overvalued
5. **Strategy Selection**: Read Portfolio Management module to pick style (Value vs Growth)

### Learning Outcomes
After completing all modules, you'll be able to:
- Understand stock market mechanics and terminology
- Calculate and interpret key financial metrics
- Read technical charts and identify trends
- Evaluate stock quality using checklists
- Build and manage a diversified portfolio
- Set realistic performance goals and track success

---

## Analytics & Charts

### What It Does
Visual portfolio analysis with interactive charts, health scores, and allocation breakdowns. Export reports in multiple formats.

### Key Features

#### Overview Tab
- **Portfolio Value Chart**: Line chart showing growth over time
- **Key Metrics Cards**:
  - Total Value (current portfolio worth)
  - Total P&L (absolute and percentage)
  - Best Performer (top gainer)
  - Worst Performer (biggest loser)
- **Score Gauges**:
  - Diversification Score (0-100)
  - Risk Score (0-100)
  - Overall Health Score (0-100)

#### Allocation Tab
- **By Holding**: Pie chart of individual stock allocations
  - Top 8 stocks shown separately
  - Rest grouped as "Others"
  - 16 distinct colors (no duplicates)
- **By Market**: NSE vs BSE vs NYSE vs NASDAQ distribution
- **By Asset Type**: STOCK vs ETF vs REIT vs MUTUAL_FUND
- **By Sector**: Financial Services, IT, Consumer Goods, etc.

#### Health Check Tab
- **Diversification Score** (0-100):
  - Penalties: <5 holdings (-30), max weight >25% (-20), top 5 >70% (-15)
- **Risk Score** (0-100):
  - Penalties: >50% losers (-25), big losers <-20% (-5 each), avg loss <-30% (-20)
- **Warnings**:
  - High concentration in single stock
  - Too many losing positions
  - Insufficient diversification
- **Recommendations**:
  - "Rebalance portfolio - IT sector is 35% (target: <25%)"
  - "Review losing positions - 12 stocks down >10%"
  - "Add more holdings - current: 8 (recommended: 15-30)"

#### Performance Tab
- **P&L Distribution**: Bar chart of gains and losses by stock
- **Winners List**: Profitable holdings sorted by P&L%
- **Losers List**: Loss-making holdings sorted by P&L%
- **Metrics**:
  - Win rate (% of profitable stocks)
  - Average gain and average loss
  - Total profitable value vs. loss value

### How to Use

#### View Analytics
1. Go to **Analytics** page
2. Default: Overview tab loads first
3. Review health scores and key metrics
4. Click on any metric to see detailed stock list

#### Analyze Allocation
1. Click **Allocation** tab
2. View pie charts for different dimensions
3. Identify:
   - Which stocks are too concentrated (>10%)
   - Which sectors are overweight
   - Which markets dominate portfolio

#### Check Portfolio Health
1. Click **Health Check** tab
2. Review scores:
   - Green (>70): Healthy
   - Yellow (40-70): Needs attention
   - Red (<40): Action required
3. Read warnings and act:
   - Concentration: Trim large positions
   - Losses: Review fundamentals, cut losers
   - Diversification: Add more stocks

#### Export Analytics
1. Click **Export** dropdown (top-right)
2. Choose format:
   - **Excel**: Multi-sheet report (Summary, Holdings, Allocation, Recommendations)
   - **CSV**: Holdings data with P&L
   - **Markdown**: Formatted text report
3. Save file for tax records or performance tracking

### Tips & Tricks
- Check health scores monthly
- Rebalance when top stock >10% allocation
- Green scores don't mean individual stocks are good - check Recommendations
- Export analytics quarterly for records
- Compare allocations with benchmark (Nifty 50 sector weights)

### Example Use Cases
1. **Monthly Review**: Check health scores, rebalance if needed
2. **Tax Season**: Export to Excel for capital gains documentation
3. **Performance Tracking**: Compare P&L distribution vs. last quarter
4. **Client Reporting**: Export Markdown report for sharing
5. **Diversification Check**: Ensure no sector >25%, no stock >10%

---

## Tax Analysis & ITR Helper

### What It Does
Automated capital gains calculation for equity transactions with STCG/LTCG classification, tax liability estimation, and ITR Schedule CG report generation. Supports manual Excel uploads and AIS CSV imports.

### Key Features

#### Capital Gains Calculation
- **Automatic Classification**:
  - STCG: Holding period ≤ 365 days → 20% tax
  - LTCG: Holding period > 365 days → 12.5% tax
- **LTCG Exemption**: First ₹1.25 lakh is tax-free (per fiscal year)
- **Transaction-level Details**:
  - Symbol, Buy/Sell dates, Quantity
  - Purchase price, Sale price
  - Gross profit/loss
  - Tax classification

#### Tax Summary
- Total transactions analyzed
- Total STCG and LTCG amounts
- Taxable STCG (full amount)
- Taxable LTCG (after ₹1.25L exemption)
- Estimated tax liability:
  - STCG Tax = Taxable STCG × 20%
  - LTCG Tax = Taxable LTCG × 12.5%
  - Total Tax = STCG Tax + LTCG Tax

#### ITR Schedule CG Format
Generates data ready for ITR-2/ITR-3 filing:
- **Section 111A**: STCG on listed equity (with STT)
- **Section 112A**: LTCG on listed equity/MF (with STT)
- Loss carry-forward details (8-year eligibility)

#### AIS Import
Import pre-calculated capital gains from Income Tax portal:

**AIS CSV Columns Supported**:
- FY (Financial Year)
- ISIN Code
- Name of the Security
- Asset Type (Short term / Long term)
- Units (Quantity sold)
- Sale Consideration
- Cost of Acquisition
- Short Term Capital Gain (pre-calculated)
- Long Term Capital Gain (pre-calculated)
- OPTION TO PAY TAX @10% (grandfathered clause)

**Benefits**:
- Official data from CDSL/NSDL records
- Pre-calculated gains (95%+ accurate)
- Detects old tax rate eligibility (10% option)
- Covers all securities across all demat accounts

#### Insights & Recommendations
- Top 5 gainers and losers
- Tax-saving opportunities
- Loss harvesting suggestions
- LTCG exemption utilization
- Timing recommendations (sell before/after April 1)

#### Export Options
- **Excel**: Styled multi-sheet report (Summary, Transactions, Insights)
- **CSV**: Transaction listing for import into other tools
- **Markdown**: Human-readable report for documentation

### How to Use

#### Upload Transaction File
1. Go to **Tax Analysis** page
2. Click **Upload Excel** or drag & drop file
3. System auto-detects columns:
   - Symbol/Scrip/ISIN
   - Buy Date / Sell Date
   - Quantity / Units
   - Buy Price / Sell Price
   - Profit/Loss (optional)
4. Preview data and confirm
5. Analysis runs automatically

#### Import AIS CSV
1. Login to incometax.gov.in
2. Go to e-File → View AIS
3. Download CSV (SecData or Schedule 112A Details)
4. Upload to Tax Analysis page
5. Select "AIS CSV" format
6. System uses pre-calculated STCG/LTCG values
7. Review results

#### Review Analysis
1. **Summary Tab**: View tax liability and exemptions
2. **Transactions Tab**: See all transactions with classification
3. **Insights Tab**: Review top gainers/losers and recommendations
4. **ITR Report Tab**: Copy Schedule CG data for ITR filing

#### Generate ITR Report
1. Click **ITR Report** button
2. Report shows:
   - Section 111A data (STCG)
   - Section 112A data (LTCG)
   - Loss carry-forward info
3. Copy data to ITR-2/ITR-3 form

#### Export for CA
1. Click **Export** dropdown
2. Choose Excel for professional format
3. Send to CA for ITR filing
4. Or use CSV for import into tax software

### Tips & Tricks
- Upload transactions before March 31 to plan tax liability
- Use AIS CSV for highest accuracy (official data)
- Check "10% tax option" for pre-July 2018 transactions
- Harvest losses in March to offset gains
- Wait for LTCG if transaction is near 365 days
- Keep exported Excel for 6 years (tax record retention)

### Example Use Cases
1. **Annual Tax Filing**: Upload all transactions, generate ITR Schedule CG
2. **Mid-Year Planning**: Upload YTD transactions to estimate tax liability
3. **Loss Harvesting**: Identify stocks to sell in March for offsetting gains
4. **AIS Verification**: Import AIS CSV, compare with broker statements
5. **CA Collaboration**: Export Excel report for professional filing

### Tax Rates Reference (FY 2024-25)
| Type | Holding Period | Tax Rate | Exemption |
|------|---------------|----------|-----------|
| STCG (Section 111A) | ≤ 365 days | 20% | None |
| LTCG (Section 112A) | > 365 days | 12.5% | ₹1,25,000/year |

---

## Import from Brokers

### What It Does
Seamless portfolio import from popular Indian brokers (Groww, INDmoney, Zerodha) with automatic format detection, market classification, and duplicate handling.

### Supported Brokers

#### Groww
- **Format**: Excel (.xlsx)
- **Detection**: Header row "Current Value" at row 11
- **Data Extracted**:
  - Stock symbol and name
  - ISIN code
  - Quantity and average price
  - Current price and value
  - Investment amount
  - P&L and P&L%

#### INDmoney
- **Format**: Excel (.xlsx)
- **Detection**: "Portfolio Statement" in worksheet name
- **Market Detection**: Automatic NSE vs NYSE
  - ISIN starts with "US" → NYSE
  - ISIN starts with "IN" → NSE
- **Data Extracted**:
  - Symbol (US tickers or NSE names)
  - Market (NYSE/NASDAQ or NSE/BSE)
  - Quantity, average price
  - Current price, LTP
  - Total invested and current value

#### Zerodha
- **Format**: CSV or Excel
- **Detection**: "Kite Holdings" or standard column headers
- **Data Extracted**:
  - Instrument/Symbol
  - Quantity
  - Average price
  - LTP (Last Traded Price)
  - P&L

### Key Features

#### Automatic Format Detection
1. Upload any file from supported broker
2. System analyzes structure:
   - Checks for Groww header at row 11
   - Searches for "Portfolio Statement" (INDmoney)
   - Detects Zerodha column names
3. Selects appropriate parser automatically
4. No manual format selection needed

#### Market Detection (INDmoney)
- Reads ISIN code from Excel
- ISIN prefix determines market:
  - `US` → NYSE or NASDAQ (US market)
  - `IN` → NSE or BSE (Indian market)
- Currency set automatically (USD vs INR)
- Prevents mixing markets

#### Duplicate Detection
- Checks if same broker import exists
- Shows warning: "You have already imported from Groww on [date]"
- Options:
  - **Replace**: Delete old import, create new
  - **Keep Both**: Import as new alongside old
  - **Cancel**: Abort import

#### Import History
- Tracks all imports with:
  - Import ID
  - Source (Groww/INDmoney/Zerodha)
  - Filename
  - Import date/time
  - Number of holdings imported
- Delete import to remove all associated holdings

#### Transaction Creation
- Creates buy transactions for each holding
- Sets `skipHoldingUpdate: true` to prevent double-counting
- Holdings already have correct quantities from import
- Transactions provide purchase history

### How to Use

#### Import from Groww
1. Login to Groww web/app
2. Go to Portfolio → Holdings
3. Export Excel file
4. In app: Go to **Import** page
5. Drag & drop or click to upload Excel
6. System detects "Groww" format
7. Preview shows all holdings
8. Click **Confirm Import**
9. Holdings appear in Portfolio (India tab)

#### Import from INDmoney
1. Login to INDmoney app
2. Go to US Stocks or Indian Stocks
3. Download Portfolio Statement (Excel)
4. In app: Go to **Import** page
5. Upload Excel file
6. System detects market from ISIN:
   - US stocks → NYSE/NASDAQ
   - Indian stocks → NSE/BSE
7. Preview shows holdings with correct markets
8. Confirm import
9. Check appropriate tab (India or US)

#### Import from Zerodha
1. Login to Zerodha Kite
2. Go to Holdings
3. Download CSV or Excel
4. Upload to app Import page
5. System detects Zerodha format
6. Preview and confirm
7. Holdings appear in India tab

#### Handle Duplicates
1. If duplicate detected, modal appears
2. Review existing import details
3. Choose action:
   - **Replace**: Old holdings deleted, new ones created
   - **Keep Both**: Useful if you track multiple accounts
   - **Cancel**: Abort if uploaded by mistake

#### Delete Import
1. Go to **Import** page
2. View **Import History** section
3. Find import to delete
4. Click **Delete** button
5. Confirm deletion
6. All holdings from that import removed
7. Transactions also deleted

### Tips & Tricks
- Always export latest data from broker before import
- Use Replace for monthly updates from same broker
- Use Keep Both for different accounts (personal + family)
- Delete test imports to clean up
- INDmoney ISIN detection works 99% of the time
- If market wrong, edit holding manually after import
- Don't manually add holdings that exist in broker - import instead

### Example Use Cases
1. **Monthly Update**: Import latest Groww Excel, choose Replace
2. **Multi-Account**: Import Groww (personal) + INDmoney (US stocks)
3. **Broker Switch**: Import Zerodha, later import Groww, Keep Both
4. **Clean Slate**: Delete all imports, import fresh from broker
5. **Verification**: Import AIS CSV in Tax Analysis, compare with broker imports

### Troubleshooting
| Issue | Solution |
|-------|----------|
| Wrong market detected | Edit holding manually, change market dropdown |
| Duplicate despite Replace | Delete old import manually first |
| Missing stocks | Check if broker Excel has all holdings |
| Zero quantity | Re-export from broker, ensure data is complete |
| Import fails | Check file format (Excel 97-2003 not supported) |

---

## Stock Detail Modal

### What It Does
Comprehensive stock information window with live quotes, interactive price charts, moving averages, and technical indicators. Opens from any clickable stock symbol throughout the app.

### Key Features

#### Real-Time Quote Data
- **Current Price**: Live price with color-coded change
- **Day Change**: Absolute and percentage change
- **Open, High, Low**: Intraday range
- **Previous Close**: Reference for day change
- **Volume**: Trading volume for the day
- **52-Week High/Low**: Annual price range with distance indicators

#### Financial Metrics
- **Market Cap**: Company size (Large/Mid/Small cap)
- **P/E Ratio**: Price-to-Earnings (valuation metric)
- **P/B Ratio**: Price-to-Book (asset valuation)
- **Dividend Yield**: Annual dividend percentage

#### Interactive Price Chart
- **Timeframes**: 1W, 1M, 3M, 6M, 1Y, 5Y
- **Line Chart**: Smooth price visualization
- **50-Day DMA**: Short-term trend (orange line)
- **200-Day DMA**: Long-term trend (blue line)
- **Hover Tooltips**: Exact price and date on hover
- **Responsive**: Adjusts to screen size

#### Technical Indicators

**Moving Averages**
- 50 DMA shown if 50+ data points available
- 200 DMA shown if 200+ data points available
- Calculated using Simple Moving Average (SMA)

**Golden Cross Detection**
- Occurs when 50 DMA crosses above 200 DMA
- Marked with 🌟 icon on chart
- Bullish signal indicating potential uptrend
- Shows date of cross

**Death Cross Detection**
- Occurs when 50 DMA crosses below 200 DMA
- Marked with 💀 icon on chart
- Bearish signal indicating potential downtrend
- Shows date of cross

**Current Indicators**
- Price position relative to DMAs
- Distance from 52-week high/low
- Volume vs. average

### How to Use

#### Open Stock Modal
1. Click on any stock symbol in:
   - Portfolio table
   - Analytics performance lists
   - Recommendations insights
   - Dashboard holdings
2. Modal opens with loading state
3. Quote data fetches first
4. Chart loads with default 1Y timeframe

#### Change Timeframe
1. Click timeframe buttons: 1W, 1M, 3M, 6M, 1Y, 5Y
2. Chart updates with new data range
3. DMAs recalculate for new period
4. Golden/Death crosses detected for visible range

#### Interpret DMAs
**Price Above 200 DMA**:
- Strong long-term uptrend
- Stock in bull market
- Support level at 200 DMA

**Price Below 200 DMA**:
- Long-term downtrend or correction
- Stock in bear phase
- Resistance at 200 DMA

**Golden Cross**:
- 50 DMA > 200 DMA
- Bullish signal
- Consider buying or holding

**Death Cross**:
- 50 DMA < 200 DMA
- Bearish signal
- Consider selling or avoiding

#### Read Financial Metrics
**P/E Ratio**:
- < 15: Undervalued or slow-growth
- 15-25: Fairly valued
- > 25: Growth premium or overvalued

**Market Cap**:
- > ₹20,000 Cr: Large cap (stable)
- ₹5,000-20,000 Cr: Mid cap (growth)
- < ₹5,000 Cr: Small cap (risky)

**52-Week Distance**:
- Near high (<5%): Momentum, possible resistance
- Near low (<5%): Value opportunity or falling knife

#### Close Modal
- Press **ESC** key
- Click outside modal area
- Click **X** button (top-right)

### Tips & Tricks
- Use 1Y timeframe for best DMA visualization
- Golden Cross + Price above 200 DMA = Strong buy signal
- Death Cross + Price below 200 DMA = Strong sell signal
- Check volume spike during price breakouts
- Near 52-week high + STRONG_BUY signal = Momentum play
- P/E < 15 + Price above 200 DMA = Value + Trend combo
- Use 5Y timeframe to see long-term support/resistance

### Example Use Cases
1. **Quick Check**: Click stock in Portfolio, see if price above 200 DMA
2. **Entry Timing**: Wait for Golden Cross before buying
3. **Exit Signal**: Death Cross appears → Consider selling
4. **Valuation**: Check P/E ratio before adding more shares
5. **Trend Confirmation**: Price above both DMAs + Golden Cross = Safe to hold

### Technical Analysis Guide

#### Bullish Setup
- ✅ Price > 200 DMA
- ✅ Price > 50 DMA
- ✅ 50 DMA > 200 DMA (Golden Cross)
- ✅ Volume above average
- ✅ Near 52-week high
→ **Signal**: Strong uptrend, BUY/HOLD

#### Bearish Setup
- ❌ Price < 200 DMA
- ❌ Price < 50 DMA
- ❌ 50 DMA < 200 DMA (Death Cross)
- ❌ Declining volume
- ❌ Near 52-week low
→ **Signal**: Downtrend, SELL/AVOID

#### Neutral/Consolidation
- ⚠️ Price between 50 and 200 DMA
- ⚠️ DMAs flat (no slope)
- ⚠️ Mid-range in 52-week span
→ **Signal**: Wait for breakout direction

---

## AI Financial Assistant

### What It Does
AI-powered chatbot using Claude (Anthropic) for personalized investment advice, portfolio analysis, and stock market questions. Context-aware responses based on your holdings.

### Key Features

#### Multi-Model Support
- **Claude Sonnet**: Default, balanced (speed + quality)
- **Claude Haiku**: Fast responses for simple queries
- **Claude Opus**: Deepest analysis for complex questions

#### Portfolio Context
- Automatically includes your portfolio summary in chat
- AI knows your holdings, P&L, allocation
- Personalized recommendations based on your portfolio

#### Conversation Management
- Chat history preserved during session
- Scroll through previous Q&A
- Clear chat to start fresh conversation

#### Bookmarks
- Save important AI answers
- Add notes to bookmarked responses
- Quick access from Bookmarks tab
- Search through saved answers

### How to Use

#### Ask Questions
1. Go to **AI Chat** page
2. Select model (Sonnet recommended)
3. Type question in text box:
   - "Should I buy more TCS?"
   - "Analyze my portfolio risk"
   - "What is a good P/E ratio for IT stocks?"
   - "Explain LTCG tax"
4. Press Enter or click Send
5. AI response appears in chat

#### Portfolio-Aware Queries
Examples:
- "Which of my stocks are undervalued?"
- "Am I overexposed to any sector?"
- "Should I trim my HDFC Bank position?"
- "Which stocks should I sell for tax loss harvesting?"

AI will reference your actual holdings and provide specific advice.

#### Bookmark Answers
1. After receiving helpful response
2. Click **Bookmark** button below answer
3. Add optional note (e.g., "Pre-budget analysis")
4. Access from **Bookmarks** tab
5. Review saved answers anytime

#### Choose AI Model
**Claude Sonnet** (Default):
- Best balance of speed and depth
- Use for: Portfolio analysis, stock evaluations

**Claude Haiku**:
- Fastest responses
- Use for: Simple questions, definitions, quick checks

**Claude Opus**:
- Most thorough analysis
- Use for: Complex decisions, multi-factor analysis, strategy planning

### Tips & Tricks
- Be specific: "Analyze HDFC Bank" vs. "Tell me about banks"
- Ask follow-up questions for clarity
- Bookmark analysis before major decisions
- Use Opus for buy/sell decisions
- Use Haiku for learning and definitions
- AI cannot predict prices - focus on analysis questions
- Clear chat if switching topics drastically

### Example Use Cases
1. **Stock Evaluation**: "Is Reliance fairly valued at current P/E of 28?"
2. **Portfolio Review**: "Analyze my portfolio allocation and suggest improvements"
3. **Learning**: "Explain Golden Cross in simple terms with example"
4. **Tax Planning**: "Which stocks should I sell in March for tax loss harvesting?"
5. **Strategy**: "Should I follow value investing or growth investing?"
6. **Risk Check**: "Am I too concentrated in IT sector with 40% allocation?"

### Limitations
- AI cannot access real-time news
- Cannot predict future prices
- Advice is general, not personalized financial advice
- Always do your own research before acting
- Check facts with official sources
- Consult CA for tax matters

---

## Dashboard & Market Overview

### What It Does
Central hub showing portfolio summary, live market indices, asset allocation, and quick access to all features.

### Key Features

#### Portfolio Summary Cards
- **Total Value**: Current portfolio worth (₹ or $)
- **Total P&L**: Absolute gain/loss and percentage
- **Day Change**: Today's portfolio change
- **Holdings Count**: Total stocks across markets

#### Live Market Indices
Auto-refreshes every 60 seconds:
- **India**: Nifty 50, Sensex
- **US**: S&P 500, NASDAQ
- Color-coded change (green/red)
- Percentage change displayed

#### Asset Allocation Pie Chart
- Visual breakdown by holding
- Top 8 stocks + "Others" grouping
- 16 distinct colors
- Click to view detailed allocation

#### Quick Actions
- Refresh Prices
- Import Data
- View Analytics
- AI Chat

### How to Use
1. Dashboard is home page
2. Check market indices before trading
3. Review portfolio summary
4. Click on cards for detailed views
5. Use quick actions for common tasks

### Tips & Tricks
- Check dashboard daily for market pulse
- Green markets + portfolio down → Review losers
- Allocation chart shows concentration visually
- Use dashboard as starting point for deep dives

---

## Summary

This feature guide covers all major capabilities of the Stock Market Analysis App. Use it as a reference for:
- Learning new features
- Troubleshooting issues
- Optimizing workflows
- Training new users

For technical implementation details, see [Technical Documentation](TECHNICAL_DOCUMENTATION.md).

For setup and deployment, see [Deployment Guide](DEPLOYMENT_GUIDE.md).

For educational content, see [Educational Modules](EDUCATIONAL_MODULES.md).
