import { ipcMain } from 'electron';
import { IPC_CHANNELS, Market } from '../../shared/types';
import * as analyzer from '../services/analyzer';
import * as holdingsRepo from '../database/holdingsRepository';
import { getQuote } from '../services/stockApi';

export function registerAnalysisHandlers(): void {
  // Get stock score/analysis
  ipcMain.handle(IPC_CHANNELS.ANALYSIS_GET_SCORE, async (_, symbol: string, market: Market = 'NSE') => {
    try {
      return await analyzer.analyzeStock(symbol, market);
    } catch (error) {
      console.error('Error analyzing stock:', error);
      throw error;
    }
  });

  // Get top picks
  ipcMain.handle(IPC_CHANNELS.ANALYSIS_GET_TOP_PICKS, async (_, market: Market, count: number = 10) => {
    try {
      return await analyzer.getTopPicks(market, count);
    } catch (error) {
      console.error('Error getting top picks:', error);
      throw error;
    }
  });

  // Portfolio health check
  ipcMain.handle(IPC_CHANNELS.ANALYSIS_PORTFOLIO_HEALTH, async () => {
    try {
      return await analyzer.analyzePortfolioHealth();
    } catch (error) {
      console.error('Error analyzing portfolio health:', error);
      throw error;
    }
  });

  // Get portfolio summary
  ipcMain.handle(IPC_CHANNELS.PORTFOLIO_GET_SUMMARY, async () => {
    try {
      const holdings = holdingsRepo.getAllHoldings();

      if (holdings.length === 0) {
        return {
          totalInvested: 0,
          currentValue: 0,
          totalPnL: 0,
          totalPnLPercent: 0,
          dayChange: 0,
          dayChangePercent: 0,
          xirr: 0,
          holdingsCount: 0,
        };
      }

      let totalInvested = 0;
      let currentValue = 0;
      let dayChange = 0;

      for (const holding of holdings) {
        const invested = holding.avgPrice * holding.quantity;
        totalInvested += invested;

        const quote = await getQuote(holding.symbol, holding.market);
        if (quote) {
          const value = quote.price * holding.quantity;
          currentValue += value;
          dayChange += (quote.change || 0) * holding.quantity;
        } else {
          currentValue += invested; // fallback to invested value
        }
      }

      const totalPnL = currentValue - totalInvested;
      const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
      const dayChangePercent = currentValue > 0 ? (dayChange / currentValue) * 100 : 0;

      // Simple XIRR approximation (proper calculation would need transaction dates)
      const xirr = totalPnLPercent; // Placeholder - would need proper XIRR library

      return {
        totalInvested,
        currentValue,
        totalPnL,
        totalPnLPercent,
        dayChange,
        dayChangePercent,
        xirr,
        holdingsCount: holdings.length,
      };
    } catch (error) {
      console.error('Error getting portfolio summary:', error);
      throw error;
    }
  });

  // Get portfolio allocation
  ipcMain.handle(IPC_CHANNELS.PORTFOLIO_GET_ALLOCATION, async () => {
    try {
      const holdings = holdingsRepo.getAllHoldings();

      if (holdings.length === 0) {
        return {
          byType: [],
          byMarket: [],
          bySector: [],
          byHolding: [],
        };
      }

      let totalValue = 0;
      const holdingsWithValues: Array<{
        holding: typeof holdings[0];
        currentValue: number;
      }> = [];

      for (const holding of holdings) {
        const quote = await getQuote(holding.symbol, holding.market);
        const price = quote?.price || holding.avgPrice;
        const value = price * holding.quantity;
        totalValue += value;
        holdingsWithValues.push({ holding, currentValue: value });
      }

      // By type (Stock, Mutual Fund, ETF)
      const typeMap = new Map<string, number>();
      holdingsWithValues.forEach(({ holding, currentValue }) => {
        const type = holding.type || 'STOCK';
        typeMap.set(type, (typeMap.get(type) || 0) + currentValue);
      });
      const byType = Array.from(typeMap.entries()).map(([type, value]) => ({
        name: type,
        value,
        percentage: (value / totalValue) * 100,
      }));

      // By market
      const marketMap = new Map<string, number>();
      holdingsWithValues.forEach(({ holding, currentValue }) => {
        marketMap.set(holding.market, (marketMap.get(holding.market) || 0) + currentValue);
      });
      const byMarket = Array.from(marketMap.entries()).map(([market, value]) => ({
        name: market,
        value,
        percentage: (value / totalValue) * 100,
      }));

      // By sector
      const sectorMap = new Map<string, number>();
      holdingsWithValues.forEach(({ holding, currentValue }) => {
        const sector = holding.sector || 'Unknown';
        sectorMap.set(sector, (sectorMap.get(sector) || 0) + currentValue);
      });
      const bySector = Array.from(sectorMap.entries()).map(([sector, value]) => ({
        name: sector,
        value,
        percentage: (value / totalValue) * 100,
      }));

      // By individual holding
      const byHolding = holdingsWithValues
        .map(({ holding, currentValue }) => ({
          name: holding.symbol,
          value: currentValue,
          percentage: (currentValue / totalValue) * 100,
        }))
        .sort((a, b) => b.value - a.value);

      return {
        byType,
        byMarket,
        bySector,
        byHolding,
        totalValue,
      };
    } catch (error) {
      console.error('Error getting portfolio allocation:', error);
      throw error;
    }
  });
}
