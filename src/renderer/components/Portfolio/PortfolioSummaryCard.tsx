import React from 'react';
import { formatCurrency } from '../../utils/format';

interface PortfolioSummaryCardProps {
  label: string;
  count?: number;
  value?: number;
  invested?: number;
  pnl?: number;
  pnlPercent?: number;
  dayReturn?: number;
  dayReturnPercent?: number;
  previousDayReturn?: number | null;
  currency: string;
  type: 'count' | 'value' | 'pnl' | 'dayReturn';
}

const PortfolioSummaryCard = React.memo(({
  label,
  count,
  value,
  invested,
  pnl,
  pnlPercent,
  dayReturn,
  dayReturnPercent,
  previousDayReturn,
  currency,
  type
}: PortfolioSummaryCardProps) => {
  return (
    <div className="card bg-gradient-to-br from-slate-800 to-slate-700">
      <p className="text-slate-400 text-sm">{label}</p>

      {type === 'count' && (
        <p className="text-2xl font-bold text-white">{count}</p>
      )}

      {type === 'value' && value !== undefined && invested !== undefined && (
        <>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(value, currency)}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Invested: {formatCurrency(invested, currency)}
          </p>
        </>
      )}

      {type === 'pnl' && pnl !== undefined && pnlPercent !== undefined && (
        <>
          <p className={`text-2xl font-bold ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {pnl >= 0 ? '+' : ''}
            {formatCurrency(pnl, currency)}
          </p>
          <p className={`text-sm ${pnlPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
            {pnlPercent >= 0 ? '+' : ''}
            {pnlPercent.toFixed(2)}%
          </p>
        </>
      )}

      {type === 'dayReturn' && dayReturn !== undefined && dayReturnPercent !== undefined && (
        <>
          <p className={`text-2xl font-bold ${dayReturn >= 0 ? 'text-profit' : 'text-loss'}`}>
            {dayReturn >= 0 ? '+' : ''}
            {formatCurrency(dayReturn, currency)}
            {previousDayReturn !== null && (
              <sub className={`text-xs ml-1 ${
                (dayReturn - previousDayReturn) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {(dayReturn - previousDayReturn) >= 0 ? '+' : ''}
                {formatCurrency(dayReturn - previousDayReturn, currency)}
              </sub>
            )}
          </p>
          <p className={`text-sm ${dayReturnPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
            {dayReturnPercent >= 0 ? '+' : ''}
            {dayReturnPercent.toFixed(2)}%
          </p>
        </>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if relevant fields change
  if (prevProps.type !== nextProps.type) return false;

  switch (nextProps.type) {
    case 'count':
      return prevProps.count === nextProps.count;
    case 'value':
      return prevProps.value === nextProps.value &&
             prevProps.invested === nextProps.invested;
    case 'pnl':
      return prevProps.pnl === nextProps.pnl &&
             prevProps.pnlPercent === nextProps.pnlPercent;
    case 'dayReturn':
      return prevProps.dayReturn === nextProps.dayReturn &&
             prevProps.dayReturnPercent === nextProps.dayReturnPercent &&
             prevProps.previousDayReturn === nextProps.previousDayReturn;
    default:
      return true;
  }
});

PortfolioSummaryCard.displayName = 'PortfolioSummaryCard';

export default PortfolioSummaryCard;
