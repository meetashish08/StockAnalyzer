import React from 'react';
import { formatCurrency, formatPrice, formatPercent } from '../../utils/format';
import type { HoldingWithPrice, Holding } from '../../../shared/types';

interface StockRowProps {
  holding: HoldingWithPrice;
  onAddTransaction: (holding: Holding) => void;
  onDelete: (holding: Holding) => void;
  onClick: (holding: Holding) => void;
}

const StockRow = React.memo(({
  holding,
  onAddTransaction,
  onDelete,
  onClick
}: StockRowProps) => {
  const currency = (holding.market === 'NYSE' || holding.market === 'NASDAQ') ? 'USD' : 'INR';

  const handleAddTransaction = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddTransaction(holding);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(holding);
  };

  const handleClick = () => {
    onClick(holding);
  };

  return (
    <tr
      onClick={handleClick}
      className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors cursor-pointer"
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
      <td className="p-4 text-right">
        <div>
          <p className="text-white font-medium">
            {formatCurrency(holding.currentValue, currency)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Buy: {formatCurrency(holding.avgPrice * holding.quantity, currency)}
          </p>
        </div>
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
            onClick={handleAddTransaction}
            className="btn-secondary text-sm px-2 py-1"
            title="Add Transaction"
          >
            +Txn
          </button>
          <button
            onClick={handleDelete}
            className="btn-danger text-sm px-2 py-1"
            title="Delete"
          >
            🗑
          </button>
        </div>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these specific fields change
  const prev = prevProps.holding;
  const next = nextProps.holding;

  return (
    prev.id === next.id &&
    prev.symbol === next.symbol &&
    prev.quantity === next.quantity &&
    prev.avgPrice === next.avgPrice &&
    prev.importedPrice === next.importedPrice &&
    prev.currentPrice === next.currentPrice &&
    prev.currentValue === next.currentValue &&
    prev.pnl === next.pnl &&
    prev.pnlPercent === next.pnlPercent &&
    prev.dayChangePercent === next.dayChangePercent &&
    prev.market === next.market &&
    prev.type === next.type &&
    prev.name === next.name
  );
});

StockRow.displayName = 'StockRow';

export default StockRow;
