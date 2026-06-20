import * as XLSX from 'xlsx';
import fs from 'fs';
import type { ImportedTransaction, TransactionType, Market } from '../../shared/types';

export async function importCSV(filePath: string): Promise<ImportedTransaction[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  const transactions: ImportedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || '';
    });

    const transaction = parseTransactionRow(row);
    if (transaction) transactions.push(transaction);
  }

  return transactions;
}

export async function importExcel(filePath: string): Promise<ImportedTransaction[]> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];

  const transactions: ImportedTransaction[] = [];

  for (const row of data) {
    const normalizedRow: Record<string, string> = {};
    Object.keys(row).forEach(key => {
      normalizedRow[key.toLowerCase().trim()] = String(row[key]).trim();
    });

    const transaction = parseTransactionRow(normalizedRow);
    if (transaction) transactions.push(transaction);
  }

  return transactions;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

function parseTransactionRow(row: Record<string, string>): ImportedTransaction | null {
  // Try to find symbol
  const symbol = row['symbol'] || row['stock'] || row['scrip'] || row['ticker'] || row['name'];
  if (!symbol) return null;

  // Try to find quantity
  const quantityStr = row['quantity'] || row['qty'] || row['units'] || row['shares'];
  const quantity = parseFloat(quantityStr);
  if (isNaN(quantity) || quantity <= 0) return null;

  // Try to find price
  const priceStr = row['price'] || row['rate'] || row['avg_price'] || row['average_price'] || row['nav'];
  const price = parseFloat(priceStr);
  if (isNaN(price) || price <= 0) return null;

  // Try to find date
  const dateStr = row['date'] || row['trade_date'] || row['transaction_date'] || row['purchase_date'];
  const date = parseDateString(dateStr) || new Date().toISOString().split('T')[0];

  // Try to find type
  const typeStr = (row['type'] || row['transaction_type'] || row['action'] || 'BUY').toUpperCase();
  let type: TransactionType = 'BUY';
  if (typeStr.includes('SELL')) type = 'SELL';
  else if (typeStr.includes('DIV')) type = 'DIVIDEND';
  else if (typeStr.includes('SIP')) type = 'SIP';

  // Try to find fees
  const feesStr = row['fees'] || row['charges'] || row['brokerage'] || '0';
  const fees = parseFloat(feesStr) || 0;

  return {
    symbol: symbol.toUpperCase(),
    name: row['name'] || row['company'] || row['fund_name'],
    type,
    quantity,
    price,
    date,
    fees,
    source: 'IMPORT',
    raw: JSON.stringify(row),
  };
}

function parseDateString(dateStr: string): string | null {
  if (!dateStr) return null;

  // Try various date formats
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY or MM/DD/YYYY
    /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }

  // Excel serial date
  const serialDate = parseFloat(dateStr);
  if (!isNaN(serialDate) && serialDate > 30000 && serialDate < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + serialDate * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }

  return null;
}

// Broker-specific email parsers
export function parseZerodhaEmail(emailText: string): ImportedTransaction[] {
  const transactions: ImportedTransaction[] = [];

  // Pattern for Zerodha contract notes
  // Format: Symbol | Qty | Price | Buy/Sell
  const lines = emailText.split('\n');

  for (const line of lines) {
    // Match pattern like: "RELIANCE | 10 | 2450.50 | BUY"
    const match = line.match(/([A-Z]+)\s*[|\t]\s*(\d+)\s*[|\t]\s*([\d,.]+)\s*[|\t]\s*(BUY|SELL)/i);
    if (match) {
      transactions.push({
        symbol: match[1].toUpperCase(),
        type: match[4].toUpperCase() as TransactionType,
        quantity: parseFloat(match[2]),
        price: parseFloat(match[3].replace(/,/g, '')),
        date: new Date().toISOString().split('T')[0],
        source: 'Zerodha',
        raw: line,
      });
    }

    // Alternative pattern: "Bought 10 shares of RELIANCE at Rs. 2450.50"
    const altMatch = line.match(/(Bought|Sold)\s+(\d+)\s+(?:shares?|units?)\s+of\s+([A-Z]+)\s+at\s+(?:Rs\.?\s*)?([\d,.]+)/i);
    if (altMatch) {
      transactions.push({
        symbol: altMatch[3].toUpperCase(),
        type: altMatch[1].toLowerCase() === 'bought' ? 'BUY' : 'SELL',
        quantity: parseFloat(altMatch[2]),
        price: parseFloat(altMatch[4].replace(/,/g, '')),
        date: new Date().toISOString().split('T')[0],
        source: 'Zerodha',
        raw: line,
      });
    }
  }

  return transactions;
}

