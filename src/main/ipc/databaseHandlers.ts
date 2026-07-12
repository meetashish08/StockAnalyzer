import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';
import * as holdingsRepo from '../database/holdingsRepository';
import * as watchlistRepo from '../database/watchlistRepository';

export function registerDatabaseHandlers(): void {
  // Get all holdings
  ipcMain.handle(IPC_CHANNELS.DB_GET_HOLDINGS, async () => {
    try {
      return holdingsRepo.getAllHoldings();
    } catch (error) {
      console.error('Error getting holdings:', error);
      throw error;
    }
  });

  // Add new holding
  ipcMain.handle(IPC_CHANNELS.DB_ADD_HOLDING, async (_, holding) => {
    try {
      return holdingsRepo.addHolding(holding);
    } catch (error) {
      console.error('Error adding holding:', error);
      throw error;
    }
  });

  // Update holding
  ipcMain.handle(IPC_CHANNELS.DB_UPDATE_HOLDING, async (_, id: number, updates) => {
    try {
      return holdingsRepo.updateHolding(id, updates);
    } catch (error) {
      console.error('Error updating holding:', error);
      throw error;
    }
  });

  // Delete holding
  ipcMain.handle(IPC_CHANNELS.DB_DELETE_HOLDING, async (_, id: number) => {
    try {
      return holdingsRepo.deleteHolding(id);
    } catch (error) {
      console.error('Error deleting holding:', error);
      throw error;
    }
  });

  // Get transactions
  ipcMain.handle(IPC_CHANNELS.DB_GET_TRANSACTIONS, async (_, holdingId?: number) => {
    try {
      if (holdingId) {
        return holdingsRepo.getTransactionsByHolding(holdingId);
      }
      return holdingsRepo.getAllTransactions();
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  });

  // Add transaction
  ipcMain.handle(IPC_CHANNELS.DB_ADD_TRANSACTION, async (_, transaction) => {
    try {
      return holdingsRepo.addTransaction(transaction);
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  });

  // Watchlist operations
  ipcMain.handle(IPC_CHANNELS.WATCHLIST_GET_ALL, async () => {
    try {
      return watchlistRepo.getAllWatchlistItems();
    } catch (error) {
      console.error('Error getting watchlist:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.WATCHLIST_ADD, async (_, item) => {
    try {
      return watchlistRepo.addToWatchlist(item);
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.WATCHLIST_REMOVE, async (_, id: number) => {
    try {
      return watchlistRepo.removeFromWatchlist(id);
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.WATCHLIST_UPDATE, async (_, id: number, updates) => {
    try {
      return watchlistRepo.updateWatchlistItem(id, updates);
    } catch (error) {
      console.error('Error updating watchlist item:', error);
      throw error;
    }
  });

  // File dialog
  ipcMain.handle('dialog:open-file', async (_, options) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: options?.filters || [
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });
}
