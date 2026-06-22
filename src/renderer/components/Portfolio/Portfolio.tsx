import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatPrice, formatPercent, formatDate } from '../../utils/format';
import AddHoldingModal from './AddHoldingModal';
import AddTransactionModal from './AddTransactionModal';
import type { Holding, HoldingWithPrice } from '../../../shared/types';

type MarketTab = 'all' | 'india' | 'us';

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
  const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'name'>('value');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState<MarketTab>('all');

  useEffect(() => {
    fetchHoldings();
  }, []);

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
        switch (sortBy) {
          case 'value':
            return b.currentValue - a.currentValue;
          case 'pnl':
            return b.pnlPercent - a.pnlPercent;
          case 'name':
            return a.symbol.localeCompare(b.symbol);
          default:
            return 0;
        }
      });
  }, [tabHoldings, searchTerm, sortBy]);

  // Calculate tab summaries
  const tabSummaries = useMemo(() => {
    const calcSummary = (holdings: HoldingWithPrice[]) => ({
      count: holdings.length,
      value: holdings.reduce((sum, h) => sum + h.currentValue, 0),
      pnl: holdings.reduce((sum, h) => sum + h.pnl, 0),
    });

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
        <div className="grid grid-cols-3 gap-4">
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
        </div>
      )}

      {/* Filters */}
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
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="select w-40"
        >
          <option value="value">Sort by Value</option>
          <option value="pnl">Sort by P&L</option>
          <option value="name">Sort by Name</option>
        </select>
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
                <th className="p-4 text-slate-300 font-medium">Stock</th>
                <th className="p-4 text-slate-300 font-medium text-right">Qty</th>
                <th className="p-4 text-slate-300 font-medium text-right">Avg Price</th>
                <th className="p-4 text-slate-300 font-medium text-right">Import Price</th>
                <th className="p-4 text-slate-300 font-medium text-right">Today's Price</th>
                <th className="p-4 text-slate-300 font-medium text-right">Today's Value</th>
                <th className="p-4 text-slate-300 font-medium text-right">P&L</th>
                <th className="p-4 text-slate-300 font-medium text-right">Day Change</th>
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
