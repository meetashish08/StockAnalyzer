# Tax Analysis - P/L % Column Update

## Changes Made

### Feature Added
Added **Profit/Loss Percentage (P/L %)** column to the Transactions tab in Tax Analysis section.

### Location
- **Component**: `src/renderer/components/TaxAnalysis/TaxAnalysis.tsx`
- **Tab**: Transactions (line 1117-1210)

### Implementation Details

#### 1. New Table Header
- Added "P/L %" column header (right-aligned)
- Positioned after "Gain/Loss" column and before "Type" column

#### 2. Calculation Logic
```typescript
const plPercent = t.buyValue > 0 ? ((t.gain || 0) / t.buyValue) * 100 : 0;
```
- Formula: `(Gain/Loss ÷ Buy Value) × 100`
- Handles division by zero (returns 0% if buyValue is 0)
- Based on actual transaction gain/loss values

#### 3. Display Format
- Shows percentage with 2 decimal places (e.g., `+15.23%`, `-8.45%`)
- **Green color** for profits (≥ 0%)
- **Red color** for losses (< 0%)
- Includes `+` sign for positive percentages
- Right-aligned for better readability

#### 4. Color Coding
```typescript
className={`px-4 py-3 text-right font-semibold ${plPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}
```
- `text-green-400` - Profit (positive percentage)
- `text-red-400` - Loss (negative percentage)
- `font-semibold` - Bold for emphasis

### Example Output

| Gain/Loss | P/L % |
|-----------|-------|
| ₹15,000 | <span style="color: green">+12.50%</span> |
| ₹-5,000 | <span style="color: red">-8.33%</span> |
| ₹0 | <span style="color: green">+0.00%</span> |

### Benefits

1. **Quick Performance Assessment**: Instantly see which trades performed best/worst by percentage
2. **Normalized Comparison**: Compare trades of different sizes on equal footing
3. **Visual Clarity**: Color coding helps quickly identify profitable vs loss-making trades
4. **Tax Planning**: Helps identify high-return trades for tax optimization strategies

### Usage

1. Navigate to **Tax Analysis** page
2. Upload transaction data (Excel/CSV)
3. Click **Transactions** tab
4. View the new **P/L %** column showing percentage returns for each transaction

### Build Status
✅ **Completed** - Built successfully on 2026-08-04
- Build time: 7.42s
- Frontend rebuilt with Vite
- Server running on port 3001
- Changes live immediately (no server restart needed)

### Files Modified
- `src/renderer/components/TaxAnalysis/TaxAnalysis.tsx`
  - Line 1121: Added header column
  - Line 1136-1138: Added calculation logic
  - Line 1172-1174: Added display column

### Testing Checklist
- [ ] Navigate to Tax Analysis → Transactions tab
- [ ] Verify P/L % column appears after Gain/Loss column
- [ ] Check green color for profitable trades
- [ ] Check red color for loss-making trades
- [ ] Verify percentage calculation is accurate
- [ ] Test with Indian stocks (INR)
- [ ] Test with US stocks (USD)
- [ ] Test with mixed currency transactions

---

**Feature Status**: ✅ Ready for Testing  
**Last Updated**: 2026-08-04  
**Developer**: Claude Sonnet 4.5  
