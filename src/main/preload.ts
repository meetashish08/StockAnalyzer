import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  getHoldings: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_HOLDINGS),
  addHolding: (holding: any) => ipcRenderer.invoke(IPC_CHANNELS.DB_ADD_HOLDING, holding),
  updateHolding: (id: number, holding: any) => ipcRenderer.invoke(IPC_CHANNELS.DB_UPDATE_HOLDING, id, holding),
  deleteHolding: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.DB_DELETE_HOLDING, id),
  getTransactions: (holdingId?: number) => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_TRANSACTIONS, holdingId),
  addTransaction: (transaction: any) => ipcRenderer.invoke(IPC_CHANNELS.DB_ADD_TRANSACTION, transaction),

  // Stock API
  getQuote: (symbol: string, market: string) => ipcRenderer.invoke(IPC_CHANNELS.STOCK_GET_QUOTE, symbol, market),
  getQuotes: (symbols: string[]) => ipcRenderer.invoke(IPC_CHANNELS.STOCK_GET_QUOTES, symbols),
  searchStocks: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.STOCK_SEARCH, query),
  getStockHistory: (symbol: string, period: string) => ipcRenderer.invoke(IPC_CHANNELS.STOCK_GET_HISTORY, symbol, period),

  // Analysis
  getStockScore: (symbol: string) => ipcRenderer.invoke(IPC_CHANNELS.ANALYSIS_GET_SCORE, symbol),
  getTopPicks: (market: string, count: number) => ipcRenderer.invoke(IPC_CHANNELS.ANALYSIS_GET_TOP_PICKS, market, count),
  getPortfolioHealth: () => ipcRenderer.invoke(IPC_CHANNELS.ANALYSIS_PORTFOLIO_HEALTH),

  // Import
  importCSV: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_CSV, filePath),
  importExcel: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_EXCEL, filePath),
  parseEmailText: (emailText: string, broker: string) => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_PARSE_EMAIL, emailText, broker),

  // Portfolio
  getPortfolioSummary: () => ipcRenderer.invoke(IPC_CHANNELS.PORTFOLIO_GET_SUMMARY),
  getPortfolioAllocation: () => ipcRenderer.invoke(IPC_CHANNELS.PORTFOLIO_GET_ALLOCATION),

  // Watchlist
  getWatchlist: () => ipcRenderer.invoke(IPC_CHANNELS.WATCHLIST_GET_ALL),
  addToWatchlist: (item: any) => ipcRenderer.invoke(IPC_CHANNELS.WATCHLIST_ADD, item),
  removeFromWatchlist: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.WATCHLIST_REMOVE, id),
  updateWatchlistItem: (id: number, updates: any) => ipcRenderer.invoke(IPC_CHANNELS.WATCHLIST_UPDATE, id, updates),

  // Dialog
  openFileDialog: (options: any) => ipcRenderer.invoke('dialog:open-file', options),
});

// Type definitions for the exposed API
export interface ElectronAPI {
  getHoldings: () => Promise<any[]>;
  addHolding: (holding: any) => Promise<any>;
  updateHolding: (id: number, holding: any) => Promise<any>;
  deleteHolding: (id: number) => Promise<void>;
  getTransactions: (holdingId?: number) => Promise<any[]>;
  addTransaction: (transaction: any) => Promise<any>;
  getQuote: (symbol: string, market: string) => Promise<any>;
  getQuotes: (symbols: string[]) => Promise<any[]>;
  searchStocks: (query: string) => Promise<any[]>;
  getStockHistory: (symbol: string, period: string) => Promise<any[]>;
  getStockScore: (symbol: string) => Promise<any>;
  getTopPicks: (market: string, count: number) => Promise<any[]>;
  getPortfolioHealth: () => Promise<any>;
  importCSV: (filePath: string) => Promise<any[]>;
  importExcel: (filePath: string) => Promise<any[]>;
  parseEmailText: (emailText: string, broker: string) => Promise<any[]>;
  getPortfolioSummary: () => Promise<any>;
  getPortfolioAllocation: () => Promise<any>;
  getWatchlist: () => Promise<any[]>;
  addToWatchlist: (item: any) => Promise<any>;
  removeFromWatchlist: (id: number) => Promise<void>;
  updateWatchlistItem: (id: number, updates: any) => Promise<any>;
  openFileDialog: (options: any) => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
