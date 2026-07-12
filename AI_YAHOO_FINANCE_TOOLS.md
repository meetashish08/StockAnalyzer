# AI Assistant - Yahoo Finance Integration 🔥

## Overview

The AI Assistant now has **DIRECT ACCESS** to Yahoo Finance API, giving it real-time market data capabilities similar to web search but for stock market analysis. It can fetch live data for **ANY stock worldwide**, not just your portfolio.

**Power Level:** 🚀🚀🚀 **REVOLUTIONARY**

---

## 🎯 What Changed

### Before ❌
- AI could only analyze portfolio stocks
- No access to real-time market data
- Generic advice based on training data
- Limited to stock universe (61 stocks)
- No historical data access
- No company information
- No financial statements

### After ✅
- ✅ **11 AI Tools** with Yahoo Finance integration
- ✅ **ANY stock worldwide** - not limited to portfolio
- ✅ **Real-time data** - live prices, fundamentals, technicals
- ✅ **Historical prices** - OHLCV data for 1mo to 5y
- ✅ **Company profiles** - business description, industry, sector
- ✅ **Financial statements** - income, balance sheet, cash flow
- ✅ **Technical indicators** - RSI, MACD, Moving Averages
- ✅ **Stock screening** - filter by P/E, dividend, market cap
- ✅ **Stock comparison** - side-by-side metrics
- ✅ **Comprehensive analysis** - fundamentals + technicals combined

---

## 🛠️ AI Tools Available (11 Total)

### 1. `searchStock` ⭐
**Purpose:** Get detailed real-time quote and fundamentals for any stock

**When to Use:**
- "What's the price of RELIANCE?"
- "Show me TCS fundamentals"
- "Get AAPL current data"

**Data Returned:**
- Current price, change, volume
- Market cap, P/E, P/B ratios
- 52-week high/low
- Dividend yield
- ROE, profit margin
- Beta, EPS

**Example:**
```
User: "What's RELIANCE trading at?"
AI: Uses searchStock(symbol="RELIANCE", market="NSE")
Returns: Price: ₹2,450, P/E: 24.5, Market Cap: ₹16.5L Cr, etc.
```

---

### 2. `getHistoricalPrices` 📊
**Purpose:** Get OHLCV historical price data for technical analysis

**When to Use:**
- "Show me AAPL price history for last 6 months"
- "What's the trend for TCS?"
- "Has HDFC been going up or down?"

**Periods Available:**
- 1mo, 3mo, 6mo, 1y, 2y, 5y

**Data Returned:**
- Date, Open, High, Low, Close, Volume
- Can identify trends, support/resistance
- Chart pattern analysis

**Example:**
```
User: "Show me AAPL price trend"
AI: Uses getHistoricalPrices(symbol="AAPL", market="NYSE", period="6mo")
Returns: 180 days of OHLCV data
Analysis: "AAPL trending up from $150 to $185 (23% gain), broke resistance at $175"
```

---

### 3. `getCompanyInfo` 🏢
**Purpose:** Get company profile, business description, industry

**When to Use:**
- "What does RELIANCE do?"
- "Tell me about TCS business"
- "What industry is AAPL in?"

**Data Returned:**
- Company name, description
- Industry, sector
- Country, headquarters
- Employee count
- Website

**Example:**
```
User: "What does TCS do?"
AI: Uses getCompanyInfo(symbol="TCS", market="NSE")
Returns: "Tata Consultancy Services is a global IT services, consulting firm. 
Industry: IT Services, Sector: Technology, Employees: 600,000+, HQ: Mumbai, India"
```

---

### 4. `getFinancialStatements` 💰
**Purpose:** Get income statement, balance sheet, or cash flow data

**When to Use:**
- "What's RELIANCE revenue?"
- "Show me AAPL profit margin"
- "What's TCS cash flow?"

**Types Available:**
- `income` - Revenue, earnings, profit margin
- `balance` - Assets, liabilities, equity
- `cashflow` - Operating cash, free cash flow

**Data Returned:**
- Revenue, net income, profit margin
- Operating margin, ROE, ROA
- Debt to equity, current ratio
- Free cash flow

**Example:**
```
User: "What's RELIANCE revenue?"
AI: Uses getFinancialStatements(symbol="RELIANCE", market="NSE", type="income")
Returns: Revenue: ₹7.5L Cr, Profit Margin: 8.2%, ROE: 12.5%
```

---

### 5. `compareStocks` 🔍
**Purpose:** Compare multiple stocks side-by-side

**When to Use:**
- "Compare RELIANCE vs ONGC"
- "TCS vs INFY which is better?"
- "AAPL vs MSFT comparison"

**Data Returned (for each stock):**
- Price, change %
- Market cap
- P/E, P/B, ROE
- Dividend yield, EPS
- Beta
- 52-week high/low

