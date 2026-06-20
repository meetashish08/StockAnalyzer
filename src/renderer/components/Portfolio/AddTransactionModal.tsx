import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import type { Holding, TransactionType } from '../../../shared/types';

interface Props {
  holding: Holding;
  onClose: () => void;
}

export default function AddTransactionModal({ holding, onClose }: Props) {
  const { addTransaction } = useStore();

  const [formData, setFormData] = useState({
    type: 'BUY' as TransactionType,
    quantity: '',
    price: '',
    date: new Date().toISOString().split('T')[0],
    fees: '',
    notes: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await addTransaction({
        holdingId: holding.id,
        type: formData.type,
        quantity: parseFloat(formData.quantity) || 0,
        price: parseFloat(formData.price) || 0,
        date: formData.date,
        fees: parseFloat(formData.fees) || 0,
        source: 'MANUAL',
        notes: formData.notes || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to add transaction:', error);
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
        <h2 className="text-xl font-bold text-white mb-2">Add Transaction</h2>
        <p className="text-slate-400 mb-4">{holding.symbol} • {holding.market}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type */}
          <div>
            <label className="label">Transaction Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(['BUY', 'SELL', 'SIP', 'DIVIDEND'] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type }))}
                  className={`py-2 rounded-lg font-medium text-sm transition-colors ${
                    formData.type === type
                      ? type === 'SELL' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                {formData.type === 'DIVIDEND' ? 'Amount' : 'Quantity'}
              </label>
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
              <label className="label">
                {formData.type === 'DIVIDEND' ? 'Per Share' : 'Price'}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
                className="input"
                required
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="input"
              required
            />
          </div>

          {/* Fees */}
          <div>
            <label className="label">Fees / Charges (Optional)</label>
            <input
              type="number"
              step="0.01"
              value={formData.fees}
              onChange={(e) => setFormData(prev => ({ ...prev, fees: e.target.value }))}
              placeholder="0.00"
              className="input"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes (Optional)</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add a note..."
              className="input"
            />
          </div>

          {/* Summary */}
          {formData.quantity && formData.price && (
            <div className="p-3 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-400">Total Value</p>
              <p className="text-xl font-bold text-white">
                ₹{(parseFloat(formData.quantity) * parseFloat(formData.price)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
          )}

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
              disabled={isLoading || !formData.quantity || !formData.price}
              className={`flex-1 ${formData.type === 'SELL' ? 'btn-danger' : 'btn-primary'}`}
            >
              {isLoading ? 'Adding...' : `Add ${formData.type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