export function parseGrowwEmail(emailText: string): ImportedTransaction[] {
  const transactions: ImportedTransaction[] = [];

  // Groww transaction confirmation pattern
  // "Your order to buy 5 units of Axis Bluechip Fund at NAV ₹52.34 has been placed"
  const orderPattern = /order to (buy|sell)\s+(\d+)\s+units?\s+of\s+([^at]+)\s+at\s+(?:NAV\s+)?[₹Rs.]?\s*([\d,.]+)/gi;

  let match;
  while ((match = orderPattern.exec(emailText)) !== null) {
    transactions.push({
      symbol: match[3].trim().toUpperCase().replace(/\s+/g, ''),
      name: match[3].trim(),
      type: match[1].toLowerCase() === 'buy' ? 'BUY' : 'SELL',
      quantity: parseFloat(match[2]),
      price: parseFloat(match[4].replace(/,/g, '')),
      date: new Date().toISOString().split('T')[0],
      source: 'Groww',
      raw: match[0],
    });
  }

  // SIP pattern
  const sipPattern = /SIP\s+(?:of\s+)?[₹Rs.]?\s*([\d,]+)\s+(?:in\s+)?([^has]+)\s+has\s+been\s+(?:executed|processed)/gi;
  while ((match = sipPattern.exec(emailText)) !== null) {
    transactions.push({
      symbol: match[2].trim().toUpperCase().replace(/\s+/g, ''),
      name: match[2].trim(),
      type: 'SIP',
      quantity: 1, // Will be calculated based on NAV
      price: parseFloat(match[1].replace(/,/g, '')),
      date: new Date().toISOString().split('T')[0],
      source: 'Groww SIP',
      raw: match[0],
    });
  }

  return transactions;
}

export function parseIndMoneyEmail(emailText: string): ImportedTransaction[] {
  const transactions: ImportedTransaction[] = [];

  // INDmoney patterns
  // "Investment of ₹5,000 in Parag Parikh Flexi Cap Fund"
  const investPattern = /Investment\s+of\s+[₹Rs.]?\s*([\d,]+)\s+in\s+([^.]+)/gi;

  let match;
  while ((match = investPattern.exec(emailText)) !== null) {
    transactions.push({
      symbol: match[2].trim().toUpperCase().replace(/\s+/g, ''),
      name: match[2].trim(),
      type: 'SIP',
      quantity: 1,
      price: parseFloat(match[1].replace(/,/g, '')),
      date: new Date().toISOString().split('T')[0],
      source: 'INDmoney',
      raw: match[0],
    });
  }

  // Stock purchase pattern
  const stockPattern = /(Bought|Purchased)\s+(\d+)\s+shares?\s+of\s+([A-Z]+)\s+at\s+[₹Rs.]?\s*([\d,.]+)/gi;
  while ((match = stockPattern.exec(emailText)) !== null) {
    transactions.push({
      symbol: match[3].toUpperCase(),
      type: 'BUY',
      quantity: parseFloat(match[2]),
      price: parseFloat(match[4].replace(/,/g, '')),
      date: new Date().toISOString().split('T')[0],
      source: 'INDmoney',
      raw: match[0],
    });
  }

  return transactions;
}

export function parseEmailText(emailText: string, broker: string): ImportedTransaction[] {
  switch (broker.toLowerCase()) {
    case 'zerodha':
      return parseZerodhaEmail(emailText);
    case 'groww':
      return parseGrowwEmail(emailText);
    case 'indmoney':
      return parseIndMoneyEmail(emailText);
    default:
      // Try all parsers and combine results
      return [
        ...parseZerodhaEmail(emailText),
        ...parseGrowwEmail(emailText),
        ...parseIndMoneyEmail(emailText),
      ];
  }
}