**Example:**
```
User: "Compare TCS vs INFY"
AI: Uses compareStocks(stocks=[
  {symbol: "TCS", market: "NSE"},
  {symbol: "INFY", market: "NSE"}
])
Returns side-by-side table:

| Metric         | TCS      | INFY     |
|----------------|----------|----------|
| Price          | ₹3,450   | ₹1,580   |
| Market Cap     | ₹12.5L   | ₹6.5L    |
| P/E Ratio      | 28.5     | 25.2     |
| ROE            | 42%      | 28%      |
| Dividend Yield | 1.2%     | 2.5%     |

Analysis: "TCS has higher ROE (42% vs 28%) indicating better profitability, 
but INFY offers higher dividend yield (2.5% vs 1.2%) and lower P/E (better value)"
```

---

### 6. `getTechnicalIndicators` 📈
**Purpose:** Calculate RSI, Moving Averages, momentum indicators

**When to Use:**
- "Is RELIANCE overbought?"
- "What's the RSI for AAPL?"
- "Check 50 DMA for TCS"

**Indicators Calculated:**
- RSI (14-day)
- 50-Day Moving Average
- 200-Day Moving Average
- Golden Cross / Death Cross detection
- 52-week range position
- Overbought/Oversold signals

**Example:**
```
User: "Is AAPL overbought?"
AI: Uses getTechnicalIndicators(symbol="AAPL", market="NYSE")
Returns:
- Current Price: $185
- RSI: 72 (Overbought - above 70)
- 50 DMA: $175 (price 5.7% above)
- 200 DMA: $165 (price 12% above)
- Signal: OVERBOUGHT - suggest waiting for pullback to $175-178
```

---

### 7. `screenStocks` 🔎
**Purpose:** Filter stocks by criteria (P/E, dividend, market cap, price)

**When to Use:**
- "Find undervalued stocks"
- "High dividend stocks in NSE"
- "Stocks with P/E below 15"
- "Large cap stocks under ₹500"

**Filters Available:**
- `maxPE` - Maximum P/E ratio
- `minDividendYield` - Minimum dividend yield %
- `minMarketCap` - Minimum market cap (billions)
- `maxPrice` - Maximum stock price
- `sector` - Sector filter (Banking, IT, etc.)

**Example:**
```
User: "Find undervalued NSE stocks"
AI: Uses screenStocks(
  market="NSE", 
  filters={maxPE: 15, minDividendYield: 2, minMarketCap: 10}
)
Returns:
1. SBIN - P/E: 12.5, Dividend: 3.2%, Market Cap: ₹5.5L Cr
2. VEDL - P/E: 8.2, Dividend: 4.5%, Market Cap: ₹1.2L Cr
3. COALINDIA - P/E: 9.8, Dividend: 6.8%, Market Cap: ₹2.8L Cr
```

---

### 8. `getMarketIndices` 📊
**Purpose:** Get live market indices (Nifty, Sensex, S&P 500, NASDAQ)

**When to Use:**
- "How is the market doing?"
- "What's Nifty at?"
- "Market overview"

**Data Returned:**
- Nifty 50, Sensex, S&P 500, NASDAQ
- Current value, change, change %

---

### 9. `getSectorAnalysis` 🏭
**Purpose:** Analyze specific sector performance

**When to Use:**
- "How is Banking sector doing?"
- "IT sector analysis"
- "Pharma stocks performance"

**Data Returned:**
- All holdings in sector
- Total value, P&L
- Sector concentration

---

### 10. `getTopMovers` 🚀
**Purpose:** Get top gainers/losers from portfolio

**When to Use:**
- "What's moving today?"
- "Biggest gainers in my portfolio"
- "Top losers"

**Data Returned:**
- Top 5 gainers or losers
- Symbol, change %

---

## 💡 Real-World Usage Examples

### Example 1: Complete Stock Research
```
User: "Research RELIANCE for me"

AI Response (uses multiple tools):
1. getCompanyInfo(RELIANCE, NSE)
   → "Reliance Industries: Energy & Petrochemicals conglomerate"
   
2. searchStock(RELIANCE, NSE)
   → Price: ₹2,450, P/E: 24.5, Market Cap: ₹16.5L Cr
   
3. getFinancialStatements(RELIANCE, NSE, income)
   → Revenue: ₹7.5L Cr, Profit Margin: 8.2%, ROE: 12.5%
   
4. getTechnicalIndicators(RELIANCE, NSE)
   → RSI: 65, 50 DMA: ₹2,380, Trend: Bullish

AI Summary:
"RELIANCE (₹2,450) is India's largest private sector company in energy. 
Revenue ₹7.5L Cr with 8.2% profit margin. P/E at 24.5 (sector avg: 22).
Technical: RSI 65 (moderate), price above 50 DMA (bullish trend).
Currently at fair value. Wait for dip to ₹2,350-2,400 for better entry."
```

