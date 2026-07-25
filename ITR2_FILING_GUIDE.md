# ITR-2 Filing Guide: Foreign Assets & Capital Gains

## Your Situation
- **Foreign Assets**: US stocks (NYSE/NASDAQ holdings)
- **Capital Gains**: Both Indian and US stock transactions
- **Form Required**: ITR-2 (for individuals with foreign assets/income)

---

## Part 1: Gather Your Data from Stock Analyzer

### Step 1: Export Capital Gains Report
Your Stock Analyzer has transaction history. Generate reports for:

1. **Short-Term Capital Gains (STCG)**:
   - Stocks held ≤ 12 months (Indian stocks)
   - Stocks held ≤ 24 months (US stocks)

2. **Long-Term Capital Gains (LTCG)**:
   - Stocks held > 12 months (Indian stocks)
   - Stocks held > 24 months (US stocks)

### Step 2: Get Transaction Details
For each sale, you need:
- Purchase date
- Sale date
- Purchase price (₹)
- Sale price (₹)
- Quantity
- Brokerage/charges
- Exchange rate on purchase date (for US stocks)
- Exchange rate on sale date (for US stocks)

---

## Part 2: Schedule FA - Foreign Assets

### What to Report
All foreign assets held at ANY time during FY 2025-26 (Apr 1, 2025 - Mar 31, 2026)

### For Each US Stock:

**1. Country**: United States of America  
**2. Country Code**: US  
**3. Name of Entity**: Company name (e.g., Apple Inc.)  
**4. Address**: Registered office address (use broker statement)  
**5. Nature of Asset**: Shares and Securities  
**6. Date of Acquisition**: When you bought  
**7. Initial Value**: Cost in ₹ (convert USD to INR at purchase date rate)  
**8. Peak Value During Year**: Maximum value during FY  
**9. Closing Value**: Value on March 31, 2026

### Currency Conversion
Use **SBI reference rates** or **RBI reference rates** for:
- Purchase date
- Sale date  
- March 31, 2026 (year-end)

**Example:**
```
AAPL - 10 shares
Purchase: Jan 15, 2024 @ $150/share
USD/INR on Jan 15, 2024: 83.20
Cost = 10 × $150 × 83.20 = ₹1,24,800
```

---

## Part 3: Schedule CG - Capital Gains

### A. Indian Stocks (NSE/BSE)

#### Short-Term Capital Gains (STCG)
**Holding Period**: ≤ 12 months  
**Tax Rate**: 20% (as per Budget 2024-25)  
**Exemption**: None

**Calculation:**
```
Sale Price - Purchase Price - Expenses = STCG
```

#### Long-Term Capital Gains (LTCG)
**Holding Period**: > 12 months  
**Tax Rate**: 12.5% on gains above ₹1.25 lakh  
**Exemption**: First ₹1.25 lakh is tax-free (FY 2024-25 onwards)

**Calculation:**
```
Sale Price - Purchase Price - Expenses = LTCG
If LTCG > ₹1,25,000:
  Taxable = LTCG - ₹1,25,000
  Tax = Taxable × 12.5%
```

### B. US Stocks (NYSE/NASDAQ)

#### Currency Conversion First
Convert all amounts to INR using exchange rates:

**Purchase Value (₹)**:
```
Quantity × Purchase Price (USD) × Exchange Rate on Purchase Date
```

**Sale Value (₹)**:
```
Quantity × Sale Price (USD) × Exchange Rate on Sale Date
```

#### Short-Term Capital Gains
**Holding Period**: ≤ 24 months (different from Indian stocks!)  
**Tax Rate**: As per your income tax slab  
**No Indexation**: Not allowed for foreign securities

**Calculation:**
```
Sale Value (₹) - Purchase Value (₹) - Expenses (₹) = STCG
Add to your income → Tax as per slab
```

#### Long-Term Capital Gains
**Holding Period**: > 24 months  
**Tax Rate**: 12.5% (no indexation for foreign securities)  
**Exemption**: First ₹1.25 lakh combined with Indian LTCG

**Calculation:**
```
Sale Value (₹) - Purchase Value (₹) - Expenses (₹) = LTCG
If total LTCG > ₹1,25,000:
  Taxable = LTCG - ₹1,25,000
  Tax = Taxable × 12.5%
```

---

## Part 4: Example Calculation

### Example 1: US Stock - AAPL

**Transaction:**
- Bought: 10 shares on Jan 15, 2024 @ $150/share
- Sold: 10 shares on Feb 20, 2026 @ $180/share
- Holding: 13 months → **STCG** (< 24 months)

