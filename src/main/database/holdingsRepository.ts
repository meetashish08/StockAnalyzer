import { getDatabase } from './init';
import type { Holding, Transaction, Market, AssetType, TransactionType } from '../../shared/types';

interface HoldingRow {
  id: number;
  symbol: string;
  market: string;
  name: string;
  quantity: number;
  avg_price: number;
  purchase_date: string | null;
  type: string;
  sector: string | null;
  created_at: string;
  updated_at: string;
}

interface TransactionRow {
  id: number;
  holding_id: number;
  type: string;
  quantity: number;
  price: number;
  date: string;
  fees: number;
  source: string;
  notes: string | null;
  created_at: string;
}

function rowToHolding(row: HoldingRow): Holding {
  return {
    id: row.id,
    symbol: row.symbol,
    market: row.market as Market,
    name: row.name,
    quantity: row.quantity,
    avgPrice: row.avg_price,
    purchaseDate: row.purchase_date || '',
    type: row.type as AssetType,
    sector: row.sector || undefined,
    createdAt: row.created_at,
  };
}

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    holdingId: row.holding_id,
    type: row.type as TransactionType,
    quantity: row.quantity,
    price: row.price,
    date: row.date,
    fees: row.fees,
    source: row.source as 'MANUAL' | 'IMPORT' | 'GMAIL',
    notes: row.notes || undefined,
  };
}

export function getAllHoldings(): Holding[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM holdings ORDER BY symbol').all() as HoldingRow[];
  return rows.map(rowToHolding);
}

export function getHoldingById(id: number): Holding | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM holdings WHERE id = ?').get(id) as HoldingRow | undefined;
  return row ? rowToHolding(row) : null;
}

export function getHoldingBySymbol(symbol: string, market: Market): Holding | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM holdings WHERE symbol = ? AND market = ?').get(symbol, market) as HoldingRow | undefined;
  return row ? rowToHolding(row) : null;
}

export interface AddHoldingInput {
  symbol: string;
  market: Market;
  name: string;
  quantity: number;
  avgPrice: number;
  purchaseDate?: string;
  type?: AssetType;
  sector?: string;
}

export function addHolding(input: AddHoldingInput): Holding {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO holdings (symbol, market, name, quantity, avg_price, purchase_date, type, sector)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.symbol.toUpperCase(),
    input.market,
    input.name,
    input.quantity,
    input.avgPrice,
    input.purchaseDate || null,
    input.type || 'STOCK',
    input.sector || null
  );

  return getHoldingById(result.lastInsertRowid as number)!;
}

export function updateHolding(id: number, updates: Partial<AddHoldingInput>): Holding | null {
  const db = getDatabase();
  const existing = getHoldingById(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.symbol !== undefined) {
    fields.push('symbol = ?');
    values.push(updates.symbol.toUpperCase());
  }
  if (updates.market !== undefined) {
    fields.push('market = ?');
    values.push(updates.market);
  }
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.quantity !== undefined) {
    fields.push('quantity = ?');
    values.push(updates.quantity);
  }
  if (updates.avgPrice !== undefined) {
    fields.push('avg_price = ?');
    values.push(updates.avgPrice);
  }
  if (updates.purchaseDate !== undefined) {
    fields.push('purchase_date = ?');
    values.push(updates.purchaseDate);
  }
  if (updates.type !== undefined) {
    fields.push('type = ?');
    values.push(updates.type);
  }
  if (updates.sector !== undefined) {
    fields.push('sector = ?');
    values.push(updates.sector);
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const sql = `UPDATE holdings SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...values);

  return getHoldingById(id);
}

export function deleteHolding(id: number): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM holdings WHERE id = ?').run(id);
  return result.changes > 0;
}

export function addTransaction(input: {
  holdingId: number;
  type: TransactionType;
  quantity: number;
  price: number;
  date: string;
  fees?: number;
  source?: 'MANUAL' | 'IMPORT' | 'GMAIL';
  notes?: string;
}): Transaction {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO transactions (holding_id, type, quantity, price, date, fees, source, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.holdingId,
    input.type,
    input.quantity,
    input.price,
    input.date,
    input.fees || 0,
    input.source || 'MANUAL',
    input.notes || null
  );

  // Update holding's average price and quantity
  updateHoldingFromTransaction(input.holdingId, input.type, input.quantity, input.price);

  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid) as TransactionRow;
  return rowToTransaction(row);
}

function updateHoldingFromTransaction(holdingId: number, type: TransactionType, quantity: number, price: number): void {
  const db = getDatabase();
  const holding = getHoldingById(holdingId);
  if (!holding) return;

  let newQuantity = holding.quantity;
  let newAvgPrice = holding.avgPrice;

  if (type === 'BUY' || type === 'SIP') {
    const totalCost = holding.avgPrice * holding.quantity + price * quantity;
    newQuantity = holding.quantity + quantity;
    newAvgPrice = newQuantity > 0 ? totalCost / newQuantity : 0;
  } else if (type === 'SELL') {
    newQuantity = holding.quantity - quantity;
    // Average price remains same on sell
  }

  db.prepare('UPDATE holdings SET quantity = ?, avg_price = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(newQuantity, newAvgPrice, holdingId);
}

export function getTransactionsByHolding(holdingId: number): Transaction[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM transactions WHERE holding_id = ? ORDER BY date DESC')
    .all(holdingId) as TransactionRow[];
  return rows.map(rowToTransaction);
}

export function getAllTransactions(): Transaction[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM transactions ORDER BY date DESC').all() as TransactionRow[];
  return rows.map(rowToTransaction);
}

export function getTransactionsByDateRange(startDate: string, endDate: string): Transaction[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC')
    .all(startDate, endDate) as TransactionRow[];
  return rows.map(rowToTransaction);
}