---

### Example 2: Investment Decision
```
User: "Should I buy AAPL or MSFT?"

AI Response (uses compareStocks):
compareStocks([
  {symbol: "AAPL", market: "NYSE"},
  {symbol: "MSFT", market: "NYSE"}
])

| Metric      | AAPL    | MSFT    | Winner |
|-------------|---------|---------|--------|
| Price       | $185    | $380    | -      |
| P/E         | 28.5    | 32.1    | AAPL   |
| ROE         | 147%    | 38%     | AAPL   |
| Div Yield   | 0.5%    | 0.8%    | MSFT   |
| Beta        | 1.25    | 0.95    | MSFT   |
| Market Cap  | $2.9T   | $2.8T   | Similar|

Recommendation:
"AAPL has better valuation (P/E 28.5 vs 32.1) and superior ROE (147% vs 38%).
MSFT is less volatile (beta 0.95 vs 1.25) - better for conservative investors.
For growth: AAPL. For stability: MSFT. Both are quality stocks."
```

---

### Example 3: Finding Opportunities
```
User: "Find me high dividend stocks"

AI Response (uses screenStocks):
screenStocks(market="NSE", filters={minDividendYield: 4})

Top 5 High Dividend Stocks:
1. COALINDIA - 6.8% yield, P/E: 9.8, ₹385
2. VEDL - 4.5% yield, P/E: 8.2, ₹425
3. NTPC - 4.2% yield, P/E: 11.5, ₹295
4. POWERGRID - 4.1% yield, P/E: 10.2, ₹245
5. SBIN - 3.2% yield, P/E: 12.5, ₹625

Analysis: "All PSU stocks with consistent dividend history. COALINDIA leads 
with 6.8% yield + undervalued P/E 9.8. Good for income investors."
```

---

### Example 4: Technical Analysis
```
User: "Check if TCS is in a good buying zone"

AI Response (uses getTechnicalIndicators + getHistoricalPrices):

Technical Analysis - TCS:
- Current Price: ₹3,450
- RSI: 45 (Neutral zone 30-70)
- 50 DMA: ₹3,520 (price 2% below - slightly bearish)
- 200 DMA: ₹3,380 (price 2% above - long-term bullish)
- 52-Week High: ₹3,850 (10% away)
- 52-Week Low: ₹3,150 (9.5% above)
- Support: ₹3,380 (200 DMA), ₹3,300
- Resistance: ₹3,520 (50 DMA), ₹3,650

Signal: NEUTRAL TO BULLISH
Entry Zone: ₹3,350-3,400 (near 200 DMA support)
Current: ₹3,450 (slightly above ideal entry)
Recommendation: Wait for pullback to ₹3,380-3,400 OR buy on breakout above ₹3,520
```

---

## 🎯 Best Practices for Users

### 1. Ask Specific Questions
✅ **Good:** "What's RELIANCE P/E ratio and is it overvalued?"
❌ **Vague:** "Tell me about RELIANCE"

### 2. Request Comparisons
✅ **Good:** "Compare HDFC vs ICICI vs SBI for long-term investment"
❌ **Limited:** "Which bank stock should I buy?"

### 3. Use Technical Analysis
✅ **Good:** "Check RSI and moving averages for AAPL, is it overbought?"
❌ **Generic:** "Is AAPL a good buy?"

### 4. Combine Multiple Analyses
✅ **Good:** "Analyze INFY fundamentals, technicals, and compare with TCS"
❌ **Shallow:** "Is INFY good?"

### 5. Screen for Opportunities
✅ **Good:** "Find NSE stocks with P/E below 12 and dividend above 3%"
❌ **Open-ended:** "Find good stocks"

---

## 🚀 Power User Examples

### Example: Deep Fundamental Analysis
```
"Analyze RELIANCE like a professional analyst:
1. Company business and competitive position
2. Revenue, profit margins, ROE from financials
3. Valuation (P/E vs peers)
4. Technical indicators (RSI, moving averages)
5. Investment recommendation with entry/exit points"

AI will use:
- getCompanyInfo() → Business overview
- getFinancialStatements() → Fundamentals
- compareStocks() → Peer comparison
- getTechnicalIndicators() → Technical view
- searchStock() → Current metrics
```

### Example: Portfolio Optimization
```
"I have ₹5L to invest. Screen NSE for:
- Large cap (market cap > ₹50,000 Cr)
- Undervalued (P/E < 18)
- Good dividend (yield > 2%)
- Compare top 3 and recommend allocation"

AI will use:
- screenStocks() → Find candidates
- compareStocks() → Side-by-side comparison
- getTechnicalIndicators() → Check momentum
- Recommend allocation with rationale
```

---

## 📊 Technical Details

### Tools Architecture

