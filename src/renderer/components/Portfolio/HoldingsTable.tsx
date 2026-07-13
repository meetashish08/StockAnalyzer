import React, { useCallback } from 'react';
import StockRow from './StockRow';
import type { HoldingWithPrice, Holding } from '../../../shared/types';

type SortField = 'symbol' | 'quantity' | 'avgPrice' | 'importedPrice' | 'currentPrice' | 'currentValue' | 'pnl' | 'pnlPercent' | 'dayChangePercent';
type SortDirection = 'asc' | 'desc';

interface HoldingsTableProps {
  holdings: HoldingWithPrice[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onAddTransaction: (holding: Holding) => void;
  onDelete: (holding: Holding) => void;
  onRowClick: (holding: Holding) => void;
}

const SortIndicator = React.memo(({
  field,
  currentField,
  direction
}: {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
}) => {
  if (currentField !== field) return <span className="text-slate-500 ml-1">↕</span>;
  return <span className="text-green-400 ml-1">{direction === 'asc' ? '↑' : '↓'}</span>;
});

SortIndicator.displayName = 'SortIndicator';

const HoldingsTable = React.memo(({
  holdings,
  sortField,
  sortDirection,
  onSort,
  onAddTransaction,
  onDelete,
  onRowClick
}: HoldingsTableProps) => {
  const handleSort = useCallback((field: SortField) => {
    onSort(field);
  }, [onSort]);

  const handleAddTransaction = useCallback((holding: Holding) => {
    onAddTransaction(holding);
  }, [onAddTransaction]);

  const handleDelete = useCallback((holding: Holding) => {
    onDelete(holding);
  }, [onDelete]);

  const handleRowClick = useCallback((holding: Holding) => {
    onRowClick(holding);
  }, [onRowClick]);

  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-700/50 text-left">
            <th
              className="p-4 text-slate-300 font-medium cursor-pointer hover:text-white transition-colors"
              onClick={() => handleSort('symbol')}
            >
              Stock<SortIndicator field="symbol" currentField={sortField} direction={sortDirection} />
            </th>
            <th
              className="p-4 text-slate-300 font-medium text-right cursor-pointer hover:text-white transition-colors"
              onClick={() => handleSort('quantity')}
            >
              Qty<SortIndicator field="quantity" currentField={sortField} direction={sortDirection} />
            </th>
            <th
              className="p-4 text-slate-300 font-medium text-right cursor-pointer hover:text-white transition-colors"
              onClick={() => handleSort('avgPrice')}
            >
              Avg Price<SortIndicator field="avgPrice" currentField={sortField} direction={sortDirection} />
            </th>
            <th
              className="p-4 text-slate-300 font-medium text-right cursor-pointer hover:text-white transition-colors"
              onClick={() => handleSort('importedPrice')}
            >
              Import Price<SortIndicator field="importedPrice" currentField={sortField} direction={sortDirection} />
            </th>
            <th
              className="p-4 text-slate-300 font-medium text-right cursor-pointer hover:text-white transition-colors"
              onClick={() => handleSort('currentPrice')}
            >
              Today's Price<SortIndicator field="currentPrice" currentField={sortField} direction={sortDirection} />
            </th>
            <th
              className="p-4 text-slate-300 font-medium text-right cursor-pointer hover:text-white transition-colors"
              onClick={() => handleSort('currentValue')}
            >
              Today's Value<SortIndicator field="currentValue" currentField={sortField} direction={sortDirection} />
            </th>
            <th
              className="p-4 text-slate-300 font-medium text-right cursor-pointer hover:text-white transition-colors"
              onClick={() => handleSort('pnl')}
            >
              P&L<SortIndicator field="pnl" currentField={sortField} direction={sortDirection} />
            </th>
            <th
              className="p-4 text-slate-300 font-medium text-right cursor-pointer hover:text-white transition-colors"
              onClick={() => handleSort('dayChangePercent')}
            >
              Day Change<SortIndicator field="dayChangePercent" currentField={sortField} direction={sortDirection} />
            </th>
            <th className="p-4 text-slate-300 font-medium text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => (
            <StockRow
              key={holding.id}
              holding={holding}
              onAddTransaction={handleAddTransaction}
              onDelete={handleDelete}
              onClick={handleRowClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if holdings array reference changes or sort settings change
  return (
    prevProps.holdings === nextProps.holdings &&
    prevProps.sortField === nextProps.sortField &&
    prevProps.sortDirection === nextProps.sortDirection
  );
});

HoldingsTable.displayName = 'HoldingsTable';

export default HoldingsTable;
