const API_BASE = '';

export const api = {
  // Holdings
  async getHoldings() {
    const res = await fetch(`${API_BASE}/api/holdings`);
    return res.json();
  },

  async addHolding(holding: any) {
    const res = await fetch(`${API_BASE}/api/holdings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(holding),
    });
    return res.json();
  },

  async deleteHolding(id: number) {
    await fetch(`${API_BASE}/api/holdings/${id}`, { method: 'DELETE' });
  },

  // Transactions
  async getTransactions(holdingId?: number) {
    const url = holdingId
      ? `${API_BASE}/api/transactions?holdingId=${holdingId}`
      : `${API_BASE}/api/transactions`;
    const res = await fetch(url);
    return res.json();
  },

  async addTransaction(transaction: any) {
    const res = await fetch(`${API_BASE}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
    return res.json();
  },

  // Stock data
  async getQuote(symbol: string, market: string) {
    try {
      const res = await fetch(`${API_BASE}/api/quote/${symbol}/${market}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  async searchStocks(query: string) {
    const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    return res.json();
  },

  // Portfolio
  async getPortfolioSummary() {
    const res = await fetch(`${API_BASE}/api/portfolio/summary`);
    return res.json();
  },

  // Placeholder for features that need backend implementation
  async getTopPicks(market: string, count: number) {
    // Return mock data for now
    return [];
  },

  async getPortfolioHealth() {
    return {
      overallScore: 75,
      diversificationScore: 70,
      riskScore: 80,
      recommendations: [],
      warnings: [],
    };
  },

  async getPortfolioAllocation() {
    return { byType: [], byMarket: [], bySector: [], byHolding: [] };
  },
};

// Create a compatibility layer that works both in Electron and web
export const electronAPI = {
  getHoldings: api.getHoldings,
  addHolding: api.addHolding,
  deleteHolding: api.deleteHolding,
  getTransactions: api.getTransactions,
  addTransaction: api.addTransaction,
  getQuote: api.getQuote,
  searchStocks: api.searchStocks,
  getPortfolioSummary: api.getPortfolioSummary,
  getTopPicks: api.getTopPicks,
  getPortfolioHealth: api.getPortfolioHealth,
  getPortfolioAllocation: api.getPortfolioAllocation,
  updateHolding: async () => {},
  getQuotes: async () => [],
  getStockHistory: async () => [],
  getStockScore: async () => null,
  importCSV: async () => [],
  importExcel: async () => [],
  parseEmailText: async () => [],
  openFileDialog: async () => null,
};

// Override window.electronAPI for web mode
if (typeof window !== 'undefined' && !window.electronAPI) {
  (window as any).electronAPI = electronAPI;
}
