import React from 'react';
import type { HoldingWithPrice } from '../../../shared/types';
import { formatCurrency, formatPercent } from '../../utils/format';

interface Props {
  holdings: HoldingWithPrice[];
}

export default function TopHoldings({ holdings }: Props) {
  if (holdings.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        No holdings to display
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {holdings.map((holding, index) => (
        <div
          key={holding.id}
          className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold text-white">
              {index + 1}
            </div>
            <div>
              <p className="font-medium text-white">{holding.symbol}</p>
              <p className="text-xs text-slate-400">{holding.market} • {holding.quantity} shares</p>
            </div>
          </div>

          <div className="text-right">
            <p className="font-medium text-white">{formatCurrency(holding.currentValue)}</p>
            <p className={`text-sm ${holding.pnlPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
              {formatPercent(holding.pnlPercent)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
