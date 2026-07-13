import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatPrice, formatPercent, formatDate } from '../../utils/format';
import AddHoldingModal from './AddHoldingModal';
import AddTransactionModal from './AddTransactionModal';
import StockDetailModal from '../StockDetail/StockDetailModal';
import PortfolioSummaryCard from './PortfolioSummaryCard';
import HoldingsTable from './HoldingsTable';
import type { Holding, HoldingWithPrice } from '../../../shared/types';

type MarketTab = 'all' | 'india' | 'us';
type SortField = 'symbol' | 'quantity' | 'avgPrice' | 'importedPrice' | 'currentPrice' | 'currentValue' | 'pnl' | 'pnlPercent' | 'dayChangePercent';
type SortDirection = 'asc' | 'desc';

// Auto-refresh interval options in milliseconds
const REFRESH_INTERVALS = [
  { label: 'Off', value: 0 },
  { label: '1 min', value: 60000 },
  { label: '2 min', value: 120000 },
  { label: '5 min', value: 300000 },
  { label: '10 min', value: 600000 },
  { label: '15 min', value: 900000 },
  { label: '30 min', value: 1800000 },
  { label: '1 hour', value: 3600000 },
  { label: '2 hours', value: 7200000 },
];

export default function Portfolio() {
  const {
    holdingsWithPrices,
    isLoadingHoldings,
    fetchHoldings,
    deleteHolding,
    selectedHolding,
    setSelectedHolding,
  } = useStore();

  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Holding | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<MarketTab>('all');
  const [autoRefreshInterval, setAutoRefreshIntervalValue] = useState(0);
  const [nextRefreshIn, setNextRefreshIn] = useState<number | null>(null);
  const [previousDayReturn, setPreviousDayReturn] = useState<number | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchHoldings();
  }, []);

  // Silent refresh - only updates price data without full loading state
  const handleSilentRefresh = async (currentDayReturn?: number) => {
    // Store previous day return before refresh
    if (currentDayReturn !== undefined) {
      setPreviousDayReturn(currentDayReturn);
    }

    try {
      const response = await fetch('/api/refresh-prices', { method: 'POST' });
      const result = await response.json();

      if (result.success) {
        // Fetch updated holdings without showing loading indicator
        await fetchHoldings();
        setRefreshStatus(`Auto-updated ${result.updated} stocks`);
        setTimeout(() => setRefreshStatus(''), 3000);
      }
    } catch (error) {
      console.error('Silent refresh failed:', error);
    }
  };

  // Auto-refresh effect with countdown
  useEffect(() => {
    // Clear existing intervals
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setNextRefreshIn(null);

    if (autoRefreshInterval > 0) {
      // Initial silent refresh with current day return
      const currentReturn = holdingsWithPrices.reduce((sum, h) => sum + (h.dayChange || 0) * h.quantity, 0);
      handleSilentRefresh(currentReturn);

      // Set next refresh countdown
      let remainingTime = autoRefreshInterval / 1000;
      setNextRefreshIn(remainingTime);

      // Countdown timer (updates every second)
      countdownRef.current = setInterval(() => {
        remainingTime -= 1;
        if (remainingTime <= 0) {
          remainingTime = autoRefreshInterval / 1000;
        }
        setNextRefreshIn(remainingTime);
      }, 1000);

      // Set up refresh interval
      refreshIntervalRef.current = setInterval(() => {
        const currentReturn = holdingsWithPrices.reduce((sum, h) => sum + (h.dayChange || 0) * h.quantity, 0);
        handleSilentRefresh(currentReturn);
      }, autoRefreshInterval);
    }

    // Cleanup on unmount or interval change
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [autoRefreshInterval]);

  // Format countdown display
  const formatCountdown = (seconds: number): string => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    } else if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    }
    return `${seconds}s`;
  };

  // Separate holdings by market
  const { indiaHoldings, usHoldings } = useMemo(() => {
    const india = holdingsWithPrices.filter(h => h.market === 'NSE' || h.market === 'BSE');
    const us = holdingsWithPrices.filter(h => h.market === 'NYSE' || h.market === 'NASDAQ');
    return { indiaHoldings: india, usHoldings: us };
  }, [holdingsWithPrices]);

  // Get holdings based on active tab
  const tabHoldings = useMemo(() => {
    switch (activeTab) {
      case 'india':
        return indiaHoldings;
      case 'us':
        return usHoldings;
      default:
        return holdingsWithPrices;
    }
  }, [activeTab, holdingsWithPrices, indiaHoldings, usHoldings]);

  // Filter and sort holdings
  const filteredHoldings = useMemo(() => {
    return tabHoldings
      .filter(h =>
        h.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'symbol':
            comparison = a.symbol.localeCompare(b.symbol);
            break;
          case 'quantity':
            comparison = a.quantity - b.quantity;
            break;
          case 'avgPrice':
            comparison = a.avgPrice - b.avgPrice;
            break;
          case 'importedPrice':
            comparison = (a.importedPrice || 0) - (b.importedPrice || 0);
            break;
          case 'currentPrice':
            comparison = a.currentPrice - b.currentPrice;
            break;
          case 'currentValue':
            comparison = a.currentValue - b.currentValue;
            break;
          case 'pnl':
            comparison = a.pnl - b.pnl;
            break;
          case 'pnlPercent':
            comparison = a.pnlPercent - b.pnlPercent;
            break;
          case 'dayChangePercent':
            comparison = a.dayChangePercent - b.dayChangePercent;
            break;
          default:
            comparison = 0;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [tabHoldings, searchTerm, sortField, sortDirection]);

  // Handle column header click for sorting - memoized to prevent recreation
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField, sortDirection]);

  // Calculate tab summaries with 1D return and P&L percentage
  const tabSummaries = useMemo(() => {
    const calcSummary = (holdings: HoldingWithPrice[]) => {
      const value = holdings.reduce((sum, h) => sum + h.currentValue, 0);
      const invested = holdings.reduce((sum, h) => sum + h.avgPrice * h.quantity, 0);
      const pnl = holdings.reduce((sum, h) => sum + h.pnl, 0);
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
      const dayReturn = holdings.reduce((sum, h) => sum + (h.dayChange || 0) * h.quantity, 0);
      const prevValue = value - dayReturn;
      const dayReturnPercent = prevValue > 0 ? (dayReturn / prevValue) * 100 : 0;

      return {
        count: holdings.length,
        value,
        invested,
        pnl,
        pnlPercent,
        dayReturn,
        dayReturnPercent,
      };
    };

    return {
      all: calcSummary(holdingsWithPrices),
      india: calcSummary(indiaHoldings),
      us: calcSummary(usHoldings),
    };
  }, [holdingsWithPrices, indiaHoldings, usHoldings]);

  const handleDelete = useCallback(async (holding: Holding) => {
    if (window.confirm(`Are you sure you want to delete ${holding.symbol}?`)) {
      await deleteHolding(holding.id);
    }
  }, [deleteHolding]);

  const handleClearAll = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete ALL holdings? This cannot be undone.')) return;
    if (!window.confirm('This will remove all portfolio data. Are you absolutely sure?')) return;

    try {
      await fetch('/api/clear-all', { method: 'DELETE' });
      await fetchHoldings();
    } catch (error) {
      console.error('Failed to clear portfolio:', error);
    }
  }, [fetchHoldings]);

  const handleRefreshPrices = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshStatus('Fetching latest prices from Yahoo Finance...');

    try {
      const response = await fetch('/api/refresh-prices', { method: 'POST' });
      const result = await response.json();

      if (result.success) {
        setRefreshStatus(`Updated ${result.updated} of ${result.total} stocks`);
        await fetchHoldings();

        // Clear status after 5 seconds
        setTimeout(() => setRefreshStatus(''), 5000);
      } else {
        setRefreshStatus('Failed to refresh prices');
      }
    } catch (error) {
      console.error('Failed to refresh prices:', error);
      setRefreshStatus('Failed to refresh prices');
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchHoldings]);

  const handleAddTransaction = useCallback((holding: Holding) => {
    setSelectedHolding(holding);
    setShowAddTransaction(true);
  }, [setSelectedHolding]);

  const handleRowClick = useCallback((holding: Holding) => {
    setSelectedStock(holding);
  }, []);

  // Memoize currency calculation
  const tabCurrency = useMemo(() => {
    if (activeTab === 'us') return 'USD';
    return 'INR';
  }, [activeTab]);

  const getCurrencyForTab = useCallback(() => tabCurrency, [tabCurrency]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          <p className="text-slate-400">
            {holdingsWithPrices.length > 0
              ? `${holdingsWithPrices.length} holdings`
              : 'Manage your holdings'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {holdingsWithPrices.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-slate-400 text-sm">Auto-refresh:</label>
                <select
                  value={autoRefreshInterval}
                  onChange={(e) => setAutoRefreshIntervalValue(Number(e.target.value))}
                  className="select text-sm py-1 px-2 w-24"
                >
                  {REFRESH_INTERVALS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {autoRefreshInterval > 0 && nextRefreshIn !== null && (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <span className="animate-pulse">●</span>
                    Next: {formatCountdown(nextRefreshIn)}
                  </span>
                )}
              </div>
              <button
                onClick={handleRefreshPrices}
                disabled={isRefreshing}
                className="btn-secondary flex items-center gap-2"
              >
                {isRefreshing ? '⏳ Refreshing...' : '🔄 Refresh Prices'}
              </button>
              <button
                onClick={handleClearAll}
                className="btn-danger flex items-center gap-2"
              >
                Clear All
              </button>
            </>
          )}
          <button
            onClick={() => setShowAddHolding(true)}
            className="btn-primary flex items-center gap-2"
          >
            <span>+</span>
            Add Holding
          </button>
        </div>
      </div>

      {/* Refresh Status */}
      {refreshStatus && (
        <div className={`p-3 rounded-lg ${
          refreshStatus.includes('Failed') ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
        }`}>
          {refreshStatus}
        </div>
      )}

      {/* Market Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span>🌐</span>
          <span>All</span>
          <span className="text-xs bg-slate-600 px-2 py-0.5 rounded-full">
            {tabSummaries.all.count}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('india')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'india'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span>🇮🇳</span>
          <span>India (NSE/BSE)</span>
          <span className="text-xs bg-slate-600 px-2 py-0.5 rounded-full">
            {tabSummaries.india.count}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('us')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'us'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <span>🇺🇸</span>
          <span>US (NYSE/NASDAQ)</span>
          <span className="text-xs bg-slate-600 px-2 py-0.5 rounded-full">
            {tabSummaries.us.count}
          </span>
        </button>
      </div>

      {/* Tab Summary Cards */}
      {tabHoldings.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <PortfolioSummaryCard
            label={`${activeTab === 'all' ? 'Total' : activeTab === 'india' ? 'India' : 'US'} Holdings`}
            count={tabSummaries[activeTab].count}
            currency={getCurrencyForTab()}
            type="count"
          />
          <PortfolioSummaryCard
            label="Total Value"
            value={tabSummaries[activeTab].value}
            invested={tabSummaries[activeTab].invested}
            currency={getCurrencyForTab()}
            type="value"
          />
          <PortfolioSummaryCard
            label="Total P&L"
            pnl={tabSummaries[activeTab].pnl}
            pnlPercent={tabSummaries[activeTab].pnlPercent}
            currency={getCurrencyForTab()}
            type="pnl"
          />
          <PortfolioSummaryCard
            label="1D Return"
            dayReturn={tabSummaries[activeTab].dayReturn}
            dayReturnPercent={tabSummaries[activeTab].dayReturnPercent}
            previousDayReturn={activeTab === 'all' ? previousDayReturn : null}
            currency={getCurrencyForTab()}
            type="dayReturn"
          />
        </div>
      )}

      {/* Search Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search holdings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
          />
        </div>
        <p className="text-slate-400 text-sm">Click column headers to sort</p>
      </div>

      {/* Holdings Table */}
      {isLoadingHoldings ? (
        <div className="card text-center py-12">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-slate-400">Loading holdings...</p>
        </div>
      ) : filteredHoldings.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">
            {activeTab === 'india' ? '🇮🇳' : activeTab === 'us' ? '🇺🇸' : '📊'}
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {searchTerm
              ? 'No Holdings Found'
              : activeTab === 'all'
                ? 'No Holdings Yet'
                : `No ${activeTab === 'india' ? 'Indian' : 'US'} Holdings`
            }
          </h3>
          <p className="text-slate-400 mb-4">
            {searchTerm
              ? 'Try a different search term'
              : activeTab === 'all'
                ? 'Add your first investment to get started'
                : `Import or add ${activeTab === 'india' ? 'NSE/BSE' : 'NYSE/NASDAQ'} stocks`
            }
          </p>
          {!searchTerm && (
            <button onClick={() => setShowAddHolding(true)} className="btn-primary">
              Add Holding
            </button>
          )}
        </div>
      ) : (
        <HoldingsTable
          holdings={filteredHoldings}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onAddTransaction={handleAddTransaction}
          onDelete={handleDelete}
          onRowClick={handleRowClick}
        />
      )}

      {/* Modals */}
      {showAddHolding && (
        <AddHoldingModal onClose={() => setShowAddHolding(false)} />
      )}
      {showAddTransaction && selectedHolding && (
        <AddTransactionModal
          holding={selectedHolding}
          onClose={() => {
            setShowAddTransaction(false);
            setSelectedHolding(null);
          }}
        />
      )}
      {selectedStock && (
        <StockDetailModal
          holding={selectedStock}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </div>
  );
}
