import React, { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatPercent } from '../../utils/format';
import PortfolioChart from './PortfolioChart';
import AllocationChart from './AllocationChart';
import TopHoldings from './TopHoldings';
import MarketOverview from './MarketOverview';

export default function Dashboard() {
  const {
    portfolioSummary,
    holdingsWithPrices,
    isLoadingSummary,
    fetchPortfolioSummary,
    fetchHoldings,
  } = useStore();

  useEffect(() => {
    fetchPortfolioSummary();
    fetchHoldings();
  }, []);

  const summary = portfolioSummary || {
    totalInvested: 0,
    currentValue: 0,
    totalPnL: 0,
    totalPnLPercent: 0,
    dayChange: 0,
    dayChangePercent: 0,
    holdingsCount: 0,
  };

  const isProfitable = summary.totalPnL >= 0;
  const isDayPositive = summary.dayChange >= 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Your portfolio overview</p>
        </div>
        <div className="text-right text-sm text-slate-400">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Value */}
        <div className="card">
          <p className="text-slate-400 text-sm">Current Value</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatCurrency(summary.currentValue)}
          </p>
          <div className={`flex items-center gap-1 mt-2 ${isDayPositive ? 'text-profit' : 'text-loss'}`}>
            <span>{isDayPositive ? '▲' : '▼'}</span>
            <span>{formatCurrency(Math.abs(summary.dayChange))}</span>
            <span>({formatPercent(summary.dayChangePercent)})</span>
            <span className="text-slate-500 text-xs">today</span>
          </div>
        </div>

        {/* Invested Value */}
        <div className="card">
          <p className="text-slate-400 text-sm">Total Invested</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatCurrency(summary.totalInvested)}
          </p>
          <p className="text-slate-500 text-sm mt-2">
            {summary.holdingsCount} holdings
          </p>
        </div>

        {/* Total P&L */}
        <div className={`card ${isProfitable ? 'border-green-800' : 'border-red-800'}`}>
          <p className="text-slate-400 text-sm">Total P&L</p>
          <p className={`text-2xl font-bold mt-1 ${isProfitable ? 'text-profit' : 'text-loss'}`}>
            {isProfitable ? '+' : ''}{formatCurrency(summary.totalPnL)}
          </p>
          <p className={`text-sm mt-2 ${isProfitable ? 'text-profit' : 'text-loss'}`}>
            {isProfitable ? '+' : ''}{formatPercent(summary.totalPnLPercent)}
          </p>
        </div>

        {/* XIRR */}
        <div className="card">
          <p className="text-slate-400 text-sm">Returns (XIRR)</p>
          <p className={`text-2xl font-bold mt-1 ${summary.totalPnLPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
            {formatPercent(summary.totalPnLPercent)}
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Annualized
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Performance */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Portfolio Performance</h2>
          <PortfolioChart />
        </div>

        {/* Asset Allocation */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Asset Allocation</h2>
          <AllocationChart holdings={holdingsWithPrices} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Holdings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Top Holdings</h2>
          <TopHoldings holdings={holdingsWithPrices.slice(0, 5)} />
        </div>

        {/* Market Overview */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Market Overview</h2>
          <MarketOverview />
        </div>
      </div>

      {/* Empty State */}
      {summary.holdingsCount === 0 && !isLoadingSummary && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Holdings Yet</h3>
          <p className="text-slate-400 mb-4">
            Add your first investment to start tracking your portfolio
          </p>
          <a href="/portfolio" className="btn-primary inline-block">
            Add Holding
          </a>
        </div>
      )}
    </div>
  );
}