**Exchange Rates:**
- Jan 15, 2024: 1 USD = ₹83.20
- Feb 20, 2026: 1 USD = ₹84.50

**Calculation:**
```
Purchase Value:
10 × $150 × 83.20 = ₹1,24,800

Sale Value:
10 × $180 × 84.50 = ₹1,52,100

Brokerage: ₹500

STCG = ₹1,52,100 - ₹1,24,800 - ₹500 = ₹26,800

Tax = ₹26,800 × (Your Tax Slab %)
If 30% slab: ₹26,800 × 30% = ₹8,040
```

### Example 2: Indian Stock - RELIANCE

**Transaction:**
- Bought: 20 shares on Apr 1, 2023 @ ₹2,400/share
- Sold: 20 shares on May 15, 2025 @ ₹2,800/share
- Holding: 25 months → **LTCG** (> 12 months)

**Calculation:**
```
Purchase Value:
20 × ₹2,400 = ₹48,000

Sale Value:
20 × ₹2,800 = ₹56,000

Brokerage/STT: ₹300

LTCG = ₹56,000 - ₹48,000 - ₹300 = ₹7,700

Tax = NIL (within ₹1.25 lakh exemption)
```

---

## Part 5: Step-by-Step ITR-2 Filing

### Before You Start
**Documents Needed:**
1. Form 16 (if salaried)
2. Form 26AS (check TDS)
3. Annual Information Statement (AIS)
4. Bank statements
5. **Broker statements** (Indian + US)
6. Capital gains calculations
7. Foreign asset details

### Step 1: Login to e-Filing Portal
- Go to: https://www.incometax.gov.in/
- Login with PAN
- Select **File Income Tax Return**
- Choose **Assessment Year 2026-27** (for FY 2025-26)
- Select **ITR-2**

### Step 2: Fill Personal Information
- Basic details (pre-filled)
- Bank account for refund
- Foreign asset flag: **YES**

### Step 3: Fill Income from Salary/Business
- Enter as usual

### Step 4: Fill Schedule CG (Capital Gains)

#### For STCG:
1. Go to "Capital Gains"
2. Select "Short Term"
3. **Listed shares (Equity) - India**:
   - Select "115BAC" or "Normal" as applicable
   - Enter transaction details
   - System calculates tax @ 20%

4. **Foreign Securities**:
   - Add each transaction
   - Enter purchase value (₹)
   - Enter sale value (₹)
   - Gains added to income

#### For LTCG:
1. Go to "Capital Gains"
2. Select "Long Term"
3. **Listed shares (Equity) - India**:
   - Enter transaction details
   - System auto-deducts ₹1.25 lakh
   - Tax @ 12.5%

4. **Foreign Securities**:
   - Add each transaction
   - No indexation option
   - Share ₹1.25 lakh exemption
   - Tax @ 12.5%

### Step 5: Fill Schedule FA (Foreign Assets)

1. Go to "Schedule FA"
2. Click "Add Asset"
3. For each US stock holding:
   ```
   Country: US
   Code: US
   Name: Apple Inc.
   Address: (Broker statement)
   Nature: Shares
   Date Acquired: (Purchase date)
   Initial Value: ₹1,24,800
   Peak Value: (Highest in year)
   Closing Value: ₹1,52,100 (as on Mar 31)
   ```

4. Repeat for each US stock

### Step 6: Tax Calculation
- System auto-calculates
- Check TDS credit from 26AS
- Calculate tax payable/refund

### Step 7: Verify & Submit
1. Preview return
2. Verify all schedules
3. Submit
4. Choose verification method:
   - Aadhaar OTP (instant)
   - Net banking
   - Send signed ITR-V to CPC Bangalore

---

## Part 6: Common Mistakes to Avoid

### ❌ Don't Do This:
1. **Skip Schedule FA** - Mandatory if you have foreign assets
2. **Use wrong holding period** - US stocks: 24 months for LTCG
3. **Forget currency conversion** - Always convert to ₹
4. **Use wrong exchange rates** - Use RBI/SBI rates
5. **Claim indexation on foreign stocks** - Not allowed
6. **Report only sold stocks in FA** - Report ALL holdings
7. **Mix up tax rates** - STCG India: 20%, US: Slab rate

### ✅ Do This:
1. Report all foreign assets (even if not sold)
2. Use correct holding periods
3. Keep broker statements for 7 years
4. Match with AIS (Annual Information Statement)
5. Cross-check with Form 26AS
6. Take CA help if complex transactions
7. File before deadline (July 31, 2026)

---

## Part 7: Tax Rates Summary (FY 2024-25 onwards)

