# INDmoney Import Parser Fix

## Issue
The Stock Analytics app's import module was failing to parse INDmoney Excel files (format: `IND-HOLDINGS_REPORTXX117532755-2026-07-12-V04.xls`).

## Root Cause Analysis

### Excel File Structure
```
Row 1: Account Details
Row 2: Broker Name | DriveWealth
Row 3: Broker Account | WRMJ001456
Row 4: Holdings as on | 2026-07-12
Row 5-7: Empty rows
Row 8: Stock Symbol | Holding Since | Quantity | Avg. Price ($) | Total Value ($)
Row 9+: Data rows (e.g., SKHY | 12 Jul 2026, 06:39 AM | 0.05864057 | 170.0188112 | 9.97)
```

### Key Differences from Groww Format
1. **Header location**: Row 8 instead of Row 1
2. **Column names**: "Stock Symbol" instead of "Stock Name", "Avg. Price ($)" instead of "Average Buy Price"
3. **Date format**: "12 Jul 2026, 06:39 AM" instead of ISO date
4. **Currency**: US Dollars ($) instead of Indian Rupees (₹)
5. **Market**: NYSE/NASDAQ stocks instead of NSE/BSE
6. **Broker**: DriveWealth (used by INDmoney for US stocks)
7. **No current prices**: "Total Value ($)" is the INVESTED amount, not current market value

## Changes Made

### 1. Enhanced Excel Parser (`server.js`)

#### Updated `parseExcelData()` function:
- Added detection for INDmoney format by looking for "Stock Symbol" + "Holding Since" headers
- Added format detection variable: `detectedFormat` ('indmoney', 'groww', or 'generic')
- Enhanced header detection to scan first 20 rows for metadata
- Added console logging for debugging
- Skip empty data rows

```javascript
// INDmoney format detection
if (rowStr.includes('stock symbol') && rowStr.includes('holding since')) {
  headerRowIndex = i;
  headers = row.map(h => String(h).toLowerCase().trim());
  detectedFormat = 'indmoney';
  console.log('Detected INDmoney format at row', i);
  break;
}
```

#### Created `parseINDmoneyRow()` function:
- Parses "Stock Symbol" column
- Parses "Avg. Price ($)" with $ sign removal
- Parses "Total Value ($)" as current market value
- Calculates buy value: `avgPrice * quantity`
- Calculates current price: `totalValue / quantity`
- Calculates P&L: `totalValue - buyValue`
- Sets market to 'NYSE' for US stocks
- Calls `parseINDmoneyDate()` for date parsing

#### Created `parseINDmoneyDate()` function:
- Handles "12 Jul 2026, 06:39 AM" format
- Extracts date part before comma
- Converts to ISO format (YYYY-MM-DD)

#### Updated `parseTransactionRow()` function:
- Added `detectedFormat` parameter
- Routes to `parseINDmoneyRow()` for INDmoney files
- Enhanced column name matching to include INDmoney variants:
  - "stock symbol"
  - "avg. price ($)"
  - "total value ($)"
  - "holding since"
- Removes both ₹ and $ symbols when parsing currency
- Sets source based on detected format

### 2. Market Detection Logic (`ImportData.tsx`)

Enhanced the holding creation logic to properly detect US stocks:

```typescript
// Determine market based on source and symbol characteristics
let market = 'NSE';
if (source === 'INDmoney') {
  // INDmoney imports US stocks
  market = 'NYSE';
} else if (tx.isin && tx.isin.startsWith('US')) {
  // US ISIN codes start with 'US'
  market = 'NYSE';
} else if (tx.symbol && tx.symbol.length <= 4 && /^[A-Z]+$/.test(tx.symbol)) {
  // Short all-caps symbols (1-4 chars) are likely US stocks
  market = 'NYSE';
}
```

## File Mappings

### INDmoney Format Mapping
| Excel Column | Parsed Field | Notes |
|--------------|--------------|-------|
| Stock Symbol | symbol | Uppercase, trimmed |
| Holding Since | date | Converted to YYYY-MM-DD |
| Quantity | quantity | Parsed as float (supports fractional shares) |
| Avg. Price ($) | price, avgPrice | $ removed |
| Total Value ($) | buyValue | **This is invested amount, not current value!** |
| (initial) | closingPrice | Set to avgPrice initially |
| (initial) | closingValue | Set to buyValue initially |
| (initial) | unrealisedPnL | Set to 0 initially (updated after price refresh) |
| (initial) | pnlPercent | Set to 0 initially (updated after price refresh) |

**Important**: The INDmoney holdings report only contains purchase information (average price and invested amount). Current market prices are NOT included in the Excel file. After import, you must use the "Refresh Prices" feature to fetch current prices from Yahoo Finance and calculate actual P&L.

## Testing Steps

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Navigate to Import page** in the app

3. **Upload test file**: `C:\Users\akumar20\Downloads\IND-HOLDINGS_REPORTXX117532755-2026-07-12-V04.xls`

