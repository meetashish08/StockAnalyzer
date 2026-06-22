import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatPrice, formatPercent, formatDate } from '../../utils/format';
import AddHoldingModal from './AddHoldingModal';
import AddTransactionModal from './AddTransactionModal';
import type { Holding, HoldingWithPrice } from '../../../shared/types';

type MarketTab = 'all' | 'india' | 'us';
type SortField = 'symbol' | 'quantity' | 'avgPrice' | 'importedPrice' | 'currentPrice' | 'currentValue' | 'pnl' | 'pnlPercent' | 'dayChangePercent';
type SortDirection = 'asc' | 'desc';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('currentValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<MarketTab>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchHoldings();
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      // Initial refresh
      handleRefreshPrices();

      // Set up interval for every 60 seconds
      autoRefreshInterval.current = setInterval(() => {
        handleRefreshPrices();
      }, 60000);
    } else {
      // Clear interval when auto-refresh is disabled
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
        autoRefreshInterval.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, [autoRefresh]);

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

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-slate-500 ml-1">↕</span>;
    return <span className="text-green-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  // Calculate tab summaries with 1D return
  const tabSummaries = useMemo(() => {
    const calcSummary = (holdings: HoldingWithPrice[]) => {
      const value = holdings.reduce((sum, h) => sum + h.currentValue, 0);
      const pnl = holdings.reduce((sum, h) => sum + h.pnl, 0);
      const dayReturn = holdings.reduce((sum, h) => sum + (h.dayChange || 0) * h.quantity, 0);
      const prevValue = value - dayReturn;
      const dayReturnPercent = prevValue > 0 ? (dayReturn / prevValue) * 100 : 0;

      return {
        count: holdings.length,
        value,
        pnl,
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

  const handleDelete = async (holding: Holding) => {
    if (window.confirm(`Are you sure you want to delete ${holding.symbol}?`)) {
      await deleteHolding(holding.id);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL holdings? This cannot be undone.')) return;
    if (!window.confirm('This will remove all portfolio data. Are you absolutely sure?')) return;

    try {
      await fetch('/api/clear-all', { method: 'DELETE' });
      await fetchHoldings();
    } catch (error) {
      console.error('Failed to clear portfolio:', error);
    }
  };

  const handleRefreshPrices = async () => {
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
  };

  const handleAddTransaction = (holding: Holding) => {
    setSelectedHolding(holding);
    setShowAddTransaction(true);
  };

  const getCurrencyForTab = () => {
    if (activeTab === 'us') return 'USD';
    return 'INR';
  };

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
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-green-500 focus:ring-green-500 focus:ring-offset-slate-800"
                />
                <span className="text-sm">Auto-refresh (1 min)</span>
                {autoRefresh && <span className="text-green-400 animate-pulse">●</span>}
              </label>
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
          <div className="card bg-gradient-to-br from-slate-800 to-slate-700">
            <p className="text-slate-400 text-sm">
              {activeTab === 'all' ? 'Total' : activeTab === 'india' ? 'India' : 'US'} Holdings
            </p>
            <p className="text-2xl font-bold text-white">{tabSummaries[activeTab].count}</p>
          </div>
          <div className="card bg-gradient-to-br from-slate-800 to-slate-700">
            <p className="text-slate-400 text-sm">Total Value</p>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(tabSummaries[activeTab].value, getCurrencyForTab())}
            </p>
          </div>
          <div className="card bg-gradient-to-br from-slate-800 to-slate-700">
            <p className="text-slate-400 text-sm">Total P&L</p>
            <p className={`text-2xl font-bold ${
              tabSummaries[activeTab].pnl >= 0 ? 'text-profit' : 'text-loss'
            }`}>
              {tabSummaries[activeTab].pnl >= 0 ? '+' : ''}
              {formatCurrency(tabSummaries[activeTab].pnl, getCurrencyForTab())}
            </p>
          </div>
          <div className="card bg-gradient-to-br from-slate-800 to-slate-700">
            <p className="text-slate-400 text-sm">1D Return</p>
            <p className={`text-2xl font-bold ${
              tabSummaries[activeTab].dayReturn >= 0 ? 'text-profit' : 'text-loss'
            }`}>
              {tabSummaries[activeTab].dayReturn >= 0 ? '+' : ''}
              {formatCurrency(tabSummaries[activeTab].dayReturn, getCurrencyForTab())}
            </p>
            <p className={`text-sm ${
              tabSummaries[activeTab].dayReturnPercent >= 0 ? 'text-profit' : 'text-loss'
            }`}>
              {tabSummaries[activeTab].dayReturnPercent >= 0 ? '+' : ''}
              {tabSummaries[activeTab].dayReturnPercent.toFixed(2)}%
            </p>
          </div>
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
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700/50 text-left">
                <th
                  className="p-4 text-slate-300 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('symbol')}
                >
                  Stock<SortIndicator field="symbol" />
                </th>
                <th
                  className="p-4 text-slate-300 font-medium text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('quantity')}
                >
                  Qty<SortIndicator field="quantity" />
                </th>
                <th
                  className="p-4 text-slate-300 font-medium text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('avgPrice')}
                >
                  Avg Price<SortIndicator field="avgPrice" />
                </th>
                <th
                  className="p-4 text-slate-300 font-medium text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('importedPrice')}
                >
                  Import Price<SortIndicator field="importedPrice" />
                </th>
                <th
                  className="p-4 text-slate-300 font-medium text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('currentPrice')}
                >
                  Today's Price<SortIndicator field="currentPrice" />
                </th>
                <th
                  className="p-4 text-slate-300 font-medium text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('currentValue')}
                >
                  Today's Value<SortIndicator field="currentValue" />
                </th>
                <th
                  className="p-4 text-slate-300 font-medium text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('pnl')}
                >
                  P&L<SortIndicator field="pnl" />
                </th>
                <th
                  className="p-4 text-slate-300 font-medium text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('dayChangePercent')}
                >
                  Day Change<SortIndicator field="dayChangePercent" />
                </th>
                <th className="p-4 text-slate-300 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHoldings.map((holding) => {
                const currency = (holding.market === 'NYSE' || holding.market === 'NASDAQ') ? 'USD' : 'INR';
                return (
                  <tr
                    key={holding.id}
                    className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-white">{holding.symbol}</p>
                        <p className="text-xs text-slate-400">{holding.market} • {holding.type}</p>
                      </div>
                    </td>
                    <td className="p-4 text-right text-white">
                      {holding.quantity}
                    </td>
                    <td className="p-4 text-right text-slate-300">
                      {formatPrice(holding.avgPrice, currency)}
                    </td>
                    <td className="p-4 text-right text-slate-400">
                      {holding.importedPrice ? formatPrice(holding.importedPrice, currency) : '-'}
                    </td>
                    <td className="p-4 text-right text-white">
                      {formatPrice(holding.currentPrice, currency)}
                    </td>
                    <td className="p-4 text-right text-white font-medium">
                      {formatCurrency(holding.currentValue, currency)}
                    </td>
                    <td className="p-4 text-right">
                      <div className={holding.pnl >= 0 ? 'text-profit' : 'text-loss'}>
                        <p>{holding.pnl >= 0 ? '+' : ''}{formatCurrency(holding.pnl, currency)}</p>
                        <p className="text-sm">{formatPercent(holding.pnlPercent)}</p>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={holding.dayChangePercent >= 0 ? 'text-profit' : 'text-loss'}>
                        {formatPercent(holding.dayChangePercent)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleAddTransaction(holding)}
                          className="btn-secondary text-sm px-2 py-1"
                          title="Add Transaction"
                        >
                          +Txn
                        </button>
                        <button
                          onClick={() => handleDelete(holding)}
                          className="btn-danger text-sm px-2 py-1"
                          title="Delete"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
