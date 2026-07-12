# AI Assistant Architecture - Technical Documentation

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                        │
│                      (AIChat.tsx - React)                    │
│  - Input: User question                                     │
│  - Quick Actions: Market/Portfolio/Opportunities/Sector     │
│  - Suggested Prompts: 9 predefined queries                  │
│  - Chat History: Conversation with AI                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ POST /api/ai/chat
                  │ { message, portfolioContext, history, model }
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER                            │
│                   (server.js - Express)                      │
│                                                              │
│  1. Fetch Portfolio Context                                 │
│     - User holdings with current prices                     │
│     - P&L calculations                                      │
│     - Portfolio metrics                                     │
│                                                              │
│  2. Fetch Market Context                                    │
│     GET /api/market-indices                                 │
│     GET /api/top-movers?type=gainers                        │
│     GET /api/top-movers?type=losers                         │
│     GET /api/stock-universe?market=NSE                      │
│     GET /api/stock-universe?market=NYSE                     │
│                                                              │
│  3. Build Enhanced System Prompt                            │
│     - Portfolio data                                        │
│     - Market data                                           │
│     - Available stocks                                      │
│     - AI capabilities                                       │
│                                                              │
│  4. Define AI Tools                                         │
│     - searchStock(symbol, market)                           │
│     - getMarketIndices()                                    │
│     - getSectorAnalysis(sector, market)                     │
│     - getTopMovers(type, limit, market)                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ POST to Portkey
                  │ { model, system, tools, messages }
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   PORTKEY MIDDLEWARE                         │
│              (https://api.portkey.ai)                        │
│                                                              │
│  - Routes request to Claude API                             │
│  - Handles authentication                                   │
│  - Manages rate limiting                                    │
│  - Provides analytics                                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Anthropic Claude API
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLAUDE SONNET 4.5                         │
│         (@vertexai-global/anthropic.claude-sonnet-4-5)      │
│                                                              │
│  1. Analyze user query + context                            │
│  2. Decide if tools are needed                              │
│  3. If yes: Return tool_use requests                        │
│  4. If no: Return direct text response                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ tool_use: searchStock("AAPL", "NYSE")
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   TOOL EXECUTION                             │
│                  (Backend server.js)                         │
│                                                              │
│  Switch on tool name:                                       │
│                                                              │
│  Case 'searchStock':                                        │
│    POST /api/search-stock                                   │
│    ├─ getYahooSymbol(symbol, market)                        │
│    ├─ yahooFinance.quote(yahooSymbol)                       │
│    ├─ yahooFinance.quoteSummary() [fundamentals]            │
│    └─ Return: price, P/E, ROE, dividends, MAs              │
│                                                              │
│  Case 'getMarketIndices':                                   │
│    GET /api/market-indices                                  │
│    ├─ Fetch Nifty, Sensex, S&P, NASDAQ                     │
│    └─ Return: price, change, changePercent                  │
│                                                              │
│  Case 'getSectorAnalysis':                                  │
│    POST /api/sector-analysis                                │
│    ├─ Filter holdings by sector                             │
│    ├─ Calculate sector metrics                              │
│    └─ Return: holdings, performance, total value            │
│                                                              │
│  Case 'getTopMovers':                                       │
│    GET /api/top-movers                                      │
│    ├─ Sort holdings by day change                           │
│    └─ Return: top gainers or losers                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ tool_result: { ... stock data ... }
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  CLAUDE SECOND CALL                          │
│                                                              │
│  Messages:                                                  │
│    1. User original question                                │
│    2. Assistant tool_use request                            │
│    3. User tool_result data                                 │
│                                                              │
│  Claude analyzes tool results + context                     │
│  Generates final response with insights                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Final AI Response
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                            │
│                                                              │
│  Display AI response in chat                                │
│  - Formatted text                                           │
│  - Bullet points                                            │
│  - Recommendations                                          │
│  - Allow bookmark save                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Portfolio Context Generation

```javascript
// Frontend: AIChat.tsx
const getPortfolioContext = () => {
  // Aggregate holdings data
  const totalValue = sum(holdings.currentValue)
  const totalPnL = sum(holdings.pnl)
  const winners = filter(holdings, h => h.pnl > 0)
  
  // Format as context string
  return `
    USER'S PORTFOLIO DATA:
    - Total Holdings: ${count}
    - Current Value: ${totalValue}
    - Total P&L: ${totalPnL}
    - Detailed Holdings: ${JSON.stringify(holdings)}
  `
}
```

### 2. Market Context Fetching

```javascript
// Backend: server.js
// Fetch market indices
const indicesRes = await axios.get('/api/market-indices')
// Returns: Nifty 50, Sensex, S&P 500, NASDAQ

// Fetch top movers
const gainersRes = await axios.get('/api/top-movers?type=gainers&limit=3')
const losersRes = await axios.get('/api/top-movers?type=losers&limit=3')

// Fetch stock universe
const nseStocks = await axios.get('/api/stock-universe?market=NSE')
const nyseStocks = await axios.get('/api/stock-universe?market=NYSE')

// Combine into marketContext string
```

### 3. AI Request Construction

```javascript
// Backend: server.js
const request = {
  model: '@vertexai-global/anthropic.claude-sonnet-4-5@20250929',
  max_tokens: 3000,
  system: systemPrompt,  // Portfolio + Market + Capabilities
  tools: [
    { name: 'searchStock', ... },
    { name: 'getMarketIndices', ... },
    { name: 'getSectorAnalysis', ... },
    { name: 'getTopMovers', ... }
  ],
  messages: [
    ...history,
    { role: 'user', content: message }
  ]
}

// Send to Portkey
const response = await axios.post(
  'https://api.portkey.ai/v1/messages',
  request,
  { headers: { 'x-portkey-api-key': key } }
)
```

### 4. Tool Calling Flow

```javascript
// If Claude returns stop_reason: 'tool_use'
if (response.data.stop_reason === 'tool_use') {
  // Extract tool requests
  const toolUses = response.data.content.filter(c => c.type === 'tool_use')
  
  // Execute each tool
  for (const tool of toolUses) {
    const result = await executeTool(tool.name, tool.input)
    toolResults.push({
      type: 'tool_result',
      tool_use_id: tool.id,
      content: JSON.stringify(result)
    })
  }
  
  // Send tool results back to Claude
  const finalResponse = await axios.post(
    'https://api.portkey.ai/v1/messages',
    {
      model,
      system,
      tools,
      messages: [
        ...history,
        { role: 'user', content: message },
        { role: 'assistant', content: response.data.content },
        { role: 'user', content: toolResults }
      ]
    }
  )
  
  return finalResponse.data.content[0].text
}
```

---

## API Endpoints

### New Endpoints for AI

#### 1. GET /api/top-movers
```javascript
Query: ?type=gainers&limit=5&market=NSE

Response: [
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    market: 'NSE',
    currentPrice: 3650,
    dayChangePercent: 2.5,
    dayChange: 89.02
  }
]
```

#### 2. POST /api/search-stock
```javascript
Body: { symbol: 'AAPL', market: 'NYSE' }

Response: {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  price: 185.50,
  pe: 28.5,
  roe: 147.5,
  dividendYield: 0.5,
  ma50: 182,
  ma200: 175,
  high52Week: 195,
  low52Week: 145
}
```

#### 3. POST /api/sector-analysis
```javascript
Body: { sector: 'IT', market: 'NSE' }

Response: {
  sector: 'IT',
  holdings: [...],
  avgPerformance: 18.5,
  totalValue: 125000,
  totalPnL: 23000,
  count: 3
}
```

#### 4. GET /api/stock-universe
```javascript
Query: ?market=NSE

Response: {
  market: 'NSE',
  stocks: ['HDFCBANK', 'TCS', 'RELIANCE', ...],
  count: 36
}
```

---

## AI Tool Definitions

### Tool 1: searchStock
```javascript
{
  name: "searchStock",
  description: "Get detailed real-time quote and fundamentals for any stock",
  input_schema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Stock symbol (e.g., TCS, AAPL)"
      },
      market: {
        type: "string",
        enum: ["NSE", "NYSE", "NASDAQ", "BSE"],
        description: "Market exchange"
      }
    },
    required: ["symbol", "market"]
  }
}
```

**When Claude uses it:**
- User asks "Should I buy Apple?"
- Claude decides to fetch AAPL data
- Calls: `searchStock("AAPL", "NYSE")`
- Gets: Full quote with price, P/E, ROE, etc.
- Analyzes and responds with recommendation

### Tool 2: getMarketIndices
```javascript
{
  name: "getMarketIndices",
  description: "Get current major market indices",
  input_schema: {
    type: "object",
    properties: {}
  }
}
```

**When Claude uses it:**
- User asks "How's the market today?"
- Claude calls: `getMarketIndices()`
- Gets: Nifty, Sensex, S&P, NASDAQ data
- Summarizes market performance

### Tool 3: getSectorAnalysis
```javascript
{
  name: "getSectorAnalysis",
  description: "Analyze specific sector performance",
  input_schema: {
    type: "object",
    properties: {
      sector: {
        type: "string",
        description: "Sector name (Banking, IT, Pharma)"
      },
      market: {
        type: "string",
        enum: ["NSE", "NYSE"]
      }
    },
    required: ["sector"]
  }
}
```

**When Claude uses it:**
- User asks "How is IT sector doing?"
- Claude calls: `getSectorAnalysis("IT", "NSE")`
- Gets: All IT holdings, performance metrics
- Provides sector analysis

### Tool 4: getTopMovers
```javascript
{
  name: "getTopMovers",
  description: "Get top gaining/losing stocks",
  input_schema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["gainers", "losers"]
      },
      limit: {
        type: "number",
        default: 5
      },
      market: {
        type: "string",
        enum: ["NSE", "NYSE"]
      }
    },
    required: ["type"]
  }
}
```

**When Claude uses it:**
- User asks "What's moving today?"
- Claude calls: `getTopMovers("gainers", 5, "NSE")`
- Gets: Top 5 gaining stocks
- Lists them with performance

---

## System Prompt Structure

```
You are a Stock Market Expert AI Assistant with comprehensive market knowledge.

ACCESS:
1. USER'S PORTFOLIO: ${portfolioContext}
2. MARKET DATA: ${marketContext}
3. STOCK UNIVERSE: NSE (36) + NYSE (25)
4. ANALYSIS TOOLS: searchStock, getMarketIndices, etc.

CAPABILITIES:
✅ Analyze portfolio
✅ Search ANY stock
✅ Compare stocks
✅ Provide market insights
✅ Screen stocks
✅ Recommend investments
✅ Technical analysis
✅ Answer market questions

IMPORTANT:
- Specific, actionable insights
- Calculate and mention numbers
- Identify risks
- Suggest rebalancing
- Be concise, use bullets
- Educational approach
```

---

## Database Schema

### Holdings Table (data.json)
```javascript
{
  holdings: [
    {
      id: 1,
      symbol: 'TCS',
      market: 'NSE',
      name: 'Tata Consultancy Services',
      quantity: 10,
      avgPrice: 3250,
      currentPrice: 3650,
      importedPrice: 3450,
      purchaseDate: '2024-01-15',
      type: 'STOCK',
      sector: 'IT',
      isin: 'INE467B01029',
      dayChange: 45,
      dayChangePercent: 1.25
    }
  ]
}
```

### AI Bookmarks (ai_bookmarks.json)
```javascript
{
  bookmarks: [
    {
      id: 1,
      question: 'Should I buy Reliance?',
      answer: 'Detailed AI analysis...',
      model: 'claude-sonnet',
      createdAt: '2024-07-12T10:30:00Z'
    }
  ],
  nextBookmarkId: 2
}
```

---

## External APIs

### 1. Yahoo Finance API
```javascript
const yahooFinance = require('yahoo-finance2')

// Get quote
const quote = await yahooFinance.quote('AAPL')
// Returns: price, change, volume, marketCap, etc.

// Get fundamentals
const summary = await yahooFinance.quoteSummary('AAPL', {
  modules: ['defaultKeyStatistics', 'financialData']
})
// Returns: ROE, profitMargin, debtToEquity
```

### 2. Portkey Middleware
```javascript
const PORTKEY_API_KEY = 'MfSPscvdmxTj8jGpP34lq41axRRK'
const PORTKEY_BASE_URL = 'https://api.portkey.ai'

const response = await axios.post(
  `${PORTKEY_BASE_URL}/v1/messages`,
  { model, system, tools, messages },
  {
    headers: {
      'Content-Type': 'application/json',
      'x-portkey-api-key': PORTKEY_API_KEY,
      'anthropic-version': '2023-06-01'
    }
  }
)
```

---

## Symbol Mapping

**Problem**: User enters "STATEBANKOFINDIA", Yahoo needs "SBIN.NS"

**Solution**: SYMBOL_MAP
```javascript
const SYMBOL_MAP = {
  'STATEBANKOFINDIA': 'SBIN',
  'RELIANCEINDUSTRIES': 'RELIANCE',
  'TATACONSULTANCYSERVLT': 'TCS'
}

function getYahooSymbol(symbol, market) {
  const mapped = SYMBOL_MAP[symbol.toUpperCase()] || symbol
  
  switch (market) {
    case 'NSE': return `${mapped}.NS`
    case 'BSE': return `${mapped}.BO`
    default: return mapped
  }
}
```

---

## Error Handling

### 1. Tool Execution Errors
```javascript
try {
  const stockData = await axios.post('/api/search-stock', {
    symbol, market
  })
  toolResult = JSON.stringify(stockData.data)
} catch (err) {
  toolResult = JSON.stringify({
    error: err.message
  })
}
```

### 2. API Timeout
```javascript
const response = await axios.post(url, data, {
  timeout: 120000  // 2 minutes
})
```

### 3. Missing Data
```javascript
// If fundamental data unavailable
let roe = null
try {
  const summary = await yahooFinance.quoteSummary(...)
  roe = summary.defaultKeyStatistics?.returnOnEquity?.raw
} catch {
  console.log('Fundamental data not available')
}
```

---

## Performance Optimization

### 1. Market Context Caching
```javascript
// Cache market data for 1 minute
const MARKET_CACHE_TTL = 60 * 1000
let marketCache = { data: null, timestamp: 0 }

if (Date.now() - marketCache.timestamp < MARKET_CACHE_TTL) {
  marketContext = marketCache.data
} else {
  marketContext = await fetchMarketData()
  marketCache = { data: marketContext, timestamp: Date.now() }
}
```

### 2. Batch Tool Execution
```javascript
// Execute multiple tools in parallel
const toolPromises = toolUses.map(tool => executeTool(tool))
const results = await Promise.all(toolPromises)
```

### 3. Response Streaming
```javascript
// Future: Stream AI response in chunks
// Currently: Wait for full response
```

---

## Security

### 1. API Key Protection
```javascript
// Stored in server.js (not exposed to frontend)
const PORTKEY_API_KEY = 'MfSPscvdmxTj8jGpP34lq41axRRK'

// Never send to client
// Always use server-side proxy
```

### 2. Input Validation
```javascript
if (!symbol || !market) {
  return res.status(400).json({
    error: 'Symbol and market are required'
  })
}
```

### 3. Rate Limiting
```javascript
// Handled by Portkey middleware
// Max tokens: 3000 per request
// Timeout: 120 seconds
```

---

## Testing Scenarios

### 1. Portfolio Analysis
```
Input: "Analyze my portfolio"
Expected: Portfolio summary with P&L, top performers, risks
Tool Calls: None (uses portfolio context)
```

### 2. Stock Search
```
Input: "Should I buy Apple?"
Expected: AAPL analysis with recommendation
Tool Calls: searchStock("AAPL", "NYSE")
```

### 3. Market Overview
```
Input: "What's happening in the market?"
Expected: Indices, top movers, sentiment
Tool Calls: getMarketIndices(), getTopMovers()
```

### 4. Sector Analysis
```
Input: "How is IT sector doing?"
Expected: IT sector holdings and performance
Tool Calls: getSectorAnalysis("IT", "NSE")
```

### 5. Stock Comparison
```
Input: "Compare TCS vs Infosys"
Expected: Side-by-side comparison with metrics
Tool Calls: searchStock("TCS", "NSE"), searchStock("INFY", "NSE")
```

---

## Monitoring

### 1. API Logs
```javascript
console.log('AI Chat request:', { message, model, toolsUsed })
console.log('Tool execution:', { tool, input, result })
console.error('AI Chat error:', error.response?.data || error.message)
```

### 2. Performance Metrics
- Request latency: ~2-3 seconds
- Tool execution time: ~500ms per tool
- Total response time: ~3-5 seconds with tools

### 3. Error Tracking
- Yahoo Finance failures
- Portkey API errors
- Tool execution errors
- Timeout errors

---

## Deployment

### 1. Environment Variables
```bash
PORT=3001
NODE_ENV=production
PORTKEY_API_KEY=MfSPscvdmxTj8jGpP34lq41axRRK
```

### 2. Build Process
```bash
npm run build  # Build React frontend
node server.js  # Start Express backend
```

### 3. Dependencies
```json
{
  "express": "^4.18.0",
  "axios": "^1.6.0",
  "yahoo-finance2": "^2.11.0",
  "cors": "^2.8.5"
}
```

---

## Future Enhancements

1. **Streaming Responses**: Stream AI responses in real-time
2. **Extended Thinking**: Enable Claude's extended thinking for deep analysis
3. **Chart Integration**: Embed price charts in responses
4. **News Sentiment**: Add news sentiment analysis
5. **Multi-language**: Support Hindi, Tamil, etc.
6. **Voice Input**: Voice-to-text for queries
7. **Export Reports**: Export AI recommendations as PDF
8. **Alert System**: Set price alerts based on AI suggestions

---

## Version History

**v1.0** (Before Enhancement)
- Portfolio-only analysis
- No tool calling
- Limited market context

**v2.0** (Current)
- Market-wide search and analysis
- Tool calling for real-time data
- Comprehensive market context
- 4 AI tools available
- 61 stocks in universe
- Enhanced UI with quick actions

---

**Architecture designed for**: Scalability, Real-time data, AI tool calling, User experience
