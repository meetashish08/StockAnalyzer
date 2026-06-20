import { ipcMain } from 'electron';
import { IPC_CHANNELS, Market } from '../../shared/types';
import * as stockApi from '../services/stockApi';
import { getDatabase } from '../database/init';

export function registerStockApiHandlers(): void {
  // Get single quote
  ipcMain.handle(IPC_CHANNELS.STOCK_GET_QUOTE, async (_, symbol: string, market: Market) => {
    try {
      const quote = await stockApi.getQuote(symbol, market);

      // Cache the price
      if (quote) {
        const db = getDatabase();
        db.prepare(`
          INSERT OR REPLACE INTO price_cache (
            symbol, market, current_price, previous_close, day_change,
            day_change_pct, high_52_week, low_52_week, volume, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          symbol,
          market,
          quote.price,
          quote.previousClose,
          quote.change,
          quote.changePercent,
          quote.high52Week,
          quote.low52Week,
          quote.volume
        );
      }

      return quote;
    } catch (error) {
      console.error('Error getting quote:', error);
      throw error;
    }
  });

  // Get multiple quotes
  ipcMain.handle(IPC_CHANNELS.STOCK_GET_QUOTES, async (_, symbols: Array<{ symbol: string; market: Market }>) => {
    try {
      return await stockApi.getQuotes(symbols);
    } catch (error) {
      console.error('Error getting quotes:', error);
      throw error;
    }
  });

  // Search stocks
  ipcMain.handle(IPC_CHANNELS.STOCK_SEARCH, async (_, query: string) => {
    try {
      return await stockApi.searchStocks(query);
    } catch (error) {
      console.error('Error searching stocks:', error);
      throw error;
    }
  });

  // Get historical data
  ipcMain.handle(IPC_CHANNELS.STOCK_GET_HISTORY, async (_, symbol: string, market: Market, period: string) => {
    try {
      return await stockApi.getHistoricalData(symbol, market, period as any);
    } catch (error) {
      console.error('Error getting history:', error);
      throw error;
    }
  });
}
