import { create } from 'zustand';
import type { Holding, Transaction, PortfolioSummary, StockScore, HoldingWithPrice } from '../../shared/types';

interface StoreState {
  // Holdings
  holdings: Holding[];
  holdingsWithPrices: HoldingWithPrice[];
  isLoadingHoldings: boolean;
  fetchHoldings: () => Promise<void>;
  addHolding: (holding: Omit<Holding, 'id' | 'createdAt'>) => Promise<void>;
  deleteHolding: (id: number) => Promise<void>;

  // Transactions
  transactions: Transaction[];
  isLoadingTransactions: boolean;
  fetchTransactions: (holdingId?: number) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;

  // Portfolio Summary
  portfolioSummary: PortfolioSummary | null;
  isLoadingSummary: boolean;
  fetchPortfolioSummary: () => Promise<void>;

  // Recommendations
  topPicks: StockScore[];
  isLoadingPicks: boolean;
  fetchTopPicks: (market: 'NSE' | 'NYSE', count?: number) => Promise<void>;

  // UI State
  selectedHolding: Holding | null;
  setSelectedHolding: (holding: Holding | null) => void;

  // Stock Detail Modal State
  selectedStockForDetail: { symbol: string; market: string; name?: string } | null;
  setSelectedStockForDetail: (stock: { symbol: string; market: string; name?: string } | null) => void;

  // Error handling
  error: string | null;
  clearError: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  // Holdings state
  holdings: [],
  holdingsWithPrices: [],
  isLoadingHoldings: false,

  fetchHoldings: async () => {
    set({ isLoadingHoldings: true, error: null });
    try {
      const holdings = await window.electronAPI.getHoldings();
      set({ holdings });

      // Build holdings with prices - use stored currentPrice when available
      const holdingsWithPrices: HoldingWithPrice[] = [];

      for (const holding of holdings) {
        // Use stored currentPrice from import, or fall back to avgPrice
        let currentPrice = holding.currentPrice || holding.avgPrice;
        let dayChange = holding.dayChange || 0;
        let dayChangePercent = holding.dayChangePercent || 0;

        // Only fetch from API if no currentPrice is stored
        if (!holding.currentPrice) {
          try {
            const quote = await window.electronAPI.getQuote(holding.symbol, holding.market);
            if (quote?.price) {
              currentPrice = quote.price;
              dayChange = quote.change || 0;
              dayChangePercent = quote.changePercent || 0;
            }
          } catch (e) {
            // Use avgPrice as fallback
            currentPrice = holding.avgPrice;
          }
        }

        const currentValue = currentPrice * holding.quantity;
        const importedValue = (holding.importedPrice || holding.avgPrice) * holding.quantity;
        const investedValue = holding.avgPrice * holding.quantity;
        const pnl = currentValue - investedValue;
        const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;

        holdingsWithPrices.push({
          ...holding,
          currentPrice,
          importedPrice: holding.importedPrice,
          importedValue,
          currentValue,
          pnl,
          pnlPercent,
          dayChange,
          dayChangePercent,
          allocation: 0, // Will calculate after
        });
      }

      // Calculate allocations
      const totalValue = holdingsWithPrices.reduce((sum, h) => sum + h.currentValue, 0);
      holdingsWithPrices.forEach(h => {
        h.allocation = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
      });

      set({ holdingsWithPrices, isLoadingHoldings: false });
    } catch (error) {
      set({ error: 'Failed to fetch holdings', isLoadingHoldings: false });
      console.error(error);
    }
  },

  addHolding: async (holding) => {
    try {
      await window.electronAPI.addHolding(holding);
      await get().fetchHoldings();
      await get().fetchPortfolioSummary();
    } catch (error) {
      set({ error: 'Failed to add holding' });
      console.error(error);
    }
  },

  deleteHolding: async (id) => {
    try {
      await window.electronAPI.deleteHolding(id);
      await get().fetchHoldings();
      await get().fetchPortfolioSummary();
    } catch (error) {
      set({ error: 'Failed to delete holding' });
      console.error(error);
    }
  },

  // Transactions state
  transactions: [],
  isLoadingTransactions: false,

  fetchTransactions: async (holdingId) => {
    set({ isLoadingTransactions: true, error: null });
    try {
      const transactions = await window.electronAPI.getTransactions(holdingId);
      set({ transactions, isLoadingTransactions: false });
    } catch (error) {
      set({ error: 'Failed to fetch transactions', isLoadingTransactions: false });
      console.error(error);
    }
  },

  addTransaction: async (transaction) => {
    try {
      await window.electronAPI.addTransaction(transaction);
      await get().fetchTransactions(transaction.holdingId);
      await get().fetchHoldings();
      await get().fetchPortfolioSummary();
    } catch (error) {
      set({ error: 'Failed to add transaction' });
      console.error(error);
    }
  },

  // Portfolio Summary
  portfolioSummary: null,
  isLoadingSummary: false,

  fetchPortfolioSummary: async () => {
    set({ isLoadingSummary: true, error: null });
    try {
      const summary = await window.electronAPI.getPortfolioSummary();
      set({ portfolioSummary: summary, isLoadingSummary: false });
    } catch (error) {
      set({ error: 'Failed to fetch portfolio summary', isLoadingSummary: false });
      console.error(error);
    }
  },

  // Recommendations
  topPicks: [],
  isLoadingPicks: false,

  fetchTopPicks: async (market, count = 10) => {
    set({ isLoadingPicks: true, error: null });
    try {
      const picks = await window.electronAPI.getTopPicks(market, count);
      set({ topPicks: picks, isLoadingPicks: false });
    } catch (error) {
      set({ error: 'Failed to fetch recommendations', isLoadingPicks: false });
      console.error(error);
    }
  },

  // UI State
  selectedHolding: null,
  setSelectedHolding: (holding) => set({ selectedHolding: holding }),

  // Stock Detail Modal State
  selectedStockForDetail: null,
  setSelectedStockForDetail: (stock) => set({ selectedStockForDetail: stock }),

  // Error handling
  error: null,
  clearError: () => set({ error: null }),
}));
