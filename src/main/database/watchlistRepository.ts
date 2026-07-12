import { getDatabase } from './init';
import type { WatchlistItem } from '../../shared/types';

export function getAllWatchlistItems(): WatchlistItem[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT
      id,
      symbol,
      market,
      name,
      target_price as targetPrice,
      stop_loss as stopLoss,
      notes,
      created_at as createdAt
    FROM watchlist
    ORDER BY created_at DESC
  `);

  return stmt.all() as WatchlistItem[];
}

export function addToWatchlist(item: {
  symbol: string;
  market: string;
  name?: string;
  targetPrice?: number;
  stopLoss?: number;
  notes?: string;
}): WatchlistItem {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO watchlist (symbol, market, name, target_price, stop_loss, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  try {
    const result = stmt.run(
      item.symbol,
      item.market,
      item.name || null,
      item.targetPrice || null,
      item.stopLoss || null,
      item.notes || null
    );

    // Fetch and return the newly created item
    const newItem = db.prepare('SELECT * FROM watchlist WHERE id = ?').get(result.lastInsertRowid) as any;

    return {
      id: newItem.id,
      symbol: newItem.symbol,
      market: newItem.market,
      name: newItem.name,
      targetPrice: newItem.target_price,
      stopLoss: newItem.stop_loss,
      notes: newItem.notes,
      createdAt: newItem.created_at,
    };
  } catch (error: any) {
    // Handle UNIQUE constraint violation
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw new Error(`${item.symbol} (${item.market}) is already in your watchlist`);
    }
    throw error;
  }
}

export function removeFromWatchlist(id: number): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM watchlist WHERE id = ?');
  stmt.run(id);
}

export function updateWatchlistItem(
  id: number,
  updates: {
    targetPrice?: number;
    stopLoss?: number;
    notes?: string;
  }
): WatchlistItem {
  const db = getDatabase();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.targetPrice !== undefined) {
    fields.push('target_price = ?');
    values.push(updates.targetPrice);
  }
  if (updates.stopLoss !== undefined) {
    fields.push('stop_loss = ?');
    values.push(updates.stopLoss);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id);

  const stmt = db.prepare(`
    UPDATE watchlist
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...values);

  // Fetch and return the updated item
  const updated = db.prepare('SELECT * FROM watchlist WHERE id = ?').get(id) as any;

  return {
    id: updated.id,
    symbol: updated.symbol,
    market: updated.market,
    name: updated.name,
    targetPrice: updated.target_price,
    stopLoss: updated.stop_loss,
    notes: updated.notes,
    createdAt: updated.created_at,
  };
}

export function isInWatchlist(symbol: string, market: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM watchlist WHERE symbol = ? AND market = ?');
  const result = stmt.get(symbol, market) as { count: number };
  return result.count > 0;
}
