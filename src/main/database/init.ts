import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'stock-analyzer.db');

  // Ensure directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  createTables();

  console.log(`Database initialized at: ${dbPath}`);
}

function createTables(): void {
  if (!db) return;

  // Holdings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      market TEXT CHECK(market IN ('NSE', 'BSE', 'NYSE', 'NASDAQ')) NOT NULL,
      name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      avg_price REAL NOT NULL DEFAULT 0,
      purchase_date TEXT,
      type TEXT CHECK(type IN ('STOCK', 'MUTUAL_FUND', 'ETF')) NOT NULL DEFAULT 'STOCK',
      sector TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(symbol, market)
    );
  `);

  // Transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      holding_id INTEGER REFERENCES holdings(id) ON DELETE CASCADE,
      type TEXT CHECK(type IN ('BUY', 'SELL', 'DIVIDEND', 'SIP')) NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      date TEXT NOT NULL,
      fees REAL DEFAULT 0,
      source TEXT DEFAULT 'MANUAL',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Price cache table
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_cache (
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      current_price REAL,
      previous_close REAL,
      day_change REAL,
      day_change_pct REAL,
      high_52_week REAL,
      low_52_week REAL,
      volume INTEGER,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (symbol, market)
    );
  `);

  // Watchlist table
  db.exec(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      name TEXT,
      target_price REAL,
      stop_loss REAL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(symbol, market)
    );
  `);

  // Alerts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      type TEXT CHECK(type IN ('PRICE_ABOVE', 'PRICE_BELOW', 'PERCENT_CHANGE')) NOT NULL,
      threshold REAL NOT NULL,
      is_triggered INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      triggered_at TEXT
    );
  `);

  // Stock scores cache
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_scores (
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      technical_score REAL,
      fundamental_score REAL,
      momentum_score REAL,
      value_score REAL,
      overall_score REAL,
      signal TEXT,
      confidence REAL,
      rationale TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (symbol, market)
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_holding ON transactions(holding_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON holdings(symbol);
    CREATE INDEX IF NOT EXISTS idx_price_cache_updated ON price_cache(updated_at);
  `);

  console.log('Database tables created successfully');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