| Asset Type | Holding Period | STCG Tax | LTCG Tax | Exemption |
|------------|----------------|----------|----------|-----------|
| Indian Equity | ≤ 12 months | 20% | - | None |
| Indian Equity | > 12 months | - | 12.5% | ₹1.25 lakh |
| US Stocks | ≤ 24 months | Slab rate | - | None |
| US Stocks | > 24 months | - | 12.5% | ₹1.25 lakh (shared) |

**Important**: ₹1.25 lakh exemption is TOTAL - shared between Indian and foreign LTCG!

---

## Part 8: Using Stock Analyzer App for Tax Reports

### Generate Capital Gains Report

Your app should have (or we can add):

1. **Transaction History Export**:
   - Filter by date range (Apr 1 - Mar 31)
   - Separate Indian vs US stocks
   - Calculate holding period automatically
   - Classify STCG vs LTCG

2. **Tax Report Generator**:
   ```
   Stock: AAPL (US)
   Buy Date: 15-Jan-2024
   Sell Date: 20-Feb-2026
   Holding: 13 months → STCG
   
   Purchase: 10 × $150 × 83.20 = ₹1,24,800
   Sale: 10 × $180 × 84.50 = ₹1,52,100
   Gain: ₹27,300
   Tax Type: STCG (add to income)
   ```

3. **Foreign Asset Schedule**:
   - List all US holdings
   - Show peak value during year
   - Closing value on March 31
   - Ready to copy to ITR-2

---

## Part 9: Pro Tips

### 1. Tax Loss Harvesting
Offset gains with losses:
```
LTCG from RELIANCE: ₹50,000
LTCG loss from TCS: -₹20,000
Net LTCG: ₹30,000 (within exemption, no tax!)
```

### 2. Track Exchange Rates
Keep records:
- RBI reference rates: https://www.rbi.org.in/
- SBI reference rates
- Screenshot rates on transaction dates

### 3. Broker Statements
Your brokers provide:
- **Indian**: Zerodha, Groww → P&L statement
- **US**: Interactive Brokers, Vested → Tax forms (may not be India-compliant)
- Convert US broker data to Indian format

### 4. Advanced Tax Calculation Service (AIS)
Check your AIS on e-filing portal:
- Shows all financial transactions
- Includes salary, interest, dividends
- May show some broker data
- Verify everything matches

---

## Part 10: When to Hire a CA

**Consider hiring a CA if:**
- First time filing with foreign assets
- Multiple currency conversions
- Complex transactions (options, F&O)
- Large capital gains (>₹10 lakhs)
- Want to optimize tax
- Unsure about any calculation

**CA Fee**: ₹2,000 - ₹10,000 depending on complexity

---

## Quick Checklist for ITR-2 Filing

- [ ] Download broker statements (Indian + US)
- [ ] List all transactions in FY 2025-26
- [ ] Calculate STCG for each sale
- [ ] Calculate LTCG for each sale
- [ ] Convert US transactions to ₹
- [ ] Note exchange rates used
- [ ] List all US stocks held (even unsold)
- [ ] Get peak value for each US stock
- [ ] Get closing value (Mar 31, 2026)
- [ ] Fill Schedule CG in ITR-2
- [ ] Fill Schedule FA in ITR-2
- [ ] Verify against AIS
- [ ] Check TDS credit in 26AS
- [ ] Calculate final tax/refund
- [ ] Submit before July 31, 2026
- [ ] Verify ITR (within 30 days)

---

## Need Help from Your App?

I can add these features to your Stock Analyzer:

### Feature 1: Tax Report Generator
- Auto-calculate STCG/LTCG
- Separate Indian vs US
- Currency conversion
- Ready-to-file format

### Feature 2: Foreign Asset Report
- List all US holdings
- Peak value calculation
- Schedule FA format
- Export to Excel

Would you like me to implement these? 🚀

---

## Resources

1. **Income Tax Portal**: https://www.incometax.gov.in/
2. **ITR-2 Instructions**: Download from e-filing portal
3. **RBI Exchange Rates**: https://www.rbi.org.in/Scripts/ReferenceRateArchive.aspx
4. **Tax Calculator**: https://cleartax.in/paytax/tax-calculator
5. **Capital Gains Guide**: https://cleartax.in/s/capital-gains-tax

---

## Final Notes

**Deadline**: July 31, 2026 (for FY 2025-26)  
**Late Fee**: ₹5,000 if filed after deadline  
**Interest**: 1% per month on unpaid tax

**Keep Records**: Maintain for 7 years:
- Broker statements
- Exchange rate proofs
- Bank statements
- Filed ITR acknowledgment

Good luck with your filing! 📊✅
