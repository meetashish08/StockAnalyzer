import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { formatCurrency, formatPercent, formatDate } from '../../utils/format';
import AddHoldingModal from './AddHoldingModal';
import AddTransactionModal from './AddTransactionModal';
import type { Holding } from '../../../shared/types';

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

  useEffect(() => {
    fetchHoldings();
  }, []);

  const filteredHoldings = holdingsWithPrices
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

  const handleAddTransaction = (holding: Holding) => {
    setSelectedHolding(holding);
    setShowAddTransaction(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          <p className="text-slate-400">Manage your holdings</p>
        </div>
        <div className="flex items-center gap-3">
          {holdingsWithPrices.length > 0 && (
            <button
              onClick={handleClearAll}
              className="btn-danger flex items-center gap-2"
            >
              Clear All
            </button>
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
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Holdings Found</h3>
          <p className="text-slate-400 mb-4">
            {searchTerm ? 'Try a different search term' : 'Add your first investment to get started'}
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
                <th className="p-4 text-slate-300 font-medium text-right">Current Price</th>
                <th className="p-4 text-slate-300 font-medium text-right">Current Value</th>
                <th className="p-4 text-slate-300 font-medium text-right">P&L</th>
                <th className="p-4 text-slate-300 font-medium text-right">Day Change</th>
                <th className="p-4 text-slate-300 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHoldings.map((holding) => (
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
                    {formatCurrency(holding.avgPrice)}
                  </td>
                  <td className="p-4 text-right text-white">
                    {formatCurrency(holding.currentPrice)}
                  </td>
                  <td className="p-4 text-right text-white font-medium">
                    {formatCurrency(holding.currentValue)}
                  </td>
                  <td className="p-4 text-right">
                    <div className={holding.pnl >= 0 ? 'text-profit' : 'text-loss'}>
                      <p>{holding.pnl >= 0 ? '+' : ''}{formatCurrency(holding.pnl)}</p>
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {filteredHoldings.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card">
            <p className="text-slate-400 text-sm">Total Holdings</p>
            <p className="text-2xl font-bold text-white">{filteredHoldings.length}</p>
          </div>
          <div className="card">
            <p className="text-slate-400 text-sm">Total Value</p>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(filteredHoldings.reduce((sum, h) => sum + h.currentValue, 0))}
            </p>
          </div>
          <div className="card">
            <p className="text-slate-400 text-sm">Total P&L</p>
            <p className={`text-2xl font-bold ${
              filteredHoldings.reduce((sum, h) => sum + h.pnl, 0) >= 0 ? 'text-profit' : 'text-loss'
            }`}>
              {formatCurrency(filteredHoldings.reduce((sum, h) => sum + h.pnl, 0))}
            </p>
          </div>
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
