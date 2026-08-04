# Transaction Table Sorting - Quick Guide

## 🎯 How to Sort

### Simple Sorting
1. **Click any column header** to sort
2. **Click again** to reverse the order
3. **Click a different column** to sort by that field

### Visual Indicators

| Icon | Meaning |
|------|---------|
| ↕️ | Column not sorted (clickable) |
| ↓ | Sorted descending (highest/newest first) |
| ↑ | Sorted ascending (lowest/oldest first) |

---

## 📊 Common Sorting Scenarios

### 1️⃣ Find Your Best Trades
**Goal**: See which trades had the highest returns

**Steps**:
- Click **P/L %** column header
- Icon shows ↓ (descending)
- Highest percentage gains appear first

**Result**: 
```
Stock      | P/L % ↓
-----------|--------
AAPL       | +45.2%
RELIANCE   | +32.1%
TCS        | +18.5%
INFY       | -8.3%  ← Loss trades at bottom
```

---

### 2️⃣ Find Your Biggest Losses
**Goal**: Identify trades that lost the most money

**Steps**:
- Click **Gain/Loss** column header **twice**
- First click: ↓ (shows profits first)
- Second click: ↑ (shows losses first)

**Result**:
```
Stock      | Gain/Loss ↑
-----------|-------------
PAYTM      | ₹-25,000  ← Biggest loss
ZOMATO     | ₹-12,000
NIFTY      | ₹-5,000
RELIANCE   | ₹+15,000  ← Profits at bottom
```

---

### 3️⃣ Review Recent Activity
**Goal**: See your most recent transactions

**Steps**:
- Click **Sell Date** column header
- Icon shows ↓ (descending)
- Most recent sales appear first

**Result**:
```
Stock      | Sell Date ↓
-----------|-------------
AAPL       | 15-Dec-2024  ← Most recent
TCS        | 10-Nov-2024
INFY       | 05-Oct-2024
RELIANCE   | 20-Sep-2024
```

---

### 4️⃣ Find Long-Term Holdings
**Goal**: See which trades qualified for LTCG tax benefits

**Steps**:
- Click **Holding** column header
- Icon shows ↓ (descending)
- Longest holding periods first

**Result**:
```
Stock      | Holding ↓ | Type
-----------|-----------|------
RELIANCE   | 36m       | LTCG  ← Longest hold
TCS        | 24m       | LTCG
AAPL       | 18m       | STCG  ← US stock (needs 24m)
INFY       | 8m        | STCG
```

---

### 5️⃣ Sort by Investment Size
**Goal**: Review performance of your largest investments

**Steps**:
- Click **Buy Value** column header
- Icon shows ↓ (descending)
- Largest investments appear first

**Result**:
```
Stock      | Buy Value ↓ | P/L %
-----------|-------------|-------
RELIANCE   | ₹2,50,000   | +12.5%
AAPL       | $3,000      | +45.2%  ← Converted to INR
TCS        | ₹1,20,000   | +18.5%
INFY       | ₹50,000     | -8.3%
```

---

### 6️⃣ Compare STCG vs LTCG
**Goal**: Group transactions by tax type

**Steps**:
- Click **Type** column header
- Icon shows ↓ (descending)
- Groups: STCG first, then LTCG

**Result**:
```
Stock      | Type ↓ | Tax Rate
-----------|--------|----------
AAPL       | STCG   | Per slab (US)
INFY       | STCG   | 20% (India)
ZOMATO     | STCG   | 20% (India)
-----------|--------|----------
RELIANCE   | LTCG   | 12.5%
TCS        | LTCG   | 12.5%
```

---

### 7️⃣ Check Confidence Scores
**Goal**: Find transactions with low AI mapping confidence

**Steps**:
- Click **Conf.** column header **twice**
- First click: ↓ (highest confidence first)
- Second click: ↑ (lowest confidence first)

**Result**:
```
Stock      | Conf. ↑ | Action
-----------|---------|--------
UNKNOWN    | 45%     | ⚠️ Review needed
PAYTM      | 68%     | ⚠️ Verify details
RELIANCE   | 92%     | ✅ High confidence
TCS        | 98%     | ✅ High confidence
```

---

## 💡 Pro Tips

### Tip 1: Double-Click for Reverse Sort
- First click: Descending (↓)
- Second click: Ascending (↑)
- Third click different column: New sort

### Tip 2: Hover to Identify Sortable Columns
- **Hover over header**: Text turns white
- **Cursor changes**: Pointer indicates clickable
- **All columns sortable**: No restrictions

### Tip 3: Combine with Filters
1. Sort by **P/L %** descending
2. Look at top 5 profitable trades
3. Check their **Type** (STCG/LTCG)
4. Plan tax strategy

### Tip 4: Tax-Loss Harvesting
1. Sort **Gain/Loss** ascending (↑)
2. Identify unrealized losses
3. Check **Holding** period
4. Decide on set-off strategy

### Tip 5: Quick Wins Analysis
1. Sort **P/L %** descending (↓)
2. Sort **Holding** ascending (↑)
3. Find high returns + short holding
4. Identify quick trading patterns

---

## 🚀 Keyboard Shortcuts (Future)

*Coming soon - currently mouse/touch only*

- `→` / `←` - Next/Previous column
- `↑` / `↓` - Sort direction
- `Space` - Toggle sort
- `Esc` - Clear sort

---

## ❓ FAQ

### Q: Can I sort by multiple columns?
**A**: Currently single-column sorting. Click one column at a time.

### Q: Does sorting change my data?
**A**: No! Sorting only changes display order. Original data is safe.

### Q: What happens to null values?
**A**: Null/empty values are sorted to the end of the list.

### Q: Can I export sorted data?
**A**: Not yet - export uses original order. Feature coming soon!

### Q: Does sorting affect tax calculations?
**A**: No - sorting is visual only. Tax totals remain accurate.

### Q: Is the sort saved when I leave the tab?
**A**: No - sort resets when you navigate away. This will be added.

---

## 🔍 Troubleshooting

### Sort not working?
1. Check browser console for errors (F12)
2. Refresh the page
3. Re-upload your transaction file
4. Contact support if issue persists

### Wrong sort order?
1. Click column header again to reverse
2. Check for null/invalid data values
3. Verify data imported correctly

### Headers not clickable?
1. Ensure you're on **Transactions** tab
2. Check if data is loaded
3. Try different browser if issue persists

---

## 📋 All Sortable Fields

| # | Column | Sort Type | Example Use Case |
|---|--------|-----------|------------------|
| 1 | Stock | Alphabetical | Find specific ticker |
| 2 | Buy Date | Chronological | Oldest purchases |
| 3 | Sell Date | Chronological | Recent activity |
| 4 | Qty | Numeric | Large/small positions |
| 5 | Buy Value | Currency | Investment size |
| 6 | Sell Value | Currency | Exit size |
| 7 | Gain/Loss | Currency | Absolute profit/loss |
| 8 | **P/L %** | Percentage | **Relative performance** |
| 9 | Type | Category | STCG vs LTCG |
| 10 | Holding | Months | Tax eligibility |
| 11 | Conf. | Percentage | Data quality check |

---

**Quick Access**: Tax Analysis → Upload File → Transactions Tab → Click Column Headers

**Status**: ✅ Live  
**Updated**: 2026-08-04  