```
User Query
    ↓
AI Assistant (Claude Sonnet 4.5)
    ↓
Tool Selection (picks 1-5 tools)
    ↓
Yahoo Finance API Calls
    ↓
Real-Time Data Retrieved
    ↓
AI Analysis & Response
    ↓
User Receives Answer with REAL DATA
```

### Data Sources
- **Yahoo Finance API** (via yahoo-finance2 library)
- Real-time quotes, historical prices
- Company profiles, financial statements
- Technical indicators calculated live

### Response Time
- Single tool: 2-5 seconds
- Multiple tools: 5-15 seconds
- Complex analysis: 10-20 seconds

---

## 🔒 Limitations

### Market Coverage
- **Full Coverage:** NSE, NYSE, NASDAQ
- **Limited:** BSE (some stocks may not have full data)

### Data Freshness
- **Real-time:** During market hours (15-min delay for free tier)
- **EOD Data:** After market closes

### Tool Limits
- **Stock Screening:** Limited to 20 stocks per query (performance)
- **Comparison:** Up to 5 stocks at once
- **Historical Data:** Maximum 5 years

### API Rate Limits
- Yahoo Finance has rate limits
- Multiple rapid queries may be throttled
- Wait 1-2 seconds between complex queries

---

## 🆚 Comparison with Web Search

| Feature | Web Search | Yahoo Finance Tools |
|---------|------------|---------------------|
| **Stock Prices** | ❌ Not available | ✅ Real-time |
| **Historical Data** | ❌ Not available | ✅ OHLCV data |
| **Company Info** | ❌ Not available | ✅ Full profiles |
| **Financials** | ❌ Not available | ✅ Statements |
| **Technical Analysis** | ❌ Not available | ✅ RSI, MAs |
| **Stock Screening** | ❌ Not available | ✅ Filter stocks |
| **Comparison** | ❌ Not available | ✅ Side-by-side |
| **Data Freshness** | ❌ N/A | ✅ Real-time |
| **Accuracy** | ❌ N/A | ✅ Direct API |

**Result:** Yahoo Finance tools are **SUPERIOR** for stock market analysis. It's like having a Bloomberg Terminal integrated into the AI!

---

## 📝 Example Queries to Try

### Research
- "Research TCS - company info, financials, technicals"
- "What does RELIANCE do and what are its key metrics?"
- "Get me complete analysis of AAPL"

### Comparison
- "Compare HDFC vs ICICI vs SBI"
- "TCS vs INFY which is better for long-term?"
- "AAPL vs MSFT vs GOOGL comparison"

### Technical
- "Check RSI and moving averages for RELIANCE"
- "Is AAPL overbought or oversold?"
- "Show me TCS price trend for 6 months"

### Screening
- "Find undervalued NSE stocks with P/E < 15"
- "High dividend stocks in NYSE"
- "Large cap stocks under ₹1000"

### Investment Decisions
- "Should I buy RELIANCE at current price?"
- "Is TCS a good entry at ₹3,450?"
- "Analyze INFY for swing trading opportunity"

---

## 🎓 For Power Users

### Combine Multiple Tools
```
"Do a complete investment analysis of RELIANCE:
1. Company overview and business model
2. Last 5 years revenue, profit trends
3. Current valuation vs peers (compare with ONGC, BPCL)
4. Technical indicators and chart pattern
5. Investment recommendation with price targets"
```

This will use **6 tools**:
1. getCompanyInfo
2. getFinancialStatements
3. compareStocks
4. getTechnicalIndicators
5. getHistoricalPrices
6. searchStock

### Advanced Screening
```
"Screen NYSE for tech stocks with:
- Market cap > $100B
- P/E < 30
- Strong momentum (price above 50 DMA)
- Compare top 3 results"
```

### Portfolio Strategy
```
"I want to build a dividend portfolio of ₹10L:
- Find top 5 dividend stocks in NSE
- Compare their yields, P/E, and stability (beta)
- Suggest allocation percentages
- Identify entry points using technical analysis"
```

---

## 🔧 Troubleshooting

### "No data available for symbol"
→ Check symbol spelling and market (NSE vs NYSE)
→ Some stocks may not have full Yahoo Finance data

### "Request failed"
→ Yahoo Finance API may be temporarily unavailable
→ Try again in 30 seconds

### "Timeout error"
→ Too many tools called at once
→ Break query into smaller parts

---

## 📚 Related Documentation

- [AI Assistant User Guide](AI_ASSISTANT_USER_GUIDE.md)
- [AI Architecture](AI_ARCHITECTURE.md)
- [Settings Configuration](SETTINGS_QUICK_START.md)

---

**Status:** ✅ **LIVE & ACTIVE**

Access at: http://localhost:3001 → 🤖 AI Assistant

Try asking: **"Research RELIANCE for me with fundamentals and technicals"**