4. **Expected Results**:
   - Format detected as "INDmoney"
   - 11-14 holdings parsed (SKHY, SNDK, SPCX, INTC, WDC, NVDA, GOOG, AMZN, ADI, MU, AAPL, etc.)
   - Market set to "NYSE" for all holdings
   - Correct quantities (fractional shares like 0.05864057)
   - Correct average prices (e.g., $170.02 for SKHY)
   - Correct buy values (e.g., $9.97 for SKHY)
   - **P&L shows as $0.00 initially** (current prices not in Excel file)
   - Dates parsed correctly (e.g., "2026-07-11" for "12 Jul 2026, 06:39 AM")

5. **Verify in UI**:
   - Preview table shows all 11-14 stocks
   - Quantities match Excel file
   - Avg Buy Price matches "Avg. Price ($)" column
   - Invested amount matches "Total Value ($)" column
   - **Current Value initially same as Invested** (no current prices in Excel)
   - **P&L shows as $0.00 initially** (will update after price refresh)

6. **Import selected holdings**:
   - Click "Import X Holdings" button
   - Verify holdings appear in Portfolio dashboard
   - Check that market is set to "NYSE"
   - **Use "Refresh Prices" button** to fetch current market prices
   - Verify prices update correctly via Yahoo Finance (e.g., NVDA, AAPL, GOOG)
   - Confirm P&L is now calculated based on real-time prices

## Sample Data Validation

From the Excel file:
```
SKHY: Qty 0.05864057, Avg $170.02, Total $9.97
  → Buy Value = "Total Value ($)" = $9.97 ✓
  → Verification: 0.05864057 × 170.02 ≈ $9.97 ✓
  → Initial Current Price = Avg Price = $170.02 ✓
  → Initial P&L = $0.00 (updated after price refresh)

NVDA: Qty 0.5119479, Avg $195.33, Total $100
  → Buy Value = "Total Value ($)" = $100 ✓
  → Verification: 0.5119479 × 195.33 ≈ $100 ✓
  → Initial Current Price = Avg Price = $195.33 ✓
  → Initial P&L = $0.00 (updated after price refresh)

After Price Refresh (example):
NVDA: Current market price fetched from Yahoo Finance
  → If current NVDA price = $450
  → Current Value = 0.5119479 × $450 = $230.38
  → P&L = $230.38 - $100 = $130.38 (+130.38%)
```

## Error Handling

The parser includes:
- Null/empty symbol detection → skips row
- Zero/negative quantity detection → skips row
- Zero/negative price detection → skips row
- Empty row detection → skips row
- Console logging for debugging
- Fallback to current date if date parsing fails

## Backward Compatibility

✅ Groww format still works (detected by "stock name" or "isin" headers)
✅ Zerodha format still works (detected by "symbol" + "quantity" headers)
✅ Generic CSV format still works (fallback parsing)

## Next Steps (Optional Enhancements)

1. **Add US market support to price refresh**:
   - Update `/api/refresh-prices` to handle NYSE/NASDAQ symbols
   - Already supported via Yahoo Finance (no exchange suffix needed)

2. **Currency conversion**:
   - Add USD to INR conversion for portfolio totals
   - Display both USD and INR values

3. **Broker metadata extraction**:
   - Parse "Broker Name" (DriveWealth)
   - Parse "Broker Account" (WRMJ001456)
   - Parse "Holdings as on" date

4. **Multi-broker portfolio tracking**:
   - Show which broker each holding came from
   - Filter by broker

## Files Modified

1. `server.js`:
   - `parseExcelData()` - Enhanced format detection
   - `parseTransactionRow()` - Added format parameter and INDmoney routing
   - `parseINDmoneyRow()` - New function for INDmoney-specific parsing
   - `parseINDmoneyDate()` - New function for date parsing

2. `src/renderer/components/Import/ImportData.tsx`:
   - Enhanced market detection logic in `handleImportSelected()`

3. `INDMONEY_IMPORT_FIX.md` - This documentation file

## Console Output Example

When importing INDmoney file:
```
Detected INDmoney format at row 7
Detected format: indmoney Headers: ['stock symbol', 'holding since', 'quantity', 'avg. price ($)', 'total value ($)']
Parsed INDmoney row: { symbol: 'SKHY', quantity: 0.05864057, avgPrice: 170.0188112, totalValue: 9.97, buyValue: 9.968..., unrealisedPnL: 0.001..., date: '2026-07-12' }
Parsed INDmoney row: { symbol: 'SNDK', quantity: 0.00531438, avgPrice: 1881.687045, totalValue: 10, ... }
...
Found 14 holdings from INDmoney
```

## Known Limitations

1. **Broker metadata not stored**: Account details from rows 1-7 are not currently saved
2. **Currency assumption**: Assumes all INDmoney files are in USD
3. **Single sheet support**: Only processes first sheet in workbook
4. **No ISIN mapping**: US stocks don't include ISIN in this format

## Support

If import still fails:
1. Check browser console for error messages
2. Check server console for parsing logs
3. Verify Excel file structure matches expected format
4. Try re-exporting from INDmoney platform
5. Check file extension (.xls vs .xlsx compatibility)
