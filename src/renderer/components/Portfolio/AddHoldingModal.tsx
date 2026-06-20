import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import type { Market, AssetType } from '../../../shared/types';

interface Props {
  onClose: () => void;
}

export default function AddHoldingModal({ onClose }: Props) {
  const { addHolding } = useStore();

  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    market: 'NSE' as Market,
    type: 'STOCK' as AssetType,
    quantity: '',
    avgPrice: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    sector: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (query: string) => {
    setFormData(prev => ({ ...prev, symbol: query.toUpperCase() }));

    if (query.length >= 2) {
      try {
        const results = await window.electronAPI.searchStocks(query);
        setSearchResults(results);
        setShowResults(true);
      } catch (e) {
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleSelectStock = (stock: any) => {
    setFormData(prev => ({
      ...prev,
      symbol: stock.symbol,
      name: stock.name,
      market: stock.exchange?.includes('NSE') ? 'NSE' :
              stock.exchange?.includes('BSE') ? 'BSE' :
              stock.exchange?.includes('NASDAQ') ? 'NASDAQ' : 'NYSE',
    }));
    setShowResults(false);
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await addHolding({
        symbol: formData.symbol.toUpperCase(),
        name: formData.name || formData.symbol,
        market: formData.market,
        type: formData.type,
        quantity: parseFloat(formData.quantity) || 0,
        avgPrice: parseFloat(formData.avgPrice) || 0,
        purchaseDate: formData.purchaseDate,
        sector: formData.sector || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to add holding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-4">Add New Holding</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Symbol Search */}
          <div className="relative">
            <label className="label">Stock Symbol</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search symbol (e.g., RELIANCE, AAPL)"
              className="input"
              required
            />
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-auto">
                {searchResults.map((stock, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectStock(stock)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-600 flex justify-between items-center"
                  >
                    <span className="font-medium text-white">{stock.symbol}</span>
                    <span className="text-sm text-slate-400 truncate ml-2">{stock.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="label">Company Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Company name"
              className="input"
            />
          </div>

          {/* Market & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Market</label>
              <select
                value={formData.market}
                onChange={(e) => setFormData(prev => ({ ...prev, market: e.target.value as Market }))}
                className="select"
              >
                <option value="NSE">NSE (India)</option>
                <option value="BSE">BSE (India)</option>
                <option value="NYSE">NYSE (US)</option>
                <option value="NASDAQ">NASDAQ (US)</option>
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AssetType }))}
                className="select"
              >
                <option value="STOCK">Stock</option>
                <option value="MUTUAL_FUND">Mutual Fund</option>
                <option value="ETF">ETF</option>
              </select>
            </div>
          </div>

          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="0"
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Avg. Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.avgPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, avgPrice: e.target.value }))}
                placeholder="0.00"
                className="input"
                required
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="label">Purchase Date</label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
              className="input"
            />
          </div>

          {/* Sector */}
          <div>
            <label className="label">Sector (Optional)</label>
            <select
              value={formData.sector}
              onChange={(e) => setFormData(prev => ({ ...prev, sector: e.target.value }))}
              className="select"
            >
              <option value="">Select sector</option>
              <option value="Technology">Technology</option>
              <option value="Financial Services">Financial Services</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Consumer Goods">Consumer Goods</option>
              <option value="Energy">Energy</option>
              <option value="Industrials">Industrials</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Utilities">Utilities</option>
              <option value="Materials">Materials</option>
              <option value="Telecom">Telecom</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.symbol || !formData.quantity || !formData.avgPrice}
              className="btn-primary flex-1"
            >
              {isLoading ? 'Adding...' : 'Add Holding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
